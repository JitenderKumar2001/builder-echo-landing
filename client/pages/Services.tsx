import { useContext, useMemo, useState } from "react";
import { SettingsContext } from "../App";
import { Button } from "@/components/ui/button";
import { CalendarCheck, HeartPulse, Home, CarFront, Users } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/services/firebase";
import {
  addDoc,
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { AuthContext } from "@/context/AuthContext";
import { pairKey } from "@/services/firebase";

interface ServiceItem {
  id: string;
  name: string;
  price: string;
  availability: string;
  icon: React.ReactNode;
}

export default function Services() {
  const settings = useContext(SettingsContext)!;
  const auth = useContext(AuthContext)!;
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [caregiverUid, setCaregiverUid] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const services: ServiceItem[] = useMemo(
    () => [
      {
        id: "med",
        name:
          settings.language === "hi" ? "चिकित्सा जाँच" : "Medical Check-ups",
        price: settings.language === "hi" ? "₹499" : "$6",
        availability:
          settings.language === "hi" ? "कल 9AM-5PM" : "Tomorrow 9AM-5PM",
        icon: <HeartPulse className="h-7 w-7" />,
      },
      {
        id: "home",
        name: settings.language === "hi" ? "घर में सहायता" : "Home Assistance",
        price:
          settings.language === "hi"
            ? "नि:शुल्क (स्वयंसेवक)"
            : "Free (Volunteer)",
        availability:
          settings.language === "hi" ? "आज 2 स्लॉट" : "2 slots today",
        icon: <Home className="h-7 w-7" />,
      },
      {
        id: "comp",
        name: settings.language === "hi" ? "संगति" : "Companionship",
        price: settings.language === "hi" ? "नि:शुल्क" : "Free",
        availability:
          settings.language === "hi" ? "शाम 5PM-7PM" : "Evening 5PM-7PM",
        icon: <Users className="h-7 w-7" />,
      },
      {
        id: "trans",
        name: settings.language === "hi" ? "परिवहन" : "Transportation",
        price: settings.language === "hi" ? "₹149 / यात्रा" : "$2 / trip",
        availability:
          settings.language === "hi" ? "शनिवार उपलब्ध" : "Saturday available",
        icon: <CarFront className="h-7 w-7" />,
      },
    ],
    [settings.language],
  );

  const submitBooking = async () => {
    if (!db) return toast.error("DB unavailable");
    if (!auth.user)
      return toast.error(
        settings.language === "hi" ? "कृपया साइन इन करें" : "Please sign in",
      );
    if (!serviceId || !date || !time)
      return toast.error(
        settings.language === "hi" ? "विवरण भरें" : "Fill details",
      );

    setBusy(true);
    try {
      const elderUid = auth.user.uid;
      const payload = {
        elderUid,
        caregiverUid: caregiverUid || null,
        serviceId,
        date,
        time,
        notes,
        createdAt: serverTimestamp(),
        status: "requested",
      };
      await addDoc(collection(db, "bookings"), payload);

      if (caregiverUid) {
        const key = pairKey(elderUid, caregiverUid);
        await setDoc(
          doc(db, "subscriptions", key),
          {
            elderUid,
            caregiverUid,
            active: true,
            since: serverTimestamp(),
          },
          { merge: true },
        );
      }

      toast.success(
        settings.language === "hi" ? "बुकिंग सफल" : "Booking submitted",
      );
      setNotes("");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to book");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-4 grid gap-3">
        <div className="text-xl font-bold">
          {settings.language === "hi" ? "सेवा बुक करें" : "Book a Service"}
        </div>
        <label className="grid gap-1">
          <span className="text-sm text-muted-foreground">
            {settings.language === "hi" ? "सेवा चुनें" : "Select Service"}
          </span>
          <select
            className="h-12 rounded-xl border px-3"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            <option value="">--</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">
              {settings.language === "hi" ? "तारीख" : "Date"}
            </span>
            <input
              className="h-12 rounded-xl border px-3"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-muted-foreground">
              {settings.language === "hi" ? "समय" : "Time"}
            </span>
            <input
              className="h-12 rounded-xl border px-3"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        <label className="grid gap-1">
          <span className="text-sm text-muted-foreground">
            {settings.language === "hi"
              ? "केयरगिवर UID (वैकल्पिक)"
              : "Caregiver UID (optional)"}
          </span>
          <input
            className="h-12 rounded-xl border px-3"
            placeholder="UID"
            value={caregiverUid}
            onChange={(e) => setCaregiverUid(e.target.value)}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-muted-foreground">
            {settings.language === "hi" ? "नोट्स" : "Notes"}
          </span>
          <textarea
            className="min-h-24 rounded-xl border p-3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <div>
          <Button
            className="h-12 px-6 text-base font-bold"
            onClick={submitBooking}
            disabled={busy}
          >
            <CalendarCheck className="h-5 w-5 mr-2" />{" "}
            {busy
              ? settings.language === "hi"
                ? "भेज रहा…"
                : "Submitting…"
              : settings.language === "hi"
                ? "जमा करें"
                : "Submit"}
          </Button>
        </div>
      </div>

      {services.map((s) => (
        <div
          key={s.id}
          className="rounded-2xl border bg-card p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center">
              {s.icon}
            </div>
            <div>
              <div className="text-xl font-bold leading-tight">{s.name}</div>
              <div className="text-muted-foreground">{s.availability}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold">{s.price}</div>
            <Button
              className="text-base font-bold h-12 px-5"
              onClick={() => setServiceId(s.id)}
            >
              <CalendarCheck className="h-5 w-5 mr-2" />{" "}
              {settings.language === "hi" ? "चयन करें" : "Select"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
