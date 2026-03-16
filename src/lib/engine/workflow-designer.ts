import { callModel } from "@/lib/openrouter/client"
import { randomId } from "@/lib/engine/utils"
import type { WorkflowDesignResult, WorkflowInputDef, WorkflowOutputDef } from "@/lib/types/workflow"

const DESIGN_SYSTEM_PROMPT = `You are an expert AI workflow architect. Given a user's input description and desired output description (with optional examples), you must design an optimal multi-step AI workflow.

Your job:
1. Analyze whether the transformation can be done in a single LLM call or needs multiple steps.
2. If multiple steps are needed, decompose the task into ordered steps where each step has a clear, focused responsibility.
3. For each step, write a complete system prompt that the LLM will use.
4. For each step, suggest evaluation questions (yes/no) that verify the step output quality.

Rules:
- Each step must have exactly ONE clear purpose.
- Steps are executed in order. Each step receives either the workflow input or the output of a previous step.
- The first step's inputSource should be "workflow_input".
- Subsequent steps reference a previous step's name as their inputSource.
- Each step's system prompt should be detailed and production-ready.
- Evaluation questions should be specific and answerable with yes/no.
- Keep the number of steps minimal — only split when genuinely needed (e.g., extraction then transformation, or analysis then formatting).
- modelSuggestion should be a reasonable OpenRouter model id (e.g., "openai/gpt-4o-mini", "anthropic/claude-sonnet-4", "google/gemini-2.0-flash-001").

Respond with ONLY valid JSON in this exact format:
{
  "canBeOneStep": boolean,
  "reasoning": "explanation of why you chose this decomposition",
  "steps": [
    {
      "name": "step_name_snake_case",
      "description": "What this step does",
      "systemPrompt": "The full system prompt for this step",
      "modelSuggestion": "model/id",
      "inputSource": "workflow_input",
      "outputDescription": "What this step outputs",
      "evalQuestions": [
        { "question": "Does the output contain X?" }
      ]
    }
  ]
}`

export async function designWorkflow(
	inputDef: WorkflowInputDef,
	outputDef: WorkflowOutputDef,
	model: string
): Promise<WorkflowDesignResult> {
	const userPrompt = buildDesignPrompt(inputDef, outputDef)
	const { text, cost } = await callModel(model, `${DESIGN_SYSTEM_PROMPT}\n\n${userPrompt}`)

	const jsonMatch = text.match(/\{[\s\S]*\}/)
	if (!jsonMatch) {
		throw new Error("AI did not return valid JSON for workflow design")
	}

	const parsed = JSON.parse(jsonMatch[0])

	// Validate structure
	if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
		throw new Error("AI returned no steps in workflow design")
	}

	// Map step names to IDs and resolve inputSource references
	const nameToId = new Map<string, string>()
	for (const step of parsed.steps) {
		const id = randomId()
		nameToId.set(step.name, id)
	}

	const steps = parsed.steps.map((step: {
		name: string
		description: string
		systemPrompt: string
		modelSuggestion: string
		inputSource: string
		outputDescription: string
		evalQuestions: { question: string }[]
	}) => ({
		...step,
		evalQuestions: (step.evalQuestions ?? []).map((eq: { question: string }) => ({
			id: randomId(),
			question: eq.question,
		})),
	}))

	return {
		canBeOneStep: !!parsed.canBeOneStep,
		reasoning: parsed.reasoning ?? "",
		steps,
		cost,
	}
}

function buildDesignPrompt(inputDef: WorkflowInputDef, outputDef: WorkflowOutputDef): string {
	let prompt = `## Input Definition\n`
	prompt += `Description: ${inputDef.description}\n`
	if (inputDef.example) {
		prompt += `Example input:\n\`\`\`\n${inputDef.example}\n\`\`\`\n`
	}

	prompt += `\n## Output Definition\n`
	prompt += `Description: ${outputDef.description}\n`
	if (outputDef.format) {
		prompt += `Format: ${outputDef.format}\n`
	}
	if (outputDef.example) {
		prompt += `Example output:\n\`\`\`\n${outputDef.example}\n\`\`\`\n`
	}

	prompt += `\nDesign the optimal workflow to transform the input into the desired output.`
	return prompt
}
