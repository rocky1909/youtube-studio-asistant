export type ProviderId =
  | "openai"
  | "anthropic"
  | "google"
  | "huggingface"
  | "elevenlabs"
  | "browser";

export type PipelineStage =
  | "brief"
  | "research"
  | "idea"
  | "outline"
  | "script"
  | "assets"
  | "voice"
  | "edit"
  | "publish";

export type PipelineState =
  | "idle"
  | "queued"
  | "running"
  | "waiting"
  | "succeeded"
  | "failed"
  | "cancelled";

export type IdeaStatus =
  | "draft"
  | "shortlisted"
  | "selected"
  | "in_production"
  | "published"
  | "archived";

export type ScriptSceneKind =
  | "hook"
  | "setup"
  | "narration"
  | "broll"
  | "example"
  | "transition"
  | "cta";

export type AssetKind =
  | "thumbnail"
  | "image"
  | "scene_card"
  | "overlay"
  | "caption"
  | "voiceover";

export type AssetStatus = "queued" | "generated" | "selected" | "archived" | "failed";

export type ActivityKind =
  | "brief_created"
  | "idea_created"
  | "idea_selected"
  | "script_generated"
  | "asset_generated"
  | "review_requested"
  | "review_completed"
  | "publish_scheduled"
  | "published"
  | "status_updated";

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface ChannelBrief extends Timestamped {
  id: string;
  channelName: string;
  channelSlug: string;
  niche: string;
  description: string;
  audience: string;
  language: string;
  region: string;
  tone: string;
  voice: string;
  goals: string[];
  contentPillars: string[];
  differentiators: string[];
  referenceChannels: string[];
  constraints: string[];
  bannedTopics: string[];
  callToAction: string;
  targetVideoLengthMinutes: number;
  publishingCadence: string;
  thumbnailStyle: string;
  notes: string;
}

export interface VideoIdea extends Timestamped {
  id: string;
  briefId: string;
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
  tags: string[];
  estimatedEffort: number;
  expectedImpact: number;
  confidence: number;
  status: IdeaStatus;
}

export interface ScriptScene extends Timestamped {
  id: string;
  order: number;
  kind: ScriptSceneKind;
  title: string;
  narration: string;
  onScreenText: string;
  visualDirection: string;
  bRollDirection: string;
  durationSeconds: number;
  emphasis: string;
  assetIds: string[];
  notes: string;
  status: PipelineState;
}

export interface GeneratedScript extends Timestamped {
  id: string;
  briefId: string;
  ideaId: string;
  title: string;
  intro: string;
  outro: string;
  callToAction: string;
  styleGuide: string;
  estimatedDurationSeconds: number;
  wordCount: number;
  scenes: ScriptScene[];
  status: PipelineState;
}

export interface GeneratedAsset extends Timestamped {
  id: string;
  briefId: string;
  ideaId: string;
  scriptId: string;
  sceneId?: string;
  kind: AssetKind;
  title: string;
  prompt: string;
  altText: string;
  provider: ProviderId;
  url: string;
  fileName: string;
  width: number;
  height: number;
  aspectRatio: string;
  status: AssetStatus;
  tags: string[];
  metadata: Record<string, string | number | boolean>;
}

export interface PipelineStep {
  stage: PipelineStage;
  label: string;
  status: PipelineState;
  progress: number;
  detail: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface PipelineStatus extends Timestamped {
  id: string;
  briefId: string;
  ideaId?: string;
  scriptId?: string;
  stage: PipelineStage;
  status: PipelineState;
  progress: number;
  headline: string;
  detail: string;
  steps: PipelineStep[];
}

export interface ProviderSetting {
  id: ProviderId;
  name: string;
  enabled: boolean;
  status: "configured" | "missing_key" | "disabled" | "error";
  apiKeyEnvVar?: string;
  model?: string;
  baseUrl?: string;
  supportsChat: boolean;
  supportsImages: boolean;
  supportsAudio: boolean;
  notes: string;
}

export type ProviderSettings = Record<ProviderId, ProviderSetting>;

export interface TeamActivity extends Timestamped {
  id: string;
  kind: ActivityKind;
  actor: string;
  actorRole: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: "brief" | "idea" | "script" | "asset" | "pipeline";
  status?: PipelineState;
}
