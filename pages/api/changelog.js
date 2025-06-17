import Parser from "rss-parser";

export default async function handler(req, res) {
  const parser = new Parser();
  const feed = await parser.parseURL('https://feedback.planetaryapp.cloud/api/changelog/feed.rss');
  const items = feed.items.map(item => ({
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    content: item.content, // This is usually HTML, but you can use contentSnippet or custom fields if Markdown is present
  }));
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(items);
}