import { useFieldArray, useFormContext } from "react-hook-form";
import { useListRemove } from "../../Hooks/useListRemove";
import type { ProfileValues } from "../../lib/types";
import { TextField } from "../Field";
import { LinesField } from "../LinesField";
import { ItemCard, ListSection } from "../ListSection";

function Internships() {
  const { control } = useFormContext<ProfileValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "internships" });
  const removeItem = useListRemove("internships", remove);

  return (
    <ListSection
      title="Internships and work"
      description="Internships, jobs, research or part-time work."
      noun="internship"
      count={fields.length}
      onAdd={() => append({ title: "", org: "", start: "", end: "", highlights: [] })}
    >
      {fields.map((f, i) => (
        <ItemCard key={f.id} label={`Internship ${i + 1}`} onRemove={() => removeItem(i)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              name={`internships.${i}.title`}
              label="Title"
              required
              placeholder="SDE Intern"
            />
            <TextField name={`internships.${i}.org`} label="Organisation" required />
            <TextField name={`internships.${i}.start`} label="Start" type="month" />
            <TextField
              name={`internships.${i}.end`}
              label="End"
              type="month"
              hint="Leave empty if you still work there."
            />
          </div>
          <LinesField
            name={`internships.${i}.highlights`}
            label="Highlights"
            mode="line"
            hint="One achievement per line."
          />
        </ItemCard>
      ))}
    </ListSection>
  );
}

function Projects() {
  const { control } = useFormContext<ProfileValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "projects" });
  const removeItem = useListRemove("projects", remove);

  return (
    <ListSection
      title="Projects"
      noun="project"
      count={fields.length}
      onAdd={() => append({ name: "", description: "", skills: [], link: "" })}
    >
      {fields.map((f, i) => (
        <ItemCard key={f.id} label={`Project ${i + 1}`} onRemove={() => removeItem(i)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name={`projects.${i}.name`} label="Name" required />
            <TextField
              name={`projects.${i}.link`}
              label="Link"
              type="url"
              inputMode="url"
              placeholder="https://"
            />
          </div>
          <TextField name={`projects.${i}.description`} label="What it does" multiline />
          <LinesField
            name={`projects.${i}.skills`}
            label="Skills used"
            mode="comma"
            rows={2}
            hint="Comma-separated."
          />
        </ItemCard>
      ))}
    </ListSection>
  );
}

export default function ExperienceStep() {
  return (
    <div className="space-y-4">
      <Internships />
      <Projects />
    </div>
  );
}
