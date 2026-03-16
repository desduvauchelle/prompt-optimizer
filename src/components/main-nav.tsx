"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
	{ href: "/", label: "Prompts", match: (path: string) => path === "/" || path.startsWith("/prompts") },
	{ href: "/workflows", label: "Workflows", match: (path: string) => path.startsWith("/workflows") },
]

export function MainNav() {
	const pathname = usePathname()

	return (
		<nav className="flex items-center gap-1 ml-6">
			{navItems.map((item) => (
				<Link
					key={item.href}
					href={item.href}
					className={cn(
						"px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
						item.match(pathname)
							? "bg-accent text-accent-foreground"
							: "text-muted-foreground hover:text-foreground hover:bg-accent/50"
					)}
				>
					{item.label}
				</Link>
			))}
		</nav>
	)
}
