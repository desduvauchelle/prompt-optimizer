"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ModelSelector } from "@/components/prompt/model-selector"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export function WorkflowCreateForm() {
	const router = useRouter()
	const [saving, setSaving] = useState(false)

	const [name, setName] = useState("")
	const [inputDescription, setInputDescription] = useState("")
	const [inputExample, setInputExample] = useState("")
	const [outputDescription, setOutputDescription] = useState("")
	const [outputExample, setOutputExample] = useState("")
	const [outputFormat, setOutputFormat] = useState<"json" | "text" | "markdown">("text")
	const [designModel, setDesignModel] = useState("")
	const [autoStartOptimization, setAutoStartOptimization] = useState(false)

	const canSubmit = name.trim() && inputDescription.trim() && outputDescription.trim() && designModel

	async function handleSubmit(design: boolean) {
		if (!canSubmit) return
		setSaving(true)

		try {
			// Create workflow
			const res = await fetch("/api/workflows", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: name.trim(),
					inputDef: {
						description: inputDescription.trim(),
						example: inputExample.trim(),
					},
					outputDef: {
						description: outputDescription.trim(),
						example: outputExample.trim(),
						format: outputFormat,
					},
					designModel,
					autoStartOptimization,
				}),
			})

			if (!res.ok) {
				const err = await res.json()
				throw new Error(err.error || "Failed to create workflow")
			}

			const { workflow } = await res.json()
			const workflowId = workflow._id

			// If design requested, trigger it
			if (design) {
				await fetch(`/api/workflows/${workflowId}/design`, { method: "POST" })
			}

			router.push(`/workflows/${workflowId}`)
		} catch (error) {
			console.error(error)
			alert(error instanceof Error ? error.message : "Failed to create workflow")
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-8 max-w-3xl">
			{/* Name */}
			<div className="space-y-2">
				<Label htmlFor="name">Workflow Name</Label>
				<Input
					id="name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g., Article to Structured JSON"
				/>
			</div>

			{/* Input Definition */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Input Definition</h3>
				<div className="space-y-2">
					<Label htmlFor="inputDescription">What kind of input will users provide?</Label>
					<Textarea
						id="inputDescription"
						value={inputDescription}
						onChange={(e) => setInputDescription(e.target.value)}
						placeholder="e.g., An article about authentic leadership published on a company website"
						rows={3}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="inputExample">Example Input (optional but recommended)</Label>
					<Textarea
						id="inputExample"
						value={inputExample}
						onChange={(e) => setInputExample(e.target.value)}
						placeholder="Paste an example input here..."
						rows={6}
						className="font-mono text-sm"
					/>
				</div>
			</div>

			{/* Output Definition */}
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">Output Definition</h3>
				<div className="space-y-2">
					<Label htmlFor="outputDescription">What output do you need?</Label>
					<Textarea
						id="outputDescription"
						value={outputDescription}
						onChange={(e) => setOutputDescription(e.target.value)}
						placeholder="e.g., A structured JSON object with themes, summary, key takeaways, and metadata"
						rows={3}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="outputFormat">Output Format</Label>
					<Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as typeof outputFormat)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="text">Plain Text</SelectItem>
							<SelectItem value="json">JSON</SelectItem>
							<SelectItem value="markdown">Markdown</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="outputExample">Example Output (optional but recommended)</Label>
					<Textarea
						id="outputExample"
						value={outputExample}
						onChange={(e) => setOutputExample(e.target.value)}
						placeholder="Paste an example of the desired output here..."
						rows={8}
						className="font-mono text-sm"
					/>
				</div>
			</div>

			{/* Design Model */}
			<div className="space-y-2">
				<ModelSelector
					value={designModel}
					onChange={setDesignModel}
					label="AI Model for Workflow Design"
					placeholder="Select a model to design the workflow..."
				/>
				<p className="text-xs text-muted-foreground">
					This model will analyze your input/output and design the workflow steps.
				</p>
			</div>

			{/* Auto-start */}
			<div className="flex items-center justify-between rounded-lg border p-4">
				<div className="space-y-0.5">
					<Label>Auto-start optimization after design</Label>
					<p className="text-xs text-muted-foreground">
						If off, you can review and edit the AI-designed steps before optimization starts.
					</p>
				</div>
				<Switch
					checked={autoStartOptimization}
					onCheckedChange={setAutoStartOptimization}
				/>
			</div>

			{/* Actions */}
			<div className="flex gap-3">
				<Button
					variant="outline"
					onClick={() => handleSubmit(false)}
					disabled={!canSubmit || saving}
				>
					Save as Draft
				</Button>
				<Button
					onClick={() => handleSubmit(true)}
					disabled={!canSubmit || saving}
				>
					{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Design Workflow with AI
				</Button>
			</div>
		</div>
	)
}
