"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ModelSelector } from "@/components/prompt/model-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Loader2 } from "lucide-react"
import type { WorkflowStep } from "@/lib/types/workflow"

interface StepReviewProps {
	steps: WorkflowStep[]
	reasoning?: string | null
	onConfirm: (steps: WorkflowStep[]) => void
	onSaveDraft: (steps: WorkflowStep[]) => void
	saving?: boolean
}

export function StepReview({ steps: initialSteps, reasoning, onConfirm, onSaveDraft, saving }: StepReviewProps) {
	const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps)
	const [expandedStep, setExpandedStep] = useState<string | null>(steps[0]?.id ?? null)

	function updateStep(id: string, updates: Partial<WorkflowStep>) {
		setSteps((prev) =>
			prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
		)
	}

	function removeStep(id: string) {
		setSteps((prev) => prev.filter((s) => s.id !== id))
	}

	function addStep() {
		const newId = Math.random().toString(36).substring(2, 15)
		const newStep: WorkflowStep = {
			id: newId,
			name: `step_${steps.length + 1}`,
			description: "",
			systemPrompt: "",
			model: "",
			inputSource: steps.length > 0 ? steps[steps.length - 1].id : "workflow_input",
			outputKey: `step_${steps.length + 1}_output`,
			outputDescription: "",
			evalQuestions: [],
			optimizationConfig: {
				maxIterations: 3,
				generationsPerIteration: 5,
				concurrency: 3,
				generationModel: "",
				evalModel: "",
				rewriteModel: "",
				autoConfirm: true,
				successThreshold: 85,
			},
			optimizationStatus: "pending",
		}
		setSteps((prev) => [...prev, newStep])
		setExpandedStep(newId)
	}

	function addEvalQuestion(stepId: string) {
		setSteps((prev) =>
			prev.map((s) =>
				s.id === stepId
					? {
						...s,
						evalQuestions: [
							...s.evalQuestions,
							{ id: Math.random().toString(36).substring(2, 15), question: "" },
						],
					}
					: s
			)
		)
	}

	function updateEvalQuestion(stepId: string, questionId: string, question: string) {
		setSteps((prev) =>
			prev.map((s) =>
				s.id === stepId
					? {
						...s,
						evalQuestions: s.evalQuestions.map((eq) =>
							eq.id === questionId ? { ...eq, question } : eq
						),
					}
					: s
			)
		)
	}

	function removeEvalQuestion(stepId: string, questionId: string) {
		setSteps((prev) =>
			prev.map((s) =>
				s.id === stepId
					? {
						...s,
						evalQuestions: s.evalQuestions.filter((eq) => eq.id !== questionId),
					}
					: s
			)
		)
	}

	return (
		<div className="space-y-6">
			{reasoning && (
				<Card>
					<CardHeader className="pb-3">
						<CardTitle className="text-sm">AI Design Reasoning</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground whitespace-pre-wrap">{reasoning}</p>
					</CardContent>
				</Card>
			)}

			<div className="space-y-3">
				{steps.map((step, idx) => {
					const isExpanded = expandedStep === step.id
					return (
						<Card key={step.id} className="overflow-hidden">
							<button
								className="flex w-full items-center gap-2 p-4 text-left hover:bg-accent/50 transition-colors"
								onClick={() => setExpandedStep(isExpanded ? null : step.id)}
							>
								<GripVertical className="h-4 w-4 text-muted-foreground" />
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
									{idx + 1}
								</span>
								<span className="flex-1 font-medium">{step.name || `Step ${idx + 1}`}</span>
								<span className="text-xs text-muted-foreground mr-2">
									{step.evalQuestions.length} eval criteria
								</span>
								{isExpanded ? (
									<ChevronUp className="h-4 w-4 text-muted-foreground" />
								) : (
									<ChevronDown className="h-4 w-4 text-muted-foreground" />
								)}
							</button>

							{isExpanded && (
								<CardContent className="border-t space-y-4 pt-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label>Step Name</Label>
											<Input
												value={step.name}
												onChange={(e) => updateStep(step.id, { name: e.target.value })}
											/>
										</div>
										<div className="space-y-2">
											<Label>Output Key</Label>
											<Input
												value={step.outputKey}
												onChange={(e) => updateStep(step.id, { outputKey: e.target.value })}
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label>Description</Label>
										<Textarea
											value={step.description}
											onChange={(e) => updateStep(step.id, { description: e.target.value })}
											rows={2}
										/>
									</div>

									<div className="space-y-2">
										<Label>System Prompt</Label>
										<Textarea
											value={step.systemPrompt}
											onChange={(e) => updateStep(step.id, { systemPrompt: e.target.value })}
											rows={6}
											className="font-mono text-sm"
										/>
									</div>

									<div className="space-y-2">
										<ModelSelector
											value={step.model}
											onChange={(v) => updateStep(step.id, { model: v })}
											label="Model"
										/>
									</div>

									<div className="space-y-2">
										<Label>Input Source</Label>
										<select
											className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
											value={step.inputSource}
											onChange={(e) => updateStep(step.id, { inputSource: e.target.value })}
										>
											<option value="workflow_input">Workflow Input</option>
											{steps
												.filter((s) => s.id !== step.id)
												.map((s) => (
													<option key={s.id} value={s.id}>
														Step: {s.name}
													</option>
												))}
										</select>
									</div>

									{/* Eval Questions */}
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<Label>Evaluation Criteria</Label>
											<Button
												variant="outline"
												size="sm"
												onClick={() => addEvalQuestion(step.id)}
											>
												<Plus className="mr-1 h-3 w-3" />
												Add
											</Button>
										</div>
										{step.evalQuestions.map((eq) => (
											<div key={eq.id} className="flex gap-2">
												<Input
													value={eq.question}
													onChange={(e) =>
														updateEvalQuestion(step.id, eq.id, e.target.value)
													}
													placeholder="Does the output...?"
													className="flex-1"
												/>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => removeEvalQuestion(step.id, eq.id)}
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											</div>
										))}
									</div>

									{/* Remove step */}
									{steps.length > 1 && (
										<div className="pt-2 border-t">
											<Button
												variant="ghost"
												size="sm"
												className="text-destructive"
												onClick={() => removeStep(step.id)}
											>
												<Trash2 className="mr-1 h-3 w-3" />
												Remove Step
											</Button>
										</div>
									)}
								</CardContent>
							)}
						</Card>
					)
				})}
			</div>

			{/* Add Step */}
			<Button variant="outline" className="w-full" onClick={addStep}>
				<Plus className="mr-2 h-4 w-4" />
				Add Step
			</Button>

			{/* Actions */}
			<div className="flex gap-3 pt-4">
				<Button variant="outline" onClick={() => onSaveDraft(steps)} disabled={saving}>
					Save Draft
				</Button>
				<Button onClick={() => onConfirm(steps)} disabled={saving || steps.length === 0}>
					{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Confirm & Start Optimization
				</Button>
			</div>
		</div>
	)
}
