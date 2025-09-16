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

    let verifier: RecaptchaVerifier | null = null;
    const win = window as any;
    try {
      // If an old verifier exists, try to clear it to avoid stale widget issues.
      if (win.__firebaseRecaptchaVerifier) {
        try {
          if (typeof win.__firebaseRecaptchaVerifier.clear === "function") {
            win.__firebaseRecaptchaVerifier.clear();
          }
        } catch (err) {
          // ignore
        }
        win.__firebaseRecaptchaVerifier = undefined;
      }

      verifier = new RecaptchaVerifier(authInst, "recaptcha-container", {
        size: "invisible",
      });
      win.__firebaseRecaptchaVerifier = verifier;

      // Some browsers need explicit render
      if (typeof verifier.render === "function") {
        try {
          await verifier.render();
        } catch (err) {
          console.debug("recaptcha render failed", err);
        }
      }

      const conf = await signInWithPhoneNumber(authInst, phoneE164, verifier);
      setConfirmation(conf);
    } catch (e: any) {
      console.error("requestOtp error", { code: e?.code, message: e?.message, stack: e?.stack });
      // Clean up verifier on error
      try {
        if (verifier && typeof verifier.clear === "function") verifier.clear();
        if (win.__firebaseRecaptchaVerifier) win.__firebaseRecaptchaVerifier = undefined;
      } catch {}

      const code = (e?.code || e?.message || "unknown").toString();
      if (code.includes("operation-not-allowed") || code.includes("OPERATION_NOT_ALLOWED")) {
        throw new Error("Phone authentication is disabled in Firebase console. Enable Phone provider. (firebase error: " + code + ")");
      }
      if (code.includes("unauthorized-domain") || code.includes("UNAUTHORIZED_DOMAIN")) {
        throw new Error("This domain is not authorized for Firebase Auth. Add your site to Authorized domains in Firebase Console. (firebase error: " + code + ")");
      }
      if (code.includes("quota_exceeded") || code.includes("TOO_MANY_REQUESTS") || code.includes("too-many-requests")) {
        throw new Error("Too many requests. Please try again later. (firebase error: " + code + ")");
      }
      // For other errors surface code/message to UI
      throw new Error("requestOtp error: " + code);
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
