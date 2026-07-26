import React from "react";
import {useNavigate} from "react-router-dom";

// Rihanyo landing page — reception-desk / appointment-card theme.
// Fonts (add to your index.html <head> or _document, not required for the component to render):
// <link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Libre+Franklin:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">

const ArrowIcon = () => (
  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
    <path d="M1 5H11M11 5L7 1M11 5L7 9" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export default function RihanyoLanding({
  bookHref = "#book",
  practiceHref = "#practice",
  adminHref = "#admin",
}) {


    const navigate= useNavigate();
  return (
    <div style={styles.body}>
      <div style={styles.wrap}>
        <header style={styles.header}>
          <div style={styles.logo}>
            <span style={styles.dot} /> Rihanyo
          </div>
          <nav>
            <a href="#how" style={styles.navLink}>How it works</a>
            <a href={bookHref} style={styles.navLink}>Book</a>
            <a href={practiceHref} style={styles.navLink}>For practices</a>
          </nav>
        </header>

        <section style={styles.hero}>
          <div>
            <div style={styles.eyebrow}>
              <span style={styles.eyebrowLine} /> Booking, handled
            </div>
            <h1 style={styles.h1}>
              Your appointment,<br />
              <span style={styles.em}>sorted</span> — no hold music.
            </h1>
            <p style={styles.lede}>
              Hlulani is the secretary who never puts you on hold. Message her, tell her
              what you need, and she'll find the nearest doctor, check for clashes, and
              lock in the time — all in the chat you already have open.
            </p>
            <div style={styles.heroActions}>
              <a href={bookHref} style={{ ...styles.btn, ...styles.btnPrimary }}>
                Book an appointment
              </a>
              <a href="#how" style={{ ...styles.btn, ...styles.btnGhost }}>
                See how it works
              </a>
            </div>
          </div>

          <div style={styles.desk}>
            <span style={{ ...styles.pin, top: -4, left: "16%" }} />
            <Card
              id="book"
              
              tag="Patients"
              title="Book an appointment"
              body="Tell Hlulani, the secretary, where you are and what you need — she'll find a doctor nearby and lock in a time."
              cta="Start on Chat"
              style={styles.cardBook}
              onClick={()=>{navigate("/patient/signin")}}
            />

            <span style={{ ...styles.pin, top: 174, left: "48%" }} />
            <Card
              id="practice"
              
              tag="Practices"
              title="Practice sign-in"
              body="See today's bookings, manage your calendar, and update your listing."
              cta="Go to dashboard"
              style={styles.cardPractice}
            />

            <span style={{ ...styles.pin, top: 14, left: "69%" }} />
            <Card
              id="admin"
             
              tag="Admin"
              title="Admin login"
              body="Manage practices, review clashes, and oversee the booking network."
              cta="Enter admin"
              style={styles.cardAdmin}
              onClick={()=>{navigate("/admin/login")}}
            />

            <div style={styles.stamp}>RECEIVED<br />&amp; CONFIRMED</div>
          </div>
        </section>

        <section id="how" style={styles.strip}>
          <div style={styles.stripHead}>
            <h2 style={styles.stripH2}>How a booking actually happens</h2>
            <span style={styles.stripNote}>NO APP · NO CALL · NO FORM</span>
          </div>
          <div style={styles.steps}>
            <Step
              num="Say hello"
              title="Message Hlulani"
              body="Open the chats, say what you need. She asks for your name, location, and how far you're willing to travel."
              first
            />
            <Step
              num="She checks"
              title="Nearest doctor, real availability"
              body="She finds practices near you and checks the time you want against what's actually open — no double-bookings."
            />
            <Step
              num="You're booked"
              title="Confirmation, in the chat"
              body="No app to download, no account to create. Your appointment lands right where the conversation happened."
            />
          </div>
        </section>

        <footer style={styles.footer}>
          <div style={styles.fLogo}>Rihanyo</div>
          <div style={styles.fNote}>A WHATSAPP APPOINTMENT SECRETARY · JOHANNESBURG</div>
        </footer>
      </div>
    </div>
  );
}

function Card({ id, href, tag, title, body, cta, style, onClick }) {
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault(); // Prevents jumping to #book or changing hash URL
      onClick(e);
    }
  };

  return (
    <a href={href} id={id} onClick={handleClick} style={{ ...styles.card, ...style }}>
      <div style={styles.cardTag}>
        <span>{tag}</span>
        {tag === "Patients" && <span style={{ color: "#2F6B4F", fontWeight: 700 }}>✓</span>}
      </div>
      <h3 style={styles.cardH3}>{title}</h3>
      <p style={styles.cardP}>{body}</p>
      <span style={styles.cardGo}>
        {cta} <ArrowIcon />
      </span>
    </a>
  );
}

function Step({ num, title, body, first }) {
  return (
    <div style={{ ...styles.step, ...(first ? styles.stepFirst : {}) }}>
      <div style={styles.stepNum}>{num}</div>
      <h4 style={styles.stepH4}>{title}</h4>
      <p style={styles.stepP}>{body}</p>
    </div>
  );
}

const colors = {
  paper: "#9db0b5",
  card: "#FBF9F2",
  ink: "#223027",
  inkSoft: "#4B5A4F",
  green: "#2F6B4F",
  greenDeep: "#1E4A35",
  stamp: "#B5402F",
  muted: "#71838a",
  line: "#939ea2",
};

