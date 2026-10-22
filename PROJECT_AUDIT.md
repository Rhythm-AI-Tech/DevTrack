# DevTracker implementation audit

## Implemented in this refactor
- Floating AI assistant UI with quick prompts, conversation history, loading dots, error states, and an authenticated backend controller using the official Google GenAI Node SDK.
- Backend-only Gemini configuration and per-user request throttling.
- Existing LeetCode/Codeforces profile ownership challenge remains the authoritative verification path; AtCoder and Codewars remain clearly labelled public-profile sources.
- Manual-only GeeksforGeeks, CodeChef, and HackerRank integrations are removed from the visible provider registry because this codebase does not contain a reliable automated personal-history connector for them.
- Protected cross-platform heatmap endpoint, populated only by imported/verified-sync records.
- SVG profile README badge route.
- Personal API key generation/revocation and API-key protected activity endpoint. Raw keys are not persisted.
- Persistent dark/light theme toggle initialized before React startup.
- Responsive daily activity bars, difficulty donut, and GitHub-style contribution grid.
- Environment examples and deployment notes.

## Limitations that must remain explicit
- Live external-platform requests were not run as part of this offline archive refactor. External services may change their profile fields, API behavior, rate limits, or markup.
- AI calls require a real `GEMINI_API_KEY`, a reachable Gemini API, and installed server dependencies. No secret is bundled.
- The current chat endpoint returns complete JSON responses; streaming is not implemented.
- Webhook settings are persisted per user and problem creation triggers a best-effort HTTPS `problem.created` POST. Delivery retries and signed payloads are not implemented; test the feature with a receiver before relying on it.
- API keys are displayed only immediately after generation and cannot be retrieved later. The API currently exposes recent activity records (up to 500), not arbitrary private database collections.
- The heatmap does not manufacture historical submission data. It reflects records imported into DevTracker by supported sync operations.


## Follow-up corrections (2026-10-21)
- Dark-mode text contrast is enforced with near-white headings and silver supporting copy.
- Dashboard metrics are now isolated to one selected saved profile. LeetCode lifetime solved and Easy/Medium/Hard counts come from the same saved LeetCode profile snapshot; Codeforces rating/max rating/rank are read only from the selected Codeforces snapshot.
- The AI chat route is protected by JWT middleware. The controller queries user-scoped problems, goals, and projects, then injects that authenticated user snapshot into Gemini system instructions. Cached third-party profile metrics are labeled as potentially stale.

## AI reliability update

The authenticated Gemini chat retries transient 429/5xx/unavailable errors with bounded backoff. For weekly/progress summary prompts, if Gemini remains unavailable, the API returns a deterministic summary built from the same authenticated user-scoped MongoDB snapshot. Other prompts return a clear temporary error. Tests cover retry behavior, status extraction, and the local summary fallback. Live Gemini and MongoDB integration still require validation in the deployment environment.

## Follow-up workspace corrections (2026-10-21)

- The Dashboard header selector is populated from the signed-in user's saved verified/public profile connections for LeetCode, Codeforces, AtCoder, Codewars, GeeksforGeeks, and HackerRank. There is no All Platforms aggregator option. The selected profile controls the summary cards, platform metrics, daily activity chart, difficulty chart, and heatmap.
- Removed HackerEarth from the Coding page's user-facing platform choices. The legacy schema enum is retained so historical records do not become invalid.
- Added public-link-only integration entries for GeeksforGeeks and HackerRank. These save a public username/profile URL and do not claim ownership verification or fabricate profile statistics when automated access is unavailable.
- Extended the dashboard and AI context to include selected public profiles while preserving their `public-unverified` status.
- Added a consistent high-contrast dark palette across legacy workspace styles and retained the persisted theme toggle.
- Validation: React production build succeeded; all 30 frontend JS/JSX files parsed; backend source files passed `node --check`. The server test suite's four AI reliability tests passed, but its server smoke test could not load `cors` because the isolated test environment did not have server dependencies installed. Install backend dependencies in the project before running the complete server test suite.


## Theme consistency and final validation (2026-10-21)

- Replaced the repeated global contrast fragments with a single set of light/dark design tokens in `src/index.css`.
- Added `src/theme-overrides.css` as the final-loaded, explicit selector layer for legacy Dashboard, Coding, GitHub, DSA, Projects, Goals, and Settings cards, controls, alerts, and typography.
- Normalized the browser preference to `devtrack_theme` across Navbar, Login, Register, and the early theme initialization in `public/index.html`; auth screens now apply the same selected theme as the workspace.
- Updated page title and description metadata.
- Validation: production React build succeeded; 70 frontend JavaScript/JSX files parsed; CSS parser checks passed; backend Node test suite passed 8/8. External platform requests and a live Gemini response were not tested.


## Platform isolation correction (2026-10-21)

- Removed the Dashboard's hard-coded `All Platforms` option and the cross-platform aggregate summary cards. The selector contains only saved platform connections for the current account; pending, unconnected, or unsupported provider states are excluded.
- LeetCode profile totals and its Easy/Medium/Hard values now come from the same profile statistics snapshot rather than mixing the profile lifetime total with only manually logged problems. Its public contest GraphQL request now fetches contest rating, global contest rank, top percentage, attended-contest count, badge, and a bounded recent history. This endpoint is unofficial/best-effort and only updates the stored snapshot when the user syncs.
- Codeforces rating, maximum rating, official rank, and fetched-history solved counts are rendered in the Codeforces-only context. Fetched-history counts are labelled as non-lifetime statistics.
- The activity heatmap now requires a selected supported platform and filters at the MongoDB query level, so a day's count from one platform cannot be reused for another platform's heatmap.
- GFG/HackerRank connections remain link-only when automated public statistics are unavailable, with external profile links rather than invented values.
- Validation for this correction: the Create React App production build compiled successfully; 73 frontend JavaScript/JSX files parsed; 42 backend JavaScript files passed `node --check`; external LeetCode/Codeforces requests were not run as part of the archive build.


## UI and achievement refinement
- Rebuilt the workspace sidebar as a coherent high-contrast zinc surface with readable inactive text, a clear active indicator, custom focus rings, and responsive compact navigation.
- Replaced the Dashboard platform context native menu with a themed accessible dropdown. Its options are limited to linked profiles with a saved sync timestamp or persisted profile-stat snapshot; dashboard cards, graphs and heatmap continue to share the same selected platform state.
- Applied dark color-scheme, consistent padding, contrast, focus and arrow styling to remaining native form selects and inputs.
- Added the authenticated `/api/achievements` endpoint and persisted unlocked badge records on the user schema. Current unlock evaluation uses user-scoped saved problems/activity dates, LeetCode lifetime stats when present, explicitly recorded languages, connected profiles, completed goals and projects.
- Added an optional language field to logged problems so the Polyglot milestone depends on real language selections; existing records remain `Unknown` and do not falsely count toward the badge.
- Added a responsive achievement grid to the Dashboard and Settings while retaining the existing API credentials console, copy/reveal/regenerate/revoke workflow, webhook controls, and public badge preview.
- LeetCode contest-rating parsing and authenticated AI context already existed in the uploaded project and have been retained rather than duplicated. HackerEarth remains absent from Coding page platform options.
