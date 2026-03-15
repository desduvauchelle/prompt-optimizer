"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { GenerationResultsTable } from "@/components/prompt/generation-results-table"
import { RecommendationPanel } from "@/components/prompt/recommendation-panel"
import type { IterationResult, EvalQuestion } from "@/lib/types"

interface IterationDetailProps {
	iteration: IterationResult
	evalQuestions: EvalQuestion[]
	previousScore: number | null
	isAwaitingConfirmation: boolean
	onConfirm: (editedPrompt?: string) => void
}

export function IterationDetail({
	iteration,
	evalQuestions,
	previousScore,
	isAwaitingConfirmation,
	onConfirm,
}: IterationDetailProps) {
	const [expanded, setExpanded] = useState(
		isAwaitingConfirmation ||
		iteration.status === "generating" ||
		iteration.status === "evaluating" ||
		iteration.status === "rewriting"
	)

	const isActive =
		iteration.status === "generating" ||
		iteration.status === "evaluating" ||
		iteration.status === "rewriting"

	const delta =
		previousScore !== null
			? iteration.averageScore - previousScore
			: null

	return (
		<div className="rounded-lg border border-border">
			{/* Header — collapsible */}
			<button
				className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
				onClick={() => setExpanded(!expanded)}
			>
				<div className="flex items-center gap-3">
					{expanded ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
					<span className="font-semibold">
						Iteration {iteration.iterationNumber}
					</span>
					{isActive ? (
						<Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
							<Loader2 className="h-3 w-3 animate-spin" />
							{iteration.status}
						</Badge>
					) : (
						<Badge variant="outline" className="text-xs">
							{iteration.status}
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-3">
					{delta !== null && (
						<span
							className={`text-xs font-mono ${delta > 0
								? "text-green-500"
								: delta < 0
									? "text-red-500"
									: "text-muted-foreground"
								}`}
						>
							{delta > 0 ? "+" : ""}
							{(delta * 100).toFixed(0)}%
						</span>
					)}
					{iteration.cost > 0 && (
						<span className="text-xs text-muted-foreground font-mono">
							${iteration.cost.toFixed(4)}
						</span>
					)}
					<span
						className={`font-mono font-semibold text-sm ${iteration.averageScore >= 0.8
							? "text-green-500"
							: iteration.averageScore >= 0.5
								? "text-yellow-500"
								: "text-red-500"
							}`}
					>
						{(iteration.averageScore * 100).toFixed(0)}%
					</span>
				</div>
			</button>

			{/* Detail content */}
			{expanded && (
				<div className="border-t border-border p-4 space-y-4">
					{/* Prompt used */}
					<div>
						<h4 className="text-sm font-medium mb-2">Prompt Used</h4>
						<pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm font-mono max-h-40 overflow-y-auto">
							{iteration.prompt}
						</pre>
					</div>

					{/* Generation results */}
					{iteration.generations.length > 0 && (
						<div>
							<h4 className="text-sm font-medium mb-2">
								Generation Results ({iteration.generations.length})
							</h4>
							<GenerationResultsTable
								generations={iteration.generations}
								evalQuestions={evalQuestions}
							/>
						</div>
					)}

					{/* Recommendations & rewritten prompt */}
					{(iteration.analysis || iteration.rewrittenPrompt) && (
						<RecommendationPanel
							analysis={iteration.analysis}
							recommendations={iteration.recommendations}
							rewrittenPrompt={iteration.rewrittenPrompt}
							isAwaitingConfirmation={isAwaitingConfirmation}
							onConfirm={onConfirm}
						/>
					)}
				</div>
			)}
		</div>
	)
}
