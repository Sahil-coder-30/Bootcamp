import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useFormState, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, ChevronLeft, ChevronRight, History, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store";
import { useProfile } from "../Hooks/useProfile";
import { useProfileDraft } from "../Hooks/useProfileDraft";
import { usePrefillFromResume } from "../Hooks/usePrefillFromResume";
import { useSaveProfile } from "../Hooks/useSaveProfile";
import type { Step } from "../lib/completeness";
import { blankValues, toFormValues } from "../lib/formMapping";
import { profileFormSchema } from "../lib/schema";
import type { ChangeSource, ProfileValues } from "../lib/types";
import { clearPrefill } from "../slice/profile.slice";
import { CompletenessMeter } from "./CompletenessMeter";
import { ConnectTelegramButton } from "./ConnectTelegramButton";
import { ConflictDialog } from "./ConflictDialog";
import { DraftRestoreBanner } from "./DraftRestoreBanner";
import { ImportExportMenu } from "./ImportExportMenu";
import { JsonPanel } from "./JsonPanel";
import { ReimportDiffDialog } from "./ReimportDiffDialog";
import AchievementsStep from "./steps/AchievementsStep";
import BasicsStep from "./steps/BasicsStep";
import EducationStep from "./steps/EducationStep";
import ExperienceStep from "./steps/ExperienceStep";
import SkillLevelsStep from "./steps/SkillLevelsStep";
import SkillsStep from "./steps/SkillsStep";
import StartStep from "./steps/StartStep";

// The history drawer is only opened on demand.
const VersionHistoryDrawer = lazy(() =>
  import("./VersionHistoryDrawer").then((m) => ({ default: m.VersionHistoryDrawer })),
);

export const STEPS: { id: Step; label: string }[] = [
  { id: "start", label: "Start" },
  { id: "basics", label: "Basics" },
  { id: "education", label: "Education" },
  { id: "experience", label: "Experience" },
  { id: "achievements", label: "Achievements" },
  { id: "skills", label: "Skills" },
  { id: "levels", label: "Skill levels" },
];

/** Which tab a form path lives on (for error dots and the error summary links). */
export function stepOfPath(path: string): Step {
  const root = path.split(".")[0] ?? "";
  if (["name", "email", "phone", "links", "preferred_roles"].includes(root)) return "basics";
  if (["education", "education_details"].includes(root)) return "education";
  if (["internships", "projects"].includes(root)) return "experience";
  if (["hackathons", "certifications"].includes(root)) return "achievements";
  if (root === "skills") return "skills";
  if (root === "skill_levels") return "levels";
  return "start";
}

interface FlatError {
  path: string;
  message: string;
}

export function flattenErrors(errors: FieldErrors<ProfileValues>): FlatError[] {
  const out: FlatError[] = [];
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== "object") return;
    const n = node as { message?: unknown; type?: unknown } & Record<string, unknown>;
    if (typeof n.message === "string" && typeof n.type === "string") {
      out.push({ path, message: n.message });
      return;
    }
    for (const [k, v] of Object.entries(n)) {
      if (k === "ref" || k === "root") continue;
      walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(errors, "");
  return out;
}

export interface ProfileBuilderProps {
  /** Edit this saved profile; omit to create one. */
  profileId?: string;
  /** A parsed resume (Role 2 extraction) to pre-fill from as soon as the form is ready. */
  extractionId?: string;
  /** Called after a successful save, e.g. by the integrated flow to remember `profile_id`. */
  onSaved?: (result: { profile_id: string; version: number }) => void;
}

/** The 7-step candidate profile form. Used by /profile/* and embedded as step 3 of the flow. */
export default function ProfileBuilder(props: ProfileBuilderProps) {
  return (
    <TooltipProvider>
      <Builder {...props} />
    </TooltipProvider>
  );
}

