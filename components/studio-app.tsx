"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  createMockChannelBrief,
  createMockPipelineStatus,
  createMockProviderSettings,
  generateMockTeamActivity,
} from "@/lib/ai/mock";
import type {
  ChannelBrief,
  GeneratedAsset,
  GeneratedScript,
  PipelineStatus,
  ProviderSettings,
  TeamActivity,
  VideoIdea,
} from "@/lib/ai/types";
import { createId, formatDateTime, formatDuration } from "@/lib/utils";
import { DashboardHero } from "@/components/dashboard-hero";
import {
  PipelineStrip,
  type PipelineStage as StripStage,
  type PipelineStageStatus,
} from "@/components/pipeline-strip";
import { StatCard } from "@/components/stat-card";

type Panel =
  | "dashboard"
  | "brief"
  | "ideas"
  | "script"
  | "images"
  | "voice"
  | "video";

type NoticeTone = "info" | "success" | "warning" | "error";
type ProviderMode = "mock" | "hybrid" | "live";

type PersistedSession = {
  brief: ChannelBrief;
  ideas: VideoIdea[];
  selectedIdeaId?: string;
  script: GeneratedScript | null;
  assets: GeneratedAsset[];
  pipeline: PipelineStatus;
  teamActivity: TeamActivity[];
  promptOverrides: Record<string, string>;
  ideaCount: number;
  sceneCount: number;
  aspectRatio: string;
  imageStyle: string;
  teamEmail: string;
  sharedProjectId: string;
  durationPerScene: number;
  overlayMode: "title" | "progress" | "none";
  motionStyle: "gentle-zoom" | "push-left" | "push-right" | "cut";
  voiceMode: "browser" | "elevenlabs";
  voiceName: string;
  voiceRate: number;
  voicePitch: number;
  voiceVolume: number;
  voiceScript: string;
  aiVideoMode: "browser" | "replicate";
  aiVideoPrompt: string;
};

type Notice = {
  id: string;
  tone: NoticeTone;
  title: string;
  message: string;
};

type IdeasApiResponse = {
  ideas: VideoIdea[];
  pipeline: PipelineStatus;
  mode: ProviderMode | "live";
  provider: string;
};

type ScriptApiResponse = {
  script: GeneratedScript;
  pipeline: PipelineStatus;
  mode: ProviderMode | "live";
  provider: string;
};

type ImagesApiResponse = {
  assets: GeneratedAsset[];
  pipeline: PipelineStatus;
  mode: ProviderMode | "live";
  provider: string;
};

type StatusApiResponse = {
  providers: ProviderSettings;
  mode: ProviderMode;
};

type AuthStatusResponse = {
  enabled: boolean;
  provider: "supabase" | "local";
  configured: boolean;
  message?: string;
};

type MagicLinkResponse = {
  ok: boolean;
  mode: "supabase" | "mock";
  message: string;
};

type TeamProjectResponse = {
  ok: boolean;
  provider: "supabase" | "local";
  projectId?: string;
  snapshot?: PersistedSession;
  history?: TeamActivity[];
  message?: string;
};

type VoiceApiResponse = {
  provider: "elevenlabs" | "mock";
  mode: "live" | "mock";
  text: string;
  voiceId: string;
  modelId: string | null;
  mimeType?: string;
  audio: {
    bytes: number;
    base64: string;
    dataUrl: string;
  };
  fallbackReason?: string;
};

type VideoApiResponse = {
  provider: "replicate" | "mock";
  mode: "live" | "mock";
  kind: "image" | "video";
  assets: Array<{
    id: string;
    kind: "image" | "video";
    provider: "replicate" | "mock";
    mode: "live" | "mock";
    status: "succeeded" | "processing" | "failed";
    media: {
      url: string;
      mimeType: string;
      previewUrl?: string;
      width: number;
      height: number;
    };
    fallbackReason?: string;
  }>;
};

const SESSION_KEY = "yt-studio-ai-session-v1";
const PANELS: Panel[] = ["dashboard", "brief", "ideas", "script", "images", "voice", "video"];

function readHashPanel(): Panel {
  if (typeof window === "undefined") return "dashboard";
  const panel = window.location.hash.replace("#", "");
  return PANELS.includes(panel as Panel) ? (panel as Panel) : "dashboard";
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinLines(values: string[]): string {
  return values.join("\n");
}

function scriptToVoiceText(script: GeneratedScript | null): string {
  if (!script) return "";
  const sections = [script.intro, ...script.scenes.map((scene) => scene.narration), script.outro];
  return sections.filter(Boolean).join("\n\n");
}

async function postJson<T>(url: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function downloadTextFile(filename: string, content: string, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image asset."));
    image.src = url;
  });
}

function panelTitle(panel: Panel): string {
  switch (panel) {
    case "dashboard":
      return "Mission Control";
    case "brief":
      return "Channel Brief";
    case "ideas":
      return "Prompt Generator";
    case "script":
      return "Story Writer";
    case "images":
      return "Text to Image";
    case "voice":
      return "Text to Voice";
    case "video":
      return "Image to Video";
    default:
      return "Studio";
  }
}

function statusTone(status: string): PipelineStageStatus {
  switch (status) {
    case "succeeded":
      return "complete";
    case "running":
      return "active";
    case "failed":
      return "error";
    case "waiting":
      return "blocked";
    default:
      return "queued";
  }
}

function ProviderBadge({ status }: { status: string }) {
  const tone =
    status === "configured"
      ? "good"
      : status === "missing_key"
        ? "warn"
        : status === "error"
          ? "error"
          : "";

  return <span className={`pill ${tone}`}>{status.replaceAll("_", " ")}</span>;
}

