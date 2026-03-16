"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { formatDistanceToNow } from "@/lib/format"
import type { WorkflowStatus } from "@/lib/types/workflow"

interface WorkflowCardProps {
	_id: string
	name: string
	status: WorkflowStatus
	stepsCount: number
	completedSteps: number
	totalCost: number
	createdAt: string
}

const statusVariant: Record<WorkflowStatus, "default" | "secondary" | "destructive" | "outline"> = {
	draft: "outline",
	designing: "secondary",
	awaiting_review: "secondary",
	optimizing: "default",
	completed: "default",
}

const statusLabel: Record<WorkflowStatus, string> = {
	draft: "Draft",
	designing: "Designing",
	awaiting_review: "Review",
	optimizing: "Optimizing",
	completed: "Completed",
}

export function WorkflowCard({
	_id,
	name,
	status,
	stepsCount,
	completedSteps,
	totalCost,
	createdAt,
}: WorkflowCardProps) {
	return (
		<Link href={`/workflows/${_id}`}>
			<Card className="transition-colors hover:border-primary/50 hover:bg-accent/50 cursor-pointer">
				<CardHeader className="pb-2">
					<div className="flex items-start justify-between gap-2">
						<CardTitle className="text-base line-clamp-1">{name}</CardTitle>
						<Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>
					</div>
					<CardDescription>
						Created {formatDistanceToNow(createdAt)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">
							{stepsCount > 0
								? `${completedSteps}/${stepsCount} steps`
								: "No steps yet"}
						</span>
						{totalCost > 0 && (
							<span className="font-mono text-xs text-muted-foreground">
								${totalCost.toFixed(4)}
							</span>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	)
}
