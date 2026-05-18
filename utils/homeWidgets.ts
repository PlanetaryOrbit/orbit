export const HOME_WIDGET_IDS = [
	"sessions",
	"wall",
	"documents",
	"notices",
	"birthdays",
	"quick_links",
	"new_members",
	"music_quote",
] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];

export const HOME_WIDGET_LABELS: Record<HomeWidgetId, string> = {
	sessions: "Ongoing sessions",
	wall: "Latest wall messages",
	documents: "Latest documents",
	notices: "Inactivity Notices",
	birthdays: "Upcoming Birthdays",
	quick_links: "Quick Links",
	new_members: "New Team Members",
	music_quote: "Music Quote",
};

export const HOME_GRID_WIDGET_IDS = new Set<HomeWidgetId>([
	"sessions",
	"wall",
	"documents",
	"notices",
]);

export function isHomeWidgetId(id: string): id is HomeWidgetId {
	return (HOME_WIDGET_IDS as readonly string[]).includes(id);
}

export const DEFAULT_WIDGET_ORDER: HomeWidgetId[] = [
	"quick_links",
	"wall",
	"sessions",
	"notices",
	"music_quote",
	"birthdays",
	"new_members",
	"documents",
];

export function normalizeHomeWidgetOrder(ids: string[]): HomeWidgetId[] {
	const seen = new Set<string>();
	const out: HomeWidgetId[] = [];
	for (const id of ids) {
		if (!isHomeWidgetId(id) || seen.has(id)) continue;
		seen.add(id);
		out.push(id);
	}
	return out;
}

export type HomeDashboardChunk =
	| { kind: "grid"; ids: HomeWidgetId[] }
	| { kind: "full"; id: HomeWidgetId };

export function buildHomeDashboardChunks(ids: HomeWidgetId[]): HomeDashboardChunk[] {
	const chunks: HomeDashboardChunk[] = [];
	for (const id of ids) {
		const isGrid = HOME_GRID_WIDGET_IDS.has(id);
		const last = chunks[chunks.length - 1];
		if (isGrid) {
			if (last?.kind === "grid") last.ids.push(id);
			else chunks.push({ kind: "grid", ids: [id] });
		} else {
			chunks.push({ kind: "full", id });
		}
	}
	return chunks;
}
