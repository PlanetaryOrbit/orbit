import type { NextApiRequest, NextApiResponse } from "next";

const UPSTREAM_IMAGE = (id: string) =>
  `https://api-feedback.planetaryapp.us/api/changelog/public/${id}/image`;

const SAFE_ID = /^[a-zA-Z0-9_-]{1,128}$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  const raw = req.query.id;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id || typeof id !== "string" || !SAFE_ID.test(id)) {
    return res.status(400).end();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const upstream = await fetch(UPSTREAM_IMAGE(id), {
      signal: controller.signal,
      headers: { Accept: "image/*,*/*" },
    });
    clearTimeout(timeoutId);

    if (!upstream.ok) {
      return res.status(upstream.status).end();
    }

    const ct =
      upstream.headers.get("content-type") || "application/octet-stream";
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.setHeader("Content-Type", ct);
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    return res.status(200).send(buf);
  } catch {
    return res.status(502).end();
  }
}
