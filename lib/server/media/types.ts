export type MediaMode = "live" | "mock";

export type MediaKind = "image" | "video";

export type VoiceSettings = {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
};

export type VoiceRequestBody = {
  text?: unknown;
  voiceId?: unknown;
  modelId?: unknown;
  voiceSettings?: VoiceSettings | null;
  outputFormat?: unknown;
  maxChars?: unknown;
};

export type VoiceResponse = {
  provider: "elevenlabs" | "mock";
  mode: MediaMode;
  text: string;
  voiceId: string;
  modelId: string | null;
  mimeType: string;
  audio: {
    bytes: number;
    base64: string;
    dataUrl: string;
  };
  fallbackReason?: string;
};

export type MediaGenerationRequest = {
  kind?: unknown;
  prompt?: unknown;
  negativePrompt?: unknown;
  aspectRatio?: unknown;
  width?: unknown;
  height?: unknown;
  seed?: unknown;
  model?: unknown;
  input?: Record<string, unknown> | null;
  maxWaitMs?: unknown;
};

export type MediaAsset = {
  id: string;
  kind: MediaKind;
  provider: "replicate" | "mock";
  mode: MediaMode;
  prompt: string;
  negativePrompt: string | null;
  model: string | null;
  status: "succeeded" | "processing" | "failed";
  media: {
    url: string;
    mimeType: string;
    previewUrl?: string;
    width: number;
    height: number;
  };
  prediction?: {
    id?: string;
    status?: string;
    pollUrl?: string;
    logs?: string;
    output?: string[];
  };
  fallbackReason?: string;
};

export type MediaGenerationResponse = {
  provider: "replicate" | "mock";
  mode: MediaMode;
  kind: MediaKind;
  assets: MediaAsset[];
};

