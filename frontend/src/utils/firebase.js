import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";

// TODO: Replace these with your actual Firebase Client Configuration from the console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Helper for Recaptcha setup
export const setupRecaptcha = (buttonId) => {
    if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
        'size': 'invisible',
        'callback': (response) => {
            // reCAPTCHA solved
        }
    });
    return window.recaptchaVerifier;
};

export { signInWithPhoneNumber, sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode };
