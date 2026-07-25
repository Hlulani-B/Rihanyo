import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function SignIn() {
  const navigate = useNavigate();
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      localStorage.setItem("email", result.user.email);
      navigate("/chat");
    } catch (err) {
      console.error("Sign in failed:", err);
      alert("Sign in failed. Please try again.");
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.brand}>
        <span style={styles.dot} />
        Rihanyo
      </div>

      <div style={styles.card}>
        <div style={styles.eyebrow}>
          <span style={styles.eyebrowBar} />
          PATIENT SIGN-IN
        </div>

        <h1 style={styles.title}>Let's get you booked.</h1>
        <p style={styles.subtitle}>
          Sign in to pick up where the chat left off — your appointments,
          all in one place.
        </p>

        <button
          style={styles.button}
          onClick={handleSignIn}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2f473e")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1f2e27")}
        >
          Sign in with Google →
        </button>

        <p style={styles.footnote}>No app. No password. Just Google.</p>
      </div>

      <div style={styles.stamp}>
        <span>SECURE
          <br />
          SIGN-IN
        </span>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    background:
      "linear-gradient(160deg, #cdd8d4 0%, #aebcbb 45%, #8fa3a5 100%)",
    fontFamily:
      "'JetBrains Mono', 'Fira Code', 'IBM Plex Mono', Consolas, monospace",
    padding: "24px",
  },
  brand: {
    position: "absolute",
    top: "40px",
    left: "40px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "18px",
    color: "#1f2e27",
    fontWeight: 600,
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#2f6b52",
    display: "inline-block",
  },
  card: {
    background: "#f7f4ec",
    padding: "44px 40px",
    borderRadius: "4px",
    boxShadow: "0 20px 40px rgba(20, 30, 28, 0.18)",
    textAlign: "left",
    width: "100%",
    maxWidth: "380px",
    border: "1px solid rgba(20, 30, 28, 0.08)",
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "12px",
    letterSpacing: "1.5px",
    color: "#c1502e",
    fontWeight: 600,
    marginBottom: "18px",
  },
  eyebrowBar: {
    width: "18px",
    height: "2px",
    background: "#c1502e",
    display: "inline-block",
  },
  title: {
    margin: 0,
    marginBottom: "12px",
    fontSize: "28px",
    lineHeight: 1.2,
    color: "#1a2420",
    fontWeight: 700,
  },
  subtitle: {
    color: "#4b5852",
    marginBottom: "28px",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  button: {
    padding: "14px 20px",
    border: "none",
    borderRadius: "3px",
    background: "#1f2e27",
    color: "#f7f4ec",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
    fontFamily: "inherit",
    transition: "background 0.15s ease",
  },
  footnote: {
    marginTop: "16px",
    marginBottom: 0,
    fontSize: "12px",
    color: "#7c8983",
    textAlign: "center",
  },
  stamp: {
    position: "absolute",
    bottom: "56px",
    right: "72px",
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    border: "1.5px solid #c1502e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontSize: "10px",
    letterSpacing: "1px",
    color: "#c1502e",
    fontWeight: 600,
    transform: "rotate(-8deg)",
    opacity: 0.8,
  },
};