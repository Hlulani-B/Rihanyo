## Engineering Challenges & Solutions

Building this multi-agent WhatsApp assistant for medical appointments came with a handful of gnarly bugs that took some real debugging to track down.

### 1. The agent would just... go silent

Early on, the assistant would sometimes just stop responding — no error, no crash, nothing. The user would send a message and just get left on read.

Turned out this was coming from a few places at once: broken `async/await` chains that never resolved properly, `JSON.parse` blowing up on messy LLM output and killing the flow silently, and some code paths that just ended without ever calling `this.reply()`.

**Fix:** Wrapped every parser in `try...catch` with proper logging, and added a fallback so the user always gets *some* response even when something breaks internally.

### 2. It kept treating questions like form fields

If someone asked something open-ended like *"can you give me options?"*, the agent would just reply with a canned line like *"I've taken note that..."* instead of actually answering.

The problem was every incoming message got funneled straight into `Agent.three()`, which is really only built for pulling structured data out of messages (missing fields, etc.) — not for answering questions.

**Fix:** Added proper intent handling so queries about location or practice details get routed to the right place (`Agent.six()`, `getEssay()`) before the flow falls back to form-filling mode.

### 3. The bot got confused about who's who

At one point the LLM extracted its own name — "Hlulani" — and saved it as the *patient's* name. Same thing happened with "a general practitioner" ending up in the `doctor` column when it was really just part of the assistant's own dialogue.

Basically, when the model looked back over the conversation history, it lost track of which lines were the assistant talking and which were the patient.

**Fix:** Added explicit negative constraints in the `Agent.one()` system prompt — telling it directly not to map assistant text onto patient fields — plus validation checks on what actually counts as a valid medical title.

### 4. Dates like "9am tomorrow" kept breaking the database

People don't talk in ISO format — they say "next Monday at 2pm" or "9am tomorrow" — but the database only accepts proper timestamp strings, so these were failing on insert.

**Fix:** Injected the current date/time (`currentIso`) directly into the `Agent.one()` context, so the model always has a reference point and is forced to convert whatever the user says into a clean ISO 8601 UTC string before it ever touches the database.
# Rihanyo

**An AI-assisted appointment booking platform for practices.**

Rihanyo lets practices register and manage appointment requests, with an AI-powered admin filter that screens incoming requests for relevance before they reach a human.

> **Status:** In active development. Core registration and admin filtering are functional; the WhatsApp AI receptionist and location-based practice search are in progress.

---

## Overview

Rihanyo is built around two sides of the same problem: making it easy for a practice to register and receive appointment requests, and making sure the admin isn't stuck manually reading through spam or irrelevant submissions. New requests are automatically screened by an AI filter before they're surfaced to the admin dashboard.

---

## Features

| Feature | Status | Description |
|---|---|---|
| Practice Registration | Done | Practices can sign up and register their details |
| AI Request Filtering | Done | New requests are checked for relevance (e.g. rejects unrelated or nonsensical submissions) and flagged before reaching the admin |
| Admin Dashboard | Done | View and manage incoming requests |
| WhatsApp AI Receptionist | In progress | AI agent to converse with patients via WhatsApp Business API and book appointments automatically |
| Nearest Location Search | Planned | Location-based search so users can find the closest registered practice |

---

## Tech Stack

- **Backend:** Node.js / Express
- **Hosting:** Firebase Functions
- **Auth:** Firebase Google Sign-In (used to obtain access tokens, in place of a full OAuth2 flow)
- **Email:** Gmail API
- **AI Filtering:** LLM-based relevance check on incoming requests
- **Planned:** WhatsApp Business API (AI receptionist), Geolocation API (nearest-practice search)

---

## Setup & Installation

**1. Clone the repository**
```bash
git clone https://github.com/Hlulani-B/Rihanyo.git
cd Rihanyo
```

**2. Install dependencies**
```bash
npm install
```

**3. Environment variables**
Create a `.env` file in the root directory with your Firebase, Google, and Gmail API credentials. Do not commit this file — it's excluded via `.gitignore`.

**4. Deploy to Firebase Functions**
```bash
firebase deploy --only functions
```

---

## Challenges & Technical Decisions

**OAuth2 vs Firebase Google Sign-In**
Implementing a full Google OAuth2 flow directly caused repeated issues with token handling and refresh. Switched to Firebase's Google Sign-In, which handles the OAuth2 exchange internally and still exposes an access token usable for Gmail API calls — a more reliable path given the time constraints.

**AI Filtering for New Requests**
Needed a way to stop irrelevant or spam submissions (e.g. random text unrelated to a practice sign-up) from cluttering the admin queue. Built an AI-based filter that evaluates each new request and flags it if it doesn't resemble a genuine practice registration, rather than relying on rigid keyword rules.

**ES Modules vs CommonJS**
Deploying the Express API to Firebase Functions surfaced conflicts between ES module (`import`) and CommonJS (`require`) syntax. Resolved by standardizing the module system across the backend to match what Firebase Functions expects at deploy time.

**Environment Variables in Firebase Functions**
`dotenv` worked locally but didn't carry over cleanly to the deployed Firebase Functions environment. Fixed by configuring environment variables through Firebase's own config/secrets mechanism instead of relying solely on a local `.env` file at deploy time.

**Account Switching During Development**
Frequent switching between Google accounts during development surfaced edge cases in how Firebase Auth and the OAuth consent flow handled session state — helped catch bugs early that would otherwise only show up with real users on different accounts.

---

## Roadmap

- [ ] WhatsApp Business API integration for an AI receptionist that can hold a conversation and book appointments directly
- [ ] Location-based search to find the nearest registered practice
- [ ] Expand AI filtering to cover more edge cases beyond basic relevance

---

## Contributing

Contributions, issues, and feature requests are welcome — check the [issues page](https://github.com/Hlulani-B/Rihanyo/issues).

## License

MIT


# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
