# Prompt Optimizer 🚀

Prompt Optimizer is a powerful web-based tool designed to systematically refine and improve your AI prompts through automated iteration, evaluation, and rewriting. Built with Next.js 16, TypeScript, and MongoDB, it leverages OpenRouter's ecosystem to test your prompts across multiple models and optimize them based on your specific objectives.

## Features

- **Automated Iteration**: Run multiple optimization cycles where the system generates responses, evaluates them, and rewrites the prompt for the next round.
- **Multi-Model Support**: Use any model available via OpenRouter for generation and evaluation.
- **Structured Evaluation**: Define specific evaluation questions and criteria for the "AI Judge" to score outputs.
- **Workflow Orchestration**: Real-time tracking of the optimization process (Generation → Evaluation → Rewriting).
- **History & Analytics**: Compare scores and track the evolution of your prompts over time.
- **Modern UI**: Clean, responsive interface built with Tailwind CSS and Shadcn UI.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- An [OpenRouter API Key](https://openrouter.ai/keys)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-username/prompt-optimizer.git
   cd prompt-optimizer
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the root directory:

   ```env
   MONGODB_URI=mongodb://localhost:27017/prompt-optimizer
   OPENROUTER_API_KEY=your_api_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server:**

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the dashboard.

## How to Use

### 1. Create a New Project

Click "Create New" on the dashboard. Provide a name, objective, and your initial system prompt.

### 2. Configure Setup

- **Test Cases**: Define inputs to test your prompt against (e.g., specific user queries or data).
- **Evaluation Criteria**: Add questions for the AI judge (e.g., "Is the tone professional?", "Is the answer factually correct?").
- **Models**: Select which models to use for generating responses and for the evaluation phase.

### 3. Launch Optimization

Set the number of iterations and generations per iteration. Click "Start Optimization".

### 4. Review Results

Watch the progress in real-time. Once completed, review the:

- **Timeline**: See how the prompt evolved.
- **Scores**: Track the average performance score across iterations.
- **Comparison**: View individual test case outputs side-by-side.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **AI Integration**: [OpenRouter SDK](https://openrouter.ai/)
- **State Management**: [React Query](https://tanstack.com/query/latest)

## License

MIT
