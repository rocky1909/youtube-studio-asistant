import { Buffer } from "node:buffer";

import { createId } from "@/lib/utils";

import {
  clampNumber,
  createSilentWav,
  createSvgPoster,
  dimensionsForAspectRatio,
  normalizeAspectRatio,
  toNumber,
  toOptionalString,
  toSafeString,
} from "./mock";
import type {
  MediaAsset,
  MediaGenerationRequest,
  MediaKind,
  VoiceRequestBody,
  VoiceResponse,
  VoiceSettings,
} from "./types";

type ReplicatePrediction = {
  id: string;
  status: string;
  output?: string | string[] | Record<string, unknown> | null;
  error?: string | null;
  logs?: string | null;
  urls?: {
    get?: string;
    cancel?: string;
  };
};

type ResolvedVideoInput = {
  kind: MediaKind;
  prompt: string;
  negativePrompt: string | null;
  aspectRatio: string;
  width: number;
  height: number;
  seed: number | null;
  model: string | null;
  extraInput: Record<string, unknown>;
  maxWaitMs: number;
};

function jsonHeaders(token: string, contentType = "application/json"): HeadersInit {
  return {
    Authorization: `Token ${token}`,
    "Content-Type": contentType,
  };
}

function resolveVoiceSettings(settings: VoiceSettings | null | undefined): VoiceSettings {
  const voiceSettings = settings ?? {};
  return {
    stability: clampNumber(toNumber(voiceSettings.stability, 0.45), 0, 1),
    similarityBoost: clampNumber(toNumber(voiceSettings.similarityBoost, 0.8), 0, 1),
    style: clampNumber(toNumber(voiceSettings.style, 0), 0, 1),
    useSpeakerBoost: Boolean(voiceSettings.useSpeakerBoost),
  };
}

function normalizeVoiceRequest(body: VoiceRequestBody): {
  text: string;
  voiceId: string;
  modelId: string | null;
  outputFormat: string;
  voiceSettings: VoiceSettings;
} {
  const text = toSafeString(body.text, "");
  const voiceId = toSafeString(body.voiceId, process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM");
  const modelId = toOptionalString(body.modelId) ?? process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
  const outputFormat = toSafeString(body.outputFormat, "mp3_44100_128");

  return {
    text,
    voiceId,
    modelId,
    outputFormat,
    voiceSettings: resolveVoiceSettings(body.voiceSettings),
  };
}

export async function generateVoiceData(input: VoiceRequestBody): Promise<VoiceResponse> {
  const normalized = normalizeVoiceRequest(input);
  if (!normalized.text) {
    throw new Error("Missing text for voice generation.");
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    const silentWav = createSilentWav();
    return {
      provider: "mock",
      mode: "mock",
      text: normalized.text,
      voiceId: normalized.voiceId,
      modelId: normalized.modelId,
      mimeType: "audio/wav",
      audio: {
        bytes: silentWav.length,
        base64: silentWav.toString("base64"),
        dataUrl: `data:audio/wav;base64,${silentWav.toString("base64")}`,
      },
      fallbackReason: "ELEVENLABS_API_KEY is missing.",
    };
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(normalized.voiceId)}?output_format=${encodeURIComponent(normalized.outputFormat)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: normalized.text,
        model_id: normalized.modelId,
        voice_settings: normalized.voiceSettings,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs error ${response.status}`);
  }

  const mimeType = response.headers.get("content-type") ?? "audio/mpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    provider: "elevenlabs",
    mode: "live",
    text: normalized.text,
    voiceId: normalized.voiceId,
    modelId: normalized.modelId,
    mimeType,
    audio: {
      bytes: buffer.length,
      base64: buffer.toString("base64"),
      dataUrl: `data:${mimeType};base64,${buffer.toString("base64")}`,
    },
  };
}

function resolveReplicateModel(kind: MediaKind, modelOverride?: string | null): string | null {
  if (modelOverride) {
    return modelOverride;
  }

  if (kind === "image") {
    return process.env.REPLICATE_IMAGE_MODEL ?? process.env.REPLICATE_MODEL ?? null;
  }

  return process.env.REPLICATE_VIDEO_MODEL ?? process.env.REPLICATE_MODEL ?? null;
}

function normalizeMediaRequest(input: MediaGenerationRequest): ResolvedVideoInput {
  const kind = input.kind === "image" ? "image" : "video";
  const prompt = toSafeString(input.prompt, "");
  const negativePrompt = toOptionalString(input.negativePrompt);
  const aspectRatio = normalizeAspectRatio(input.aspectRatio, kind === "video" ? "16:9" : "1:1");
  const dims = dimensionsForAspectRatio(aspectRatio, kind === "video" ? { width: 1280, height: 720 } : { width: 1024, height: 1024 });
  const width = Math.max(1, Math.round(toNumber(input.width, dims.width)));
  const height = Math.max(1, Math.round(toNumber(input.height, dims.height)));
  const seedValue = input.seed === undefined || input.seed === null ? null : Math.round(toNumber(input.seed, 0));
  const extraInput = input.input ?? {};
  const model = resolveReplicateModel(kind, toOptionalString(input.model));
  const maxWaitMs = clampNumber(toNumber(input.maxWaitMs, 12000), 1000, 30000);

  return {
    kind,
    prompt,
    negativePrompt,
    aspectRatio,
    width,
    height,
    seed: seedValue,
    model,
    extraInput,
    maxWaitMs,
  };
}

async function fetchReplicatePrediction(
  token: string,
  model: string,
  prompt: string,
  kind: MediaKind,
  request: ResolvedVideoInput
): Promise<ReplicatePrediction> {
  const input: Record<string, unknown> = {
    prompt,
    ...request.extraInput,
    width: request.width,
    height: request.height,
    aspect_ratio: request.aspectRatio,
  };

  if (request.negativePrompt) {
    input.negative_prompt = request.negativePrompt;
  }

  if (request.seed !== null) {
    input.seed = request.seed;
  }

  if (kind === "video") {
    input.duration = input.duration ?? 4;
  }

  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      model,
      input,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Replicate error ${response.status}${message ? `: ${message}` : ""}`);
  }

  return (await response.json()) as ReplicatePrediction;
}

