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

// In-memory cancellation flags
const canceledProjects = new Set<string>()

export function cancelOptimization(projectId: string): void {
	canceledProjects.add(projectId)
}

function isCanceled(projectId: string): boolean {
	return canceledProjects.has(projectId)
}

function clearCancel(projectId: string): void {
	canceledProjects.delete(projectId)
}

export function getProgress(projectId: string): RunProgress {
	return progressMap.get(projectId) ?? { phase: "idle", completed: 0, total: 0 }
}

export async function runOptimization(projectId: string): Promise<void> {
	await connectDB()

	const project = await PromptProjectModel.findById(projectId)
	if (!project) throw new Error("Project not found")

	const { config, evalQuestions, testCases, systemPromptFiles, objective } = project
	let currentPrompt =
		project.iterations.length > 0
			? project.iterations[project.iterations.length - 1].rewrittenPrompt ??
			project.systemPrompt
			: project.systemPrompt

	const startIteration = project.currentIteration

	// Total outputs per iteration = max(testCases, 1) × generationsPerIteration
	const testCaseCount = Math.max(testCases.length, 1)
	const totalPerIteration = testCaseCount * config.generationsPerIteration

	for (let i = startIteration; i < config.maxIterations; i++) {
		// Check for cancellation at the start of each iteration
		if (isCanceled(projectId)) {
			clearCancel(projectId)
			progressMap.set(projectId, { phase: "idle", completed: 0, total: 0 })
			return
		}

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
			cost: 0,
		}

		// Push iteration stub
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			$push: { iterations: iteration },
		})

		progressMap.set(projectId, {
			phase: "generating",
			completed: 0,
			total: totalPerIteration,
		})

		const outputs = await generateOutputs(
			currentPrompt,
			systemPromptFiles ?? [],
			testCases ?? [],
			config.generationModel,
			config.generationsPerIteration,
			config.concurrency,
			(completed, total) => {
				progressMap.set(projectId, { phase: "generating", completed, total })
			}
		)

		// Check for cancellation after generation
		if (isCanceled(projectId)) {
			clearCancel(projectId)
			progressMap.set(projectId, { phase: "idle", completed: 0, total: 0 })
			await PromptProjectModel.findByIdAndUpdate(projectId, { status: "paused" })
			return
		}

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
			config.evalModel,
			testCases
		)

		// Check for cancellation after evaluation
		if (isCanceled(projectId)) {
			clearCancel(projectId)
			progressMap.set(projectId, { phase: "idle", completed: 0, total: 0 })
			await PromptProjectModel.findByIdAndUpdate(projectId, { status: "paused" })
			return
		}

		const avgScore =
			evalResults.length > 0
				? evalResults.reduce((sum, r) => sum + r.overallScore, 0) /
				evalResults.length
				: 0

		// Calculate iteration cost so far (generation + eval)
		const genEvalCost = evalResults.reduce((sum, r) => sum + r.cost, 0)

		// Update iteration with eval results
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			[`iterations.${i}.generations`]: evalResults,
			[`iterations.${i}.averageScore`]: avgScore,
			[`iterations.${i}.status`]: "rewriting",
		})

		// Update the score of the version that was just tested (version = i+1)
		await PromptProjectModel.updateOne(
			{ _id: projectId, "promptVersions.version": i + 1 },
			{ $set: { "promptVersions.$.score": avgScore } }
		)

		// Check success threshold — if score meets it, stop early
		const threshold = config.successThreshold ?? 90
		if (threshold > 0 && avgScore >= threshold / 100) {
			const iterationCost = genEvalCost
			await PromptProjectModel.findByIdAndUpdate(projectId, {
				[`iterations.${i}.status`]: "completed",
				[`iterations.${i}.cost`]: iterationCost,
				status: "completed",
				currentIteration: i + 1,
				$inc: { totalCost: iterationCost },
			})
			progressMap.set(projectId, { phase: "idle", completed: 0, total: 0 })
			return
		}

		// --- REWRITE PHASE ---
		progressMap.set(projectId, { phase: "rewriting", completed: 0, total: 1 })

		const rewriteResult = await rewritePrompt(
			currentPrompt,
			evalQuestions,
			evalResults,
			config.rewriteModel,
			objective,
			testCases
		)

		// Update iteration with rewrite results
		await PromptProjectModel.findByIdAndUpdate(projectId, {
			[`iterations.${i}.analysis`]: rewriteResult.analysis,
			[`iterations.${i}.recommendations`]: rewriteResult.recommendations,
			[`iterations.${i}.rewrittenPrompt`]: rewriteResult.rewrittenPrompt,
		})

		// Calculate total iteration cost
		const iterationCost = genEvalCost + rewriteResult.cost

		// Check if this is the last iteration
		const isLastIteration = i === config.maxIterations - 1

		// Build new version entry — score is null because this version hasn't been tested yet
		const newVersion = {
			version: i + 2, // version 1 = original, so iteration 0 produces version 2
			prompt: rewriteResult.rewrittenPrompt,
			changeSummary: rewriteResult.recommendations.join("; "),
			changeReason: rewriteResult.analysis,
			score: null,
			createdAt: new Date(),
		}

		if (isLastIteration) {
			// Mark iteration and project as completed, push final version
			await PromptProjectModel.findByIdAndUpdate(projectId, {
				[`iterations.${i}.status`]: "completed",
				[`iterations.${i}.cost`]: iterationCost,
				status: "completed",
				currentIteration: i + 1,
				$push: { promptVersions: newVersion },
				$inc: { totalCost: iterationCost },
			})
		} else if (config.autoConfirm) {
			// Auto-confirm: apply rewritten prompt, push version, and continue
			await PromptProjectModel.findByIdAndUpdate(projectId, {
				[`iterations.${i}.status`]: "confirmed",
				[`iterations.${i}.cost`]: iterationCost,
				currentIteration: i + 1,
				$push: { promptVersions: newVersion },
				$inc: { totalCost: iterationCost },
			})
			currentPrompt = rewriteResult.rewrittenPrompt
		} else {
			// Manual review: pause and wait for confirmation
			await PromptProjectModel.findByIdAndUpdate(projectId, {
				[`iterations.${i}.status`]: "awaiting_confirmation",
				[`iterations.${i}.cost`]: iterationCost,
				status: "paused",
				currentIteration: i + 1,
				$inc: { totalCost: iterationCost },
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
		score: null, // score will be assigned when this version is evaluated in the next iteration
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

	// Update score on the version that was just tested (version = iterationNumber)
	await PromptProjectModel.updateOne(
		{ _id: projectId, "promptVersions.version": lastIteration.iterationNumber },
		{ $set: { "promptVersions.$.score": lastIteration.averageScore ?? 0 } }
	)

	// Continue the optimization loop
	await runOptimization(projectId)
}
