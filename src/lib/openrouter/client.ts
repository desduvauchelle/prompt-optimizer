import { OpenRouter } from "@openrouter/sdk"
import type { FileAttachment } from "@/lib/types"

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

export interface ModelCallResult {
	text: string
	cost: number
}

export async function callModel(
	model: string,
	input: string
): Promise<ModelCallResult> {
	const openrouter = getOpenRouterClient()
	const result = openrouter.callModel({ model, input })
	const response = await result.getResponse()
	const text = response.output
		?.filter((o) => o.type === "message")
		.flatMap((o) => "content" in o ? o.content : [])
		.filter((c) => c.type === "output_text")
		.map((c) => "text" in c ? c.text : "")
		.join("") ?? await result.getText()
	const cost = response.usage?.cost ?? 0
	return { text, cost }
}

type MessageContent = string | Array<{ type: string;[key: string]: unknown }>

interface Message {
	role: "system" | "user" | "assistant"
	content: MessageContent
}

function buildMultimodalContent(
	text: string,
	files: FileAttachment[]
): MessageContent {
	if (files.length === 0) return text

	const parts: Array<{ type: string;[key: string]: unknown }> = [
		{ type: "input_text", text },
	]

	for (const file of files) {
		parts.push({
			type: "input_file",
			filename: file.filename,
			fileData: file.data,
		})
	}

	return parts
}

export async function callModelWithMessages(
	model: string,
	systemPrompt: string,
	systemFiles: FileAttachment[],
	userContent: string,
	userFiles: FileAttachment[]
): Promise<ModelCallResult> {
	const openrouter = getOpenRouterClient()

	const messages: Message[] = [
		{
			role: "system",
			content: buildMultimodalContent(systemPrompt, systemFiles),
		},
		{
			role: "user",
			content: buildMultimodalContent(userContent, userFiles),
		},
	]

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result = openrouter.callModel({ model, input: messages as any })
	const response = await result.getResponse()
	const text = response.output
		?.filter((o) => o.type === "message")
		.flatMap((o) => "content" in o ? o.content : [])
		.filter((c) => c.type === "output_text")
		.map((c) => "text" in c ? c.text : "")
		.join("") ?? await result.getText()
	const cost = response.usage?.cost ?? 0
	return { text, cost }
}
