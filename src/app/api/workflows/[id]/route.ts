import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { WorkflowProjectModel } from "@/lib/db/models/workflow-project"

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB()
		const { id } = await params
		const workflow = await WorkflowProjectModel.findById(id).lean()
		if (!workflow) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
		}
		return NextResponse.json({ workflow })
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to fetch workflow"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

export async function PUT(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB()
		const { id } = await params
		const body = await req.json()

		const workflow = await WorkflowProjectModel.findById(id)
		if (!workflow) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
		}

		if (workflow.status === "optimizing") {
			return NextResponse.json(
				{ error: "Cannot edit workflow while optimizing" },
				{ status: 400 }
			)
		}

		const allowedFields = ["name", "inputDef", "outputDef", "designModel", "autoStartOptimization", "steps"]
		const updates: Record<string, unknown> = {}
		for (const field of allowedFields) {
			if (body[field] !== undefined) {
				updates[field] = body[field]
			}
		}

		const updated = await WorkflowProjectModel.findByIdAndUpdate(id, updates, { new: true }).lean()
		return NextResponse.json({ workflow: updated })
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to update workflow"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB()
		const { id } = await params
		const deleted = await WorkflowProjectModel.findByIdAndDelete(id)
		if (!deleted) {
			return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
		}
		return NextResponse.json({ success: true })
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to delete workflow"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
