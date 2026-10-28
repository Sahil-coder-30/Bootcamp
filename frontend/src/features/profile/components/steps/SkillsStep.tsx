import { useState } from "react";
import { get, useFieldArray, useFormContext, useWatch, type FieldError } from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_CODES, CATEGORY_NAMES, type CategoryCode } from "@/lib/categories";
import { useListRemove } from "../../Hooks/useListRemove";
import { norm, skillSchema, type Skill } from "../../lib/schema";
import type { ProfileValues } from "../../lib/types";
import { Section } from "../Field";
import { ProvenanceChip } from "../ProvenanceChip";

const DEFAULT_EVIDENCE = "Self-reported by candidate";

const CONFIDENCE_VARIANT = { high: "success", medium: "warning", low: "secondary" } as const;

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

interface DialogState {
  /** null = add a new skill. */
  index: number | null;
}

function SkillDialog({
  state,
  skills,
  onClose,
  onSave,
}: {
  state: DialogState | null;
  skills: Skill[];
  onClose: () => void;
  onSave: (skill: Skill, index: number | null) => void;
}) {
  const editing = state && state.index !== null ? skills[state.index] : undefined;
  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        {/* Remount per target so the fields start from the right skill. */}
        {state && (
          <SkillDialogBody
            key={state.index ?? "new"}
            existing={editing}
            others={skills.filter((_, i) => i !== state.index)}
            onClose={onClose}
            onSave={(s) => onSave(s, state.index)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SkillDialogBody({
  existing,
  others,
  onClose,
  onSave,
}: {
  existing: Skill | undefined;
  others: Skill[];
  onClose: () => void;
  onSave: (skill: Skill) => void;
}) {
  const [name, setName] = useState(existing?.skill_name ?? "");
  const [category, setCategory] = useState<CategoryCode>(existing?.category_code ?? "COD");
  const [evidence, setEvidence] = useState(existing?.evidence ?? DEFAULT_EVIDENCE);
  const [confidence, setConfidence] = useState<Skill["confidence"]>(
    existing?.confidence ?? "medium",
  );
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const candidate = {
      ...existing,
      skill_name: name,
      category_code: category,
      evidence,
      confidence,
    };
    const parsed = skillSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the skill details");
      return;
    }
    const key = parsed.data.canonical_id ?? norm(parsed.data.skill_name);
    if (others.some((s) => (s.canonical_id ?? norm(s.skill_name)) === key)) {
      setError("You already have this skill");
      return;
    }
    onSave(parsed.data);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{existing ? "Edit skill" : "Add a skill"}</DialogTitle>
        <DialogDescription>
          Say where you used it: that is what makes the skill count.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="skill-name">Skill</Label>
          <Input
            id="skill-name"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submit())}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="skill-category">Category</Label>
            <select
              id="skill-category"
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryCode)}
            >
              {CATEGORY_CODES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_NAMES[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="skill-confidence">Confidence</Label>
            <select
              id="skill-confidence"
              className={selectClass}
              value={confidence}
              onChange={(e) => setConfidence(e.target.value as Skill["confidence"])}
            >
              <option value="high">High: I used it and can show it</option>
              <option value="medium">Medium: I know it</option>
              <option value="low">Low: I have only seen it</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="skill-evidence">Evidence</Label>
          <Textarea
            id="skill-evidence"
            rows={2}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{evidence.length}/200</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={submit}>
          {existing ? "Save skill" : "Add skill"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function SkillsStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<ProfileValues>();
  const { fields, append, update, remove } = useFieldArray({ control, name: "skills" });
  const removeItem = useListRemove("skills", remove);
  const skills = (useWatch({ control, name: "skills" }) ?? []) as Skill[];
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const groups = CATEGORY_CODES.map((code) => ({
    code,
    rows: skills.map((s, index) => ({ s, index })).filter(({ s }) => s.category_code === code),
  })).filter((g) => g.rows.length > 0);

  const save = (skill: Skill, index: number | null) => {
    if (index === null) append(skill);
    else update(index, skill);
    setDialog(null);
  };

  return (
    <div className="space-y-4">
      <Section
        title="Skills"
        description="Each skill needs a line of evidence. Skills with evidence of use count the most."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialog({ index: null })}
          >
            <Plus aria-hidden /> Add skill
          </Button>
        }
      >
        {fields.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            No skills yet. Add one, or pre-fill from your CV on the Start tab.
          </p>
        )}
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.code} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {CATEGORY_NAMES[g.code]}
              </h4>
              <ul className="space-y-2">
                {g.rows.map(({ s, index }) => {
                  const err = get(errors, `skills.${index}.skill_name`) as FieldError | undefined;
                  return (
                    <li
                      key={fields[index]?.id ?? index}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-background/60 p-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{s.skill_name}</span>
                          <Badge variant={CONFIDENCE_VARIANT[s.confidence]}>{s.confidence}</Badge>
                          <ProvenanceChip
                            path={`skills.${index}.skill_name`}
                            onReject={() => removeItem(index)}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">{s.evidence}</p>
                        {err && (
                          <p role="alert" className="text-xs text-destructive">
                            {err.message}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${s.skill_name}`}
                          onClick={() => setDialog({ index })}
                        >
                          <Pencil aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="hover:text-destructive"
                          aria-label={`Remove ${s.skill_name}`}
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <SkillDialog state={dialog} skills={skills} onClose={() => setDialog(null)} onSave={save} />
    </div>
  );
}
