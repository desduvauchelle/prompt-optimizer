import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { Providers } from "@/components/providers"
import "./globals.css"

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
})

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
})

export const metadata: Metadata = {
	title: "Prompt Optimizer",
	description: "Iteratively optimize LLM prompts through automated evaluation loops",
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" className="dark">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
			>
				<Providers>
					<header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
						<div className="container mx-auto flex h-14 items-center px-6">
							<Link
								href="/"
								className="flex items-center gap-2 font-semibold tracking-tight"
							>
								<Sparkles className="h-5 w-5 text-primary" />
								Prompt Optimizer
							</Link>
						</div>
					</header>
					<main className="container mx-auto px-6 py-8">{children}</main>
				</Providers>
			</body>
		</html>
	)
}
