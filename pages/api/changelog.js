import Parser from "rss-parser";

const FEED_URL = "https://feedback.planetaryapp.us/api/changelog/rss";

function normalizeItem(item) {
	return {
		title: item.title || "",
		link: item.link || item.url || item.guid || "",
		pubDate: item.pubDate || item.isoDate || item.pubdate || item.date_published || "",
		content: item.contentEncoded || item["content:encoded"] || item.content || item.content_html || item.contentSnippet || item.summary || item.description || item.content_text || "",
	};
}

export default async function handler(req, res) {
	res.setHeader("Content-Type", "application/json");
	const metaMode = req.query && (req.query.meta === "1" || req.query.meta === "true");

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 12000);
		const fetchRes = await fetch(FEED_URL, {
			headers: { "Accept": "application/json, application/rss+xml, application/xml, application/atom+xml" },
			signal: controller.signal,
		});
		clearTimeout(timeoutId);

		const contentType = (fetchRes.headers.get("Content-Type") || "").toLowerCase();

		if (contentType.includes("application/json")) {
			const data = await fetchRes.json();
			const rawItems = data.items || data.entries || [];
			let items = rawItems.map(normalizeItem);
			items.sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime());
			if (metaMode) {
				return res.status(200).json({ channel: { title: data.title, description: data.description, link: data.home_page_url || data.link }, items });
			}
			return res.status(200).json(items);
		}

		const xml = await fetchRes.text();
		const parser = new Parser({
			customFields: { item: [["content:encoded", "contentEncoded"]] },
		});
		const feed = await parser.parseString(xml);
		const rawItems = feed.items || feed.entries || [];
		let items = rawItems.map(normalizeItem);
		items.sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime());
		if (metaMode) {
			return res.status(200).json({ channel: { title: feed.title, description: feed.description, link: feed.link, lastBuildDate: feed.lastBuildDate }, items });
		}
		return res.status(200).json(items);
	} catch (err) {
		if (metaMode) return res.status(200).json({ channel: null, items: [] });
		return res.status(200).json([]);
	}
}