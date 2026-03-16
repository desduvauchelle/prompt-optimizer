import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { WorkflowProjectModel } from "@/lib/db/models/workflow-project"
import { exportWorkflowConfig, exportWorkflowSDK } from "@/lib/engine/workflow-exporter"
import type { WorkflowProject } from "@/lib/types/workflow"

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

		const config = exportWorkflowConfig(workflow as unknown as WorkflowProject)
		const sdk = exportWorkflowSDK(workflow as unknown as WorkflowProject)

		return NextResponse.json({ config, sdk })
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to export"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
