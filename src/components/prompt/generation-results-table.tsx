"use client"

import { useState } from "react"
import { Check, X, ChevronDown, ChevronRight } from "lucide-react"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { GenerationResult, EvalQuestion } from "@/lib/types"

interface GenerationResultsTableProps {
	generations: GenerationResult[]
	evalQuestions: EvalQuestion[]
}

export function GenerationResultsTable({
	generations,
	evalQuestions,
}: GenerationResultsTableProps) {
	const [expandedRow, setExpandedRow] = useState<string | null>(null)

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-10">#</TableHead>
						<TableHead>Output</TableHead>
						{evalQuestions.map((q) => (
							<TableHead
								key={q.id}
								className="text-center w-16"
								title={q.question}
							>
								Q{evalQuestions.indexOf(q) + 1}
							</TableHead>
						))}
						<TableHead className="text-right w-20">Score</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{generations.map((gen, i) => {
						const isExpanded = expandedRow === gen.id
						return (
							<>
								<TableRow
									key={gen.id}
									className="cursor-pointer hover:bg-accent/50"
									onClick={() =>
										setExpandedRow(isExpanded ? null : gen.id)
									}
								>
									<TableCell className="font-mono text-xs">
										{i + 1}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											{isExpanded ? (
												<ChevronDown className="h-3 w-3 shrink-0" />
											) : (
												<ChevronRight className="h-3 w-3 shrink-0" />
											)}
											<span className="text-sm line-clamp-1 font-mono">
												{gen.output.substring(0, 120)}
											</span>
										</div>
									</TableCell>
									{evalQuestions.map((q) => (
										<TableCell key={q.id} className="text-center">
											{gen.evalScores[q.id] ? (
												<Check className="h-4 w-4 text-green-500 mx-auto" />
											) : (
												<X className="h-4 w-4 text-red-500 mx-auto" />
											)}
										</TableCell>
									))}
									<TableCell className="text-right font-mono text-sm">
										{(gen.overallScore * 100).toFixed(0)}%
									</TableCell>
								</TableRow>
								{isExpanded && (
									<TableRow key={`${gen.id}-expanded`}>
										<TableCell
											colSpan={evalQuestions.length + 3}
											className="bg-muted/50"
										>
											<pre className="whitespace-pre-wrap text-sm font-mono p-4 max-h-64 overflow-y-auto">
												{gen.output}
											</pre>
										</TableCell>
									</TableRow>
								)}
							</>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}
