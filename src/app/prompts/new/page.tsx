import { CreateForm } from "@/components/prompt/create-form"

export default function NewPromptPage() {
	return (
		<div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">
					New Prompt Optimization
				</h1>
				<p className="mt-1 text-muted-foreground">
					Set up a new prompt to optimize through evaluation loops
				</p>
			</div>
			<CreateForm />
		</div>
	)
}
