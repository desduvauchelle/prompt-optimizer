import mongoose, { Schema, type Document } from "mongoose"
import type { PromptProject } from "@/lib/types"

export type PromptProjectDocument = Document & Omit<PromptProject, "_id">

const EvalQuestionSchema = new Schema(
	{
		id: { type: String, required: true },
		question: { type: String, required: true },
	},
	{ _id: false }
)

const GenerationResultSchema = new Schema(
	{
		id: { type: String, required: true },
		output: { type: String, required: true },
		evalScores: { type: Map, of: Boolean, default: {} },
		overallScore: { type: Number, default: 0 },
		testCaseId: { type: String, default: null },
		cost: { type: Number, default: 0 },
	},
	{ _id: false }
)

const IterationResultSchema = new Schema(
	{
		iterationNumber: { type: Number, required: true },
		prompt: { type: String, required: true },
		generations: { type: [GenerationResultSchema], default: [] },
		averageScore: { type: Number, default: 0 },
		analysis: { type: String, default: "" },
		recommendations: { type: [String], default: [] },
		rewrittenPrompt: { type: String, default: null },
		status: {
			type: String,
			enum: [
				"generating",
				"evaluating",
				"rewriting",
				"awaiting_confirmation",
				"confirmed",
				"completed",
			],
			default: "generating",
		},
		cost: { type: Number, default: 0 },
	},
	{ _id: false }
)

const PromptVersionSchema = new Schema(
	{
		version: { type: Number, required: true },
		prompt: { type: String, required: true },
		changeSummary: { type: String, default: null },
		changeReason: { type: String, default: null },
		score: { type: Number, default: null },
		createdAt: { type: Date, default: Date.now },
	},
	{ _id: false }
)

const ProjectConfigSchema = new Schema(
	{
		maxIterations: { type: Number, default: 3 },
		generationsPerIteration: { type: Number, default: 10 },
		concurrency: { type: Number, default: 5 },
		generationModel: { type: String, default: "" },
		evalModel: { type: String, default: "" },
		rewriteModel: { type: String, default: "" },
		autoConfirm: { type: Boolean, default: false },
		successThreshold: { type: Number, default: 90 },
	},
	{ _id: false }
)

const FileAttachmentSchema = new Schema(
	{
		id: { type: String, required: true },
		filename: { type: String, required: true },
		mimeType: { type: String, required: true },
		data: { type: String, required: true },
		size: { type: Number, required: true },
	},
	{ _id: false }
)

const TestCaseSchema = new Schema(
	{
		id: { type: String, required: true },
		name: { type: String, required: true },
		content: { type: String, default: "" },
		files: { type: [FileAttachmentSchema], default: [] },
	},
	{ _id: false }
)

const PromptProjectSchema = new Schema(
	{
		name: { type: String, required: true },
		objective: { type: String, default: "" },
		systemPrompt: { type: String, required: true },
		systemPromptFiles: { type: [FileAttachmentSchema], default: [] },
		testCases: { type: [TestCaseSchema], default: [] },
		evalQuestions: { type: [EvalQuestionSchema], default: [] },
		config: { type: ProjectConfigSchema, required: true },
		iterations: { type: [IterationResultSchema], default: [] },
		promptVersions: { type: [PromptVersionSchema], default: [] },
		status: {
			type: String,
			enum: ["draft", "running", "paused", "completed"],
			default: "draft",
		},
		currentIteration: { type: Number, default: 0 },
		totalCost: { type: Number, default: 0 },
	},
	{ timestamps: true }
)

PromptProjectSchema.index({ createdAt: -1 })

export const PromptProjectModel =
	mongoose.models.PromptProject ||
	mongoose.model<PromptProjectDocument>("PromptProject", PromptProjectSchema)
