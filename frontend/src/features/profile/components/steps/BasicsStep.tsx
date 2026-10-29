import { useRef, useState } from "react";
import { Controller, useFormContext, get, type FieldError } from "react-hook-form";
import { FileText, Plus, Sparkles, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toErrorMessage } from "@/services/apiClient";
import { useAppDispatch } from "@/store";
import { useCvUpload } from "../../Hooks/useCvUpload";
import type { usePrefillFromResume } from "../../Hooks/usePrefillFromResume";
import { useRoleSuggestions } from "../../Hooks/useRoleSuggestions";
import type { ProfileValues } from "../../lib/types";
import { parseResumeAPI } from "../../service/profile.api";
import { removeProvenanceItem } from "../../slice/profile.slice";
import { TextField, Section } from "../Field";
import { ProvenanceChip } from "../ProvenanceChip";

const MAX_ROLES = 5;

interface BasicsStepProps {
  prefill?: ReturnType<typeof usePrefillFromResume> | undefined;
  profileId?: string | undefined;
}

function CvUploadSection({ prefill, profileId }: BasicsStepProps) {
  const { watch, setValue } = useFormContext<ProfileValues>();
  const cv = useCvUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cvFile = watch("cv_file");

  const onPick = async (f: File | undefined) => {
    if (!f) return;
    const uploaded = await cv.upload(f);
    if (uploaded) {
      setValue("cv_file", uploaded.cvFile, { shouldDirty: true });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const prefillFromCv = async () => {
    if (!cv.documentId) return;
    try {
      const parsed = await parseResumeAPI(cv.documentId);
      if (prefill) {
        await prefill.prefill(parsed.extraction_id, profileId);
      }
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not read this CV."));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={cv.uploading}
          className="rounded-xl"
        >
          {cv.uploading ? (
            <UploadCloud className="h-4 w-4 mr-1.5 animate-pulse text-primary" aria-hidden />
          ) : (
            <FileText className="h-4 w-4 mr-1.5 text-primary" aria-hidden />
          )}
          {cv.uploading
            ? `Uploading ${cv.progress}%`
            : cvFile
              ? "Replace CV file"
              : "Attach CV (PDF or DOCX)"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          aria-label="Upload CV"
          data-testid="cv-input"
          onChange={(e) => void onPick(e.target.files?.[0])}
        />
        <Button
          type="button"
          size="sm"
          onClick={() => void prefillFromCv()}
          disabled={!cv.documentId || prefill?.loading}
          className="rounded-xl"
        >
          <Sparkles className="h-4 w-4 mr-1.5" aria-hidden />
          {prefill?.loading ? "Reading..." : "Pre-fill from this CV"}
        </Button>
        {cvFile && (
          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/60 px-2.5 py-1 text-xs text-foreground">
            <span className="text-muted-foreground">CV on file:</span>
            <code className="font-mono font-medium text-xs">{cvFile}</code>
            <button
              type="button"
              onClick={() => setValue("cv_file", null, { shouldDirty: true })}
              className="ml-1 text-muted-foreground hover:text-destructive"
              title="Remove attached CV"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
      {cv.error && (
        <p role="alert" className="text-xs text-destructive">
          {cv.error}
        </p>
      )}
    </div>
  );
}

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

export default function BasicsStep({ prefill, profileId }: BasicsStepProps = {}) {
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
      <Section
        title="Resume / CV"
        description="Optional: attach your resume to complete your candidate profile."
      >
        <CvUploadSection prefill={prefill} profileId={profileId} />
      </Section>
    </div>
  );
}
