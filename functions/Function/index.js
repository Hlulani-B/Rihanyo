//this is responsible for getting the body and returning a message
/**
 * it gets called by your WhatsApp webhook endpoint whenever a new message comes in
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { Appointment, Conversation } from "./crud.js";
import { Main } from "./main.js";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const appointment = new Appointment();
const conversation = new Conversation();

// This safely holds "id" per-request, even if many requests run concurrently.
// Unlike a plain module-level variable, each request gets its own isolated context,
// so user A's id can never leak into user B's Return() call.
const requestContext = new AsyncLocalStorage();

function extractMessage(body) {
  try {
    const value = body.entry[0].changes[0].value;
    const message = value.messages?.[0];

    if (!message) {
      return null;
    }

    const id = message.from;

    let text = null;

    if (message.type === "text") {
      text = message.text.body;
    } else if (message.type === "location") {
      const { latitude, longitude, name, address } = message.location;
      text = `[location shared] lat: ${latitude}, lng: ${longitude}${name ? `, name: ${name}` : ""}${address ? `, address: ${address}` : ""}`;
    } else {
      text = `[unsupported message type: ${message.type}]`;
    }

    return { id, text };
  } catch (err) {
    console.error("Failed to extract message from webhook body:", err);
    return null;
  }
}

export async function Init(body) {
  // ── Chat webhook path (whatsapp = false) ──
  if (body.chatbot) {
    const { id, text } = body;

    if (!id || !text) {
      return { error: "id and text are required for chatbot messages" };
    }

    const existing = await appointment.getAppointment(id);

    if (!existing) {
      await appointment.createAppointment(id, null, null);
    }

    await conversation.addConversation(id, new Date(), "user", text);

    return new Promise((resolveChat) => {
      requestContext.run({ id, resolveChat }, async () => {
        const main = new Main();
        await main.Hlulani(id, false);
      });
    });
  }

  // ── WhatsApp webhook path (whatsapp = true) ──
  const extracted = extractMessage(body);

  if (!extracted) {
    return;
  }

  const { id, text } = extracted;

  return requestContext.run({ id }, async () => {
    const existing = await appointment.getAppointment(id);

    if (!existing) {
      await appointment.createAppointment(id, null, null);
    }

    await conversation.addConversation(id, new Date(), "user", text);

    const main = new Main();
    await main.Hlulani(id, true);
  });
}

// Only used by WhatsApp-originated conversations. For chat webhook conversations,
// the response is resolved directly via resolveChat instead — Agent.reply() only
// calls this when this.whatsapp is true.
export async function Return(message) {
  const context = requestContext.getStore();

  if (!context?.id) {
    console.error("Return() called outside of a request context — no id available");
    return;
  }

  const { id, resolveChat } = context;

  if (resolveChat) {
    resolveChat(message);
    return { message };
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: id,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to send WhatsApp message:", data);
    }

    return data;
  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
  }
}