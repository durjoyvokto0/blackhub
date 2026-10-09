# BLACKHUB — PRODUCTION DEPLOYMENT & HOSTING GUIDE

This package contains the complete, production-ready website source code for **BlackHub**. You can deploy and publish this platform on any web server, cloud provider, VPS, or container environment.

---

## Quick Start (Local or VPS)

### Prerequisites
- Node.js version 18 or higher (v20+ recommended)
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default Administrator credentials:
- **Username**: `black999`
- **Default Password**: `Vokda@@99`

### 3. Build & Run Production Server
```bash
# Build the client frontend
npm run build

# Start the full-stack server (runs on port 3000 by default or $PORT)
npm start
```
The application will be live at `http://localhost:3000`.

---

## Deploying Anywhere

### Option A: Docker (One-Click)
Build and run using the included Dockerfile:
```bash
# Build Docker image
docker build -t blackhub-app .

# Run container on port 80/3000
docker run -d -p 3000:3000 --name blackhub blackhub-app
```

### Option B: Cloud Hosting (Render, Railway, Fly.io, Heroku)
1. Upload or push this repository to GitHub/GitLab.
2. Connect your repository to Render, Railway, or Fly.io.
3. Configure the build and start commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Port**: Set `PORT=3000` (or leave default assigned by provider).

### Option C: Ubuntu / Debian VPS with Nginx and PM2
1. Transfer files to `/var/www/blackhub`.
2. Install PM2:
   ```bash
   npm install -g pm2
   npm install
   npm run build
   pm2 start server.ts --name blackhub --interpreter ./node_modules/.bin/tsx
   pm2 save
   pm2 startup
   ```
3. Setup Nginx reverse proxy pointing to `http://127.0.0.1:3000`.

### Option D: cPanel with Node.js Selector
1. Upload the zip package to your cPanel file manager and extract it.
2. Open **Setup Node.js App** in cPanel.
3. Choose Node.js v18 or v20.
4. Set **Application startup file** to `server.ts` or compiled output.
5. Click **Run NPM Install**, then click **Restart App**.

### Option E: Static Frontend Hosting (Vercel, Netlify, Cloudflare Pages)
If you only want to host the static client interface:
1. Run `npm run build` to generate the `dist/` directory.
2. Upload the contents of `dist/` to any static web host or CDN.

---

## Database & File Storage
- BlackHub uses embedded PostgreSQL via PGlite, storing data inside `./data/blackhub.db`. No separate external PostgreSQL server is required to get started.
- Uploaded media files are stored locally in `./data/uploads/` (or mapped to your object storage volume).
