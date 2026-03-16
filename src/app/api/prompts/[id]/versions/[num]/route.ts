import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string; num: string }> }
) {
	try {
		await connectDB()
		const { id, num } = await params
		const versionNumber = parseInt(num, 10)

		if (isNaN(versionNumber) || versionNumber < 1) {
			return NextResponse.json(
				{ error: "Invalid version number" },
				{ status: 400 }
			)
		}

		const project = await PromptProjectModel.findById(id)
		if (!project) {
			return NextResponse.json({ error: "Project not found" }, { status: 404 })
		}

		await PromptProjectModel.findByIdAndUpdate(id, {
			$pull: { promptVersions: { version: versionNumber } },
		})

		return NextResponse.json({ success: true })
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to delete version"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
