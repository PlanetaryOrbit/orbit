import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import noblox from 'noblox.js';
import { createHash } from 'crypto';
import sharp from 'sharp';

type CacheEntry = { 
  buffer: Buffer; 
  etag: string; 
  mtime: number; 
  lastRefresh: number;
  metadata: { color?: string; resolution: number };
};

const memoryCache = new Map<string, CacheEntry>();
const MAX_ITEMS = 500;

function touch(key: string, entry: CacheEntry) {
  if (memoryCache.has(key)) memoryCache.delete(key);
  memoryCache.set(key, entry);
  if (memoryCache.size > MAX_ITEMS) {
    const first = memoryCache.keys().next().value;
    if (first) memoryCache.delete(first);
  }
}

const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=600';
const STALE_AFTER_MS = 6 * 60 * 60 * 1000; // 6h revalidation threshold

const ROBLOX_RESOLUTIONS = [48, 50, 60, 75, 100, 110, 150, 180, 352, 420, 720];

const BG_COLORS: Record<string, string> = {
  blue: '#0066cc',
  purple: '#9966cc',
  green: '#00cc66',
  red: '#cc0000',
  orange: '#ff6600',
  yellow: '#ffcc00',
  pink: '#ff66cc',
  gray: '#666666',
  black: '#000000',
  white: '#ffffff',
  orbit: '#ff0099'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userid, color, res: resParam } = req.query;
  
  if (!userid || Array.isArray(userid)) return res.status(400).end('Invalid userId');
  if (!/^[0-9]+$/.test(userid)) return res.status(400).end('Invalid userId');
  const userIdNum = Number(userid);
  if (!Number.isInteger(userIdNum) || userIdNum <= 0) return res.status(400).end('Invalid userId');
  if (userIdNum > 10_000_000_000) return res.status(400).end('Invalid userId');

  let resolution = 180; // Default resolution
  if (resParam && !Array.isArray(resParam)) {
    const parsed = parseInt(resParam, 10);
    if (Number.isInteger(parsed) && parsed >= 48 && parsed <= 2048) {
      resolution = parsed;
    } else {
      return res.status(400).end('Invalid resolution (must be 48-2048)');
    }
  }

  let sourceResolution: number;
  let fetchFromRoblox: boolean;
  
  if (ROBLOX_RESOLUTIONS.includes(resolution)) {
    sourceResolution = resolution;
    fetchFromRoblox = true;
  } else if (resolution <= 720) {
    sourceResolution = 720;
    fetchFromRoblox = false;
  } else {
    sourceResolution = 720;
    fetchFromRoblox = false;
  }

  let bgColor: string | undefined;
  if (color && !Array.isArray(color)) {
    const colorLower = color.toLowerCase();
    if (BG_COLORS[colorLower]) {
      bgColor = colorLower;
    } else {
      return res.status(400).end('Invalid color (supported: blue, purple, green, red, orange, yellow, pink, gray, black, white)');
    }
  }

  const avatarDir = path.join(process.cwd(), 'public', 'avatars');
  const baseFileName = `${userIdNum}_${sourceResolution}.png`;
  const avatarPath = path.join(avatarDir, baseFileName);
  const resolved = path.resolve(avatarPath);
  
  if (!resolved.startsWith(path.resolve(avatarDir) + path.sep)) {
    return res.status(400).end('Invalid userId');
  }

  const cacheKey = `${userIdNum}_${resolution}_${bgColor || 'none'}`;

  try {
    const mem = memoryCache.get(cacheKey);
    if (mem) {
      if (isNotModified(req, mem)) {
        setCommonHeaders(res, mem);
        return res.status(304).end();
      }
      setCommonHeaders(res, mem);
      res.setHeader('Content-Length', mem.buffer.length.toString());
      res.end(mem.buffer);
      
      if (Date.now() - mem.lastRefresh > STALE_AFTER_MS) {
        triggerBackgroundRefresh(userIdNum, avatarPath, cacheKey, bgColor, resolution).catch(() => {});
      }
      return;
    }

    await fs.mkdir(avatarDir, { recursive: true }).catch(() => {});

    let baseBuffer: Buffer | null = null;
    let diskStat: any = null;
    
    try {
      baseBuffer = await fs.readFile(avatarPath);
      diskStat = await fs.stat(avatarPath);
    } catch {}

    if (fetchFromRoblox || !baseBuffer || (diskStat && Date.now() - diskStat.mtimeMs > STALE_AFTER_MS)) {
      baseBuffer = await fetchAndPersist(userIdNum, avatarPath, sourceResolution);
      diskStat = { mtimeMs: Date.now() };
    }

    const needsProcessing = resolution !== sourceResolution || bgColor;
    const processedBuffer = needsProcessing 
      ? await processImage(baseBuffer, bgColor, resolution, sourceResolution)
      : baseBuffer;
    
    const etag = computeETag(processedBuffer);
    const now = Date.now();
    const entry: CacheEntry = {
      buffer: processedBuffer,
      etag,
      mtime: diskStat?.mtimeMs || now,
      lastRefresh: now,
      metadata: { color: bgColor, resolution }
    };
    
    touch(cacheKey, entry);
    
    if (isNotModified(req, entry)) {
      setCommonHeaders(res, entry);
      return res.status(304).end();
    }
    
    setCommonHeaders(res, entry);
    res.setHeader('Content-Length', processedBuffer.length.toString());
    res.end(processedBuffer);
    
  } catch (e) {
    console.error('Avatar error serving', userIdNum, e);
    res.status(404).end('Not found');
  }
}

