# bootcamp-app

A test management tool for tracking test cases, test suites, test runs, bugs, and reports.

## Local development

```bash
npm install
npm run dev
```

- React app: http://localhost:5173
- API server: http://localhost:3001

Copy `.env.example` to `.env` and fill in any optional values you need.

## DEPLOY

### Provider: Render (free tier)

Render runs the Express server as a long-running Node.js process, which is required for the SQLite database. Vercel and Netlify use serverless functions and are not suitable for this app.

**Free-tier caveats:**
- The service sleeps after 15 minutes of inactivity. The first request after a sleep takes ~30–50 seconds to respond.
- The disk is ephemeral — the SQLite database is reset on every redeploy. Sample data is re-seeded automatically on startup.
- 750 free instance hours per month (enough for one service running around the clock).

### One-time setup (do this once)

1. Push the code to GitHub.

2. Go to https://render.com, sign in, and click **New → Web Service**.

3. Connect your GitHub repository. Render detects `render.yaml` and pre-fills all settings.

4. Click **Deploy**. Render runs `npm install && npm run build`, then starts the server with `npm start`.

5. Your public URL appears at the top of the service page (e.g. `https://bootcamp-app.onrender.com`).

### After the first deploy

Every `git push` to `main` triggers an automatic redeploy.

### Environment variables (optional)

Set these in the Render dashboard under **Environment** if you want GitHub issue creation to work:

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | Personal access token with `repo` scope |
| `GITHUB_REPO` | Target repository in `owner/repo` format |

### Deploy command

```bash
git push origin main
```
