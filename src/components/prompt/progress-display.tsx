"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
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

const phaseDescriptions: Record<ProgressPhase, string> = {
	idle: "",
	generating: "Sending test cases to the model and collecting responses…",
	evaluating: "Scoring each output against your evaluation criteria…",
	rewriting: "Analyzing results and rewriting the prompt for the next iteration…",
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
		<div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Loader2 className="h-4 w-4 animate-spin text-primary" />
					<span className="text-sm font-medium">{phaseLabels[phase]}</span>
				</div>
				<Badge variant="outline">
					Iteration {currentIteration + 1}/{maxIterations}
				</Badge>
			</div>
			<Progress value={pct} className="h-2" />
			<div className="space-y-1">
				<p className="text-xs text-muted-foreground">
					{phase === "generating" && `${completed}/${total} generations complete`}
					{phase === "evaluating" && `Evaluating ${total} outputs…`}
					{phase === "rewriting" && "Analyzing results and rewriting prompt…"}
				</p>
				<p className="text-[11px] text-muted-foreground/70">
					{phaseDescriptions[phase]}
				</p>
			</div>
		</div>
	)
}
