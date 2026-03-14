import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"
import { runOptimization } from "@/lib/engine/orchestrator"

export async function POST(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		await connectDB()
		const { id } = await params
		const project = await PromptProjectModel.findById(id)

		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 })
		}

		if (!["draft", "paused"].includes(project.status)) {
			return NextResponse.json(
				{ error: "Can only launch draft or paused projects" },
				{ status: 400 }
			)
		}

		// Fire-and-forget: start optimization in background
		runOptimization(id).catch((err) => {
			console.error(`Optimization failed for project ${id}:`, err)
			// Mark project as paused on error
			PromptProjectModel.findByIdAndUpdate(id, { status: "paused" }).catch(
				console.error
			)
		})

		return NextResponse.json(
			{ message: "Optimization started" },
			{ status: 202 }
		)
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to launch optimization"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