function SectionFrame({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel stack">
      <div className="panel-title">
        <div className="stack" style={{ gap: "0.45rem" }}>
          <span className="eyebrow">{eyebrow}</span>
          <div>
            <h2 className="display-font" style={{ fontSize: "2.05rem", margin: 0 }}>
              {title}
            </h2>
            <p className="helper" style={{ marginTop: "0.35rem" }}>
              {description}
            </p>
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function StudioApp() {
  const initialBrief = useMemo(() => createMockChannelBrief(), []);
  const [panel, setPanel] = useState<Panel>("dashboard");
  const [providerMode, setProviderMode] = useState<ProviderMode>("mock");
  const [providers, setProviders] = useState<ProviderSettings>(createMockProviderSettings());
  const [brief, setBrief] = useState<ChannelBrief>(initialBrief);
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | undefined>();
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [assets, setAssets] = useState<GeneratedAsset[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStatus>(() =>
    createMockPipelineStatus({ brief: createMockChannelBrief() })
  );
  const [teamActivity, setTeamActivity] = useState<TeamActivity[]>(() => generateMockTeamActivity(5));
  const [promptOverrides, setPromptOverrides] = useState<Record<string, string>>({});
  const [ideaCount, setIdeaCount] = useState(5);
  const [sceneCount, setSceneCount] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [imageStyle, setImageStyle] = useState("Cinematic documentary still with dramatic lighting");
  const [teamEmail, setTeamEmail] = useState("");
  const [authEnabled, setAuthEnabled] = useState(false);
  const [authProvider, setAuthProvider] = useState<"supabase" | "local">("local");
  const [authLoading, setAuthLoading] = useState(false);
  const [sharedProjectId, setSharedProjectId] = useState("");
  const [sharedLoading, setSharedLoading] = useState(false);
  const [remoteHistory, setRemoteHistory] = useState<TeamActivity[]>([]);
  const [durationPerScene, setDurationPerScene] = useState(4);
  const [overlayMode, setOverlayMode] = useState<"title" | "progress" | "none">("title");
  const [motionStyle, setMotionStyle] = useState<"gentle-zoom" | "push-left" | "push-right" | "cut">(
    "gentle-zoom"
  );
  const [voiceMode, setVoiceMode] = useState<"browser" | "elevenlabs">("browser");
  const [voiceName, setVoiceName] = useState("");
  const [voiceRate, setVoiceRate] = useState(1);
  const [voicePitch, setVoicePitch] = useState(1);
  const [voiceVolume, setVoiceVolume] = useState(1);
  const [voiceScript, setVoiceScript] = useState("");
  const [voiceAudioUrl, setVoiceAudioUrl] = useState("");
  const [voiceGenerating, setVoiceGenerating] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState("Ready to assemble a browser video.");
  const [videoUrl, setVideoUrl] = useState("");
  const [aiVideoMode, setAiVideoMode] = useState<"browser" | "replicate">("browser");
  const [aiVideoPrompt, setAiVideoPrompt] = useState(
    "Animate these frames into a polished cinematic YouTube sequence with gentle motion and studio pacing."
  );
  const [aiVideoGenerating, setAiVideoGenerating] = useState(false);
  const [aiVideoUrl, setAiVideoUrl] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [pendingIdeas, setPendingIdeas] = useState(false);
  const [pendingScript, setPendingScript] = useState(false);
  const [pendingImages, setPendingImages] = useState(false);
  const [pendingMission, setPendingMission] = useState(false);
  const [pendingVideo, setPendingVideo] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewTimerRef = useRef<number | null>(null);

  const selectedIdea = useMemo(
    () => ideas.find((idea) => idea.id === selectedIdeaId) ?? null,
    [ideas, selectedIdeaId]
  );

  const currentVoiceProvider =
    providers.elevenlabs?.status === "configured" ? "Hybrid voice ready" : "Browser TTS";

  const liveProviders = useMemo(
    () =>
      Object.values(providers).filter(
        (provider) => provider.enabled && provider.status === "configured" && provider.id !== "browser"
      ),
    [providers]
  );

  useEffect(() => {
    setPanel(readHashPanel());
    const onHashChange = () => setPanel(readHashPanel());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return;

    try {
      const session = JSON.parse(raw) as PersistedSession;
      startTransition(() => {
        setBrief(session.brief);
        setIdeas(session.ideas);
        setSelectedIdeaId(session.selectedIdeaId);
        setScript(session.script);
        setAssets(session.assets);
        setPipeline(session.pipeline);
        setTeamActivity(session.teamActivity);
        setPromptOverrides(session.promptOverrides);
        setIdeaCount(session.ideaCount);
        setSceneCount(session.sceneCount);
        setAspectRatio(session.aspectRatio);
        setImageStyle(session.imageStyle);
        setTeamEmail(session.teamEmail || "");
        setSharedProjectId(session.sharedProjectId || "");
        setDurationPerScene(session.durationPerScene);
        setOverlayMode(session.overlayMode);
        setMotionStyle(session.motionStyle);
        setVoiceMode(session.voiceMode || "browser");
        setVoiceName(session.voiceName);
        setVoiceRate(session.voiceRate);
        setVoicePitch(session.voicePitch);
        setVoiceVolume(session.voiceVolume);
        setVoiceScript(session.voiceScript);
        setAiVideoMode(session.aiVideoMode || "browser");
        setAiVideoPrompt(
          session.aiVideoPrompt ||
            "Animate these frames into a polished cinematic YouTube sequence with gentle motion and studio pacing."
        );
      });
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    const session: PersistedSession = {
      brief,
      ideas,
      selectedIdeaId,
      script,
      assets,
      pipeline,
      teamActivity,
      promptOverrides,
      ideaCount,
      sceneCount,
      aspectRatio,
      imageStyle,
      teamEmail,
      sharedProjectId,
      durationPerScene,
      overlayMode,
      motionStyle,
      voiceMode,
      voiceName,
      voiceRate,
      voicePitch,
      voiceVolume,
      voiceScript,
      aiVideoMode,
      aiVideoPrompt,
    };

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [
    assets,
    aspectRatio,
    brief,
    durationPerScene,
    ideaCount,
    ideas,
    imageStyle,
    teamEmail,
    sharedProjectId,
    motionStyle,
    overlayMode,
    pipeline,
    promptOverrides,
    sceneCount,
    script,
    selectedIdeaId,
    teamActivity,
    voiceMode,
    voiceName,
    voicePitch,
    voiceRate,
    voiceScript,
    voiceVolume,
    aiVideoMode,
    aiVideoPrompt,
  ]);

  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);

      if (!voiceName) {
        const preferred =
          availableVoices.find((voice) => voice.lang.startsWith("en") && /natural|google/i.test(voice.name)) ||
          availableVoices.find((voice) => voice.lang.startsWith("en")) ||
          availableVoices[0];

        if (preferred) {
          setVoiceName(preferred.name);
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [voiceName]);

  useEffect(() => {
    if (!script) return;
    setVoiceScript((current) => (current.trim() ? current : scriptToVoiceText(script)));
    setPromptOverrides((current) => {
      const next = { ...current };
      for (const scene of script.scenes) {
        if (!next[scene.id]) {
          next[scene.id] = `${scene.visualDirection}. ${scene.bRollDirection}`;
        }
      }
      return next;
    });
  }, [script]);

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        window.clearInterval(previewTimerRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  function pushNotice(tone: NoticeTone, title: string, message: string) {
    const id = createId("notice");
    setNotices((current) => [...current, { id, tone, title, message }]);
    window.setTimeout(() => {
      setNotices((current) => current.filter((notice) => notice.id !== id));
    }, 4200);
  }

  function pushActivity(title: string, message: string, actorRole = "Studio AI") {
    const timestamp = new Date().toISOString();
    setTeamActivity((current) => [
      {
        id: createId("activity"),
        kind: "status_updated",
        actor: "Studio",
        actorRole,
        title,
        message,
        status: "running",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      ...current,
    ]);
  }

  function goTo(nextPanel: Panel) {
    if (typeof window !== "undefined") {
      window.location.hash = nextPanel;
      document.getElementById(nextPanel)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setPanel(nextPanel);
  }

  useEffect(() => {
    void refreshProviders();
  }, []);

  useEffect(() => {
    void refreshAuthStatus();
  }, []);

  useEffect(() => {
    void previewAsset(previewIndex, 0.35);
  }, [assets, motionStyle, overlayMode, previewIndex]);

  function updateBriefField<K extends keyof ChannelBrief>(key: K, value: ChannelBrief[K]) {
    setBrief((current) => ({
      ...current,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  }

  async function refreshProviders() {
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as StatusApiResponse;
      setProviders(data.providers);
      setProviderMode(data.mode);
    } catch {
      // Keep mock defaults if the route is unavailable.
    }
  }

  async function refreshAuthStatus() {
    try {
      const response = await fetch("/api/auth/status", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as AuthStatusResponse;
      setAuthEnabled(data.enabled && data.configured);
      setAuthProvider(data.provider);
    } catch {
      setAuthEnabled(false);
      setAuthProvider("local");
    }
  }

  function buildSnapshot(): PersistedSession {
    return {
      brief,
      ideas,
      selectedIdeaId,
      script,
      assets,
      pipeline,
      teamActivity,
      promptOverrides,
      ideaCount,
      sceneCount,
      aspectRatio,
      imageStyle,
      teamEmail,
      sharedProjectId,
      durationPerScene,
      overlayMode,
      motionStyle,
      voiceMode,
      voiceName,
      voiceRate,
      voicePitch,
      voiceVolume,
      voiceScript,
      aiVideoMode,
      aiVideoPrompt,
    };
  }

  async function requestMagicLink() {
    if (!teamEmail.trim()) {
      pushNotice("warning", "Email needed", "Enter your team email to request a sign-in link.");
      return;
    }

    setAuthLoading(true);
    try {
      const data = await postJson<MagicLinkResponse>("/api/auth/magic-link", {
        email: teamEmail.trim(),
        redirectTo: typeof window !== "undefined" ? window.location.href : undefined,
      });
      pushNotice(data.ok ? "success" : "warning", "Auth status", data.message);
    } catch (error) {
      pushNotice("error", "Auth request failed", error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function saveSharedProject() {
    setSharedLoading(true);
    try {
      const data = await postJson<TeamProjectResponse>("/api/team/project", {
        projectId: sharedProjectId || undefined,
        actor: teamEmail || "website-owner",
        title: brief.channelName,
        message: "Project snapshot saved from the website studio.",
        snapshot: buildSnapshot(),
      });

      if (data.projectId) {
        setSharedProjectId(data.projectId);
      }
      if (data.history?.length) {
        setRemoteHistory(data.history);
      }
      pushNotice("success", "Shared project saved", data.message || "Snapshot stored for team access.");
    } catch (error) {
      pushNotice("error", "Save failed", error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setSharedLoading(false);
    }
  }

  async function loadSharedProject() {
    if (!sharedProjectId.trim()) {
      pushNotice("warning", "Project ID needed", "Enter a shared project ID before loading history.");
      return;
    }

    setSharedLoading(true);
    try {
      const response = await fetch(`/api/team/project?id=${encodeURIComponent(sharedProjectId.trim())}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Unable to load shared project.");
      }
      const data = (await response.json()) as TeamProjectResponse;
      if (data.snapshot) {
        const snapshot = data.snapshot;
        startTransition(() => {
          setBrief(snapshot.brief);
          setIdeas(snapshot.ideas);
          setSelectedIdeaId(snapshot.selectedIdeaId);
          setScript(snapshot.script);
          setAssets(snapshot.assets);
          setPipeline(snapshot.pipeline);
          setTeamActivity(snapshot.teamActivity);
          setPromptOverrides(snapshot.promptOverrides);
          setIdeaCount(snapshot.ideaCount);
          setSceneCount(snapshot.sceneCount);
          setAspectRatio(snapshot.aspectRatio);
          setImageStyle(snapshot.imageStyle);
          setTeamEmail(snapshot.teamEmail || teamEmail);
          setDurationPerScene(snapshot.durationPerScene);
          setOverlayMode(snapshot.overlayMode);
          setMotionStyle(snapshot.motionStyle);
          setVoiceMode(snapshot.voiceMode || "browser");
          setVoiceName(snapshot.voiceName);
          setVoiceRate(snapshot.voiceRate);
          setVoicePitch(snapshot.voicePitch);
          setVoiceVolume(snapshot.voiceVolume);
          setVoiceScript(snapshot.voiceScript);
          setAiVideoMode(snapshot.aiVideoMode || "browser");
          setAiVideoPrompt(snapshot.aiVideoPrompt || aiVideoPrompt);
        });
      }
      if (data.history?.length) {
        setRemoteHistory(data.history);
      }
      pushNotice("success", "Shared project loaded", data.message || "Team snapshot restored.");
    } catch (error) {
      pushNotice("error", "Load failed", error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setSharedLoading(false);
    }
  }

  async function generateIdeas(): Promise<VideoIdea[] | null> {
    setPendingIdeas(true);
    setPipeline(createMockPipelineStatus({ brief, stage: "idea", progress: 0.24 }));

    try {
      const data = await postJson<IdeasApiResponse>("/api/ideas", {
        brief,
        count: ideaCount,
      });

      startTransition(() => {
        setIdeas(data.ideas);
        setSelectedIdeaId(data.ideas[0]?.id);
        setScript(null);
        setAssets([]);
        setVideoUrl("");
        setPipeline(data.pipeline);
      });

      pushActivity("Prompt agent delivered ideas", `${data.ideas.length} concepts are ready to shortlist.`);
      pushNotice(
        data.mode === "live" ? "success" : "info",
        "Ideas ready",
        `${data.ideas.length} concepts generated with ${data.provider}.`
      );
      return data.ideas;
    } catch (error) {
      pushNotice("error", "Idea generation failed", error instanceof Error ? error.message : "Unknown error.");
      return null;
    } finally {
      setPendingIdeas(false);
    }
  }

  async function generateScript(): Promise<GeneratedScript | null> {
    if (!selectedIdea) {
      pushNotice("warning", "Select an idea first", "Pick one concept before generating the script.");
      return null;
    }

    setPendingScript(true);
    setPipeline(
      createMockPipelineStatus({
        brief,
        idea: selectedIdea,
        stage: "script",
        progress: 0.48,
      })
    );

    try {
      const data = await postJson<ScriptApiResponse>("/api/script", {
        brief,
        idea: selectedIdea,
        sceneCount,
      });

      startTransition(() => {
        setScript(data.script);
        setAssets([]);
        setVideoUrl("");
        setPipeline(data.pipeline);
        setPromptOverrides(
          Object.fromEntries(
            data.script.scenes.map((scene) => [
              scene.id,
              `${scene.visualDirection}. ${scene.bRollDirection}`,
            ])
          )
        );
        setVoiceScript(scriptToVoiceText(data.script));
      });

      pushActivity(
        "Story writer locked the draft",
        `${data.script.scenes.length} scenes are staged with narration and visual direction.`
      );
      pushNotice(
        data.mode === "live" ? "success" : "info",
        "Script ready",
        `${data.script.scenes.length} scenes generated with ${data.provider}.`
      );
      return data.script;
    } catch (error) {
      pushNotice("error", "Script generation failed", error instanceof Error ? error.message : "Unknown error.");
      return null;
    } finally {
      setPendingScript(false);
    }
  }

  async function generateImages(): Promise<GeneratedAsset[] | null> {
    if (!selectedIdea || !script) {
      pushNotice("warning", "Script required", "Generate the script before creating image assets.");
      return null;
    }

    setPendingImages(true);
    setPipeline(
      createMockPipelineStatus({
        brief,
        idea: selectedIdea,
        script,
        stage: "assets",
        progress: 0.72,
      })
    );

    try {
      const data = await postJson<ImagesApiResponse>("/api/images", {
        brief,
        idea: selectedIdea,
        script,
        prompts: promptOverrides,
        aspectRatio,
      });

      startTransition(() => {
        setAssets(data.assets);
        setPipeline(data.pipeline);
        setPreviewIndex(0);
        setVideoUrl("");
      });

      pushActivity(
        "Visual agent created frames",
        `${data.assets.length} scene visuals are now queued for voice and video assembly.`
      );
      pushNotice(
        data.mode === "live" ? "success" : "info",
        "Images ready",
        `${data.assets.length} visuals generated with ${data.provider}.`
      );
      return data.assets;
    } catch (error) {
      pushNotice("error", "Image generation failed", error instanceof Error ? error.message : "Unknown error.");
      return null;
    } finally {
      setPendingImages(false);
    }
  }

  async function runMission() {
    setPendingMission(true);
    pushActivity("Mission started", "The full pipeline is now running from brief to browser video.");
    goTo("ideas");

    const freshIdeas = await generateIdeas();
    const firstIdea = freshIdeas?.[0];

    if (!firstIdea) {
      setPendingMission(false);
      return;
    }

    setSelectedIdeaId(firstIdea.id);
    await wait(300);
    goTo("script");

    const freshScript = await generateScript();
    if (!freshScript) {
      setPendingMission(false);
      return;
    }

    await wait(300);
    goTo("images");

    const freshAssets = await generateImages();
    if (!freshAssets) {
      setPendingMission(false);
      return;
    }

    await wait(250);
    goTo("voice");
    pushNotice("success", "Mission complete", "Idea, story, and visuals are ready. Voice and video are next.");
    setPendingMission(false);
  }

  function resetWorkspace() {
    const cleanBrief = createMockChannelBrief();
    window.localStorage.removeItem(SESSION_KEY);
    window.speechSynthesis.cancel();
    setBrief(cleanBrief);
    setIdeas([]);
    setSelectedIdeaId(undefined);
    setScript(null);
    setAssets([]);
    setPromptOverrides({});
    setPipeline(createMockPipelineStatus({ brief: cleanBrief }));
    setTeamActivity(generateMockTeamActivity(5));
    setVoiceScript("");
    setVideoUrl("");
    setVideoStatus("Ready to assemble a browser video.");
    setVideoProgress(0);
    pushNotice("info", "Workspace reset", "The studio is back to a clean slate.");
    goTo("dashboard");
  }

  function exportWorkspace() {
    downloadTextFile(
      `yt-studio-session-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(buildSnapshot(), null, 2)
    );
    pushNotice("success", "Workspace exported", "You can share this JSON snapshot with a teammate.");
  }

  function loadScriptIntoVoice() {
    setVoiceScript(scriptToVoiceText(script));
    pushNotice("info", "Voice script loaded", "The latest story draft is now in the voice deck.");
  }

  function startSpeech() {
    if (!voiceScript.trim()) {
      pushNotice("warning", "Voice deck is empty", "Load the script or type narration before speaking.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(voiceScript);
    const selectedVoiceOption = voices.find((voice) => voice.name === voiceName);

    if (selectedVoiceOption) {
      utterance.voice = selectedVoiceOption;
    }

    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.volume = voiceVolume;
    utterance.onstart = () => {
      setSpeaking(true);
      setPaused(false);
      pushActivity("Voice agent is narrating", "Browser speech synthesis is reading the current script.");
    };
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
      pushNotice("success", "Voice pass complete", "Browser narration finished cleanly.");
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
      pushNotice("error", "Voice pass failed", "The browser could not complete speech synthesis.");
    };

    window.speechSynthesis.speak(utterance);
  }

  function pauseSpeech() {
    if (!speaking) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      return;
    }

    window.speechSynthesis.pause();
    setPaused(true);
  }

  function stopSpeech() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }

  async function generateVoiceAudio() {
    if (!voiceScript.trim()) {
      pushNotice("warning", "Voice deck is empty", "Add narration text before generating audio.");
      return;
    }

    if (voiceMode === "browser") {
      pushNotice("info", "Browser mode active", "Use Speak Script for browser voice preview or switch to ElevenLabs generation.");
      return;
    }

    setVoiceGenerating(true);
    setVoiceAudioUrl("");
    try {
      const data = await postJson<VoiceApiResponse>("/api/voice", {
        text: voiceScript,
        voiceId: "EXAVITQu4vr4xnSDxMaL",
        modelId: "eleven_multilingual_v2",
        outputFormat: "mp3_44100_128",
      });

      setVoiceAudioUrl(data.audio.dataUrl);
      pushNotice(
        data.provider === "elevenlabs" ? "success" : "warning",
        "Voice generation",
        data.fallbackReason || `${data.provider} ${data.mode} audio ready.`
      );
    } catch (error) {
      pushNotice("error", "Voice generation failed", error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setVoiceGenerating(false);
    }
  }

  async function drawFrame(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    asset: GeneratedAsset,
    image: HTMLImageElement,
    progress: number
  ) {
    context.clearRect(0, 0, canvas.width, canvas.height);

    let scale = 1;
    let offsetX = 0;
    if (motionStyle === "gentle-zoom") {
      scale = 1 + progress * 0.06;
    } else if (motionStyle === "push-left") {
      scale = 1.08;
      offsetX = progress * 44;
    } else if (motionStyle === "push-right") {
      scale = 1.08;
      offsetX = -progress * 44;
    }

    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;
    const x = -(scaledWidth - canvas.width) / 2 + offsetX;
    const y = -(scaledHeight - canvas.height) / 2;
    context.drawImage(image, x, y, scaledWidth, scaledHeight);

    if (overlayMode !== "none") {
      context.fillStyle = "rgba(6, 7, 13, 0.56)";
      context.fillRect(0, canvas.height - 64, canvas.width, 64);
      context.fillStyle = "#f5f7fb";
      context.font = "bold 26px Arial";
      context.fillText(asset.title, 24, canvas.height - 25);
    }

    if (overlayMode === "progress" && assets.length) {
      context.fillStyle = "rgba(255, 177, 90, 0.92)";
      context.fillRect(0, canvas.height - 7, canvas.width * ((previewIndex + progress) / assets.length), 7);
    }
  }

  async function previewAsset(index: number, progress = 0.35) {
    const canvas = canvasRef.current;
    const asset = assets[index];
    if (!canvas || !asset) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const image = await loadImage(asset.url);
    await drawFrame(context, canvas, asset, image, progress);
  }

  function previewSequence() {
    if (!assets.length) {
      pushNotice("warning", "No visuals yet", "Generate images before previewing the image-to-video stage.");
      return;
    }

    if (previewTimerRef.current) {
      window.clearInterval(previewTimerRef.current);
    }

    let localIndex = 0;
    setPreviewIndex(localIndex);
    void previewAsset(localIndex, 0.2);
    previewTimerRef.current = window.setInterval(() => {
      localIndex = (localIndex + 1) % assets.length;
      setPreviewIndex(localIndex);
      void previewAsset(localIndex, 0.42);
    }, Math.max(1500, durationPerScene * 1000));
    pushNotice("info", "Preview started", "Cycling through the current visual sequence.");
  }

  async function assembleVideo() {
    if (!assets.length) {
      pushNotice("warning", "Need image assets", "Generate scene visuals before assembling the browser video.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(30);
    const mimeType =
      ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((type) =>
        MediaRecorder.isTypeSupported(type)
      ) || "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    setPendingVideo(true);
    setVideoStatus("Assembling frames into a browser video...");
    setVideoProgress(0);
    recorder.start();

    const context = canvas.getContext("2d");
    if (!context) return;

    const fps = 30;
    const sceneFrames = Math.max(1, durationPerScene * fps);
    const totalFrames = sceneFrames * assets.length;

    for (let assetIndex = 0; assetIndex < assets.length; assetIndex += 1) {
      const asset = assets[assetIndex];
      const image = await loadImage(asset.url);
      setPreviewIndex(assetIndex);

      for (let frameIndex = 0; frameIndex < sceneFrames; frameIndex += 1) {
        const progress = frameIndex / sceneFrames;
        await drawFrame(context, canvas, asset, image, progress);
        const percent = Math.round(((assetIndex * sceneFrames + frameIndex + 1) / totalFrames) * 100);
        setVideoProgress(percent);
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      }
    }

    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    const blob = new Blob(chunksRef.current, { type: mimeType });
    const url = URL.createObjectURL(blob);
    setVideoUrl(url);
    setVideoProgress(100);
    setVideoStatus("Video assembled. Download the WebM or deploy the app to share the workflow.");
    setPendingVideo(false);
    pushNotice("success", "Video ready", "The image-to-video stage exported a browser WebM preview.");
  }

  async function generateAiVideo() {
    if (!assets.length) {
      pushNotice("warning", "Need image assets", "Generate visuals before requesting AI video generation.");
      return;
    }

    if (aiVideoMode === "browser") {
      pushNotice("info", "Browser mode active", "Use Assemble Video for the built-in website preview, or switch to AI video mode.");
      return;
    }

    setAiVideoGenerating(true);
    setAiVideoUrl("");
    try {
      const data = await postJson<VideoApiResponse>("/api/video", {
        kind: "video",
        prompt: aiVideoPrompt,
        aspectRatio,
        input: {
          images: assets.slice(0, 8).map((asset) => asset.url),
        },
      });

      const primaryAsset = data.assets[0];
      const nextUrl = primaryAsset?.media.url || primaryAsset?.media.previewUrl || "";
      if (nextUrl) setAiVideoUrl(nextUrl);
      pushNotice(
        data.provider === "replicate" ? "success" : "warning",
        "AI video status",
        primaryAsset?.fallbackReason ||
          (primaryAsset?.status === "processing"
            ? "AI video job is still processing."
            : nextUrl
              ? `${data.provider} ${data.mode} output ready.`
              : "No video URL returned.")
      );
    } catch (error) {
      pushNotice("error", "AI video failed", error instanceof Error ? error.message : "Unknown error.");
    } finally {
      setAiVideoGenerating(false);
    }
  }

  function downloadVideo() {
    if (!videoUrl) {
      pushNotice("warning", "Assemble first", "Create the browser video before downloading it.");
      return;
    }

    const link = document.createElement("a");
    link.href = videoUrl;
    link.download = `${brief.channelSlug || "yt-studio"}-preview.webm`;
    link.click();
  }

  const pipelineStages = useMemo<StripStage[]>(
    () => [
      {
        label: "Brief",
        detail: brief.channelName || "Channel briefing in progress",
        count: 1,
        status: "complete",
      },
      {
        label: "Prompt",
        detail: ideas.length ? `${ideas.length} ideas ready` : "Generate title angles and hooks",
        count: ideas.length || "-",
        status: ideas.length ? "complete" : pendingIdeas ? "active" : "queued",
      },
      {
        label: "Story",
        detail: script ? `${script.scenes.length} scenes locked` : "Expand the chosen idea into a script",
        count: script?.scenes.length || "-",
        status: script ? "complete" : pendingScript ? "active" : selectedIdea ? "queued" : "blocked",
      },
      {
        label: "Visuals",
        detail: assets.length ? `${assets.length} frames generated` : "Turn scene prompts into images",
        count: assets.length || "-",
        status: assets.length ? "complete" : pendingImages ? "active" : script ? "queued" : "blocked",
      },
      {
        label: "Voice",
        detail: voiceScript ? currentVoiceProvider : "Load a script into the voice deck",
        count: speaking ? "On" : "Off",
        status: speaking ? "active" : voiceScript ? "complete" : "blocked",
      },
      {
        label: "Video",
        detail: videoUrl ? "WebM assembled and ready to download" : videoStatus,
        count: videoUrl ? "1" : "-",
        status: videoUrl ? "complete" : pendingVideo ? "active" : assets.length ? "queued" : "blocked",
      },
      {
        label: "Publish",
        detail:
          pipeline.steps.find((step) => step.stage === "publish")?.detail ||
          "Export the package, push to GitHub, and deploy when ready",
        count: providerMode === "mock" ? "Mock" : "Live",
        status: statusTone(pipeline.steps.find((step) => step.stage === "publish")?.status || "queued"),
      },
    ],
    [
      assets.length,
      brief.channelName,
      currentVoiceProvider,
      ideas.length,
      pendingIdeas,
      pendingImages,
      pendingScript,
      pendingVideo,
      pipeline.steps,
      providerMode,
      script,
      selectedIdea,
      speaking,
      videoStatus,
      videoUrl,
      voiceScript,
    ]
  );

  const navItems = [
    { label: "Dashboard", href: "#dashboard", active: panel === "dashboard" },
    { label: "Brief", href: "#brief", active: panel === "brief", meta: brief.niche || "Setup" },
    { label: "Ideas", href: "#ideas", active: panel === "ideas", meta: ideas.length || "-" },
    { label: "Story", href: "#script", active: panel === "script", meta: script?.scenes.length || "-" },
    { label: "Images", href: "#images", active: panel === "images", meta: assets.length || "-" },
    { label: "Voice", href: "#voice", active: panel === "voice", meta: speaking ? "Live" : "Ready" },
    { label: "Video", href: "#video", active: panel === "video", meta: videoUrl ? "Ready" : "Draft" },
  ];

  const headerActions = (
    <div className="button-row">
      <span className={`pill ${providerMode === "live" ? "good" : providerMode === "hybrid" ? "warn" : ""}`}>
        {providerMode === "live"
          ? "Live providers configured"
          : providerMode === "hybrid"
            ? "Hybrid mode"
            : "Mock mode"}
      </span>
      <button className="btn btn-secondary" onClick={exportWorkspace} type="button">
        Export session
      </button>
      <button className="btn btn-primary" onClick={() => void runMission()} type="button" disabled={pendingMission}>
        {pendingMission ? "Running mission..." : "Run full mission"}
      </button>
    </div>
  );

  function handlePromptChange(sceneId: string, event: ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setPromptOverrides((current) => ({
      ...current,
      [sceneId]: value,
    }));
  }

  function renderDashboard() {
    return (
      <>
        <DashboardHero
          eyebrow="Agentic video operator"
          title="Build, narrate, and assemble YouTube videos from one production cockpit."
          description="This studio turns a channel brief into prompts, scene-based scripts, image assets, voice narration, and a browser video preview. It runs with mock data immediately and upgrades to live providers once you add server environment keys."
          statusLabel={
            providerMode === "live"
              ? "Live providers online"
              : providerMode === "hybrid"
                ? "Hybrid studio"
                : "Mock mode ready"
          }
          primaryAction={{
            label: pendingMission ? "Mission running..." : "Run the full pipeline",
            onClick: () => void runMission(),
          }}
          secondaryAction={{ label: "Open channel brief", onClick: () => goTo("brief") }}
          metrics={[
            { label: "Ideas", value: ideas.length || 0, detail: "Prompt agent output", tone: "neutral" },
            {
              label: "Scenes",
              value: script?.scenes.length || 0,
              detail: script ? formatDuration(script.estimatedDurationSeconds) : "Awaiting story writer",
              tone: "good",
            },
            {
              label: "Providers",
              value: liveProviders.length ? liveProviders.length : "Mock",
              detail: liveProviders.length ? "Server-side AI enabled" : "Safe demo path",
              tone: liveProviders.length ? "good" : "warn",
            },
          ]}
        >
          <div className="stack">
            <div className="pill good">{panelTitle(panel)}</div>
            <div className="helper">
              Channel: <strong>{brief.channelName}</strong>
            </div>
            <div className="helper">
              Audience: <strong>{brief.audience}</strong>
            </div>
            <div className="helper">
              Today&apos;s goal: <strong>{brief.notes || "Create a fresh agentic workflow video."}</strong>
            </div>
          </div>
        </DashboardHero>

        <div className="grid-4">
          <StatCard
            label="Prompt Generator"
            value={ideas.length || 0}
            description="High-retention video concepts and thumbnail angles."
            delta={selectedIdea ? "Idea selected" : "Need a shortlist"}
            deltaTone={selectedIdea ? "positive" : "warning"}
            icon={<span>01</span>}
          />
          <StatCard
            label="Story Writer"
            value={script?.scenes.length || 0}
            description="Scene-by-scene narration with on-screen direction."
            delta={script ? formatDuration(script.estimatedDurationSeconds) : "No script yet"}
            deltaTone={script ? "positive" : "neutral"}
            icon={<span>02</span>}
          />
          <StatCard
            label="Text to Image"
            value={assets.length || 0}
            description="Image frames generated from your scene prompts."
            delta={assets.length ? aspectRatio : "Waiting on visuals"}
            deltaTone={assets.length ? "positive" : "neutral"}
            icon={<span>03</span>}
          />
          <StatCard
            label="Image to Video"
            value={videoUrl ? "Ready" : "Draft"}
            description="Browser assembly with overlays and motion treatment."
            delta={videoUrl ? "WebM exported" : videoStatus}
            deltaTone={videoUrl ? "positive" : "warning"}
            icon={<span>04</span>}
          />
        </div>

        <PipelineStrip
          title="Creator pipeline"
          description="Every step works on its own, or you can run the full mission from one click."
          stages={pipelineStages}
          activeIndex={Math.max(0, pipelineStages.findIndex((stage) => stage.status === "active"))}
        >
          <button className="btn btn-secondary" onClick={() => goTo("video")} type="button">
            Open image-to-video desk
          </button>
        </PipelineStrip>

        <section className="panel stack">
          <div className="panel-title">
            <div>
              <span className="eyebrow">Team sync</span>
              <h3 style={{ margin: "0.45rem 0 0" }}>Shared auth, storage, and history</h3>
            </div>
            <span className={`pill ${authEnabled ? "good" : "warn"}`}>
              {authEnabled ? `${authProvider} ready` : "local-only mode"}
            </span>
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Team email</label>
              <input
                value={teamEmail}
                onChange={(event) => setTeamEmail(event.target.value)}
                placeholder="team@yourstudio.com"
              />
            </div>
            <div className="field">
              <label>Shared project ID</label>
              <input
                value={sharedProjectId}
                onChange={(event) => setSharedProjectId(event.target.value)}
                placeholder="project id from Supabase sync"
              />
            </div>
            <div className="field">
              <label>Mode</label>
              <input
                value={authEnabled ? "Magic-link team sync enabled" : "Mock/local website mode"}
                readOnly
              />
            </div>
          </div>
          <div className="button-row">
            <button className="btn btn-secondary" onClick={() => void requestMagicLink()} type="button" disabled={authLoading}>
              {authLoading ? "Sending link..." : "Request sign-in link"}
            </button>
            <button className="btn btn-secondary" onClick={() => void saveSharedProject()} type="button" disabled={sharedLoading}>
              {sharedLoading ? "Saving..." : "Save shared snapshot"}
            </button>
            <button className="btn btn-primary" onClick={() => void loadSharedProject()} type="button" disabled={sharedLoading}>
              {sharedLoading ? "Loading..." : "Load shared snapshot"}
            </button>
          </div>
          <div className="helper">
            When Supabase env vars are configured, this website can send magic links, persist project snapshots, and append shared history for your team. Without them, the website stays fully usable in local/mock mode.
          </div>
        </section>

        <div className="grid-2">
          <section className="panel stack">
            <div className="panel-title">
              <div>
                <span className="eyebrow">Provider deck</span>
                <h3 style={{ margin: "0.45rem 0 0" }}>Server and browser capability</h3>
              </div>
              <button className="btn btn-ghost" type="button" onClick={() => void refreshProviders()}>
                Refresh
              </button>
            </div>
            <div className="provider-grid">
              {Object.values(providers).map((provider) => (
                <article key={provider.id} className="provider-card stack" style={{ gap: "0.7rem" }}>
                  <div className="panel-title" style={{ marginBottom: 0 }}>
                    <div>
                      <strong>{provider.name}</strong>
                      <div className="helper">{provider.model || "Capability ready"}</div>
                    </div>
                    <ProviderBadge status={provider.status} />
                  </div>
                  <p className="helper">{provider.notes}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="panel-title">
              <div>
                <span className="eyebrow">Activity</span>
                <h3 style={{ margin: "0.45rem 0 0" }}>Team and agent feed</h3>
              </div>
            </div>
            <div className="activity-list">
              {teamActivity.slice(0, 6).map((item) => (
                <article key={item.id} className="subtle-item stack" style={{ gap: "0.35rem" }}>
                  <div className="panel-title" style={{ marginBottom: 0 }}>
                    <strong>{item.title}</strong>
                    <span className="pill">{formatDateTime(item.createdAt)}</span>
                  </div>
                  <div className="helper">
                    {item.actor} · {item.actorRole}
                  </div>
                  <p className="helper">{item.message}</p>
                </article>
              ))}
              {remoteHistory.slice(0, 3).map((item) => (
                <article key={`remote-${item.id}`} className="subtle-item stack" style={{ gap: "0.35rem" }}>
                  <div className="panel-title" style={{ marginBottom: 0 }}>
                    <strong>{item.title}</strong>
                    <span className="pill good">shared</span>
                  </div>
                  <div className="helper">
                    {item.actor} · {item.actorRole}
                  </div>
                  <p className="helper">{item.message}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderBrief() {
    return (
      <SectionFrame
        eyebrow="Briefing agent"
        title="Shape the channel brief that every other agent will follow."
        description="This is the control document for prompts, story structure, visuals, and voice. Stronger input here makes the whole studio smarter."
        actions={
          <div className="button-row">
            <button className="btn btn-secondary" onClick={resetWorkspace} type="button">
              Reset workspace
            </button>
            <button className="btn btn-primary" onClick={() => goTo("ideas")} type="button">
              Go to prompts
            </button>
          </div>
        }
      >
        <div className="grid-2">
          <div className="field">
            <label>Channel name</label>
            <input value={brief.channelName} onChange={(event) => updateBriefField("channelName", event.target.value)} />
          </div>
          <div className="field">
            <label>Niche</label>
            <input value={brief.niche} onChange={(event) => updateBriefField("niche", event.target.value)} />
          </div>
          <div className="field">
            <label>Audience</label>
            <input value={brief.audience} onChange={(event) => updateBriefField("audience", event.target.value)} />
          </div>
          <div className="field">
            <label>Tone</label>
            <input value={brief.tone} onChange={(event) => updateBriefField("tone", event.target.value)} />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Voice direction</label>
            <input value={brief.voice} onChange={(event) => updateBriefField("voice", event.target.value)} />
          </div>
          <div className="field">
            <label>Thumbnail style</label>
            <input
              value={brief.thumbnailStyle}
              onChange={(event) => updateBriefField("thumbnailStyle", event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Channel description</label>
          <textarea value={brief.description} onChange={(event) => updateBriefField("description", event.target.value)} />
        </div>

        <div className="field">
          <label>Today&apos;s production target</label>
          <textarea value={brief.notes} onChange={(event) => updateBriefField("notes", event.target.value)} />
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Goals</label>
            <textarea value={joinLines(brief.goals)} onChange={(event) => updateBriefField("goals", splitLines(event.target.value))} />
          </div>
          <div className="field">
            <label>Content pillars</label>
            <textarea
              value={joinLines(brief.contentPillars)}
              onChange={(event) => updateBriefField("contentPillars", splitLines(event.target.value))}
            />
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
            <label>Differentiators</label>
            <textarea
              value={joinLines(brief.differentiators)}
              onChange={(event) => updateBriefField("differentiators", splitLines(event.target.value))}
            />
          </div>
          <div className="field">
            <label>Call to action</label>
            <textarea value={brief.callToAction} onChange={(event) => updateBriefField("callToAction", event.target.value)} />
          </div>
        </div>
      </SectionFrame>
    );
  }

  function renderIdeas() {
    return (
      <SectionFrame
        eyebrow="Prompt generator"
        title="Generate title angles, hooks, and thumbnail concepts."
        description="This stage creates the ideas that feed the story writer. Shortlist one, then let the next agent build the actual episode."
        actions={
          <div className="button-row">
            <div className="pill">{ideaCount} ideas</div>
            <button className="btn btn-primary" onClick={() => void generateIdeas()} type="button" disabled={pendingIdeas}>
              {pendingIdeas ? "Generating..." : "Generate ideas"}
            </button>
          </div>
        }
      >
        <div className="grid-3">
          <div className="field">
            <label>Ideas per run</label>
            <select value={ideaCount} onChange={(event) => setIdeaCount(Number(event.target.value))}>
              <option value={3}>3 ideas</option>
              <option value={5}>5 ideas</option>
              <option value={7}>7 ideas</option>
            </select>
          </div>
          <div className="field">
            <label>Primary objective</label>
            <input value={brief.goals[0] || ""} readOnly />
          </div>
          <div className="field">
            <label>Production note</label>
            <input value={brief.notes} readOnly />
          </div>
        </div>

        <div className="asset-grid">
          {ideas.length ? (
            ideas.map((idea) => (
              <button
                key={idea.id}
                className={`idea-card ${selectedIdeaId === idea.id ? "selected" : ""}`}
                type="button"
                onClick={() => {
                  setSelectedIdeaId(idea.id);
                  pushNotice("info", "Idea selected", `"${idea.title}" is now feeding the story writer.`);
                }}
                style={{ textAlign: "left", color: "inherit" }}
              >
                <div className="panel-title" style={{ marginBottom: 0 }}>
                  <span className="pill">{idea.format}</span>
                  <span className="pill good">{Math.round(idea.confidence * 100)}%</span>
                </div>
                <div>
                  <h3 style={{ margin: 0 }}>{idea.title}</h3>
                  <p className="helper" style={{ marginTop: "0.4rem" }}>{idea.subtitle}</p>
                </div>
                <p className="helper">
                  <strong>Hook:</strong> {idea.hook}
                </p>
                <p className="helper">
                  <strong>Angle:</strong> {idea.angle}
                </p>
                <div className="idea-meta">
                  {idea.keywords.slice(0, 4).map((keyword) => (
                    <span key={keyword} className="chip">
                      {keyword}
                    </span>
                  ))}
                </div>
              </button>
            ))
          ) : (
            <article className="subtle-item">
              <p className="helper">No concepts yet. Generate a prompt batch and the shortlist will appear here.</p>
            </article>
          )}
        </div>

        <div className="button-row">
          <button className="btn btn-secondary" type="button" onClick={() => goTo("brief")}>
            Refine brief
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              if (!selectedIdea) {
                pushNotice("warning", "Choose a concept", "Select one idea to feed the story writer.");
                return;
              }
              goTo("script");
            }}
          >
            Open story writer
          </button>
        </div>
      </SectionFrame>
    );
  }

  function renderScript() {
    return (
      <SectionFrame
        eyebrow="Story writer"
        title="Turn the chosen idea into scenes, narration, and production notes."
        description="This is the editorial spine of the video. Each scene includes narration, on-screen text, visual direction, and B-roll cues."
        actions={
          <div className="button-row">
            <div className="pill">{sceneCount} scenes</div>
            <button className="btn btn-primary" onClick={() => void generateScript()} type="button" disabled={pendingScript}>
              {pendingScript ? "Writing..." : "Write script"}
            </button>
          </div>
        }
      >
        <div className="grid-3">
          <div className="field">
            <label>Scene count</label>
            <select value={sceneCount} onChange={(event) => setSceneCount(Number(event.target.value))}>
              <option value={4}>4 scenes</option>
              <option value={5}>5 scenes</option>
              <option value={6}>6 scenes</option>
              <option value={8}>8 scenes</option>
            </select>
          </div>
          <div className="field">
            <label>Selected idea</label>
            <input value={selectedIdea?.title || "No idea selected"} readOnly />
          </div>
          <div className="field">
            <label>Format</label>
            <input value={selectedIdea?.format || "Waiting for prompt agent"} readOnly />
          </div>
        </div>

        {selectedIdea ? (
          <article className="subtle-item stack" style={{ gap: "0.45rem" }}>
            <strong>{selectedIdea.title}</strong>
            <p className="helper">{selectedIdea.hook}</p>
            <p className="helper">
              <strong>Audience promise:</strong> {selectedIdea.audiencePromise}
            </p>
          </article>
        ) : null}

        {script ? (
          <>
            <div className="grid-3">
              <div className="subtle-item">
                <div className="helper">Estimated duration</div>
                <strong>{formatDuration(script.estimatedDurationSeconds)}</strong>
              </div>
              <div className="subtle-item">
                <div className="helper">Word count</div>
                <strong>{script.wordCount}</strong>
              </div>
              <div className="subtle-item">
                <div className="helper">Call to action</div>
                <strong>{script.callToAction}</strong>
              </div>
            </div>

            <div className="scene-list">
              {script.scenes.map((scene) => (
                <article key={scene.id} className="scene-card stack">
                  <div className="scene-topline">
                    <div>
                      <span className="pill">{scene.kind}</span>
                      <h3 style={{ margin: "0.6rem 0 0.25rem" }}>
                        Scene {scene.order}: {scene.title}
                      </h3>
                    </div>
                    <span className="pill">{scene.durationSeconds}s</span>
                  </div>
                  <p className="helper">
                    <strong>Narration:</strong> {scene.narration}
                  </p>
                  <p className="helper">
                    <strong>Visual direction:</strong> {scene.visualDirection}
                  </p>
                  <p className="helper">
                    <strong>On-screen text:</strong> {scene.onScreenText}
                  </p>
                </article>
              ))}
            </div>
          </>
        ) : (
          <article className="subtle-item">
            <p className="helper">No story draft yet. Select a concept and let the story writer build it.</p>
          </article>
        )}

        <div className="button-row">
          <button className="btn btn-secondary" type="button" onClick={() => goTo("ideas")}>
            Back to ideas
          </button>
          <button className="btn btn-primary" type="button" onClick={() => goTo("images")} disabled={!script}>
            Open text-to-image
          </button>
        </div>
      </SectionFrame>
    );
  }

  function renderImages() {
    return (
      <SectionFrame
        eyebrow="Visual agent"
        title="Convert each story beat into text-to-image prompts and scene frames."
        description="Keep the auto-generated prompts or refine them scene by scene, then generate visuals for thumbnails, B-roll, or the final image-to-video pass."
        actions={
          <div className="button-row">
            <button className="btn btn-primary" onClick={() => void generateImages()} type="button" disabled={pendingImages}>
              {pendingImages ? "Rendering..." : "Generate images"}
            </button>
          </div>
        }
      >
        <div className="grid-3">
          <div className="field">
            <label>Aspect ratio</label>
            <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
              <option value="16:9">16:9 YouTube</option>
              <option value="9:16">9:16 Shorts</option>
              <option value="1:1">1:1 square</option>
            </select>
          </div>
          <div className="field">
            <label>Visual style</label>
            <input value={imageStyle} onChange={(event) => setImageStyle(event.target.value)} />
          </div>
          <div className="field">
            <label>Provider status</label>
            <input
              value={providerMode === "live" ? "Live image provider" : providerMode === "hybrid" ? "Hybrid visuals" : "Mock placeholder visuals"}
              readOnly
            />
          </div>
        </div>

        {script ? (
          <div className="scene-list">
            {script.scenes.map((scene) => (
              <article key={scene.id} className="scene-card stack">
                <div className="panel-title" style={{ marginBottom: 0 }}>
                  <div>
                    <strong>
                      Scene {scene.order}: {scene.title}
                    </strong>
                    <div className="helper">{scene.visualDirection}</div>
                  </div>
                  <span className="pill">{scene.kind}</span>
                </div>
                <textarea value={promptOverrides[scene.id] || ""} onChange={(event) => handlePromptChange(scene.id, event)} />
              </article>
            ))}
          </div>
        ) : (
          <article className="subtle-item">
            <p className="helper">Write the story first so the visual prompts have scene context.</p>
          </article>
        )}

        <div className="asset-grid">
          {assets.length ? (
            assets.map((asset) => (
              <article key={asset.id} className="asset-card">
                <img className="asset-thumb" src={asset.url} alt={asset.altText} />
                <div className="asset-body">
                  <strong>{asset.title}</strong>
                  <div className="helper">{asset.prompt}</div>
                  <div className="button-row">
                    <span className="pill">{asset.aspectRatio}</span>
                    <span className="pill">{asset.provider}</span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <article className="subtle-item">
              <p className="helper">Your generated frames will appear here.</p>
            </article>
          )}
        </div>
      </SectionFrame>
    );
  }

  function renderVoice() {
    return (
      <SectionFrame
        eyebrow="Voice agent"
        title="Read the script aloud with browser TTS and prep the narration pass."
        description="Browser speech works right away, so the voice stage is usable even before you add premium APIs."
        actions={
          <div className="button-row">
            <button className="btn btn-secondary" onClick={loadScriptIntoVoice} type="button">
              Load script
            </button>
            <button className="btn btn-primary" onClick={startSpeech} type="button">
              {speaking ? "Speaking..." : "Speak script"}
            </button>
          </div>
        }
      >
        <div className="grid-4">
          <div className="field">
            <label>Voice provider</label>
            <select value={voiceMode} onChange={(event) => setVoiceMode(event.target.value as "browser" | "elevenlabs")}>
              <option value="browser">Browser preview</option>
              <option value="elevenlabs">ElevenLabs export</option>
            </select>
          </div>
          <div className="field">
            <label>Voice</label>
            <select value={voiceName} onChange={(event) => setVoiceName(event.target.value)}>
              {voices.map((voice) => (
                <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Speed</label>
            <input type="range" min="0.6" max="1.6" step="0.1" value={voiceRate} onChange={(event) => setVoiceRate(Number(event.target.value))} />
          </div>
          <div className="field">
            <label>Pitch</label>
            <input type="range" min="0.6" max="1.6" step="0.1" value={voicePitch} onChange={(event) => setVoicePitch(Number(event.target.value))} />
          </div>
          <div className="field">
            <label>Volume</label>
            <input type="range" min="0.2" max="1" step="0.05" value={voiceVolume} onChange={(event) => setVoiceVolume(Number(event.target.value))} />
          </div>
        </div>

        <div className="field">
          <label>Narration script</label>
          <textarea value={voiceScript} onChange={(event) => setVoiceScript(event.target.value)} />
        </div>

        <div className="grid-2">
          <article className="subtle-item stack">
            <strong>Waveform</strong>
            <div className="audio-wave" style={{ opacity: speaking ? 1 : 0.4 }}>
              {Array.from({ length: 7 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <div className="button-row">
              <button className="btn btn-secondary" type="button" onClick={pauseSpeech} disabled={!speaking}>
                {paused ? "Resume" : "Pause"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={stopSpeech}>
                Stop
              </button>
              <button className="btn btn-primary" type="button" onClick={() => void generateVoiceAudio()} disabled={voiceGenerating}>
                {voiceGenerating ? "Generating audio..." : "Generate audio file"}
              </button>
            </div>
          </article>

          <article className="subtle-item stack">
            <strong>Voice routing</strong>
            <p className="helper">
              Browser TTS is active today. For premium voice output later, add an ElevenLabs server proxy and keep the same UI layer.
            </p>
            <div className="button-row">
              <ProviderBadge status={providers.browser.status} />
              <ProviderBadge status={providers.elevenlabs.status} />
            </div>
            {voiceAudioUrl ? (
              <audio controls src={voiceAudioUrl} />
            ) : (
              <div className="helper">Generated voice audio will appear here when the export route returns a file.</div>
            )}
          </article>
        </div>
      </SectionFrame>
    );
  }

  function renderVideo() {
    return (
      <SectionFrame
        eyebrow="Image to video"
        title="Assemble your scene frames into a browser video preview."
        description="This stage turns the generated images into a motion sequence with simple camera moves, text overlays, and exportable WebM output."
        actions={
          <div className="button-row">
            <button className="btn btn-secondary" onClick={previewSequence} type="button">
              Preview sequence
            </button>
            <button className="btn btn-primary" onClick={() => void assembleVideo()} type="button" disabled={pendingVideo}>
              {pendingVideo ? "Assembling..." : "Assemble video"}
            </button>
          </div>
        }
      >
        <div className="grid-3">
          <div className="field">
            <label>Video provider</label>
            <select value={aiVideoMode} onChange={(event) => setAiVideoMode(event.target.value as "browser" | "replicate")}>
              <option value="browser">Browser WebM builder</option>
              <option value="replicate">AI video route</option>
            </select>
          </div>
          <div className="field">
            <label>Duration per scene</label>
            <select value={durationPerScene} onChange={(event) => setDurationPerScene(Number(event.target.value))}>
              <option value={3}>3 seconds</option>
              <option value={4}>4 seconds</option>
              <option value={5}>5 seconds</option>
              <option value={6}>6 seconds</option>
            </select>
          </div>
          <div className="field">
            <label>Motion style</label>
            <select value={motionStyle} onChange={(event) => setMotionStyle(event.target.value as "gentle-zoom" | "push-left" | "push-right" | "cut")}>
              <option value="gentle-zoom">Gentle zoom</option>
              <option value="push-left">Push left</option>
              <option value="push-right">Push right</option>
              <option value="cut">Static cut</option>
            </select>
          </div>
          <div className="field">
            <label>Overlay</label>
            <select value={overlayMode} onChange={(event) => setOverlayMode(event.target.value as "title" | "progress" | "none")}>
              <option value="title">Scene title</option>
              <option value="progress">Progress bar</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>AI video prompt</label>
          <textarea value={aiVideoPrompt} onChange={(event) => setAiVideoPrompt(event.target.value)} />
        </div>

        <div className="canvas-shell">
          <canvas ref={canvasRef} width={1280} height={720} />
        </div>

        <div className="timeline-row">
          {assets.map((asset, index) => (
            <article key={asset.id} className={`timeline-thumb ${previewIndex === index ? "active" : ""}`}>
              <button
                type="button"
                onClick={() => {
                  setPreviewIndex(index);
                  void previewAsset(index, 0.4);
                }}
              >
                <img src={asset.url} alt={asset.altText} />
              </button>
            </article>
          ))}
        </div>

        <div className="grid-2">
          <article className="subtle-item stack">
            <strong>Export status</strong>
            <div className="helper">{videoStatus}</div>
            <div className="pill">{videoProgress}%</div>
            <div className="button-row">
              <button className="btn btn-secondary" type="button" onClick={downloadVideo} disabled={!videoUrl}>
                Download WebM
              </button>
              <button className="btn btn-primary" type="button" onClick={() => void generateAiVideo()} disabled={aiVideoGenerating}>
                {aiVideoGenerating ? "Generating AI video..." : "Generate AI video"}
              </button>
            </div>
          </article>

          <article className="subtle-item stack">
            <strong>Result</strong>
            {aiVideoUrl ? (
              <div className="canvas-shell">
                <video src={aiVideoUrl} controls />
              </div>
            ) : videoUrl ? (
              <div className="canvas-shell">
                <video src={videoUrl} controls />
              </div>
            ) : (
              <p className="helper">Assemble the website preview or request AI video generation to see the result here.</p>
            )}
          </article>
        </div>
      </SectionFrame>
    );
  }

  return (
    <>
      <div className="site-shell">
        <header className="site-nav">
          <a className="site-brand display-font" href="#dashboard">
            YT Studio AI
          </a>
          <nav className="site-nav-links" aria-label="Section navigation">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`site-link ${item.active ? "active" : ""}`}
                onClick={() => setPanel(item.href.replace("#", "") as Panel)}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="site-nav-actions">{headerActions}</div>
        </header>

        <main className="site-main">
          <section id="dashboard" className="site-section stack">
            {renderDashboard()}
          </section>
          <section id="brief" className="site-section">
            {renderBrief()}
          </section>
          <section id="ideas" className="site-section">
            {renderIdeas()}
          </section>
          <section id="script" className="site-section">
            {renderScript()}
          </section>
          <section id="images" className="site-section">
            {renderImages()}
          </section>
          <section id="voice" className="site-section">
            {renderVoice()}
          </section>
          <section id="video" className="site-section">
            {renderVideo()}
          </section>
        </main>

        <footer className="site-footer">
          <div className="helper">
            Browser-first website for your YouTube production team. Mock mode works immediately; add server env vars to unlock live provider calls and deploy to GitHub + Vercel when ready.
          </div>
        </footer>
      </div>

      <div className="notice-stack">
        {notices.map((notice) => (
          <article key={notice.id} className={`notice ${notice.tone}`}>
            <strong>{notice.title}</strong>
            <div className="helper">{notice.message}</div>
          </article>
        ))}
      </div>
    </>
  );
}