async function processImage(
  buffer: Buffer, 
  bgColor?: string, 
  targetResolution: number = 180,
  sourceResolution: number = 180
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  // Resize if target is different from source
  if (targetResolution !== sourceResolution) {
    pipeline = pipeline.resize(targetResolution, targetResolution, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });
  }

  // Add background color if specified
  if (bgColor && BG_COLORS[bgColor]) {
    const hexColor = BG_COLORS[bgColor];
    const rgb = hexToRgb(hexColor);
    
    pipeline = pipeline.flatten({
      background: rgb
    });
  }

  return await pipeline.png().toBuffer();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function computeETag(buf: Buffer): string {
  return 'W/"' + createHash('sha1').update(buf).digest('hex') + '"';
}

function setCommonHeaders(res: NextApiResponse, entry: CacheEntry) {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', CACHE_CONTROL);
  res.setHeader('ETag', entry.etag);
  res.setHeader('Last-Modified', new Date(entry.mtime).toUTCString());
}

function isNotModified(req: NextApiRequest, entry: CacheEntry): boolean {
  const inm = req.headers['if-none-match'];
  if (inm && inm === entry.etag) return true;
  
  const ims = req.headers['if-modified-since'];
  if (ims) {
    const since = Date.parse(ims);
    if (!Number.isNaN(since) && entry.mtime <= since) return true;
  }
  
  return false;
}

async function fetchAndPersist(userId: number, filePath: string, resolution: number = 180): Promise<Buffer> {
  const remoteUrl = await getRemoteAvatarUrl(userId, resolution);
  const response = await axios.get(remoteUrl, { 
    responseType: 'arraybuffer', 
    timeout: 12000 
  });
  const buf = Buffer.from(response.data);
  
  if (ROBLOX_RESOLUTIONS.includes(resolution)) {
    fs.writeFile(filePath, buf).catch(() => {});
  }
  
  return buf;
}

async function triggerBackgroundRefresh(
  userId: number, 
  filePath: string, 
  cacheKey: string,
  bgColor?: string,
  targetResolution: number = 180
) {
  try {
    // Determine source resolution for refresh
    let sourceResolution: number;
    if (ROBLOX_RESOLUTIONS.includes(targetResolution)) {
      sourceResolution = targetResolution;
    } else {
      sourceResolution = 720;
    }
    
    const baseBuffer = await fetchAndPersist(userId, filePath, sourceResolution);
    
    const needsProcessing = targetResolution !== sourceResolution || bgColor;
    const processedBuffer = needsProcessing
      ? await processImage(baseBuffer, bgColor, targetResolution, sourceResolution)
      : baseBuffer;
    
    const now = Date.now();
    const entry: CacheEntry = {
      buffer: processedBuffer,
      etag: computeETag(processedBuffer),
      mtime: now,
      lastRefresh: now,
      metadata: { color: bgColor, resolution: targetResolution }
    };
    
    touch(cacheKey, entry);
    console.log('Avatar refreshed', userId, `(${targetResolution}x${targetResolution}${bgColor ? `, ${bgColor}` : ''})`);
  } catch (e) {
    console.warn('Avatar background refresh failed', userId, e);
  }
}

async function getRemoteAvatarUrl(userid: number, resolution: number = 180): Promise<string> {
  try {
    const thumbnails = await noblox.getPlayerThumbnail([userid], resolution as any, 'png', false, 'headshot');
    if (thumbnails && thumbnails[0]?.imageUrl) return thumbnails[0].imageUrl;
  } catch {}
  
  return `https://www.roblox.com/headshot-thumbnail/image?userId=${userid}&width=${resolution}&height=${resolution}&format=png`;
}