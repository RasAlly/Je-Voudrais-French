# Je Voudrais — French

A personal, minimalist French learning app: Duolingo-style lessons with text-to-speech,
speech-to-text pronunciation checking, and spaced-repetition review.

```
mobile/   Expo (React Native + TypeScript, expo-router)
server/   Node + Express + Postgres API (deploys to Railway)
```

## Features

- **Lessons** — each new word is introduced with audio, then practiced through multiple choice,
  listening, typing (with an accent keyboard), sentence building, and speaking. Missed
  exercises come back at the end of the lesson. Lessons unlock in order.
- **Text-to-speech** — device French voice via `expo-speech`, with normal and 🐢 slow speeds.
- **Speech-to-text** — records with `expo-audio`, transcribes on the server (Groq's free Whisper
  large-v3, or OpenAI as a fallback; `language=fr`),
  then scores you with fuzzy matching and word-by-word feedback.
- **Review** — SM-2 spaced repetition over every word you've learned.
- **Speak tab** — free pronunciation practice on any phrase.
- **Progress** — streak, XP, words learned, weekly chart.

## Run locally

```bash
# 1. API (uses embedded Postgres in server/.data — no DB install needed)
cd server
npm install
GROQ_API_KEY=gsk_... npm run dev         # http://localhost:3000

# 2. App
cd mobile
npm install
npx expo start                           # scan the QR code with Expo Go
```

With your phone on the same Wi-Fi, the app automatically talks to the server on your
computer. Everything except speech-to-text works without a key. Get a free Groq key at
https://console.groq.com/keys.

## Deploy the API on Railway

1. Push this repo to GitHub and create a Railway project → **Deploy from GitHub repo**.
2. In the service settings set **Root Directory** to `/server` (build/start come from `server/railway.json`).
3. Add a **Postgres** database to the project; reference its `DATABASE_URL` in the service variables
   (`${{Postgres.DATABASE_URL}}`).
4. Add variables: `APP_TOKEN` (any long random string) and `GROQ_API_KEY`.
5. **Settings → Networking → Generate Domain**.
6. In `mobile/.env.local` set `EXPO_PUBLIC_API_URL` to that domain and `EXPO_PUBLIC_APP_TOKEN` to the same token.

## Adding content

Lessons live in `server/src/curriculum.ts`. Add items or lessons there; keep item `id`s stable,
since review progress is keyed on them.

## Installing on your phone without Expo Go

`npx eas-cli@latest build --profile preview --platform ios` (or `android`) builds an installable
app in the cloud — no Xcode needed.
