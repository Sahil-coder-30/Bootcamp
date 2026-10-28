import { useState } from "react";
import { Controller, useFormContext, get, type FieldError } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppDispatch } from "@/store";
import { useRoleSuggestions } from "../../Hooks/useRoleSuggestions";
import type { ProfileValues } from "../../lib/types";
import { removeProvenanceItem } from "../../slice/profile.slice";
import { TextField, Section } from "../Field";
import { ProvenanceChip } from "../ProvenanceChip";

const MAX_ROLES = 5;

function PreferredRoles() {
  const {
    control,
    formState: { errors },
  } = useFormContext<ProfileValues>();
  const dispatch = useAppDispatch();
  const suggestions = useRoleSuggestions();
  const [draft, setDraft] = useState("");
  const error = get(errors, "preferred_roles") as
    FieldError | (FieldError | undefined)[] | undefined;
  const message = Array.isArray(error) ? error.find(Boolean)?.message : error?.message;

  return (
    <Controller
      control={control}
      name="preferred_roles"
      render={({ field }) => {
        const roles = field.value;
        const add = (raw: string) => {
          const role = raw.trim();
          if (!role || roles.length >= MAX_ROLES) return;
          if (roles.some((r) => r.toLowerCase() === role.toLowerCase())) return;
          field.onChange([...roles, role]);
          setDraft("");
        };
        const remove = (i: number) => {
          field.onChange(roles.filter((_, idx) => idx !== i));
          dispatch(removeProvenanceItem({ list: "preferred_roles", index: i }));
        };
        const open = suggestions.filter(
          (s) => !roles.some((r) => r.toLowerCase() === s.toLowerCase()),
        );

        return (
          <div className="space-y-2">
            <Label htmlFor="f-preferred-role">Preferred roles</Label>
            <ul className="flex flex-wrap gap-2" aria-label="Selected roles">
              {roles.map((role, i) => (
                <li
                  key={role}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-sm"
                >
                  {role}
                  <ProvenanceChip path={`preferred_roles.${i}`} />
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="cursor-pointer rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${role}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input
                id="f-preferred-role"
                value={draft}
                placeholder={
                  roles.length >= MAX_ROLES ? "Up to 5 roles" : "Type a role and press Enter"
                }
                disabled={roles.length >= MAX_ROLES}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    add(draft);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => add(draft)}
                disabled={!draft.trim()}
              >
                <Plus aria-hidden /> Add
              </Button>
            </div>
            {open.length > 0 && roles.length < MAX_ROLES && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                Suggestions:
                {open.slice(0, 6).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => add(s)}
                    className="cursor-pointer rounded-full border border-dashed border-border px-2 py-0.5 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
            {message && (
              <p role="alert" className="text-xs text-destructive">
                {message}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

export default function BasicsStep() {
  return (
    <div className="space-y-4">
      <Section title="About you" description="The only required fields are your name and email.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="name" label="Full name" required autoComplete="name" />
          <TextField
            name="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
          />
          <TextField name="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" />
        </div>
      </Section>
      <Section
        title="Target roles"
        description="Used to suggest job descriptions to match against."
      >
        <PreferredRoles />
      </Section>
    </div>
  );
}
