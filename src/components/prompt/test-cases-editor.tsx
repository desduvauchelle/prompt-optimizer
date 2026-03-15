"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FileUploadButton } from "@/components/prompt/file-upload-button"
import type { TestCase } from "@/lib/types"

interface TestCasesEditorProps {
	testCases: TestCase[]
	onChange: (testCases: TestCase[]) => void
}

export function TestCasesEditor({ testCases, onChange }: TestCasesEditorProps) {
	const [activeTab, setActiveTab] = useState(0)

	const addTestCase = () => {
		const newCase: TestCase = {
			id: crypto.randomUUID(),
			name: `Test case ${testCases.length + 1}`,
			content: "",
			files: [],
		}
		onChange([...testCases, newCase])
		setActiveTab(testCases.length)
	}

	const removeTestCase = (index: number) => {
		const updated = testCases.filter((_, i) => i !== index)
		onChange(updated)
		if (activeTab >= updated.length) {
			setActiveTab(Math.max(0, updated.length - 1))
		}
	}

	const updateTestCase = (index: number, updates: Partial<TestCase>) => {
		onChange(
			testCases.map((tc, i) =>
				i === index ? { ...tc, ...updates } : tc
			)
		)
	}

	if (testCases.length === 0) {
		return (
			<div className="rounded-md border border-dashed p-6 text-center">
				<p className="text-sm text-muted-foreground mb-3">
					Add test cases to benchmark your system prompt against different user inputs
				</p>
				<Button type="button" variant="outline" size="sm" onClick={addTestCase}>
					<Plus className="mr-1 h-3 w-3" />
					Add test case
				</Button>
			</div>
		)
	}

	const active = testCases[activeTab]

	return (
		<div className="space-y-3">
			{/* Tabs */}
			<div className="flex items-center gap-1 flex-wrap">
				{testCases.map((tc, i) => (
					<div
						key={tc.id}
						role="button"
						tabIndex={0}
						onClick={() => setActiveTab(i)}
						onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveTab(i)}
						className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${i === activeTab
								? "bg-primary text-primary-foreground"
								: "bg-muted hover:bg-muted/80 text-muted-foreground"
							}`}
					>
						{tc.name || `Case ${i + 1}`}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation()
								removeTestCase(i)
							}}
							className="ml-1 hover:text-destructive"
						>
							<X className="h-3 w-3" />
						</button>
					</div>
				))}
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="h-7 text-xs"
					onClick={addTestCase}
				>
					<Plus className="h-3 w-3" />
				</Button>
			</div>

			{/* Active test case editor */}
			{active && (
				<div className="space-y-3 rounded-md border p-3">
					<Input
						value={active.name}
						onChange={(e) =>
							updateTestCase(activeTab, { name: e.target.value })
						}
						placeholder="Test case name"
						className="text-sm"
					/>
					<Textarea
						value={active.content}
						onChange={(e) =>
							updateTestCase(activeTab, { content: e.target.value })
						}
						placeholder="User message / document content..."
						rows={6}
						className="font-mono text-sm"
					/>
					<FileUploadButton
						files={active.files}
						onChange={(files) => updateTestCase(activeTab, { files })}
						compact
					/>
				</div>
			)}
		</div>
	)
}
