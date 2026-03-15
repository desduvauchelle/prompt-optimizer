"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { ModelInfo } from "@/lib/types"

interface ModelSelectorProps {
	value: string
	onChange: (value: string) => void
	label: string
}

async function fetchModels(): Promise<ModelInfo[]> {
	const res = await fetch("/api/models")
	if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`)
	const data = await res.json()
	return data.models ?? []
}

export function ModelSelector({ value, onChange, label }: ModelSelectorProps) {
	const [search, setSearch] = useState("")
	const [open, setOpen] = useState(false)

	const { data: models = [], isLoading: loading } = useQuery<ModelInfo[]>({
		queryKey: ["models"],
		queryFn: fetchModels,
	})

	const selectedModel = models.find((m) => m.id === value)

	const filtered = models.filter(
		(m) =>
			m.name.toLowerCase().includes(search.toLowerCase()) ||
			m.id.toLowerCase().includes(search.toLowerCase())
	)

	if (loading) {
		return (
			<div className="space-y-2">
				<label className="text-sm font-medium">{label}</label>
				<div className="h-10 animate-pulse rounded-md bg-muted" />
			</div>
		)
	}

	return (
		<div className="space-y-2">
			<label className="text-sm font-medium">{label}</label>
			<Select
				value={value}
				onValueChange={onChange}
				open={open}
				onOpenChange={(isOpen) => {
					setOpen(isOpen)
					if (!isOpen) setSearch("")
				}}
			>
				<SelectTrigger>
					<SelectValue placeholder="Select a model...">
						{selectedModel?.name ?? (value ? value : undefined)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<div className="p-2">
						<Input
							placeholder="Search models..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={(e) => e.stopPropagation()}
							className="h-8"
						/>
					</div>
					<div className="max-h-60 overflow-y-auto">
						{filtered.slice(0, 50).map((m) => (
							<SelectItem key={m.id} value={m.id}>
								{m.name}
							</SelectItem>
						))}
						{filtered.length === 0 && (
							<div className="px-2 py-4 text-center text-sm text-muted-foreground">
								No models found
							</div>
						)}
					</div>
				</SelectContent>
			</Select>
		</div>
	)
}
