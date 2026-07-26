// Backend (Cloud Functions) Firebase init — uses the ADMIN SDK, not the
// client/web SDK. The client SDK config you had here (apiKey, authDomain,
// etc.) is meant for browsers/mobile apps and is ALWAYS subject to Firestore
// Security Rules, even when imported into backend code. That's why
// getAllPractices() was failing with "Missing or insufficient permissions."
// The Admin SDK authenticates as a trusted server via a service account and
// bypasses Security Rules entirely — which is what a Cloud Function needs.

import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    // Inside a deployed Cloud Function / Firebase Functions runtime, this
    // automatically picks up the function's own service account — no key
    // file needed.
    credential: admin.credential.applicationDefault(),
    storageBucket: "rihanyo-2ed.firebasestorage.app",
  });

  // If you're running this LOCALLY (not inside deployed Cloud Functions),
  // applicationDefault() won't have credentials unless you've set
  // GOOGLE_APPLICATION_CREDENTIALS. In that case, download a service account
  // key from Firebase Console -> Project Settings -> Service Accounts, save
  // it (e.g. as serviceAccountKey.json, keep it OUT of git), and instead use:
  //
  // import { readFileSync } from "fs";
  // const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));
  // admin.initializeApp({
  //   credential: admin.credential.cert(serviceAccount),
  //   storageBucket: "rihanyo-2ed.firebasestorage.app",
  // });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();