## Engineering Challenges & Solutions

Building this multi agent WhatsApp assistant for medical appointments came with a handful of gnarly bugs that took some real debugging to track down.

### 1. The agent would just go silent

Early on the assistant would sometimes just stop responding. No error no crash nothing. The user would send a message and just get left on read.

Turned out this was coming from a few places at once. Broken async await chains that never resolved properly. JSON.parse blowing up on messy LLM output and killing the flow silently. Some code paths that just ended without ever calling this.reply().

Fix: wrapped every parser in a try catch with proper logging and added a fallback so the user always gets some response even when something breaks internally.

### 2. It kept treating questions like form fields

If someone asked something open ended like "can you give me options?" the agent would just reply with a canned line like "I've taken note that..." instead of actually answering.

The problem was every incoming message got funneled straight into Agent.three() which is really only built for pulling structured data out of messages like missing fields and not for answering questions.

Fix: added proper intent handling so queries about location or practice details get routed to the right place (Agent.six() getEssay()) before the flow falls back to form filling mode.

### 3. The bot got confused about who's who

At one point the LLM extracted its own name "Hlulani" and saved it as the patient's name. Same thing happened with "a general practitioner" ending up in the doctor column when it was really just part of the assistant's own dialogue.

Basically when the model looked back over the conversation history it lost track of which lines were the assistant talking and which were the patient.

Fix: added explicit negative constraints in the Agent.one() system prompt telling it directly not to map assistant text onto patient fields plus validation checks on what actually counts as a valid medical title.

### 4. Dates like "9am tomorrow" kept breaking the database

People don't talk in ISO format. They say "next Monday at 2pm" or "9am tomorrow" but the database only accepts proper timestamp strings so these were failing on insert.

Fix: injected the current date and time (currentIso) directly into the Agent.one() context so the model always has a reference point and is forced to convert whatever the user says into a clean ISO 8601 UTC string before it ever touches the database.

### 5. Running out of tokens mid conversation

Once the flow was chaining multiple agents per message (checking missing fields then updating a field then checking again) every single user message could trigger two or three full AI calls in a row. Each of those calls was sending the entire conversation history and the entire action log every single time even as those grew longer and longer over the course of a chat. On top of that the clash checker was pulling every single appointment in the whole table just to check one doctor's schedule.

None of that felt like much on its own but it added up fast and the daily token quota on the free tier got eaten within a single afternoon of testing. Worse a subtle bug in one of the agent handoffs could loop back on itself and burn through a chunk of the budget in seconds without anyone noticing until the quota was already gone.

Fix: capped how much history and action log gets sent per call to just the most recent messages instead of the full thing. Also switched the clash checker to only pull appointments for the same doctor instead of dumping the whole table. Added a minimum gap between AI calls to stay under the requests per minute limit and made the retry logic smart enough to recognize when it's actually hit a daily token cap versus a normal rate limit so it stops retrying immediately instead of wasting more of the budget on a wall that won't clear for half an hour.


## Challenges We Faced

Building Rihanyo meant relying entirely on free tier AI providers since this was a solo student project with no budget for paid API access. That decision came with real tradeoffs. Early on the backend leaned on a single provider and whenever that provider hit its daily quota the entire booking flow would grind to a halt with no way to recover until the next day. The fix was building a proper fallback chain across five different providers including Groq OpenRouter Cerebras and Hugging Face so that if one runs dry the system quietly moves to the next without the patient ever noticing a gap in service.

**How it was fixed:** A multi provider fallback chain was built so the assistant tries Groq first then OpenRouter then Cerebras then Hugging Face until one of them responds successfully.

That fallback chain introduced its own problem. A provider that had already failed would keep getting retried on every single incoming message which meant patients were sometimes waiting minutes for a reply while the backend patiently worked through a list of providers that were never going to answer. Solving this meant adding a cooldown system backed by Supabase so a provider that just failed gets skipped instantly for the next few minutes instead of being retried from scratch every time. Since Cloud Functions instances can spin up fresh at any moment a simple in memory solution would not have survived a cold start so the cooldown state needed to live somewhere durable.

**How it was fixed:** A cooldown table was added in Supabase so a provider that fails gets marked and skipped automatically for a few minutes instead of being retried on every message and this state survives even if the backend restarts.

Another subtle issue came from how much conversation history got sent to the AI on every call. Trimming that history too aggressively caused the assistant to forget what it had already asked and it would repeat questions the patient had already answered. Not trimming it at all solved the repetition but caused token usage to balloon and burned through the free tier limits even faster. Getting this balance right took a few iterations of capping the history at a reasonable size while deduplicating repeated entries so nothing important got lost and nothing wasteful got resent.

