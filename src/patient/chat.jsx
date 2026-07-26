import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const CHAT_WEBHOOK_URL = "https://us-central1-rihanyo-2ed.cloudfunctions.net/chatWebhook";
const GET_CONVERSATION_URL = "https://us-central1-rihanyo-2ed.cloudfunctions.net/getConversation";

export default function Chat({ user }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const navigate = useNavigate();

  // Synchronous lock ref to prevent double-firing before React re-renders
  const isSendingRef = useRef(false);

  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const fastPollRef = useRef(null);

  // Tracks whether the user is currently scrolled near the bottom of the
  // chat. Auto-scroll-to-bottom only fires when this is true, so manually
  // scrolling up to read history won't get yanked back down by new messages
  // (including the background poll).
  const isNearBottomRef = useRef(true);

  const patientId = localStorage.getItem("email");

  useEffect(() => {
    loadHistory();

    // Always-on background poll
    const backgroundPoll = setInterval(() => {
      // Don't overwrite state while actively sending a request
      if (!isSendingRef.current) {
        loadHistory();
      }
    }, 2500);

    return () => {
      clearInterval(backgroundPoll);
      if (fastPollRef.current) clearInterval(fastPollRef.current);
    };
  }, []);

  useEffect(() => {
    // Only auto-scroll to the newest message if the user was already near
    // the bottom. If they've scrolled up to read earlier messages, leave
    // their scroll position alone.
    if (isNearBottomRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleChatScroll() {
    const el = chatContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Treat "within 80px of the bottom" as still being at the bottom
    isNearBottomRef.current = distanceFromBottom < 80;
  }

  async function loadHistory() {
    if (!patientId) return;
    try {
      const res = await fetch(`${GET_CONVERSATION_URL}?patientId=${encodeURIComponent(patientId)}`);
      if (!res.ok) return;
      const data = await res.json();
      
      if (data.messages) {
        setMessages((prev) => {
          // If sending locally, don't drop the unsaved optimistic user message
          if (isSendingRef.current) return prev;
          return data.messages;
        });
      }
    } catch (err) {
      console.error("Failed to load conversation history:", err);
    }
  }

  function pollForResponse() {
    if (fastPollRef.current) clearInterval(fastPollRef.current);

    let attempts = 0;
    const maxAttempts = 15;

    fastPollRef.current = setInterval(async () => {
      attempts++;
      if (!patientId) return;

      try {
        const res = await fetch(`${GET_CONVERSATION_URL}?patientId=${encodeURIComponent(patientId)}`);
        if (!res.ok) throw new Error("Network response was not ok");
        
        const data = await res.json();
        const newMessages = data.messages || [];

        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.actor === "ai") {
          setMessages(newMessages);
          clearInterval(fastPollRef.current);
          isSendingRef.current = false;
          setSending(false);
        } else if (attempts >= maxAttempts) {
          console.error("Polling for AI response timed out after max attempts.");
          clearInterval(fastPollRef.current);
          isSendingRef.current = false;
          setSending(false);
        }
      } catch (err) {
        console.error("Error polling for response:", err);
        if (attempts >= maxAttempts) {
          clearInterval(fastPollRef.current);
          isSendingRef.current = false;
          setSending(false);
        }
      }
    }, 1500);
  }

  async function sendMessageText(messageContent) {
    if (!messageContent || sending || isSendingRef.current) return;

    isSendingRef.current = true;
    setSending(true);

    // Sending a message is a deliberate user action — snap back to bottom
    // so they see their own message and the reply as it arrives.
    isNearBottomRef.current = true;

    // Optimistically show user message
    setMessages((prev) => [...prev, { actor: "user", message: messageContent }]);

    try {
      const res = await fetch(CHAT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbot: true, id: patientId, text: messageContent }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      pollForResponse();
    } catch (err) {
      // Log the failure for debugging — no message injected into the chat UI
      console.error("Failed to send message:", err);
      isSendingRef.current = false;
      setSending(false);
      if (fastPollRef.current) clearInterval(fastPollRef.current);
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    await sendMessageText(trimmed);
  }

  // Reverse geocodes coordinates to a readable address line
  async function reverseGeocode(lat, lon) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
      );
      const data = await response.json();
      return data.display_name || null;
    } catch (err) {
      console.error("Failed to translate coordinates to address:", err);
      return null;
    }
  }

  // Handle Share Location Button
  function handleShareLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Convert lat/lng into a street address line
        const address = await reverseGeocode(latitude, longitude);
        setGettingLocation(false);

        const locationMessage = address
          ? `My location is ${address}`
          : `My location is Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;

        await sendMessageText(locationMessage);
      },
      (error) => {
        setGettingLocation(false);
        console.error("Error obtaining location:", error);
        alert("Unable to retrieve your location. Please check browser permissions.");
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Handle View Practices Button
  async function handleViewPractices() {
    navigate("/practices");
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

        <div style={styles.chat} ref={chatContainerRef} onScroll={handleChatScroll}>
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

        {/* Quick Action Buttons */}
        <div style={styles.actionRow}>
          <button
            type="button"
            style={styles.actionBtn}
            onClick={handleShareLocation}
            disabled={sending || gettingLocation}
          >
            {gettingLocation ? "Locating address..." : "Share Location"}
          </button>
          <button
            type="button"
            style={styles.actionBtn}
            onClick={handleViewPractices}
            disabled={sending || gettingLocation}
          >
            View Practices
          </button>
        </div>

        {/* Input Form */}
        <form style={styles.inputRow} onSubmit={handleSubmit}>
          <input
            style={styles.input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            disabled={sending || gettingLocation}
          />
          <button type="submit" style={styles.sendBtn} disabled={sending || gettingLocation}>
            {sending ? "Sending..." : "Send"} <span style={styles.arrow}>→</span>
          </button>
        </form>
        <p style={styles.patienceNote}>
          Replies can take a little while — please be patient while Rihanyo checks availability.
        </p>
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
    background: "#dbdbd1",
    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
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
    background: "#8fa3a5",
    border: `1px solid ${LINE}`,
    borderRadius: "4px",
    height: "60vh",
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
  actionRow: {
    display: "flex",
    gap: "10px",
    marginTop: "12px",
  },
  actionBtn: {
    flex: 1,
    padding: "10px",
    border: `1px solid ${LINE}`,
    borderRadius: "4px",
    background: "#F4F1EA",
    color: INK,
    fontFamily: "inherit",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center",
  },
  inputRow: {
    display: "flex",
    gap: "10px",
    marginTop: "10px",
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
  patienceNote: {
    margin: "10px 0 0",
    fontSize: "11px",
    color: MUTE,
    textAlign: "center",
  },
};