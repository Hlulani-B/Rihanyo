import { GmailService } from "./gmail";
import { Practice } from "./practice";
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

class Filter {
    constructor(token) {
        this.token = token;
        this.gmail = new GmailService(token);
        this.practice = new Practice(token);
        // no longer instantiates newRequests -- that caused circular
        // instantiation (Filter <-> newRequests creating each other forever)
    }

    async getExistingNewRequests() {
        const snapshot = await getDocs(collection(db, 'newRequests'));
        return snapshot.empty
            ? []
            : snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async eliminate(emails, profiles, new_requests) {
        // We want the *emails* that haven't already been turned into an
        // accepted profile or already logged as a pending newRequest.
        // (Profiles/new_requests don't have `attachments`/`message` fields,
        // so Groq() needs email-shaped objects, not profile-shaped ones.)
        const excludeIds = new Set([
            ...profiles.map(p => p.id),
            ...new_requests.map(r => r.id)
        ]);

        const result = emails.filter(email => !excludeIds.has(email.id));

        return result;
    }

    async Groq(requests) {
        if (requests.length === 0) return [];

        const formatted = requests.map(r => {
            const attachmentSummary = r.attachments.length > 0
                ? r.attachments.map(a => a.filename).join(', ')
                : 'No attachments provided';

            return `
Request ID: ${r.id}
Message snippet: ${r.message}
Attachments: ${attachmentSummary}
---`;
        }).join('\n');

        const prompt = `
You are screening medical practice registration requests submitted via email.

Below are multiple requests, each separated by "---". Evaluate EACH ONE independently based on:
1. Does the message snippet contain meaningful, relevant content (not empty, spam, or gibberish)?
2. Does the request include at least one attachment?

${formatted}

Respond ONLY with a valid JSON array, no markdown, no preamble, one object per request, in this exact format:
[
  { "id": "request id here", "valid": true or false, "reason": "short explanation" }
]
`;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${import.meta.env.VITE_G_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                max_tokens: 1500,
                messages: [{ role: "user", content: prompt }]
            })
        });

        const data = await response.json();
        const rawText = data.choices?.[0]?.message?.content ?? '[]';
        const cleaned = rawText.replace(/```json|```/g, '').trim();

        try {
            return JSON.parse(cleaned);
        } catch (err) {
            console.error('Failed to parse Groq batch response:', rawText);
            return requests.map(r => ({ id: r.id, valid: false, reason: 'Failed to parse AI response' }));
        }
    }


    async run() {
        const emails = await this.gmail.getAllEmails();
        const profiles = await this.practice.getAllProfiles();
        const requests = await this.getExistingNewRequests();

        const toProcess = await this.eliminate(emails, profiles, requests);
        const verdicts = await this.Groq(toProcess);

        const results = toProcess.map(request => {
            const verdict = verdicts.find(v => v.id === request.id);
            return { ...request, ...verdict };
        });

        return results;
    }
}

export { Filter };