import { callModel } from "@/lib/openrouter/client"
import type { EvalQuestion, GenerationResult, TestCase } from "@/lib/types"

export interface RewriteResult {
	analysis: string
	recommendations: string[]
	rewrittenPrompt: string
	cost: number
}

export async function rewritePrompt(
	currentPrompt: string,
	evalQuestions: EvalQuestion[],
	evalResults: GenerationResult[],
	model: string,
	objective?: string,
	testCases?: TestCase[]
): Promise<RewriteResult> {
	// Calculate pass rates per question
	const passRates = evalQuestions.map((q) => {
		const passes = evalResults.filter((r) => r.evalScores[q.id] === true).length
		return {
			question: q.question,
			passRate: evalResults.length > 0 ? passes / evalResults.length : 0,
		}
	})

	// Find the 3 worst-performing outputs
	const worstOutputs = [...evalResults]
		.sort((a, b) => a.overallScore - b.overallScore)
		.slice(0, 3)
		.map((r) => r.output)
		.filter((o) => o !== "[GENERATION_FAILED]")

	const avgScore =
		evalResults.length > 0
			? evalResults.reduce((sum, r) => sum + r.overallScore, 0) /
			evalResults.length
			: 0

	const objectiveSection = objective
		? `\nOBJECTIVE OF THIS PROMPT:\n${objective}\n`
		: ""

	const testCaseSection = testCases && testCases.length > 0
		? `\nTEST CASES (fixed user inputs the prompt is benchmarked against — do NOT modify these):\n${testCases.map((tc, i) => `${i + 1}. "${tc.name}": ${tc.content.substring(0, 200)}`).join("\n")}\n`
		: ""

	const rewriteInput = `You are a prompt engineering expert. Your task is to analyze evaluation results and improve a SYSTEM PROMPT. The test cases (user inputs) are fixed and must not be changed — only improve the system prompt.
${objectiveSection}
CURRENT SYSTEM PROMPT:
"""
${currentPrompt}
"""
${testCaseSection}
EVALUATION RESULTS:
- Average score: ${(avgScore * 100).toFixed(1)}%
- Pass rates per criteria:
${passRates.map((p) => `  - "${p.question}": ${(p.passRate * 100).toFixed(1)}%`).join("\n")}

WORST PERFORMING OUTPUTS (examples of what the current prompt produces poorly):
${worstOutputs.map((o, i) => `--- Output ${i + 1} ---\n${o.substring(0, 500)}`).join("\n\n")}

Based on this analysis, respond with a JSON object containing:
1. "analysis": A brief analysis of what's going wrong with the current system prompt
2. "recommendations": An array of specific changes to make
3. "rewrittenPrompt": The improved system prompt that addresses the issues

Respond ONLY with the JSON object. Do not wrap in markdown code blocks.`

	const response = await callModel(model, rewriteInput)

	// Parse JSON from response
	const jsonMatch = response.text.match(/\{[\s\S]*\}/)
	if (!jsonMatch) {
		throw new Error("Failed to parse rewrite response as JSON")
	}

	const parsed = JSON.parse(jsonMatch[0])

	return {
		analysis: parsed.analysis ?? "No analysis provided",
		recommendations: Array.isArray(parsed.recommendations)
			? parsed.recommendations
			: [],
		rewrittenPrompt: parsed.rewrittenPrompt ?? currentPrompt,
		cost: response.cost,
	}
}
