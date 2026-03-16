import { NextRequest, NextResponse } from "next/server"
import { getWorkflowStatus } from "@/lib/engine/workflow-orchestrator"

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id } = await params
		const progress = await getWorkflowStatus(id)
		return NextResponse.json(progress)
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to get status"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
