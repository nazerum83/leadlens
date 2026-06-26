# ⬡ LeadLens — AI-Powered Lead Intelligence

Built by Erum Naz · AI Automation Specialist

## What it does

5 AI agents in one dashboard:
1. 🔍 Niche Scout — Find B2B leads by niche and location
2. 🌐 Website Auditor — Score any website 0–100
3. 🎯 Lead Scorer — Grade leads A / B / C
4. ✍️ Outreach Writer — Email + LinkedIn + Instagram DM
5. 📋 Tracker — Format output for Google Sheets

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create environment file
```bash
cp .env.example .env.local
```
Then edit `.env.local` and add your values.

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000

### Login credentials
- Email: `erum@leadlens.ai`
- Password: `LeadLens@2026`

## Deploy to Vercel

### Option A — Vercel Dashboard (Easiest)
1. Push this folder to GitHub
2. Go to vercel.com → New Project
3. Import your GitHub repo
4. Add environment variables in Vercel dashboard
5. Deploy!

### Option B — Vercel CLI
```bash
npm i -g vercel
vercel
```

## Add Google Sheet URL
1. Create a blank Google Sheet
2. Copy the URL
3. Add to Vercel: Settings → Environment Variables → NEXT_PUBLIC_SHEET_URL

## Change login credentials
Edit `components/Login.js` lines 17-19 and update email/password.
