import { connectDB } from "@/lib/db/mongodb"
import { WorkflowProjectModel } from "@/lib/db/models/workflow-project"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"
import { runOptimization } from "@/lib/engine/orchestrator"
import { randomId } from "@/lib/engine/utils"
import type { WorkflowProgress } from "@/lib/types/workflow"

// In-memory progress for polling
interface WorkflowRunProgress {
	phase: "idle" | "designing" | "optimizing_step"
	currentStepIndex: number
}

const workflowProgressMap = new Map<string, WorkflowRunProgress>()

export function getWorkflowProgress(workflowId: string): WorkflowRunProgress {
	return workflowProgressMap.get(workflowId) ?? { phase: "idle", currentStepIndex: 0 }
}

export async function getWorkflowStatus(workflowId: string): Promise<WorkflowProgress> {
	await connectDB()
	const workflow = await WorkflowProjectModel.findById(workflowId).lean()
	if (!workflow) throw new Error("Workflow not found")

	const inMemory = getWorkflowProgress(workflowId)

	return {
		status: workflow.status as WorkflowProgress["status"],
		phase: inMemory.phase,
		currentStepIndex: inMemory.currentStepIndex,
		steps: (workflow.steps ?? []).map((s: Record<string, unknown>) => ({
			id: s.id as string,
			name: s.name as string,
			optimizationStatus: s.optimizationStatus as string,
			bestScore: s.bestScore as number | undefined,
		})),
	} as WorkflowProgress
}

/**
 * Main workflow optimization loop.
 * Iterates steps in order. For each step:
 * 1. Creates a PromptProject with appropriate test cases
 * 2. Runs the existing prompt optimization engine
 * 3. Extracts the best prompt and feeds it forward
 */
export async function runWorkflowOptimization(workflowId: string): Promise<void> {
	await connectDB()

	const workflow = await WorkflowProjectModel.findById(workflowId)
	if (!workflow) throw new Error("Workflow not found")

	await WorkflowProjectModel.findByIdAndUpdate(workflowId, { status: "optimizing" })

	const startIndex = workflow.currentOptimizingStepIndex ?? 0

	for (let i = startIndex; i < workflow.steps.length; i++) {
		const step = workflow.steps[i]

		workflowProgressMap.set(workflowId, { phase: "optimizing_step", currentStepIndex: i })

		// Mark step as running
		await WorkflowProjectModel.findByIdAndUpdate(workflowId, {
			[`steps.${i}.optimizationStatus`]: "running",
			currentOptimizingStepIndex: i,
		})

		try {
			// Build test cases for this step
			const testCases = await buildTestCasesForStep(workflow, i)

			// Create a PromptProject for this step's optimization
			const promptProject = await PromptProjectModel.create({
				name: `[Workflow] ${workflow.name} — Step ${i + 1}: ${step.name}`,
				objective: step.description,
				systemPrompt: step.systemPrompt,
				systemPromptFiles: [],
				testCases,
				evalQuestions: step.evalQuestions,
				config: {
					maxIterations: step.optimizationConfig?.maxIterations ?? 3,
					generationsPerIteration: step.optimizationConfig?.generationsPerIteration ?? 5,
					concurrency: step.optimizationConfig?.concurrency ?? 3,
					generationModel: step.model || step.optimizationConfig?.generationModel || "",
					evalModel: step.optimizationConfig?.evalModel || "",
					rewriteModel: step.optimizationConfig?.rewriteModel || "",
					autoConfirm: step.optimizationConfig?.autoConfirm ?? true,
					successThreshold: step.optimizationConfig?.successThreshold ?? 85,
				},
				promptVersions: [{
					version: 1,
					prompt: step.systemPrompt,
					changeSummary: null,
					changeReason: null,
					score: null,
					createdAt: new Date(),
				}],
			})

			// Link the prompt project
			await WorkflowProjectModel.findByIdAndUpdate(workflowId, {
				[`steps.${i}.linkedPromptProjectId`]: promptProject._id.toString(),
			})

			// Run the prompt optimization
			await runOptimization(promptProject._id.toString())

			// Fetch the completed project to extract results
			const completedProject = await PromptProjectModel.findById(promptProject._id)
			if (!completedProject) throw new Error("Prompt project not found after optimization")

			// Get the best prompt (latest version)
			const latestVersion = completedProject.promptVersions[completedProject.promptVersions.length - 1]
			const lastIteration = completedProject.iterations[completedProject.iterations.length - 1]
			const bestScore = lastIteration?.averageScore ?? 0

			// Update step with results
			await WorkflowProjectModel.findByIdAndUpdate(workflowId, {
				[`steps.${i}.optimizationStatus`]: "completed",
				[`steps.${i}.bestPrompt`]: latestVersion?.prompt ?? step.systemPrompt,
				[`steps.${i}.bestScore`]: bestScore,
				$inc: { totalCost: completedProject.totalCost ?? 0 },
			})
		} catch (error) {
			console.error(`Workflow step ${i} optimization failed:`, error)
			await WorkflowProjectModel.findByIdAndUpdate(workflowId, {
				[`steps.${i}.optimizationStatus`]: "failed",
			})
			// Continue to next step even if one fails
		}
	}

	// All steps done
	await WorkflowProjectModel.findByIdAndUpdate(workflowId, {
		status: "completed",
		currentOptimizingStepIndex: workflow.steps.length,
	})

	workflowProgressMap.set(workflowId, { phase: "idle", currentStepIndex: workflow.steps.length })
}

