import React from "react";
import {
  AlertCircle,
  BellRing,
  CalendarDays,
  HeartPulse,
  PhoneCall,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SettingsContext, STRINGS } from "../App";
import { toast } from "sonner";

function useTTS() {
  const settings = React.useContext(SettingsContext);
  const enabled = settings?.tts ?? false;
  const speak = (text: string) => {
    if (!enabled) return;
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = settings?.language === "hi" ? "hi-IN" : "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {}
  };
  return { speak, enabled };
}

export default function Index() {
  const settings = React.useContext(SettingsContext)!;
  const t = STRINGS[settings.language];
  const { speak } = useTTS();
  const [sosOpen, setSosOpen] = React.useState(false);

  const quickItems = React.useMemo(
    () => [
      {
        key: "request",
        title: settings.language === "hi" ? "सहायता माँगे" : "Request Help",
        desc:
          settings.language === "hi"
            ? "चिकित्सा, दैनिक कार्य, भावनात्मक"
            : "Medical, daily, emotional",
        icon: <HeartPulse className="h-8 w-8" />,
        color: "from-primary to-primary/80",
        onClick: () =>
          toast.success(
            settings.language === "hi"
              ? "सहायता अनुरोध भेजा गया"
              : "Help request sent",
          ),
      },
      {
        key: "sos",
        title: "SOS",
        desc:
          settings.language === "hi" ? "आ���ातकालीन सहायता" : "Emergency help",
        icon: <ShieldAlert className="h-8 w-8" />,
        color: "from-red-600 to-red-500",
        onClick: () => setSosOpen(true),
      },
      {
        key: "schedule",
        title: settings.language === "hi" ? "आज की सूची" : "Today’s Schedule",
        desc:
          settings.language === "hi"
            ? "दवा 8AM • डॉक्टर 4PM"
            : "Meds 8AM • Doctor 4PM",
        icon: <CalendarDays className="h-8 w-8" />,
        color: "from-amber-500 to-amber-400",
        onClick: () =>
          toast.info(
            settings.language === "hi"
              ? "आज की गतिविधियाँ दिखाईं गईं"
              : "Showing today’s agenda",
          ),
      },
      {
        key: "care",
        title: settings.language === "hi" ? "केयरगिवर खोजें" : "Find Caregiver",
        desc:
          settings.language === "hi" ? "बुकिंग और सदस्यता" : "Booking & Subscription",
        icon: <Users className="h-8 w-8" />,
        color: "from-emerald-600 to-emerald-500",
        onClick: () => (window.location.href = "/services"),
      },
    ],
    [settings.language],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl p-5 bg-card border grid gap-4">
        <h2 className="text-2xl font-extrabold">
          {settings.language === "hi" ? "त्वरित कार्य" : "Quick Access"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickItems.map((q) => (
            <button
              key={q.key}
              onClick={() => {
                speak(q.title);
                q.onClick();
              }}
              className={`group rounded-2xl px-5 py-6 text-left shadow-lg bg-gradient-to-br ${q.color} text-white focus:outline-none focus:ring-4 focus:ring-white/40`}
            >
              <div className="flex items-center justify-between">
                <div className="text-3xl font-extrabold drop-shadow-sm leading-tight">
                  {q.title}
                </div>
                <div className="opacity-90 group-active:scale-95 transition-transform">
                  {q.icon}
                </div>
              </div>
              <div className="mt-2 text-lg opacity-95">{q.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl p-5 bg-card border">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <BellRing className="h-6 w-6 text-amber-500" />{" "}
          {settings.language === "hi"
            ? "दवाई रिमाइंडर"
            : "Medication Reminders"}
        </h3>
        <div className="mt-3 grid gap-3">
          <ReminderRow
            time="8:00 AM"
            title={
              settings.language === "hi" ? "मधुमेह की दवा" : "Diabetes meds"
            }
            note={
              settings.language === "hi" ? "खाने के बाद" : "After breakfast"
            }
          />
          <ReminderRow
            time="9:00 PM"
            title={
              settings.language === "hi" ? "ब्लड प्रेशर" : "Blood pressure"
            }
            note={settings.language === "hi" ? "सोने से पहले" : "Before sleep"}
          />
        </div>
      </section>

      <section className="rounded-2xl p-5 bg-card border">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <AlertCircle className="h-6 w-6 text-primary" />{" "}
          {settings.language === "hi" ? "परिवार चेतावनी" : "Family Alerts"}
        </h3>
        <p className="mt-2 text-lg text-muted-foreground">
          {settings.language === "hi"
            ? "मिस्ड मेडिकेशन पर परिवार को तुरंत सूचना भेजी जाएगी।"
            : "Family will be alerted instantly for missed meds, SOS, or bookings."}
        </p>
      </section>

      <AlertDialog open={sosOpen} onOpenChange={setSosOpen}>
        <AlertDialogTrigger asChild>
          <span />
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center gap-3">
              <ShieldAlert className="h-7 w-7 text-red-600" />{" "}
              {settings.language === "hi" ? "आपातकालीन SOS" : "Emergency SOS"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg">
              {settings.language === "hi"
                ? "क्या आप अपने आपातकालीन संपर्क को कॉल और लोकेशन भेजना चाहते हैं?"
                : "Do you want to call and send your location to your emergency contact?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-lg py-6 px-6">
              {settings.language === "hi" ? "रद्द करें" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-600/90 text-lg py-6 px-6"
              onClick={() => {
                try {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition((pos) => {
                      const { latitude, longitude } = pos.coords;
                      toast.success(
                        `${settings.language === "hi" ? "लोकेशन भेजी गई" : "Location sent"}: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                      );
                    });
                  }
                } catch {}
                setSosOpen(false);
              }}
            >
              <span className="inline-flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />{" "}
                {settings.language === "hi" ? "कॉल और भेजें" : "Call & Send"}
              </span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ReminderRow({
  time,
  title,
  note,
}: {
  time: string;
  title: string;
  note: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-4 bg-secondary/30">
      <div>
        <div className="text-xl font-bold">{title}</div>
        <div className="text-muted-foreground">{note}</div>
      </div>
      <div className="text-lg font-semibold flex items-center gap-2">
        <BellRing className="h-5 w-5" /> {time}
      </div>
    </div>
  );
}
