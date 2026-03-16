"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Check, Pencil } from "lucide-react"
import { CopyButton } from "@/components/ui/copy-button"

interface RecommendationPanelProps {
	analysis: string
	recommendations: string[]
	rewrittenPrompt: string | null
	isAwaitingConfirmation: boolean
	onConfirm: (editedPrompt?: string) => void
}

export function RecommendationPanel({
	analysis,
	recommendations,
	rewrittenPrompt,
	isAwaitingConfirmation,
	onConfirm,
}: RecommendationPanelProps) {
	const [editablePrompt, setEditablePrompt] = useState(
		rewrittenPrompt ?? ""
	)
	const [isEditing, setIsEditing] = useState(false)

	return (
		<div className="space-y-4">
			{/* Analysis */}
			{analysis && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Analysis</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">{analysis}</p>
					</CardContent>
				</Card>
			)}

			{/* Recommendations */}
			{recommendations.length > 0 && (
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm">Recommendations</CardTitle>
					</CardHeader>
					<CardContent>
						<ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
							{recommendations.map((rec, i) => (
								<li key={i}>{rec}</li>
							))}
						</ul>
					</CardContent>
				</Card>
			)}

			{/* Rewritten prompt */}
			{rewrittenPrompt && (
				<Card
					className={
						isAwaitingConfirmation ? "border-yellow-500/50" : undefined
					}
				>
					<CardHeader className="pb-2">
						<div className="flex items-center justify-between">
							<CardTitle className="text-sm">Rewritten Prompt</CardTitle>
							{isAwaitingConfirmation && (
								<CardDescription className="text-yellow-500">
									Awaiting confirmation
								</CardDescription>
							)}
						</div>
					</CardHeader>
					<CardContent className="space-y-3 relative group/prompt">
						{isEditing || isAwaitingConfirmation ? (
							<>
								<CopyButton
									text={editablePrompt}
									className="absolute right-4 top-1 opacity-0 group-hover/prompt:opacity-100 transition-opacity z-10"
								/>
								<Textarea
									value={editablePrompt}
									onChange={(e) => setEditablePrompt(e.target.value)}
									rows={8}
									className="font-mono text-sm"
								/>
							</>
						) : (
							<>
								<CopyButton
									text={rewrittenPrompt ?? ""}
									className="absolute right-4 top-1 opacity-0 group-hover/prompt:opacity-100 transition-opacity z-10"
								/>
								<pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm font-mono">
									{rewrittenPrompt}
								</pre>
							</>
						)}

						{isAwaitingConfirmation && (
							<div className="flex gap-2 justify-end">
								{!isEditing ? (
									<>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setIsEditing(true)}
										>
											<Pencil className="mr-2 h-3 w-3" />
											Edit
										</Button>
										<Button size="sm" onClick={() => onConfirm()}>
											<Check className="mr-2 h-3 w-3" />
											Approve & Continue
										</Button>
									</>
								) : (
									<Button
										size="sm"
										onClick={() => onConfirm(editablePrompt)}
									>
										<Check className="mr-2 h-3 w-3" />
										Confirm Edited Prompt
									</Button>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
