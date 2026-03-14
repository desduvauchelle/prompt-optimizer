import { callModel } from "@/lib/openrouter/client"

export async function generateOutputs(
	prompt: string,
	model: string,
	count: number,
	concurrency: number,
	onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
	const results: string[] = []
	let completed = 0

	// Process in chunks based on concurrency
	for (let i = 0; i < count; i += concurrency) {
		const batchSize = Math.min(concurrency, count - i)
		const batch = Array.from({ length: batchSize }, () =>
			callModel(model, prompt).then((text) => {
				completed++
				onProgress?.(completed, count)
				return text
			})
		)

		const batchResults = await Promise.allSettled(batch)

		for (const result of batchResults) {
			if (result.status === "fulfilled") {
				results.push(result.value)
			} else {
				// On failure, retry once with backoff
				try {
					await new Promise((r) => setTimeout(r, 2000))
					const retryText = await callModel(model, prompt)
					completed++
					onProgress?.(completed, count)
					results.push(retryText)
				} catch {
					// If retry also fails, push an error marker
					results.push("[GENERATION_FAILED]")
					completed++
					onProgress?.(completed, count)
				}
			}
		}
	}

	return results
}
