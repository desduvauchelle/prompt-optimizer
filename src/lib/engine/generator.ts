import { callModel, callModelWithMessages } from "@/lib/openrouter/client"
import type { FileAttachment, TestCase } from "@/lib/types"

interface GeneratedOutput {
	output: string
	testCaseId: string | null
	cost: number
}

export async function generateOutputs(
	systemPrompt: string,
	systemFiles: FileAttachment[],
	testCases: TestCase[],
	model: string,
	repetitions: number,
	concurrency: number,
	onProgress?: (completed: number, total: number) => void
): Promise<GeneratedOutput[]> {
	const results: GeneratedOutput[] = []

	// Build task list: each test case × repetitions
	// If no test cases, run the system prompt alone
	interface Task {
		testCaseId: string | null
		userContent: string
		userFiles: FileAttachment[]
	}

	const tasks: Task[] = []
	if (testCases.length === 0) {
		for (let r = 0; r < repetitions; r++) {
			tasks.push({ testCaseId: null, userContent: "", userFiles: [] })
		}
	} else {
		for (const tc of testCases) {
			for (let r = 0; r < repetitions; r++) {
				tasks.push({ testCaseId: tc.id, userContent: tc.content, userFiles: tc.files })
			}
		}
	}

	const total = tasks.length
	let completed = 0

	const runTask = async (task: Task): Promise<GeneratedOutput> => {
		let result
		if (task.userContent || task.userFiles.length > 0 || systemFiles.length > 0) {
			result = await callModelWithMessages(
				model,
				systemPrompt,
				systemFiles,
				task.userContent,
				task.userFiles
			)
		} else {
			result = await callModel(model, systemPrompt)
		}
		completed++
		onProgress?.(completed, total)
		return { output: result.text, testCaseId: task.testCaseId, cost: result.cost }
	}

	// Process in chunks based on concurrency
	for (let i = 0; i < tasks.length; i += concurrency) {
		const batchSize = Math.min(concurrency, tasks.length - i)
		const batch = tasks.slice(i, i + batchSize).map((task) => runTask(task))

		const batchResults = await Promise.allSettled(batch)

		for (let j = 0; j < batchResults.length; j++) {
			const result = batchResults[j]
			if (result.status === "fulfilled") {
				results.push(result.value)
			} else {
				// On failure, retry once with backoff
				const task = tasks[i + j]
				try {
					await new Promise((r) => setTimeout(r, 2000))
					const retryResult = await runTask(task)
					results.push(retryResult)
				} catch {
					results.push({ output: "[GENERATION_FAILED]", testCaseId: task.testCaseId, cost: 0 })
					completed++
					onProgress?.(completed, total)
				}
			}
		}
	}

	return results
}
