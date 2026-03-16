import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { WorkflowProjectModel } from "@/lib/db/models/workflow-project"
import { designWorkflow } from "@/lib/engine/workflow-designer"
import { randomId } from "@/lib/engine/utils"
import { runWorkflowOptimization } from "@/lib/engine/workflow-orchestrator"

export async function POST(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB()
		const { id } = await params

		const workflow = await WorkflowProjectModel.findById(id)
		if (!workflow) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
		}

		if (workflow.status !== "draft" && workflow.status !== "awaiting_review") {
			return NextResponse.json(
				{ error: "Workflow must be in draft or awaiting_review status to design" },
				{ status: 400 }
			)
		}

		// Mark as designing
		await WorkflowProjectModel.findByIdAndUpdate(id, { status: "designing" })

		// Fire-and-forget the design process
		;(async () => {
			try {
				const result = await designWorkflow(
					workflow.inputDef,
					workflow.outputDef,
					workflow.designModel
				)

				// Map step names to IDs and resolve inputSource references
				const nameToId = new Map<string, string>()
				const steps = result.steps.map((step) => {
					const stepId = randomId()
					nameToId.set(step.name, stepId)
					return { ...step, _id: stepId }
				})

				const dbSteps = steps.map((step, idx) => {
					// Resolve inputSource: "workflow_input" stays, step names get mapped to IDs
					let inputSource = step.inputSource
					if (inputSource !== "workflow_input" && nameToId.has(inputSource)) {
						inputSource = nameToId.get(inputSource)!
					} else if (inputSource !== "workflow_input" && idx > 0) {
						// Fallback: point to previous step
						inputSource = steps[idx - 1]._id
					}

					return {
						id: step._id,
						name: step.name,
						description: step.description,
						systemPrompt: step.systemPrompt,
						model: step.modelSuggestion || "",
						inputSource,
						outputKey: step.name, // use step name as output key
						outputDescription: step.outputDescription || "",
						evalQuestions: (step.evalQuestions ?? []).map((eq: { id?: string; question: string }) => ({
							id: eq.id || randomId(),
							question: eq.question,
						})),
						optimizationConfig: {
							maxIterations: 3,
							generationsPerIteration: 5,
							concurrency: 3,
							generationModel: step.modelSuggestion || "",
							evalModel: workflow.designModel,
							rewriteModel: workflow.designModel,
							autoConfirm: true,
							successThreshold: 85,
						},
						optimizationStatus: "pending",
					}
				})

				await WorkflowProjectModel.findByIdAndUpdate(id, {
					steps: dbSteps,
					designReasoning: result.reasoning,
					status: workflow.autoStartOptimization ? "optimizing" : "awaiting_review",
					$inc: { totalCost: result.cost },
				})

				// If auto-start, kick off optimization
				if (workflow.autoStartOptimization) {
					runWorkflowOptimization(id).catch(console.error)
				}
			} catch (error) {
				console.error("Workflow design failed:", error)
				await WorkflowProjectModel.findByIdAndUpdate(id, {
					status: "draft",
					designReasoning: `Design failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				})
			}
		})()

		return NextResponse.json({ status: "designing" }, { status: 202 })
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to start design"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
