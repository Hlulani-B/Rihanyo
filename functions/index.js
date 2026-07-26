import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import supabase from "./supabase.js";

// Global configuration: 512MiB RAM + 0 minInstances guarantees $0 billing inside Google's free tier
setGlobalOptions({
  minInstances: 0,
  maxInstances: 10,
  memory: "512MiB",
});

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// 1. WhatsApp Webhook
export const whatsappWebhook = onRequest(
  { minInstances: 0 },
  async (req, res) => {
    // Verification (GET)
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        logger.info("Webhook verified successfully.");
        return res.status(200).send(challenge);
      } else {
        logger.warn("Webhook verification failed — token mismatch.");
        return res.sendStatus(403);
      }
    }

    // Incoming Messages (POST)
    if (req.method === "POST") {
      try {
        const { Init } = await import("./Function/index.js");
        await Init(req.body);
        return res.status(200).send("EVENT_RECEIVED");
      } catch (err) {
        logger.error("Error handling incoming WhatsApp message:", err);
        return res.status(200).send("EVENT_RECEIVED");
      }
    }

    return res.sendStatus(405);
  }
);

// 2. Web Chat Webhook
export const chatWebhook = onRequest(
  {
    cors: true,
    minInstances: 0,
    timeoutSeconds: 60,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    try {
      const { Init } = await import("./Function/index.js");
      
      // Await execution to ensure the promise resolves before container scales down
      await Init(req.body);

      return res.status(200).json({ status: "success" });
    } catch (err) {
      logger.error("Error processing chat message:", err);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Failed to process message" });
      }
    }
  }
);

// 3. Fetch Conversation History
export const getConversation = onRequest(
  { 
    cors: true,
    minInstances: 0, 
  },
  async (req, res) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const patientId = req.query.patientId;

    if (!patientId) {
      return res.status(400).json({ error: "patientId is required" });
    }

    try {
      const { Conversation } = await import("./Function/crud.js");

      let messages;
      if (typeof Conversation === "function") {
        const conversationInstance = new Conversation();
        messages = await conversationInstance.getConversation(patientId);
      } else if (typeof Conversation?.getConversation === "function") {
        messages = await Conversation.getConversation(patientId);
      } else {
        throw new Error("Conversation method not found");
      }

      return res.status(200).json({ messages: messages || [] });
    } catch (err) {
      logger.error("Error fetching conversation:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch conversation history" });
    }
  }
);

// 4. Cleanup Past Appointments
export const cleanupPastAppointments = onSchedule(
  {
    schedule: "every 1 hours",
    minInstances: 0,
  },
  async (event) => {
    const nowIso = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from("Appointment")
        .delete()
        .lt("time", nowIso)
        .select();

      if (error) {
        logger.error("Error deleting past appointments:", error);
        return;
      }

      logger.info(`Deleted ${data?.length ?? 0} past appointments.`);
    } catch (err) {
      logger.error("Unexpected error cleaning up past appointments:", err);
    }
  }
);