"use client"

import { PromptCard } from "@/components/dashboard/prompt-card"
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
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{projects.map((project) => (
				<PromptCard key={project._id} {...project} />
			))}
		</div>
	)
}
