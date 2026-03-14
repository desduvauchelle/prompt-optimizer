import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"
import { confirmIteration } from "@/lib/engine/orchestrator"

export async function POST(
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

		if (project.status !== "paused") {
			return NextResponse.json(
				{ error: "Project is not awaiting confirmation" },
				{ status: 400 }
			)
		}

		const body = await req.json()
		const { editedPrompt } = body as { editedPrompt?: string }

		// Fire-and-forget: confirm and continue
		confirmIteration(id, editedPrompt).catch((err) => {
			console.error(`Confirm failed for project ${id}:`, err)
			PromptProjectModel.findByIdAndUpdate(id, { status: "paused" }).catch(
				console.error
			)
		})

		return NextResponse.json(
			{ message: "Iteration confirmed, continuing optimization" },
			{ status: 202 }
		)
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to confirm iteration"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
