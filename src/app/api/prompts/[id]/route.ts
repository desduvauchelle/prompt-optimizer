import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB()
		const { id } = await params
		const project = await PromptProjectModel.findById(id).lean()

		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 })
		}

		// Backwards compat: map old sourcePrompt to systemPrompt
		const p = project as Record<string, unknown>
		if (!p.systemPrompt && p.sourcePrompt) {
			p.systemPrompt = p.sourcePrompt
		}
		if (!p.testCases) p.testCases = []
		if (!p.systemPromptFiles) p.systemPromptFiles = []
		if (!p.objective) p.objective = ""

		return NextResponse.json({ project })
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch project"
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
		const project = await PromptProjectModel.findById(id)

		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 })
		}

		if (project.status === "running") {
			return NextResponse.json(
				{ error: "Cannot edit a project while it is running" },
				{ status: 400 }
			)
		}

		const body = await req.json()

		// Only allow updating specific fields
		const allowedFields = [
			"name",
			"objective",
			"systemPrompt",
			"systemPromptFiles",
			"testCases",
			"evalQuestions",
			"config",
		] as const

		const update: Record<string, unknown> = {}
		for (const field of allowedFields) {
			if (body[field] !== undefined) {
				update[field] = body[field]
			}
		}

		const updated = await PromptProjectModel.findByIdAndUpdate(id, update, {
			new: true,
		}).lean()

		return NextResponse.json({ project: updated })
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to update project"
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
		const deleted = await PromptProjectModel.findByIdAndDelete(id)

		if (!deleted) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 })
		}

		return NextResponse.json({ success: true })
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to delete project"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
