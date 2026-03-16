"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkflowCard } from "@/components/workflow/workflow-card"

interface WorkflowSummary {
	_id: string
	name: string
	status: "draft" | "designing" | "awaiting_review" | "optimizing" | "completed"
	stepsCount: number
	completedSteps: number
	totalCost: number
	createdAt: string
}

export default function WorkflowsPage() {
	const [workflows, setWorkflows] = useState<WorkflowSummary[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetch("/api/workflows")
			.then((res) => res.json())
			.then((data) => setWorkflows(data.workflows ?? []))
			.catch(console.error)
			.finally(() => setLoading(false))
	}, [])

	return (
		<div>
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
					<p className="mt-1 text-muted-foreground">
						Multi-step AI workflows designed and optimized automatically
					</p>
				</div>
				<Link href="/workflows/new">
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						Create Workflow
					</Button>
				</Link>
			</div>

			{loading ? (
				<div className="flex items-center justify-center py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			) : workflows.length === 0 ? (
				<div className="text-center py-16 text-muted-foreground">
					<p className="text-lg mb-2">No workflows yet</p>
					<p className="text-sm">
						Create your first workflow to transform any input into your desired output.
					</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{workflows.map((w) => (
						<WorkflowCard key={w._id} {...w} />
					))}
				</div>
			)}
		</div>
	)
}
