import { createId, slugify } from "../utils";
import type {
  AssetKind,
  AssetStatus,
  ChannelBrief,
  GeneratedAsset,
  GeneratedScript,
  IdeaStatus,
  PipelineStage,
  PipelineState,
  PipelineStatus,
  ProviderId,
  ProviderSetting,
  ProviderSettings,
  ScriptScene,
  ScriptSceneKind,
  TeamActivity,
  VideoIdea,
} from "./types";

const now = () => new Date();

const toIso = (value: Date): string => value.toISOString();

const sample = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

const sampleMany = <T,>(items: readonly T[], count: number): T[] => {
  const pool = [...items];
  const picked: T[] = [];

  while (pool.length > 0 && picked.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    const [item] = pool.splice(index, 1);
    picked.push(item);
  }

  return picked;
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const buildBaseBrief = (): Omit<ChannelBrief, "createdAt" | "updatedAt"> => ({
  id: createId("brief"),
  channelName: "Agentic YouTube Studio",
  channelSlug: "agentic-youtube-studio",
  niche: "AI-assisted creator workflows",
  description:
    "A practical, founder-friendly channel about building videos with agentic workflows, local tools, and lightweight automation.",
  audience:
    "Solo creators, small teams, and product builders who want to ship more high-quality videos with less friction.",
  language: "English",
  region: "Global",
  tone: "clear, strategic, optimistic, and practical",
  voice: "experienced teammate who explains the how and why without jargon",
  goals: [
    "Attract creators who want a faster content pipeline",
    "Showcase agentic tooling in a real production workflow",
    "Create reusable assets for scripting, narration, and thumbnails",
  ],
  contentPillars: [
    "workflow breakdowns",
    "automation tutorials",
    "creator tooling demos",
    "content strategy",
    "AI production experiments",
  ],
  differentiators: [
    "browser-first and keyless where possible",
    "focused on end-to-end shipping rather than isolated prompts",
    "designed for real creator operations, not just demos",
  ],
  referenceChannels: ["ali abdaal", "lex fridman", "future tools", "coldfusion"],
  constraints: [
    "keep explanations concrete",
    "avoid hype-only claims",
    "prefer reusable structures over one-off stunts",
  ],
  bannedTopics: ["deep politics", "medical claims", "financial advice"],
  callToAction: "Subscribe for more agentic creator workflows and practical AI production systems.",
  targetVideoLengthMinutes: 8,
  publishingCadence: "2 videos per week",
  thumbnailStyle: "bold typography, high-contrast shapes, clean creator-studio aesthetic",
  notes: "Mock data only. Safe to use when no API keys are configured.",
});

export function createMockChannelBrief(
  overrides: Partial<ChannelBrief> = {}
): ChannelBrief {
  const timestamp = toIso(now());
  return {
    ...buildBaseBrief(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

const ideaAngles = [
  {
    title: "Build a Video Idea Engine in 30 Minutes",
    subtitle: "A lightweight system for turning one brief into many strong angles",
    hook: "What if one channel brief could produce an entire month of video ideas?",
    premise:
      "Show how to turn a single brief into a repeatable idea pipeline using structured inputs and a mock AI layer.",
    whyNow: "Creators are trying to publish more without multiplying their planning overhead.",
    audiencePromise: "You will leave with a reusable idea system, not just one prompt.",
    format: "screen-recorded workflow walkthrough",
    angle: "show the architecture and the output together",
    thumbnailConcept: "one brief -> many ideas, with a visible pipeline diagram",
    keywords: ["idea generation", "content planning", "workflow", "mock AI"],
  },
  {
    title: "From Rough Brief to Publish-Ready Script",
    subtitle: "A creator workflow that keeps the message intact while speeding up drafting",
    hook: "The fastest way to write a script is not to start with a blank page.",
    premise:
      "Demonstrate how a brief becomes an outline, then a scene-by-scene script with asset notes and production cues.",
    whyNow: "Teams need a structure that works whether AI is available or not.",
    audiencePromise: "You will see a script pipeline that remains editable by humans at every step.",
    format: "narrated build video",
    angle: "focus on the handoff between strategy and drafting",
    thumbnailConcept: "brief to script with highlighted scenes and callouts",
    keywords: ["script writing", "creator ops", "content pipeline", "scene planning"],
  },
  {
    title: "The Offline AI Stack for YouTube Creators",
    subtitle: "Use browser tools and mocks first, then swap in APIs later",
    hook: "You do not need API keys to prove the workflow works.",
    premise:
      "Walk through a local-first setup that lets a creator team plan, script, and package assets before connecting paid providers.",
    whyNow: "Many teams want to validate the process before committing to more tooling.",
    audiencePromise: "You will understand how to build a resilient starter stack.",
    format: "founder-style explainer",
    angle: "offline-first architecture for quick validation",
    thumbnailConcept: "no API keys required, with a clean local pipeline",
    keywords: ["offline workflow", "browser TTS", "local first", "AI stack"],
  },
];

const effortLevels = [2, 3, 4, 5];
const impactLevels = [3, 4, 5];
const confidenceLevels = [0.68, 0.74, 0.81, 0.88, 0.93];
const statuses: IdeaStatus[] = ["draft", "shortlisted", "selected", "in_production", "published"];

export function generateMockVideoIdeas(
  brief: ChannelBrief,
  count = 5
): VideoIdea[] {
  const baseIdeas = [...ideaAngles];
  const ideas: VideoIdea[] = [];
  const timestamp = toIso(now());

  for (let index = 0; index < count; index += 1) {
    const seed = sample(baseIdeas);
    const titleSuffix = index === 0 ? "" : ` ${index + 1}`;
    ideas.push({
      id: createId("idea"),
      briefId: brief.id,
      title: `${seed.title}${titleSuffix}`,
      subtitle: seed.subtitle,
      hook: seed.hook,
      premise: seed.premise,
      whyNow: seed.whyNow,
      audiencePromise: seed.audiencePromise,
      format: seed.format,
      angle: seed.angle,
      thumbnailConcept: seed.thumbnailConcept,
      keywords: seed.keywords,
      tags: [...brief.contentPillars.slice(0, 3), slugify(seed.title), brief.niche],
      estimatedEffort: sample(effortLevels),
      expectedImpact: sample(impactLevels),
      confidence: sample(confidenceLevels),
      status: sample(statuses),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  return ideas;
}

const sceneKinds: ScriptSceneKind[] = [
  "hook",
  "setup",
  "narration",
  "broll",
  "example",
  "transition",
  "cta",
];

const sceneTemplates = [
  {
    title: "Open with the core promise",
    narration: "Today we are turning one channel brief into a reusable content engine.",
    visualDirection: "Fast title card, then the workflow board snapping into view.",
    bRollDirection: "brief document, cursor movement, UI callouts",
    onScreenText: "One brief. Many outputs.",
    emphasis: "clarity",
    notes: "Set the outcome early so viewers know what they are learning.",
  },
  {
    title: "Show the input structure",
    narration: "The brief includes audience, tone, goals, and the guardrails that keep the output useful.",
    visualDirection: "Highlight the brief fields one by one in a calm walkthrough.",
    bRollDirection: "form fields, notes panel, typed examples",
    onScreenText: "Audience + tone + constraints",
    emphasis: "structure",
    notes: "Keep the screen readable and avoid over-animating the form.",
  },
  {
    title: "Generate and compare ideas",
    narration: "The mock layer gives us several ideas without needing API keys, so we can test the pipeline immediately.",
    visualDirection: "Animate idea cards sliding into a shortlist column.",
    bRollDirection: "idea cards, shortlist, score badges",
    onScreenText: "Mock first, API later",
    emphasis: "momentum",
    notes: "Use this beat to show practical resilience.",
  },
  {
    title: "Expand the chosen angle",
    narration: "Once the idea is selected, we turn it into scenes that define narration, visual direction, and pacing.",
    visualDirection: "Scene timeline with three to five blocks and icons.",
    bRollDirection: "timeline, annotations, beat markers",
    onScreenText: "Script by scenes",
    emphasis: "translation",
    notes: "Bridge strategy and production.",
  },
  {
    title: "Package assets for production",
    narration: "Each scene can produce thumbnails, cutaway images, and overlays that make editing faster.",
    visualDirection: "Asset grid, thumbnail mockups, and scene cards together.",
    bRollDirection: "image variations, thumbnail comps, export panel",
    onScreenText: "Ready for edit",
    emphasis: "completion",
    notes: "Show how assets connect back to the script.",
  },
];

export function generateMockScript(input: {
  brief: ChannelBrief;
  idea: VideoIdea;
  sceneCount?: number;
}): GeneratedScript {
  const { brief, idea } = input;
  const sceneCount = Math.max(4, Math.min(8, input.sceneCount ?? 5));
  const timestamp = toIso(now());
  const uniqueTemplates = sampleMany(sceneTemplates, Math.min(sceneCount, sceneTemplates.length));
  const selectedTemplates = Array.from({ length: sceneCount }, (_, index) =>
    uniqueTemplates[index % uniqueTemplates.length]!
  );
  const scenes: ScriptScene[] = selectedTemplates.map((template, index) => {
    const kind = sceneKinds[Math.min(index, sceneKinds.length - 1)];
    return {
      id: createId("scene"),
      order: index + 1,
      kind,
      title: template.title,
      narration: template.narration,
      onScreenText: template.onScreenText,
      visualDirection: template.visualDirection,
      bRollDirection: template.bRollDirection,
      durationSeconds: index === 0 ? 45 : 60 + index * 8,
      emphasis: template.emphasis,
      assetIds: [],
      notes: template.notes,
      status: "succeeded",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });

  const totalDurationSeconds = scenes.reduce((total, scene) => total + scene.durationSeconds, 0);

  return {
    id: createId("script"),
    briefId: brief.id,
    ideaId: idea.id,
    title: idea.title,
    intro: idea.hook,
    outro: `${brief.callToAction} Thanks for watching.`,
    callToAction: brief.callToAction,
    styleGuide: brief.tone,
    estimatedDurationSeconds: totalDurationSeconds,
    wordCount: Math.round(totalDurationSeconds * 2.2),
    scenes,
    status: "succeeded",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const assetKinds: AssetKind[] = [
  "thumbnail",
  "image",
  "scene_card",
  "overlay",
  "caption",
];

const providers: ProviderId[] = [
  "browser",
  "openai",
  "anthropic",
  "google",
  "huggingface",
  "elevenlabs",
];

export function generateMockImageAssets(input: {
  brief: ChannelBrief;
  idea: VideoIdea;
  script: GeneratedScript;
  count?: number;
}): GeneratedAsset[] {
  const { brief, idea, script } = input;
  const count = Math.max(1, Math.min(6, input.count ?? 3));
  const timestamp = toIso(now());
  const selectedScenes = Array.from({ length: count }, (_, index) => {
    const scene = script.scenes[index % script.scenes.length]!;
    return scene;
  });

  return selectedScenes.map((scene, index) => {
    const kind = assetKinds[Math.min(index, assetKinds.length - 1)];
    const aspectRatio = kind === "thumbnail" ? "16:9" : "1:1";
    const width = kind === "thumbnail" ? 1280 : 1024;
    const height = kind === "thumbnail" ? 720 : 1024;
    const fileName = `${slugify(brief.channelName)}-${slugify(idea.title)}-${scene.order}-${kind}.png`;

    return {
      id: createId("asset"),
      briefId: brief.id,
      ideaId: idea.id,
      scriptId: script.id,
      sceneId: scene.id,
      kind,
      title: `${kind} for scene ${scene.order}`,
      prompt: [
        brief.thumbnailStyle,
        idea.thumbnailConcept,
        scene.visualDirection,
        "clean composition",
        "high contrast",
      ].join(", "),
      altText: `${kind} asset for ${idea.title}`,
      provider: sample(providers),
      url: `https://placehold.co/${width}x${height}/111827/F9FAFB?text=${encodeURIComponent(
        kind.toUpperCase()
      )}`,
      fileName,
      width,
      height,
      aspectRatio,
      status: sample<AssetStatus>(["queued", "generated", "selected"]),
      tags: [brief.niche, idea.format, scene.kind, kind],
      metadata: {
        sceneOrder: scene.order,
        durationSeconds: scene.durationSeconds,
        promptLength: 5,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
}

const teamMembers = [
  { name: "Ava", role: "Producer" },
  { name: "Noah", role: "Editor" },
  { name: "Maya", role: "Researcher" },
  { name: "Leo", role: "Designer" },
  { name: "Iris", role: "Ops" },
];

const activityTemplates = [
  {
    kind: "brief_created" as const,
    title: "Brief was refreshed",
    message: "The channel brief was updated to reflect the latest content direction.",
  },
  {
    kind: "idea_created" as const,
    title: "New ideas generated",
    message: "Mock idea generation produced a fresh batch of angles for the editorial shortlist.",
  },
  {
    kind: "script_generated" as const,
    title: "Script draft is ready",
    message: "The selected idea has been expanded into a scene-based draft with production notes.",
  },
  {
    kind: "asset_generated" as const,
    title: "Assets were queued",
    message: "Image assets were created for the script scenes and thumbnail concepts.",
  },
  {
    kind: "review_completed" as const,
    title: "Review passed",
    message: "The draft looks clear, practical, and aligned with the channel voice.",
  },
  {
    kind: "published" as const,
    title: "Video published",
    message: "The workflow finished and the final package was sent to publish.",
  },
];

export function generateMockTeamActivity(count = 6): TeamActivity[] {
  const timestamp = now();

  return Array.from({ length: count }, (_, index) => {
    const template = sample(activityTemplates);
    const actor = sample(teamMembers);
    const createdAt = new Date(timestamp.getTime() - index * 1000 * 60 * 18);
    return {
      id: createId("activity"),
      kind: template.kind,
      actor: actor.name,
      actorRole: actor.role,
      title: template.title,
      message: template.message,
      relatedId: createId("item"),
      relatedType: sample(["brief", "idea", "script", "asset", "pipeline"] as const),
      status: sample(["running", "succeeded", "waiting", "queued"] as const),
      createdAt: toIso(createdAt),
      updatedAt: toIso(createdAt),
    };
  });
}

const stageLabels: Record<PipelineStage, string> = {
  brief: "Brief",
  research: "Research",
  idea: "Idea generation",
  outline: "Outline",
  script: "Script",
  assets: "Assets",
  voice: "Voice",
  edit: "Edit",
  publish: "Publish",
};

const stageOrder: PipelineStage[] = [
  "brief",
  "research",
  "idea",
  "outline",
  "script",
  "assets",
  "voice",
  "edit",
  "publish",
];

export function createMockPipelineStatus(input: {
  brief: ChannelBrief;
  idea?: VideoIdea;
  script?: GeneratedScript;
  stage?: PipelineStage;
  progress?: number;
}): PipelineStatus {
  const timestamp = toIso(now());
  const stage = input.stage ?? (input.script ? "assets" : input.idea ? "script" : "idea");
  const currentIndex = stageOrder.indexOf(stage);

  return {
    id: createId("pipeline"),
    briefId: input.brief.id,
    ideaId: input.idea?.id,
    scriptId: input.script?.id,
    stage,
    status: "running",
    progress: input.progress ?? clamp01((currentIndex + 1) / stageOrder.length),
    headline: `${stageLabels[stage]} in progress`,
    detail: input.script
      ? `Working on ${input.script.title} and keeping the flow mock-friendly.`
      : "Generating a production-ready path from the channel brief.",
    steps: stageOrder.map((step, index) => ({
      stage: step,
      label: stageLabels[step],
      status: index < currentIndex ? "succeeded" : index === currentIndex ? "running" : "queued",
      progress: index < currentIndex ? 1 : index === currentIndex ? 0.6 : 0,
      detail: `${stageLabels[step]} step`,
      startedAt: index <= currentIndex ? timestamp : undefined,
      finishedAt: index < currentIndex ? timestamp : undefined,
    })),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

const providerSpecs: Array<Pick<ProviderSetting, "id" | "name" | "apiKeyEnvVar" | "model" | "baseUrl" | "supportsChat" | "supportsImages" | "supportsAudio" | "notes">> = [
  {
    id: "openai",
    name: "OpenAI",
    apiKeyEnvVar: "OPENAI_API_KEY",
    model: "gpt-4.1",
    baseUrl: "https://api.openai.com/v1",
    supportsChat: true,
    supportsImages: true,
    supportsAudio: true,
    notes: "Optional provider. Works when the key is present.",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    model: "claude-sonnet-4",
    baseUrl: "https://api.anthropic.com",
    supportsChat: true,
    supportsImages: false,
    supportsAudio: false,
    notes: "Optional provider for text-heavy drafting and analysis.",
  },
  {
    id: "google",
    name: "Google Gemini",
    apiKeyEnvVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    model: "gemini-2.5-pro",
    baseUrl: "https://generativelanguage.googleapis.com",
    supportsChat: true,
    supportsImages: true,
    supportsAudio: false,
    notes: "Optional provider for multimodal content generation.",
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    apiKeyEnvVar: "HUGGINGFACE_API_KEY",
    model: "FLUX.1-schnell",
    baseUrl: "https://api-inference.huggingface.co",
    supportsChat: false,
    supportsImages: true,
    supportsAudio: false,
    notes: "Optional provider for text-to-image generation.",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    apiKeyEnvVar: "ELEVENLABS_API_KEY",
    model: "eleven_multilingual_v2",
    baseUrl: "https://api.elevenlabs.io",
    supportsChat: false,
    supportsImages: false,
    supportsAudio: true,
    notes: "Optional provider for high-quality voice generation.",
  },
  {
    id: "browser",
    name: "Browser",
    model: "Web Speech API",
    supportsChat: false,
    supportsImages: false,
    supportsAudio: true,
    notes: "Always available fallback for local, keyless narration.",
  },
];

export function createMockProviderSettings(): ProviderSettings {
  return providerSpecs.reduce((settings, spec) => {
    const enabled = spec.id === "browser";
    settings[spec.id] = {
      id: spec.id,
      name: spec.name,
      enabled,
      status: enabled ? "configured" : "missing_key",
      apiKeyEnvVar: spec.apiKeyEnvVar,
      model: spec.model,
      baseUrl: spec.baseUrl,
      supportsChat: spec.supportsChat,
      supportsImages: spec.supportsImages,
      supportsAudio: spec.supportsAudio,
      notes: spec.notes,
    };
    return settings;
  }, {} as ProviderSettings);
}

export const mockChannelBrief = createMockChannelBrief();
export const mockIdeas = generateMockVideoIdeas(mockChannelBrief, 5);
const firstMockIdea = mockIdeas[0]!;
export const mockScript = generateMockScript({
  brief: mockChannelBrief,
  idea: firstMockIdea,
});
export const mockAssets = generateMockImageAssets({
  brief: mockChannelBrief,
  idea: firstMockIdea,
  script: mockScript,
});
export const mockPipelineStatus = createMockPipelineStatus({
  brief: mockChannelBrief,
  idea: firstMockIdea,
  script: mockScript,
});
export const mockTeamActivity = generateMockTeamActivity();
export const mockProviderSettings = createMockProviderSettings();