async function pollReplicatePrediction(token: string, prediction: ReplicatePrediction, maxWaitMs: number): Promise<ReplicatePrediction> {
  const pollUrl = prediction.urls?.get || `https://api.replicate.com/v1/predictions/${prediction.id}`;
  const started = Date.now();
  let latest = prediction;

  while (Date.now() - started < maxWaitMs) {
    if (["succeeded", "failed", "canceled"].includes(latest.status)) {
      return latest;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const response = await fetch(pollUrl, {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      break;
    }

    latest = (await response.json()) as ReplicatePrediction;
  }

  return latest;
}

function flattenPredictionOutput(output: ReplicatePrediction["output"]): string[] {
  if (!output) {
    return [];
  }

  if (typeof output === "string") {
    return [output];
  }

  if (Array.isArray(output)) {
    return output
      .flatMap((item) => {
        if (typeof item === "string") return [item];
        if (item && typeof item === "object") return flattenPredictionOutput(item as ReplicatePrediction["output"]);
        return [];
      })
      .filter(Boolean);
  }

  if (typeof output === "object") {
    return Object.values(output)
      .flatMap((value) => {
        if (typeof value === "string") return [value];
        if (Array.isArray(value) || (value && typeof value === "object")) {
          return flattenPredictionOutput(value as ReplicatePrediction["output"]);
        }
        return [];
      })
      .filter(Boolean);
  }

  return [];
}

function createMockMediaAsset(input: ResolvedVideoInput): MediaAsset {
  const dimensions = { width: input.width, height: input.height };
  const subtitle = input.negativePrompt ? `Negative: ${input.negativePrompt}` : input.prompt;
  const poster = createSvgPoster({
    title: input.kind === "video" ? "Video preview" : "Image preview",
    subtitle,
    width: dimensions.width,
    height: dimensions.height,
    accent: input.kind === "video" ? "#6ee7ff" : "#ff8c42",
  });

  return {
    id: createId("media"),
    kind: input.kind,
    provider: "mock",
    mode: "mock",
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    model: input.model,
    status: "succeeded",
    media: {
      url: poster,
      mimeType: "image/svg+xml",
      previewUrl: poster,
      width: dimensions.width,
      height: dimensions.height,
    },
    fallbackReason: input.model ? "Replicate token missing." : "No Replicate model configured.",
  };
}

function createLiveMediaAsset(input: ResolvedVideoInput, prediction: ReplicatePrediction): MediaAsset {
  const outputs = flattenPredictionOutput(prediction.output);
  const primaryUrl = outputs[0] ?? "";
  const previewUrl = outputs[1];
  const mimeType = input.kind === "video" ? "video/mp4" : "image/png";

  return {
    id: createId("media"),
    kind: input.kind,
    provider: "replicate",
    mode: "live",
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    model: input.model,
    status: prediction.status === "processing" || prediction.status === "starting" ? "processing" : "succeeded",
    media: {
      url: primaryUrl,
      mimeType,
      previewUrl,
      width: input.width,
      height: input.height,
    },
    prediction: {
      id: prediction.id,
      status: prediction.status,
      pollUrl: prediction.urls?.get,
      logs: prediction.logs ?? undefined,
      output: outputs,
    },
  };
}

export async function generateMediaAssets(input: MediaGenerationRequest): Promise<{ provider: "replicate" | "mock"; mode: "live" | "mock"; kind: MediaKind; assets: MediaAsset[] }> {
  const request = normalizeMediaRequest(input);

  if (!request.prompt) {
    throw new Error("Missing prompt for media generation.");
  }

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token || !request.model) {
    return {
      provider: "mock",
      mode: "mock",
      kind: request.kind,
      assets: [createMockMediaAsset(request)],
    };
  }

  try {
    const prediction = await fetchReplicatePrediction(token, request.model, request.prompt, request.kind, request);
    const latest = prediction.status === "succeeded" || prediction.status === "failed" || prediction.status === "canceled"
      ? prediction
      : await pollReplicatePrediction(token, prediction, request.maxWaitMs);

    if (latest.status === "succeeded") {
      return {
        provider: "replicate",
        mode: "live",
        kind: request.kind,
        assets: [createLiveMediaAsset(request, latest)],
      };
    }

    if (latest.status === "processing" || latest.status === "starting") {
      return {
        provider: "replicate",
        mode: "live",
        kind: request.kind,
        assets: [
          {
            id: createId("media"),
            kind: request.kind,
            provider: "replicate",
            mode: "live",
            prompt: request.prompt,
            negativePrompt: request.negativePrompt,
            model: request.model,
            status: "processing",
            media: {
              url: "",
              mimeType: request.kind === "video" ? "video/mp4" : "image/png",
              previewUrl: createSvgPoster({
                title: `${request.kind === "video" ? "Video" : "Image"} pending`,
                subtitle: request.prompt,
                width: request.width,
                height: request.height,
                accent: request.kind === "video" ? "#6ee7ff" : "#ff8c42",
              }),
              width: request.width,
              height: request.height,
            },
            prediction: {
              id: latest.id,
              status: latest.status,
              pollUrl: latest.urls?.get,
              logs: latest.logs ?? undefined,
            },
          },
        ],
      };
    }

    return {
      provider: "replicate",
      mode: "live",
      kind: request.kind,
      assets: [
        {
          id: createId("media"),
          kind: request.kind,
          provider: "replicate",
          mode: "live",
          prompt: request.prompt,
          negativePrompt: request.negativePrompt,
          model: request.model,
          status: "failed",
          media: {
            url: "",
            mimeType: request.kind === "video" ? "video/mp4" : "image/png",
            previewUrl: createSvgPoster({
              title: `${request.kind === "video" ? "Video" : "Image"} failed`,
              subtitle: latest.error || latest.status,
              width: request.width,
              height: request.height,
              accent: "#ff5f5f",
            }),
            width: request.width,
            height: request.height,
          },
          prediction: {
            id: latest.id,
            status: latest.status,
            pollUrl: latest.urls?.get,
            logs: latest.logs ?? undefined,
          },
          fallbackReason: latest.error || `Replicate status ${latest.status}`,
        },
      ],
    };
  } catch (error) {
    return {
      provider: "mock",
      mode: "mock",
      kind: request.kind,
      assets: [
        {
          ...createMockMediaAsset(request),
          fallbackReason: error instanceof Error ? error.message : "Replicate generation failed.",
        },
      ],
    };
  }
}
