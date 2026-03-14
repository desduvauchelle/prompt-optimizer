import { connectDB } from "@/lib/db/mongodb"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"
import { generateOutputs } from "@/lib/engine/generator"
import { evaluateOutputs } from "@/lib/engine/evaluator"
import { rewritePrompt } from "@/lib/engine/rewriter"
import type { IterationResult } from "@/lib/types"

// In-memory progress tracking for polling
interface RunProgress {
	phase: "generating" | "evaluating" | "rewriting" | "idle"
	completed: number
	total: number
}

const progressMap = new Map<string, RunProgress>()

export function getProgress(projectId: string): RunProgress {
	return progressMap.get(projectId) ?? { phase: "idle", completed: 0, total: 0 }
}

export async function runOptimization(projectId: string): Promise<void> {
	await connectDB()

	const project = await PromptProjectModel.findById(projectId)
	if (!project) throw new Error("Project not found")

	const { config, evalQuestions } = project
	let currentPrompt =
		project.iterations.length > 0
			? project.iterations[project.iterations.length - 1].rewrittenPrompt ??
			project.sourcePrompt
			: project.sourcePrompt

	const startIteration = project.currentIteration

	for (let i = startIteration; i < config.maxIterations; i++) {
		// Update status to running
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			status: "running",
			currentIteration: i,
		})

		// --- GENERATION PHASE ---
		const iteration: IterationResult = {
			iterationNumber: i + 1,
			prompt: currentPrompt,
			generations: [],
			averageScore: 0,
			analysis: "",
			recommendations: [],
			rewrittenPrompt: null,
			status: "generating",
		}

		// Push iteration stub
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			$push: { iterations: iteration },
		})

		progressMap.set(projectId, {
			phase: "generating",
			completed: 0,
			total: config.generationsPerIteration,
		})

		const outputs = await generateOutputs(
			currentPrompt,
			config.generationModel,
			config.generationsPerIteration,
			config.concurrency,
			(completed, total) => {
				progressMap.set(projectId, { phase: "generating", completed, total })
			}
		)

		// --- EVALUATION PHASE ---
		progressMap.set(projectId, {
			phase: "evaluating",
			completed: 0,
			total: outputs.length,
		})

		// Update iteration status
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			[`iterations.${i}.status`]: "evaluating",
		})

		const evalResults = await evaluateOutputs(
			outputs,
			evalQuestions,
			config.evalModel
		)

		const avgScore =
			evalResults.length > 0
				? evalResults.reduce((sum, r) => sum + r.overallScore, 0) /
				evalResults.length
				: 0

		// Update iteration with eval results
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			[`iterations.${i}.generations`]: evalResults,
			[`iterations.${i}.averageScore`]: avgScore,
			[`iterations.${i}.status`]: "rewriting",
		})

		// --- REWRITE PHASE ---
		progressMap.set(projectId, { phase: "rewriting", completed: 0, total: 1 })

		const rewriteResult = await rewritePrompt(
			currentPrompt,
			evalQuestions,
			evalResults,
			config.rewriteModel
		)

		// Update iteration with rewrite results
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			[`iterations.${i}.analysis`]: rewriteResult.analysis,
			[`iterations.${i}.recommendations`]: rewriteResult.recommendations,
			[`iterations.${i}.rewrittenPrompt`]: rewriteResult.rewrittenPrompt,
		})

		// Check if this is the last iteration
		const isLastIteration = i === config.maxIterations - 1

		// Build new version entry
		const newVersion = {
			version: i + 2, // version 1 = original, so iteration 0 produces version 2
			prompt: rewriteResult.rewrittenPrompt,
			changeSummary: rewriteResult.recommendations.join("; "),
			changeReason: rewriteResult.analysis,
			score: avgScore,
			createdAt: new Date(),
		}

		if (isLastIteration) {
			// Mark iteration and project as completed, push final version
			await PromptProjectModel.findByIdAndUpdate(projectId, {
				[`iterations.${i}.status`]: "completed",
				status: "completed",
				currentIteration: i + 1,
				$push: { promptVersions: newVersion },
			})
		} else if (config.autoConfirm) {
			// Auto-confirm: apply rewritten prompt, push version, and continue
			await PromptProjectModel.findByIdAndUpdate(projectId, {
				[`iterations.${i}.status`]: "confirmed",
				currentIteration: i + 1,
				$push: { promptVersions: newVersion },
			})
			currentPrompt = rewriteResult.rewrittenPrompt
		} else {
			// Manual review: pause and wait for confirmation
			await PromptProjectModel.findByIdAndUpdate(projectId, {
				[`iterations.${i}.status`]: "awaiting_confirmation",
				status: "paused",
				currentIteration: i + 1,
			})
			progressMap.set(projectId, { phase: "idle", completed: 0, total: 0 })
			return // Exit the loop — user must confirm to continue
		}
	}

	progressMap.set(projectId, { phase: "idle", completed: 0, total: 0 })
}

export async function confirmIteration(
	projectId: string,
	editedPrompt?: string
): Promise<void> {
	await connectDB()

	const project = await PromptProjectModel.findById(projectId)
	if (!project) throw new Error("Project not found")

	const lastIteration = project.iterations[project.iterations.length - 1]
	if (!lastIteration || lastIteration.status !== "awaiting_confirmation") {
		throw new Error("No iteration awaiting confirmation")
	}

	const iterationIndex = project.iterations.length - 1

	// If user edited the prompt, update it
	const finalPrompt = editedPrompt || lastIteration.rewrittenPrompt
	const changeSummary = editedPrompt
		? "Manually edited by user"
		: lastIteration.recommendations?.join("; ") ?? ""
	const changeReason = editedPrompt
		? "User modified the AI-suggested rewrite"
		: lastIteration.analysis ?? ""

	const newVersion = {
		version: project.promptVersions.length + 1,
		prompt: finalPrompt,
		changeSummary,
		changeReason,
		score: lastIteration.averageScore ?? null,
		createdAt: new Date(),
	}

	if (editedPrompt) {
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			[`iterations.${iterationIndex}.rewrittenPrompt`]: editedPrompt,
			[`iterations.${iterationIndex}.status`]: "confirmed",
			$push: { promptVersions: newVersion },
		})
	} else {
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			[`iterations.${iterationIndex}.status`]: "confirmed",
			$push: { promptVersions: newVersion },
		})
	}

	// Continue the optimization loop
	await runOptimization(projectId)
}
