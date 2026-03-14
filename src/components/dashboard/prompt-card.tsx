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
import type { ProjectStatus } from "@/lib/types"

interface PromptCardProps {
	_id: string
	name: string
	status: ProjectStatus
	currentIteration: number
	maxIterations: number
	latestScore: number | null
	createdAt: string
}

const statusVariant: Record<ProjectStatus, "default" | "secondary" | "destructive" | "outline"> = {
	draft: "outline",
	running: "default",
	paused: "secondary",
	completed: "default",
}

const statusLabel: Record<ProjectStatus, string> = {
	draft: "Draft",
	running: "Running",
	paused: "Paused",
	completed: "Completed",
}

export function PromptCard({
	_id,
	name,
	status,
	currentIteration,
	maxIterations,
	latestScore,
	createdAt,
}: PromptCardProps) {
	return (
		<Link href={`/prompts/${_id}`}>
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
							Iteration {currentIteration}/{maxIterations}
						</span>
						{latestScore !== null && (
							<span
								className={`font-mono font-semibold ${latestScore >= 0.8
										? "text-green-500"
										: latestScore >= 0.5
											? "text-yellow-500"
											: "text-red-500"
									}`}
							>
								{(latestScore * 100).toFixed(0)}%
							</span>
						)}
					</div>
				</CardContent>
			</Card>
		</Link>
	)
}