function Builder({ profileId, extractionId, onSaved }: ProfileBuilderProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { profile, version, loading, error: loadError, refetch } = useProfile(profileId);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileFormSchema),
    mode: "onBlur",
    defaultValues: blankValues(),
  });
  const { isDirty, errors, submitCount } = useFormState({ control: form.control });

  const [step, setStep] = useState<Step>(profileId ? "basics" : "start");
  const [historyOpen, setHistoryOpen] = useState(false);
  const source = useRef<ChangeSource>("form");
  // Anything pre-filled from a CV makes this save a "resume import" in the version history.
  const prefilledFromResume = useAppSelector(
    (s) => Object.keys(s.profile.prefill.provenance).length > 0,
  );

  const saveApi = useSaveProfile();
  const draft = useProfileDraft(form, profileId ?? "new");
  const prefill = usePrefillFromResume(form, { dirty: isDirty });

  // Load a saved profile into the form (also after each successful save: the new version).
  useEffect(() => {
    if (profile) form.reset(toFormValues(profile));
  }, [profile, form]);

  // Pre-fill once from a parsed resume handed to us (`?extraction=` or the integrated flow).
  const autoPrefilled = useRef(false);
  useEffect(() => {
    if (!extractionId || autoPrefilled.current) return;
    if (profileId && !profile) return;
    autoPrefilled.current = true;
    source.current = "resume_import";
    void prefill.prefill(extractionId, profileId, profile ? toFormValues(profile) : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extractionId, profileId, profile]);

  const flat = useMemo(() => flattenErrors(errors), [errors]);
  const stepsWithErrors = useMemo(() => new Set(flat.map((e) => stepOfPath(e.path))), [flat]);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const goTo = useCallback((next: Step, focusPath?: string) => {
    setStep(next);
    if (focusPath) {
      // The target tab has to render before its field exists.
      window.setTimeout(() => document.getElementById(`f-${focusPath}`)?.focus(), 50);
    }
  }, []);

  const onValid = async (values: ProfileValues) => {
    setSummaryOpen(false);
    const src: ChangeSource =
      source.current !== "form" ? source.current : prefilledFromResume ? "resume_import" : "form";
    const stored = await saveApi.save(
      values,
      profileId && version !== null ? { id: profileId, version, source: src } : undefined,
      src,
    );
    if (!stored) return;
    source.current = "form";
    draft.clear();
    dispatch(clearPrefill());
    form.reset(toFormValues(stored));
    onSaved?.({ profile_id: stored.id, version: stored.version });
    if (!profileId && !onSaved)
      void navigate({ to: "/profile/$profileId", params: { profileId: stored.id }, replace: true });
  };

  const onInvalid = () => setSummaryOpen(true);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const resolveConflict = async (choice: "mine" | "theirs") => {
    const result = await saveApi.resolveConflict(choice);
    if (!result) return;
    if (choice === "theirs") form.reset(toFormValues(result));
    else {
      draft.clear();
      form.reset(toFormValues(result));
      onSaved?.({ profile_id: result.id, version: result.version });
    }
  };

  if (profileId && loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (profileId && loadError && !profile) {
    return (
      <div role="alert" className="space-y-3 rounded-xl border border-destructive/40 p-6">
        <p className="font-medium">We could not load this profile.</p>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button type="button" variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const heading = profileId ? form.getValues("name") || "Edit profile" : "New profile";

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onValid, onInvalid)}
        noValidate
        className="space-y-4"
        aria-label="Candidate profile"
      >
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2
              className="truncate font-heading text-xl font-semibold"
              data-testid="profile-heading"
            >
              {heading}
            </h2>
            {version !== null && <Badge variant="outline">v{version}</Badge>}
            {isDirty && <Badge variant="warning">unsaved</Badge>}
          </div>
          <div className="flex gap-2">
            <ConnectTelegramButton profileId={profileId} />
            {profileId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setHistoryOpen(true)}
              >
                <History aria-hidden /> History
              </Button>
            )}
            <Button type="submit" disabled={saveApi.saving} size="sm">
              <Save aria-hidden /> {saveApi.saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </header>

        {draft.restorable && (
          <DraftRestoreBanner
            savedAt={draft.restorable.savedAt}
            onRestore={draft.restore}
            onDiscard={draft.discard}
          />
        )}

        {saveApi.duplicateId && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
          >
            <p>A profile with this email already exists.</p>
            <Button
              type="button"
              size="sm"
              onClick={() =>
                void navigate({
                  to: "/profile/$profileId",
                  params: { profileId: saveApi.duplicateId as string },
                })
              }
            >
              Open existing profile
            </Button>
          </div>
        )}

        {summaryOpen && flat.length > 0 && (
          <div
            role="alert"
            className="space-y-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
            data-testid="error-summary"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4" aria-hidden /> Fix {flat.length}{" "}
              {flat.length === 1 ? "problem" : "problems"} to save
            </p>
            <ul className="space-y-1 text-sm">
              {flat.map((e) => (
                <li key={`${e.path}-${e.message}`}>
                  <button
                    type="button"
                    onClick={() => goTo(stepOfPath(e.path), e.path)}
                    className="cursor-pointer text-left underline underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {e.path.replace(/\./g, " > ")}: {e.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
            <Tabs value={step} onValueChange={(v) => setStep(v as Step)}>
              {/* Wide screens: tabs. Phones: a select plus Back/Next below. */}
              <TabsList
                className="hidden h-auto w-full flex-wrap justify-start gap-1 sm:flex"
                aria-label="Profile steps"
              >
                {STEPS.map((s) => (
                  <TabsTrigger key={s.id} value={s.id}>
                    {s.label}
                    {stepsWithErrors.has(s.id) && submitCount > 0 && (
                      <span
                        className="h-2 w-2 rounded-full bg-destructive"
                        role="img"
                        aria-label="has errors"
                      />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="sm:hidden">
                <label htmlFor="step-select" className="sr-only">
                  Step
                </label>
                <select
                  id="step-select"
                  value={step}
                  onChange={(e) => setStep(e.target.value as Step)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base"
                >
                  {STEPS.map((s, i) => (
                    <option key={s.id} value={s.id}>
                      {i + 1}. {s.label}
                      {stepsWithErrors.has(s.id) && submitCount > 0 ? " (has errors)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <TabsContent value="start">
                <StartStep
                  form={form}
                  profileId={profileId}
                  extractionId={extractionId}
                  prefill={prefill}
                  onOpenExisting={(id, ex) =>
                    void navigate({
                      to: "/profile/$profileId",
                      params: { profileId: id },
                      search: { extraction: ex },
                    })
                  }
                  onStartBlank={() => goTo("basics")}
                />
              </TabsContent>
              <TabsContent value="basics">
                <BasicsStep />
              </TabsContent>
              <TabsContent value="education">
                <EducationStep />
              </TabsContent>
              <TabsContent value="experience">
                <ExperienceStep />
              </TabsContent>
              <TabsContent value="achievements">
                <AchievementsStep />
              </TabsContent>
              <TabsContent value="skills">
                <SkillsStep />
              </TabsContent>
              <TabsContent value="levels">
                <SkillLevelsStep form={form} />
              </TabsContent>
            </Tabs>

            <nav
              aria-label="Step navigation"
              className={cn(
                "sticky bottom-0 z-20 -mx-1 flex items-center justify-between gap-2 border-t border-border bg-background/95 px-1 py-3 backdrop-blur",
              )}
            >
              <Button
                type="button"
                variant="outline"
                disabled={stepIndex <= 0}
                onClick={() => setStep(STEPS[stepIndex - 1]?.id ?? "start")}
              >
                <ChevronLeft aria-hidden /> Back
              </Button>
              {stepIndex < STEPS.length - 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(STEPS[stepIndex + 1]?.id ?? "levels")}
                >
                  Next <ChevronRight aria-hidden />
                </Button>
              ) : (
                <Button type="submit" disabled={saveApi.saving}>
                  <Save aria-hidden /> {saveApi.saving ? "Saving..." : "Save profile"}
                </Button>
              )}
            </nav>
          </div>

          <aside className="space-y-4" aria-label="Profile summary">
            <CompletenessMeter control={form.control} onGoToStep={(s) => goTo(s)} />
            <JsonPanel control={form.control} />
            <div className="space-y-2 rounded-xl border border-border bg-card/50 p-4">
              <h3 className="font-heading text-sm font-semibold">Save and load</h3>
              <ImportExportMenu
                form={form}
                onImported={() => {
                  source.current = "json_import";
                  goTo("basics");
                }}
              />
            </div>
          </aside>
        </div>
      </form>

      <ReimportDiffDialog
        diff={prefill.diff}
        onApply={(d) => {
          source.current = "resume_import";
          prefill.applyDiff(d);
        }}
        onCancel={prefill.discardDiff}
      />
      <ConflictDialog
        conflict={saveApi.conflict}
        local={form.getValues() as ProfileValues}
        yourVersion={version}
        saving={saveApi.saving}
        onMine={() => void resolveConflict("mine")}
        onTheirs={() => void resolveConflict("theirs")}
      />
      {profileId && (
        <Suspense fallback={null}>
          {historyOpen && (
            <VersionHistoryDrawer
              profileId={profileId}
              open={historyOpen}
              onOpenChange={setHistoryOpen}
            />
          )}
        </Suspense>
      )}
    </FormProvider>
  );
}