**How it was fixed:** The history sent to the AI was capped at a sensible size and duplicate entries were removed so the assistant keeps enough memory to avoid repeating itself without sending more than it actually needs.

There was also a period where the assistant would answer questions about doctors and practices with details that sounded completely plausible but were not actually real. The essay containing real practice information was sometimes falling outside the trimmed context window by the time a follow up question came in so the AI filled the gap with invented specialties and names. Fixing this meant treating that piece of information as something that always needed to be fetched fresh and explicitly telling the AI never to state anything it could not verify from the data it was given.

**How it was fixed:** The practice essay is now fetched directly every time it is needed instead of relying on a trimmed history window and the AI is explicitly instructed to only answer from that verified information and never guess.

None of these were dramatic failures. They were the kind of small persistent issues that only show up once real conversations start happening and they taught me a lot about how fragile an AI powered system can be if you do not think carefully about cost latency and grounding from the very beginning.
None of these were dramatic failures. They were the kind of small persistent issues that only show up once real conversations start happening and they taught me a lot about how fragile an AI powered system can be if you do not think carefully about cost latency and grounding from the very beginning.
# Rihanyo

**An AI assisted appointment booking platform for practices.**

Rihanyo lets practices register and manage appointment requests with an AI powered admin filter that screens incoming requests for relevance before they reach a human.

> **Status:** In active development. Core registration and admin filtering are functional. The WhatsApp AI receptionist and location based practice search are in progress.

---

## Overview

Rihanyo is built around two sides of the same problem. Making it easy for a practice to register and receive appointment requests. And making sure the admin isn't stuck manually reading through spam or irrelevant submissions. New requests are automatically screened by an AI filter before they're surfaced to the admin dashboard.

---

## Features

| Feature | Status | Description |
|---|---|---|
| Practice Registration | Done | Practices can sign up and register their details |
| AI Request Filtering | Done | New requests are checked for relevance (rejects unrelated or nonsensical submissions) and flagged before reaching the admin |
| Admin Dashboard | Done | View and manage incoming requests |
| WhatsApp AI Receptionist | In progress | AI agent to converse with patients via WhatsApp Business API and book appointments automatically |
| Nearest Location Search | Planned | Location based search so users can find the closest registered practice |

---

## Tech Stack

- **Backend:** Node.js / Express
- **Hosting:** Firebase Functions
- **Auth:** Firebase Google Sign In (used to obtain access tokens in place of a full OAuth2 flow)
- **Email:** Gmail API
- **AI Filtering:** LLM based relevance check on incoming requests
- **Planned:** WhatsApp Business API (AI receptionist) Geolocation API (nearest practice search)

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
Create a `.env` file in the root directory with your Firebase Google and Gmail API credentials. Do not commit this file. It's excluded via `.gitignore`.

**4. Deploy to Firebase Functions**
```bash
firebase deploy --only functions
```

---

## Challenges & Technical Decisions

**OAuth2 vs Firebase Google Sign In**
Implementing a full Google OAuth2 flow directly caused repeated issues with token handling and refresh. Switched to Firebase's Google Sign In which handles the OAuth2 exchange internally and still exposes an access token usable for Gmail API calls. A more reliable path given the time constraints.

**AI Filtering for New Requests**
Needed a way to stop irrelevant or spam submissions (random text unrelated to a practice sign up) from cluttering the admin queue. Built an AI based filter that evaluates each new request and flags it if it doesn't resemble a genuine practice registration rather than relying on rigid keyword rules.

**ES Modules vs CommonJS**
Deploying the Express API to Firebase Functions surfaced conflicts between ES module (import) and CommonJS (require) syntax. Resolved by standardizing the module system across the backend to match what Firebase Functions expects at deploy time.

**Environment Variables in Firebase Functions**
dotenv worked locally but didn't carry over cleanly to the deployed Firebase Functions environment. Fixed by configuring environment variables through Firebase's own config and secrets mechanism instead of relying solely on a local .env file at deploy time.

**Account Switching During Development**
Frequent switching between Google accounts during development surfaced edge cases in how Firebase Auth and the OAuth consent flow handled session state. Helped catch bugs early that would otherwise only show up with real users on different accounts.

---

## Roadmap

- [ ] WhatsApp Business API integration for an AI receptionist that can hold a conversation and book appointments directly
- [ ] Location based search to find the nearest registered practice
- [ ] Expand AI filtering to cover more edge cases beyond basic relevance

---

## Contributing

Contributions issues and feature requests are welcome. Check the [issues page](https://github.com/Hlulani-B/Rihanyo/issues).

## License

MIT
