import { callModel } from "@/lib/openrouter/client"
import type { EvalQuestion, GenerationResult, TestCase } from "@/lib/types"
import { randomId } from "@/lib/engine/utils"

interface GeneratedOutput {
	output: string
	testCaseId: string | null
}

export async function evaluateOutputs(
	outputs: GeneratedOutput[],
	evalQuestions: EvalQuestion[],
	model: string,
	testCases?: TestCase[]
): Promise<GenerationResult[]> {
	const results: GenerationResult[] = []
	const testCaseMap = new Map(testCases?.map((tc) => [tc.id, tc]) ?? [])

	for (const item of outputs) {
		if (item.output === "[GENERATION_FAILED]") {
			results.push({
				id: randomId(),
				output: item.output,
				evalScores: Object.fromEntries(evalQuestions.map((q) => [q.id, false])),
				overallScore: 0,
				testCaseId: item.testCaseId,
			})
			continue
		}

		const questionList = evalQuestions
			.map((q, i) => `${i + 1}. ${q.question}`)
			.join("\n")

		// Include test case context if available
		const testCase = item.testCaseId ? testCaseMap.get(item.testCaseId) : null
		const inputSection = testCase
			? `\nINPUT (test case "${testCase.name}"):\n"""\n${testCase.content}\n"""\n`
			: ""

		const evalPrompt = `You are an evaluator. Given the following${testCase ? " input and" : ""} output, answer each question with true or false.
${inputSection}
OUTPUT:
"""
${item.output}
"""

QUESTIONS:
${questionList}

Respond ONLY with a JSON object where keys are the question numbers (1, 2, 3...) and values are true or false.
Example: {"1": true, "2": false, "3": true}`

		try {
			const response = await callModel(model, evalPrompt)

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
				output: item.output,
				evalScores,
				overallScore,
				testCaseId: item.testCaseId,
			})
		} catch {
			results.push({
				id: randomId(),
				output: item.output,
				evalScores: Object.fromEntries(
					evalQuestions.map((q) => [q.id, false])
				),
				overallScore: 0,
				testCaseId: item.testCaseId,
			})
		}
	}

	return results
}