/**
 * Build test cases for a given step.
 * - Step 0 (or inputSource === "workflow_input"): uses the workflow input example.
 * - Step N: uses the best generation outputs from the source step.
 */
async function buildTestCasesForStep(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	workflow: any,
	stepIndex: number
): Promise<{ id: string; name: string; content: string; files: never[] }[]> {
	const step = workflow.steps[stepIndex]

	if (step.inputSource === "workflow_input" || stepIndex === 0) {
		// Use the workflow input example
		const example = workflow.inputDef?.example || ""
		if (!example) {
			return [{ id: randomId(), name: "Default input", content: "No example input provided.", files: [] }]
		}
		return [{ id: randomId(), name: "Workflow input example", content: example, files: [] }]
	}

	// Find the source step by ID
	const sourceStep = workflow.steps.find((s: Record<string, unknown>) => s.id === step.inputSource)
	if (!sourceStep?.linkedPromptProjectId) {
		// Source step hasn't been optimized yet — use workflow input as fallback
		const example = workflow.inputDef?.example || ""
		return [{ id: randomId(), name: "Fallback input", content: example || "No input available.", files: [] }]
	}

	// Get the best outputs from the source step's prompt project
	const sourceProject = await PromptProjectModel.findById(sourceStep.linkedPromptProjectId)
	if (!sourceProject || sourceProject.iterations.length === 0) {
		return [{ id: randomId(), name: "Fallback input", content: "No output from previous step.", files: [] }]
	}

	// Use the best iteration's top generation(s) as test cases
	const bestIteration = sourceProject.iterations.reduce(
		(best: { averageScore: number }, iter: { averageScore: number }) =>
			iter.averageScore > best.averageScore ? iter : best,
		sourceProject.iterations[0]
	)

	// Take the top-scoring outputs as test cases (max 3 to keep cost manageable)
	const topGenerations = [...bestIteration.generations]
		.sort((a: { overallScore: number }, b: { overallScore: number }) => b.overallScore - a.overallScore)
		.slice(0, 3)

	return topGenerations.map((gen: { output: string }, idx: number) => ({
		id: randomId(),
		name: `Step "${sourceStep.name}" output ${idx + 1}`,
		content: gen.output,
		files: [] as never[],
	}))
}

