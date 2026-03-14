"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PromptList } from "@/components/dashboard/prompt-list"
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

export default function Home() {
	const [projects, setProjects] = useState<ProjectSummary[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetch("/api/prompts")
			.then((res) => res.json())
			.then((data) => setProjects(data.projects ?? []))
			.catch(console.error)
			.finally(() => setLoading(false))
	}, [])

	return (
		<div>
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
					<p className="mt-1 text-muted-foreground">
						Manage your prompt optimization projects
					</p>
				</div>
				<Link href="/prompts/new">
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						Create New
					</Button>
				</Link>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			) : (
				<PromptList projects={projects} />
			)}
		</div>
	)
}
