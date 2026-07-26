# Rihanyo

**An AI assisted appointment booking platform for practices.**

Rihanyo lets practices register and manage appointment requests with an AI powered admin filter that screens incoming requests for relevance before they reach a human.

> **Status:** In active development. Core registration and admin filtering are functional. The WhatsApp AI receptionist and location based practice search are in progress.

## Overview

Rihanyo is built around two sides of the same problem: making it easy for a practice to register and receive appointment requests, and making sure the admin isn't stuck manually reading through spam or irrelevant submissions. New requests are automatically screened by an AI filter before they're surfaced to the admin dashboard.

## Features

| Feature | Status | Description |
|---|---|---|
| Practice Registration |  Done | Practices can sign up and register their details |
| AI Request Filtering |  Done | New requests are checked for relevance (rejects unrelated or nonsensical submissions) and flagged before reaching the admin |
| Admin Dashboard |  Done | View and manage incoming requests |
| WhatsApp AI Receptionist |  In progress | AI agent to converse with patients via WhatsApp Business API and book appointments automatically |
| Nearest Location Search |  Done | Location based search so users can find the closest registered practice |
| Chatbot Receptionist |  In progress | AI-powered chat widget on the website that greets visitors, answers common questions, and routes or books appointment requests |
## Tech Stack

**Backend:** Node.js / Express
**Hosting:** Firebase Functions
**Auth:** Firebase Google Sign In (used to obtain access tokens in place of a full OAuth2 flow)
**Email:** Gmail API
**AI Filtering:** LLM based relevance check on incoming requests
**Planned:** WhatsApp Business API (AI receptionist), Geolocation API (nearest practice search)

## Setup and Installation

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

Create a `.env` file in the root directory with your Firebase, Google, and Gmail API credentials. Do not commit this file. It's excluded via `.gitignore`.

**4. Deploy to Firebase Functions**
```bash
firebase deploy --only functions
```

## Challenges and Technical Decisions

### OAuth2 vs Firebase Google Sign In

Implementing a full Google OAuth2 flow directly caused repeated issues with token handling and refresh. Switched to Firebase's Google Sign In, which handles the OAuth2 exchange internally and still exposes an access token usable for Gmail API calls. A more reliable path given the time constraints.

### AI Filtering for New Requests

Needed a way to stop irrelevant or spam submissions (random text unrelated to a practice sign up) from cluttering the admin queue. Built an AI based filter that evaluates each new request and flags it if it doesn't resemble a genuine practice registration, rather than relying on rigid keyword rules.

### ES Modules vs CommonJS

Deploying the Express API to Firebase Functions surfaced conflicts between ES module (`import`) and CommonJS (`require`) syntax. Resolved by standardizing the module system across the backend to match what Firebase Functions expects at deploy time.

### Environment Variables in Firebase Functions

`dotenv` worked locally but didn't carry over cleanly to the deployed Firebase Functions environment. Fixed by configuring environment variables through Firebase's own config and secrets mechanism instead of relying solely on a local `.env` file at deploy time.

### Account Switching During Development

Frequent switching between Google accounts during development surfaced edge cases in how Firebase Auth and the OAuth consent flow handled session state. Helped catch bugs early that would otherwise only show up with real users on different accounts.

## The AI Receptionist: What Actually Went Wrong

Building the WhatsApp booking agent surfaced a long list of real, production issues, mostly found by reading actual logs rather than guessing. Documenting them here so this doesn't need rediscovering later.

### The agent would just go silent

Early on the assistant would sometimes just stop responding. No error, no crash, nothing. The user would send a message and get left on read.

This came from a few places at once: broken async/await chains that never resolved properly, `JSON.parse` blowing up on messy LLM output and killing the flow silently, and some code paths that simply ended without ever calling `this.reply()`.

Fixed by wrapping every parser in a try/catch with proper logging, and adding a fallback so the user always gets some response even when something breaks internally.

