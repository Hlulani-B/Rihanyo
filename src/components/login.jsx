import React from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";


export default function Login() {
const navigate= useNavigate();
  async function signin() {
    const provider = new GoogleAuthProvider();
    
    // Request additional Gmail scopes if your backend services need immediate auth delegation
    provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
    provider.addScope("https://www.googleapis.com/auth/gmail.modify");

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      const token = credential.accessToken;
      const userPayload = result.user;

      // Commit items to local session storage cache
      localStorage.setItem("token", token);
      
      // Save user identification so Rihanyo Admin Dashboard reads it automatically
      const adminName = userPayload.displayName || userPayload.email.split('@')[0];
      localStorage.setItem("user", JSON.stringify({ name: adminName, email: userPayload.email }));

      console.log('Logged in user:', userPayload.email);
      console.log('Access token written to local storage.');
      navigate("/dashboard");
      
      // Route programmatically or refresh to step into dashboard workspace layout
      window.location.reload();
    } catch (error) {
      console.error('Sign-in failed:', error);
    }
  }

  return (
    <div style={styles.viewContainer}>
      <section style={styles.loginCard}>
        <h1 style={styles.brandTitle}>Rihanyo</h1>
        <h3 style={styles.subTitle}>Admin Portal Access</h3>
        <p style={styles.infoText}>Please sign in using an authorized management identity credential.</p>
        
        <button onClick={signin} style={styles.googleButton}>
          Sign in with Google
        </button>
      </section>
    </div>
  );
}

const styles = {
  viewContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#fafbfc',
    fontFamily: 'Segoe UI, Arial, sans-serif'
  },
  loginCard: {
    width: '360px',
    backgroundColor: '#fff',
    border: '1px solid #d2e3f7',
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0, 102, 204, 0.03)'
  },
  brandTitle: {
    margin: '0 0 4px 0',
    fontSize: '32px',
    fontWeight: '800',
    color: '#0066cc',
    letterSpacing: '0.5px'
  },
  subTitle: {
    margin: '0 0 16px 0',
    fontSize: '13px',
    fontWeight: '700',
    color: '#778899',
    textTransform: 'uppercase',
    letterSpacing: '0.8px'
  },
  infoText: {
    fontSize: '13.5px',
    color: '#556677',
    lineHeight: '1.5',
    margin: '0 0 30px 0'
  },
  googleButton: {
    width: '100%',
    backgroundColor: '#0066cc',
    color: '#fff',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'background-color 0.15s ease'
  }
};