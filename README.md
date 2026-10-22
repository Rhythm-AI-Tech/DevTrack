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
The floating assistant calls `POST /api/v1/ai/chat` with the signed-in user's bearer token. Configure `GEMINI_API_KEY` on the backend only; never add it to a `REACT_APP_*` variable or commit it. The default model is `gemini-3.5-flash-lite` and can be changed with `GEMINI_MODEL`. The assistant uses server-side model fallback and the authenticated `/api/v1/ai/chat/stream` endpoint to stream text as it arrives. The non-streaming `/api/v1/ai/chat` endpoint remains available. The routes validate input length and apply a per-user in-process rate limit.

### Profile verification and contribution activity
LeetCode and Codeforces use the existing ownership challenge flow in Settings. Add the generated challenge to the platform's supported profile field, then run verification. AtCoder and Codewars are presented as public-profile connectors; GFG and HackerRank can be saved as public links where automatic metrics are not available, and a public link is not proof of ownership. The Dashboard platform selector is populated from the signed-in user's saved profile connections and intentionally has no combined “All Platforms” view. Every summary card and chart is scoped to that selected platform.

LeetCode lifetime solved counts and Easy/Medium/Hard totals come from the same saved profile snapshot. A best-effort public GraphQL query also requests contest rating, global ranking, top percentage, attended-contest count, badge, and recent contest history. The query is unofficial and may be throttled or changed by LeetCode; use **Sync & refresh** to update an older profile snapshot. Codeforces rating, maximum rating, and official rank are scoped only to Codeforces. AtCoder/Codeforces fetched-history counts are not labelled as lifetime totals. The Dashboard contribution matrix and 30-day activity chart share the same selected-platform activity calendar. LeetCode uses its public `submissionCalendar` GraphQL field when sync succeeds; Codeforces and AtCoder use public submission timestamps, and Codewars uses completed-challenge history. GeeksforGeeks and HackerRank currently use DevTracker records because this connector does not have a supported public activity feed. The UI names the source and labels the counts so saved logs are not mistaken for an external profile calendar.

### Theme and integrations

The selected light/dark theme is initialized from `localStorage` before React mounts, and the workspace surfaces follow the same theme tokens. Legacy badge, personal API-key, and webhook utilities have been removed from Settings and the Express API.

### Environment and deployment
1. Install frontend dependencies from the repository root and backend dependencies from `server/`.
2. Copy `.env.example` to `.env` for the frontend and `server/.env.example` to `server/.env`.
3. Set a real MongoDB connection string, a long random `JWT_SECRET`, and the backend-only `GEMINI_API_KEY`.
4. Set `CORS_ORIGINS` to a comma-separated allowlist containing your exact deployed frontend origin(s).
5. Deploy the API and frontend separately if desired. Set `REACT_APP_API_URL` to the deployed API base ending in `/api`.
6. Use HTTPS in production. Do not commit environment files or expose API keys in browser bundles.

## API routes in this build
- `POST /api/v1/ai/chat` — authenticated AI chat.
- `GET /api/v1/activity/heatmap` — authenticated 365-day selected-platform activity grid.

### Contribution calendars and AI response speed

- LeetCode's contribution heatmap uses the public `userCalendar.submissionCalendar` data (year slices merged and normalized by UTC date), not the limited set of individual accepted problems imported into DevTracker.
- Codeforces uses the user's public submission history, AtCoder uses its public submissions API and a paged calendar cursor, and Codewars uses public completed-challenge history. These may be marked partial when the upstream API limits the fetched window. GeeksforGeeks and HackerRank currently show DevTracker's saved records because this connector does not fetch a supported public activity feed for them.
- The chatbot uses the low-latency `gemini-3.5-flash-lite` model by default, can fall back to `gemini-3.8-flash`, `gemini-3.6-flash`, and `gemini-3.1-flash-lite`, and streams answer tokens from `/api/v1/ai/chat/stream`. To override the default, set `GEMINI_MODEL` in `server/.env`.


## Open DevTracker on your phone (same Wi-Fi)

This runs the existing web app in your phone browser; it does not require a separate mobile app. Keep your laptop running while using this local setup.

1. Connect the phone and laptop to the **same Wi-Fi**.
2. Find the laptop's private IPv4 address. On Windows, run `ipconfig` and copy the Wi-Fi adapter's IPv4 address (for example `192.168.1.25`). Do not use `127.0.0.1` or `localhost` for the phone.
3. In the frontend project root, create `.env.local` with this line, replacing the sample IP with your laptop's address:

   ```env
   REACT_APP_API_URL=http://192.168.1.25:5000/api
   ```

4. In `server/.env`, set `CORS_ORIGINS` to include the frontend address the phone will open. For example, if the laptop IP is `192.168.1.25`:

   ```env
   CORS_ORIGINS=http://localhost:3000,http://192.168.1.25:3000
   ```

   Keep your existing `MONGO_URI`, `JWT_SECRET`, and AI provider key. Do not commit `.env` or `.env.local`.
5. Start the backend from the `server` directory with `npm install` (first time only), then `npm run dev`. Start the frontend from the project root with `npm install` (first time only), then `npm start`. CRA's development server must be reachable on the LAN; if it only binds to localhost, set `HOST=0.0.0.0` in the frontend environment before starting it.
6. Allow Node.js and the frontend development server through Windows Firewall on **Private networks** when prompted. Keep the network private; do not expose this development server to public Wi-Fi or the internet.
7. On the phone, open `http://192.168.1.25:3000` (replace the sample IP). Log in using your DevTracker account.

### If you want to use DevTracker away from home

A laptop LAN address only works while both devices are on the same Wi-Fi and the laptop/backend are running. For access anywhere, deploy the React frontend and Express API to public HTTPS hosting and use a hosted MongoDB connection. Set `REACT_APP_API_URL` to the deployed API URL and configure `CORS_ORIGINS` to the deployed frontend origin. Never put `JWT_SECRET`, database credentials, or AI provider keys in the frontend environment.
