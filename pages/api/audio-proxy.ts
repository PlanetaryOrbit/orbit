import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;
  if (!url || typeof url !== "string") return res.status(400).end();

  const upstream = await fetch(decodeURIComponent(url));
  if (!upstream.ok) return res.status(upstream.status).end();

  const contentType = upstream.headers.get("content-type") ?? "audio/mp4";
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=3600");

  const buffer = await upstream.arrayBuffer();
  res.send(Buffer.from(buffer));
}