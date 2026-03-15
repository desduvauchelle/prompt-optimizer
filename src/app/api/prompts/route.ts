import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { PromptProjectModel } from "@/lib/db/models/prompt-project"
import { z } from "zod"

const FileAttachmentSchema = z.object({
	id: z.string(),
	filename: z.string(),
	mimeType: z.string(),
	data: z.string(),
	size: z.number(),
})

const TestCaseSchema = z.object({
	id: z.string(),
	name: z.string().min(1),
	content: z.string().default(""),
	files: z.array(FileAttachmentSchema).default([]),
})

const CreateProjectSchema = z.object({
	name: z.string().optional(),
	objective: z.string().default(""),
	systemPrompt: z.string().min(1, "System prompt is required"),
	systemPromptFiles: z.array(FileAttachmentSchema).default([]),
	testCases: z.array(TestCaseSchema).default([]),
	evalQuestions: z
		.array(
			z.object({
				id: z.string(),
				question: z.string().min(1),
			})
		)
		.default([]),
	config: z.object({
		maxIterations: z.number().int().min(1).max(50).default(3),
		generationsPerIteration: z.number().int().min(1).max(100).default(10),
		concurrency: z.number().int().min(1).max(20).default(5),
		generationModel: z.string().default(""),
		evalModel: z.string().default(""),
		rewriteModel: z.string().default(""),
		autoConfirm: z.boolean().default(false),
	}).default({
		maxIterations: 3,
		generationsPerIteration: 10,
		concurrency: 5,
		generationModel: "",
		evalModel: "",
		rewriteModel: "",
		autoConfirm: false,
	}),
	launch: z.boolean().default(false),
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

		// If launching, validate all required fields
		if (parsed.launch) {
			if (!parsed.evalQuestions.length) {
				return NextResponse.json(
					{ error: "At least one eval question is required to launch" },
					{ status: 400 }
				)
			}
			if (!parsed.config.generationModel || !parsed.config.evalModel || !parsed.config.rewriteModel) {
				return NextResponse.json(
					{ error: "All three models must be selected to launch" },
					{ status: 400 }
				)
			}
		}

		// Auto-generate name from first ~50 chars of prompt if not provided
		const name =
			parsed.name?.trim() ||
			parsed.systemPrompt.substring(0, 50).replace(/\s+\S*$/, "") + "..."

		const { launch, ...projectData } = parsed

		const project = await PromptProjectModel.create({
			...projectData,
			name,
			promptVersions: [
				{
					version: 1,
					prompt: parsed.systemPrompt,
					changeSummary: null,
					changeReason: null,
					score: null,
					createdAt: new Date(),
				},
			],
		})

		return NextResponse.json({ project, launch }, { status: 201 })
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
