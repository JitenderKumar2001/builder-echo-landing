import { useContext, useMemo } from "react";
import { SettingsContext } from "../App";
import { Button } from "@/components/ui/button";
import { CalendarCheck, HeartPulse, Home, CarFront, Users } from "lucide-react";
import { toast } from "sonner";

interface ServiceItem {
  id: string;
  name: string;
  price: string;
  availability: string;
  icon: React.ReactNode;
}

export default function Services() {
  const settings = useContext(SettingsContext)!;
  const services: ServiceItem[] = useMemo(
    () => [
      {
        id: "med",
        name: settings.language === "hi" ? "चिकित्सा जाँच" : "Medical Check-ups",
        price: settings.language === "hi" ? "₹499" : "$6",
        availability: settings.language === "hi" ? "कल 9AM-5PM" : "Tomorrow 9AM-5PM",
        icon: <HeartPulse className="h-7 w-7" />,
      },
      {
        id: "home",
        name: settings.language === "hi" ? "घर में सहायता" : "Home Assistance",
        price: settings.language === "hi" ? "नि:शुल्क (स्वयंसेवक)" : "Free (Volunteer)",
        availability: settings.language === "hi" ? "आज 2 स्लॉट" : "2 slots today",
        icon: <Home className="h-7 w-7" />,
      },
      {
        id: "comp",
        name: settings.language === "hi" ? "संगति" : "Companionship",
        price: settings.language === "hi" ? "नि:शुल्क" : "Free",
        availability: settings.language === "hi" ? "शाम 5PM-7PM" : "Evening 5PM-7PM",
        icon: <Users className="h-7 w-7" />,
      },
      {
        id: "trans",
        name: settings.language === "hi" ? "परिवहन" : "Transportation",
        price: settings.language === "hi" ? "₹149 / यात्रा" : "$2 / trip",
        availability: settings.language === "hi" ? "शनिवार उपलब्ध" : "Saturday available",
        icon: <CarFront className="h-7 w-7" />,
      },
    ],
    [settings.language],
  );

  return (
    <div className="space-y-4">
      {services.map((s) => (
        <div key={s.id} className="rounded-2xl border bg-card p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary grid place-items-center">{s.icon}</div>
            <div>
              <div className="text-xl font-bold leading-tight">{s.name}</div>
              <div className="text-muted-foreground">{s.availability}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-lg font-bold">{s.price}</div>
            <Button
              className="text-base font-bold h-12 px-5"
              onClick={() => toast.success(settings.language === "hi" ? "बुक किया गया" : "Booked")}
            >
              <CalendarCheck className="h-5 w-5 mr-2" /> {settings.language === "hi" ? "बुक करें" : "Book Now"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
