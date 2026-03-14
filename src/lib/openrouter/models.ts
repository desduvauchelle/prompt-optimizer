import type { ModelInfo } from "@/lib/types"

interface CachedModels {
	models: ModelInfo[]
	timestamp: number
}

let cache: CachedModels | null = null
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export async function getAvailableModels(): Promise<ModelInfo[]> {
	if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
		return cache.models
	}

	const res = await fetch("https://openrouter.ai/api/v1/models", {
		headers: {
			Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
		},
	})

	if (!res.ok) {
		throw new Error(`Failed to fetch models: ${res.status} ${res.statusText}`)
	}

	const data = await res.json()

	const models: ModelInfo[] = (data.data ?? []).map(
		(m: { id: string; name: string; pricing?: { prompt?: string; completion?: string } }) => ({
			id: m.id,
			name: m.name,
			pricing: m.pricing
				? { prompt: m.pricing.prompt ?? "0", completion: m.pricing.completion ?? "0" }
				: null,
		})
	)

	cache = { models, timestamp: Date.now() }
	return models
}

export function clearModelCache() {
	cache = null
}
