export interface EvalQuestion {
	id: string
	question: string
}

export interface GenerationResult {
	id: string
	output: string
	evalScores: Record<string, boolean>
	overallScore: number
}

export type IterationStatus =
	| "generating"
	| "evaluating"
	| "rewriting"
	| "awaiting_confirmation"
	| "confirmed"
	| "completed"

export interface IterationResult {
	iterationNumber: number
	prompt: string
	generations: GenerationResult[]
	averageScore: number
	analysis: string
	recommendations: string[]
	rewrittenPrompt: string | null
	status: IterationStatus
}

export type ProjectStatus = "draft" | "running" | "paused" | "completed"

export interface PromptVersion {
	version: number
	prompt: string
	changeSummary: string | null
	changeReason: string | null
	score: number | null
	createdAt: string
}

export interface ProjectConfig {
	maxIterations: number
	generationsPerIteration: number
	concurrency: number
	generationModel: string
	evalModel: string
	rewriteModel: string
	autoConfirm: boolean
}

export interface PromptProject {
	_id: string
	name: string
	sourcePrompt: string
	evalQuestions: EvalQuestion[]
	config: ProjectConfig
	iterations: IterationResult[]
	promptVersions: PromptVersion[]
	status: ProjectStatus
	currentIteration: number
	createdAt: Date
	updatedAt: Date
}

export type ProgressPhase = "idle" | "generating" | "evaluating" | "rewriting"

export interface ProjectProgress {
	status: ProjectStatus
	phase: ProgressPhase
	progress: { completed: number; total: number }
	currentIteration: number
}

export interface ModelInfo {
	id: string
	name: string
	pricing: { prompt: string; completion: string } | null
}
