// Page-level tests: each page renders inside a test router with its API calls mocked.
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CompanyPickerPage from "@/features/companies/components/CompanyPickerPage";
import CompanyIntelligencePage from "@/features/intelligence/components/CompanyIntelligencePage";
import SkillIntelligencePage from "@/features/skills/components/SkillIntelligencePage";
import { STORAGE_KEY } from "@/features/companies/Hooks/companies.hooks";
import { getCompaniesAPI } from "@/features/companies/service/companies.api";
import { getCompanyProfileAPI } from "@/features/intelligence/service/intelligence.api";
import { getCompanySkillsAPI } from "@/features/skills/service/skills.api";
import { profile, renderPage, summary } from "./utils";

vi.mock("@/features/companies/service/companies.api", () => ({ getCompaniesAPI: vi.fn() }));
vi.mock("@/features/intelligence/service/intelligence.api", () => ({
  getCompanyProfileAPI: vi.fn(),
}));
vi.mock("@/features/skills/service/skills.api", () => ({ getCompanySkillsAPI: vi.fn() }));

const COMPANIES = [
  summary({
    id: 1,
    name: "Acme Corp",
    shortName: "Acme",
    companyType: "Dream",
    headquarters: "Delhi",
  }),
  summary({
    id: 2,
    name: "Globex",
    shortName: "Globex",
    companyType: "Super Dream",
    headquarters: "Pune",
    category: "Product",
  }),
  summary({
    id: 3,
    name: "Initech",
    shortName: "Initech",
    companyType: "Regular",
    headquarters: "Noida",
  }),
];

const cards = () => screen.queryAllByRole("button", { name: /Acme Corp|Globex|Initech/ });
const select = (company = { companyId: 1, companyName: "Acme Corp", logoUrl: "" }) =>
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(company));

afterEach(() => {
  vi.resetAllMocks();
  window.localStorage.clear();
});

describe("CompanyPickerPage", () => {
  it("shows every company once loaded", async () => {
    vi.mocked(getCompaniesAPI).mockResolvedValue(COMPANIES);
    renderPage(CompanyPickerPage, "/");
    await waitFor(() => expect(cards()).toHaveLength(3));
  });

  it("filters by search text after the debounce", async () => {
    vi.mocked(getCompaniesAPI).mockResolvedValue(COMPANIES);
    renderPage(CompanyPickerPage, "/");
    await waitFor(() => expect(cards()).toHaveLength(3));
    fireEvent.change(screen.getByLabelText("Search companies"), { target: { value: "pune" } });
    await waitFor(() => expect(cards()).toHaveLength(1), { timeout: 4000 });
    expect(cards()[0]).toHaveTextContent("Globex");
  });

  it("filters by placement tier and resets from the empty state", async () => {
    vi.mocked(getCompaniesAPI).mockResolvedValue(COMPANIES);
    renderPage(CompanyPickerPage, "/");
    await waitFor(() => expect(cards()).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: /^Super Dream/ }));
    expect(cards()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /^Standard/ }));
    expect(await screen.findByText("No recruiting companies found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset Search Filters" }));
    expect(cards()).toHaveLength(3);
  });

  it("switches to the table view", async () => {
    vi.mocked(getCompaniesAPI).mockResolvedValue(COMPANIES);
    renderPage(CompanyPickerPage, "/");
    await waitFor(() => expect(cards()).toHaveLength(3));
    fireEvent.click(screen.getByLabelText("Table view"));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(4); // header + 3
  });

  it("saves the picked company and opens its intelligence page", async () => {
    vi.mocked(getCompaniesAPI).mockResolvedValue(COMPANIES);
    const { router } = renderPage(CompanyPickerPage, "/");
    await waitFor(() => expect(cards()).toHaveLength(3));
    fireEvent.click(cards().find((c) => c.textContent?.includes("Globex"))!);

    await waitFor(() => expect(router.state.location.pathname).toBe("/company/intelligence"));
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      companyId: 2,
      companyName: "Globex",
    });
  });

  it("shows the error and retries", async () => {
    vi.mocked(getCompaniesAPI)
      .mockRejectedValueOnce(new Error("Backend down"))
      .mockResolvedValue(COMPANIES);
    renderPage(CompanyPickerPage, "/");
    expect(await screen.findByText("Backend down")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry Request" }));
    await waitFor(() => expect(cards()).toHaveLength(3));
    expect(getCompaniesAPI).toHaveBeenCalledTimes(2);
  });
});

describe("CompanyIntelligencePage", () => {
  it("sends the visitor home when no company is selected", async () => {
    const { router } = renderPage(CompanyIntelligencePage, "/company/intelligence");
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(getCompanyProfileAPI).not.toHaveBeenCalled();
  });

  it("renders the selected company's profile", async () => {
    select();
    vi.mocked(getCompanyProfileAPI).mockResolvedValue(
      profile({ nature_of_company: "Public", headquarters_address: "Delhi, India" }),
    );
    renderPage(CompanyIntelligencePage, "/company/intelligence");
    expect(await screen.findByRole("heading", { level: 1, name: "Acme Corp" })).toBeInTheDocument();
    expect(getCompanyProfileAPI).toHaveBeenCalledWith(1);
    expect(screen.getAllByText("Public").length).toBeGreaterThan(0);
  });

  it("shows the error and retries", async () => {
    select();
    vi.mocked(getCompanyProfileAPI)
      .mockRejectedValueOnce(new Error("Profile missing"))
      .mockResolvedValue(profile());
    renderPage(CompanyIntelligencePage, "/company/intelligence");
    expect(await screen.findByText("Failed to load company intelligence")).toBeInTheDocument();
    expect(screen.getByText("Profile missing")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Acme Corp" })).toBeInTheDocument();
  });
});

describe("SkillIntelligencePage", () => {
  const skills = {
    skills: [
      {
        id: 1,
        name: "Data Structures",
        level: 8,
        proficiency: "Expert",
        difficulty: "EXPERT" as const,
        topics: ["Arrays"],
      },
      {
        id: 2,
        name: "Operating Systems",
        level: 4,
        proficiency: "Basic",
        difficulty: "PRO" as const,
        topics: [],
      },
    ],
    topics: { 1: ["Arrays"] },
  };

  it("lists the required skills for the selected company", async () => {
    select();
    vi.mocked(getCompanyProfileAPI).mockResolvedValue(profile());
    vi.mocked(getCompanySkillsAPI).mockResolvedValue(skills);
    renderPage(SkillIntelligencePage, "/company/skills");
    expect(
      await screen.findByRole("heading", { level: 1, name: /Acme Skill Intelligence/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Data Structures")).toBeInTheDocument();
    expect(screen.getByText("Operating Systems")).toBeInTheDocument();
  });

  it("expands a skill card", async () => {
    select();
    vi.mocked(getCompanyProfileAPI).mockResolvedValue(profile());
    vi.mocked(getCompanySkillsAPI).mockResolvedValue(skills);
    renderPage(SkillIntelligencePage, "/company/skills");
    const name = await screen.findByText("Data Structures");
    const toggle = name.closest("button")!;
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("shows an error when skills fail to load", async () => {
    select();
    vi.mocked(getCompanyProfileAPI).mockResolvedValue(profile());
    vi.mocked(getCompanySkillsAPI).mockRejectedValue(new Error("skills down"));
    renderPage(SkillIntelligencePage, "/company/skills");
    expect(await screen.findByText("Failed to load skill intelligence")).toBeInTheDocument();
  });
});
