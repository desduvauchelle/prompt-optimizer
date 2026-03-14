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
		generationModel: { type: String, required: true },
		evalModel: { type: String, required: true },
		rewriteModel: { type: String, required: true },
		autoConfirm: { type: Boolean, default: false },
	},
	{ _id: false }
)

const PromptProjectSchema = new Schema(
	{
		name: { type: String, required: true },
		sourcePrompt: { type: String, required: true },
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
	},
	{ timestamps: true }
)

PromptProjectSchema.index({ createdAt: -1 })

export const PromptProjectModel =
	mongoose.models.PromptProject ||
	mongoose.model<PromptProjectDocument>("PromptProject", PromptProjectSchema)
