"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, GitCommit } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { PromptVersion } from "@/lib/types"

interface Props {
	versions: PromptVersion[]
}

export function PromptVersionHistory({ versions }: Props) {
	const [expandedVersion, setExpandedVersion] = useState<number | null>(null)

	if (!versions || versions.length === 0) return null

	const sorted = [...versions].sort((a, b) => b.version - a.version)

	return (
		<div>
			<h3 className="text-lg font-semibold mb-3">Prompt Version History</h3>
			<div className="relative space-y-0">
				{sorted.map((v, idx) => {
					const isExpanded = expandedVersion === v.version
					const isLatest = idx === 0
					const isOriginal = v.version === 1

					return (
						<div key={v.version} className="relative flex gap-3">
							{/* Timeline line */}
							<div className="flex flex-col items-center">
								<div
									className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${isLatest
											? "border-primary bg-primary text-primary-foreground"
											: "border-muted-foreground/30 bg-background text-muted-foreground"
										}`}
								>
									<GitCommit className="h-3.5 w-3.5" />
								</div>
								{idx < sorted.length - 1 && (
									<div className="w-px flex-1 bg-muted-foreground/20 min-h-4" />
								)}
							</div>

							{/* Content */}
							<div className="flex-1 pb-4">
								<button
									type="button"
									onClick={() =>
										setExpandedVersion(isExpanded ? null : v.version)
									}
									className="flex items-center gap-2 text-left w-full group"
								>
									{isExpanded ? (
										<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
									) : (
										<ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
									)}
									<span className="font-medium text-sm">
										v{v.version}
									</span>
									{isOriginal && (
										<Badge variant="outline" className="text-xs">
											Original
										</Badge>
									)}
									{isLatest && !isOriginal && (
										<Badge variant="default" className="text-xs">
											Latest
										</Badge>
									)}
									{v.score !== null && v.score !== undefined && (
										<span className="text-xs text-muted-foreground ml-auto">
											Score: {Math.round(v.score * 100)}%
										</span>
									)}
								</button>

								{/* Change summary */}
								{v.changeSummary && !isExpanded && (
									<p className="mt-1 text-xs text-muted-foreground line-clamp-1 ml-5">
										{v.changeSummary}
									</p>
								)}

								{/* Expanded content */}
								{isExpanded && (
									<div className="mt-2 ml-5 space-y-2">
										{v.changeReason && (
											<div>
												<p className="text-xs font-medium text-muted-foreground mb-1">
													Why it changed
												</p>
												<p className="text-sm">{v.changeReason}</p>
											</div>
										)}
										{v.changeSummary && (
											<div>
												<p className="text-xs font-medium text-muted-foreground mb-1">
													What changed
												</p>
												<p className="text-sm">{v.changeSummary}</p>
											</div>
										)}
										<div>
											<p className="text-xs font-medium text-muted-foreground mb-1">
												Prompt
											</p>
											<pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm font-mono max-h-48 overflow-y-auto">
												{v.prompt}
											</pre>
										</div>
									</div>
								)}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
