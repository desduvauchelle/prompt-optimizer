"use client"

import { useState, useRef, useEffect, useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ModelInfo } from "@/lib/types"

async function fetchModels(): Promise<ModelInfo[]> {
	const res = await fetch("/api/models")
	if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`)
	const data = await res.json()
	return data.models ?? []
}

interface ModelSelectorProps {
	value: string
	onChange: (value: string) => void
	label?: string
	placeholder?: string
	compact?: boolean
}

export function ModelSelector({
	value,
	onChange,
	label,
	placeholder = "Select a model...",
	compact = false,
}: ModelSelectorProps) {
	const id = useId()
	const [open, setOpen] = useState(false)
	const [search, setSearch] = useState("")
	const containerRef = useRef<HTMLDivElement>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

	const { data: models = [], isLoading } = useQuery<ModelInfo[]>({
		queryKey: ["models"],
		queryFn: fetchModels,
	})

	const selected = models.find((m) => m.id === value)

	const filtered = search
		? models.filter(
			(m) =>
				m.name.toLowerCase().includes(search.toLowerCase()) ||
				m.id.toLowerCase().includes(search.toLowerCase())
		)
		: models

	// Close on outside click
	useEffect(() => {
		if (!open) return
		const handler = (e: MouseEvent) => {
			if (!containerRef.current?.contains(e.target as Node)) {
				setOpen(false)
				setSearch("")
			}
		}
		document.addEventListener("mousedown", handler)
		return () => document.removeEventListener("mousedown", handler)
	}, [open])

	// Focus search input immediately when opened
	useEffect(() => {
		if (open) {
			// Small delay to let the dropdown render first
			requestAnimationFrame(() => inputRef.current?.focus())
		}
	}, [open])

	const handleSelect = (modelId: string) => {
		onChange(modelId)
		setOpen(false)
		setSearch("")
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setOpen(false)
			setSearch("")
		}
	}

	const triggerClass = cn(
		"flex w-full items-center justify-between rounded-md border border-input bg-background text-sm ring-offset-background",
		"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		"disabled:cursor-not-allowed disabled:opacity-50",
		compact ? "h-7 px-2 py-1 text-xs" : "h-10 px-3 py-2"
	)

	return (
		<div className={label ? "space-y-2" : undefined}>
			{label && (
				<label htmlFor={id} className="text-sm font-medium">
					{label}
				</label>
			)}

			{isLoading ? (
				<div className={cn("animate-pulse rounded-md bg-muted", compact ? "h-7" : "h-10")} />
			) : (
				<div ref={containerRef} className="relative">
					<button
						id={id}
						type="button"
						className={triggerClass}
						onClick={() => setOpen((o) => !o)}
						aria-haspopup="listbox"
						aria-expanded={open}
					>
						<span className={cn("truncate", !selected && !value && "text-muted-foreground")}>
							{selected?.name ?? (value || placeholder)}
						</span>
						<ChevronDown className={cn("shrink-0 opacity-50", compact ? "ml-1 h-3 w-3" : "ml-2 h-4 w-4")} />
					</button>

					{open && (
						<div
							className="absolute z-50 mt-1 w-full min-w-[200px] rounded-md border border-border bg-popover shadow-md"
							onKeyDown={handleKeyDown}
						>
							{/* Search input — always focused, never loses focus on typing */}
							<div className="p-2 border-b border-border">
								<input
									ref={inputRef}
									type="text"
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									placeholder="Search models..."
									className={cn(
										"w-full rounded-sm border-0 bg-transparent outline-none placeholder:text-muted-foreground",
										compact ? "text-xs py-0.5" : "text-sm py-1"
									)}
								/>
							</div>

							{/* Results list */}
							<div ref={listRef} className="max-h-60 overflow-y-auto p-1" role="listbox">
								{filtered.slice(0, 100).map((m) => (
									<button
										key={m.id}
										type="button"
										role="option"
										aria-selected={m.id === value}
										className={cn(
											"flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground",
											compact ? "text-xs" : "text-sm",
											m.id === value && "bg-accent/50"
										)}
										// preventDefault keeps focus on the search input
										onMouseDown={(e) => e.preventDefault()}
										onClick={() => handleSelect(m.id)}
									>
										{m.id === value && <Check className="h-3 w-3 shrink-0" />}
										<span className={m.id === value ? "" : compact ? "ml-4" : "ml-5"}>
											{m.name}
										</span>
									</button>
								))}
								{filtered.length === 0 && (
									<p className="px-2 py-3 text-center text-sm text-muted-foreground">
										No models found
									</p>
								)}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
