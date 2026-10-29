import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "../Hooks/auth.hooks";

export default function ProfilePage() {
  const { user, ready, loading, error, updateProfile, signOut } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    college: "",
    branch: "",
    graduationYear: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name,
      phone: user.phone ?? "",
      college: user.college ?? "",
      branch: user.branch ?? "",
      graduationYear: user.graduationYear ? String(user.graduationYear) : "",
    });
  }, [user]);

  if (!ready) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  if (!user) {
    return (
      <p className="p-8 text-sm">
        You are signed out.{" "}
        <Link to="/login" className="text-primary underline">
          Sign in
        </Link>
      </p>
    );
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const year = form.graduationYear.trim();
    setSaved(
      await updateProfile({
        name: form.name.trim() || user.name,
        phone: form.phone.trim() || null,
        college: form.college.trim() || null,
        branch: form.branch.trim() || null,
        graduationYear: year ? Number(year) : null,
      }),
    );
  };

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <label className="block text-left text-sm font-medium text-foreground">
      {label}
      <Input className="mt-1" type={type} value={form[key]} onChange={set(key)} />
    </label>
  );

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex items-center gap-4">
        {user.picture && (
          <img
            src={user.picture}
            alt=""
            className="h-14 w-14 rounded-full"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="min-w-0">
          <h1 className="truncate font-heading text-xl font-bold text-foreground">{user.name}</h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6">
        {field("Name", "name")}
        {field("Phone", "phone", "tel")}
        {field("College", "college")}
        {field("Branch", "branch")}
        {field("Graduation year", "graduationYear", "number")}
        <p className="text-sm text-muted-foreground">
          Resume:{" "}
          {user.resumeId ? (
            <code data-testid="resume-id">{user.resumeId}</code>
          ) : (
            "none uploaded yet"
          )}
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && <p className="text-sm text-emerald-600">Saved.</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            Save profile
          </Button>
          <Button type="button" variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </form>
    </main>
  );
}
