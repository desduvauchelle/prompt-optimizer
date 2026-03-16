"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, RotateCcw, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"
import type { WorkflowStepOptimizationStatus } from "@/lib/types/workflow"
import Link from "next/link"

interface StepCardProps {
	index: number
	id: string
	name: string
	description: string
	model: string
	optimizationStatus: WorkflowStepOptimizationStatus
	bestScore?: number
	bestPrompt?: string
	linkedPromptProjectId?: string
	onReoptimize?: () => void
}

const statusConfig: Record<WorkflowStepOptimizationStatus, {
	label: string
	variant: "default" | "secondary" | "destructive" | "outline"
	icon: React.ComponentType<{ className?: string }>
}> = {
	pending: { label: "Pending", variant: "outline", icon: Clock },
	running: { label: "Running", variant: "default", icon: Loader2 },
	completed: { label: "Completed", variant: "default", icon: CheckCircle2 },
	failed: { label: "Failed", variant: "destructive", icon: XCircle },
}

export function StepCard({
	index,
	name,
	description,
	model,
	optimizationStatus,
	bestScore,
	bestPrompt,
	linkedPromptProjectId,
	onReoptimize,
}: StepCardProps) {
	const config = statusConfig[optimizationStatus]
	const StatusIcon = config.icon

	return (
		<Card className={optimizationStatus === "running" ? "border-primary/50" : ""}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2">
						<span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
							{index + 1}
						</span>
						<CardTitle className="text-base">{name}</CardTitle>
					</div>
					<Badge variant={config.variant} className="flex items-center gap-1">
						<StatusIcon className={`h-3 w-3 ${optimizationStatus === "running" ? "animate-spin" : ""}`} />
						{config.label}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{description && (
					<p className="text-sm text-muted-foreground">{description}</p>
				)}

				<div className="flex items-center gap-4 text-sm">
					{model && (
						<span className="text-muted-foreground">
							Model: <span className="font-mono text-xs">{model}</span>
						</span>
					)}
					{bestScore !== undefined && bestScore !== null && (
						<span className={`font-mono font-semibold ${bestScore >= 0.8 ? "text-green-500" : bestScore >= 0.5 ? "text-yellow-500" : "text-red-500"}`}>
							Score: {(bestScore * 100).toFixed(0)}%
						</span>
					)}
				</div>

				{bestPrompt && (
					<div className="rounded-md bg-muted p-3">
						<p className="text-xs font-medium mb-1">Best Prompt</p>
						<p className="text-xs text-muted-foreground line-clamp-3 font-mono whitespace-pre-wrap">
							{bestPrompt}
						</p>
					</div>
				)}

				<div className="flex gap-2">
					{linkedPromptProjectId && (
						<Link href={`/prompts/${linkedPromptProjectId}`}>
							<Button variant="outline" size="sm">
								<ExternalLink className="mr-1 h-3 w-3" />
								View Details
							</Button>
						</Link>
					)}
					{(optimizationStatus === "completed" || optimizationStatus === "failed") && onReoptimize && (
						<Button variant="outline" size="sm" onClick={onReoptimize}>
							<RotateCcw className="mr-1 h-3 w-3" />
							Re-optimize
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