const styles = {
  body: {
    background: `radial-gradient(ellipse at 20% -10%, #F2ECDD 0%, transparent 55%), ${colors.paper}`,
    color: colors.ink,
    fontFamily: "'Libre Franklin', sans-serif",
    minHeight: "100vh",
  },
  wrap: { maxWidth: 1180, margin: "0 auto", padding: "0 32px" },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "28px 0 18px",
  },
  logo: {
    fontFamily: "'Special Elite', monospace",
    fontSize: 22,
    letterSpacing: ".5px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: colors.green,
    boxShadow: "0 0 0 3px rgba(47,107,79,0.18)",
    display: "inline-block",
  },
  navLink: {
    fontSize: 13,
    color: colors.inkSoft,
    textDecoration: "none",
    marginLeft: 26,
  },

  hero: {
    padding: "56px 0 40px",
    display: "grid",
    gridTemplateColumns: "1.05fr 1fr",
    gap: 40,
    alignItems: "center",
  },
  eyebrow: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    letterSpacing: ".14em",
    textTransform: "uppercase",
    color: colors.stamp,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  eyebrowLine: { width: 22, height: 1, background: colors.stamp, display: "inline-block" },
  h1: {
    fontFamily: "'Special Elite', monospace",
    fontWeight: 400,
    fontSize: "clamp(38px, 5vw, 58px)",
    lineHeight: 1.08,
    margin: "0 0 22px",
  },
  em: {
    color: colors.greenDeep,
    background: "linear-gradient(180deg, transparent 62%, rgba(47,107,79,.18) 62%)",
  },
  lede: {
    fontSize: 17,
    lineHeight: 1.65,
    color: colors.inkSoft,
    maxWidth: "46ch",
    margin: "0 0 30px",
  },
  heroActions: { display: "flex", gap: 14, flexWrap: "wrap" },

  btn: {
    fontFamily: "'Libre Franklin', sans-serif",
    fontWeight: 600,
    fontSize: 14.5,
    padding: "13px 22px",
    borderRadius: 3,
    border: `1.5px solid ${colors.ink}`,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  btnPrimary: { background: colors.ink, color: colors.paper },
  btnGhost: { background: "transparent", color: colors.ink },

  desk: { position: "relative", minHeight: 420 },
  card: {
    position: "absolute",
    background: colors.card,
    border: `1px solid ${colors.line}`,
    boxShadow: "0 10px 24px rgba(34,48,39,0.12), 0 2px 4px rgba(34,48,39,0.08)",
    borderRadius: 2,
    padding: "20px 20px 18px",
    width: 238,
    textDecoration: "none",
    color: colors.ink,
    display: "block",
  },
  cardBook: { top: 0, left: "6%", transform: "rotate(-3.5deg)" },
  cardPractice: { top: 180, left: "38%", transform: "rotate(2.5deg)" },
  cardAdmin: { top: 20, left: "60%", transform: "rotate(5deg)" },

  cardTag: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10.5,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: colors.muted,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottom: `1px dashed ${colors.line}`,
    paddingBottom: 10,
  },
  cardH3: { fontFamily: "'Libre Franklin', sans-serif", fontWeight: 700, fontSize: 17, margin: "0 0 8px" },
  cardP: { fontSize: 13, color: colors.inkSoft, lineHeight: 1.5, margin: "0 0 12px" },
  cardGo: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11.5,
    color: colors.greenDeep,
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },

  pin: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: "50%",
    background: colors.stamp,
    boxShadow: "0 2px 3px rgba(0,0,0,.25)",
  },

  stamp: {
    position: "absolute",
    top: 290,
    left: "2%",
    width: 96,
    height: 96,
    border: `2.5px solid ${colors.stamp}`,
    borderRadius: "50%",
    color: colors.stamp,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    fontFamily: "'Special Elite', monospace",
    fontSize: 11,
    lineHeight: 1.3,
    transform: "rotate(-14deg)",
    opacity: 0.85,
    letterSpacing: ".04em",
  },

  strip: {
    borderTop: `1px solid ${colors.line}`,
    borderBottom: `1px solid ${colors.line}`,
    padding: "54px 0",
    marginTop: 30,
  },
  stripHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 36,
    gap: 20,
    flexWrap: "wrap",
  },
  stripH2: { fontFamily: "'Special Elite', monospace", fontWeight: 400, fontSize: 26, margin: 0 },
  stripNote: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: colors.muted },

  steps: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 0 },
  step: { padding: "0 26px", borderLeft: `1px dashed ${colors.line}` },
  stepFirst: { borderLeft: "none", paddingLeft: 0 },
  stepNum: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: colors.greenDeep, marginBottom: 10 },
  stepH4: { margin: "0 0 8px", fontSize: 16, fontWeight: 700 },
  stepP: { margin: 0, fontSize: 13.5, color: colors.inkSoft, lineHeight: 1.6 },

  footer: {
    padding: "40px 0 60px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
  },
  fLogo: { fontFamily: "'Special Elite', monospace", fontSize: 15, color: colors.inkSoft },
  fNote: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: colors.muted },
};