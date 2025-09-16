import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Firestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, FirebaseStorage } from "firebase/storage";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};
const optional = {
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined,
};

function isCompleteConfig(c: Record<string, string | undefined>): c is Record<string, string> {
  return Object.values(c).every(Boolean);
}

export const firebaseEnabled = isCompleteConfig(cfg);

let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth = null as ReturnType<typeof getAuth> | null;

if (firebaseEnabled) {
  const initCfg = optional.measurementId ? { ...(cfg as Record<string, string>), measurementId: optional.measurementId } : (cfg as Record<string, string>);
  const app = getApps().length ? getApps()[0] : initializeApp(initCfg);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { db, storage, auth };

export async function ensureAnonAuth(): Promise<User | null> {
  if (!auth) return null;
  return new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(auth!, async (u) => {
      if (u) {
        unsub();
        resolve(u);
      } else {
        try {
          await signInAnonymously(auth!);
        } catch (e) {
          console.error("Anonymous sign-in failed", e);
          unsub();
          resolve(null);
          return;
        }
      }
    });
  });
}

export type ChatMessage = {
  id?: string;
  uid: string;
  text?: string;
  voiceUrl?: string;
  createdAt: any;
};

export function subscribeToMessages(roomId: string, cb: (msgs: ChatMessage[]) => void): () => void {
  if (!db) return () => {};
  const q = query(collection(db, `rooms/${roomId}/messages`), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const arr: ChatMessage[] = [];
    snap.forEach((doc) => arr.push({ id: doc.id, ...(doc.data() as any) }));
    cb(arr);
  });
}

export async function sendText(roomId: string, uid: string, text: string) {
  if (!db) throw new Error("Firestore disabled");
  await addDoc(collection(db, `rooms/${roomId}/messages`), {
    uid,
    text,
    createdAt: serverTimestamp(),
  });
}

export async function uploadVoiceAndSend(roomId: string, uid: string, blob: Blob) {
  if (!storage || !db) throw new Error("Storage/Firestore disabled");
  const key = `voice/${uid}/${Date.now()}.webm`;
  const r = ref(storage, key);
  await uploadBytes(r, blob, { contentType: "audio/webm" });
  const url = await getDownloadURL(r);
  await addDoc(collection(db, `rooms/${roomId}/messages`), {
    uid,
    voiceUrl: url,
    createdAt: serverTimestamp(),
  });
}
