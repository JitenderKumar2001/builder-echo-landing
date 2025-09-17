import React from "react";
import { AuthContext } from "@/context/AuthContext";
import {
  Camera,
  Edit,
  LogOut,
  Phone,
  Mail,
  UserRound,
  HeartPulse,
  ShieldPlus,
} from "lucide-react";
import { db, storage } from "@/services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
  const [draftProfile, setDraftProfile] = React.useState<Profile | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const uid = auth.user?.uid;

  React.useEffect(() => {
    (async () => {
      if (!uid || !db) return;
      const snap = await getDoc(doc(db, "profiles", uid));
      if (snap.exists()) setProfile(snap.data() as Profile);
      else
        setProfile({
          phone: auth.user?.phoneNumber || undefined,
          email: auth.user?.email || undefined,
        });
    })();
  }, [uid]);

  if (auth.loading)
    return <div className="rounded-2xl border p-6 bg-card">Loading…</div>;

  if (!auth.user) return <PhoneLogin />;

  const startEdit = () => {
    setDraftProfile(profile); // make a copy
    setEditing(true);
  };
  const cancelEdit = () => {
    setDraftProfile(null); // discard changes
    setEditing(false);
  };

  const save = async () => {
    if (!uid || !db || !draftProfile) {
      toast.error("Cannot save: missing user or profile data");
      return;
    }
    setLoading(true);
    try {
      const refDoc = doc(db, "profiles", uid);

      // Write draftProfile to Firestore
      await setDoc(refDoc, draftProfile, { merge: true });

      // Fetch back to ensure save worked
      const snap = await getDoc(refDoc);
      if (snap.exists()) {
        const updatedProfile = snap.data() as Profile;
        setProfile(updatedProfile); // Update UI
        toast.success("Profile saved successfully");
      } else {
        toast.error("Failed to fetch updated profile after save");
        console.error("Firestore document missing after save", refDoc.path);
      }
    } catch (e: any) {
      console.error("Error saving profile:", e);
      toast.error(e?.message || "Save failed");
    } finally {
      setLoading(false);
      setEditing(false);
    }
  };

  const onPhotoChange = async (file: File) => {
    if (!uid || !storage) return;
    setLoading(true);
    try {
      const r = ref(storage, `avatars/${uid}/${Date.now()}-${file.name}`);
      const uploadResult = await uploadBytes(r, file);
      const url = await getDownloadURL(uploadResult.ref);

      // Update draftProfile with new photo
      const updatedDraft = {
        ...(draftProfile || profile || {}),
        photoUrl: url,
      };
      setDraftProfile(updatedDraft);

      // Save updated profile
      await save();
    } catch (e: any) {
      console.error("Photo upload failed:", e);
      toast.error(e?.message || "Photo upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-5 space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={
              profile?.photoUrl ||
              `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                profile?.displayName || "User",
              )}`
            }
            alt="Profile"
            className="h-20 w-20 rounded-2xl object-cover border"
          />
          <label className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center cursor-pointer">
            <Camera className="h-5 w-5" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files && onPhotoChange(e.target.files[0])}
            />
          </label>
        </div>
        <div>
          <div className="text-2xl font-extrabold">
            {profile?.displayName || "Your Name"}
          </div>
          <div className="text-muted-foreground">{profile?.role || "Role"}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!editing && (
            <button
              onClick={startEdit}
              className="h-12 px-5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"
            >
              <Edit className="h-5 w-5" /> Edit
            </button>
          )}
          <button
            onClick={auth.logout}
            className="h-12 w-12 rounded-xl bg-secondary grid place-items-center"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        <Field
          icon={<UserRound className="h-5 w-5" />}
          label="Name"
          value={editing ? draftProfile?.displayName : profile?.displayName}
          editing={editing}
          required
          onChange={(v) =>
            setDraftProfile((p) => ({ ...(p || {}), displayName: v }))
          }
        />
        <Field
          icon={<UserRound className="h-5 w-5" />}
          label="Age / Gender"
          value={[
            editing ? draftProfile?.age : profile?.age,
            editing ? draftProfile?.gender : profile?.gender,
          ]
            .filter(Boolean)
            .join(" • ")}
          editing={editing}
          required
          onChangeAge={(v) =>
            setDraftProfile((p) => ({
              ...(p || {}),
              age: Number(v) || undefined,
            }))
          }
          onChangeGender={(v) =>
            setDraftProfile((p) => ({ ...(p || {}), gender: v }))
          }
          isAgeGender
        />
        <Field
          icon={<Phone className="h-5 w-5" />}
          label="Phone"
          value={profile?.phone || auth.user?.phoneNumber || ""}
          editing={false}
        />
        <Field
          icon={<Mail className="h-5 w-5" />}
          label="Email"
          value={
            editing
              ? draftProfile?.email
              : profile?.email || auth.user?.email || ""
          }
          editing={editing}
          onChange={(v) => setDraftProfile((p) => ({ ...(p || {}), email: v }))}
          optional
        />
        <Field
          icon={<ShieldPlus className="h-5 w-5" />}
          label="Role"
          value={editing ? draftProfile?.role : profile?.role}
          editing={editing}
          required
          isDropdown
          options={["Elderly", "Caregiver", "Family"]}
          onChange={(v) =>
            setDraftProfile((p) => ({
              ...(p || {}),
              role: v as Profile["role"],
            }))
          }
        />
        <Field
          icon={<HeartPulse className="h-5 w-5" />}
          label="Medical Conditions"
          value={editing ? draftProfile?.medical : profile?.medical}
          editing={editing}
          required
          onChange={(v) =>
            setDraftProfile((p) => ({ ...(p || {}), medical: v }))
          }
        />
        <Field
          icon={<ShieldPlus className="h-5 w-5" />}
          label="Emergency Contact"
          value={[
            editing ? draftProfile?.emergencyName : profile?.emergencyName,
            editing ? draftProfile?.emergencyPhone : profile?.emergencyPhone,
          ]
            .filter(Boolean)
            .join(" • ")}
          editing={editing}
          required
          onChangeName={(v) =>
            setDraftProfile((p) => ({ ...(p || {}), emergencyName: v }))
          }
          onChangePhone={(v) =>
            setDraftProfile((p) => ({ ...(p || {}), emergencyPhone: v }))
          }
          isEmergency
        />
      </div>

      {editing && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              if (
                !draftProfile?.displayName ||
                !draftProfile?.age ||
                !draftProfile?.gender ||
                !draftProfile?.role ||
                !draftProfile?.medical ||
                !draftProfile?.emergencyName ||
                !draftProfile?.emergencyPhone
              ) {
                alert("Please fill all mandatory fields.");
                return;
              }
              save();
            }}
            disabled={loading}
            className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold"
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <button
            onClick={cancelEdit}
            className="h-12 px-6 rounded-xl bg-secondary font-bold"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  editing,
  onChange,
  onChangeAge,
  onChangeGender,
  onChangeName,
  onChangePhone,
  isAgeGender,
  isEmergency,
  isDropdown,
  options,
  required,
  optional,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number;
  editing?: boolean;
  onChange?: (v: string) => void;
  onChangeAge?: (v: string) => void;
  onChangeGender?: (v: string) => void;
  onChangeName?: (v: string) => void;
  onChangePhone?: (v: string) => void;
  isAgeGender?: boolean;
  isEmergency?: boolean;
  isDropdown?: boolean;
  options?: string[];
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="rounded-xl border p-4 bg-secondary/30">
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        {icon} {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {optional && <span className="text-xs ml-1">(optional)</span>}
      </div>
      {editing ? (
        <div className="mt-1 grid gap-2">
          {isAgeGender ? (
            <div className="flex gap-2">
              <input
                type="number"
                className="flex-1 rounded border px-2 py-1"
                placeholder="Age"
                onChange={(e) => onChangeAge?.(e.target.value)}
              />
              <input
                className="flex-1 rounded border px-2 py-1"
                placeholder="Gender"
                onChange={(e) => onChangeGender?.(e.target.value)}
              />
            </div>
          ) : isEmergency ? (
            <div className="flex gap-2">
              <input
                className="flex-1 rounded border px-2 py-1"
                placeholder="Name"
                onChange={(e) => onChangeName?.(e.target.value)}
              />
              <input
                className="flex-1 rounded border px-2 py-1"
                placeholder="Phone"
                onChange={(e) => onChangePhone?.(e.target.value)}
              />
            </div>
          ) : isDropdown ? (
            <select
              className="mt-1 rounded border px-2 py-1 w-full"
              defaultValue={value?.toString() || ""}
              onChange={(e) => onChange?.(e.target.value)}
            >
              <option value="" disabled>
                Select {label}
              </option>
              {options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="mt-1 rounded border px-2 py-1 w-full"
              defaultValue={value?.toString() || ""}
              onChange={(e) => onChange?.(e.target.value)}
            />
          )}
        </div>
      ) : (
        <div className="text-xl font-semibold mt-1 min-h-7">{value || "—"}</div>
      )}
    </div>
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
          <input
            className="h-12 rounded-xl border px-4 text-lg"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 555 5555"
          />
          <button
            onClick={send}
            disabled={busy}
            className="mt-2 h-12 rounded-xl bg-primary text-primary-foreground font-bold"
          >
            {busy ? "Sending…" : "Send OTP"}
          </button>
        </label>
      ) : (
        <label className="grid gap-2">
          <span className="text-lg">Enter Code</span>
          <input
            className="h-12 rounded-xl border px-4 text-lg tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
          />
          <button
            onClick={verify}
            disabled={busy}
            className="mt-2 h-12 rounded-xl bg-primary text-primary-foreground font-bold"
          >
            {busy ? "Verifying…" : "Verify"}
          </button>
        </label>
      )}
      <div id="recaptcha-container" />
    </div>
  );
}
