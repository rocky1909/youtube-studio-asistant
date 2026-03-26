# YT Studio AI Website

A Next.js + TypeScript site for an agentic YouTube production workflow. It runs as a browser-based studio, starts in mock mode without API keys, and can switch to live providers when you add server environment variables.

## What It Does

- Turns a channel brief into ideas, scripts, image prompts, browser TTS output, and preview assets.
- Keeps mock data available so the website is useful before any paid APIs are connected.
- Supports a gradual path to live providers for teams that want real generation in production.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000` after the dev server starts.

## Environment Variables

Copy `.env.example` to `.env.local` for local development.

Mock mode works with no keys at all. Live provider mode is enabled gradually as you add the variables below:

- `ANTHROPIC_API_KEY`: live idea and script generation.
- `ANTHROPIC_MODEL`: optional Anthropic model override.
- `HUGGINGFACE_API_KEY`: live image generation.
- `HUGGINGFACE_IMAGE_MODEL`: optional Hugging Face image model override.
- `ELEVENLABS_API_KEY`: live text-to-voice generation.
- `ELEVENLABS_VOICE_ID`: optional ElevenLabs default voice.
- `ELEVENLABS_MODEL_ID`: optional ElevenLabs model override.
- `REPLICATE_API_TOKEN`: live image-to-video or media generation.
- `REPLICATE_MODEL`: shared Replicate model fallback.
- `REPLICATE_IMAGE_MODEL`: optional Replicate image model override.
- `REPLICATE_VIDEO_MODEL`: optional Replicate video model override.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY`: client auth and team connectivity.
- `SUPABASE_SERVICE_ROLE_KEY`: server-side team storage and shared history.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: optional public aliases if you prefer the standard Next.js naming pattern.
- `TEAM_PROJECTS_TABLE`, `TEAM_SNAPSHOTS_TABLE`, `TEAM_HISTORY_TABLE`: optional custom table names.

Browser TTS stays available even when the API keys are empty, and the media routes fall back to mock output when live providers are not configured.

## Mock Mode

Mock mode is the default and is safe for local development, previews, and demos. It gives the team a full workflow without waiting on API credentials or provider quotas.

Use mock mode when:

- You want to validate the UI and flow first.
- You are setting up a preview branch for GitHub or Vercel.
- You are waiting on shared credentials from the team.

## Live Providers

The app checks provider availability from the server environment and upgrades features as keys are added.

- Add Anthropic for live ideation and script drafting.
- Add Hugging Face for live image generation.
- Add ElevenLabs for server-generated narration audio.
- Add Replicate for live AI video or media generation.
- Add OpenAI or Google keys when your team wants those providers reflected in the studio status panel or for future workflows.

If a provider key is missing, the app falls back to mock output instead of failing the whole studio flow.

## Supabase Team Setup

Supabase is optional, but this project now includes routes and schema for team auth, shared project snapshots, and shared history.

Recommended team setup:

- Create one Supabase project per environment, usually one for local/dev and one for production.
- Apply the schema in [supabase/schema.sql](./supabase/schema.sql).
- Keep the Supabase URL and anon key in `.env.local` for local development.
- Store the same production secrets in Vercel project settings and GitHub secrets, not in the repo.
- Use the Supabase service role key only on the server side if you later add server actions or route handlers that need elevated access.
- Keep schema changes in the repo so teammates can reproduce the database state.

## Deployment

### GitHub

1. Push the repo to GitHub.
2. Let the repository stay as the source of truth for code and workflow changes.
3. Use pull requests so the CI build runs before merge.

### GitHub Actions CI

The repo includes a build workflow that installs dependencies and runs `npm run build` on pushes and pull requests. This catches type, compile, and routing issues before they reach Vercel.

### Vercel

1. Import the GitHub repo into Vercel.
2. Keep the default Next.js framework detection unless you have a specific reason to override it.
3. Add the same environment variables in the Vercel project settings that you use locally.
4. Deploy previews from pull requests, then merge to promote the same code to production.

### Deployment Flow For The Team

1. Work locally in mock mode first.
2. Open a pull request and let CI confirm the build.
3. Add or update secrets in Vercel when a live provider is needed.
4. Review the preview deployment.
5. Merge after the preview looks correct.

## Notes

- `npm run build` is the main verification step for this project.
- If you only need the website in mock mode, no API keys are required.
- The workflow is designed to be GitHub-friendly first and Vercel-friendly second, so teammates can review changes before shipping them live.
