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
import { FileUploadButton } from "@/components/prompt/file-upload-button"
import { TestCasesEditor } from "@/components/prompt/test-cases-editor"
import type { EvalQuestion, FileAttachment, TestCase } from "@/lib/types"
import { Loader2, Rocket, Save } from "lucide-react"

export function CreateForm() {
	const router = useRouter()
	const [submitting, setSubmitting] = useState(false)

	// Form state
	const [name, setName] = useState("")
	const [objective, setObjective] = useState("")
	const [systemPrompt, setSystemPrompt] = useState("")
	const [systemPromptFiles, setSystemPromptFiles] = useState<FileAttachment[]>([])
	const [testCases, setTestCases] = useState<TestCase[]>([])
	const [evalQuestions, setEvalQuestions] = useState<EvalQuestion[]>([])
	const [maxIterations, setMaxIterations] = useState(3)
	const [generationsPerIteration, setGenerationsPerIteration] = useState(10)
	const [concurrency, setConcurrency] = useState(5)
	const [generationModel, setGenerationModel] = useState("")
	const [evalModel, setEvalModel] = useState("")
	const [rewriteModel, setRewriteModel] = useState("")
	const [autoConfirm, setAutoConfirm] = useState(false)
	const [successThreshold, setSuccessThreshold] = useState(0)

	const canSaveDraft = systemPrompt.trim().length > 0
	const canLaunch =
		systemPrompt.trim() &&
		evalQuestions.length > 0 &&
		generationModel &&
		evalModel &&
		rewriteModel

	const handleSubmit = async (launch: boolean) => {
		if (launch && !canLaunch) return
		if (!launch && !canSaveDraft) return
		setSubmitting(true)

		try {
			const res = await fetch("/api/prompts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim() || undefined,
					objective: objective.trim() || undefined,
					systemPrompt,
					systemPromptFiles,
					testCases,
					evalQuestions,
					launch,
					config: {
						maxIterations,
						generationsPerIteration,
						concurrency,
						generationModel,
						evalModel,
						rewriteModel,
						autoConfirm,
						successThreshold,
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
		<div className="mx-auto max-w-7xl">
			<div className="grid gap-6 lg:grid-cols-[340px_1fr]">
				{/* ── Left Column: Config ── */}
				<div className="space-y-6">
					{/* Project Info */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Project Info</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="name">Name</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Auto-generated from prompt"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="objective">Objective</Label>
								<Textarea
									id="objective"
									value={objective}
									onChange={(e) => setObjective(e.target.value)}
									placeholder="What should the optimized prompt achieve?"
									rows={3}
									className="text-sm"
								/>
							</div>
						</CardContent>
					</Card>

					{/* Models */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Models</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<ModelSelector
								label="Generation"
								value={generationModel}
								onChange={setGenerationModel}
							/>
							<ModelSelector
								label="Evaluation"
								value={evalModel}
								onChange={setEvalModel}
							/>
							<ModelSelector
								label="Rewrite"
								value={rewriteModel}
								onChange={setRewriteModel}
							/>
						</CardContent>
					</Card>

					{/* Configuration */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Configuration</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="space-y-1.5">
								<Label htmlFor="iterations">Max Iterations</Label>
								<Input
									id="iterations"
									type="number"
									min={1}
									max={50}
									value={maxIterations}
									onChange={(e) =>
										setMaxIterations(parseInt(e.target.value) || 1)
									}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="generations">Repetitions per Test Case</Label>
								<Input
									id="generations"
									type="number"
									min={1}
									max={100}
									value={generationsPerIteration}
									onChange={(e) =>
										setGenerationsPerIteration(
											parseInt(e.target.value) || 1,
										)
									}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="concurrency">Concurrency</Label>
								<Input
									id="concurrency"
									type="number"
									min={1}
									max={20}
									value={concurrency}
									onChange={(e) =>
										setConcurrency(parseInt(e.target.value) || 1)
									}
								/>
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<div>
									<Label htmlFor="auto-confirm" className="text-sm">
										Auto-confirm
									</Label>
									<p className="text-xs text-muted-foreground">
										Skip review between iterations
									</p>
								</div>
								<Switch
									id="auto-confirm"
									checked={autoConfirm}
									onCheckedChange={setAutoConfirm}
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="threshold">Success Threshold (%)</Label>
								<Input
									id="threshold"
									type="number"
									min={0}
									max={100}
									value={successThreshold}
									onChange={(e) =>
										setSuccessThreshold(
											Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
										)
									}
								/>
								<p className="text-xs text-muted-foreground">
									Stop early if score reaches this. 0 = disabled.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* ── Right Column: Content ── */}
				<div className="space-y-6">
					{/* System Prompt */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">System Prompt *</CardTitle>
							<CardDescription>
								The prompt to optimize. Only this will be rewritten.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							<Textarea
								id="systemPrompt"
								value={systemPrompt}
								onChange={(e) => setSystemPrompt(e.target.value)}
								placeholder="Enter your system prompt here..."
								rows={10}
								className="font-mono text-sm"
							/>
							<FileUploadButton
								files={systemPromptFiles}
								onChange={setSystemPromptFiles}
							/>
						</CardContent>
					</Card>

					{/* Test Cases */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Test Cases</CardTitle>
							<CardDescription>
								User messages to test the system prompt against. These stay
								fixed during optimization.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<TestCasesEditor
								testCases={testCases}
								onChange={setTestCases}
							/>
						</CardContent>
					</Card>

					{/* Evaluation Criteria */}
					<Card>
						<CardHeader className="pb-3">
							<CardTitle className="text-base">Evaluation Criteria</CardTitle>
							<CardDescription>
								Yes/no questions to evaluate each generation. e.g. &quot;Does
								the output include a greeting?&quot;
							</CardDescription>
						</CardHeader>
						<CardContent>
							<EvalQuestionsEditor
								questions={evalQuestions}
								onChange={setEvalQuestions}
								systemPrompt={systemPrompt}
								objective={objective}
								testCases={testCases}
							/>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* ── Actions Bar ── */}
			<div className="mt-6 flex justify-end gap-3">
				<Button
					variant="outline"
					onClick={() => handleSubmit(false)}
					disabled={!canSaveDraft || submitting}
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
					disabled={!canLaunch || submitting}
				>
					{submitting ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Rocket className="mr-2 h-4 w-4" />
					)}
					Create &amp; Launch
				</Button>
			</div>
		</div>
	)
}
