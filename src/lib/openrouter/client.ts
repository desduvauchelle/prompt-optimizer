import { OpenRouter } from "@openrouter/sdk"

let client: OpenRouter | null = null

export function getOpenRouterClient(): OpenRouter {
	if (!client) {
		const apiKey = process.env.OPENROUTER_API_KEY
		if (!apiKey) {
			throw new Error(
				"Please define the OPENROUTER_API_KEY environment variable in .env"
			)
		}
		client = new OpenRouter({ apiKey })
	}
	return client
}

export async function callModel(
	model: string,
	input: string
): Promise<string> {
	const openrouter = getOpenRouterClient()
	const result = openrouter.callModel({ model, input })
	const text = await result.getText()
	return text
}
