"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { ProgressPhase } from "@/lib/types"

interface ProgressDisplayProps {
	phase: ProgressPhase
	completed: number
	total: number
	currentIteration: number
	maxIterations: number
}

const phaseLabels: Record<ProgressPhase, string> = {
	idle: "Idle",
	generating: "Generating outputs",
	evaluating: "Running evaluations",
	rewriting: "Rewriting prompt",
}

export function ProgressDisplay({
	phase,
	completed,
	total,
	currentIteration,
	maxIterations,
}: ProgressDisplayProps) {
	if (phase === "idle") return null

	const pct = total > 0 ? (completed / total) * 100 : 0

	return (
		<div className="rounded-lg border border-border bg-card p-4 space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
					<span className="text-sm font-medium">{phaseLabels[phase]}</span>
				</div>
				<Badge variant="outline">
					Iteration {currentIteration + 1}/{maxIterations}
				</Badge>
			</div>
			<Progress value={pct} className="h-2" />
			<p className="text-xs text-muted-foreground">
				{phase === "generating" && `${completed}/${total} generations complete`}
				{phase === "evaluating" && "Evaluating all outputs..."}
				{phase === "rewriting" && "Analyzing results and rewriting prompt..."}
			</p>
		</div>
	)
}
