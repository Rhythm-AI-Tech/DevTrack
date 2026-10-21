# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)


## Developer ecosystem features

### AI coding assistant
The floating assistant calls `POST /api/v1/ai/chat` with the signed-in user's bearer token. Configure `GEMINI_API_KEY` on the backend only; never add it to a `REACT_APP_*` variable or commit it. The default model is `gemini-3.8-flash` and can be changed with `GEMINI_MODEL`. The route accepts short chat history, validates input length, and applies a per-user in-process rate limit. It returns a complete JSON response rather than token-by-token streaming.

### Profile verification and contribution activity
LeetCode and Codeforces use the existing ownership challenge flow in Settings. Add the generated challenge to the platform's supported profile field, then run verification. AtCoder and Codewars are presented as public-profile connectors; GFG and HackerRank can be saved as public links where automatic metrics are not available, and a public link is not proof of ownership. The Dashboard platform selector is populated from the signed-in user's saved profile connections and intentionally has no combined “All Platforms” view. Every summary card and chart is scoped to that selected platform.

LeetCode lifetime solved counts and Easy/Medium/Hard totals come from the same saved profile snapshot. A best-effort public GraphQL query also requests contest rating, global ranking, top percentage, attended-contest count, badge, and recent contest history. The query is unofficial and may be throttled or changed by LeetCode; use **Sync & refresh** to update an older profile snapshot. Codeforces rating, maximum rating, and official rank are scoped only to Codeforces. AtCoder/Codeforces fetched-history counts are not labelled as lifetime totals. The heatmap filters records by selected platform in the backend; it does not reuse combined daily totals for each platform.

### Developer API key
Generate a personal key under Settings → Developer Integrations Hub. The server stores only a SHA-256 hash, not the raw token. Copy the key immediately after generation; the full value cannot be recovered later. API requests use `x-api-key` and can read up to 500 most-recent activity records through `GET /api/v1/data/activity`. Regenerating invalidates the previous key.

### Profile badge
The public SVG badge is available at `/api/v1/badge/:userId`. It reports records imported from synced platform integrations, not hand-entered problem logs. Because the badge endpoint is public, its aggregate count is intentionally minimal.

### Theme and integrations
Dark mode is initialized in the HTML head before React loads to reduce theme flash. The navbar toggle persists the preference in `localStorage`. Webhook preferences are saved to the authenticated user's MongoDB document. When enabled with a valid HTTPS destination, creating a problem triggers a best-effort JSON `problem.created` POST; failed delivery does not undo the saved record. Test with a receiver and do not rely on it as a guaranteed delivery queue.

### Environment and deployment
1. Install frontend dependencies from the repository root and backend dependencies from `server/`.
2. Copy `.env.example` to `.env` for the frontend and `server/.env.example` to `server/.env`.
3. Set a real MongoDB connection string, a long random `JWT_SECRET`, and the backend-only `GEMINI_API_KEY`.
4. Set `CORS_ORIGINS` to a comma-separated allowlist containing your exact deployed frontend origin(s).
5. Deploy the API and frontend separately if desired. Set `REACT_APP_API_URL` to the deployed API base ending in `/api`.
6. Use HTTPS in production. Do not commit environment files or expose API keys in browser bundles.

## API routes added
- `POST /api/v1/ai/chat` — authenticated AI chat.
- `GET /api/v1/activity/heatmap` — authenticated 365-day synced activity grid.
- `GET /api/v1/badge/:userId` — public SVG badge.
- `GET /api/v1/keys`, `POST /api/v1/keys/regenerate`, `DELETE /api/v1/keys` — authenticated key lifecycle.
- `GET /api/v1/data/activity` — API-key authenticated activity data.


## Webhook event delivery

In **Settings → Developer Integrations Hub**, enter an HTTPS endpoint you control and choose **Save & enable**. DevTracker stores this preference on the authenticated MongoDB user document and sends a best-effort `POST` with `event: "problem.created"` after a problem is saved. The JSON body includes the problem id, title, platform, difficulty, solved date, and topics. Delivery has a five-second timeout and its status is recorded in the user's webhook settings. Failed delivery does not roll back the saved problem.

Authenticated endpoint: `GET /api/v1/webhooks` reads the preference and `PUT /api/v1/webhooks` accepts `{ "enabled": true, "targetUrl": "https://your-service.example/webhooks/devtracker" }`. Only HTTPS targets are accepted; localhost and obvious private-network destinations are rejected. Configure a receiver that verifies requests according to your own application's security requirements before processing events.
