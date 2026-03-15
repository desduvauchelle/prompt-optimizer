import { NextRequest, NextResponse } from "next/server"
import { callModel } from "@/lib/openrouter/client"
import { z } from "zod"

const GenerateEvalsSchema = z.object({
	systemPrompt: z.string().min(1),
	objective: z.string().default(""),
	testCases: z
		.array(z.object({ name: z.string(), content: z.string() }))
		.default([]),
	model: z.string().min(1),
})

export async function POST(req: NextRequest) {
	try {
		const body = await req.json()
		const { systemPrompt, objective, testCases, model } =
			GenerateEvalsSchema.parse(body)

		const testCaseSection =
			testCases.length > 0
				? `\nTEST CASES (user inputs this prompt will be used with):\n${testCases.map((tc, i) => `${i + 1}. "${tc.name}": ${tc.content.substring(0, 300)}`).join("\n")}\n`
				: ""

		const objectiveSection = objective
			? `\nOBJECTIVE: ${objective}\n`
			: ""

		const prompt = `You are an expert at evaluating LLM outputs. Given a system prompt${objective ? ", its objective," : ""} ${testCases.length > 0 ? "and sample test cases" : ""}, generate yes/no evaluation questions that can be used to assess the quality of outputs.
${objectiveSection}
SYSTEM PROMPT:
"""
${systemPrompt}
"""
${testCaseSection}
Generate 5-10 yes/no evaluation questions. Each question should test a specific quality aspect of the expected output. Questions should be answerable with true/false by an LLM evaluator.

Respond ONLY with a JSON array of objects, each with an "id" (unique string) and "question" (the yes/no question).
Example: [{"id": "q1", "question": "Does the output include a greeting?"}]`

		const response = await callModel(model, prompt)
		const jsonMatch = response.match(/\[[\s\S]*\]/)
		if (!jsonMatch) {
			return NextResponse.json(
				{ error: "Failed to parse AI response" },
				{ status: 500 }
			)
		}

		const questions = JSON.parse(jsonMatch[0])
		return NextResponse.json({ questions })
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Validation failed", details: error.issues },
				{ status: 400 }
			)
		}
		const message =
			error instanceof Error ? error.message : "Failed to generate evals"
		return NextResponse.json({ error: message }, { status: 500 })
	}
}
