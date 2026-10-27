# Role 3: Profile Builder, implementation plan

_Written 2026-10-27, against the locked [shared contract](../00-shared-contract.md). Deadline Wed 28 Oct. Owner: Role 3. Mostly TypeScript (backend + frontend). LangChain is used only in one optional P2 feature, and only offline._

---

## 1. Mission and what "stand out" means for this role

The brief: _"Let a candidate build a full profile ... a form, basic validation, and a save/load mechanism (JSON). Everyone else depends on this."_ We meet that in P1 and then make the form itself something a judge remembers.

- **Unblock first, polish second.** Four contract-valid profiles with fixed UUIDs are in Supabase (and in an in-memory fallback) by hour 2, so Roles 4 and 5 integrate against real `profile_id`s on day one.
- **The profile is honest about where every number came from.** Each of the 12 `skill_levels` carries `source` (resume_inferred, self, assessed) and a `basis`. Each pre-filled field shows a "from resume" chip with the evidence quote. Judges can see exactly why Talent Check got the input it got.
- **Re-importing a resume merges and never overwrites.** A new CV produces a reviewable diff ("1 new internship, 3 new skills, COD 6 to 7, your self-rated SYSD kept"). This is the realistic candidate workflow, and almost nobody builds it.
- **The form is the contract.** A live JSON panel next to the form shows the exact `CandidateProfile` that Roles 4 and 5 receive, with the brief's fields marked. JSON export/import round-trips byte-for-byte through the same zod schema.
- **It scales.** Keyset pagination, optimistic concurrency (`If-Match`), version history that keeps old Talent Check results explainable, and a PII story (no emails in logs, signed CV URLs, delete-my-data).

## 2. Inputs, outputs and hand-offs

