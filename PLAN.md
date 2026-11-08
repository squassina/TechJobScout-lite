# TechJobScout Lite — Architecture and migration decisions

## Product scope
A static, browser-only tool for technology professionals across roles and seniority levels. Preserve the original job discovery, explainable matching, CV/JD review, STAR preparation and local-agent export workflow while removing all application-server and database dependencies.

## Architecture
- `index.html`: semantic UI and dialogs.
- `styles.css`: responsive presentation.
- `app.js`: in-memory state, PDF extraction, ATS fetchers, matching, AI provider adapters, STAR editor and export generation.
- Static deployment: GitHub Pages or any HTTPS static host.
- No backend, database, account, analytics, telemetry, service worker or session persistence.

## Persistence and privacy
- Session data (CV, candidate profile, board configuration, search results and STAR stories) lives only in JavaScript memory.
- LocalStorage is restricted to explicitly saved provider API keys under `tjs_lite_api_keys`.
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

## Agent export
ZIP and individual downloads contain AGENTS.md, README.md, candidate-profile.json, jobs.json, star-stories.json and reusable prompts. Draft stories are clearly marked and agent instructions prohibit invented facts.

## Deliberate limitations
- No server-side CORS proxy, scraping proxy, scheduled search, persistent history, notifications or background jobs.
- ATS coverage depends on the vendor's public endpoint and CORS policy.
- Scanned PDFs need OCR outside the current client-side text extraction flow.
- External provider requests are subject to provider availability, CORS, model access and billing.
