"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { EditForm } from "@/components/prompt/edit-form"
import type { PromptProject } from "@/lib/types"

export default function EditProjectPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = use(params)
	const [project, setProject] = useState<PromptProject | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		fetch(`/api/prompts/${id}`)
			.then((r) => r.json())
			.then((data) => {
				if (data.project) {
					setProject(data.project)
				} else {
					setError("Project not found")
				}
			})
			.catch(() => setError("Failed to load project"))
			.finally(() => setLoading(false))
	}, [id])

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		)
	}

	if (error || !project) {
		return (
			<div className="py-16 text-center">
				<p className="text-lg text-muted-foreground">{error ?? "Project not found"}</p>
				<Link href="/" className="mt-4 inline-block text-primary underline">
					Back to dashboard
				</Link>
			</div>
		)
	}

	if (project.status === "running") {
		return (
			<div className="py-16 text-center">
				<p className="text-lg text-muted-foreground">
					Cannot edit a project while it is running.
				</p>
				<Link
					href={`/prompts/${id}`}
					className="mt-4 inline-block text-primary underline"
				>
					Back to project
				</Link>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<Link
					href={`/prompts/${id}`}
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="h-3 w-3" />
					Back to Project
				</Link>
				<h1 className="text-2xl font-bold tracking-tight">Edit Setup</h1>
				<p className="text-sm text-muted-foreground mt-1">{project.name}</p>
			</div>

			<EditForm projectId={id} project={project} />
		</div>
	)
}
