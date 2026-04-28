# Insighta Labs Web Portal

## Live URL
http://35.180.66.115:5173

## Pages
- / → Login page
- /dashboard → Metrics overview
- /profiles → Profile list with filters + pagination
- /profiles/:id → Profile detail
- /search → Natural language search
- /account → Current user info

## Authentication
- GitHub OAuth via backend
- Tokens stored in HTTP-only cookies (not accessible via JS)
- CSRF protection enabled
- Auto-redirects to login if session expires

## Tech Stack
- React + Vite
- Axios
- Served with `serve` via PM2

## How to run locally
npm install
npm run dev

## How to build
npm run build