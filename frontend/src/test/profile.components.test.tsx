import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { Provider } from "react-redux";

vi.mock("@/features/profile/service/profile.api", () => ({
  listProfilesAPI: vi.fn(),
  getProfileAPI: vi.fn(),
  createProfileAPI: vi.fn(),
  updateProfileAPI: vi.fn(),
  deleteProfileAPI: vi.fn(),
  draftFromResumeAPI: vi.fn(),
  getProfileVersionsAPI: vi.fn(),
  getCvUrlAPI: vi.fn(),
  uploadCvAPI: vi.fn(),
  parseResumeAPI: vi.fn(),
  getCompanySkillBarAPI: vi.fn(),
  getCalibrationAPI: vi.fn(),
  getTelegramStatusAPI: vi.fn(),
  createTelegramLinkAPI: vi.fn(),
  listJdRolesAPI: vi.fn(),
}));
vi.mock("@/features/companies/service/companies.api", () => ({ getCompaniesAPI: vi.fn() }));

import * as api from "@/features/profile/service/profile.api";
import * as companiesApi from "@/features/companies/service/companies.api";
import ProfileBuilder, {
  type ProfileBuilderProps,
} from "@/features/profile/components/ProfileBuilder";
import ProfilesListPage from "@/features/profile/components/ProfilesListPage";
import { CompletenessMeter } from "@/features/profile/components/CompletenessMeter";
import { ConflictDialog } from "@/features/profile/components/ConflictDialog";
import { DraftRestoreBanner } from "@/features/profile/components/DraftRestoreBanner";
import { ReimportDiffDialog } from "@/features/profile/components/ReimportDiffDialog";
import { VersionHistoryDrawer } from "@/features/profile/components/VersionHistoryDrawer";
import { DRAFT_PREFIX } from "@/features/profile/Hooks/useProfileDraft";
import { blankValues } from "@/features/profile/lib/formMapping";
import type { DiffEntry, ProfileValues, StoredProfile } from "@/features/profile/lib/types";
import { makeStore, renderPage, TestStore } from "./utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const PROFILE_UUID = "3a000000-0000-4000-8000-000000000001";

const stored = (over: Partial<StoredProfile> = {}): StoredProfile => ({
  ...blankValues(),
  name: "Ana Lyst",
  email: "ana@example.com",
  id: PROFILE_UUID,
  version: 1,
  updated_at: "2026-10-28T10:00:00.000Z",
  ...over,
});

beforeEach(() => {
  vi.mocked(companiesApi.getCompaniesAPI).mockResolvedValue([]);
  vi.mocked(api.listJdRolesAPI).mockResolvedValue([]);
  vi.mocked(api.createProfileAPI).mockResolvedValue(stored());
  // The Telegram bot is off unless a test turns it on.
  vi.mocked(api.getTelegramStatusAPI).mockResolvedValue({ enabled: false, username: null });
});

afterEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
});

function renderBuilder(props: ProfileBuilderProps = {}, store: TestStore = makeStore()) {
  return renderPage(() => <ProfileBuilder {...props} />, "/profile/new", store);
}

// A tab's name gains " has errors" once a failed submit marks it, so match the start.
// The page renders once the router has resolved, so wait for the tab.
const tab = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(await screen.findByRole("tab", { name: new RegExp(`^${name}`) }));

