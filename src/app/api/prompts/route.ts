import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"
import { z } from "zod"

const CreateProjectSchema = z.object({
	name: z.string().optional(),
	sourcePrompt: z.string().min(1, "Source prompt is required"),
	evalQuestions: z
		.array(
			z.object({
				id: z.string(),
				question: z.string().min(1),
			})
		)
		.min(1, "At least one eval question is required"),
	config: z.object({
		maxIterations: z.number().int().min(1).max(50).default(3),
		generationsPerIteration: z.number().int().min(1).max(100).default(10),
		concurrency: z.number().int().min(1).max(20).default(5),
		generationModel: z.string().min(1),
		evalModel: z.string().min(1),
		rewriteModel: z.string().min(1),
		autoConfirm: z.boolean().default(false),
	}),
})

export async function GET() {
	try {
		await connectDB()

		const projects = await PromptProjectModel.find(
			{},
			{
				name: 1,
				status: 1,
				currentIteration: 1,
				"config.maxIterations": 1,
				"iterations.averageScore": 1,
				createdAt: 1,
			}
		)
			.sort({ createdAt: -1 })
			.lean()

		// Compute latest score for each project
		const formatted = projects.map((p) => {
			const iterations = p.iterations ?? []
			const latestScore =
				iterations.length > 0
					? iterations[iterations.length - 1].averageScore ?? 0
					: null
			return {
				_id: p._id,
				name: p.name,
				status: p.status,
				currentIteration: p.currentIteration,
				maxIterations: p.config?.maxIterations ?? 0,
				latestScore,
				createdAt: p.createdAt,
			}
		})

		return NextResponse.json({ projects: formatted })
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to fetch projects"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		await connectDB()

		const body = await req.json()
		const parsed = CreateProjectSchema.parse(body)

		// Auto-generate name from first ~50 chars of prompt if not provided
		const name =
			parsed.name?.trim() ||
			parsed.sourcePrompt.substring(0, 50).replace(/\s+\S*$/, "") + "..."

		const project = await PromptProjectModel.create({
			...parsed,
			name,
			promptVersions: [
				{
					version: 1,
					prompt: parsed.sourcePrompt,
					changeSummary: null,
					changeReason: null,
					score: null,
					createdAt: new Date(),
				},
			],
		})

		return NextResponse.json({ project }, { status: 201 })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.issues },
				{ status: 400 }
			)
		}
		const message =
			error instanceof Error ? error.message : "Failed to create project"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
