// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeMMsorf9TN-sPaewtKaml2WUN5IBMHbw",
  authDomain: "rihanyo-2ed.firebaseapp.com",
  projectId: "rihanyo-2ed",
  storageBucket: "rihanyo-2ed.firebasestorage.app",
  messagingSenderId: "636526396372",
  appId: "1:636526396372:web:1e0328bc22d6eb16ed0c41"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);  
export const auth = getAuth(app);
export const storage = getStorage(app);