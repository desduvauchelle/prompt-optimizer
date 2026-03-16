import type { EvalQuestion, ProjectConfig } from "@/lib/types"

export interface WorkflowInputDef {
	description: string
	example?: string
}

export interface WorkflowOutputDef {
	description: string
	example?: string
	format?: "json" | "text" | "markdown"
}

export type WorkflowStepOptimizationStatus = "pending" | "running" | "completed" | "failed"

export interface WorkflowStep {
	id: string
	name: string
	description: string
	systemPrompt: string
	model: string
	inputSource: "workflow_input" | string // "workflow_input" or a step id
	outputKey: string
	outputDescription: string
	evalQuestions: EvalQuestion[]
	optimizationConfig: Pick<ProjectConfig, "maxIterations" | "generationsPerIteration" | "concurrency" | "evalModel" | "rewriteModel" | "autoConfirm" | "successThreshold"> & {
		generationModel: string // duplicate key but needed as alias for step model
	}
	optimizationStatus: WorkflowStepOptimizationStatus
	linkedPromptProjectId?: string
	bestPrompt?: string
	bestScore?: number
}

export type WorkflowStatus = "draft" | "designing" | "awaiting_review" | "optimizing" | "completed"

export interface WorkflowProject {
	_id: string
	name: string
	inputDef: WorkflowInputDef
	outputDef: WorkflowOutputDef
	designModel: string
	autoStartOptimization: boolean
	steps: WorkflowStep[]
	designReasoning?: string
	status: WorkflowStatus
	currentOptimizingStepIndex: number
	totalCost: number
	createdAt: Date
	updatedAt: Date
}

export interface WorkflowDesignStep {
	name: string
	description: string
	systemPrompt: string
	modelSuggestion: string
	inputSource: "workflow_input" | string // reference by step name — mapped to id after
	outputDescription: string
	evalQuestions: { question: string }[]
}

export interface WorkflowDesignResult {
	canBeOneStep: boolean
	reasoning: string
	steps: WorkflowDesignStep[]
	cost: number
}

export type WorkflowProgressPhase = "idle" | "designing" | "optimizing_step"

export interface WorkflowProgress {
	status: WorkflowStatus
	phase: WorkflowProgressPhase
	currentStepIndex: number
	steps: {
		id: string
		name: string
		optimizationStatus: WorkflowStepOptimizationStatus
		bestScore?: number
	}[]
}
