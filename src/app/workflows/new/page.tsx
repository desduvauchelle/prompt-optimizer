"use client"

import { WorkflowCreateForm } from "@/components/workflow/create-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function NewWorkflowPage() {
	return (
		<div>
			<div className="mb-6">
				<Link
					href="/workflows"
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="mr-1 h-4 w-4" />
					Back to Workflows
				</Link>
				<h1 className="text-3xl font-bold tracking-tight">Create Workflow</h1>
				<p className="mt-1 text-muted-foreground">
					Define your input and desired output, and AI will design the optimal multi-step workflow.
				</p>
			</div>
			<WorkflowCreateForm />
		</div>
	)
}
