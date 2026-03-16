import mongoose, { Schema, type Document } from "mongoose"
import type { WorkflowProject } from "@/lib/types/workflow"

export type WorkflowProjectDocument = Document & Omit<WorkflowProject, "_id">

const WorkflowInputDefSchema = new Schema(
	{
		description: { type: String, required: true },
		example: { type: String, default: "" },
	},
	{ _id: false }
)

const WorkflowOutputDefSchema = new Schema(
	{
		description: { type: String, required: true },
		example: { type: String, default: "" },
		format: { type: String, enum: ["json", "text", "markdown"], default: "text" },
	},
	{ _id: false }
)

const EvalQuestionSchema = new Schema(
	{
		id: { type: String, required: true },
		question: { type: String, required: true },
	},
	{ _id: false }
)

const OptimizationConfigSchema = new Schema(
	{
		maxIterations: { type: Number, default: 3 },
		generationsPerIteration: { type: Number, default: 5 },
		concurrency: { type: Number, default: 3 },
		generationModel: { type: String, default: "" },
		evalModel: { type: String, default: "" },
		rewriteModel: { type: String, default: "" },
		autoConfirm: { type: Boolean, default: true },
		successThreshold: { type: Number, default: 85 },
	},
	{ _id: false }
)

const WorkflowStepSchema = new Schema(
	{
		id: { type: String, required: true },
		name: { type: String, required: true },
		description: { type: String, default: "" },
		systemPrompt: { type: String, required: true },
		model: { type: String, default: "" },
		inputSource: { type: String, default: "workflow_input" },
		outputKey: { type: String, required: true },
		outputDescription: { type: String, default: "" },
		evalQuestions: { type: [EvalQuestionSchema], default: [] },
		optimizationConfig: { type: OptimizationConfigSchema, default: () => ({}) },
		optimizationStatus: {
			type: String,
			enum: ["pending", "running", "completed", "failed"],
			default: "pending",
		},
		linkedPromptProjectId: { type: String, default: null },
		bestPrompt: { type: String, default: null },
		bestScore: { type: Number, default: null },
	},
	{ _id: false }
)

const WorkflowProjectSchema = new Schema(
	{
		name: { type: String, required: true },
		inputDef: { type: WorkflowInputDefSchema, required: true },
		outputDef: { type: WorkflowOutputDefSchema, required: true },
		designModel: { type: String, default: "" },
		autoStartOptimization: { type: Boolean, default: false },
		steps: { type: [WorkflowStepSchema], default: [] },
		designReasoning: { type: String, default: null },
		status: {
			type: String,
			enum: ["draft", "designing", "awaiting_review", "optimizing", "completed"],
			default: "draft",
		},
		currentOptimizingStepIndex: { type: Number, default: 0 },
		totalCost: { type: Number, default: 0 },
	},
	{ timestamps: true }
)

WorkflowProjectSchema.index({ createdAt: -1 })

export const WorkflowProjectModel =
	mongoose.models.WorkflowProject ||
	mongoose.model<WorkflowProjectDocument>("WorkflowProject", WorkflowProjectSchema)
