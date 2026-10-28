import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { useListRemove } from "../../Hooks/useListRemove";
import { formatEducation } from "../../lib/formMapping";
import type { ProfileValues } from "../../lib/types";
import { TextField } from "../Field";
import { ItemCard, ListSection } from "../ListSection";

export default function EducationStep() {
  const { control } = useFormContext<ProfileValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "education_details" });
  const removeItem = useListRemove("education_details", remove);
  const details = useWatch({ control, name: "education_details" });
  const preview = formatEducation(details ?? []);

  return (
    <div className="space-y-4">
      <ListSection
        title="Education"
        description="Your most recent entry becomes the one-line education summary."
        noun="education entry"
        count={fields.length}
        onAdd={() => append({ degree: "", institution: "", year: "", score: "" })}
      >
        {fields.map((f, i) => (
          <ItemCard key={f.id} label={`Education ${i + 1}`} onRemove={() => removeItem(i)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                name={`education_details.${i}.degree`}
                label="Degree"
                required
                placeholder="B.Tech CSE"
              />
              <TextField name={`education_details.${i}.institution`} label="Institution" />
              <TextField
                name={`education_details.${i}.year`}
                label="Graduation year"
                inputMode="numeric"
                placeholder="2026"
              />
              <TextField
                name={`education_details.${i}.score`}
                label="Score"
                placeholder="8.7 CGPA or 82%"
              />
            </div>
          </ItemCard>
        ))}
      </ListSection>
      {preview && (
        <p className="rounded-lg border border-border bg-card/50 p-3 text-sm">
          <span className="text-muted-foreground">Shown on your profile as: </span>
          <span data-testid="education-preview" className="font-medium">
            {preview}
          </span>
        </p>
      )}
    </div>
  );
}
