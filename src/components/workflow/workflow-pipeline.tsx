"use client"

import { ArrowDown } from "lucide-react"
import { StepCard } from "@/components/workflow/step-card"
import type { WorkflowStep } from "@/lib/types/workflow"

interface WorkflowPipelineProps {
	steps: WorkflowStep[]
	inputDescription: string
	outputDescription: string
	onReoptimizeStep?: (stepIndex: number) => void
}

export function WorkflowPipeline({
	steps,
	inputDescription,
	outputDescription,
	onReoptimizeStep,
}: WorkflowPipelineProps) {
	return (
		<div className="space-y-2">
			{/* Input box */}
			<div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
				<p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Input</p>
				<p className="text-sm text-muted-foreground">{inputDescription}</p>
			</div>

			{steps.map((step, idx) => (
				<div key={step.id}>
					{/* Arrow */}
					<div className="flex justify-center py-1">
						<ArrowDown className="h-5 w-5 text-muted-foreground/50" />
					</div>

					<StepCard
						index={idx}
						id={step.id}
						name={step.name}
						description={step.description}
						model={step.model}
						optimizationStatus={step.optimizationStatus}
						bestScore={step.bestScore}
						bestPrompt={step.bestPrompt}
						linkedPromptProjectId={step.linkedPromptProjectId}
						onReoptimize={
							onReoptimizeStep ? () => onReoptimizeStep(idx) : undefined
						}
					/>
				</div>
			))}

			{/* Output box */}
			<div className="flex justify-center py-1">
				<ArrowDown className="h-5 w-5 text-muted-foreground/50" />
			</div>
			<div className="rounded-lg border border-dashed border-green-500/40 bg-green-500/5 p-4">
				<p className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-1">Output</p>
				<p className="text-sm text-muted-foreground">{outputDescription}</p>
			</div>
		</div>
	)
}
