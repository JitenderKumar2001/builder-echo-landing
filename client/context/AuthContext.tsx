import React from "react";
import {
  getAuth,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  User,
} from "firebase/auth";
import { auth as authInst } from "@/services/firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  requestOtp: (phoneE164: string) => Promise<void>;
  verifyOtp: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [confirmation, setConfirmation] = React.useState<import("firebase/auth").ConfirmationResult | null>(null);

  React.useEffect(() => {
    if (!authInst) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(authInst, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const requestOtp = async (phoneE164: string) => {
    if (!authInst) throw new Error("Auth disabled");
    // Ensure recaptcha container exists
    let container = document.getElementById("recaptcha-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "recaptcha-container";
      document.body.appendChild(container);
    }

    try {
      // Reuse verifier if present to avoid multiple widgets
      const win = window as any;
      let verifier: RecaptchaVerifier;
      if (win.__firebaseRecaptchaVerifier && win.__firebaseRecaptchaVerifier.render) {
        verifier = win.__firebaseRecaptchaVerifier;
      } else {
        verifier = new RecaptchaVerifier(authInst, "recaptcha-container", {
          size: "invisible",
        });
        win.__firebaseRecaptchaVerifier = verifier;
      }

      // Make sure widget is rendered (some environments need explicit render)
      if (typeof verifier.render === "function") {
        try {
          await verifier.render();
        } catch (err) {
          // ignore render errors; signInWithPhoneNumber may still work
          console.debug("recaptcha render failed", err);
        }
      }

      const conf = await signInWithPhoneNumber(authInst, phoneE164, verifier);
      setConfirmation(conf);
    } catch (e: any) {
      console.error("requestOtp error", e);
      // Map common Firebase Auth errors to user-friendly messages
      const code = e?.code || e?.message || "unknown";
      if (code.includes("operation-not-allowed") || code.includes("OPERATION_NOT_ALLOWED")) {
        throw new Error("Phone authentication is disabled in Firebase console. Enable Phone provider.");
      }
      if (code.includes("unauthorized-domain") || code.includes("UNAUTHORIZED_DOMAIN")) {
        throw new Error("This domain is not authorized for Firebase Auth. Add your site to Authorized domains in Firebase Console.");
      }
      if (code.includes("quota_exceeded") || code.includes("TOO_MANY_REQUESTS") || code.includes("too-many-requests")) {
        throw new Error("Too many requests. Please try again later.");
      }
      throw e;
    }
  };

  const verifyOtp = async (code: string) => {
    if (!confirmation) throw new Error("No OTP requested");
    await confirmation.confirm(code);
    setConfirmation(null);
  };

  const logout = async () => {
    if (!authInst) return;
    await signOut(authInst);
  };

  const value: AuthContextValue = {
    user,
    loading,
    requestOtp,
    verifyOtp,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
