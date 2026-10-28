import { useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FileText, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toErrorMessage } from "@/services/apiClient";
import { useCvUpload } from "../../Hooks/useCvUpload";
import { useProvenanceSummary } from "../../Hooks/useFieldProvenance";
import type { usePrefillFromResume } from "../../Hooks/usePrefillFromResume";
import type { ProfileValues } from "../../lib/types";
import { parseResumeAPI } from "../../service/profile.api";
import { Section } from "../Field";
import { ImportExportMenu } from "../ImportExportMenu";

interface Props {
  form: UseFormReturn<ProfileValues>;
  profileId: string | undefined;
  /** A parsed resume to pre-fill from, e.g. handed over by the flow or `?extraction=`. */
  extractionId: string | undefined;
  prefill: ReturnType<typeof usePrefillFromResume>;
  /** Opens a saved profile (the one a resume's email already belongs to). */
  onOpenExisting: (profileId: string, extractionId: string) => void;
  onStartBlank: () => void;
}

export default function StartStep({
  form,
  profileId,
  extractionId,
  prefill,
  onOpenExisting,
  onStartBlank,
}: Props) {
  const cv = useCvUpload();
  const file = useRef<HTMLInputElement>(null);
  const summary = useProvenanceSummary();
  const cvFile = form.watch("cv_file");

  const onPick = async (f: File | undefined) => {
    if (!f) return;
    const uploaded = await cv.upload(f);
    if (uploaded) form.setValue("cv_file", uploaded.cvFile, { shouldDirty: true });
    if (file.current) file.current.value = "";
  };

  const prefillFromCv = async () => {
    if (!cv.documentId) return;
    try {
      const parsed = await parseResumeAPI(cv.documentId);
      await prefill.prefill(parsed.extraction_id, profileId);
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not read this CV."));
    }
  };

  return (
    <div className="space-y-4">
      <Section
        title="Start from your CV"
        description="Upload a PDF or Word CV and we will fill in what we can. You review every field before saving."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => file.current?.click()}
            disabled={cv.uploading}
          >
            <FileText aria-hidden />{" "}
            {cv.uploading ? `Uploading ${cv.progress}%` : "Choose CV (PDF or DOCX)"}
          </Button>
          <input
            ref={file}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            aria-label="Upload CV"
            data-testid="cv-input"
            onChange={(e) => void onPick(e.target.files?.[0])}
          />
          <Button
            type="button"
            onClick={() => void prefillFromCv()}
            disabled={!cv.documentId || prefill.loading}
          >
            <Sparkles aria-hidden /> {prefill.loading ? "Reading..." : "Pre-fill from this CV"}
          </Button>
          {extractionId && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void prefill.prefill(extractionId, profileId)}
              disabled={prefill.loading}
            >
              <Sparkles aria-hidden /> Pre-fill from the parsed resume
            </Button>
          )}
        </div>
        {cv.error && (
          <p role="alert" className="text-sm text-destructive">
            {cv.error}
          </p>
        )}
        {cvFile && (
          <p className="text-sm text-muted-foreground">
            CV on file: <code className="text-xs">{cvFile}</code>
          </p>
        )}
      </Section>

      {prefill.existingProfileId && prefill.existingProfileId !== profileId && (
        <div
          role="status"
          className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        >
          <p>
            This CV belongs to a profile that already exists. Update it instead of creating a second
            one.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const id = prefill.existingProfileId;
              const ex = form.getValues("resume_extraction_id");
              if (id && ex) onOpenExisting(id, ex);
            }}
          >
            Update the existing profile
          </Button>
        </div>
      )}

      {prefill.warnings.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
          {prefill.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      {summary.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/50 p-4">
          <p className="text-sm" data-testid="review-counter">
            <span className="font-semibold">
              {summary.reviewed} of {summary.total}
            </span>{" "}
            pre-filled fields reviewed
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => summary.acceptAllHigh()}>
            Accept all high-confidence
          </Button>
        </div>
      )}

      <Section title="Other ways to start">
        <div className="flex flex-wrap items-center gap-2">
          <ImportExportMenu form={form} onImported={onStartBlank} />
          <Button type="button" variant="ghost" size="sm" onClick={onStartBlank}>
            <UserPlus aria-hidden /> Start blank
          </Button>
        </div>
      </Section>
    </div>
  );
}