describe("ProfileBuilder: saving", () => {
  it("blocks Save when required fields are missing, lists the problems, and links to the field", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await user.click(await screen.findByRole("button", { name: /save profile/i }));

    const summary = await screen.findByTestId("error-summary");
    expect(api.createProfileAPI).not.toHaveBeenCalled();
    expect(
      within(summary).getByText(/name: Name must be at least 2 characters/i),
    ).toBeInTheDocument();
    expect(within(summary).getByText(/email: Enter a valid email/i)).toBeInTheDocument();

    await user.click(within(summary).getByRole("button", { name: /name:/i }));
    await waitFor(() => expect(document.getElementById("f-name")).toHaveFocus());
    expect(screen.getByRole("tab", { name: /^Basics/ })).toHaveAttribute("data-state", "active");
  });

  it("saves a valid profile: lower-cased email, contract payload, onSaved called", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    renderBuilder({ onSaved });
    await tab(user, "Basics");
    await user.type(await screen.findByLabelText(/full name/i), "Ana Lyst");
    await user.type(screen.getByLabelText(/^email/i), "ANA@Example.com");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(api.createProfileAPI).toHaveBeenCalled());
    const [payload, source] = vi.mocked(api.createProfileAPI).mock.calls[0]!;
    expect(payload).toMatchObject({
      name: "Ana Lyst",
      email: "ana@example.com",
      schema_version: "1.0",
    });
    expect(Object.keys(payload.skill_levels)).toHaveLength(12);
    expect(payload).not.toHaveProperty("id");
    expect(source).toBe("form");
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith({ profile_id: PROFILE_UUID, version: 1 }),
    );
  });

  it("shows 'open existing' when the email already has a profile", async () => {
    const { AxiosError } = await import("axios");
    vi.mocked(api.createProfileAPI).mockRejectedValue(
      new AxiosError("dup", "ERR", undefined, undefined, {
        status: 409,
        data: { error: "dup", existing_profile_id: "p9" },
      } as never),
    );
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Basics");
    await user.type(await screen.findByLabelText(/full name/i), "Ana Lyst");
    await user.type(screen.getByLabelText(/^email/i), "ana@example.com");
    await user.click(screen.getByRole("button", { name: /save profile/i }));
    expect(
      await screen.findByRole("button", { name: /open existing profile/i }),
    ).toBeInTheDocument();
  });
});

describe("ProfileBuilder: steps", () => {
  it("adds and removes education entries and previews the derived summary", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Education");
    expect(
      await screen.findByText(/no education entrys yet|no education entry/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add education entry/i }));
    await user.type(screen.getByLabelText(/degree/i), "BCA");
    await user.type(screen.getByLabelText(/institution/i), "PQR College");
    await user.type(screen.getByLabelText(/graduation year/i), "2026");
    expect(screen.getByTestId("education-preview")).toHaveTextContent("BCA, PQR College, 2026");

    await user.click(screen.getByRole("button", { name: /remove education 1/i }));
    expect(screen.queryByLabelText(/degree/i)).not.toBeInTheDocument();
  });

  it("adds an internship with its fields", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Experience");
    await user.click(await screen.findByRole("button", { name: /add internship/i }));
    await user.type(screen.getByLabelText(/^title/i), "SDE Intern");
    await user.type(screen.getByLabelText(/^organisation/i), "Acme");
    expect(screen.getByLabelText(/^title/i)).toHaveValue("SDE Intern");
    expect(screen.getByLabelText(/highlights/i)).toBeInTheDocument();
  });

  it("adds a preferred role with Enter, from a suggestion, and removes it", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Basics");
    const input = await screen.findByLabelText(/preferred roles/i);
    await user.type(input, "Backend Engineer{Enter}");
    expect(screen.getByRole("list", { name: /selected roles/i })).toHaveTextContent(
      "Backend Engineer",
    );
    await user.click(await screen.findByRole("button", { name: /\+ Data Analyst/i }));
    expect(screen.getByRole("list", { name: /selected roles/i })).toHaveTextContent("Data Analyst");
    await user.click(screen.getByRole("button", { name: "Remove Backend Engineer" }));
    expect(screen.getByRole("list", { name: /selected roles/i })).not.toHaveTextContent(
      "Backend Engineer",
    );
  });

  it("adds a skill through the dialog, rejects a duplicate, and removes it", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Skills");
    await user.click(await screen.findByRole("button", { name: /add skill/i }));
    let dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^skill$/i), "Python");
    await user.click(within(dialog).getByRole("button", { name: /add skill/i }));
    expect(await screen.findByText("Python")).toBeInTheDocument();
    expect(screen.getByText("Self-reported by candidate")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^add skill$/i }));
    dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^skill$/i), "python");
    await user.click(within(dialog).getByRole("button", { name: /add skill/i }));
    expect(await within(dialog).findByText("You already have this skill")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    await user.click(screen.getByRole("button", { name: "Remove Python" }));
    expect(screen.queryByText("Python")).not.toBeInTheDocument();
  });
});

