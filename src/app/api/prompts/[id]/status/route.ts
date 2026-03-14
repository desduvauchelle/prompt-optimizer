import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"
import { getProgress } from "@/lib/engine/orchestrator"

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB()
		const { id } = await params
		const project = await PromptProjectModel.findById(id, {
			status: 1,
			currentIteration: 1,
			"config.maxIterations": 1,
		}).lean()

		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 })
		}

		const progress = getProgress(id)

		return NextResponse.json({
			status: project.status,
			phase: progress.phase,
			progress: {
				completed: progress.completed,
				total: progress.total,
			},
			currentIteration: project.currentIteration,
			maxIterations: project.config?.maxIterations ?? 0,
		})
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to get status"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