### It kept treating questions like form fields

If someone asked something open ended like "can you give me options?" the agent would reply with a canned line like "I've taken note that..." instead of actually answering.

Every incoming message was funneled straight into `Agent.three()`, which is built for pulling structured data out of messages (missing fields), not for answering questions.

Fixed by adding proper intent handling so queries about location or practice details get routed to the right place (`Agent.eight()`, backed by `getEssay()`) before the flow falls back to form filling mode.

### The bot got confused about who's who

At one point the LLM extracted its own name, "Hlulani," and saved it as the patient's name. The same thing happened with "a general practitioner" ending up in the doctor field when it was really just part of the assistant's own dialogue.

When the model looked back over the conversation history, it lost track of which lines were the assistant talking and which were the patient.

Fixed by adding explicit negative constraints in `Agent.one()`'s system prompt, telling it directly not to map assistant text onto patient fields, plus validation checks on what actually counts as a valid medical title.

### Dates like "9am tomorrow" kept breaking the database

People don't talk in ISO format. They say "next Monday at 2pm" or "9am tomorrow," but the database only accepts proper timestamp strings, so these were failing on insert.

Fixed by injecting the current date and time (`currentIso`) directly into `Agent.one()`'s context, so the model always has a reference point and is forced to convert whatever the user says into a clean ISO 8601 UTC string before it ever touches the database.

### Running out of tokens mid conversation

Once the flow was chaining multiple agents per message (checking missing fields, updating a field, checking again), every user message could trigger two or three full AI calls in a row. Each call sent the entire conversation history and the entire action log every time, even as those grew longer over the course of a chat. On top of that, the clash checker was pulling every appointment in the whole table just to check one doctor's schedule.

None of that felt like much on its own, but it added up fast, and the daily token quota on the free tier got eaten within a single afternoon of testing. Worse, a subtle bug in one of the agent handoffs could loop back on itself and burn through a chunk of the budget in seconds without anyone noticing until the quota was already gone.

Fixed by capping how much history and action log gets sent per call to just the most recent entries instead of the full thing, switching the clash checker to only pull appointments for the same doctor instead of dumping the whole table, adding a minimum gap between AI calls to stay under the requests per minute limit, and making the retry logic smart enough to recognize when it's hit a daily token cap versus a normal rate limit, so it stops retrying immediately instead of wasting more budget on a wall that won't clear for half an hour.

### Free tier AI providers and the fallback chain

Building Rihanyo meant relying entirely on free tier AI providers, since this was a solo student project with no budget for paid API access. That decision came with real tradeoffs. Early on the backend leaned on a single provider, and whenever that provider hit its daily quota, the entire booking flow would grind to a halt with no way to recover until the next day.

Fixed by building a proper fallback chain across five different providers, including Groq, OpenRouter, Cerebras, and Hugging Face, so that if one runs dry the system quietly moves to the next without the patient ever noticing a gap in service.

That fallback chain introduced its own problem. A provider that had already failed would keep getting retried on every incoming message, meaning patients sometimes waited minutes for a reply while the backend worked through a list of providers that were never going to answer. Since Cloud Functions instances can spin up fresh at any moment, a simple in memory solution would not have survived a cold start, so the cooldown state needed to live somewhere durable.

Fixed by adding a cooldown table in Supabase, so a provider that fails gets marked and skipped automatically for a few minutes instead of being retried on every message, and this state survives even if the backend restarts.

### History trimming and hallucinated practice details

Trimming conversation history too aggressively caused the assistant to forget what it had already asked, repeating questions the patient had already answered. Not trimming it at all solved the repetition but caused token usage to balloon and burned through free tier limits even faster.

Fixed by capping history at a reasonable size while deduplicating repeated entries, so nothing important gets lost and nothing wasteful gets resent.