| Direction | What | Contract reference | Counterpart |
|---|---|---|---|
| In | `ResumeExtraction` (stored in `extractions.result`, `source_type = resume`) | [3.3](../00-shared-contract.md#33-resumeextraction-role-2-output--the-list-above--structured-fields) | Role 2 |
| In | Manual form entry | brief p.8 | candidate |
| In | CV file via `POST /api/documents` (`kind=resume`) | [4](../00-shared-contract.md#4-api-surface) | Role 1 (shared route) |
| In (read only) | Company bar for the faint slider overlay: `GET /api/companies/:id/skill-bar` | [4](../00-shared-contract.md#4-api-surface) | Role 4 |
| In (read only) | Topic ladder from `skill_set_topics` (calibration, P2) | [2](../00-shared-contract.md#2-the-12-categories) | existing data |
| Out | `CandidateProfile` rows in `candidate_profiles`, with all 12 `skill_levels` | [3.4](../00-shared-contract.md#34-candidateprofile-role-3-output), [5](../00-shared-contract.md#5-supabase-tables-new) | Role 4 reads `skill_levels[code].level`; Role 5 reads `skills[]`, `projects[]`, `internships[]` |
| Out | `profile_id` + `version` | [5](../00-shared-contract.md#5-supabase-tables-new) | Roles 4 and 5 store `profile_version` in `talent_checks` / `skill_matches` |
| Out | `profile_id` into the `flow` slice (via an `onSaved` callback) | [7](../00-shared-contract.md#7-integrated-flow-the-demo) | Integration (Scrum Master) |
| Out | 4 seed profiles as JSON fixtures | this plan, P0 | Roles 4, 5 unit tests; agent golden set |

**Hand-off promise to Roles 4 and 5:** `profile.skill_levels` always has exactly the 12 codes, each `level` an integer 1 to 10. No `OTHER` key, no nulls, no zero. The backend rejects anything else, so consumers never need defensive code.

## 3. Approach and design

### 3.1 Data flow

```
 CV file ──► POST /api/documents (Role 1) ──► {document_id, sha256}
                │
                ▼
 POST /api/resumes/parse (Role 2) ──► extractions row (ResumeExtraction)
                │ resume_extraction_id
                ▼
 POST /api/profiles/from-resume {resume_extraction_id, profile_id?}        (Role 3, no agent call)
   backend/lib/profileMapping.ts   extraction ─► draft CandidateProfile + provenance map
   backend/lib/skillLevels.ts      category_levels + skills ─► 12 skill_levels with basis
   backend/lib/profileMerge.ts     (if profile_id or email match) existing ⊕ draft ─► diff[]
                │ ProfileDraft {draft, provenance, diff, existing_profile_id, warnings}
                ▼
 frontend features/profile   react-hook-form holds values; slice holds provenance/review/diff
   ProvenanceChip accept/reject · ReimportDiffDialog · SkillLevelsStep (sliders, ghost marker,
   company-bar overlay) · CompletenessMeter · JsonPanel · localStorage autosave
                │ Save
                ▼
 POST /api/profiles            or   PUT /api/profiles/:id  (If-Match: "<version>")
   zod (generated base + rules) ─► profiles.service ─► profiles.repository
   Supabase candidate_profiles (jsonb + version)   |  in-memory store when Supabase is unset
   trigger: sync id/version/updated_at into jsonb + snapshot into candidate_profile_versions
                │ profile_id, version
                ▼
 Role 4 POST /api/talent-check {profile_id}    Role 5 POST /api/skill-match {profile_id}
```

The mapping and merge logic lives in the backend (one place, unit-tested, reused by the seed script and JSON import). The frontend only applies the user's accept/reject decisions to the diff entries the backend produced.

### 3.2 Form architecture

- **One react-hook-form instance** for the whole profile, `mode: "onBlur"`, resolver `zodResolver(profileFormSchema)`. Form values use the contract shape directly (no parallel "form model"), so `toFormValues` / `fromFormValues` are near-identity. The only derived field is `education` (the brief's display string), computed from `education_details` on submit.
- **Seven steps in shadcn `Tabs`**, freely navigable, each tab shows an error dot when its fields are invalid. Below 640 px the tab list becomes a `Select` plus Back/Next buttons and a sticky bottom Save bar.

| # | Step | Fields | RHF tool |
|---|---|---|---|
| 1 | Start | CV upload, "Pre-fill from this CV", "Import profile.json", "Start blank" | `useCvUpload`, `usePrefillFromResume`, `useProfileJson` |
| 2 | Basics | `name`, `email`, `phone`*, `links`*, `preferred_roles` (chips, suggestions from `GET /api/jds` roles) | `Controller` for chips |
| 3 | Education | `education_details[]` (degree, institution, year, score); live preview of derived `education` string | `useFieldArray` |
| 4 | Experience | `internships[]` (title, org, start, end, highlights), `projects[]` | `useFieldArray` x2 |
| 5 | Achievements | `hackathons[]`, `certifications[]` | `useFieldArray` x2 |
| 6 | Skills | `skills[]` grouped by `category_code`, add/edit dialog (name, category, evidence, confidence) | `useFieldArray` |
| 7 | Skill levels & review | 12 sliders, company overlay picker, completeness hints, Save | custom `SkillLevelSlider` |

\* `phone` and `links` depend on proposed contract change 6. If rejected, the two inputs are removed and nothing else changes.

Form values never go into Redux (keystroke re-renders). Redux holds the server cache, the pre-fill metadata and conflict state.

### 3.3 Pre-fill mapping (`ResumeExtraction` to draft `CandidateProfile`)

| Profile field | From | Rule |
|---|---|---|
| `name`, `email` | `candidate.name`, `candidate.email` | trim; email lowercased |
| `education_details` | `education[]` | as is |
| `education` | `education_details` | `formatEducation()`: most recent entry, `"<degree>, <institution>, <year>, <score>"`, empty parts skipped |
| `skills` | `skills[]` | dedupe by `canonical_id ?? norm(skill_name)`; keep the higher confidence; keep the longer evidence (≤ 200 chars) |
| `internships` | `experience[]` | every entry (the brief has only `internships`); `skills` dropped since they are already in `skills[]`; a warning if a title does not look like an internship |
| `projects`, `hackathons`, `certifications` | same names | as is |
| `preferred_roles` | `role` | `[role]` when not null |
| `cv_file` | `documents.storage_path` of `extraction.document_id` | e.g. `resume/<sha256>.pdf` |
| `skill_levels` | `category_levels` + `skills` | see 3.5 |
| `resume_extraction_id` | `extractions.id` | |

Every mapped leaf gets a provenance entry keyed by its RHF path:
`provenance["internships.0.org"] = { source: "resume", extraction_id, evidence, confidence }`, where `confidence` comes from `field_confidence[section]` (default `medium`) and `evidence` is the skill evidence or the extracted value itself.

### 3.4 Merge rules (re-import into an existing profile)

Triggered when `from-resume` gets a `profile_id`, or when the extracted email matches an existing row (the response carries `existing_profile_id` and the UI offers "Update Ananya's existing profile"). **Invariants: nothing the candidate typed is ever deleted or silently overwritten, and the merge is idempotent (importing the same resume twice gives an empty diff).**

| Field | Rule | Diff default |
|---|---|---|
| `name`, `email`, `phone` | keep existing when non-empty; a different incoming value becomes a `conflict` | keep |
| `education_details`, `internships`, `projects`, `hackathons`, `certifications` | union by identity key; matched items fill only empty sub-fields; unmatched incoming items are `add` | accept |
| identity keys | education `norm(degree)+norm(institution)`; internship `norm(org)+norm(title)`; project `norm(name)`; hackathon `norm(name)+year`; certification `norm(name)+norm(issuer)` | |
| `skills` | union by `canonical_id ?? norm(skill_name)`; on match keep higher confidence and longer evidence | accept |
| `preferred_roles` | union, existing order first | accept |
| `skill_levels[code]` with `source` self or assessed | never changed; diff shows an `info` row "resume now suggests 7" and updates `inferred_level` | keep |
| `skill_levels[code]` with `source` resume_inferred | replaced by the new inferred value and basis | accept |
| `cv_file`, `resume_extraction_id` | replaced (the newest CV wins; the old file stays in storage) | accept |

`norm(s) = s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()`.

```ts
type DiffEntry = {
  path: string;                       // RHF path, e.g. "internships.2" or "skill_levels.COD"
  kind: "add" | "update" | "conflict" | "info";
  current: unknown; incoming: unknown;
  default: "accept" | "keep";
  reason: string;                     // "New internship found in resume", "You set this yourself"
};
```

### 3.5 `skill_levels` rules

Built by `buildSkillLevels(categoryLevels, skills)` (pure, backend `lib/skillLevels.ts`):

1. All 12 codes are always present, in `skill_set_id` order. `OTHER` is never a key.
2. Level = `clamp(round(category_levels[code]), 1, 10)`. If the extraction has no value **or** no skill in that category, the level is `1`, confidence `low`, basis `"no evidence"` (contract 3.4).
3. Confidence: `high` when at least one `high` skill in the category comes from `projects` or `experience`; `medium` when any skill exists; otherwise `low`.
4. Basis (≤ 200 chars, deterministic): `"3 skills (Go, Python, Kafka) in projects + internship"`.
5. `inferred_level` (proposed change 11) stores the resume's value permanently, so the ghost marker survives reloads and Role 4 can say "self-rated above evidence".

Editor behaviour (frontend `useSkillLevels`):

| Action | Result |
|---|---|
| Move slider | `source: "self"`, confidence `medium`, basis `"Adjusted by candidate (resume suggested 5)"` |
| "Reset to resume value" | back to `resume_inferred` with the original basis |
| Self level ≥ inferred + 3 and inferred confidence is not low | soft warning only: "Talent Check will treat this as self-reported" (never blocks) |
| Calibration checklist (P2) | `source: "self"`, confidence `medium`, basis `"Self-check: 7/9 level-5 topics"` |
| Calibration quiz (P2 stretch) | `source: "assessed"`, confidence `medium`, capped at 8 (an MCQ cannot prove level 9-10 "Creation") |

Slider UI: radix `Slider` 1 to 10 with band tick labels CU/AP/AS/EV/CR under 1-2, 3-4, 5-6, 7-8, 9-10; helper text is the contract rubric row for the current band; a hollow ghost marker at `inferred_level`; an optional faint marker at the chosen company's `required_level` (from Role 4's route; we only draw it and compute nothing). `aria-valuetext="Level 6, Analysis and Synthesis"`.

### 3.6 Validation

One schema, two layers: **base** = generated from the contract JSON Schema (structure, enums), **rules** = hand-written `superRefine` (business rules). Backend is authoritative; the frontend runs the same rules for instant feedback. A shared fixture file (`docs/contract/fixtures/candidate-profile-cases.json`, each case + expected error path) runs in both test suites so the two copies cannot drift.

| Field | Rule | Where |
|---|---|---|
| `name` | required, trimmed, 2 to 100 chars | both |
| `email` | required, valid email, lowercased; unique | both; uniqueness: server 409, client check on blur via `GET /api/profiles?email=` |
| `education_details[].year` | 4 digits, 1990 to current year + 6 | both |
| `education_details[].score` | free text; warning (not error) if CGPA > 10 or % > 100 | frontend |
| `internships[]` | `title` and `org` required; `start`/`end` `YYYY-MM`; `end ≥ start`; empty `end` = ongoing | both |
| `hackathons[]`, `certifications[]` | `name` required; `year` 4 digits ≤ current year | both |
| `preferred_roles` | 0 to 5, unique (case-insensitive), 2 to 60 chars each | both |
| `skills[]` | `skill_name` ≤ 60; `category_code` in the 13 codes; `evidence` 1 to 200 (manual default `"Self-reported by candidate"`, confidence `medium` per the contract's confidence rule); unique by canonical id / name | both |
| `skill_levels` | exactly the 12 keys; integer 1 to 10; `source` enum; `basis` ≤ 200 | both |
| CV upload | `.pdf` or `.docx`, ≤ 5 MB, checked by MIME and extension | frontend (Role 1's route re-checks) |
| JSON import | ≤ 1 MB, `schema_version` major = `1`, full schema parse | frontend |

**Required to save:** `name`, `email`, `skill_levels`. Everything else is optional and feeds the completeness meter. On a failed submit, an error summary at the top lists each problem as a link that switches tab and focuses the field.

## 4. Features by phase

### P0 Contract and stubs (27 Oct, first 2 h)

| Feature | Acceptance criteria |
|---|---|
| Migration for `candidate_profiles` (+ versions table and triggers) | `supabase db push` applies cleanly twice (idempotent); RLS on, no anon policy |
| 4 seed profiles (Ananya, Karthik, Priya, Rohan) with fixed UUIDs | `npm run seed:profiles` upserts them; each passes zod and Pydantic `CandidateProfile`; their 12 levels differ visibly (table in 6.4) |
| `GET /api/profiles`, `GET /api/profiles/:id`, `POST`, `PUT` working (simple validation) | Roles 4 and 5 can `curl` a seed profile by id; `PUT` increments `version` |
| In-memory fallback repository | with Supabase env unset, the same 4 profiles are served from `src/data/seedProfiles/*.json` |
| IDs published | the UUID table in 6.4 posted to the team channel by 11:00 |

### P1 Done-by-brief (27 Oct)

| Feature | Acceptance criteria |
|---|---|
| zod schema (generated base + rules) in backend and frontend | shared fixture cases pass in both suites |
| Full CRUD with optimistic concurrency | `PUT` without `If-Match` gives 428, with a stale version 412 + `current`; duplicate email on `POST` gives 409 + `existing_profile_id` |
| `POST /api/profiles/from-resume` | for at least 2 sample resumes, returns a draft that passes the schema with all 12 `skill_levels` and a provenance entry for every pre-filled leaf |
| 7-step form, create and edit | a profile can be created blank, saved, reloaded and edited; field arrays add/remove; errors shown per field and per tab |
| Skill levels step (sliders, Bloom labels, rubric helper, ghost marker) | moving a slider sets `source: "self"`; reset restores the inferred value |
| CV upload | uploading sets `cv_file`; "Pre-fill from this CV" runs parse then from-resume |
| JSON export / import | download `profile.<slug>.json` (exact contract object); upload validates and shows path-level errors; round-trip test passes |
| Flow step 3 | `ProfileBuilder` embedded in `/match`; `onSaved` puts `profile_id` into the flow slice; Google SWE x Ananya runs end to end |

### P2 Stand-out (28 Oct morning)

| Feature | Acceptance criteria |
|---|---|
| Provenance chips with accept/reject per field, "Accept all high-confidence" | every pre-filled field shows a chip with evidence on hover/focus; reject restores the previous value; header counts "14 of 23 reviewed" |
| Re-import diff dialog (merge, never overwrite) | re-importing the same resume gives "No changes"; a changed resume lists adds/updates/conflicts with the defaults from 3.4; self-set levels untouched |
| Company bar overlay on sliders | picking Google draws 12 faint markers from Role 4's route; no gap maths in our code |
| Completeness meter with "what to add next" | score 0 to 100 from weights in 6.5; top 3 hints link to the step; backend and frontend give the same score for the 4 seeds |
| Live JSON panel | collapsible; shows the exact payload that Save will send; brief fields bold, our additions dimmed |
| Autosave draft to localStorage | debounced 800 ms; after a reload, "Restore unsaved changes from 10:42?" appears; cleared on a successful save |
| Calibration checklist ("calibrate me") | per category, shows the `skill_set_topics` items for levels L-1..L+1 as a checklist; suggested level = highest level with ≥ 60% ticked, contiguous from below |
| Conflict dialog | on 412, shows "Someone saved v4 while you edited v3" with a field diff, choose "Keep mine" (re-PUT on v4) or "Load theirs" |
| Version history drawer | lists versions with `change_source`; skill_levels diff between two versions |
| Stretch: calibration quiz | 6-question adaptive MCQ per category from a pre-generated bank; result sets `source: "assessed"` |

### P3 Scale story (28 Oct afternoon, or slide only)

| Feature | Acceptance criteria |
|---|---|
| Keyset pagination + search on the profiles list | `GET /api/profiles?limit=20&cursor=...&q=ana` stable under inserts; seeded 10k rows list in < 50 ms (EXPLAIN shows index scan) |
| `ETag` / `If-None-Match` on `GET /:id` | unchanged profile returns 304 |
| `DELETE /api/profiles/:id` (right to erasure) | removes row, versions (cascade) and CV object; Roles 4/5 rows cascade or are anonymised (proposed) |
| Signed CV URL | `GET /api/profiles/:id/cv-url` returns a 10-minute signed URL; bucket stays private |
| History retention | trigger keeps the last 20 versions per profile, but never deletes a version referenced by `talent_checks` / `skill_matches` |
| Auth-ready | `owner_id uuid null` column + RLS policy sketch `owner_id = auth.uid()` on the slide |

## 5. Files to create or change

Conventions follow the codebase digest: Express routes, controllers, services; `HttpError` for errors; supabase client from `supabase.service.ts` with a seed fallback; frontend 4-layer feature folders.

### Backend (`backend/`)

| File | Signatures | Purpose |
|---|---|---|
| `supabase/migrations/20261027120300_role3_candidate_profiles.sql` | DDL in 6.3 | tables, indexes, triggers, RLS |
| `src/routes/profiles.routes.ts` | `export default router` | `GET /`, `POST /`, `POST /from-resume` (before `/:id`), `GET /:id`, `PUT /:id`, P2/P3 `GET /:id/versions`, `GET /:id/cv-url`, `DELETE /:id` |
| `src/routes/index.ts` (change) | `router.use('/profiles', profilesRoutes)` | mount |
| `src/controllers/profiles.controller.ts` | `listProfiles, getProfile, createProfile, updateProfile, draftFromResume (req,res)` | parse params/headers (`If-Match`), validate body, set `ETag`, `res.json` |
| `src/services/profiles.service.ts` | `list(q: ListQuery): Promise<Page<ProfileSummary>>`; `get(id): Promise<StoredProfile>`; `create(p: CandidateProfileInput, src: ChangeSource): Promise<StoredProfile>`; `update(id, expectedVersion: number, p, src): Promise<StoredProfile>`; `draftFromResume(extractionId, profileId?): Promise<ProfileDraft>` | business rules, email normalisation, completeness, 409/412/428 mapping |
| `src/services/profiles.repository.ts` | `interface ProfilesRepo { list; findById; findByEmail; insert; updateIfVersion(id, v, row): Promise<Row \| null>; versions(id) }`; `supabaseProfilesRepo`, `memoryProfilesRepo`, `getProfilesRepo()` | storage behind one interface; memory store seeded from JSON when Supabase is unset |
| `src/services/extractions.read.ts` | `getResumeExtraction(id): Promise<{id, result: ResumeExtraction, document_id}>`; `getDocumentStoragePath(documentId): Promise<string \| null>` | read-only access to Role 1/2 tables (no writes) |
| `src/lib/profileMapping.ts` | `mapExtractionToDraft(ex: ResumeExtraction, extractionId: string, cvPath: string \| null): {draft: CandidateProfile; provenance: ProvenanceMap; warnings: string[]}`; `formatEducation(d: EducationDetail[]): string` | 3.3 |
| `src/lib/skillLevels.ts` | `buildSkillLevels(levels: Partial<Record<Code, number>>, skills: Skill[]): SkillLevels`; `bloomOf(level: number): Bloom`; `CODES` | 3.5 |
| `src/lib/profileMerge.ts` | `mergeProfiles(existing: CandidateProfile, incoming: CandidateProfile): {merged: CandidateProfile; diff: DiffEntry[]}`; `norm(s: string): string` | 3.4; `merged` = all defaults applied |
| `src/lib/profileCompleteness.ts` | `computeCompleteness(p: CandidateProfile): {score: number; hints: Hint[]}` | 6.5 |
| `src/contract/generated/candidateProfile.zod.ts` | generated | base schema (do not edit) |
| `src/contract/profile.schema.ts` | `candidateProfileSchema`, `candidateProfileInputSchema` (no server fields), `fromResumeBodySchema`, `listQuerySchema` | base + rules |
| `src/middlewares/validate.ts` (create if Role 1 has not) | `validateBody(schema: ZodSchema): RequestHandler` | 400 `{error, issues}` |
| `src/data/seedProfiles/{ananya-rao,karthik-subramaniam,priya-menon,rohan-verma}.json` | contract objects | P0 seeds, memory fallback |
| `scripts/seed-profiles.ts` | `npm run seed:profiles [-- --reset] [-- --from-extractions] [-- --export-golden]` | upsert by fixed id; `--from-extractions` rebuilds seeds through `mapExtractionToDraft` once Role 2 has real outputs; `--export-golden` writes copies to `agent/tests/golden/profiles/` |
| `package.json` (change) | add `zod@3`, dev `supertest`, `ajv`; script `seed:profiles` | |
| tests: `src/lib/*.test.ts`, `src/services/profiles.service.test.ts`, `src/routes/profiles.routes.test.ts` | | section 8 |

### Frontend (`frontend/src/`)

| File | Signatures | Purpose |
|---|---|---|
| `features/profile/service/profile.api.ts` | `listProfilesAPI(q)`, `getProfileAPI(id): {profile, version}` (reads `ETag`), `createProfileAPI(p)`, `updateProfileAPI(id, version, p)`, `draftFromResumeAPI(body)`, `uploadCvAPI(file, onProgress)`, `parseResumeAPI(documentId)`, `getCompanySkillBarAPI(companyId)`, `getProfileVersionsAPI(id)` | pure Axios, returns `data`, no Redux |
| `features/profile/slice/profile.slice.ts` | reducers below | sync only |
| `features/profile/Hooks/useProfiles.ts` | `useProfiles({q, limit}) → {items, loadMore, hasMore, loading, error, refetch}` | list + pagination |
| `features/profile/Hooks/useProfile.ts` | `useProfile(id?) → {profile, version, loading, error, refetch}` | load one, cache in `byId` |
| `features/profile/Hooks/useSaveProfile.ts` | `useSaveProfile() → {save(values, ctx?: {id, version}), saving, error, conflict, resolveConflict("mine" \| "theirs")}` | create vs update, 409/412 handling, toast via sonner |
| `features/profile/Hooks/useProfileDraft.ts` | `useProfileDraft(form, key) → {restorable: {savedAt} \| null, restore(), discard()}` | localStorage autosave, wrapped in try/catch |
| `features/profile/Hooks/usePrefillFromResume.ts` | `usePrefillFromResume(form) → {prefill(extractionId, profileId?), diff, applyDiff(decisions), existingProfileId, loading}` | calls from-resume, `form.reset` or diff dialog |
| `features/profile/Hooks/useFieldProvenance.ts` | `useFieldProvenance(path) → {provenance, state, accept(), reject()}`; `useProvenanceSummary() → {total, reviewed, acceptAllHigh()}` | chips |
| `features/profile/Hooks/useSkillLevels.ts` | `useSkillLevels(form) → {levels, setLevel(code, n), resetToInferred(code), applyCalibration(code, result)}` | 3.5 behaviour |
| `features/profile/Hooks/useCompanyBarOverlay.ts` | `useCompanyBarOverlay(companyId?) → {bar: Record<Code, number> \| null}` | read Role 4 route only |
| `features/profile/Hooks/useProfileCompleteness.ts` | `useProfileCompleteness(form) → {score, hints}` | live meter (`lib/completeness.ts`, same weights as backend) |
| `features/profile/Hooks/useProfileJson.ts` | `useProfileJson() → {exportJson(p), importJson(file): Promise<{ok, values?, errors?}>}` | brief's JSON save/load |
| `features/profile/Hooks/useCvUpload.ts` | `useCvUpload() → {upload(file), progress, cvFile, documentId}` | `POST /api/documents` |
| `features/profile/Hooks/useCalibration.ts` (P2) | `useCalibration(code, startLevel) → {items \| questions, answer(), result}` | checklist / quiz |
| `features/profile/lib/{schema.ts, completeness.ts, formMapping.ts, rubric.ts}` | `profileFormSchema`; `toFormValues`, `fromFormValues`; `RUBRIC`, `BANDS` | pure helpers |
| `features/profile/components/ProfileBuilder.tsx` | `({profileId?, extractionId?, onSaved?}) => JSX` | the 7-step form (reused by `/profile/*` and flow step 3) |
| `features/profile/components/steps/{StartStep,BasicsStep,EducationStep,ExperienceStep,AchievementsStep,SkillsStep,SkillLevelsStep}.tsx` | | one per tab |
| `features/profile/components/{SkillLevelSlider, ProvenanceChip, ReimportDiffDialog, ConflictDialog, CompletenessMeter, JsonPanel, ImportExportMenu, DraftRestoreBanner, VersionHistoryDrawer, CalibrateSheet, ProfilesListPage}.tsx` | | UI only, hooks only |
| `routes/profile.index.tsx`, `routes/profile.new.tsx`, `routes/profile.$profileId.tsx` | thin TanStack file routes | |
| `store.ts` (change) | add `profile: profileReducer` | |
| `contract/generated/candidateProfile.zod.ts` | generated | same base as backend |

Slice shape:

```ts
interface ProfileState {
  byId: Record<string, { profile: CandidateProfile; version: number; fetchedAt: number }>;
  list: { items: ProfileSummary[]; nextCursor: string | null; query: string; loading: boolean; error: string | null };
  current: { id: string | null; loading: boolean; saving: boolean; error: string | null;
             conflict: { server: CandidateProfile; version: number } | null };
  prefill: { extractionId: string | null; existingProfileId: string | null;
             provenance: Record<string, Provenance>;
             review: Record<string, "pending" | "accepted" | "rejected" | "edited">;
             diff: DiffEntry[] | null; warnings: string[] };
}
// reducers: setProfile, setProfileLoading, setProfileError, setList, appendList, setListLoading,
// setSaving, setConflict, clearConflict, setPrefill, setReview, clearPrefill
```

### Agent (`agent/`), P2 stretch only

| File | Purpose |
|---|---|
| `src/talent_match/calibration/generate_bank.py` | offline script: for each of 12 categories x levels 1-10, ask `talent_match.llm` for 3 MCQs grounded in that level's `skill_set_topics` text; validate with Pydantic; write `agent/data/calibration/question_bank.json` (360 questions, generated once, reviewed, committed) |
| `tests/golden/profiles/*.json` | written by `seed-profiles --export-golden` for Roles 4 and 5 eval |

No runtime agent call: the backend serves questions from the bank (answers stripped) and grades server-side. Zero LLM cost per user, deterministic grading. This is the "LangChain used creatively" point for the slide.

## 6. API and database details

### 6.1 Requests and responses

`POST /api/profiles` (body = `CandidateProfile` without `id`, `version`, `updated_at`):

```http
201 Created
ETag: "1"
Location: /api/profiles/3a000000-0000-4000-8000-000000000001
{ "id": "3a000000-...-0001", "version": 1, "name": "Ananya Rao", "email": "ananya.rao@example.com",
  "skill_levels": { "COD": { "level": 6, "source": "resume_inferred", "confidence": "high",
                             "basis": "4 skills (Go, Python, C++, Java) in projects + internship", "inferred_level": 6 }, "...": {} },
  "schema_version": "1.0", "updated_at": "2026-10-27T10:00:00Z", "...": "" }

409 Conflict  { "error": "A profile with this email already exists", "existing_profile_id": "3a00...0001" }
400           { "error": "Validation failed", "issues": [ { "path": "internships.0.end", "message": "End is before start" } ] }
```

`PUT /api/profiles/:id` with `If-Match: "3"`:

```http
200 OK, ETag: "4"                                       (body = saved profile)
412 Precondition Failed { "error": "Profile changed since version 3", "current": { ...profile v4... }, "current_version": 4 }
428 Precondition Required { "error": "If-Match header with the profile version is required" }
404 Not Found { "error": "Profile not found" }
```

`POST /api/profiles/from-resume` `{ "resume_extraction_id": "uuid", "profile_id": "uuid?" }` (nothing is saved):

```json
{
  "draft": { "...CandidateProfile, no id unless profile_id given..." : "" },
  "provenance": { "name": { "source": "resume", "confidence": "high", "evidence": "Ananya Rao", "extraction_id": "…" },
                  "internships.0.org": { "source": "resume", "confidence": "medium", "evidence": "SDE Intern, Acme (May-Jul 2025)" } },
  "diff": null,
  "existing_profile_id": "3a000000-0000-4000-8000-000000000001",
  "warnings": ["'Teaching Assistant' kept under internships"]
}
```

`diff` is `DiffEntry[]` when `profile_id` is given; `existing_profile_id` is set when the email matches a saved profile. 404 if the extraction does not exist, 422 if it is not `source_type: "resume"`.

`GET /api/profiles?limit=20&cursor=<opaque>&q=ana&email=` (default limit 20, max 100):

```json
{ "items": [ { "id": "…", "name": "Ananya Rao", "email": "ananya.rao@example.com", "preferred_roles": ["Software Engineer"],
               "levels": { "COD": 6, "DSA": 7, "...": 0 }, "completeness": 82, "version": 3, "updated_at": "…" } ],
  "next_cursor": "eyJ1IjoiMjAyNi0xMC0yN1QxMDowMDowMFoiLCJpIjoiLi4uIn0" }
```

The cursor is base64 of `{u: updated_at, i: id}`; the query is `where (updated_at, id) < (u, i) order by updated_at desc, id desc limit n+1`.

### 6.2 zod sketch (rules layer)

```ts
import { CandidateProfileBase } from "./generated/candidateProfile.zod";
export const CODES = ["COD","DSA","APTI","COMM","OOD","AI","SQL","SYSD","CLOUD","SWE","NETW","OS"] as const;

const SkillLevel = z.object({
  level: z.number().int().min(1).max(10),
  source: z.enum(["resume_inferred", "self", "assessed"]),
  confidence: z.enum(["high", "medium", "low"]),
  basis: z.string().max(200),
  inferred_level: z.number().int().min(1).max(10).nullable().optional(),
});
const SkillLevels = z.object(Object.fromEntries(CODES.map(c => [c, SkillLevel])) as Record<typeof CODES[number], typeof SkillLevel>).strict();
const YearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM");

export const candidateProfileSchema = CandidateProfileBase.extend({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  skill_levels: SkillLevels,
  preferred_roles: z.array(z.string().trim().min(2).max(60)).max(5),
}).superRefine((p, ctx) => {
  p.internships?.forEach((it, i) => {
    if (it.start && it.end && it.end < it.start)
      ctx.addIssue({ code: "custom", path: ["internships", i, "end"], message: "End is before start" });
  });
  const seen = new Set<string>();
  p.skills.forEach((s, i) => {
    const k = s.canonical_id ?? norm(s.skill_name);
    if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["skills", i, "skill_name"], message: "Duplicate skill" });
    seen.add(k);
  });
});
```

Generation: the shared `contract:types` script also runs `json-schema-to-zod` on `docs/contract/CandidateProfile.json` into both `contract/generated/` folders. Timebox 15 minutes in P0: if its `$ref` output does not compile, hand-write the base (about 60 lines) and rely on the parity test (ajv on the JSON Schema and zod must accept and reject the same fixtures).

### 6.3 SQL DDL

```sql
create table if not exists public.candidate_profiles (
  id                   uuid primary key default gen_random_uuid(),
  email                text not null unique check (email = lower(email)),
  name                 text generated always as (profile->>'name') stored,
  profile              jsonb not null check (jsonb_typeof(profile) = 'object' and profile ? 'skill_levels'),
  version              int  not null default 1 check (version >= 1),
  resume_extraction_id uuid null,               -- FK added below when extractions exists
  completeness         smallint not null default 0 check (completeness between 0 and 100),
  change_source        text not null default 'form'
                       check (change_source in ('form','resume_import','json_import','seed','calibration')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint profile_size check (pg_column_size(profile) < 262144)
);
create index if not exists candidate_profiles_updated_idx on public.candidate_profiles (updated_at desc, id desc);
create index if not exists candidate_profiles_extraction_idx on public.candidate_profiles (resume_extraction_id);

do $$ begin
  if to_regclass('public.extractions') is not null and not exists
     (select 1 from pg_constraint where conname = 'candidate_profiles_extraction_fk') then
    alter table public.candidate_profiles add constraint candidate_profiles_extraction_fk
      foreign key (resume_extraction_id) references public.extractions(id) on delete set null;
  end if;
end $$;

create table if not exists public.candidate_profile_versions (
  profile_id    uuid not null references public.candidate_profiles(id) on delete cascade,
  version       int  not null,
  profile       jsonb not null,
  change_source text not null,
  created_at    timestamptz not null default now(),
  primary key (profile_id, version)
);

-- keep the stored JSON identical to the row (Roles 4/5 may read profile jsonb directly)
create or replace function public.tg_candidate_profiles_sync() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.profile := new.profile || jsonb_build_object('id', new.id, 'version', new.version,
                                                   'updated_at', to_jsonb(new.updated_at), 'email', new.email);
  return new;
end $$;
create or replace function public.tg_candidate_profiles_snapshot() returns trigger language plpgsql as $$
begin
  insert into public.candidate_profile_versions (profile_id, version, profile, change_source)
  values (new.id, new.version, new.profile, new.change_source) on conflict do nothing;
  return null;
end $$;
drop trigger if exists candidate_profiles_sync on public.candidate_profiles;
create trigger candidate_profiles_sync before insert or update on public.candidate_profiles
  for each row execute function public.tg_candidate_profiles_sync();
drop trigger if exists candidate_profiles_snapshot on public.candidate_profiles;
create trigger candidate_profiles_snapshot after insert or update on public.candidate_profiles
  for each row execute function public.tg_candidate_profiles_snapshot();

alter table public.candidate_profiles enable row level security;
alter table public.candidate_profile_versions enable row level security;
```

Optimistic update from `profiles.repository.ts` (atomic: the `where` on `version` is the lock):

```ts
const { data, error } = await supabase.from("candidate_profiles")
  .update({ profile, email, version: expected + 1, completeness, change_source })
  .eq("id", id).eq("version", expected).select().maybeSingle();
if (!data) { const cur = await findById(id); throw cur ? new PreconditionFailed(cur) : new HttpError(404, "Profile not found"); }
```

### 6.4 Seed profiles (P0)

Levels are hand-labelled from the resumes against the contract rubric (provisional until Role 2's golden files land; `--from-extractions` replaces them in P1). Emails are taken from the resumes so that parsing a sample resume in the demo finds the existing profile and shows the merge path; until then, `<first>.<last>@example.com`.

| Candidate | id | COD | DSA | APTI | COMM | OOD | AI | SQL | SYSD | CLOUD | SWE | NETW | OS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ananya Rao (systems SWE) | `3a000000-0000-4000-8000-000000000001` | 7 | 7 | 6 | 5 | 6 | 3 | 4 | 6 | 5 | 6 | 5 | 6 |
| Karthik Subramaniam (data) | `3a000000-0000-4000-8000-000000000002` | 5 | 4 | 7 | 6 | 3 | 6 | 7 | 3 | 3 | 4 | 2 | 2 |
| Priya Menon (entry support) | `3a000000-0000-4000-8000-000000000003` | 3 | 3 | 5 | 7 | 3 | 2 | 5 | 2 | 3 | 3 | 4 | 5 |
| Rohan Verma (all-rounder) | `3a000000-0000-4000-8000-000000000004` | 8 | 7 | 7 | 7 | 7 | 6 | 6 | 6 | 6 | 7 | 5 | 6 |

### 6.5 Completeness weights

| Item | Points | Hint when missing |
|---|---|---|
| name + email | 10 | |
| at least 1 education entry with year | 10 | "Add your degree and graduation year" |
| ≥ 5 skills, ≥ 3 with evidence of use (high) | 20 | "Add evidence to 2 skills: where did you use them?" |
| ≥ 1 internship or ≥ 2 projects | 20 | "Add an internship or a project" |
| ≥ 1 hackathon or certification | 10 | "Hackathons and certifications set you apart" |
| ≥ 1 preferred role | 10 | "Pick target roles so we can match JDs" |
| CV uploaded | 10 | "Upload your CV" |
| skill_levels reviewed (no `low` confidence left untouched) | 10 | "Review 4 skill levels that have no evidence" |

## 7. Scalability and reliability

- **Stateless backend, single writer.** All writes go through `profiles.service`; any number of backend instances can run. Concurrency is safe because of the version check in the `update ... where version = $n` (no read-modify-write races).
- **Read paths.** Keyset pagination on `(updated_at desc, id desc)` is O(page) at any table size; the list returns summaries (generated `name`, `completeness`, compact `levels`), never full jsonb. P3: `pg_trgm` index on `name` for search, and `jsonb_path_ops` GIN on `profile` for recruiter-style queries ("SYSD ≥ 6").
- **Write size.** jsonb capped at 256 KB by a check constraint; Express already limits bodies to 2 MB; JSON import capped at 1 MB in the browser.
- **History that explains old results.** `talent_checks.profile_version` + `candidate_profile_versions` mean any past readiness score can be recomputed and explained on the exact profile it used. Retention: last 20 versions per profile, but referenced versions are kept.
- **Offline demo.** `memoryProfilesRepo` serves the 4 seeds when Supabase is unreachable (same pattern as `companies.service` seed fallback), so Talent Check and Skill Matching can still be demoed on bad Wi-Fi.
- **Client resilience.** localStorage draft survives tab crashes; Save is retry-safe (PUT is idempotent per version; POST duplicate yields 409 with the id, which the hook turns into "open existing").
- **PII.** RLS on, no anon policies, service-role key only in the backend. Logs carry `profile_id` and version, never email or phone. CVs live in the private `talent-docs` bucket and are served by short signed URLs (P3). `DELETE` removes the row, versions and CV (right to erasure under India's DPDP Act 2023, a good investor-slide line). JSON export happens in the browser; nothing is emailed.
- **Path to auth.** `owner_id` column + RLS `owner_id = auth.uid()` lets the same table serve real candidates later without changing routes.

## 8. Testing

| Layer | Tool | Cases |
|---|---|---|
| `skillLevels.test.ts` | vitest | always 12 keys in order; missing category gives 1/low/"no evidence"; clamping (0 to 1, 11 to 10, 5.6 to 6); confidence rules; basis ≤ 200 chars |
| `profileMapping.test.ts` | vitest | each golden `ResumeExtraction` (at least 2 samples) maps to a draft that passes `candidateProfileSchema`; email lowercased; skill dedupe; provenance exists for every non-empty mapped leaf |
| `profileMerge.test.ts` | vitest | self/assessed levels never change; arrays never lose items; identity-key matching; **idempotence** `merge(merge(a,x).merged, x).diff` is empty; conflict defaults are "keep" |
| `profileCompleteness.test.ts` | vitest | each seed has a fixed expected score (also asserted in the frontend suite) |
| `profiles.service.test.ts` | vitest + memory repo | 409 duplicate email (case-insensitive), 412 stale version with `current`, 428 missing `If-Match`, version increments, `change_source` recorded |
| `profiles.routes.test.ts` | supertest | status codes and `ETag`/`Location` headers; `/from-resume` is not captured by `/:id` |
| Contract tests | ajv + zod (backend), Pydantic (agent) | all 4 seeds and the fixture cases accepted/rejected identically by JSON Schema, zod and `talent_match.contract.CandidateProfile` |
| Components | vitest + testing-library + user-event | required fields block save and focus the error summary; `useFieldArray` add/remove; slider keyboard (ArrowRight) sets `source: "self"` and shows the badge; ProvenanceChip reject restores the old value; ReimportDiffDialog defaults match 3.4; invalid JSON import lists path errors; DraftRestoreBanner restore |
| Round trip | vitest | for each seed: `exportJson` then `importJson` then `fromFormValues(toFormValues(p))` deep-equals the original; and backend `POST` then `GET` returns the same object except server fields |
| Manual | checklist | 375 px phone layout, keyboard-only pass through all 7 steps, screen reader reads slider value text |

## 9. Demo script (about 4 minutes of the 45)

| Time | Click | Say |
|---|---|---|
| 0:00 | Flow step 3 opens after Role 2 parsed Ananya's CV | "Profile Builder turns a parsed resume into a profile the candidate owns. 23 fields came pre-filled, and each one says where it came from." |
| 0:30 | Hover a "from resume" chip on the internship; reject a wrong project link | "Evidence on every field. The candidate stays in control: accept or reject per field." |
| 1:00 | Skill levels tab; pick Google in the overlay | "The brief's profile has no per-category level, but Talent Check needs one. Here are all 12, inferred from evidence, with Bloom bands. The faint marks are Google's bar, straight from RADIX data." |
| 1:30 | Drag SYSD from 4 to 6; badge turns "self"; open "calibrate me", tick topics, it suggests 5 | "Self-ratings are allowed but labelled. Calibration uses RADIX's own topic ladder, so the candidate is honest with themselves." |
| 2:15 | Save (v2); open the JSON panel; export `profile.ananya-rao.json` | "This is the exact contract object Roles 4 and 5 receive. The brief asked for JSON save and load: it round-trips through the same schema." |
| 2:45 | **Wow:** upload Ananya's updated CV (demo variant with one extra internship, labelled as such) | Diff: "1 new internship, 3 new skills, COD 6 to 7, your self-rated SYSD kept. Merge, never overwrite." Accept, save v3, jump to Talent Check: readiness moves live. |
| 3:30 | Version history drawer | "Every Talent Check stores the profile version it used, so an old score is always explainable." |

**Challenge we faced:** "The brief's contract had a hole: Talent Check compares `candidate_level` 1 to 10, but the profile only had a skill list. We added `skill_levels` with a `source` on every value, and then hit the second problem: when the candidate uploads a new CV, a naive pre-fill wipes out what they corrected by hand. Provenance per field plus a merge with clear rules (self-set values are never overwritten, nothing is ever deleted, re-importing is idempotent) solved both."

## 10. Dependencies, risks and mitigations

| Dependency or risk | Impact | Mitigation |
|---|---|---|
| `contract.py` and JSON Schema export not ready in P0 | no generated zod | hand-written base schema in 30 minutes; switch to generated when it lands; parity test |
| `extractions` / `documents` tables (Role 1) not migrated yet | FK and from-resume fail | guarded FK block in the migration; from-resume reads golden extraction fixtures in dev (`EXTRACTIONS_SOURCE=fixtures`) |
| Role 2 real outputs late | seeds only hand-labelled | seeds are contract-valid now; `--from-extractions` swaps them in later without changing ids |
| Supabase unreachable at demo | Roles 4/5 lose profiles | memory repo + seed JSON; one env switch |
| `POST /api/documents` returns no `storage_path` | `cv_file` unknown | derive `resume/<sha256>.<ext>`; proposed change 5 |
| Form scope creep (7 steps, P2 extras) | P1 slips | P1 ships plain field arrays and sliders; chips, diff and calibration are additive components behind the same hooks |
| Seed emails collide with live demo entries | 409 during demo | `seed:profiles --reset` before rehearsal; the 409 path itself opens the existing profile |
| Two teammates editing the same seed during integration | lost updates | `If-Match` + conflict dialog |
| Slider fiddly on phones | poor mobile demo | radix slider with 44 px thumb plus a numeric stepper next to it |
| LLM rate limits for the quiz bank | stretch fails | bank is generated once, offline; checklist calibration needs no LLM |

## 11. Task checklist (order, hour estimates)

**P0 (27 Oct, by hour 2)**
- [ ] Write migration 6.3 and apply to the project (0.4 h)
- [ ] Write 4 seed JSON files with fixed UUIDs and the levels table (0.5 h)
- [ ] `profiles.repository.ts` (Supabase + memory), basic routes/controller/service for GET list, GET id, POST, PUT (0.8 h)
- [ ] `scripts/seed-profiles.ts` with `--reset`; run it; post the UUID table to the team (0.3 h)

**P1 (27 Oct)**
- [ ] zod base (generated or hand-written) + rules in backend; `validate.ts`; fixture cases file (1.0 h)
- [ ] Full concurrency (428/412/409), ETag/Location, completeness column (0.8 h)
- [ ] `skillLevels.ts`, `profileMapping.ts`, `POST /from-resume`; tests on 2 golden extractions (1.5 h)
- [ ] Frontend service, slice, `useProfile`, `useProfiles`, `useSaveProfile` (0.8 h)
- [ ] `ProfileBuilder` with 7 steps and field arrays; routes `/profile/*` (2.5 h)
- [ ] `SkillLevelsStep` with sliders, Bloom labels, rubric helper, ghost marker (1.0 h)
- [ ] CV upload + "Pre-fill from this CV"; JSON export/import + round-trip test (1.0 h)
- [ ] Embed in flow step 3 with `onSaved`; run Google SWE x Ananya end to end with Roles 4/5 (0.5 h)
- [ ] Backend and component tests from section 8 (1.0 h)

**P2 (28 Oct morning)**
- [ ] Provenance chips, review counter, "Accept all high-confidence" (1.0 h)
- [ ] `profileMerge.ts` + ReimportDiffDialog + idempotence test (1.5 h)
- [ ] Company bar overlay, completeness meter + hints, live JSON panel (1.0 h)
- [ ] localStorage autosave + restore banner; conflict dialog (0.7 h)
- [ ] Calibration checklist from `skill_set_topics` (1.0 h)
- [ ] Version history drawer (0.5 h)
- [ ] Stretch: quiz bank generation + grading route (1.5 h)
- [ ] Rehearse the 4-minute demo twice; prepare the CV demo variant (0.5 h)

**P3 (28 Oct afternoon or slide)**
- [ ] Keyset pagination + search + 10k-row timing (0.7 h)
- [ ] ETag 304, `DELETE` with cascade, signed CV URL (0.8 h)
- [ ] Version retention rule; scale and PII slide (0.5 h)

Total: about 2 h P0, 10 h P1, 7.7 h P2 (6.2 h without the stretch), 2 h P3.

## 12. Proposed contract changes

All are additive and optional. None changes a brief field or another role's object.

1. **`CandidateProfile.version`** (int, read-only, server-set). The row already has `version`; putting it in the JSON lets Roles 4 and 5 store `profile_version` without a second read. Responses also carry `ETag: "<version>"`.
2. **`candidate_profiles` extra columns:** `name` (generated from jsonb), `completeness`, `change_source`; P3 `owner_id`. New table **`candidate_profile_versions`** (Role 3) with the snapshot trigger.
3. **`POST /api/profiles/from-resume`** takes optional `profile_id` and returns a `ProfileDraft` envelope `{draft, provenance, diff, existing_profile_id, warnings}` instead of a bare profile.
4. **`GET /api/profiles`** returns `{items: ProfileSummary[], next_cursor}` with `limit`, `cursor`, `q`, `email` query params (summaries, not full profiles).
5. **`POST /api/documents`** response adds `storage_path`. Also fix the `cv_file` example in 3.4 from `documents/<sha256>.pdf` to `resume/<sha256>.pdf`, to match the storage layout in section 4.
6. **`CandidateProfile.phone`** (string, optional) and **`links`** (string[], optional), copied from `ResumeExtraction.candidate`.
7. **`internships[].end`** may be `null` (ongoing).
8. **`skill_levels[code].inferred_level`** (int 1-10 or null, optional): the resume's value, kept when the candidate overrides it (ghost marker, "self-rated above evidence" note in Talent Check).
9. **Error bodies** may carry extra keys next to `error`: `existing_profile_id` (409), `current` + `current_version` (412), `issues` (400).
10. **New Role 3 routes (P2/P3):** `GET /api/profiles/:id/versions`, `GET /api/profiles/:id/cv-url`, `DELETE /api/profiles/:id`, `GET /api/profiles/calibration/:code?level=`, `POST /api/profiles/:id/calibration`, and a shared read-only `GET /api/skill-topics` (until then we read the `topics` field of the existing `GET /api/companies/:id/skills`, which is not company-specific).
11. **Codegen** also emits zod (`json-schema-to-zod`) next to the TS types, plus a shared `docs/contract/fixtures/candidate-profile-cases.json` used by backend, frontend and agent tests.
12. **Delete semantics (P3, needs Roles 4 and 5):** `talent_checks.profile_id` and `skill_matches.profile_id` FKs `on delete cascade`, so erasure is one call.
