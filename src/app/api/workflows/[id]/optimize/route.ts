import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { WorkflowProjectModel } from "@/lib/db/models/workflow-project"
import { runWorkflowOptimization, reoptimizeStep } from "@/lib/engine/workflow-orchestrator"

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB()
		const { id } = await params

		const workflow = await WorkflowProjectModel.findById(id)
		if (!workflow) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
		}

		const body = await req.json().catch(() => ({}))
		const stepIndex = body.stepIndex as number | undefined

		// Check required fields for optimization
		for (const step of workflow.steps) {
			if (!step.systemPrompt) {
				return NextResponse.json(
					{ error: `Step "${step.name}" is missing a system prompt` },
					{ status: 400 }
				)
			}
			if (!step.evalQuestions?.length) {
				return NextResponse.json(
					{ error: `Step "${step.name}" needs at least one eval question` },
					{ status: 400 }
				)
			}
		}

		if (stepIndex !== undefined) {
			// Re-optimize a single step
			reoptimizeStep(id, stepIndex).catch(console.error)
		} else {
			// Optimize all steps from the beginning (or current index)
			if (workflow.status === "optimizing") {
				return NextResponse.json(
					{ error: "Workflow is already optimizing" },
					{ status: 400 }
				)
			}
			runWorkflowOptimization(id).catch(console.error)
		}

		return NextResponse.json({ status: "optimizing" }, { status: 202 })
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to start optimization"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
