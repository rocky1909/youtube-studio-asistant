import { Buffer } from "node:buffer";

import {
  createMockPipelineStatus,
  createMockProviderSettings,
  generateMockImageAssets,
  generateMockScript,
  generateMockVideoIdeas,
} from "@/lib/ai/mock";
import type {
  ChannelBrief,
  GeneratedAsset,
  GeneratedScript,
  PipelineStatus,
  ProviderSettings,
  ScriptScene,
  VideoIdea,
} from "@/lib/ai/types";
import { createId, slugify } from "@/lib/utils";

type JsonRecord = Record<string, unknown>;

type IdeaDraft = {
  title: string;
  subtitle: string;
  hook: string;
  premise: string;
  whyNow: string;
  audiencePromise: string;
  format: string;
  angle: string;
  thumbnailConcept: string;
  keywords: string[];
};

type ScriptDraft = {
  intro: string;
  outro: string;
  callToAction: string;
  styleGuide: string;
  scenes: Array<{
    title: string;
    kind?: ScriptScene["kind"];
    narration: string;
    onScreenText: string;
    visualDirection: string;
    bRollDirection: string;
    durationSeconds: number;
    emphasis: string;
    notes: string;
  }>;
};

export type ProviderSnapshot = {
  providers: ProviderSettings;
  mode: "mock" | "hybrid" | "live";
};

export type IdeasResult = {
  ideas: VideoIdea[];
  pipeline: PipelineStatus;
  mode: "mock" | "live";
  provider: string;
};

export type ScriptResult = {
  script: GeneratedScript;
  pipeline: PipelineStatus;
  mode: "mock" | "live";
  provider: string;
};

export type ImagesResult = {
  assets: GeneratedAsset[];
  pipeline: PipelineStatus;
  mode: "mock" | "live";
  provider: string;
};

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
const HF_MODEL =
  process.env.HUGGINGFACE_IMAGE_MODEL ?? "black-forest-labs/FLUX.1-schnell";

function nowIso(): string {
  return new Date().toISOString();
}

function coerceBrief(input: JsonRecord): ChannelBrief {
  const timestamp = nowIso();
  return {
    id: String(input.id || createId("brief")),
    channelName: String(input.channelName || "Untitled channel"),
    channelSlug: String(input.channelSlug || slugify(String(input.channelName || "channel"))),
    niche: String(input.niche || "General"),
    description: String(input.description || ""),
    audience: String(input.audience || "General audience"),
    language: String(input.language || "English"),
    region: String(input.region || "Global"),
    tone: String(input.tone || "Clear and cinematic"),
    voice: String(input.voice || "Confident studio narrator"),
    goals: arrayOfStrings(input.goals),
    contentPillars: arrayOfStrings(input.contentPillars),
    differentiators: arrayOfStrings(input.differentiators),
    referenceChannels: arrayOfStrings(input.referenceChannels),
    constraints: arrayOfStrings(input.constraints),
    bannedTopics: arrayOfStrings(input.bannedTopics),
    callToAction: String(input.callToAction || "Subscribe for the next build."),
    targetVideoLengthMinutes: Number(input.targetVideoLengthMinutes || 8),
    publishingCadence: String(input.publishingCadence || "Weekly"),
    thumbnailStyle: String(input.thumbnailStyle || "Bold typography and cinematic contrast"),
    notes: String(input.notes || ""),
    createdAt: String(input.createdAt || timestamp),
    updatedAt: String(input.updatedAt || timestamp),
  };
}

