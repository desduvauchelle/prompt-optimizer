"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Copy, Check, FileJson, FileCode } from "lucide-react"

interface SdkExportPanelProps {
	workflowId: string
}

export function SdkExportPanel({ workflowId }: SdkExportPanelProps) {
	const [loading, setLoading] = useState(false)
	const [exportData, setExportData] = useState<{ config: object; sdk: string } | null>(null)
	const [copied, setCopied] = useState<"config" | "sdk" | null>(null)
	const [activeTab, setActiveTab] = useState<"config" | "sdk">("config")

	async function fetchExport() {
		setLoading(true)
		try {
			const res = await fetch(`/api/workflows/${workflowId}/export`)
			if (!res.ok) throw new Error("Failed to export")
			const data = await res.json()
			setExportData(data)
		} catch (error) {
			console.error(error)
		} finally {
			setLoading(false)
		}
	}

	function downloadFile(content: string, filename: string, type: string) {
		const blob = new Blob([content], { type })
		const url = URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download = filename
		a.click()
		URL.revokeObjectURL(url)
	}

	async function copyToClipboard(text: string, which: "config" | "sdk") {
		await navigator.clipboard.writeText(text)
		setCopied(which)
		setTimeout(() => setCopied(null), 2000)
	}

	if (!exportData) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Export SDK</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground mb-4">
						Export your optimized workflow as a portable JSON config and a self-contained TypeScript SDK.
					</p>
					<Button onClick={fetchExport} disabled={loading}>
						{loading ? "Loading..." : "Generate Export"}
					</Button>
				</CardContent>
			</Card>
		)
	}

	const configStr = JSON.stringify(exportData.config, null, 2)

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-base">Export SDK</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Tab buttons */}
				<div className="flex gap-2">
					<Button
						variant={activeTab === "config" ? "default" : "outline"}
						size="sm"
						onClick={() => setActiveTab("config")}
					>
						<FileJson className="mr-1 h-3 w-3" />
						JSON Config
					</Button>
					<Button
						variant={activeTab === "sdk" ? "default" : "outline"}
						size="sm"
						onClick={() => setActiveTab("sdk")}
					>
						<FileCode className="mr-1 h-3 w-3" />
						TypeScript SDK
					</Button>
				</div>

				{/* Preview */}
				<div className="relative">
					<pre className="max-h-80 overflow-auto rounded-md bg-muted p-4 text-xs font-mono">
						{activeTab === "config" ? configStr : exportData.sdk}
					</pre>
					<div className="absolute top-2 right-2 flex gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={() =>
								copyToClipboard(
									activeTab === "config" ? configStr : exportData.sdk,
									activeTab
								)
							}
						>
							{copied === activeTab ? (
								<Check className="h-3 w-3 text-green-500" />
							) : (
								<Copy className="h-3 w-3" />
							)}
						</Button>
					</div>
				</div>

				{/* Download buttons */}
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							downloadFile(configStr, "workflow-config.json", "application/json")
						}
					>
						<Download className="mr-1 h-3 w-3" />
						Download JSON
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() =>
							downloadFile(exportData.sdk, "workflow.ts", "text/typescript")
						}
					>
						<Download className="mr-1 h-3 w-3" />
						Download TypeScript
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
