import { Buffer } from "node:buffer";

import { createId, slugify } from "@/lib/utils";

export function toSafeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

export function toOptionalString(value: unknown): string | null {
  const text = toSafeString(value, "");
  return text ? text : null;
}

export function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAspectRatio(value: unknown, fallback = "16:9"): string {
  const text = toSafeString(value, fallback);
  return /^[0-9]+:[0-9]+$/.test(text) ? text : fallback;
}

export function dimensionsForAspectRatio(
  aspectRatio: string,
  fallback = { width: 1280, height: 720 }
): { width: number; height: number } {
  if (aspectRatio === "1:1") {
    return { width: 1024, height: 1024 };
  }

  if (aspectRatio === "9:16") {
    return { width: 1080, height: 1920 };
  }

  if (aspectRatio === "16:9") {
    return { width: 1280, height: 720 };
  }

  const [widthText, heightText] = aspectRatio.split(":");
  const widthRatio = Number(widthText);
  const heightRatio = Number(heightText);

  if (!Number.isFinite(widthRatio) || !Number.isFinite(heightRatio) || widthRatio <= 0 || heightRatio <= 0) {
    return fallback;
  }

  const baseWidth = fallback.width;
  const height = Math.max(1, Math.round((baseWidth * heightRatio) / widthRatio));
  return { width: baseWidth, height };
}

export function createSvgPoster(input: {
  title: string;
  subtitle: string;
  width: number;
  height: number;
  accent?: string;
}): string {
  const title = escapeXml(input.title.slice(0, 72));
  const subtitle = escapeXml(input.subtitle.slice(0, 160));
  const accent = input.accent ?? "#ff8c42";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090b12" />
          <stop offset="55%" stop-color="#11182a" />
          <stop offset="100%" stop-color="#07090d" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#ffd08a" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <circle cx="${input.width - Math.round(input.width * 0.18)}" cy="${Math.round(input.height * 0.16)}" r="${Math.round(Math.min(input.width, input.height) * 0.16)}" fill="${accent}" opacity="0.18" />
      <rect x="${Math.round(input.width * 0.06)}" y="${Math.round(input.height * 0.1)}" width="${Math.round(input.width * 0.88)}" height="${Math.round(input.height * 0.8)}" rx="32" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
      <rect x="${Math.round(input.width * 0.1)}" y="${Math.round(input.height * 0.18)}" width="${Math.round(input.width * 0.2)}" height="14" rx="7" fill="url(#accent)" opacity="0.95" />
      <text x="${Math.round(input.width * 0.1)}" y="${Math.round(input.height * 0.36)}" fill="#f8fbff" font-size="${Math.round(input.width * 0.04)}" font-family="Arial, sans-serif" font-weight="700">
        ${title}
      </text>
      <text x="${Math.round(input.width * 0.1)}" y="${Math.round(input.height * 0.46)}" fill="#b7bfd1" font-size="${Math.round(input.width * 0.021)}" font-family="Arial, sans-serif">
        ${subtitle}
      </text>
      <text x="${Math.round(input.width * 0.1)}" y="${Math.round(input.height * 0.84)}" fill="#ffd08a" font-size="${Math.round(input.width * 0.017)}" font-family="Arial, sans-serif" letter-spacing="4">
        REPLICATE STYLE MOCK PREVIEW
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function createSilentWav(durationSeconds = 0.75, sampleRate = 22050): Buffer {
  const channels = 1;
  const bitsPerSample = 16;
  const frameCount = Math.max(1, Math.round(durationSeconds * sampleRate));
  const dataSize = frameCount * channels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

export function createMockVoiceLabel(text: string): string {
  const slug = slugify(text.slice(0, 48));
  return slug || createId("voice");
}
