"use client"

import { Loader2, Brain } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StepDesignerProps {
	reasoning?: string | null
}

export function StepDesigner({ reasoning }: StepDesignerProps) {
	return (
		<Card className="border-primary/30">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Brain className="h-5 w-5 text-primary animate-pulse" />
					AI is designing your workflow...
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex items-center gap-3">
					<Loader2 className="h-5 w-5 animate-spin text-primary" />
					<p className="text-sm text-muted-foreground">
						Analyzing your input and output definitions to determine the optimal workflow steps...
					</p>
				</div>

				{reasoning && (
					<div className="rounded-md bg-muted p-4">
						<p className="text-sm font-medium mb-1">AI Reasoning</p>
						<p className="text-sm text-muted-foreground whitespace-pre-wrap">{reasoning}</p>
					</div>
				)}

				<div className="space-y-2">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
						Determining number of steps needed
					</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
						Writing system prompts for each step
					</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
						Creating evaluation criteria
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
