"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Play, Trash2, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StepDesigner } from "@/components/workflow/step-designer"
import { StepReview } from "@/components/workflow/step-review"
import { WorkflowPipeline } from "@/components/workflow/workflow-pipeline"
import { SdkExportPanel } from "@/components/workflow/sdk-export-panel"
import type { WorkflowProject, WorkflowStatus, WorkflowStep } from "@/lib/types/workflow"

const statusVariant: Record<WorkflowStatus, "default" | "secondary" | "destructive" | "outline"> = {
	draft: "outline",
	designing: "secondary",
	awaiting_review: "secondary",
	optimizing: "default",
	completed: "default",
}

const statusLabel: Record<WorkflowStatus, string> = {
	draft: "Draft",
	designing: "Designing...",
	awaiting_review: "Awaiting Review",
	optimizing: "Optimizing...",
	completed: "Completed",
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)
	const router = useRouter()
	const [workflow, setWorkflow] = useState<WorkflowProject | null>(null)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	const fetchWorkflow = useCallback(async () => {
		try {
			const res = await fetch(`/api/workflows/${id}`)
			if (!res.ok) throw new Error("Not found")
			const data = await res.json()
			setWorkflow(data.workflow)
		} catch {
			router.push("/workflows")
		} finally {
			setLoading(false)
		}
	}, [id, router])

	useEffect(() => {
		fetchWorkflow()
	}, [fetchWorkflow])

	// Poll while designing or optimizing
	useEffect(() => {
		if (!workflow) return
		if (workflow.status !== "designing" && workflow.status !== "optimizing") return

		const interval = setInterval(fetchWorkflow, 3000)
		return () => clearInterval(interval)
	}, [workflow?.status, fetchWorkflow, workflow])

	async function handleDesign() {
		await fetch(`/api/workflows/${id}/design`, { method: "POST" })
		setWorkflow((prev) => prev ? { ...prev, status: "designing" } : prev)
	}

	async function handleConfirmSteps(steps: WorkflowStep[]) {
		setSaving(true)
		try {
			// Save the (possibly edited) steps
			await fetch(`/api/workflows/${id}/steps`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ steps }),
			})

			// Start optimization
			await fetch(`/api/workflows/${id}/optimize`, { method: "POST" })
			setWorkflow((prev) => prev ? { ...prev, steps, status: "optimizing" } : prev)
		} catch (error) {
			console.error(error)
			alert("Failed to start optimization")
		} finally {
			setSaving(false)
		}
	}

	async function handleSaveDraft(steps: WorkflowStep[]) {
		setSaving(true)
		try {
			await fetch(`/api/workflows/${id}/steps`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ steps }),
			})
			await fetchWorkflow()
		} catch (error) {
			console.error(error)
		} finally {
			setSaving(false)
		}
	}

	async function handleReoptimizeStep(stepIndex: number) {
		await fetch(`/api/workflows/${id}/optimize`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ stepIndex }),
		})
		setWorkflow((prev) =>
			prev
				? {
					...prev,
					status: "optimizing",
					steps: prev.steps.map((s, i) =>
						i === stepIndex ? { ...s, optimizationStatus: "running" as const } : s
					),
				}
				: prev
		)
	}

	async function handleReoptimizeAll() {
		// Reset all steps to pending first
		const resetSteps = workflow!.steps.map((s) => ({
			...s,
			optimizationStatus: "pending" as const,
			bestPrompt: undefined,
			bestScore: undefined,
			linkedPromptProjectId: undefined,
		}))

		await fetch(`/api/workflows/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ steps: resetSteps }),
		})

		await fetch(`/api/workflows/${id}/optimize`, { method: "POST" })
		setWorkflow((prev) => prev ? { ...prev, status: "optimizing", steps: resetSteps } : prev)
	}

	async function handleDelete() {
		if (!confirm("Delete this workflow? This cannot be undone.")) return
		await fetch(`/api/workflows/${id}`, { method: "DELETE" })
		router.push("/workflows")
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		)
	}

	if (!workflow) return null

	const completedSteps = workflow.steps.filter((s) => s.optimizationStatus === "completed").length

	return (
		<div className="max-w-4xl mx-auto">
			{/* Header */}
			<div className="mb-6">
				<Link
					href="/workflows"
					className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="mr-1 h-4 w-4" />
					Back to Workflows
				</Link>

				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">{workflow.name}</h1>
						<div className="mt-2 flex items-center gap-3">
							<Badge variant={statusVariant[workflow.status]}>
								{statusLabel[workflow.status]}
							</Badge>
							{workflow.steps.length > 0 && (
								<span className="text-sm text-muted-foreground">
									{completedSteps}/{workflow.steps.length} steps optimized
								</span>
							)}
							{workflow.totalCost > 0 && (
								<span className="text-sm text-muted-foreground font-mono">
									${workflow.totalCost.toFixed(4)}
								</span>
							)}
						</div>
					</div>
					<div className="flex gap-2">
						{workflow.status === "draft" && (
							<Button onClick={handleDesign}>
								<Play className="mr-2 h-4 w-4" />
								Design with AI
							</Button>
						)}
						{workflow.status === "completed" && (
							<Button variant="outline" onClick={handleReoptimizeAll}>
								<RotateCcw className="mr-2 h-4 w-4" />
								Re-optimize All
							</Button>
						)}
						<Button variant="ghost" size="icon" onClick={handleDelete}>
							<Trash2 className="h-4 w-4 text-destructive" />
						</Button>
					</div>
				</div>
			</div>

			{/* Setup summary */}
			{(workflow.status === "draft" || workflow.status === "designing") && (
				<div className="mb-6 rounded-lg border p-4 space-y-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Input</p>
						<p className="text-sm">{workflow.inputDef.description}</p>
					</div>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Output</p>
						<p className="text-sm">{workflow.outputDef.description}</p>
						{workflow.outputDef.format && (
							<Badge variant="outline" className="mt-1">{workflow.outputDef.format}</Badge>
						)}
					</div>
				</div>
			)}

			{/* State machine rendering */}
			{workflow.status === "designing" && (
				<StepDesigner reasoning={workflow.designReasoning} />
			)}

			{workflow.status === "awaiting_review" && (
				<StepReview
					steps={workflow.steps}
					reasoning={workflow.designReasoning}
					onConfirm={handleConfirmSteps}
					onSaveDraft={handleSaveDraft}
					saving={saving}
				/>
			)}

			{(workflow.status === "optimizing" || workflow.status === "completed") && (
				<div className="space-y-6">
					<WorkflowPipeline
						steps={workflow.steps}
						inputDescription={workflow.inputDef.description}
						outputDescription={workflow.outputDef.description}
						onReoptimizeStep={
							workflow.status === "completed" ? handleReoptimizeStep : undefined
						}
					/>

					{workflow.status === "completed" && (
						<SdkExportPanel workflowId={id} />
					)}
				</div>
			)}
		</div>
	)
}
