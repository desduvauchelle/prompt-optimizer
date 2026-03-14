import { callModel } from "@/lib/openrouter/client"
import type { EvalQuestion, GenerationResult } from "@/lib/types"

export interface RewriteResult {
	analysis: string
	recommendations: string[]
	rewrittenPrompt: string
}

export async function rewritePrompt(
	currentPrompt: string,
	evalQuestions: EvalQuestion[],
	evalResults: GenerationResult[],
	model: string
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

	const rewriteInput = `You are a prompt engineering expert. Your task is to analyze evaluation results and improve a prompt.

CURRENT PROMPT:
"""
${currentPrompt}
"""

EVALUATION RESULTS:
- Average score: ${(avgScore * 100).toFixed(1)}%
- Pass rates per criteria:
${passRates.map((p) => `  - "${p.question}": ${(p.passRate * 100).toFixed(1)}%`).join("\n")}

WORST PERFORMING OUTPUTS (examples of what the current prompt produces poorly):
${worstOutputs.map((o, i) => `--- Output ${i + 1} ---\n${o.substring(0, 500)}`).join("\n\n")}

Based on this analysis, respond with a JSON object containing:
1. "analysis": A brief analysis of what's going wrong with the current prompt
2. "recommendations": An array of specific changes to make
3. "rewrittenPrompt": The improved prompt that addresses the issues

Respond ONLY with the JSON object. Do not wrap in markdown code blocks.`

	const response = await callModel(model, rewriteInput)

	// Parse JSON from response
	const jsonMatch = response.match(/\{[\s\S]*\}/)
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
	}
}
