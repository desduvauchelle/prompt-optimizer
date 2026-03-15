"use client"

import Link from "next/link"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatDistanceToNow } from "@/lib/format"
import type { ProjectStatus } from "@/lib/types"

interface ProjectSummary {
	_id: string
	name: string
	status: ProjectStatus
	currentIteration: number
	maxIterations: number
	latestScore: number | null
	createdAt: string
}

interface PromptListProps {
	projects: ProjectSummary[]
}

const getStatusColor = (status: ProjectStatus) => {
	switch (status) {
		case "completed":
			return "success"
		case "failed":
			return "destructive"
		case "running":
			return "default"
		case "pending":
			return "secondary"
		default:
			return "outline"
	}
}

export function PromptList({ projects }: PromptListProps) {
	if (projects.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
				<p className="text-lg font-medium text-muted-foreground">
					No prompts yet
				</p>
				<p className="mt-1 text-sm text-muted-foreground">
					Create your first prompt optimization project to get started.
				</p>
			</div>
		)
	}

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[400px]">Project Name</TableHead>
						<TableHead>Iteration</TableHead>
						<TableHead>Score</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Created</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{projects.map((project) => (
						<TableRow key={project._id} className="cursor-pointer">
							<TableCell className="font-medium">
								<Link
									href={`/prompts/${project._id}`}
									className="hover:underline block truncate max-w-[400px]"
									title={project.name}
								>
									{project.name}
								</Link>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<Progress
										value={(project.currentIteration / project.maxIterations) * 100}
										className="w-20"
									/>
									<span className="text-xs text-muted-foreground">
										{project.currentIteration}/{project.maxIterations}
									</span>
								</div>
							</TableCell>
							<TableCell>
								{project.latestScore !== null ? (
									<span className="font-semibold">
										{Math.round(project.latestScore * 100)}%
									</span>
								) : (
									"---"
								)}
							</TableCell>
							<TableCell>
								<Badge variant={getStatusColor(project.status) as any}>
									{project.status}
								</Badge>
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								{formatDistanceToNow(project.createdAt)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
