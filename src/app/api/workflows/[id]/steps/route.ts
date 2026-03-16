import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { WorkflowProjectModel } from "@/lib/db/models/workflow-project"
import { z } from "zod"

const UpdateStepsSchema = z.object({
	steps: z.array(
		z.object({
			id: z.string(),
			name: z.string().min(1),
			description: z.string().default(""),
			systemPrompt: z.string().min(1),
			model: z.string().default(""),
			inputSource: z.string().default("workflow_input"),
			outputKey: z.string().min(1),
			outputDescription: z.string().default(""),
			evalQuestions: z.array(
				z.object({
					id: z.string(),
					question: z.string().min(1),
				})
			).default([]),
			optimizationConfig: z.object({
				maxIterations: z.number().int().min(1).max(50).default(3),
				generationsPerIteration: z.number().int().min(1).max(100).default(5),
				concurrency: z.number().int().min(1).max(20).default(3),
				generationModel: z.string().default(""),
				evalModel: z.string().default(""),
				rewriteModel: z.string().default(""),
				autoConfirm: z.boolean().default(true),
				successThreshold: z.number().min(0).max(100).default(85),
			}).default({
				maxIterations: 3,
				generationsPerIteration: 5,
				concurrency: 3,
				generationModel: "",
				evalModel: "",
				rewriteModel: "",
				autoConfirm: true,
				successThreshold: 85,
			}),
		})
	),
})

export async function PUT(
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

		if (workflow.status !== "awaiting_review" && workflow.status !== "draft") {
			return NextResponse.json(
				{ error: "Can only update steps when workflow is in review or draft" },
				{ status: 400 }
			)
		}

		const body = await req.json()
		const parsed = UpdateStepsSchema.parse(body)

		// Reset all steps to pending
		const steps = parsed.steps.map((step) => ({
			...step,
			optimizationStatus: "pending",
			linkedPromptProjectId: null,
			bestPrompt: null,
			bestScore: null,
		}))

		await WorkflowProjectModel.findByIdAndUpdate(id, {
			steps,
			status: "awaiting_review",
			currentOptimizingStepIndex: 0,
		})

		const updated = await WorkflowProjectModel.findById(id).lean()
		return NextResponse.json({ workflow: updated })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.issues },
				{ status: 400 }
			)
		}
		const message = error instanceof Error ? error.message : "Failed to update steps"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
