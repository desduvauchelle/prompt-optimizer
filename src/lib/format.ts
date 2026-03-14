export function formatDistanceToNow(dateStr: string): string {
	const date = new Date(dateStr)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffSec = Math.floor(diffMs / 1000)
	const diffMin = Math.floor(diffSec / 60)
	const diffHr = Math.floor(diffMin / 60)
	const diffDays = Math.floor(diffHr / 24)

	if (diffSec < 60) return "just now"
	if (diffMin < 60) return `${diffMin}m ago`
	if (diffHr < 24) return `${diffHr}h ago`
	if (diffDays < 30) return `${diffDays}d ago`
	return date.toLocaleDateString()
}