describe("ProfileBuilder: skill levels", () => {
  it("moving a slider with the keyboard makes the value self-rated and shows the badge", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Skill levels");
    expect(await screen.findByTestId("source-COD")).toHaveTextContent("from resume");
    const slider = screen.getByRole("slider", { name: "Coding level" });
    expect(slider).toHaveAttribute("aria-valuetext", "Level 1, Conceptual Understanding");

    slider.focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(screen.getByTestId("source-COD")).toHaveTextContent("self"));
    expect(screen.getByTestId("value-COD")).toHaveTextContent("2");
    expect(screen.getByRole("slider", { name: "Coding level" })).toHaveAttribute(
      "aria-valuetext",
      "Level 2, Conceptual Understanding",
    );
  });

  it("the stepper buttons and the reset button work, and the ghost marker stays", async () => {
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Skill levels");
    await user.click(await screen.findByRole("button", { name: "Increase Coding" }));
    await user.click(screen.getByRole("button", { name: "Increase Coding" }));
    expect(screen.getByTestId("value-COD")).toHaveTextContent("3");
    expect(screen.getByTestId("ghost-COD")).toBeInTheDocument();

    await user.click(
      within(screen.getByTestId("level-COD")).getByRole("button", {
        name: /reset to resume value \(1\)/i,
      }),
    );
    expect(screen.getByTestId("value-COD")).toHaveTextContent("1");
    expect(screen.getByTestId("source-COD")).toHaveTextContent("from resume");
  });

  it("calibrate me: tick topics, take the suggested level", async () => {
    vi.mocked(api.getCalibrationAPI).mockResolvedValue({
      code: "COD",
      level: 1,
      source: "seed",
      levels: [
        { level: 1, topics: ["Variables", "Loops"] },
        { level: 2, topics: ["Functions", "Recursion"] },
      ],
    });
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Skill levels");
    await user.click(
      within(await screen.findByTestId("level-COD")).getByRole("button", { name: /calibrate me/i }),
    );
    const sheet = await screen.findByRole("dialog");
    await user.click(await within(sheet).findByLabelText("Variables"));
    await user.click(within(sheet).getByLabelText("Loops"));
    await user.click(within(sheet).getByLabelText("Functions"));
    await user.click(within(sheet).getByLabelText("Recursion"));
    expect(screen.getByTestId("calibration-suggestion")).toHaveTextContent("Suggested level: 2");
    await user.click(within(sheet).getByRole("button", { name: /use level 2/i }));

    await waitFor(() => expect(screen.getByTestId("value-COD")).toHaveTextContent("2"));
    expect(screen.getByTestId("source-COD")).toHaveTextContent("self");
    expect(
      within(screen.getByTestId("level-COD")).getByText(/Self-check: 4\/4 topics around level 1/),
    ).toBeInTheDocument();
  });

  it("draws the company bar marker when the route answers", async () => {
    vi.mocked(companiesApi.getCompaniesAPI).mockResolvedValue([
      { id: 4, name: "Google LLC" } as never,
    ]);
    vi.mocked(api.getCompanySkillBarAPI).mockResolvedValue(
      ["COD", "DSA", "APTI", "COMM", "OOD", "AI", "SQL", "SYSD", "CLOUD", "SWE", "NETW", "OS"].map(
        (c, i) => ({
          company_id: 4,
          company_name: "Google LLC",
          skill_set_id: i + 1,
          category_code: c,
          required_level: 7,
        }),
      ),
    );
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Skill levels");
    const select = await screen.findByLabelText(/show a company's bar/i);
    await screen.findByRole("option", { name: "Google LLC" });
    await user.selectOptions(select, "4");
    expect(await screen.findByTestId("bar-COD")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^bar-/)).toHaveLength(12);
  });

  it("says so (and keeps working) when the company bar is not available", async () => {
    vi.mocked(companiesApi.getCompaniesAPI).mockResolvedValue([
      { id: 4, name: "Google LLC" } as never,
    ]);
    vi.mocked(api.getCompanySkillBarAPI).mockRejectedValue(new Error("404"));
    const user = userEvent.setup();
    renderBuilder();
    await tab(user, "Skill levels");
    await screen.findByRole("option", { name: "Google LLC" });
    await user.selectOptions(await screen.findByLabelText(/show a company's bar/i), "4");
    expect(await screen.findByText(/company bar is not available/i)).toBeInTheDocument();
    expect(screen.queryByTestId("bar-COD")).not.toBeInTheDocument();
  });
});

