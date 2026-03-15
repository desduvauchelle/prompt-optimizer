"use client"

import { useRef } from "react"
import { Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FileAttachment } from "@/lib/types"

interface FileUploadButtonProps {
	files: FileAttachment[]
	onChange: (files: FileAttachment[]) => void
	compact?: boolean
}

const ACCEPTED_TYPES = ".txt,.md,.csv,.json,.pdf,.doc,.docx"
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export function FileUploadButton({
	files,
	onChange,
	compact,
}: FileUploadButtonProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	const handleFiles = async (fileList: FileList) => {
		const newFiles: FileAttachment[] = []

		for (const file of Array.from(fileList)) {
			if (file.size > MAX_SIZE) {
				alert(`File "${file.name}" exceeds 10MB limit`)
				continue
			}

			const data = await readFile(file)
			newFiles.push({
				id: crypto.randomUUID(),
				filename: file.name,
				mimeType: file.type || "application/octet-stream",
				data,
				size: file.size,
			})
		}

		onChange([...files, ...newFiles])
		if (inputRef.current) inputRef.current.value = ""
	}

	const removeFile = (id: string) => {
		onChange(files.filter((f) => f.id !== id))
	}

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 flex-wrap">
				{files.map((f) => (
					<span
						key={f.id}
						className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
					>
						<Paperclip className="h-3 w-3" />
						{f.filename}
						<button
							type="button"
							onClick={() => removeFile(f.id)}
							className="ml-1 hover:text-destructive"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				))}
				<Button
					type="button"
					variant="outline"
					size={compact ? "sm" : "default"}
					className={compact ? "h-7 text-xs" : ""}
					onClick={() => inputRef.current?.click()}
				>
					<Paperclip className="mr-1 h-3 w-3" />
					Attach file
				</Button>
			</div>
			<input
				ref={inputRef}
				type="file"
				accept={ACCEPTED_TYPES}
				multiple
				className="hidden"
				onChange={(e) => e.target.files && handleFiles(e.target.files)}
			/>
		</div>
	)
}

function readFile(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		const isText = /^(text\/|application\/json)/.test(file.type) || /\.(txt|md|csv|json)$/i.test(file.name)

		reader.onload = () => {
			if (typeof reader.result === "string") {
				if (isText) {
					resolve(reader.result)
				} else {
					// Strip data URL prefix for base64
					const base64 = reader.result.split(",")[1] || reader.result
					resolve(base64)
				}
			} else {
				reject(new Error("Failed to read file"))
			}
		}
		reader.onerror = () => reject(reader.error)

		if (isText) {
			reader.readAsText(file)
		} else {
			reader.readAsDataURL(file)
		}
	})
}
