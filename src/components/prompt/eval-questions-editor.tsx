"use client"

import { useState } from "react"
import { Plus, Trash2, Sparkles, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AIEvalPanel } from "@/components/prompt/ai-eval-panel"
import type { EvalQuestion, TestCase } from "@/lib/types"

interface EvalQuestionsEditorProps {
	questions: EvalQuestion[]
	onChange: (questions: EvalQuestion[]) => void
	systemPrompt?: string
	objective?: string
	testCases?: TestCase[]
	evalModel?: string
}

export function EvalQuestionsEditor({
	questions,
	onChange,
	systemPrompt = "",
	objective = "",
	testCases = [],
	evalModel = "",
}: EvalQuestionsEditorProps) {
	const [newQuestion, setNewQuestion] = useState("")
	const [aiMode, setAiMode] = useState<"generate" | "review" | null>(null)

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

	const canUseAI = systemPrompt.trim() && evalModel

	return (
		<div className="space-y-3">
			{questions.map((q, i) => (
				<div key={q.id} className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground w-6 shrink-0">
						{i + 1}.
					</span>
					<Input
						value={q.question}
						onChange={(e) => updateQuestion(q.id, e.target.value)}
						placeholder="Does the output include...?"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => removeQuestion(q.id)}
						className="shrink-0"
					>
						<Trash2 className="h-4 w-4 text-muted-foreground" />
					</Button>
				</div>
			))}

			<div className="flex items-center gap-2">
				<span className="w-6 shrink-0" />
				<Input
					value={newQuestion}
					onChange={(e) => setNewQuestion(e.target.value)}
					placeholder="Add a new eval question..."
					onKeyDown={(e) => {
						if (e.key === "Enter") {
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
					className="shrink-0"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			{/* AI buttons */}
			{canUseAI && !aiMode && (
				<div className="flex gap-2 pt-1">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="text-xs"
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
							onClick={() => setAiMode("review")}
						>
							<Search className="mr-1 h-3 w-3" />
							Review with AI
						</Button>
					)}
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
					evalModel={evalModel}
					onAddQuestion={(q) => onChange([...questions, q])}
					onUpdateQuestion={(id, question) => updateQuestion(id, question)}
					onRemoveQuestion={(id) => removeQuestion(id)}
					onClose={() => setAiMode(null)}
				/>
			)}
		</div>
	)
}
