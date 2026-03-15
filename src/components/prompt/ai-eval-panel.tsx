"use client"

import { useState } from "react"
import { Loader2, Plus, ArrowRight, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { EvalQuestion, EvalSuggestion, TestCase } from "@/lib/types"

interface AIEvalPanelProps {
	mode: "generate" | "review"
	systemPrompt: string
	objective: string
	testCases: TestCase[]
	evalQuestions: EvalQuestion[]
	evalModel: string
	onAddQuestion: (question: EvalQuestion) => void
	onUpdateQuestion: (id: string, question: string) => void
	onRemoveQuestion: (id: string) => void
	onClose: () => void
}

export function AIEvalPanel({
	mode,
	systemPrompt,
	objective,
	testCases,
	evalQuestions,
	evalModel,
	onAddQuestion,
	onUpdateQuestion,
	onRemoveQuestion,
	onClose,
}: AIEvalPanelProps) {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState("")
	const [generatedQuestions, setGeneratedQuestions] = useState<EvalQuestion[]>([])
	const [suggestions, setSuggestions] = useState<EvalSuggestion[]>([])
	const [summary, setSummary] = useState("")
	const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

	const handleGenerate = async () => {
		setLoading(true)
		setError("")
		try {
			const res = await fetch("/api/evals/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					systemPrompt,
					objective,
					testCases: testCases.map((tc) => ({ name: tc.name, content: tc.content })),
					model: evalModel,
				}),
			})
			const data = await res.json()
			if (!res.ok) throw new Error(data.error ?? "Failed to generate")
			setGeneratedQuestions(data.questions ?? [])
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong")
		} finally {
			setLoading(false)
		}
	}

	const handleReview = async () => {
		setLoading(true)
		setError("")
		try {
			const res = await fetch("/api/evals/review", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					systemPrompt,
					objective,
					testCases: testCases.map((tc) => ({ name: tc.name, content: tc.content })),
					evalQuestions,
					model: evalModel,
				}),
			})
			const data = await res.json()
			if (!res.ok) throw new Error(data.error ?? "Failed to review")
			setSuggestions(data.suggestions ?? [])
			setSummary(data.summary ?? "")
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong")
		} finally {
			setLoading(false)
		}
	}

	const addGenerated = (q: EvalQuestion) => {
		onAddQuestion({ id: crypto.randomUUID(), question: q.question })
		setAppliedIds((prev) => new Set(prev).add(q.id))
	}

	const addAllGenerated = () => {
		for (const q of generatedQuestions) {
			if (!appliedIds.has(q.id)) {
				onAddQuestion({ id: crypto.randomUUID(), question: q.question })
			}
		}
		setAppliedIds(new Set(generatedQuestions.map((q) => q.id)))
	}

	const applySuggestion = (s: EvalSuggestion, index: number) => {
		if (s.type === "add") {
			onAddQuestion({ id: crypto.randomUUID(), question: s.question })
		} else if (s.type === "update" && s.questionId) {
			onUpdateQuestion(s.questionId, s.question)
		} else if (s.type === "remove" && s.questionId) {
			onRemoveQuestion(s.questionId)
		}
		setAppliedIds((prev) => new Set(prev).add(String(index)))
	}

	// Auto-run on mount
	const hasRun = loading || generatedQuestions.length > 0 || suggestions.length > 0 || error
	if (!hasRun) {
		if (mode === "generate") handleGenerate()
		else handleReview()
	}

	return (
		<div className="rounded-md border border-primary/20 bg-primary/5 p-4 space-y-3">
			<div className="flex items-center justify-between">
				<h4 className="text-sm font-medium">
					{mode === "generate" ? "AI-Generated Evaluation Criteria" : "AI Review of Criteria"}
				</h4>
				<Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
					Close
				</Button>
			</div>

			{loading && (
				<div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
					<Loader2 className="h-4 w-4 animate-spin" />
					{mode === "generate" ? "Generating evaluation criteria..." : "Reviewing your criteria..."}
				</div>
			)}

			{error && (
				<p className="text-sm text-destructive">{error}</p>
			)}

			{/* Generate mode results */}
			{mode === "generate" && generatedQuestions.length > 0 && (
				<div className="space-y-2">
					<div className="flex justify-end">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="h-7 text-xs"
							onClick={addAllGenerated}
						>
							<Plus className="mr-1 h-3 w-3" />
							Add all
						</Button>
					</div>
					{generatedQuestions.map((q) => (
						<div
							key={q.id}
							className="flex items-start gap-2 rounded-md bg-background p-2"
						>
							<p className="flex-1 text-sm">{q.question}</p>
							{appliedIds.has(q.id) ? (
								<Badge variant="outline" className="text-xs shrink-0">
									<Check className="mr-1 h-3 w-3" />
									Added
								</Badge>
							) : (
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-7 text-xs shrink-0"
									onClick={() => addGenerated(q)}
								>
									<Plus className="mr-1 h-3 w-3" />
									Add
								</Button>
							)}
						</div>
					))}
				</div>
			)}

			{/* Review mode results */}
			{mode === "review" && suggestions.length > 0 && (
				<div className="space-y-2">
					{summary && (
						<p className="text-sm text-muted-foreground">{summary}</p>
					)}
					{suggestions.map((s, i) => {
						const isApplied = appliedIds.has(String(i))
						const existingQ = s.questionId
							? evalQuestions.find((q) => q.id === s.questionId)
							: null

						return (
							<div
								key={i}
								className={`rounded-md bg-background p-3 space-y-1 border-l-2 ${s.type === "add"
										? "border-l-green-500"
										: s.type === "update"
											? "border-l-yellow-500"
											: "border-l-red-500"
									}`}
							>
								<div className="flex items-center gap-2">
									<Badge
										variant="outline"
										className={`text-xs ${s.type === "add"
												? "text-green-500 border-green-500/30"
												: s.type === "update"
													? "text-yellow-500 border-yellow-500/30"
													: "text-red-500 border-red-500/30"
											}`}
									>
										{s.type}
									</Badge>
									<span className="text-xs text-muted-foreground flex-1">
										{s.reason}
									</span>
								</div>

								{s.type === "update" && existingQ && (
									<div className="flex items-center gap-2 text-xs">
										<span className="text-muted-foreground line-through">
											{existingQ.question}
										</span>
										<ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
										<span className="text-foreground">{s.question}</span>
									</div>
								)}

								{s.type === "add" && (
									<p className="text-sm">{s.question}</p>
								)}

								{s.type === "remove" && existingQ && (
									<p className="text-sm text-muted-foreground line-through">
										{existingQ.question}
									</p>
								)}

								<div className="pt-1">
									{isApplied ? (
										<Badge variant="outline" className="text-xs">
											<Check className="mr-1 h-3 w-3" />
											Applied
										</Badge>
									) : (
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="h-7 text-xs"
											onClick={() => applySuggestion(s, i)}
										>
											{s.type === "add" && (
												<>
													<Plus className="mr-1 h-3 w-3" />
													Add to evals
												</>
											)}
											{s.type === "update" && (
												<>
													<ArrowRight className="mr-1 h-3 w-3" />
													Update eval
												</>
											)}
											{s.type === "remove" && (
												<>
													<Trash2 className="mr-1 h-3 w-3" />
													Remove eval
												</>
											)}
										</Button>
									)}
								</div>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
