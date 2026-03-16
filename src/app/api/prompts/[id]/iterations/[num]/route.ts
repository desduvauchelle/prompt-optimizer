import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"
import { cancelOptimization } from "@/lib/engine/orchestrator"

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string; num: string }> }
) {
	try {
		await connectDB()
		const { id, num } = await params
		const iterationNumber = parseInt(num, 10)

		if (isNaN(iterationNumber) || iterationNumber < 1) {
			return NextResponse.json(
				{ error: "Invalid iteration number" },
				{ status: 400 }
			)
		}

		const project = await PromptProjectModel.findById(id)
		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 })
		}

		// If the project is running and this is the active iteration, cancel it
		if (project.status === "running") {
			cancelOptimization(id)
		}

		// Remove the iteration by iterationNumber
		await PromptProjectModel.findByIdAndUpdate(id, {
			$pull: { iterations: { iterationNumber } },
		})

		// Recalculate currentIteration based on remaining iterations
		const updated = await PromptProjectModel.findById(id)
		const remaining = updated?.iterations ?? []
		const newCurrentIteration =
			remaining.length > 0
				? Math.max(...remaining.map((it: { iterationNumber: number }) => it.iterationNumber))
				: 0

		// Determine new status
		const wasActive = project.status === "running"
		const newStatus = wasActive ? "paused" : remaining.length === 0 ? "draft" : project.status

		await PromptProjectModel.findByIdAndUpdate(id, {
			currentIteration: newCurrentIteration,
			status: newStatus,
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to delete iteration"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
