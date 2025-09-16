import React from "react";
import { AuthContext } from "@/context/AuthContext";
import { Camera, Edit, LogOut, Phone, Mail, UserRound, HeartPulse, ShieldPlus } from "lucide-react";
import { db, storage } from "@/services/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

type Profile = {
  displayName?: string;
  age?: number;
  gender?: string;
  role?: "Elderly" | "Caregiver" | "Family";
  phone?: string;
  email?: string;
  medical?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  photoUrl?: string;
};

export default function ProfilePage() {
  const auth = React.useContext(AuthContext)!;
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const uid = auth.user?.uid;

  React.useEffect(() => {
    (async () => {
      if (!uid || !db) return;
      const snap = await getDoc(doc(db, "profiles", uid));
      if (snap.exists()) setProfile(snap.data() as Profile);
      else setProfile({ phone: auth.user?.phoneNumber || undefined, email: auth.user?.email || undefined });
    })();
  }, [uid]);

  if (auth.loading) return <div className="rounded-2xl border p-6 bg-card">Loading…</div>;

  if (!auth.user) return <PhoneLogin />;

  const startEdit = () => setEditing(true);
  const cancelEdit = () => setEditing(false);

  const save = async (data: Profile) => {
    if (!uid || !db) return;
    setLoading(true);
    try {
      const refDoc = doc(db, "profiles", uid);
      if (profile) await setDoc(refDoc, { ...profile, ...data }, { merge: true });
      else await setDoc(refDoc, data);
      setProfile((p) => ({ ...(p || {}), ...data }));
      setEditing(false);
      toast.success("Saved");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const onPhotoChange = async (file: File) => {
    if (!uid || !storage) return;
    try {
      const r = ref(storage, `avatars/${uid}/${Date.now()}-${file.name}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await save({ photoUrl: url });
    } catch (e) {
      console.error(e);
      toast.error("Photo upload failed");
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={profile?.photoUrl || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(profile?.displayName || "User")}`}
            alt="Profile"
            className="h-20 w-20 rounded-2xl object-cover border"
          />
          <label className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center cursor-pointer">
            <Camera className="h-5 w-5" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && onPhotoChange(e.target.files[0])} />
          </label>
        </div>
        <div>
          <div className="text-2xl font-extrabold">{profile?.displayName || "Your Name"}</div>
          <div className="text-muted-foreground">{profile?.role || "Role"}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!editing && (
            <button onClick={startEdit} className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2">
              <Edit className="h-5 w-5" /> Edit
            </button>
          )}
          <button onClick={auth.logout} className="h-12 w-12 rounded-xl bg-secondary grid place-items-center" aria-label="Sign out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        <Field icon={<UserRound className="h-5 w-5" />} label="Name" value={profile?.displayName} />
        <Field icon={<UserRound className="h-5 w-5" />} label="Age / Gender" value={[profile?.age, profile?.gender].filter(Boolean).join(" • ")} />
        <Field icon={<Phone className="h-5 w-5" />} label="Phone" value={profile?.phone || auth.user?.phoneNumber || ""} />
        <Field icon={<Mail className="h-5 w-5" />} label="Email" value={profile?.email || auth.user?.email || ""} />
        <Field icon={<HeartPulse className="h-5 w-5" />} label="Medical Conditions" value={profile?.medical} />
        <Field icon={<ShieldPlus className="h-5 w-5" />} label="Emergency Contact" value={[profile?.emergencyName, profile?.emergencyPhone].filter(Boolean).join(" • ")} />
      </div>

      {editing && (
        <EditForm
          initial={profile || {}}
          onCancel={cancelEdit}
          onSave={save}
          loading={loading}
        />
      )}
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number }) {
  return (
    <div className="rounded-xl border p-4 bg-secondary/30">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        {icon} {label}
      </div>
      <div className="text-xl font-semibold mt-1 min-h-7">{value || "—"}</div>
    </div>
  );
}

function EditForm({ initial, onSave, onCancel, loading }: { initial: Profile; onSave: (p: Profile) => void; onCancel: () => void; loading: boolean }) {
  const [form, setForm] = React.useState<Profile>({ ...initial });
  const onChange = (k: keyof Profile, v: any) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="rounded-xl border p-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <LabeledInput label="Name" value={form.displayName || ""} onChange={(v) => onChange("displayName", v)} />
        <LabeledInput label="Age" type="number" value={form.age?.toString() || ""} onChange={(v) => onChange("age", Number(v))} />
        <LabeledInput label="Gender" value={form.gender || ""} onChange={(v) => onChange("gender", v)} />
        <LabeledInput label="Role (Elderly/Caregiver/Family)" value={form.role || ""} onChange={(v) => onChange("role", v as any)} />
        <LabeledInput label="Phone" value={form.phone || ""} onChange={(v) => onChange("phone", v)} />
        <LabeledInput label="Email" value={form.email || ""} onChange={(v) => onChange("email", v)} />
        <LabeledInput label="Medical Conditions" value={form.medical || ""} onChange={(v) => onChange("medical", v)} />
        <LabeledInput label="Emergency Contact Name" value={form.emergencyName || ""} onChange={(v) => onChange("emergencyName", v)} />
        <LabeledInput label="Emergency Contact Number" value={form.emergencyPhone || ""} onChange={(v) => onChange("emergencyPhone", v)} />
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => onSave(form)} disabled={loading} className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold">
          {loading ? "Saving…" : "Save"}
        </button>
        <button onClick={onCancel} className="h-12 px-6 rounded-xl bg-secondary font-bold">Cancel</button>
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <input className="h-12 rounded-xl border px-4 text-lg" value={value} onChange={(e) => onChange(e.target.value)} type={type} />
    </label>
  );
}

function PhoneLogin() {
  const auth = React.useContext(AuthContext)!;
  const [phone, setPhone] = React.useState("+91");
  const [code, setCode] = React.useState("");
  const [step, setStep] = React.useState<"phone" | "code">("phone");
  const [busy, setBusy] = React.useState(false);

  const send = async () => {
    try {
      setBusy(true);
      await auth.requestOtp(phone);
      setStep("code");
      toast.success("OTP sent");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };
  const verify = async () => {
    try {
      setBusy(true);
      await auth.verifyOtp(code);
      toast.success("Signed in");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border p-6 bg-card space-y-4">
      <h2 className="text-2xl font-extrabold">Sign in to continue</h2>
      {step === "phone" ? (
        <label className="grid gap-2">
          <span className="text-lg">Phone (E.164)</span>
          <input className="h-12 rounded-xl border px-4 text-lg" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 555 5555" />
          <button onClick={send} disabled={busy} className="mt-2 h-12 rounded-xl bg-primary text-primary-foreground font-bold">{busy ? "Sending…" : "Send OTP"}</button>
        </label>
      ) : (
        <label className="grid gap-2">
          <span className="text-lg">Enter Code</span>
          <input className="h-12 rounded-xl border px-4 text-lg tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          <button onClick={verify} disabled={busy} className="mt-2 h-12 rounded-xl bg-primary text-primary-foreground font-bold">{busy ? "Verifying…" : "Verify"}</button>
        </label>
      )}
      <div id="recaptcha-container" />
    </div>
  );
}
