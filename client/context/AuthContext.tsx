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
    // Setup reCAPTCHA per request to avoid stale instance
    // Container is created dynamically and reused
    let container = document.getElementById("recaptcha-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "recaptcha-container";
      document.body.appendChild(container);
    }
    const verifier = new RecaptchaVerifier(authInst, "recaptcha-container", {
      size: "invisible",
    });
    const conf = await signInWithPhoneNumber(authInst, phoneE164, verifier);
    setConfirmation(conf);
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
