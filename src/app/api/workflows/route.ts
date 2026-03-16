import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { WorkflowProjectModel } from "@/lib/db/models/workflow-project"
import { z } from "zod"

const CreateWorkflowSchema = z.object({
	name: z.string().min(1, "Name is required"),
	inputDef: z.object({
		description: z.string().min(1, "Input description is required"),
		example: z.string().default(""),
	}),
	outputDef: z.object({
		description: z.string().min(1, "Output description is required"),
		example: z.string().default(""),
		format: z.enum(["json", "text", "markdown"]).default("text"),
	}),
	designModel: z.string().min(1, "Design model is required"),
	autoStartOptimization: z.boolean().default(false),
})

export async function GET() {
	try {
		await connectDB()

		const workflows = await WorkflowProjectModel.find(
			{},
			{
				name: 1,
				status: 1,
				currentOptimizingStepIndex: 1,
				"steps.id": 1,
				"steps.name": 1,
				"steps.optimizationStatus": 1,
				"steps.bestScore": 1,
				totalCost: 1,
				createdAt: 1,
			}
		)
			.sort({ createdAt: -1 })
			.lean()

		const formatted = workflows.map((w) => ({
			_id: w._id,
			name: w.name,
			status: w.status,
			stepsCount: w.steps?.length ?? 0,
			completedSteps: w.steps?.filter((s: Record<string, unknown>) => s.optimizationStatus === "completed").length ?? 0,
			totalCost: w.totalCost ?? 0,
			createdAt: w.createdAt,
		}))

		return NextResponse.json({ workflows: formatted })
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to fetch workflows"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		await connectDB()

		const body = await req.json()
		const parsed = CreateWorkflowSchema.parse(body)

		const workflow = await WorkflowProjectModel.create({
			...parsed,
			steps: [],
			status: "draft",
			currentOptimizingStepIndex: 0,
			totalCost: 0,
		})

		return NextResponse.json({ workflow }, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.issues },
				{ status: 400 }
			)
		}
		const message = error instanceof Error ? error.message : "Failed to create workflow"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
