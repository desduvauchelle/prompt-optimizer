import { NextResponse } from "next/server"
import { getAvailableModels } from "@/lib/openrouter/models"

export async function GET() {
	try {
		const models = await getAvailableModels()
		return NextResponse.json({ models })
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch models"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
