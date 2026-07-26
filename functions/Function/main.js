import { Agent } from "./agent.js";
import { AI } from "./ai.js";
import { Conversation, Track } from "./crud.js";

function ts() {
  return new Date().toISOString();
}

function getLastUserMessage(convosData) {
  if (!Array.isArray(convosData)) return "";
  for (let i = convosData.length - 1; i >= 0; i--) {
    const entry = convosData[i];
    if (entry?.actor === "user") {
      return entry.message || "";
    }
  }
  return "";
}

export class Main {
  async Hlulani(id, whatsapp) {
    let agent;
    try {
      console.log(`[${ts()}] [Hlulani] START — id=${id}, whatsapp=${whatsapp}`);

      const conversation = new Conversation();
      const track = new Track();
      agent = new Agent(id, whatsapp);

      const convosData = (await conversation.getConversation(id).catch((err) => {
        console.error(`[${ts()}] [Hlulani] ERROR — failed fetching conversation history:`, err);
        return [];
      })) || [];
      console.log(`[${ts()}] [Hlulani] convosData fetched — length=${convosData.length}`, JSON.stringify(convosData));

      const actionsData = (await track.getTrack(id).catch((err) => {
        console.error(`[${ts()}] [Hlulani] ERROR — failed fetching track logs:`, err);
        return [];
      })) || [];
      console.log(`[${ts()}] [Hlulani] actionsData fetched — length=${actionsData.length}`, JSON.stringify(actionsData));

      const lastUserMessage = getLastUserMessage(convosData);
      console.log(`[${ts()}] [Hlulani] lastUserMessage="${lastUserMessage}"`);

      const recentHistory = JSON.stringify(convosData);
      const recentActions = JSON.stringify(actionsData);

      const prompt = `You are Hlulani, an intent router for a medical appointment booking assistant.

CRITICAL MANDATE:
 If there is no previous AI greeting message in the conversation history, choosing option 1 ("four") is extremely important and mandatory. You MUST NOT route to any other agent until a greeting has taken place.

Recent Conversation History: ${recentHistory}
Recent Logged Actions: ${recentActions}
Latest Patient Message: "${lastUserMessage}"

ROUTE RULES (Select ONE agent):

1. "four" (Welcome Greeter) -> MUST BE CHOSEN if the conversation history contains no AI greeting message yet. THIS IS VERY IMPORTANT. ALWAYS GREET FIRST.
2. "two" (Cancellation Handler) -> Use ONLY if a greeting has already happened AND the patient explicitly expresses a desire to cancel or stop their booking.
3. "eight" (Info Answerer) -> Use ONLY if a greeting has already happened AND the patient asks a direct informational question (e.g., "Where is the practice?", "Who is Dr. Smith?", "What are the costs?").
0. "zero" (Clarification Needed) -> Use if a greeting has already happened AND the patient's message clearly intends to update/provide/change a field (name, surname, location, doctor, time, radius) BUT does not actually contain enough information to extract a value (e.g., they say "update my radius" with no number, "change my doctor" with no name, "my location is" with nothing after it, or an incomplete/cut-off message). Do NOT use "one" or "nine" in these cases since there is no extractable value — use "zero" instead and ask a short, specific clarifying question for exactly what's missing.
5. "one" (Field Updater) -> Use ONLY if a greeting has already happened AND the patient clearly provided a Name, Surname, Location, Doctor Name, or Radius in direct response to a question asking for it.
6. "six" (Radius Updater) -> Use ONLY if a greeting has already happened AND the patient explicitly wants to CHANGE or UPDATE their travel radius outside of directly answering a question that just asked for it (e.g., "actually change my radius to 15km", "can you make my travel distance 25km instead", "update my radius").
9. "nine" (Field Correction) -> Use ONLY if a greeting has already happened AND the patient wants to CORRECT or CHANGE a field they already provided earlier (name, surname, location, doctor, or time), NOT as a direct answer to the immediately preceding question (e.g., "actually my surname is spelled wrong, it's Baloyi", "change my location to Sandton", "I meant Dr. Khumalo not Dr. Naidoo").
7. "three" (Missing Field Checker / Default) -> Fallback ONLY IF a greeting has already happened.

the next default should be one if and only if

OUTPUT REQUIREMENTS:
The JSON key MUST be exactly "agent" — no slashes, no quotes, no whitespace, no other characters before or after it. Do not add any other top-level keys.

If you pick "one" or "nine", respond with ONLY this exact JSON structure:
{
  "agent": "one",
  "body": {
    "field": "<fields = ["name", "surname", "location", "doctor", "time","radius"];>", one of these
    "value": "You need to extract it from history eg if ai asks what is your whatever and i say x you must extract x"
  }
}

If you pick "six", respond with ONLY this exact JSON structure:
{
  "agent": "six",
  "body": {
    "value": "<the new radius value the patient wants, as a number or string>"
  }
}

If you pick "zero", respond with ONLY this exact JSON structure:
{
  "agent": "zero",
  "body": {
    "message": "<short, warm, conversational question asking specifically for the missing piece of information — e.g. 'What radius would you like to set?' or 'Which doctor would you like to change to?'>"
  }
}

For all other agents, respond with ONLY this exact JSON structure:
{
  "agent": "<four|two|eight|five|three>"
} Choose what makes sense refer to he times as the order of conversation

Example of a CORRECT response: {"agent": "four"}
Example of an INCORRECT response: {"/agent": "four"} — never prefix the key with a slash or any other character.`;

      console.log(`[${ts()}] [Hlulani] Sending router prompt to AI...`);
      const result = await AI(prompt);
      console.log(`[${ts()}] [Hlulani] Raw AI result:`, result);

      const cleaned = (result || "")
        .replace(/```json\s*/gi, "")
        .replace(/```/g, "")
        .trim();
      console.log(`[${ts()}] [Hlulani] Cleaned AI output:`, cleaned);

      let re;
      try {
        re = JSON.parse(cleaned);
        console.log(`[${ts()}] [Hlulani] Parsed router decision (pre-normalize):`, JSON.stringify(re));
      } catch (parseErr) {
        console.error(`[${ts()}] [Hlulani] ERROR — JSON PARSE FAILED. Raw was:`, cleaned, `| Error:`, parseErr.message);
        await agent.reply("Sorry, I didn't quite catch that — could you rephrase?");
        return; // hard stop — do not cascade into agent.three()
      }

      // Defensive normalization: some models hallucinate stray characters in keys
      // (e.g. "/agent" instead of "agent"). If ANY key contains "agent", treat its
      // value as the agent field rather than requiring an exact match.
      if (re && typeof re === "object" && !Array.isArray(re)) {
        if (!("agent" in re)) {
          const agentKey = Object.keys(re).find((k) => k.toLowerCase().includes("agent"));
          if (agentKey) {
            console.warn(`[${ts()}] [Hlulani] Router returned malformed key "${agentKey}" instead of "agent" — normalizing.`);
            re.agent = re[agentKey];
          }
        }
        if (!("body" in re)) {
          const bodyKey = Object.keys(re).find((k) => k.toLowerCase().includes("body"));
          if (bodyKey) {
            console.warn(`[${ts()}] [Hlulani] Router returned malformed key "${bodyKey}" instead of "body" — normalizing.`);
            re.body = re[bodyKey];
          }
        }
      }

      console.log(`[${ts()}] [Hlulani] Parsed router decision (normalized):`, JSON.stringify(re));

      if (!re || !re.agent) {
        console.error(`[${ts()}] [Hlulani] ERROR — router returned no usable "agent" field. Full parsed object:`, JSON.stringify(re));
        await agent.reply("Sorry, I didn't quite catch that — could you rephrase?");
        return; // hard stop
      }

      console.log(`[${ts()}] [Hlulani] re.agent = "${re.agent}" — dispatching...`);

      if (re.agent === "zero") {
        console.log(`[${ts()}] [Router→Zero] re.body:`, JSON.stringify(re.body));
        const clarifyMessage = re.body?.message;
        if (!clarifyMessage) {
          console.error(`[${ts()}] [Router→Zero] ERROR — router picked "zero" but re.body.message is missing. Full re:`, JSON.stringify(re));
          await agent.reply("Sorry, could you tell me a bit more about what you'd like to update?");
          return; // hard stop
        }
        console.log(`[${ts()}] [Router→Zero] Asking for clarification:`, clarifyMessage);
        // agent.reply() already writes to conversation history via
        // conversation.addConversation(), so no separate DB write needed here.
        await agent.reply(clarifyMessage);
        await track.addTrack(id, new Date(), `Asked for clarification: ${clarifyMessage}`);
        console.log(`[${ts()}] [Router→Zero] completed`);
        return;
      }

      if (re.agent === "one" || re.agent === "nine") {
        console.log(`[${ts()}] [Router→${re.agent}] re.body:`, JSON.stringify(re.body), `| agent.${re.agent} is function:`, typeof agent[re.agent] === "function");
        if (!re.body) {
          console.error(`[${ts()}] [Router→${re.agent}] ERROR — router picked "${re.agent}" but re.body is missing/empty. Full re:`, JSON.stringify(re));
          await agent.reply("Sorry, could you please clarify that value?");
          return; // hard stop — do NOT fall back to three()
        }
        if (typeof agent[re.agent] !== "function") {
          console.error(`[${ts()}] [Router→${re.agent}] ERROR — agent.${re.agent} is not a function.`);
          await agent.reply("I experienced an internal error. Could you try again?");
          return; // hard stop
        }
        console.log(`[${ts()}] [Router→${re.agent}] CALLING agent.${re.agent}() with body:`, JSON.stringify(re.body));
        await agent[re.agent](re.body);
        console.log(`[${ts()}] [Router→${re.agent}] agent.${re.agent}() completed`);
        return;
      }

      if (re.agent === "six") {
        console.log(`[${ts()}] [Router→Six] re.body:`, JSON.stringify(re.body), "| agent.six is function:", typeof agent.six === "function");
        if (typeof agent.six !== "function") {
          console.error(`[${ts()}] [Router→Six] ERROR — agent.six is not a function.`);
          await agent.reply("I experienced an internal error. Could you try again?");
          return; // hard stop
        }
        const radiusValue = re.body?.value;
        console.log(`[${ts()}] [Router→Six] CALLING agent.six() with radius:`, radiusValue);
        await agent.six(radiusValue);
        console.log(`[${ts()}] [Router→Six] agent.six() completed`);
        return;
      }

      if (re.agent === "eight") {
        console.log(`[${ts()}] [Router→Eight] lastUserMessage="${lastUserMessage}" | agent.eight is function:`, typeof agent.eight === "function");
        if (!lastUserMessage) {
          console.error(`[${ts()}] [Router→Eight] ERROR — router picked "eight" but lastUserMessage is empty.`);
          await agent.reply("Sorry, could you repeat your question?");
          return; // hard stop
        }
        if (typeof agent.eight !== "function") {
          console.error(`[${ts()}] [Router→Eight] ERROR — agent.eight is not a function.`);
          await agent.reply("I experienced an internal error. Could you try again?");
          return; // hard stop
        }
        await agent.eight(lastUserMessage);
        console.log(`[${ts()}] [Router→Eight] agent.eight() completed`);
        return;
      }

      if (typeof agent[re.agent] === "function") {
        console.log(`[${ts()}] [Router→${re.agent}] CALLING agent.${re.agent}()`);
        await agent[re.agent]();
        console.log(`[${ts()}] [Router→${re.agent}] agent.${re.agent}() completed`);
        return;
      }

      console.error(`[${ts()}] [Hlulani] ERROR — agent "${re.agent}" not recognized as a valid function on Agent.`);
      await agent.reply("I experienced an internal error. Could you try again?");
      return; // hard stop — do NOT silently fall back to three()
    } catch (err) {
      console.error(`[${ts()}] [Hlulani] CRITICAL FAILURE in router:`, err);
      if (agent && typeof agent.reply === "function") {
        try {
          await agent.reply("Sorry, something went wrong on my end — could you try that again?");
        } catch (replyErr) {
          console.error(`[${ts()}] [Hlulani] Failed to send fallback error reply:`, replyErr);
        }
      }
      return; // hard stop — do NOT call agent.three() after a critical failure
    } finally {
      console.log(`[${ts()}] [Hlulani] END — id=${id}`);
    }
  }
}