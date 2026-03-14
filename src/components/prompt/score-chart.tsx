"use client"

interface ScoreChartProps {
	scores: { iteration: number; score: number }[]
}

export function ScoreChart({ scores }: ScoreChartProps) {
	if (scores.length === 0) return null

	const maxScore = Math.max(...scores.map((s) => s.score), 0.01)

	return (
		<div className="rounded-lg border border-border bg-card p-4">
			<h3 className="text-sm font-semibold mb-4">Score Progression</h3>
			<div className="flex items-end gap-2 h-32">
				{scores.map((s, i) => {
					const heightPct = (s.score / maxScore) * 100
					const prevScore = i > 0 ? scores[i - 1].score : null
					const delta =
						prevScore !== null ? s.score - prevScore : null

					return (
						<div
							key={s.iteration}
							className="flex-1 flex flex-col items-center gap-1"
						>
							<span className="text-xs font-mono">
								{(s.score * 100).toFixed(0)}%
							</span>
							{delta !== null && (
								<span
									className={`text-[10px] font-mono ${delta > 0
											? "text-green-500"
											: delta < 0
												? "text-red-500"
												: "text-muted-foreground"
										}`}
								>
									{delta > 0 ? "+" : ""}
									{(delta * 100).toFixed(0)}
								</span>
							)}
							<div
								className={`w-full rounded-t transition-all ${s.score >= 0.8
										? "bg-green-500"
										: s.score >= 0.5
											? "bg-yellow-500"
											: "bg-red-500"
									}`}
								style={{ height: `${Math.max(heightPct, 4)}%` }}
							/>
							<span className="text-xs text-muted-foreground">
								#{s.iteration}
							</span>
						</div>
					)
				})}
			</div>
		</div>
	)
}
