import { useFieldArray, useFormContext } from "react-hook-form";
import { useListRemove } from "../../Hooks/useListRemove";
import type { ProfileValues } from "../../lib/types";
import { TextField } from "../Field";
import { ItemCard, ListSection } from "../ListSection";

function Hackathons() {
  const { control } = useFormContext<ProfileValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "hackathons" });
  const removeItem = useListRemove("hackathons", remove);

  return (
    <ListSection
      title="Hackathons"
      noun="hackathon"
      count={fields.length}
      onAdd={() => append({ name: "", result: "", year: "" })}
    >
      {fields.map((f, i) => (
        <ItemCard key={f.id} label={`Hackathon ${i + 1}`} onRemove={() => removeItem(i)}>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField name={`hackathons.${i}.name`} label="Name" required />
            <TextField
              name={`hackathons.${i}.result`}
              label="Result"
              placeholder="Winner, Finalist..."
            />
            <TextField
              name={`hackathons.${i}.year`}
              label="Year"
              inputMode="numeric"
              placeholder="2025"
            />
          </div>
        </ItemCard>
      ))}
    </ListSection>
  );
}

function Certifications() {
  const { control } = useFormContext<ProfileValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "certifications" });
  const removeItem = useListRemove("certifications", remove);

  return (
    <ListSection
      title="Certifications"
      noun="certification"
      count={fields.length}
      onAdd={() => append({ name: "", issuer: "", year: "" })}
    >
      {fields.map((f, i) => (
        <ItemCard key={f.id} label={`Certification ${i + 1}`} onRemove={() => removeItem(i)}>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField name={`certifications.${i}.name`} label="Name" required />
            <TextField name={`certifications.${i}.issuer`} label="Issuer" />
            <TextField
              name={`certifications.${i}.year`}
              label="Year"
              inputMode="numeric"
              placeholder="2025"
            />
          </div>
        </ItemCard>
      ))}
    </ListSection>
  );
}

export default function AchievementsStep() {
  return (
    <div className="space-y-4">
      <Hackathons />
      <Certifications />
    </div>
  );
}
