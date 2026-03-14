"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { EvalQuestion } from "@/lib/types"

interface EvalQuestionsEditorProps {
	questions: EvalQuestion[]
	onChange: (questions: EvalQuestion[]) => void
}

export function EvalQuestionsEditor({
	questions,
	onChange,
}: EvalQuestionsEditorProps) {
	const [newQuestion, setNewQuestion] = useState("")

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
		</div>
	)
}
