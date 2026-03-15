import { NextRequest, NextResponse } from "next/server"
import { callModel } from "@/lib/openrouter/client"
import { z } from "zod"

const ReviewEvalsSchema = z.object({
	systemPrompt: z.string().min(1),
	objective: z.string().default(""),
	testCases: z
		.array(z.object({ name: z.string(), content: z.string() }))
		.default([]),
	evalQuestions: z.array(
		z.object({ id: z.string(), question: z.string() })
	),
	model: z.string().min(1),
})

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { systemPrompt, objective, testCases, evalQuestions, model } =
			ReviewEvalsSchema.parse(body)

		const questionsList = evalQuestions
			.map((q, i) => `${i + 1}. [id: ${q.id}] ${q.question}`)
			.join("\n")

		const testCaseSection =
			testCases.length > 0
				? `\nTEST CASES:\n${testCases.map((tc, i) => `${i + 1}. "${tc.name}": ${tc.content.substring(0, 300)}`).join("\n")}\n`
				: ""

		const objectiveSection = objective
			? `\nOBJECTIVE: ${objective}\n`
			: ""

		const prompt = `You are an expert at evaluating LLM prompt quality. Review the following evaluation criteria for a system prompt and suggest improvements.
${objectiveSection}
SYSTEM PROMPT:
"""
${systemPrompt}
"""
${testCaseSection}
CURRENT EVALUATION QUESTIONS:
${questionsList}

Review these evaluation questions. Consider:
- Are they comprehensive enough?
- Are any redundant or too similar?
- Are they specific and measurable (yes/no answerable)?
- Are there important aspects not covered?
- Can any be improved in wording?

Respond ONLY with a JSON object containing:
1. "summary": A brief overall assessment (1-2 sentences)
2. "suggestions": An array of suggestion objects, each with:
   - "type": "add" (new question to add), "update" (improve existing), or "remove" (redundant/unhelpful)
   - "questionId": (for "update" and "remove" types) the id of the existing question
   - "question": the suggested question text (for "add" and "update" types)
   - "reason": why this change is recommended

Do not wrap in markdown code blocks.`

		const response = await callModel(model, prompt)
		const jsonMatch = response.text.match(/\{[\s\S]*\}/)
		if (!jsonMatch) {
			return NextResponse.json(
				{ error: "Failed to parse AI response" },
				{ status: 500 }
			)
		}

		const parsed = JSON.parse(jsonMatch[0])
		return NextResponse.json({
			summary: parsed.summary ?? "",
			suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
		})
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.issues },
				{ status: 400 }
			)
		}
		const message =
			error instanceof Error ? error.message : "Failed to review evals"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
