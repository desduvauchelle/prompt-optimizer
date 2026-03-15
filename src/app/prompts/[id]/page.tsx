"use client"

import { useEffect, useState, useCallback, use } from "react"
import Link from "next/link"
import { ArrowLeft, Pencil, Play, RotateCcw, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { ProgressDisplay } from "@/components/prompt/progress-display"
import { ScoreChart } from "@/components/prompt/score-chart"
import { IterationTimeline } from "@/components/prompt/iteration-timeline"
import { PromptVersionHistory } from "@/components/prompt/prompt-version-history"
import type {
	PromptProject,
	ProjectStatus,
	ProgressPhase,
} from "@/lib/types"

const statusVariant: Record<
	ProjectStatus,
	"default" | "secondary" | "destructive" | "outline"
> = {
	draft: "outline",
	running: "default",
	paused: "secondary",
	completed: "default",
}

function CollapsibleSection({
	title,
	subtitle,
	defaultOpen,
	children,
}: {
	title: string
	subtitle?: string
	defaultOpen: boolean
	children: React.ReactNode
}) {
	const [open, setOpen] = useState(defaultOpen)
	return (
		<div className="rounded-lg border border-border">
			<button
				className="flex w-full items-center justify-between p-3 text-left hover:bg-accent/50 transition-colors"
				onClick={() => setOpen(!open)}
			>
				<div className="flex items-center gap-2">
					{open ? (
						<ChevronDown className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
					<span className="text-sm font-semibold">{title}</span>
					{subtitle && !open && (
						<span className="text-xs text-muted-foreground">{subtitle}</span>
					)}
				</div>
			</button>
			{open && (
				<div className="border-t border-border p-4 space-y-3">
					{children}
				</div>
			)}
		</div>
	)
}

export default function ProjectDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = use(params)
	const router = useRouter()
	const [project, setProject] = useState<PromptProject | null>(null)
	const [loading, setLoading] = useState(true)
	const [phase, setPhase] = useState<ProgressPhase>("idle")
	const [progress, setProgress] = useState({ completed: 0, total: 0 })
	const [additionalIterations, setAdditionalIterations] = useState(3)

	const fetchProject = useCallback(async () => {
		try {
			const res = await fetch(`/api/prompts/${id}`)
			const data = await res.json()
			if (data.project) setProject(data.project)
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}, [id])

	const fetchStatus = useCallback(async () => {
		try {
			const res = await fetch(`/api/prompts/${id}/status`)
			const data = await res.json()
			setPhase(data.phase ?? "idle")
			setProgress(data.progress ?? { completed: 0, total: 0 })

			// Also update project status
			if (data.status) {
				setProject((prev) =>
					prev
						? {
							...prev,
							status: data.status,
							currentIteration: data.currentIteration ?? prev.currentIteration,
						}
						: prev
				)
			}
		} catch (err) {
			console.error(err)
		}
	}, [id])

	// Initial load
	useEffect(() => {
		fetchProject()
	}, [fetchProject])

	// Poll for status when running
	useEffect(() => {
		if (project?.status !== "running") return

		const interval = setInterval(() => {
			fetchStatus()
			fetchProject() // Also refresh full project data to get new iterations
		}, 2000)

		return () => clearInterval(interval)
	}, [project?.status, fetchStatus, fetchProject])

	const handleLaunch = async () => {
		await fetch(`/api/prompts/${id}/launch`, { method: "POST" })
		setProject((prev) => (prev ? { ...prev, status: "running" } : prev))
		setPhase("generating")
	}

	const handleContinue = async () => {
		await fetch(`/api/prompts/${id}/launch`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ additionalIterations }),
		})
		setProject((prev) =>
			prev
				? {
					...prev,
					status: "running",
					config: {
						...prev.config,
						maxIterations:
							prev.config.maxIterations + additionalIterations,
					},
				}
				: prev
		)
		setPhase("generating")
	}

	const handleConfirm = async (editedPrompt?: string) => {
		await fetch(`/api/prompts/${id}/confirm`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ editedPrompt }),
		})
		setProject((prev) => (prev ? { ...prev, status: "running" } : prev))
		fetchProject()
	}

	const handleDelete = async () => {
		if (!confirm("Delete this project? This cannot be undone.")) return
		await fetch(`/api/prompts/${id}`, { method: "DELETE" })
		router.push("/")
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-16">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		)
	}

	if (!project) {
		return (
			<div className="py-16 text-center">
				<p className="text-lg text-muted-foreground">Project not found</p>
				<Link href="/" className="mt-4 inline-block text-primary underline">
					Back to dashboard
				</Link>
			</div>
		)
	}

	const scores = project.iterations
		.filter((it) => it.generations.length > 0)
		.map((it) => ({
			iteration: it.iterationNumber,
			score: it.averageScore,
		}))

	const hasResults = project.iterations.length > 0

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<Link
					href="/"
					className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
				>
					<ArrowLeft className="h-3 w-3" />
					Back to Dashboard
				</Link>

				<div className="flex items-start justify-between">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">
							{project.name}
						</h1>
						<div className="mt-1 flex items-center gap-2">
							<Badge variant={statusVariant[project.status]}>
								{project.status}
							</Badge>
							<span className="text-sm text-muted-foreground">
								Iteration {project.currentIteration}/{project.config.maxIterations}
							</span>
							{project.totalCost > 0 && (
								<span className="text-xs text-muted-foreground">
									• ${project.totalCost.toFixed(4)} spent
								</span>
							)}
						</div>
					</div>
					<div className="flex gap-2">
						{project.status !== "running" && (
							<Button
								variant="outline"
								size="sm"
								asChild
							>
								<Link href={`/prompts/${id}/edit`}>
									<Pencil className="mr-2 h-3.5 w-3.5" />
									Edit Setup
								</Link>
							</Button>
						)}
						{["draft", "paused"].includes(project.status) && (
							<Button onClick={handleLaunch}>
								<Play className="mr-2 h-4 w-4" />
								{project.status === "paused" ? "Resume" : "Launch"}
							</Button>
						)}
						<Button variant="ghost" size="icon" onClick={handleDelete}>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Config Summary */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle className="text-base">Configuration</CardTitle>
					{project.status === "completed" && (
						<CardDescription>
							Optimization completed. You can continue iterating below.
						</CardDescription>
					)}
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
						<div>
							<span className="text-muted-foreground">Generation Model</span>
							<p className="font-medium truncate">{project.config.generationModel || "—"}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Evaluation Model</span>
							<p className="font-medium truncate">{project.config.evalModel || "—"}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Rewrite Model</span>
							<p className="font-medium truncate">{project.config.rewriteModel || "—"}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Iterations</span>
							<p className="font-medium">{project.currentIteration} / {project.config.maxIterations}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Reps per Test Case</span>
							<p className="font-medium">{project.config.generationsPerIteration}</p>
						</div>
						<div>
							<span className="text-muted-foreground">Auto-confirm</span>
							<p className="font-medium">{project.config.autoConfirm ? "Yes" : "No"}</p>
						</div>
					</div>

					{project.status === "completed" && (
						<div className="mt-4 flex items-end gap-3 border-t pt-4">
							<div className="space-y-1.5">
								<Label htmlFor="additional-iterations" className="text-sm">
									Additional iterations
								</Label>
								<Input
									id="additional-iterations"
									type="number"
									min={1}
									max={50}
									value={additionalIterations}
									onChange={(e) =>
										setAdditionalIterations(
											Math.max(1, parseInt(e.target.value) || 1)
										)
									}
									className="w-24"
								/>
							</div>
							<Button onClick={handleContinue}>
								<RotateCcw className="mr-2 h-4 w-4" />
								Continue Iterating
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Setup details — collapsible when project has results */}
			<CollapsibleSection
				title="Setup Details"
				subtitle={`${project.testCases?.length ?? 0} test cases · ${project.evalQuestions.length} eval criteria`}
				defaultOpen={!hasResults}
			>
				{/* Objective */}
				{project.objective && (
					<div>
						<h4 className="text-sm font-medium mb-1">Objective</h4>
						<p className="text-sm text-muted-foreground">{project.objective}</p>
					</div>
				)}

				{/* System prompt */}
				<div>
					<h4 className="text-sm font-medium mb-1">System Prompt</h4>
					<pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm font-mono max-h-32 overflow-y-auto">
						{project.systemPrompt}
					</pre>
				</div>

				{/* Test Cases */}
				{project.testCases && project.testCases.length > 0 && (
					<div>
						<h4 className="text-sm font-medium mb-1">
							Test Cases ({project.testCases.length})
						</h4>
						<div className="space-y-2">
							{project.testCases.map((tc, i) => (
								<div
									key={tc.id}
									className="rounded-md bg-muted p-2 text-sm"
								>
									<span className="font-medium">
										{tc.name || `Test Case ${i + 1}`}
									</span>
									{tc.content && (
										<pre className="mt-1 whitespace-pre-wrap font-mono text-muted-foreground text-xs max-h-16 overflow-y-auto">
											{tc.content}
										</pre>
									)}
									{tc.files && tc.files.length > 0 && (
										<p className="mt-1 text-xs text-muted-foreground">
											{tc.files.length} file(s) attached
										</p>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Eval questions */}
				<div>
					<h4 className="text-sm font-medium mb-1">
						Evaluation Criteria ({project.evalQuestions.length})
					</h4>
					<ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
						{project.evalQuestions.map((q, i) => (
							<li key={q.id}>
								<span className="text-foreground">{i + 1}.</span> {q.question}
							</li>
						))}
					</ul>
				</div>
			</CollapsibleSection>

			<Separator />

			{/* Progress bar when running */}
			{project.status === "running" && (
				<ProgressDisplay
					phase={phase}
					completed={progress.completed}
					total={progress.total}
					currentIteration={project.currentIteration}
					maxIterations={project.config.maxIterations}
				/>
			)}

			{/* Prompt version history */}
			{project.promptVersions && project.promptVersions.length > 0 && (
				<PromptVersionHistory versions={project.promptVersions} />
			)}

			{/* Score chart */}
			<ScoreChart scores={scores} />

			{/* Iteration history */}
			<div>
				<h3 className="text-lg font-semibold mb-3">Iterations</h3>
				<IterationTimeline
					iterations={project.iterations}
					evalQuestions={project.evalQuestions}
					onConfirm={handleConfirm}
				/>
			</div>
		</div>
	)
}
