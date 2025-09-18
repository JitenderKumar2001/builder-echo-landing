import React from "react";
import { Mic, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthContext } from "@/context/AuthContext";
import { useSearchParams } from "react-router-dom";
import {
  firebaseEnabled,
  subscribeToMessages,
  sendText,
  uploadVoiceAndSend,
  ChatMessage,
  pairKey,
  checkSubscription,
} from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function Chat() {
  const auth = React.useContext(AuthContext)!;
  const [ready, setReady] = React.useState(false);
  const [uid, setUid] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [partnerUid, setPartnerUid] = React.useState<string>("");
  const [allowed, setAllowed] = React.useState<boolean>(false);
  const [roomId, setRoomId] = React.useState<string>("global");
  const [myRole, setMyRole] = React.useState<string | null>(null);
  const [partnerProfile, setPartnerProfile] = React.useState<any | null>(null);
  const [params] = useSearchParams();
  const [input, setInput] = React.useState("");
  const [recording, setRecording] = React.useState(false);
  const [recorder, setRecorder] = React.useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = React.useState<BlobPart[]>([]);

  // roomId will be computed once partner + subscription valid

  React.useEffect(() => {
    if (!firebaseEnabled) return;
    setUid(auth.user ? auth.user.uid : null);
    setReady(true);
  }, [auth.user]);

  React.useEffect(() => {
    const p = params.get("partner");
    if (p) setPartnerUid(p);
  }, [params]);

  React.useEffect(() => {
    (async () => {
      if (!db || !uid) return;
      const snap = await getDoc(doc(db, "profiles", uid));
      if (snap.exists()) setMyRole((snap.data() as any).role || null);
    })();
  }, [uid]);

  React.useEffect(() => {
    (async () => {
      if (!db || !partnerUid) return;
      const snap = await getDoc(doc(db, "profiles", partnerUid));
      setPartnerProfile(snap.exists() ? snap.data() : null);
    })();
  }, [partnerUid]);

  React.useEffect(() => {
    (async () => {
      if (!uid || !partnerUid || !myRole) {
        setAllowed(false);
        return;
      }
      const elderUid = myRole === "Elderly" ? uid : partnerUid;
      const caregiverUid = myRole === "Caregiver" ? uid : partnerUid;
      const ok = await checkSubscription(elderUid, caregiverUid);
      setAllowed(ok);
      if (ok) setRoomId(pairKey(uid, partnerUid));
    })();
  }, [uid, partnerUid, myRole]);

  React.useEffect(() => {
    if (!firebaseEnabled || !ready || !uid || !allowed) return;
    const unsub = subscribeToMessages(roomId, setMessages);
    return () => unsub();
  }, [ready, uid, allowed, roomId]);

  const onSend = async () => {
    const text = input.trim();
    if (!text) return;
    try {
      if (!allowed)
        return toast.error("Not subscribed to this caregiver/elder");
      await sendText(roomId, uid || "unknown", text);
      setInput("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send message");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const localChunks: BlobPart[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) localChunks.push(ev.data);
      };
      rec.onstop = async () => {
        setRecording(false);
        const blob = new Blob(localChunks, { type: "audio/webm" });
        try {
          if (!allowed) return;
          await uploadVoiceAndSend(roomId, uid || "unknown", blob);
        } catch (e) {
          console.error(e);
          toast.error("Failed to upload voice note");
        }
      };
      rec.start();
      setChunks([]);
      setRecorder(rec);
      setRecording(true);
    } catch (e) {
      console.error(e);
      toast.error("Microphone permission denied");
    }
  };

  const stopRecording = () => {
    recorder?.stop();
    recorder?.stream.getTracks().forEach((t) => t.stop());
    setRecorder(null);
  };

  if (!firebaseEnabled) {
    return (
      <div className="rounded-2xl border p-6 bg-card">
        <h2 className="text-2xl font-extrabold">Chat</h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Firebase is not configured. Set VITE_FIREBASE_API_KEY,
          VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
          VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, and
          VITE_FIREBASE_APP_ID.
        </p>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="rounded-2xl border p-6 bg-card">
        <h2 className="text-2xl font-extrabold">Chat</h2>
        <p className="mt-2 text-lg">
          Please sign in from the Profile tab to use chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-2xl border bg-card h-[calc(100vh-220px)]">
      <div className="px-4 py-3 border-b font-extrabold text-xl">Chat</div>
      <div className="px-4 py-2 border-b grid gap-2 bg-secondary/30">
        <label className="grid gap-1">
          <span className="text-sm text-muted-foreground">
            Partner UID (Elder ↔ Caregiver)
          </span>
          <input
            className="h-12 rounded-xl border px-4 text-lg"
            placeholder="Paste caregiver or elder UID"
            value={partnerUid}
            onChange={(e) => setPartnerUid(e.target.value.trim())}
          />
        </label>
        {!myRole && (
          <div className="text-sm text-destructive">
            Set your Role in Profile to chat.
          </div>
        )}
        {partnerUid && !allowed && (
          <div className="text-sm text-muted-foreground">
            Subscription required. Book a caregiver in Services to start a chat.
          </div>
        )}
        {partnerProfile && (
          <div className="text-sm">
            Chatting with:{" "}
            <span className="font-semibold">
              {partnerProfile.displayName || partnerUid}
            </span>
            {partnerProfile.role ? ` • ${partnerProfile.role}` : ""}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!ready && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Connecting…
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className="flex">
            <div
              className={`max-w-[80%] rounded-2xl p-3 border ${m.uid === uid ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}
            >
              {m.text && (
                <div className="whitespace-pre-wrap text-lg">{m.text}</div>
              )}
              {m.voiceUrl && (
                <audio
                  className="mt-1 w-full"
                  controls
                  src={m.voiceUrl}
                  preload="metadata"
                />
              )}
              <div className="mt-1 text-xs opacity-70">
                {m.uid === uid ? "You" : "Buddy"}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex items-center gap-2">
        <button
          onClick={recording ? stopRecording : startRecording}
          className={`h-12 w-12 shrink-0 grid place-items-center rounded-full ${recording ? "bg-red-600 text-white" : "bg-secondary"}`}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          <Mic className="h-6 w-6" />
        </button>
        <input
          className="flex-1 h-12 px-4 rounded-xl border bg-background"
          placeholder="Type a message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button
          onClick={onSend}
          className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" /> Send
        </button>
      </div>
    </div>
  );
}
