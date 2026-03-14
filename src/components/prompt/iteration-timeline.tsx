"use client"

import { IterationDetail } from "@/components/prompt/iteration-detail"
import type { IterationResult, EvalQuestion } from "@/lib/types"

interface IterationTimelineProps {
	iterations: IterationResult[]
	evalQuestions: EvalQuestion[]
	onConfirm: (editedPrompt?: string) => void
}

export function IterationTimeline({
	iterations,
	evalQuestions,
	onConfirm,
}: IterationTimelineProps) {
	if (iterations.length === 0) {
		return (
			<div className="rounded-lg border border-dashed border-border py-8 text-center">
				<p className="text-sm text-muted-foreground">
					No iterations yet. Launch the optimization to begin.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-3">
			{iterations.map((iteration, i) => (
				<IterationDetail
					key={iteration.iterationNumber}
					iteration={iteration}
					evalQuestions={evalQuestions}
					previousScore={
						i > 0 ? iterations[i - 1].averageScore : null
					}
					isAwaitingConfirmation={
						iteration.status === "awaiting_confirmation"
					}
					onConfirm={onConfirm}
				/>
			))}
		</div>
	)
}