There was also a period where the assistant would answer questions about doctors and practices with details that sounded completely plausible but weren't real. The essay containing real practice information was sometimes falling outside the trimmed context window by the time a follow up question came in, so the AI filled the gap with invented specialties and names.

Fixed by treating the practice essay as something that always needs to be fetched fresh, rather than relying on a trimmed history window, and explicitly instructing the AI to only answer from verified data and never guess.

### Firestore project mismatch

`Agent.eight()` kept telling patients "no doctors available" even after location, radius, and other fields were confirmed. Logs showed a Firestore `NOT_FOUND` error.

Two separate Firebase projects existed: `patient-9e998` (where the Cloud Function is deployed, and where `admin.credential.applicationDefault()` authenticates) and `rihanyo-2ed` (where the actual `practiceProfiles` data lives, and where the web app's client SDK config points). The backend was faithfully querying `patient-9e998`, which either has no Firestore data or no database provisioned. The query wasn't wrong, it was just pointed at the wrong project the whole time.

Fix in progress: migrating the backend to run entirely under `rihanyo-2ed` (`firebase use rihanyo-2ed && firebase deploy --only functions`), so the Admin SDK's credential and the actual data live in the same place.

Lesson learned: when the client SDK config and backend Admin SDK reference different `projectId`s, everything looks like it's working (no crashes, clean error handling) while quietly reading from an empty project. Always confirm `projectId` matches across `firebaseConfig` (web) and wherever the Admin SDK initializes.

### Silent failures masking as "no data"

Several places in the codebase (`getAddressAndId`, `getCoordinates`, `getNearestPractices`) catch every error and return `[]` or `null` on failure. This is good defensive practice for uptime, the bot never crashes mid conversation, but it means a genuine outage (wrong project, expired API, rate limit) looks identical to "there really is no data" from the AI's perspective. Worth eventually adding a distinct error state signal so `eight()` can say "I'm having trouble right now" instead of confidently claiming zero practices exist.

### Agent.five() conflict check, a falsy return bug

`five()` (the schedule clash checker) returned `undefined` on its early return error paths (Supabase failure, AI parse failure) instead of an explicit `true` or `false`. Since `undefined` is falsy just like `false`, `Agent.one()`'s check would silently fall through and save the appointment time anyway, even after `five()` had already told the user something went wrong.

Fixed by making both error paths return `true` explicitly, so `one()` correctly halts instead of double replying.

### Practice.getEssay(), an object vs ID string mismatch

`getEssay()` expected an array of plain Firestore document ID strings, but `Agent.findPracticesAndPresent()` was actually passing it the full practice objects returned by `Distance.getNearestPractices()` (shaped like `{ id, name, address, distanceKm }`). This meant the doc lookup was being called with a whole object instead of a string ID, silently broken or producing garbage depending on SDK coercion.

Fixed by having `getEssay()` normalize its input (accept either shape) and extract the `id` before querying Firestore, while preserving `distanceKm` for the AI summary.

### Radius stored as an untyped string

`setRadius` saved whatever raw string the AI extraction returned (`"5"`, `"5km"`, `"10 kilometers"`) with no normalization. The nearest practice search then compared distance to that raw value, which coerces fine for `"5"` but silently becomes `NaN` (and therefore always false) for anything non numeric. Result: zero practices found, no error, no obvious cause.

Fixed by coercing with `Number(radius)` and guarding against `NaN` before comparing.

None of these were dramatic failures. They were the kind of small, persistent issues that only show up once real conversations start happening, and they taught a lot about how fragile an AI powered system can be if cost, latency, and grounding aren't considered carefully from the start.

## Roadmap

- WhatsApp Business API integration for an AI receptionist that can hold a conversation and book appointments directly
- Location based search to find the nearest registered practice
- Expand AI filtering to cover more edge cases beyond basic relevance

## Contributing

Contributions, issues, and feature requests are welcome. Check the [issues page](https://github.com/Hlulani-B/Rihanyo/issues).

## License

MIT
