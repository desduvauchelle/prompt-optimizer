"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { EvalQuestionsEditor } from "@/components/prompt/eval-questions-editor"
import { ModelSelector } from "@/components/prompt/model-selector"
import type { EvalQuestion } from "@/lib/types"
import { Loader2, Rocket, Save } from "lucide-react"

export function CreateForm() {
	const router = useRouter()
	const [submitting, setSubmitting] = useState(false)

	// Form state
	const [name, setName] = useState("")
	const [sourcePrompt, setSourcePrompt] = useState("")
	const [evalQuestions, setEvalQuestions] = useState<EvalQuestion[]>([])
	const [maxIterations, setMaxIterations] = useState(3)
	const [generationsPerIteration, setGenerationsPerIteration] = useState(10)
	const [concurrency, setConcurrency] = useState(5)
	const [generationModel, setGenerationModel] = useState("")
	const [evalModel, setEvalModel] = useState("")
	const [rewriteModel, setRewriteModel] = useState("")
	const [autoConfirm, setAutoConfirm] = useState(false)

	const canSubmit =
		sourcePrompt.trim() &&
		evalQuestions.length > 0 &&
		generationModel &&
		evalModel &&
		rewriteModel

	const handleSubmit = async (launch: boolean) => {
		if (!canSubmit) return
		setSubmitting(true)

		try {
			const res = await fetch("/api/prompts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim() || undefined,
					sourcePrompt,
					evalQuestions,
					config: {
						maxIterations,
						generationsPerIteration,
						concurrency,
						generationModel,
						evalModel,
						rewriteModel,
						autoConfirm,
					},
				}),
			})

			const data = await res.json()
			if (!res.ok) throw new Error(data.error ?? "Failed to create project")

			const projectId = data.project._id

			if (launch) {
				await fetch(`/api/prompts/${projectId}/launch`, { method: "POST" })
			}

			router.push(`/prompts/${projectId}`)
		} catch (err) {
			console.error(err)
			alert(err instanceof Error ? err.message : "Something went wrong")
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			{/* Name & Prompt */}
			<Card>
				<CardHeader>
					<CardTitle>Prompt</CardTitle>
					<CardDescription>
						Enter the prompt you want to optimize
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Name (optional)</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Auto-generated from prompt text"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="prompt">Source Prompt *</Label>
						<Textarea
							id="prompt"
							value={sourcePrompt}
							onChange={(e) => setSourcePrompt(e.target.value)}
							placeholder="Enter your prompt here..."
							rows={8}
							className="font-mono text-sm"
						/>
					</div>
				</CardContent>
			</Card>

			{/* Eval Questions */}
			<Card>
				<CardHeader>
					<CardTitle>Evaluation Criteria</CardTitle>
					<CardDescription>
						Define yes/no questions to evaluate each generation. e.g. &quot;Does the
						output include a greeting?&quot;
					</CardDescription>
				</CardHeader>
				<CardContent>
					<EvalQuestionsEditor
						questions={evalQuestions}
						onChange={setEvalQuestions}
					/>
				</CardContent>
			</Card>

			{/* Models */}
			<Card>
				<CardHeader>
					<CardTitle>Models</CardTitle>
					<CardDescription>
						Select which models to use for each phase
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ModelSelector
						label="Generation Model"
						value={generationModel}
						onChange={setGenerationModel}
					/>
					<ModelSelector
						label="Evaluation Model"
						value={evalModel}
						onChange={setEvalModel}
					/>
					<ModelSelector
						label="Rewrite Model"
						value={rewriteModel}
						onChange={setRewriteModel}
					/>
				</CardContent>
			</Card>

			{/* Configuration */}
			<Card>
				<CardHeader>
					<CardTitle>Configuration</CardTitle>
					<CardDescription>
						Tune the optimization parameters
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4 sm:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="iterations">Max Iterations</Label>
							<Input
								id="iterations"
								type="number"
								min={1}
								max={50}
								value={maxIterations}
								onChange={(e) => setMaxIterations(parseInt(e.target.value) || 1)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="generations">Generations per Iteration</Label>
							<Input
								id="generations"
								type="number"
								min={1}
								max={100}
								value={generationsPerIteration}
								onChange={(e) =>
									setGenerationsPerIteration(parseInt(e.target.value) || 1)
								}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="concurrency">Concurrency</Label>
							<Input
								id="concurrency"
								type="number"
								min={1}
								max={20}
								value={concurrency}
								onChange={(e) => setConcurrency(parseInt(e.target.value) || 1)}
							/>
						</div>
					</div>

					<Separator />

					<div className="flex items-center justify-between">
						<div>
							<Label htmlFor="auto-confirm">Auto-confirm iterations</Label>
							<p className="text-sm text-muted-foreground">
								Skip manual review between iterations
							</p>
						</div>
						<Switch
							id="auto-confirm"
							checked={autoConfirm}
							onCheckedChange={setAutoConfirm}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Actions */}
			<div className="flex justify-end gap-3">
				<Button
					variant="outline"
					onClick={() => handleSubmit(false)}
					disabled={!canSubmit || submitting}
				>
					{submitting ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Save className="mr-2 h-4 w-4" />
					)}
					Save as Draft
				</Button>
				<Button
					onClick={() => handleSubmit(true)}
					disabled={!canSubmit || submitting}
				>
					{submitting ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Rocket className="mr-2 h-4 w-4" />
					)}
					Create & Launch
				</Button>
			</div>
		</div>
	)
}