function coerceIdea(input: JsonRecord, brief: ChannelBrief): VideoIdea {
  const timestamp = nowIso();
  return {
    id: String(input.id || createId("idea")),
    briefId: brief.id,
    title: String(input.title || "Untitled idea"),
    subtitle: String(input.subtitle || ""),
    hook: String(input.hook || ""),
    premise: String(input.premise || ""),
    whyNow: String(input.whyNow || ""),
    audiencePromise: String(input.audiencePromise || ""),
    format: String(input.format || "YouTube explainer"),
    angle: String(input.angle || ""),
    thumbnailConcept: String(input.thumbnailConcept || ""),
    keywords: arrayOfStrings(input.keywords),
    tags: arrayOfStrings(input.tags),
    estimatedEffort: Number(input.estimatedEffort || 3),
    expectedImpact: Number(input.expectedImpact || 4),
    confidence: Number(input.confidence || 0.8),
    status: "selected",
    createdAt: String(input.createdAt || timestamp),
    updatedAt: String(input.updatedAt || timestamp),
  };
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function cleanJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  return JSON.parse(cleaned) as T;
}

async function callAnthropicJson<T>(system: string, prompt: string, maxTokens = 3000): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Anthropic key missing");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Anthropic error ${response.status}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  const text = data.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    throw new Error("Anthropic response did not include text content");
  }

  return cleanJson<T>(text);
}

function createSvgPlaceholder(input: {
  title: string;
  subtitle: string;
  ratio: string;
  accent?: string;
}): string {
  const [width, height] =
    input.ratio === "1:1"
      ? [1024, 1024]
      : input.ratio === "9:16"
      ? [1080, 1920]
      : [1280, 720];
  const title = escapeXml(input.title.slice(0, 70));
  const subtitle = escapeXml(input.subtitle.slice(0, 160));
  const accent = input.accent ?? "#ff8c42";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#090b12" />
          <stop offset="52%" stop-color="#11182a" />
          <stop offset="100%" stop-color="#07090d" />
        </linearGradient>
        <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="100%" stop-color="#ffd08a" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <circle cx="${width - width * 0.18}" cy="${height * 0.16}" r="${Math.round(
    Math.min(width, height) * 0.16
  )}" fill="${accent}" opacity="0.18" />
      <rect x="${Math.round(width * 0.06)}" y="${Math.round(
    height * 0.1
  )}" width="${Math.round(width * 0.88)}" height="${Math.round(
    height * 0.8
  )}" rx="32" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
      <rect x="${Math.round(width * 0.1)}" y="${Math.round(
    height * 0.18
  )}" width="${Math.round(width * 0.2)}" height="14" rx="7" fill="url(#accent)" opacity="0.95" />
      <text x="${Math.round(width * 0.1)}" y="${Math.round(
    height * 0.36
  )}" fill="#f8fbff" font-size="${Math.round(width * 0.04)}" font-family="Arial, sans-serif" font-weight="700">
        ${title}
      </text>
      <text x="${Math.round(width * 0.1)}" y="${Math.round(
    height * 0.46
  )}" fill="#b7bfd1" font-size="${Math.round(width * 0.021)}" font-family="Arial, sans-serif">
        ${subtitle}
      </text>
      <text x="${Math.round(width * 0.1)}" y="${Math.round(
    height * 0.84
  )}" fill="#ffd08a" font-size="${Math.round(width * 0.017)}" font-family="Arial, sans-serif" letter-spacing="4">
        YT STUDIO AI  ·  MOCK VISUAL
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

function providerSnapshot(): ProviderSnapshot {
  const settings = createMockProviderSettings();
  const anthropicEnabled = Boolean(process.env.ANTHROPIC_API_KEY);
  const huggingFaceEnabled = Boolean(process.env.HUGGINGFACE_API_KEY);
  const elevenLabsEnabled = Boolean(process.env.ELEVENLABS_API_KEY);

  settings.anthropic.enabled = anthropicEnabled;
  settings.anthropic.status = anthropicEnabled ? "configured" : "missing_key";
  settings.openai.enabled = Boolean(process.env.OPENAI_API_KEY);
  settings.openai.status = settings.openai.enabled ? "configured" : "missing_key";
  settings.google.enabled = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  settings.google.status = settings.google.enabled ? "configured" : "missing_key";
  settings.huggingface.enabled = huggingFaceEnabled;
  settings.huggingface.status = huggingFaceEnabled ? "configured" : "missing_key";
  settings.elevenlabs.enabled = elevenLabsEnabled;
  settings.elevenlabs.status = elevenLabsEnabled ? "configured" : "missing_key";
  settings.browser.enabled = true;
  settings.browser.status = "configured";

  const liveCount = Object.values(settings).filter(
    (provider) => provider.enabled && provider.id !== "browser"
  ).length;

  return {
    providers: settings,
    mode: liveCount === 0 ? "mock" : liveCount >= 2 ? "live" : "hybrid",
  };
}

