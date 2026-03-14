import { callModel } from "@/lib/openrouter/client"
import type { EvalQuestion, GenerationResult } from "@/lib/types"
import { randomId } from "@/lib/engine/utils"

export async function evaluateOutputs(
	outputs: string[],
	evalQuestions: EvalQuestion[],
	model: string
): Promise<GenerationResult[]> {
	const results: GenerationResult[] = []

	for (const output of outputs) {
		if (output === "[GENERATION_FAILED]") {
			results.push({
				id: randomId(),
				output,
				evalScores: Object.fromEntries(evalQuestions.map((q) => [q.id, false])),
				overallScore: 0,
			})
			continue
		}

		const questionList = evalQuestions
			.map((q, i) => `${i + 1}. ${q.question}`)
			.join("\n")

		const evalPrompt = `You are an evaluator. Given the following output, answer each question with true or false.

OUTPUT:
"""
${output}
"""

QUESTIONS:
${questionList}

Respond ONLY with a JSON object where keys are the question numbers (1, 2, 3...) and values are true or false.
Example: {"1": true, "2": false, "3": true}`

		try {
			const response = await callModel(model, evalPrompt)

			// Parse JSON from response - find the JSON object in the text
			const jsonMatch = response.match(/\{[^}]+\}/)
			const parsed: Record<string, boolean> = jsonMatch
				? JSON.parse(jsonMatch[0])
				: {}

			const evalScores: Record<string, boolean> = {}
			let trueCount = 0

			for (let i = 0; i < evalQuestions.length; i++) {
				const val = parsed[String(i + 1)] === true
				evalScores[evalQuestions[i].id] = val
				if (val) trueCount++
			}

			const overallScore =
				evalQuestions.length > 0 ? trueCount / evalQuestions.length : 0

			results.push({
				id: randomId(),
				output,
				evalScores,
				overallScore,
			})
		} catch {
			// If eval fails, mark all as false
			results.push({
				id: randomId(),
				output,
				evalScores: Object.fromEntries(
					evalQuestions.map((q) => [q.id, false])
				),
				overallScore: 0,
			})
		}
	}

	return results
}
