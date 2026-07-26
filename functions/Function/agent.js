import supabase from "./supabase.js";
import Distance from "./distance.js";
import Practice from "./practiceInfo.js";
import { AI } from "./ai.js";
import { Conversation, Track, Appointment } from "./crud.js";
import { Return } from "./index.js";

function ts() {
  return new Date().toISOString();
}

// AI wrapper without artificial delay throttling
async function rateLimitedAI(prompt, retries = 2, delayMs = 1000) {
  try {
    const response = await AI(prompt);
    return typeof response === "string" ? response : JSON.stringify(response);
  } catch (err) {
    const isRateLimit = err?.status === 429 || err?.message?.includes("429") || err?.message?.toLowerCase().includes("rate limit");
    const isTokenExhausted = err?.error?.type === "tokens" || err?.message?.toLowerCase().includes("tokens per day");

    if (isTokenExhausted) {
      console.error(`[${ts()}] [rateLimitedAI] Token budget exhausted — not retrying. Daily cap hit:`, err?.error?.message || err?.message);
      return null;
    }

    if (isRateLimit && retries > 0) {
      console.warn(`[${ts()}] [rateLimitedAI] Rate limit hit. Retrying... (${retries} retries left, waiting ${delayMs}ms)`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return rateLimitedAI(prompt, retries - 1, delayMs * 2);
    }

    console.error(`[${ts()}] [rateLimitedAI] AI execution error:`, err);
    return null;
  }
}

function safeParse(rawString) {
  if (!rawString) {
    console.warn(`[${ts()}] [safeParse] rawString is empty/null/undefined — cannot parse.`);
    return null;
  }
  try {
    const cleaned = rawString.replace(/```json\s*|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(`[${ts()}] [safeParse] Failed to parse JSON output from AI. Raw was:`, rawString, `| Error:`, err.message);
    return null;
  }
}

// Defensive normalization: if the AI hallucinates stray characters in a key
// (e.g. "/functionName" instead of "functionName"), match on substring so
// downstream code still finds the right value instead of silently failing.
function normalizeKeys(obj, expectedKeys) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  for (const expected of expectedKeys) {
    if (expected in obj) continue;
    const found = Object.keys(obj).find((k) => k.toLowerCase().includes(expected.toLowerCase()));
    if (found) {
      console.warn(`[${ts()}] [normalizeKeys] Malformed key "${found}" found instead of "${expected}" — normalizing.`);
      obj[expected] = obj[found];
    }
  }
  return obj;
}

// ALWAYS use patientId exclusively to find the latest active appointment record
async function getEmptyFields(patientId) {

  const fields = ["name", "surname", "location", "radius", "doctor", "time"];

  try {
    const { data, error } = await supabase
      .from("Appointment")
      .select("*")
      .eq("patientId", patientId) // Strictly check patientId
     
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`[${ts()}] [getEmptyFields] Supabase error for patientId=${patientId}:`, error);
      return fields;
    }
    if (!data) {
      console.warn(`[${ts()}] [getEmptyFields] No appointment row found for patientId=${patientId}. Returning all fields as empty.`);
      return fields;
    }

    const empty = [];
    for (const field of fields) {
      const value = data[field];
      if (value === null || value === undefined || value === "") {
        empty.push(field);
      }
    }
    console.log(`[${ts()}] [getEmptyFields] patientId=${patientId} | row found, id=${data.id} | empty fields:`, empty);
    return empty;
  } catch (err) {
    console.error(`[${ts()}] [getEmptyFields] Unexpected error for patientId=${patientId}:`, err);
    return fields;
  }
}

// History & actions helpers
async function getRecentConvos(conversation, patientId) {
  const full = await conversation.getConversation(patientId);
  return JSON.stringify(full || []);
}

function dedupeActions(actions) {
  const seen = new Set();
  const result = [];
  for (const a of actions) {
    const text = typeof a === "string" ? a : a?.message || a?.action || JSON.stringify(a);
    if (!seen.has(text)) {
      seen.add(text);
      result.push(a);
    }
  }
  return result;
}

async function getRecentActions(track, patientId) {
  const full = await track.getTrack(patientId);
  const deduped = dedupeActions(full || []);
  return JSON.stringify(deduped);
}

async function getLatestEssay(track, patientId) {
  const full = await track.getTrack(patientId);
  if (!full) return null;
  for (let i = full.length - 1; i >= 0; i--) {
    const entry = full[i];
    const text = typeof entry === "string" ? entry : entry?.message || entry?.action || "";
    if (text.startsWith("Practice Info:")) {
      return text.replace("Practice Info:", "").trim();
    }
  }
  return null;
}

// Appended to every prompt that needs strict, single-shape JSON back.
const STRICT_JSON_FOOTER = `

OUTPUT RULES (NON-NEGOTIABLE):
- Respond with ONLY the JSON object shown above. No markdown fences, no preamble, no postscript, no explanation.
- Use the EXACT key names shown — no slashes, no extra punctuation, no whitespace inside keys, no renaming, no extra top-level keys.
- Do not invent additional fields.
- Any "message" value must sound like a warm, natural, conversational reply from a human receptionist — not robotic, not a template dump, not a list of instructions repeated back.`;

export class Agent {
  constructor(patientId, whatsapp) {
    this.patientId = patientId; // Always patientId
    this.whatsapp = whatsapp;
    this.appointment = new Appointment();
    this.conversation = new Conversation();
    this.track = new Track();
    this.distance = new Distance();
    this.practice = new Practice();
  }

  async run(methodName, ...args) {
    try {
      if (typeof this[methodName] === "function") {
        await this[methodName](...args);
      } else {
        console.error(`[${ts()}] [Agent.run] Method ${methodName} does not exist on Agent.`);
        await this.reply("I experienced an internal error. How can I help you?");
        return;
      }
    } catch (err) {
      console.error(`[${ts()}] [Agent.run] Unhandled error in Agent.${methodName}:`, err);
      await this.reply("I experienced a technical hiccup. Could you please repeat that?");
      return;
    }
  }

  async reply(message) {
    console.log(`[${ts()}] [Agent.reply] patientId=${this.patientId} | message="${message}" | whatsapp=${this.whatsapp}`);
    await this.conversation.addConversation(this.patientId, new Date(), "ai", message);
    if (this.whatsapp) {
      await Return(message);
    }
  }

  // SHARED HELPER — practice search + essay generation + reply.
  // Extracted so one(), three(), and six() can all trigger it directly
  // instead of relying on six()'s old implicit missing-field detection.
  async findPracticesAndPresent(location, radius) {
    console.log(`[${ts()}] [Agent.findPracticesAndPresent] patientId=${this.patientId} | location="${location}" | radius=${radius}`);

    let practices;
    try {
      practices = await this.distance.getNearestPractices(radius, location);
    } catch (err) {
      console.error(`[${ts()}] [Agent.findPracticesAndPresent] ERROR — getNearestPractices failed:`, err);
      await this.reply("Sorry, I had trouble searching for nearby practices. Could you try again?");
      return;
    }

    if (!practices || practices.length === 0) {
      console.warn(`[${ts()}] [Agent.findPracticesAndPresent] No practices found within radius=${radius} of location="${location}"`);
      await this.reply("I couldn't find any practices within that distance. Would you like to try searching with a wider travel radius?");
      await this.track.addTrack(this.patientId, new Date(), "no practices found within radius");
      return;
    }

    const essay = await this.practice.getEssay(practices);
    await this.track.addTrack(this.patientId, new Date(), "Practice Info: " + essay);

    console.log(`[${ts()}] [Agent.findPracticesAndPresent] SUCCESS — found ${practices.length} practices, essay generated.`);
    await this.reply(`${essay}\n\nWhich doctor would you like to book with?`);
  }

  // AGENT ONE — Field Updater
  async one(body) {
    console.log(`[${ts()}] [Agent.one] START — patientId=${this.patientId} | body=`, JSON.stringify(body));

    const now = new Date();
    const currentIso = now.toISOString();
    const currentReadable = now.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" });

    const convos = await getRecentConvos(this.conversation, this.patientId);
    const actions = await getRecentActions(this.track, this.patientId);
    const empty = JSON.stringify(await getEmptyFields(this.patientId));
const practice= await this.practice.getAllPractices();
    const prompt = `You are a strict data extractor updating a patient's database record.

CONTEXT:
- Current Time: ${currentIso} (${currentReadable})
- Patient ID: "${this.patientId}"
- Currently Empty Fields: ${empty}
- Full Conversation History: ${convos}
- Full System Actions Log: ${actions}
- Latest Payload Input: ${JSON.stringify(body)}

AVAILABLE SETTER FUNCTIONS:
- setPatientId(patientId, value)
- setName(patientId, value)
- setSurname(patientId, value)
- setTime(patientId, value)
- setDoctor(patientId, value)
- setDoctorId(patientId, value)
- setLocation(patientId, value)
- setRadius(patientId, value)

TASK:
Identify which single function to execute and extract the exact target value.
STRICT FIELD & VALUE RULES:
1. NAME/SURNAME: Extract person names directly.
2. DOCTOR: Only read the users an actual doctor's name (e.g. "Dr. Smith") then lookup the practice table to get the actual doctors name ad store from the lookup table, same with doctors id. NEVER use generic words like "doctor", "general practitioner", "gp", or "physician". If the user is describing a NEED or SYMPTOM instead of naming a doctor (e.g. "a doctor who will treat my flu", "someone for my back pain", "any doctor is fine"), do NOT extract this as a doctor value — output "functionName": "none" instead.
3. TIME: Convert natural expressions into an exact ISO 8601 string relative to the current timestamp (${currentIso}).
4. LOCATION: Extract clear city, suburban, or street locations.
5. NO NULL VALUES: Never set "value" to null, undefined, or empty string.
6. If no function/value can be confidently and correctly extracted per these rules, output {"functionName": "none"}.
If radius is 50KM or 50 km only take the number.
OUTPUT FORMAT (JSON only):
{
  "functionName": "<setName|setSurname|setTime|setDoctor|setLocation|setDoctorId|setRadius|none>",
  "patientId": "${this.patientId}",
  "value": "<extracted_value>"
}${STRICT_JSON_FOOTER}`;

    const raw = await rateLimitedAI(prompt);
    console.log(`[${ts()}] [Agent.one] Raw AI response:`, raw);

    let parsed = safeParse(raw);
    parsed = normalizeKeys(parsed, ["functionName", "patientId", "value"]);
    console.log(`[${ts()}] [Agent.one] Parsed result:`, JSON.stringify(parsed));

    // Guard 1 — AI call/parse failed, or functionName missing entirely
    if (!parsed || !parsed.functionName) {
      console.error(
        `[${ts()}] [Agent.one] ERROR — no valid field/value matched. Reason:`,
        !parsed ? "AI call or JSON parse failed (parsed is null)" : "parsed.functionName missing from AI output",
        `| raw="${raw}"`
      );
      await this.reply("Sorry, could you please clarify that value?");
      return; // hard stop — do not cascade into another agent
    }

    // Guard 2 — AI explicitly signaled no extractable field/value (e.g. symptom instead of doctor name)
    if (parsed.functionName === "none") {
      console.log(`[${ts()}] [Agent.one] functionName is "none" — no valid field extracted, routing to this.three()`);
      await this.three();
      return; // hard stop — do not fall through to setter call below
    }

    // Guard 3 — functionName present but not a real setter on this.appointment
    if (typeof this.appointment[parsed.functionName] !== "function") {
      console.error(
        `[${ts()}] [Agent.one] ERROR — parsed.functionName="${parsed.functionName}" is not a valid setter on this.appointment | raw="${raw}"`
      );
      await this.reply("Sorry, could you please clarify that value?");
      return; // hard stop
    }

    let valueToSave = parsed.value;

    // DOCTOR is handled specially: look up the canonical name + practiceId in
    // Firebase BEFORE saving anything, so we never store an unverified guess
    // as the "doctor" field. This branch replaces the generic setter call below.
    if (parsed.functionName === "setDoctor") {
      let match;
      try {
        match = await this.practice.findDoctorByName(valueToSave);
      } catch (err) {
        console.error(`[${ts()}] [Agent.one] ERROR — findDoctorByName failed for "${valueToSave}":`, err);
        match = null;
      }

      if (!match?.practiceId) {
        console.warn(`[${ts()}] [Agent.one] No matching doctor found in Firebase for "${valueToSave}" — not saving an unverified name.`);
        await this.reply(`I couldn't find a doctor named "${valueToSave}" in our system. Could you double-check the spelling or provide the doctor's full name?`);
        return; // hard stop — do not save an unverified doctor name/id
      }

      try {
        await this.appointment.setDoctor(this.patientId, match.doctorName);
        await this.appointment.setDoctorId(this.patientId, match.practiceId);
        console.log(`[${ts()}] [Agent.one] SUCCESS — resolved and saved doctor="${match.doctorName}" | doctorId=${match.practiceId} (Firebase)`);
      } catch (err) {
        console.error(`[${ts()}] [Agent.one] ERROR — DB write failed saving resolved doctor:`, err);
        await this.reply("Sorry, I had trouble saving that. Could you try again?");
        return; // hard stop
      }

      await this.track.addTrack(this.patientId, new Date(), `Updated setDoctor to ${match.doctorName} (doctorId=${match.practiceId})`);

      console.log(`[${ts()}] [Agent.one] END — proceeding to this.three()`);
      await this.three();
      return; // hard stop — doctor already fully handled, skip generic path below
    }

    if (parsed.functionName === "setTime") {
      //call five and check if there is a classh
      const parsedDate = new Date(parsed.value);
      if (!isNaN(parsedDate.getTime())) {
        valueToSave = parsedDate.toISOString();
      } else {
        console.error(`[${ts()}] [Agent.one] ERROR — could not parse time value: "${parsed.value}"`);
        await this.track.addTrack(this.patientId, new Date(), `Failed to parse time value: ${parsed.value}`);
        await this.reply("Sorry, I couldn't process that time format. Could you try specifying a clearer date and time, like 'tomorrow at 9am'?");
        return; // hard stop
      }
      const conflict = await this.five(parsed.value);
      if (conflict) {
        return;
      }
    }

    try {
      console.log(`[${ts()}] [Agent.one] Calling this.appointment.${parsed.functionName}("${this.patientId}", "${valueToSave}")`);
      await this.appointment[parsed.functionName](this.patientId, valueToSave);
      console.log(`[${ts()}] [Agent.one] SUCCESS — ${parsed.functionName} saved.`);
    } catch (err) {
      console.error(`[${ts()}] [Agent.one] ERROR — DB write failed for ${parsed.functionName}:`, err);
      await this.reply("Sorry, I had trouble saving that. Could you try again?");
      return true; // hard stop
    }

    await this.track.addTrack(this.patientId, new Date(), `Updated ${parsed.functionName} to ${valueToSave}`);

    // setRadius just got saved — run the practice search directly here instead of
    // cascading into three() -> six(), since we no longer rely on six() for this.
    if (parsed.functionName === "setRadius") {
      const currentAppointment = await this.appointment.getAppointment(this.patientId);
      if (currentAppointment?.location) {
        console.log(`[${ts()}] [Agent.one] setRadius saved and location present — running practice search directly.`);
        await this.findPracticesAndPresent(currentAppointment.location, valueToSave);
        return; // hard stop — practice search + doctor prompt already sent
      }
      console.log(`[${ts()}] [Agent.one] setRadius saved but no location on file yet — falling through to this.three()`);
    }

    console.log(`[${ts()}] [Agent.one] END — proceeding to this.three()`);
    await this.three();
  }

  // AGENT TWO — Cancellation Handler
  async two() {
    console.log(`[${ts()}] [Agent.two] START — patientId=${this.patientId}`);

    const convos = await getRecentConvos(this.conversation, this.patientId);
    const actions = await getRecentActions(this.track, this.patientId);
    const appointment = JSON.stringify(await this.appointment.getAppointment(this.patientId));

    const prompt = `You are Hlulani, a virtual secretary handling appointment cancellations.

History: ${convos}
Actions: ${actions}
Current Appointment Data: ${appointment}

TASK:
Determine if the patient has EXPLICITLY confirmed that they want to cancel their appointment.

RULES:
- If the patient has NOT explicitly confirmed cancellation yet, ask for explicit confirmation politely.
- If the patient HAS explicitly confirmed (e.g., "yes cancel it", "confirm cancel"), set status to true.

OUTPUT FORMAT (JSON only):
If NOT explicitly confirmed:
{
  "status": false,
  "action": "Requested cancellation confirmation",
  "message": "Are you sure you would like to cancel your appointment?"
}

If EXPLICITLY confirmed:
{
  "status": true,
  "patientId": "${this.patientId}",
  "action": "Cancelled appointment per user request",
  "message": "Your appointment has been successfully cancelled. Let me know if you need anything else!"
}${STRICT_JSON_FOOTER}`;

    const raw = await rateLimitedAI(prompt);
    console.log(`[${ts()}] [Agent.two] Raw AI response:`, raw);
    let parsed = safeParse(raw);
    parsed = normalizeKeys(parsed, ["status", "action", "message", "patientId"]);

    if (!parsed) {
      console.error(`[${ts()}] [Agent.two] ERROR — AI call/parse failed. Falling back to generic prompt.`);
      await this.reply("Would you like me to proceed with cancelling your appointment?");
      return; // hard stop
    }

    await this.track.addTrack(this.patientId, new Date(), parsed.action);

    if (parsed.status === false) {
      console.log(`[${ts()}] [Agent.two] Cancellation NOT yet confirmed — asking for confirmation.`);
      await this.reply(parsed.message);
      return; // hard stop
    }

    console.log(`[${ts()}] [Agent.two] Cancellation CONFIRMED — cancelling appointment.`);
    await this.appointment.cancelAppointment(this.patientId);
    await this.reply(parsed.message);
    await this.three();
  }

  // AGENT THREE — Missing Field Checker (STRICT patientId + HISTORY)
  async three() {
    console.log(`[${ts()}] [Agent.three] START — patientId=${this.patientId}`);

    const emptyFields = await getEmptyFields(this.patientId);
    const convos = await getRecentConvos(this.conversation, this.patientId);
    const actions = await getRecentActions(this.track, this.patientId);

    if (!emptyFields || emptyFields.length === 0) {
      console.log(`[${ts()}] [Agent.three] No empty fields — proceeding to this.seven()`);
      await this.seven();
      return;
    }

    const firstMissing = emptyFields[0];
    console.log(`[${ts()}] [Agent.three] firstMissing="${firstMissing}" | all empty:`, emptyFields);

    // NOTE: location/radius no longer route to six() — six() is now reserved for
    // explicit, user-initiated radius updates. Missing location/radius fall through
    // to the generic AI-driven ask below, same as name/surname.

    if (firstMissing === "doctor") {
      const latestEssay = await getLatestEssay(this.track, this.patientId);
      if (!latestEssay) {
        const currentAppointment = await this.appointment.getAppointment(this.patientId);
        if (currentAppointment?.location && currentAppointment?.radius) {
          console.log(`[${ts()}] [Agent.three] No essay yet but location & radius both present — running practice search directly.`);
          await this.findPracticesAndPresent(currentAppointment.location, currentAppointment.radius);
          return;
        }
        console.log(`[${ts()}] [Agent.three] No essay yet and location/radius incomplete — falling through to generic ask.`);
      }
    }

    const prompt = `You are Hlulani, a virtual receptionist checking for missing appointment details.

CONTEXT:
- Patient ID: "${this.patientId}"
- Missing Database Fields: ${JSON.stringify(emptyFields)} Choose the first thing from the array
- Primary Missing Field: "${firstMissing}"
- Conversation History: ${convos}
- System Actions Log: ${actions}

TASK:
1. Check the Conversation History. If the user ALREADY stated their ${firstMissing} in recent messages, move to the next empty field in ${JSON.stringify(emptyFields)}.
2. Politely ask for the NEXT unprovided field, in a natural conversational tone — like a friendly receptionist, not a form.
3. NEVER repeat asking for a field that was just supplied in the history.

OUTPUT FORMAT (JSON only):
{
  "message": "<polite, conversational phrase asking for the missing detail>"
}${STRICT_JSON_FOOTER}`;

    const raw = await rateLimitedAI(prompt);
    console.log(`[${ts()}] [Agent.three] Raw AI response:`, raw);
    let parsed = safeParse(raw);
    parsed = normalizeKeys(parsed, ["message"]);

    if (!parsed?.message) {
      console.warn(`[${ts()}] [Agent.three] AI did not return a usable message — using generic fallback for field "${firstMissing}"`);
    }

    const replyMessage = parsed?.message || `Could you please provide your ${firstMissing}?`;

    await this.track.addTrack(this.patientId, new Date(), `Asked user for missing field: ${firstMissing}`);
    await this.reply(replyMessage);
  }

  // AGENT FOUR — Welcome Greeter
  async four() {
    console.log(`[${ts()}] [Agent.four] START — greeting patientId=${this.patientId}`);
    const message = "Hello! I am Hlulani, your virtual secretary. May I please have your first name to begin booking your appointment?";
    await this.reply(message);
    await this.track.addTrack(this.patientId, new Date(), "Greeted patient and requested name");
  }

  // AGENT FIVE — Clash Checker
 // AGENT FIVE — Clash Checker
// AGENT FIVE — Clash Checker
  async five(time) {
    console.log(`[${ts()}] [Agent.five] START — patientId=${this.patientId}`);

    const myAppointment = await this.appointment.getAppointment(this.patientId);

    // Exclude the patient's OWN current row from the conflict check —
    // otherwise a stale/leftover time already saved on their own record
    // triggers a false "already booked" against themselves.
    const { data: sameDoctorAppointments, error } = await supabase
      .from("Appointment")
      .select("id, time, doctorId, patientId")
      .eq("doctorId", myAppointment.doctorId)
      .neq("patientId", this.patientId);

    if (error) {
      console.error(`[${ts()}] [Agent.five] ERROR — Supabase query failed:`, error);
      await this.reply("Sorry, I'm having trouble checking slot availability — could you try again in a moment?");
      return true; // hard stop
    }

    // Pull availability documents for this doctor so the AI can check the
    // proposed time against real opening/closing hours per day too.
    let availability = [];
    try {
      availability = await this.practice.getAvailabilityForDoctor(myAppointment.doctorId);
      console.log(`[${ts()}] [Agent.five] Availability fetched for doctorId=${myAppointment.doctorId}:`, JSON.stringify(availability));
    } catch (err) {
      console.error(`[${ts()}] [Agent.five] ERROR — failed to fetch availability:`, err);
      availability = [];
    }

    const prompt = `You are a scheduling conflict verification engine.

Target Appointment: ${JSON.stringify(myAppointment)}
Existing Bookings for Doctor (excluding this patient's own record): ${JSON.stringify(sameDoctorAppointments || [])}
Doctor/Practice Availability (opening_hours, closing_hours, availability_status per day): ${JSON.stringify(availability)}
my appointment time to check if its taken:${time}

TASK:
Determine if the proposed appointment time overlaps with any EXISTING booking for the specified doctor (excluding the patient's own record, already filtered out), OR falls outside the doctor's opening/closing hours for that day, OR falls on a day marked closed/unavailable. If the Existing Bookings list is empty, there cannot be a double-booking conflict — only check against availability hours in that case.

OUTPUT FORMAT (JSON only):

If CONFLICT DETECTED (double-booked OR outside opening hours OR closed day):
{
  "status": true,
  "action": "Detected schedule conflict",
  "message": "<Explain WHY it conflicts — e.g. 'that time is outside Dr. X's opening hours (08:00–17:00)' or 'that slot is already booked' or 'the practice is closed that day'. Be specific and conversational.>"
}

If NO CONFLICT (Slot available):
{
  "status": false,
  "action": "Time slot verified clear",
  "body": {
    "field": "time",
    "value": "${myAppointment.time}"
  }
}${STRICT_JSON_FOOTER}`;

    const raw = await rateLimitedAI(prompt);
    console.log(`[${ts()}] [Agent.five] Raw AI response:`, raw);
    let parsed = safeParse(raw);
    parsed = normalizeKeys(parsed, ["status", "action", "message", "body"]);

    if (!parsed) {
      console.error(`[${ts()}] [Agent.five] ERROR — AI call/parse failed.`);
      await this.reply("Sorry, I'm having trouble checking slot availability — could you try again in a moment?");
      return true; // hard stop
    }

    await this.track.addTrack(this.patientId, new Date(), parsed.action);

    if (parsed.status === true) {
      console.log(`[${ts()}] [Agent.five] Conflict detected.`);
      await this.reply(parsed.message);
      return true; // hard stop
    }

    console.log(`[${ts()}] [Agent.five] No conflict — proceeding to this.one() with body:`, JSON.stringify(parsed.body));
    return false;
  }
  // AGENT SIX — Explicit Radius Update (user-initiated only)
  // No longer used for the missing-field intake flow. Call this ONLY when the
  // patient explicitly asks to change/set their travel radius outside the
  // normal intake order (e.g. router picks "six" with the new radius value).
  async six(radius) {
    console.log(`[${ts()}] [Agent.six] START — patientId=${this.patientId} | radius=${radius}`);

    if (!radius) {
      console.log(`[${ts()}] [Agent.six] No radius value provided — asking for it.`);
      await this.reply("How many kilometers are you willing to travel to reach the practice?");
      await this.track.addTrack(this.patientId, new Date(), "Asked for travel radius");
      return;
    }

    // Delegate to one() with the same {field, value} body shape the router
    // passes when it picks "one" — keeps the save + practice-search cascade
    // logic in a single place instead of duplicating it here.
    const body = { field: "radius", value: radius };
    console.log(`[${ts()}] [Agent.six] Delegating to this.one() with body:`, JSON.stringify(body));
    await this.one(body);
  }

  // AGENT SEVEN — Final Confirmation
  async seven() {
    console.log(`[${ts()}] [Agent.seven] START — patientId=${this.patientId}`);

    const appointment = await this.appointment.getAppointment(this.patientId);

    const { data: sameDoctorAppointments, error } = await supabase
      .from("Appointment")
      .select("id, time, doctorId, patientId")
      .eq("doctorId", appointment.doctorId);

    if (error) {
      console.error(`[${ts()}] [Agent.seven] ERROR — Supabase query failed:`, error);
      await this.reply("Your appointment details have been noted and confirmed!");
      return; // hard stop
    }

    const prompt = `You are Hlulani, performing final verification for an appointment booking.

Appointment Record: ${JSON.stringify(appointment)}
Doctor Schedule Context: ${JSON.stringify(sameDoctorAppointments || [])}

TASK:
Final safety check for time clashes and confirm booking summary.

OUTPUT FORMAT (JSON only):

If FINAL CLASH DETECTED:
{
  "status": "clash",
  "action": "Final clash detected",
  "message": "There seems to be a scheduling clash with that specific time slot. Please provide a different time."
}

If ALL CONFIRMED:
{
  "status": "confirmed",
  "action": "Appointment fully confirmed",
  "message": "<Warm, conversational summary detailing name, doctor, location, and appointment time. Confirms booking success.>"
}${STRICT_JSON_FOOTER}`;

    const raw = await rateLimitedAI(prompt);
    console.log(`[${ts()}] [Agent.seven] Raw AI response:`, raw);
    let parsed = safeParse(raw);
    parsed = normalizeKeys(parsed, ["status", "action", "message"]);

    if (!parsed) {
      console.error(`[${ts()}] [Agent.seven] ERROR — AI call/parse failed.`);
      await this.reply("Your appointment details have been noted and confirmed!");
      return; // hard stop
    }

    await this.track.addTrack(this.patientId, new Date(), parsed.action);

    if (parsed.status === "clash") {
      console.log(`[${ts()}] [Agent.seven] Final clash detected — clearing time.`);
      await this.appointment.setTime(this.patientId, null);
      await this.reply(parsed.message);
      return; // hard stop
    }

    console.log(`[${ts()}] [Agent.seven] Appointment CONFIRMED.`);
    await this.reply(parsed.message);
  }

  // AGENT EIGHT — Info Answerer
  async eight(question) {
    console.log(`[${ts()}] [Agent.eight] START — patientId=${this.patientId} | question="${question}"`);

   const appointment = await this.appointment.getAppointment(this.patientId);
  /*  let essay = await getLatestEssay(this.track, this.patientId);

    if (!essay) {
      console.log(`[${ts()}] [Agent.eight] No stored essay found — fetching live practice/doctor data from Firebase (location="${appointment?.location || "none"}").`);
      essay = await this.practice.getAvailableDoctorsSummary(appointment?.location || null);
    }
*/


//get nearest practices. 
let practices;
try {
  practices = await this.distance.getNearestPractices(appointment.radius, appointment.location);
  console.log("Here are the practices", practices);
} catch (err) {
  console.error(`[${ts()}] [Agent.eight] getNearestPractices threw:`, err);
  practices = [];
}

    const prompt = `You are Hlulani, answering patient questions about practice or doctor details.

GROUND TRUTH DATA:
- Current Appointment Record: ${JSON.stringify(appointment || {})}
- Practice & Doctor Info : ${JSON.stringify(practices)}
- Patient Question: ${JSON.stringify(question)}

STRICT RULES:
1. Answer using ONLY the ground truth data above.
2. NEVER guess or invent specialties, prices, addresses, or details not present in the essay or record.
3. If distance is included in the essay data, mention it naturally (e.g. "about 3.2km away").
4. If the details are missing from ground truth, explicitly reply that you don't have that specific information.
5. Answer conversationally, like a helpful receptionist speaking to the patient — not a data dump.
6.If patient asks for all practices and no radius or location is given tell then to click the "View practices", ONLY IF no radius or location is given
OUTPUT FORMAT (JSON only):
{
  "message": "<direct, polite, conversational answer relying strictly on source text>",
  "action": "Answered:What question you just answered and what the answer is"
}${STRICT_JSON_FOOTER}`;

    const raw = await rateLimitedAI(prompt);
    console.log(`[${ts()}] [Agent.eight] Raw AI response:`, raw);
    let parsed = safeParse(raw);
    parsed = normalizeKeys(parsed, ["message", "action"]);

    if (!parsed) {
      console.error(`[${ts()}] [Agent.eight] ERROR — AI call/parse failed. Using generic fallback message.`);
    }

    const message = parsed?.message || "Sorry, I don't have that specific information in my records right now.";
    const action = parsed?.action || "Answered info question via agent eight";

    await this.reply(message);
    await this.track.addTrack(this.patientId, new Date(), action);
  }

  // AGENT NINE — Field Correction Handler
  // For when the patient wants to CHANGE a field that may already be set,
  // outside the strict intake order enforced by three()/one(). Router should
  // pick this when the user's message is a correction/edit request rather
  // than a direct answer to the last question asked (e.g. "actually change
  // my location to X", "my surname is spelled wrong, it's Y").
  async nine(body) {
    console.log(`[${ts()}] [Agent.nine] START — patientId=${this.patientId} | body=`, JSON.stringify(body));

    const now = new Date();
    const currentIso = now.toISOString();
    const currentReadable = now.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" });

    const convos = await getRecentConvos(this.conversation, this.patientId);
    const actions = await getRecentActions(this.track, this.patientId);
    const current = JSON.stringify(await this.appointment.getAppointment(this.patientId));

    const prompt = `You are a strict data extractor correcting an already-provided field on a patient's database record.

CONTEXT:
- Current Time: ${currentIso} (${currentReadable})
- Patient ID: "${this.patientId}"
- Current Appointment Record: ${current}
- Full Conversation History: ${convos}
- Full System Actions Log: ${actions}
- Latest Payload Input: ${JSON.stringify(body)}

AVAILABLE SETTER FUNCTIONS:
- setName(patientId, value)
- setSurname(patientId, value)
- setTime(patientId, value)
- setDoctor(patientId, value)
- setDoctorId(patientId, value)
- setLocation(patientId, value)
- setRadius(patientId, value)

TASK:
The patient wants to CHANGE a field that may already have a value. Identify which single function to execute and extract the new target value.

STRICT FIELD & VALUE RULES:
1. NAME/SURNAME: Extract person names directly.
2. DOCTOR: Only extract an actual doctor's name (e.g. "Dr. Smith"). NEVER use generic words like "doctor", "gp", "physician". If describing a need/symptom instead of naming a doctor, output "functionName": "none".
3. TIME: Convert natural expressions into an exact ISO 8601 string relative to the current timestamp (${currentIso}).
4. LOCATION: Extract clear city, suburban, or street locations.
5. NO NULL VALUES: Never set "value" to null, undefined, or empty string.
6. If no function/value can be confidently and correctly extracted, output {"functionName": "none"}.

OUTPUT FORMAT (JSON only):
{
  "functionName": "<setName|setSurname|setTime|setDoctor|setLocation|setDoctorId|setRadius|none>",
  "patientId": "${this.patientId}",
  "value": "<extracted_value>"
}${STRICT_JSON_FOOTER}`;

    const raw = await rateLimitedAI(prompt);
    console.log(`[${ts()}] [Agent.nine] Raw AI response:`, raw);

    let parsed = safeParse(raw);
    parsed = normalizeKeys(parsed, ["functionName", "patientId", "value"]);

    if (!parsed || !parsed.functionName || parsed.functionName === "none" || typeof this.appointment[parsed.functionName] !== "function") {
      console.error(`[${ts()}] [Agent.nine] ERROR — no valid field/value matched. raw="${raw}"`);
      await this.reply("Sorry, could you please clarify what you'd like to change and to what?");
      return;
    }

    let valueToSave = parsed.value;

    // DOCTOR is handled specially: resolve the canonical name + practiceId in
    // Firebase BEFORE saving anything, so we never store an unverified guess.
    if (parsed.functionName === "setDoctor") {
      let match;
      try {
        match = await this.practice.findDoctorByName(valueToSave);
      } catch (err) {
        console.error(`[${ts()}] [Agent.nine] ERROR — findDoctorByName failed for "${valueToSave}":`, err);
        match = null;
      }

      if (!match?.practiceId) {
        console.warn(`[${ts()}] [Agent.nine] No matching doctor found in Firebase for "${valueToSave}" — not saving an unverified name.`);
        await this.reply(`I couldn't find a doctor named "${valueToSave}" in our system. Could you double-check the spelling or provide the doctor's full name?`);
        return;
      }

      try {
        await this.appointment.setDoctor(this.patientId, match.doctorName);
        await this.appointment.setDoctorId(this.patientId, match.practiceId);
        console.log(`[${ts()}] [Agent.nine] SUCCESS — resolved and saved doctor="${match.doctorName}" | doctorId=${match.practiceId} (Firebase)`);
      } catch (err) {
        console.error(`[${ts()}] [Agent.nine] ERROR — DB write failed saving resolved doctor:`, err);
        await this.reply("Sorry, I had trouble saving that change. Could you try again?");
        return;
      }

      await this.track.addTrack(this.patientId, new Date(), `Corrected setDoctor to ${match.doctorName} (doctorId=${match.practiceId})`);
      await this.reply("Got it, I've updated that for you.");
      return; // hard stop — doctor already fully handled
    }

    if (parsed.functionName === "setTime") {
      const parsedDate = new Date(parsed.value);
      if (!isNaN(parsedDate.getTime())) {
        valueToSave = parsedDate.toISOString();
      } else {
        console.error(`[${ts()}] [Agent.nine] ERROR — could not parse time value: "${parsed.value}"`);
        await this.reply("Sorry, I couldn't process that time format. Could you try specifying a clearer date and time, like 'tomorrow at 9am'?");
        return;
      }
    }

    // Route radius corrections through six() so the practice search re-runs
    // with the new radius, keeping that logic in one place.
    if (parsed.functionName === "setRadius") {
      await this.six(valueToSave);
      return;
    }

    try {
      console.log(`[${ts()}] [Agent.nine] Calling this.appointment.${parsed.functionName}("${this.patientId}", "${valueToSave}")`);
      await this.appointment[parsed.functionName](this.patientId, valueToSave);
      console.log(`[${ts()}] [Agent.nine] SUCCESS — ${parsed.functionName} saved.`);
    } catch (err) {
      console.error(`[${ts()}] [Agent.nine] ERROR — DB write failed for ${parsed.functionName}:`, err);
      await this.reply("Sorry, I had trouble saving that change. Could you try again?");
      return;
    }

    await this.track.addTrack(this.patientId, new Date(), `Corrected ${parsed.functionName} to ${valueToSave}`);

    if (parsed.functionName === "setLocation") {
      // location changed — re-run practice search if a radius is already on file
      const currentAppointment = await this.appointment.getAppointment(this.patientId);
      if (currentAppointment?.radius) {
        console.log(`[${ts()}] [Agent.nine] setLocation corrected and radius present — re-running practice search.`);
        await this.findPracticesAndPresent(valueToSave, currentAppointment.radius);
        return;
      }
    }

    await this.reply("Got it, I've updated that for you.");
  }
}