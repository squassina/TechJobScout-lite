# TechJobScout Lite

**Browser-only job discovery, CV matching, STAR preparation and local-agent export.**

TechJobScout Lite is a static HTML/CSS/JavaScript application. It has no application server, Python runtime, database, account system or telemetry endpoint. Host the repository on GitHub Pages or any static HTTPS host.

## Features

- Import PDF, TXT or Markdown CVs, or paste resume text. PDF extraction uses PDF.js in the browser.
- Configure an LLM in Step 0, then extract a structured candidate profile and refresh search preferences whenever a new CV is uploaded (with explicit per-upload consent); local extraction remains available as a fallback.
- Search public job-board APIs for Greenhouse, Ashby, Lever, Workable, SmartRecruiters, Recruitee and Gupy.
- Add company boards manually, including manual HTTPS links for Workday and other platforms.
- Run explainable keyword/seniority/location fit scoring, filter and sort opportunities, inspect score components, preview cleaned job descriptions in-app and export matched jobs.
- Prepare initial STAR drafts with a configured LLM after explicit per-request consent. Every generated story is marked as a draft for candidate verification.
- Export an agent workspace as a ZIP or select individual files for download for Codex, Claude Code or compatible local agents.
- Configure your own OpenAI, Gemini, Anthropic, DeepSeek or Moonshot Kimi API key and load models available to that key into a dropdown.\n- Advanced users can connect their own LiteLLM Proxy, Ollama, LM Studio or other OpenAI-compatible local endpoint. TechJobScout does not operate a shared gateway or pay for model usage.

## Run locally

No build step or package manager is required. Serve the folder over localhost (browser APIs and cross-origin ATS requests are more reliable over HTTP(S) than `file://`):

```bash
npx --yes http-server . -p 8000
```

Open <http://localhost:8000>. The optional local static-file server uses Node.js; the application itself is plain HTML, CSS and JavaScript. Alternatively, GitHub Pages is deployed by GitHub Actions after the `Static client validation` workflow succeeds on `master`. The deploy workflow also supports manual execution from the Actions tab. In repository settings, set **Pages → Build and deployment → Source: GitHub Actions**.

## Privacy model

- CV contents, extracted profile, board additions, job results and STAR stories are held in JavaScript memory only.
- The app does not write session data, search history, profile fields, or job results to LocalStorage, IndexedDB, cookies or a database.
- API keys remain in memory by default. Only explicit opt-in saves them in LocalStorage under `tjs_lite_api_keys`; browser LocalStorage is not encrypted. Users can delete saved keys from API settings.
- Before an AI request that includes CV or job information, the app asks for explicit consent. Data is sent directly from the browser to the selected provider, under that provider's terms. The TechJobScout project does not proxy or retain the request.
- Closing or reloading the tab clears session data. Exported files are created only when the user requests them and become the user's responsibility.
- API keys entered into a provider request are transmitted directly to that provider. Browser-based access may require provider-side CORS support or browser access configuration.

## ATS coverage and limitations

| ATS | Browser integration | Notes |
|---|---|---|
| Greenhouse | Public job-board API | Board slug required |
| Ashby | Public posting API | Board name required |
| Lever | Public postings API | Site slug required |
| Workable | Public widget API | Account slug required |
| SmartRecruiters | Public postings API | Board/company ID; detail fetch is best-effort |
| Recruitee | Public offers API | Company subdomain required |
| Gupy | Public jobs API | Numeric company ID; paginated |
| Workday / other | Manual link | External search/open only; no scraping proxy |

**CORS is a browser security boundary.** A public API can still be inaccessible to a static website if its server does not allow the website's origin. The app reports these source failures rather than pretending the search succeeded. Workday and other non-supported ATS boards can be added as manual HTTPS links. No CORS proxy or third-party scraping service is used because that would undermine the privacy and no-backend design.

CV upload in Step 0 uses the selected LLM to update both candidate fields and search preferences. Every upload requires explicit consent before the CV is sent to the provider; declining uses local extraction instead. A dedicated CV-to-job-description analysis is also available. The CV and pasted JD are sent to the provider only after a separate explicit consent prompt.\n\nTarget roles and candidate skills contribute to relevance and scoring. An empty allowed-location list means unrestricted geography, and excluded locations always take precedence.\n\n## Matching model

The Fit Score is an evidence-based assessment (0–100), not a hiring prediction. It evaluates six dimensions:

| Criterion | Weight |
|---|---:|
| Technical and functional skills | 25% |
| Experience and responsibilities | 25% |
| Target role alignment | 15% |
| Seniority | 15% |
| Industry and business context | 10% |
| Education and certifications | 10% |

Each criterion is assessed against information available in both the job posting and the candidate profile. Criteria without enough evidence are marked **Unknown** and excluded from the score denominator; they are not treated as a match or a mismatch. The displayed **Assessment Coverage** indicates how much of the weighted model could be evaluated. As a result, a Fit Score should always be read together with its coverage and the supporting job/CV evidence.

Eligibility is reported separately from Fit Score. Location and work-modality preferences can be compared when the candidate has supplied them. Work authorization and language requirements remain unconfirmed unless the available profile provides sufficient evidence. An unknown eligibility status is not a rejection.

Jobs are not hidden solely because a location preference is unmet; review the eligibility indicators before deciding whether to apply. Excluded title terms remain a search filter. Always review the original posting and verify its current status.

## AI providers

- OpenAI: Chat Completions-compatible endpoint.
- Gemini: `generateContent` API.
- Anthropic: Messages API with browser access header.
- Ollama: local `/api/chat` endpoint.
- OpenAI-compatible: custom endpoint for compatible services such as LiteLLM or llama.cpp.

Providers must allow browser-origin requests. Some providers disable CORS or require additional account settings. Local Ollama requires its server to allow the browser origin. API keys are never embedded in the repository.

## Local agent package

The export includes `AGENTS.md`, `CLAUDE.md`, `README.md`, `candidate-profile.json`, `jobs.json`, `star-stories.json`, and reusable prompts. The package is assembled in the browser using JSZip; individual file downloads are also available. Review all personal information and draft stories before sharing the exported package with a local agent or anyone else.

## Development and validation

The app remains static and uses native ES modules without a bundler. ATS results are normalized with published/updated dates where available; Gupy and SmartRecruiters use bounded pagination, request timeouts and limited parallel detail fetches. Validate all modules and run automated tests with:

```bash
npm run check
npm test
```

Run the application through a static HTTP server and test each configured ATS board, since external APIs and CORS policies are outside the repository's control.

## License

See [LICENSE](LICENSE).
