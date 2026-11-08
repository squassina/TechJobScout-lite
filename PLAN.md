# TechJobScout Lite — Architecture and migration decisions

## Product scope
A static, browser-only tool for technology professionals across roles and seniority levels. Preserve the original job discovery, explainable matching, CV/JD review, STAR preparation and local-agent export workflow while removing all application-server and database dependencies.

## Architecture
- `index.html`: semantic UI and dialogs.
- `styles.css`: responsive presentation.
- `app.js`: UI orchestration and in-memory application state.\n- `src/core/text.js`: safe text and URL helpers.\n- `src/jobs/matching.js`: pure relevance, location and scoring functions.\n- `src/ats/normalizers.js`: ATS response normalization, HTML cleanup and published/updated date mapping.
- Static deployment: GitHub Pages or any HTTPS static host.
- No backend, database, account, analytics, telemetry, service worker or session persistence.

## Persistence and privacy
- Session data (CV, candidate profile, board configuration, search results and STAR stories) lives only in JavaScript memory.
- LocalStorage is restricted to provider API keys explicitly saved by the user under `tjs_lite_api_keys`; browser LocalStorage is not encrypted.
- Provider/model/base URL settings are session-only.
- Every AI action that includes CV or job details requires an explicit consent prompt.
- AI requests are sent from the browser directly to the selected provider. Provider CORS and privacy terms apply.
- Export files are created only on explicit user action.

## ATS coverage
Direct browser fetch integrations: Greenhouse, Ashby, Lever, Workable, SmartRecruiters, Recruitee and Gupy. Manual HTTPS links cover Workday and other ATS systems that lack a suitable public CORS-enabled API. Browser CORS failures are surfaced per board; no proxy is introduced.

## Matching
Client-side explainable heuristic score (0–100): base score, seniority title signal, title keyword overlap, description keyword overlap and location signal. Candidate-specific skill overlap is displayed separately. The score is a triage aid, not a hiring prediction.

## AI providers
OpenAI, Gemini, Anthropic, Ollama and configurable OpenAI-compatible endpoints. Provider CORS and browser-access support are prerequisites. API keys may be kept in memory or explicitly saved in LocalStorage.

## Job-description analysis\nA pasted job description can be analyzed against the CV after a dedicated explicit consent prompt.\n\n## Agent export
ZIP and individual downloads contain AGENTS.md, CLAUDE.md, README.md, candidate-profile.json, jobs.json, star-stories.json and reusable prompts. Draft stories are clearly marked and agent instructions prohibit invented facts.

## Deliberate limitations
- No server-side CORS proxy, scraping proxy, scheduled search, persistent history, notifications or background jobs.
- ATS coverage depends on the vendor's public endpoint and CORS policy.
- Scanned PDFs need OCR outside the current client-side text extraction flow.
- External provider requests are subject to provider availability, CORS, model access and billing.
