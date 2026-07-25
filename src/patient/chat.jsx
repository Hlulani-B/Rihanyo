import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

const CHAT_WEBHOOK_URL = "https://us-central1-patient-9e998.cloudfunctions.net/chatWebhook";
const GET_CONVERSATION_URL = "https://us-central1-patient-9e998.cloudfunctions.net/getConversation";

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);
  const fastPollRef = useRef(null);

  const patientId = localStorage.getItem("email");

  useEffect(() => {
    loadHistory();

    // Always-on background poll, independent of whether the user just sent something —
    // this is what picks up messages that arrive from the WhatsApp side too.
    const backgroundPoll = setInterval(() => {
      loadHistory();
    }, 2000);

    return () => {
      clearInterval(backgroundPoll);
      if (fastPollRef.current) clearInterval(fastPollRef.current);
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadHistory() {
    if (!patientId) return;
    try {
      const res = await fetch(`${GET_CONVERSATION_URL}?patientId=${encodeURIComponent(patientId)}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to load conversation history:", err);
    }
  }

  // Extra fast poll right after sending, so the reply feels snappy —
  // the background poll above is what guarantees it eventually shows up either way.
  function pollForResponse() {
    if (fastPollRef.current) clearInterval(fastPollRef.current);

    let attempts = 0;
    const maxAttempts = 8; // 8 attempts * 1.5s = 12 seconds max

    fastPollRef.current = setInterval(async () => {
      attempts++;
      if (!patientId) return;

      try {
        const res = await fetch(`${GET_CONVERSATION_URL}?patientId=${encodeURIComponent(patientId)}`);
        const data = await res.json();
        const newMessages = data.messages || [];

        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.actor === "ai") {
          setMessages(newMessages);
          clearInterval(fastPollRef.current);
        } else if (attempts >= maxAttempts) {
          clearInterval(fastPollRef.current);
        }
      } catch (err) {
        console.error("Error polling for response:", err);
      }
    }, 1500);
  }

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { actor: "user", message: trimmed }]);
    setText("");
    setSending(true);

    try {
      await fetch(CHAT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbot: true, id: patientId, text: trimmed }),
      });

      pollForResponse();
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => [...prev, { actor: "ai", message: "Failed to reach server. Try again?" }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.brandRow}>
          <span style={styles.dot} />
          <span style={styles.brand}>Rihanyo</span>
        </div>
        <button style={styles.signOutBtn} onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.eyebrowRow}>
          <span style={styles.eyebrowDash} />
          <span style={styles.eyebrow}>PATIENT CHAT</span>
        </div>

        <div style={styles.chat}>
          {messages.length === 0 && (
            <div style={styles.emptyState}>Say hello to get started.</div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={m.actor === "user" ? styles.userMsg : styles.aiMsg}
            >
              {m.message}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
          />
          <button style={styles.sendBtn} onClick={sendMessage} disabled={sending}>
            {sending ? "Sending..." : "Send"} <span style={styles.arrow}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const BLUE = "#2E5FB5";
const DARK = "#1E2A22";
const INK = "#22271F";
const MUTE = "#6B7268";
const LINE = "#E7E4DC";
const CLAY = "#B5502E";

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "#FFFFFF",
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "32px 40px 0 40px",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: DARK,
    display: "inline-block",
  },
  brand: {
    fontWeight: 700,
    fontSize: "16px",
    color: INK,
    letterSpacing: "0.3px",
  },
  signOutBtn: {
    border: "none",
    background: "none",
    color: MUTE,
    cursor: "pointer",
    fontSize: "12px",
    fontFamily: "inherit",
    fontWeight: 700,
    letterSpacing: "0.4px",
  },
  card: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    maxWidth: "540px",
    width: "100%",
    margin: "24px auto 40px auto",
    padding: "0 20px",
  },
  eyebrowRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
  },
  eyebrowDash: {
    width: "22px",
    height: "2px",
    background: CLAY,
    display: "inline-block",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "1.5px",
    color: CLAY,
  },
  chat: {
    flex: 1,
    background: "#FFFFFF",
    border: `1px solid ${LINE}`,
    borderRadius: "4px",
    minHeight: "440px",
    maxHeight: "60vh",
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  emptyState: {
    margin: "auto",
    fontSize: "13px",
    color: MUTE,
    textAlign: "center",
  },
  userMsg: {
    alignSelf: "flex-end",
    background: BLUE,
    color: "#FFFFFF",
    padding: "10px 14px",
    borderRadius: "4px",
    maxWidth: "75%",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  aiMsg: {
    alignSelf: "flex-start",
    background: "#F4F1EA",
    color: INK,
    padding: "10px 14px",
    borderRadius: "4px",
    maxWidth: "75%",
    fontSize: "14px",
    lineHeight: 1.5,
    border: `1px solid ${LINE}`,
  },
  inputRow: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
  },
  input: {
    flex: 1,
    padding: "14px 16px",
    borderRadius: "4px",
    border: `1px solid ${LINE}`,
    fontFamily: "inherit",
    fontSize: "14px",
    color: INK,
    outline: "none",
  },
  sendBtn: {
    padding: "14px 20px",
    border: "none",
    borderRadius: "4px",
    background: DARK,
    color: "#F4F1EA",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: "13px",
    letterSpacing: "0.3px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  arrow: {
    display: "inline-block",
  },
};