export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 15 * 1024 * 1024;

const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export type NormalizedVideo =
  | { type: "file"; src: string }
  | { type: "embed"; src: string };

export function normalizeVideoUrl(input: string): NormalizedVideo {
  const url = input.trim();
  if (!url) return { type: "file", src: "" };

  const ytMatch =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/i) ||
    url.match(/youtube\.com\/embed\/([\w-]{11})/i);
  if (ytMatch) {
    return {
      type: "embed",
      src: `https://www.youtube.com/embed/${ytMatch[1]}`,
    };
  }

  const vimeoMatch =
    url.match(/vimeo\.com\/(?:video\/)?(\d+)/i) ||
    url.match(/player\.vimeo\.com\/video\/(\d+)/i);
  if (vimeoMatch) {
    return {
      type: "embed",
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  if (/player\.vimeo\.com\/video\/\d+/i.test(url) || /youtube\.com\/embed\//i.test(url)) {
    return { type: "embed", src: url };
  }

  return { type: "file", src: url };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function readImageFile(file: File): Promise<string> {
  if (!IMAGE_MIMES.has(file.type)) {
    throw new Error("Use a JPG, PNG, GIF, or WebP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be under 5MB.");
  }
  return readFileAsDataUrl(file);
}

export async function readVideoFile(file: File): Promise<string> {
  if (!VIDEO_MIMES.has(file.type)) {
    throw new Error("Use an MP4, WebM, or MOV video.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Video must be under 15MB.");
  }
  return readFileAsDataUrl(file);
}

export function isVideoEmbedSrc(src: string) {
  return normalizeVideoUrl(src).type === "embed";
}
