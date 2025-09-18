import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Services from "./pages/Services";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import { createContext, useEffect, useMemo, useState } from "react";
import { cn } from "./lib/utils";
import { Home, HeartHandshake, MessageCircle, User } from "lucide-react";

export type Language = "en" | "hi";

export const STRINGS: Record<Language, Record<string, string>> = {
  en: {
    appName: "Senior Buddy",
    home: "Home",
    services: "Services",
    chat: "Chat",
    profile: "Profile",
  },
  hi: {
    appName: "सीनियर बडी",
    home: "होम",
    services: "सेवाएँ",
    chat: "चैट",
    profile: "प्रोफ़ाइल",
  },
};

export interface AppSettings {
  language: Language;
  setLanguage: (l: Language) => void;
  tts: boolean;
  setTts: (v: boolean) => void;
}

export const SettingsContext = createContext<AppSettings | null>(null);

const queryClient = new QueryClient();

function Header() {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    // managed by provider
  }, []);

  return null;
}

function AppInner() {
  const [language, setLanguage] = useState<Language>("en");
  const [tts, setTts] = useState<boolean>(false);

  useEffect(() => {
    document.title = STRINGS[language].appName;
  }, [language]);

  // Simple dark-mode high-contrast toggle persisted
  const [dark, setDark] = useState<boolean>(false);
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  const value = useMemo(
    () => ({ language, setLanguage, tts, setTts }),
    [language, tts],
  );

  const t = STRINGS[language];

  const loc = useLocation();
  useEffect(() => {
    if (import.meta.env.DEV || import.meta.env.VITE_DEBUG === "true") {
      console.debug("[route]", loc.pathname + loc.search);
    }
  }, [loc]);

  return (
    <SettingsContext.Provider value={value}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <header className="sticky top-0 z-40 w-full bg-card/80 backdrop-blur border-b">
          <div className="max-w-screen-md mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">
                SB
              </div>
              <div className="text-2xl font-extrabold tracking-tight">
                {t.appName}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Toggle voice assistant"
                onClick={() => setTts((v) => !v)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-semibold",
                  tts
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {tts
                  ? language === "hi"
                    ? "आवाज़ चालू"
                    : "Voice On"
                  : language === "hi"
                    ? "आवाज़ बंद"
                    : "Voice Off"}
              </button>
              <button
                aria-label="Toggle high contrast"
                onClick={() => setDark((v) => !v)}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-semibold",
                  dark
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {dark
                  ? language === "hi"
                    ? "डार्क"
                    : "Dark"
                  : language === "hi"
                    ? "लाइट"
                    : "Light"}
              </button>
              <select
                aria-label="Language"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-semibold"
              >
                <option value="en">EN</option>
                <option value="hi">हिंदी</option>
              </select>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-screen-md mx-auto w-full px-4 pb-28 pt-4">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/services" element={<Services />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur">
          <div className="max-w-screen-md mx-auto grid grid-cols-4">
            <TabLink
              to="/"
              icon={<Home className="h-6 w-6" />}
              label={t.home}
            />
            <TabLink
              to="/services"
              icon={<HeartHandshake className="h-6 w-6" />}
              label={t.services}
            />
            <TabLink
              to="/chat"
              icon={<MessageCircle className="h-6 w-6" />}
              label={t.chat}
            />
            <TabLink
              to="/profile"
              icon={<User className="h-6 w-6" />}
              label={t.profile}
            />
          </div>
        </nav>
      </div>
    </SettingsContext.Provider>
  );
}

function TabLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center justify-center gap-2 py-3 text-base font-semibold",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
        )
      }
    >
      <div className="grid place-items-center">{icon}</div>
      <span className="sr-only sm:not-sr-only sm:block">{label}</span>
    </NavLink>
  );
}

import { AuthProvider } from "./context/AuthContext";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