/**
 * Re-optimize a single step in a workflow.
 */
export async function reoptimizeStep(workflowId: string, stepIndex: number): Promise<void> {
	await connectDB()

	const workflow = await WorkflowProjectModel.findById(workflowId)
	if (!workflow) throw new Error("Workflow not found")
	if (stepIndex < 0 || stepIndex >= workflow.steps.length) throw new Error("Invalid step index")

	// Reset this step
	await WorkflowProjectModel.findByIdAndUpdate(workflowId, {
		[`steps.${stepIndex}.optimizationStatus`]: "pending",
		[`steps.${stepIndex}.bestPrompt`]: null,
		[`steps.${stepIndex}.bestScore`]: null,
		[`steps.${stepIndex}.linkedPromptProjectId`]: null,
		currentOptimizingStepIndex: stepIndex,
		status: "optimizing",
	})

	// Create a temporary workflow view starting from this step
	const updatedWorkflow = await WorkflowProjectModel.findById(workflowId)
	if (!updatedWorkflow) throw new Error("Workflow not found")

	workflowProgressMap.set(workflowId, { phase: "optimizing_step", currentStepIndex: stepIndex })

	const step = updatedWorkflow.steps[stepIndex]
	const testCases = await buildTestCasesForStep(updatedWorkflow, stepIndex)

	const promptProject = await PromptProjectModel.create({
		name: `[Workflow] ${updatedWorkflow.name} — Step ${stepIndex + 1}: ${step.name} (re-opt)`,
		objective: step.description,
		systemPrompt: step.bestPrompt || step.systemPrompt,
		systemPromptFiles: [],
		testCases,
		evalQuestions: step.evalQuestions,
		config: {
			maxIterations: step.optimizationConfig?.maxIterations ?? 3,
			generationsPerIteration: step.optimizationConfig?.generationsPerIteration ?? 5,
			concurrency: step.optimizationConfig?.concurrency ?? 3,
			generationModel: step.model || step.optimizationConfig?.generationModel || "",
			evalModel: step.optimizationConfig?.evalModel || "",
			rewriteModel: step.optimizationConfig?.rewriteModel || "",
			autoConfirm: step.optimizationConfig?.autoConfirm ?? true,
			successThreshold: step.optimizationConfig?.successThreshold ?? 85,
		},
		promptVersions: [{
			version: 1,
			prompt: step.bestPrompt || step.systemPrompt,
			changeSummary: null,
			changeReason: null,
			score: null,
			createdAt: new Date(),
		}],
	})

	await WorkflowProjectModel.findByIdAndUpdate(workflowId, {
		[`steps.${stepIndex}.linkedPromptProjectId`]: promptProject._id.toString(),
		[`steps.${stepIndex}.optimizationStatus`]: "running",
	})

	try {
		await runOptimization(promptProject._id.toString())

		const completed = await PromptProjectModel.findById(promptProject._id)
		if (completed) {
			const latestVersion = completed.promptVersions[completed.promptVersions.length - 1]
			const lastIteration = completed.iterations[completed.iterations.length - 1]

			await WorkflowProjectModel.findByIdAndUpdate(workflowId, {
				[`steps.${stepIndex}.optimizationStatus`]: "completed",
				[`steps.${stepIndex}.bestPrompt`]: latestVersion?.prompt ?? step.systemPrompt,
				[`steps.${stepIndex}.bestScore`]: lastIteration?.averageScore ?? 0,
				status: "completed",
				$inc: { totalCost: completed.totalCost ?? 0 },
			})
		}
	} catch (error) {
		console.error(`Re-optimization of step ${stepIndex} failed:`, error)
		await WorkflowProjectModel.findByIdAndUpdate(workflowId, {
			[`steps.${stepIndex}.optimizationStatus`]: "failed",
			status: "completed",
		})
	}

	workflowProgressMap.set(workflowId, { phase: "idle", currentStepIndex: stepIndex })
}