export function getProviderSnapshot(): ProviderSnapshot {
  return providerSnapshot();
}

export async function generateIdeasServer(input: {
  brief: ChannelBrief;
  count?: number;
}): Promise<IdeasResult> {
  const brief = coerceBrief(input.brief as unknown as JsonRecord);
  const count = Math.max(3, Math.min(8, input.count ?? 5));

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const rawIdeas = await callAnthropicJson<IdeaDraft[]>(
        "You are an elite YouTube strategist. Return strict JSON only.",
        [
          "Generate YouTube video ideas for this channel brief.",
          `Channel: ${brief.channelName}`,
          `Niche: ${brief.niche}`,
          `Audience: ${brief.audience}`,
          `Tone: ${brief.tone}`,
          `Goals: ${brief.goals.join(", ")}`,
          `Topic notes: ${brief.notes || "General agentic workflow video."}`,
          `Return exactly ${count} ideas as a JSON array.`,
          "Each item must include: title, subtitle, hook, premise, whyNow, audiencePromise, format, angle, thumbnailConcept, keywords.",
        ].join("\n")
      );

      const timestamp = nowIso();
      const ideas = rawIdeas.slice(0, count).map((idea, index) =>
        coerceIdea(
          {
            ...idea,
            tags: [brief.niche, ...idea.keywords.slice(0, 3)],
            estimatedEffort: Math.min(5, 2 + (index % 3)),
            expectedImpact: Math.min(5, 4 + (index % 2)),
            confidence: 0.74 + index * 0.03,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          brief
        )
      );

      return {
        ideas,
        pipeline: createMockPipelineStatus({
          brief,
          idea: ideas[0],
          stage: "idea",
          progress: 0.36,
        }),
        mode: "live",
        provider: "anthropic",
      };
    } catch {
      // Fall through to mock mode.
    }
  }

  const ideas = generateMockVideoIdeas(brief, count).map((idea) => ({
    ...idea,
    status: "shortlisted" as const,
  }));

  return {
    ideas,
    pipeline: createMockPipelineStatus({
      brief,
      idea: ideas[0],
      stage: "idea",
      progress: 0.32,
    }),
    mode: "mock",
    provider: "mock",
  };
}

