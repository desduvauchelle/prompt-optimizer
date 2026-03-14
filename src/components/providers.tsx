"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 24 * 60 * 60 * 1000, // 24 hours — models list rarely changes
					},
				},
			})
	)

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
