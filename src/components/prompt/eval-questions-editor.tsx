"use client"

import { useState } from "react"
import { Plus, Trash2, Sparkles, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ModelSelector } from "@/components/prompt/model-selector"
import { AIEvalPanel } from "@/components/prompt/ai-eval-panel"
import type { EvalQuestion, TestCase } from "@/lib/types"

const AI_MODEL_KEY = "eval_ai_model"

interface EvalQuestionsEditorProps {
	questions: EvalQuestion[]
	onChange: (questions: EvalQuestion[]) => void
	systemPrompt?: string
	objective?: string
	testCases?: TestCase[]
}

export function EvalQuestionsEditor({
	questions,
	onChange,
	systemPrompt = "",
	objective = "",
	testCases = [],
}: EvalQuestionsEditorProps) {
	const [newQuestion, setNewQuestion] = useState("")
	const [aiMode, setAiMode] = useState<"generate" | "review" | null>(null)
	const [customInstructions, setCustomInstructions] = useState("")
	const [aiModel, setAiModel] = useState<string>(
		() => (typeof window !== "undefined" ? (localStorage.getItem(AI_MODEL_KEY) ?? "") : "")
	)

	const handleAiModelChange = (value: string) => {
		setAiModel(value)
		localStorage.setItem(AI_MODEL_KEY, value)
	}

	const addQuestion = () => {
		const trimmed = newQuestion.trim()
		if (!trimmed) return

		onChange([
			...questions,
			{ id: crypto.randomUUID(), question: trimmed },
		])
		setNewQuestion("")
	}

	const removeQuestion = (id: string) => {
		onChange(questions.filter((q) => q.id !== id))
	}

	const updateQuestion = (id: string, question: string) => {
		onChange(questions.map((q) => (q.id === id ? { ...q, question } : q)))
	}

	const canUseAI = systemPrompt.trim()

	return (
		<div className="space-y-3">
			{questions.map((q, i) => (
				<div key={q.id} className="flex items-start gap-2">
					<span className="text-sm text-muted-foreground w-6 shrink-0 pt-2">
						{i + 1}.
					</span>
					<Textarea
						value={q.question}
						onChange={(e) => updateQuestion(q.id, e.target.value)}
						placeholder="Does the output include...?"
						rows={2}
						className="text-sm min-h-[2.5rem]"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => removeQuestion(q.id)}
						className="shrink-0 mt-1"
					>
						<Trash2 className="h-4 w-4 text-muted-foreground" />
					</Button>
				</div>
			))}

			<div className="flex items-start gap-2">
				<span className="w-6 shrink-0" />
				<Textarea
					value={newQuestion}
					onChange={(e) => setNewQuestion(e.target.value)}
					placeholder="Add a new eval question..."
					rows={2}
					className="text-sm min-h-[2.5rem]"
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault()
							addQuestion()
						}
					}}
				/>
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={addQuestion}
					className="shrink-0 mt-1"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			{/* AI section */}
			{canUseAI && !aiMode && (
				<div className="space-y-2 border-t border-border pt-3">
					{/* AI model selector */}
					<div className="flex items-center gap-2">
						<span className="text-xs text-muted-foreground shrink-0">AI model:</span>
						<div className="flex-1 max-w-xs">
							<ModelSelector
								value={aiModel}
								onChange={handleAiModelChange}
								placeholder="Pick a model..."
								compact
							/>
						</div>
					</div>

					{/* Custom instructions */}
					<Textarea
						value={customInstructions}
						onChange={(e) => setCustomInstructions(e.target.value)}
						placeholder='Optional: tell the AI what to check for (e.g. "Check for formatting, code examples, error handling")'
						rows={2}
						className="text-sm text-muted-foreground"
					/>

					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="text-xs"
							disabled={!aiModel}
							onClick={() => setAiMode("generate")}
						>
							<Sparkles className="mr-1 h-3 w-3" />
							Generate with AI
						</Button>
						{questions.length > 0 && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="text-xs"
								disabled={!aiModel}
								onClick={() => setAiMode("review")}
							>
								<Search className="mr-1 h-3 w-3" />
								Review with AI
							</Button>
						)}
					</div>
				</div>
			)}

			{/* AI panel */}
			{aiMode && (
				<AIEvalPanel
					mode={aiMode}
					systemPrompt={systemPrompt}
					objective={objective}
					testCases={testCases}
					evalQuestions={questions}
					evalModel={aiModel}
					customInstructions={customInstructions}
					onAddQuestion={(q) => onChange([...questions, q])}
					onUpdateQuestion={(id, question) => updateQuestion(id, question)}
					onRemoveQuestion={(id) => removeQuestion(id)}
					onClose={() => setAiMode(null)}
				/>
			)}
		</div>
	)
}