export async function generateScriptServer(input: {
  brief: ChannelBrief;
  idea: VideoIdea;
  sceneCount?: number;
}): Promise<ScriptResult> {
  const brief = coerceBrief(input.brief as unknown as JsonRecord);
  const idea = coerceIdea(input.idea as unknown as JsonRecord, brief);
  const sceneCount = Math.max(4, Math.min(8, input.sceneCount ?? 5));

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const draft = await callAnthropicJson<ScriptDraft>(
        "You write cinematic, concise, production-ready YouTube scripts. Return strict JSON only.",
        [
          `Write a scene-based script for the video idea "${idea.title}".`,
          `Audience: ${brief.audience}`,
          `Tone: ${brief.tone}`,
          `Hook: ${idea.hook}`,
          `Angle: ${idea.angle}`,
          `Premise: ${idea.premise}`,
          `Return ${sceneCount} scenes.`,
          "Each scene must include title, kind, narration, onScreenText, visualDirection, bRollDirection, durationSeconds, emphasis, notes.",
          "Also include intro, outro, callToAction, and styleGuide.",
        ].join("\n"),
        4000
      );

      const timestamp = nowIso();
      const scenes: ScriptScene[] = draft.scenes.slice(0, sceneCount).map((scene, index) => ({
        id: createId("scene"),
        order: index + 1,
        kind: scene.kind ?? (index === 0 ? "hook" : index === sceneCount - 1 ? "cta" : "narration"),
        title: scene.title,
        narration: scene.narration,
        onScreenText: scene.onScreenText,
        visualDirection: scene.visualDirection,
        bRollDirection: scene.bRollDirection,
        durationSeconds: Number(scene.durationSeconds || 55),
        emphasis: scene.emphasis,
        assetIds: [],
        notes: scene.notes,
        status: "succeeded",
        createdAt: timestamp,
        updatedAt: timestamp,
      }));

      const totalDuration = scenes.reduce((total, scene) => total + scene.durationSeconds, 0);
      const script: GeneratedScript = {
        id: createId("script"),
        briefId: brief.id,
        ideaId: idea.id,
        title: idea.title,
        intro: draft.intro,
        outro: draft.outro,
        callToAction: draft.callToAction || brief.callToAction,
        styleGuide: draft.styleGuide || brief.tone,
        estimatedDurationSeconds: totalDuration,
        wordCount: Math.round(totalDuration * 2.15),
        scenes,
        status: "succeeded",
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      return {
        script,
        pipeline: createMockPipelineStatus({
          brief,
          idea,
          script,
          stage: "script",
          progress: 0.58,
        }),
        mode: "live",
        provider: "anthropic",
      };
    } catch {
      // Fall through to mock mode.
    }
  }

  const script = generateMockScript({ brief, idea, sceneCount });
  return {
    script,
    pipeline: createMockPipelineStatus({
      brief,
      idea,
      script,
      stage: "script",
      progress: 0.55,
    }),
    mode: "mock",
    provider: "mock",
  };
}

async function huggingFaceImage(prompt: string): Promise<string> {
  const key = process.env.HUGGINGFACE_API_KEY;
  if (!key) {
    throw new Error("Hugging Face key missing");
  }

  const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        num_inference_steps: 4,
        guidance_scale: 0,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Hugging Face error ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export async function generateImagesServer(input: {
  brief: ChannelBrief;
  idea: VideoIdea;
  script: GeneratedScript;
  prompts?: Record<string, string>;
  aspectRatio?: string;
}): Promise<ImagesResult> {
  const brief = coerceBrief(input.brief as unknown as JsonRecord);
  const idea = coerceIdea(input.idea as unknown as JsonRecord, brief);
  const script = input.script;
  const prompts = input.prompts ?? {};
  const aspectRatio = input.aspectRatio || "16:9";

  const baseAssets = generateMockImageAssets({
    brief,
    idea,
    script,
    count: script.scenes.length,
  });

  const assets: GeneratedAsset[] = await Promise.all(
    baseAssets.map(async (asset, index): Promise<GeneratedAsset> => {
      const scene = script.scenes[index];
      const prompt = prompts[scene.id] || `${scene.visualDirection}. ${scene.bRollDirection}`;
      const accent = index % 2 === 0 ? "#ff8c42" : "#5ce08d";

      if (process.env.HUGGINGFACE_API_KEY) {
        try {
          return {
            ...asset,
            prompt,
            provider: "huggingface" as const,
            aspectRatio,
            url: await huggingFaceImage(prompt),
            status: "generated" as const,
            metadata: {
              ...asset.metadata,
              live: true,
              model: HF_MODEL,
            },
          };
        } catch {
          // Fall through to mock placeholder below.
        }
      }

      return {
        ...asset,
        prompt,
        provider: "browser" as const,
        aspectRatio,
        url: createSvgPlaceholder({
          title: scene.title,
          subtitle: prompt,
          ratio: aspectRatio,
          accent,
        }),
        status: "generated" as const,
        metadata: {
          ...asset.metadata,
          live: false,
          ratio: aspectRatio,
        },
      };
    })
  );

  return {
    assets,
    pipeline: createMockPipelineStatus({
      brief,
      idea,
      script,
      stage: "assets",
      progress: 0.78,
    }),
    mode: process.env.HUGGINGFACE_API_KEY ? "live" : "mock",
    provider: process.env.HUGGINGFACE_API_KEY ? "huggingface" : "mock",
  };
}