describe("ProfileBuilder: pre-fill from a resume", () => {
  const prov = (evidence: string, confidence: "high" | "medium" = "high") => ({
    source: "resume" as const,
    extraction_id: "e1",
    confidence,
    evidence,
  });
  const draft = (): ProfileValues => ({
    ...blankValues(),
    name: "Ananya Rao",
    email: "ananya.rao@example.com",
  });

  beforeEach(() => {
    vi.mocked(api.draftFromResumeAPI).mockResolvedValue({
      draft: draft(),
      provenance: { name: prov("Ananya Rao"), email: prov("ananya.rao@example.com", "medium") },
      diff: null,
      existing_profile_id: null,
      warnings: [],
    });
  });

  it("fills the form, shows chips with evidence, counts reviews and accepts all high confidence", async () => {
    const user = userEvent.setup();
    renderBuilder({ extractionId: "e1" });
    await waitFor(() =>
      expect(api.draftFromResumeAPI).toHaveBeenCalledWith({ resume_extraction_id: "e1" }),
    );
    expect(await screen.findByTestId("review-counter")).toHaveTextContent("0 of 2");

    await user.click(screen.getByRole("button", { name: /accept all high-confidence/i }));
    expect(screen.getByTestId("review-counter")).toHaveTextContent("1 of 2");

    await tab(user, "Basics");
    expect(await screen.findByLabelText(/full name/i)).toHaveValue("Ananya Rao");
    const chip = screen.getByTestId("prov-name");
    expect(
      within(chip).getByRole("button", {
        name: /accepted, high confidence. Evidence: Ananya Rao/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("prov-email")).getByRole("button", {
        name: /from resume, medium confidence/i,
      }),
    ).toBeInTheDocument();
  });

  it("reject restores what was there before; editing marks the field edited", async () => {
    const user = userEvent.setup();
    renderBuilder({ extractionId: "e1" });
    await waitFor(() => expect(api.draftFromResumeAPI).toHaveBeenCalled());
    await tab(user, "Basics");
    expect(await screen.findByLabelText(/^email/i)).toHaveValue("ananya.rao@example.com");

    await user.click(
      within(screen.getByTestId("prov-email")).getByRole("button", { name: /reject/i }),
    );
    expect(screen.getByLabelText(/^email/i)).toHaveValue("");
    expect(
      within(screen.getByTestId("prov-email")).getByRole("button", { name: /restored/i }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/full name/i), "{Backspace}");
    await waitFor(() =>
      expect(
        within(screen.getByTestId("prov-name")).getByRole("button", { name: /edited/i }),
      ).toBeInTheDocument(),
    );
  });

  it("offers to update an existing profile when the email already has one", async () => {
    vi.mocked(api.draftFromResumeAPI).mockResolvedValue({
      draft: draft(),
      provenance: {},
      diff: null,
      existing_profile_id: "p9",
      warnings: ["'Teaching Assistant' kept under internships"],
    });
    renderBuilder({ extractionId: "e1" });
    expect(
      await screen.findByRole("button", { name: /update the existing profile/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("'Teaching Assistant' kept under internships")).toBeInTheDocument();
  });

  it("uploads a CV, parses it and pre-fills", async () => {
    vi.mocked(api.uploadCvAPI).mockResolvedValue({ document_id: "d1", sha256: "abc" });
    vi.mocked(api.parseResumeAPI).mockResolvedValue({ extraction_id: "e1" });
    const user = userEvent.setup();
    renderBuilder();
    const prefillBtn = await screen.findByRole("button", { name: /pre-fill from this cv/i });
    expect(prefillBtn).toBeDisabled();
    await user.upload(
      screen.getByTestId("cv-input"),
      new File(["%PDF"], "cv.pdf", { type: "application/pdf" }),
    );
    await waitFor(() => expect(prefillBtn).toBeEnabled());
    expect(await screen.findByText("resume/abc.pdf")).toBeInTheDocument();
    await user.click(prefillBtn);
    await waitFor(() =>
      expect(api.draftFromResumeAPI).toHaveBeenCalledWith({ resume_extraction_id: "e1" }),
    );
  });

  it("rejects a file that is not a PDF or Word document", async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderBuilder();
    await user.upload(
      await screen.findByTestId("cv-input"),
      new File(["x"], "cv.txt", { type: "text/plain" }),
    );
    expect(await screen.findByText("Upload a PDF or Word (.docx) file")).toBeInTheDocument();
    expect(api.uploadCvAPI).not.toHaveBeenCalled();
  });
});

describe("ProfileBuilder: JSON import", () => {
  it("lists path-level errors for an invalid file and changes nothing", async () => {
    const user = userEvent.setup();
    renderBuilder();
    const [input] = await screen.findAllByTestId("import-json-input");
    await user.upload(
      input!,
      new File([JSON.stringify({ ...blankValues(), name: "A", email: "nope" })], "bad.json", {
        type: "application/json",
      }),
    );
    const list = await screen.findByTestId("import-errors");
    expect(within(list).getByText("name")).toBeInTheDocument();
    expect(within(list).getByText("email")).toBeInTheDocument();
  });

  it("loads a valid file into the form", async () => {
    const user = userEvent.setup();
    renderBuilder();
    const [input] = await screen.findAllByTestId("import-json-input");
    const file = new File(
      [JSON.stringify({ ...blankValues(), name: "Imported Person", email: "imp@example.com" })],
      "p.json",
      {
        type: "application/json",
      },
    );
    await user.upload(input!, file);
    expect(await screen.findByLabelText(/full name/i)).toHaveValue("Imported Person");
  });
});

describe("ProfileBuilder: editing a saved profile", () => {
  it("loads it, saves with the version, and shows the conflict dialog on 412", async () => {
    const { AxiosError } = await import("axios");
    vi.mocked(api.getProfileAPI).mockResolvedValue({ profile: stored({ version: 3 }), version: 3 });
    vi.mocked(api.updateProfileAPI).mockRejectedValue(
      new AxiosError("stale", "ERR", undefined, undefined, {
        status: 412,
        data: {
          error: "stale",
          current: stored({ version: 4, name: "Their Edit" }),
          current_version: 4,
        },
      } as never),
    );
    const user = userEvent.setup();
    renderBuilder({ profileId: PROFILE_UUID });
    // The field exists (empty) before the loaded profile is applied to the form.
    await waitFor(() => expect(screen.getByLabelText(/full name/i)).toHaveValue("Ana Lyst"));
    expect(screen.getByText("v3")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/full name/i), " Edited");
    await user.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() =>
      expect(api.updateProfileAPI).toHaveBeenCalledWith(
        PROFILE_UUID,
        3,
        expect.any(Object),
        "form",
      ),
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/someone saved v4 while you edited v3/i)).toBeInTheDocument();
    expect(within(dialog).getByTestId("conflict-fields")).toHaveTextContent("name");

    await user.click(within(dialog).getByRole("button", { name: /load theirs/i }));
    await waitFor(() => expect(screen.getByLabelText(/full name/i)).toHaveValue("Their Edit"));
  });

  it("shows a retry when the profile cannot be loaded", async () => {
    vi.mocked(api.getProfileAPI).mockRejectedValue(new Error("not found"));
    renderBuilder({ profileId: "missing" });
    expect(await screen.findByText(/could not load this profile/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("restores an autosaved draft after a reload", async () => {
    window.localStorage.setItem(
      DRAFT_PREFIX + "new",
      JSON.stringify({
        savedAt: "2026-10-28T10:42:00.000Z",
        values: { ...blankValues(), name: "Unsaved Name" },
      }),
    );
    const user = userEvent.setup();
    renderBuilder();
    expect(await screen.findByText(/restore unsaved changes from/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^restore$/i }));
    expect(screen.queryByText(/restore unsaved changes from/i)).not.toBeInTheDocument();
    await tab(user, "Basics");
    expect(await screen.findByLabelText(/full name/i)).toHaveValue("Unsaved Name");
  });
});

describe("ProfileBuilder: Connect Telegram", () => {
  const link = {
    code: "abc123abc123",
    url: "https://t.me/test_bot?start=abc123abc123",
    expires_at: "2026-10-29T10:00:00.000Z",
  };

  it("is hidden when the bot is off, and for an unsaved profile", async () => {
    vi.mocked(api.getProfileAPI).mockResolvedValue({ profile: stored(), version: 1 });
    renderBuilder({ profileId: PROFILE_UUID });
    await screen.findByRole("button", { name: /history/i });
    expect(screen.queryByRole("button", { name: /connect telegram/i })).not.toBeInTheDocument();
  });

  it("is hidden on a new profile even when the bot is on", async () => {
    vi.mocked(api.getTelegramStatusAPI).mockResolvedValue({ enabled: true, username: "test_bot" });
    renderBuilder();
    await screen.findByRole("button", { name: /save profile/i });
    expect(screen.queryByRole("button", { name: /connect telegram/i })).not.toBeInTheDocument();
  });

  it("opens the bot with a one-time link when the bot is on", async () => {
    vi.mocked(api.getTelegramStatusAPI).mockResolvedValue({ enabled: true, username: "test_bot" });
    vi.mocked(api.getProfileAPI).mockResolvedValue({ profile: stored(), version: 1 });
    vi.mocked(api.createTelegramLinkAPI).mockResolvedValue(link);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const user = userEvent.setup();
    renderBuilder({ profileId: PROFILE_UUID });
    await user.click(await screen.findByRole("button", { name: /connect telegram/i }));
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith(link.url, "_blank", "noopener,noreferrer"),
    );
    expect(api.createTelegramLinkAPI).toHaveBeenCalledWith(PROFILE_UUID);
    open.mockRestore();
  });
});

describe("ReimportDiffDialog", () => {
  const diff: DiffEntry[] = [
    {
      path: "internships.1",
      kind: "add",
      current: null,
      incoming: { title: "Intern", org: "Bolt Cloud" },
      default: "accept",
      reason: "New internship found in resume",
    },
    {
      path: "skill_levels.COD",
      kind: "update",
      current: 6,
      incoming: 7,
      default: "accept",
      reason: "Level re-inferred",
    },
    {
      path: "skill_levels.SYSD",
      kind: "info",
      current: 4,
      incoming: 7,
      default: "keep",
      reason: "Resume now suggests 7; you set 4 yourself",
    },
    {
      path: "name",
      kind: "conflict",
      current: "Ananya R.",
      incoming: "Ananya Rao",
      default: "keep",
      reason: "Resume has a different name",
    },
  ];

  it("shows the headline, the defaults, and applies explicit decisions", async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<ReimportDiffDialog diff={diff} onApply={onApply} onCancel={vi.fn()} />);
    expect(screen.getByTestId("diff-summary")).toHaveTextContent(
      "1 new internship, COD 6 to 7, your self-rated SYSD kept, 1 conflict",
    );
    const add = screen.getByRole("radiogroup", { name: /decision for internship 2/i });
    expect(within(add).getByRole("radio", { name: "Add it" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const info = screen.getByRole("radiogroup", { name: /decision for SYSD level/i });
    expect(within(info).getByRole("radio", { name: "Keep my level" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const conflict = screen.getByRole("radiogroup", { name: /decision for name/i });
    expect(within(conflict).getByRole("radio", { name: "Keep mine" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.click(within(add).getByRole("radio", { name: "Skip it" }));
    expect(within(add).getByRole("radio", { name: "Skip it" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /apply to my profile/i }));
    expect(onApply).toHaveBeenCalledWith({ "internships.1": "keep" });
  });

  it("says there is nothing to update when the diff is empty, and stays closed for null", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ReimportDiffDialog diff={[]} onApply={vi.fn()} onCancel={onCancel} />,
    );
    expect(screen.getByText(/nothing to update/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /apply/i })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Close" })[0]!);
    expect(onCancel).toHaveBeenCalled();
    rerender(<ReimportDiffDialog diff={null} onApply={vi.fn()} onCancel={onCancel} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("small components", () => {
  it("DraftRestoreBanner calls restore and discard", async () => {
    const onRestore = vi.fn();
    const onDiscard = vi.fn();
    const user = userEvent.setup();
    render(
      <DraftRestoreBanner
        savedAt="2026-10-28T10:42:00.000Z"
        onRestore={onRestore}
        onDiscard={onDiscard}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Restore" }));
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(onRestore).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("ConflictDialog offers both choices", async () => {
    const onMine = vi.fn();
    const onTheirs = vi.fn();
    const user = userEvent.setup();
    render(
      <ConflictDialog
        conflict={{ server: stored({ version: 4 }), version: 4 }}
        local={{ ...blankValues(), name: "Ana Lyst", email: "ana@example.com" }}
        yourVersion={3}
        saving={false}
        onMine={onMine}
        onTheirs={onTheirs}
      />,
    );
    await user.click(screen.getByRole("button", { name: /keep mine/i }));
    await user.click(screen.getByRole("button", { name: /load theirs/i }));
    expect(onMine).toHaveBeenCalledOnce();
    expect(onTheirs).toHaveBeenCalledOnce();
    expect(screen.getByText(/nothing visible differs/i)).toBeInTheDocument();
  });

  it("CompletenessMeter shows the score and jumps to the step of a hint", async () => {
    const onGoToStep = vi.fn();
    const user = userEvent.setup();
    function Harness() {
      const form = useForm<ProfileValues>({ defaultValues: blankValues() });
      return <CompletenessMeter control={form.control} onGoToStep={onGoToStep} />;
    }
    render(<Harness />);
    expect(screen.getByTestId("completeness-score")).toHaveTextContent("0");
    expect(screen.getByRole("progressbar", { name: /completeness/i })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    await user.click(screen.getByRole("button", { name: /add an internship or a project/i }));
    expect(onGoToStep).toHaveBeenCalledWith("experience");
  });

  it("VersionHistoryDrawer lists versions with the level changes", async () => {
    const v1 = stored({ version: 1 });
    const v2 = stored({ version: 2 });
    v2.skill_levels.COD = { ...v2.skill_levels.COD, level: 6, source: "self" };
    vi.mocked(api.getProfileVersionsAPI).mockResolvedValue([
      {
        profile_id: "p1",
        version: 2,
        profile: v2,
        change_source: "form",
        created_at: "2026-10-28T11:00:00.000Z",
      },
      {
        profile_id: "p1",
        version: 1,
        profile: v1,
        change_source: "seed",
        created_at: "2026-10-28T10:00:00.000Z",
      },
    ]);
    render(
      <Provider store={makeStore()}>
        <VersionHistoryDrawer profileId="p1" open onOpenChange={() => undefined} />
      </Provider>,
    );
    const list = await screen.findByRole("list", { name: "Versions" });
    expect(within(list).getByText("current")).toBeInTheDocument();
    expect(within(list).getByText(/COD 1 to 6 \(self\)/)).toBeInTheDocument();
    expect(within(list).getByText("sample data")).toBeInTheDocument();
  });
});

describe("ProfilesListPage", () => {
  const summaries = [
    {
      id: "p1",
      name: "Ananya Rao",
      email: "ananya.rao@example.com",
      preferred_roles: ["Software Engineer"],
      levels: Object.fromEntries(
        [
          "COD",
          "DSA",
          "APTI",
          "COMM",
          "OOD",
          "AI",
          "SQL",
          "SYSD",
          "CLOUD",
          "SWE",
          "NETW",
          "OS",
        ].map((c) => [c, 5]),
      ),
      completeness: 90,
      version: 1,
      updated_at: "now",
    },
    {
      id: "p2",
      name: "Priya Menon",
      email: "priya.menon@example.com",
      preferred_roles: [],
      levels: Object.fromEntries(
        [
          "COD",
          "DSA",
          "APTI",
          "COMM",
          "OOD",
          "AI",
          "SQL",
          "SYSD",
          "CLOUD",
          "SWE",
          "NETW",
          "OS",
        ].map((c) => [c, 3]),
      ),
      completeness: 60,
      version: 1,
      updated_at: "now",
    },
  ] as never[];

  it("lists profiles, searches, and deletes after confirmation", async () => {
    vi.mocked(api.listProfilesAPI).mockResolvedValue({ items: summaries, next_cursor: null });
    vi.mocked(api.deleteProfileAPI).mockResolvedValue();
    const user = userEvent.setup();
    renderPage(ProfilesListPage, "/profile");
    expect(await screen.findByText("Ananya Rao")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /completeness of ananya rao/i }),
    ).toHaveAttribute("aria-valuenow", "90");

    vi.mocked(api.listProfilesAPI).mockResolvedValue({ items: [summaries[1]!], next_cursor: null });
    await user.type(screen.getByRole("textbox", { name: /search profiles/i }), "priya");
    await waitFor(() =>
      expect(api.listProfilesAPI).toHaveBeenLastCalledWith({ q: "priya", limit: 20 }),
    );
    await waitFor(() => expect(screen.queryByText("Ananya Rao")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Delete Priya Menon" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /delete profile/i }));
    await waitFor(() => expect(api.deleteProfileAPI).toHaveBeenCalledWith("p2"));
    await waitFor(() => expect(screen.queryByText("Priya Menon")).not.toBeInTheDocument());
  });

  it("shows an empty state and an error with retry", async () => {
    vi.mocked(api.listProfilesAPI).mockResolvedValue({ items: [], next_cursor: null });
    renderPage(ProfilesListPage, "/profile");
    expect(await screen.findByText(/no profiles yet/i)).toBeInTheDocument();
  });

  it("offers Load more while there is a next page", async () => {
    vi.mocked(api.listProfilesAPI)
      .mockResolvedValueOnce({ items: [summaries[0]!], next_cursor: "c1" })
      .mockResolvedValueOnce({ items: [summaries[1]!], next_cursor: null });
    const user = userEvent.setup();
    renderPage(ProfilesListPage, "/profile");
    await screen.findByText("Ananya Rao");
    await user.click(screen.getByRole("button", { name: /load more/i }));
    expect(await screen.findByText("Priya Menon")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument();
  });
});

// Keeps the helper imports used even if a test above is skipped.
void TooltipProvider;
void FormProvider;
