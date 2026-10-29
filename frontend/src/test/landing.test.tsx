import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LandingPage from "@/features/landing/components/LandingPage";
import { renderPage } from "./utils";

describe("LandingPage", () => {
  it("renders the crisp professional headline, locked access banner, and auth CTAs", async () => {
    renderPage(LandingPage, "/");

    // Wait for async router render and headline
    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /Where Campus Placement Meets Deterministic Skill Matching/i,
        }),
      ).toBeInTheDocument();
    });

    // Auth CTAs (buttons or links) are available
    const authCTAs = [
      ...screen.queryAllByRole("button", {
        name: /Sign In|Create Profile|Access Dashboard|Register/i,
      }),
      ...screen.queryAllByRole("link", {
        name: /Sign In|Create Profile|Access Dashboard|Dashboard|Register/i,
      }),
    ];
    expect(authCTAs.length).toBeGreaterThan(0);

    // Clean, decluttered landing page navigation links
    expect(screen.getByRole("link", { name: /^How It Works$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Hiring Bars$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Salary Tiers$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^FAQ$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Companies \(115\)$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Resume Parser$/i })).not.toBeInTheDocument();

    // Locked feature banner for public visitors
    expect(
      screen.getByRole("heading", {
        name: /Unlock 115 Corporate Hiring Bars & Live Skill Gap Ladders/i,
      }),
    ).toBeInTheDocument();

    // How candidates get placed
    expect(
      screen.getByRole("heading", { name: /How Candidates Compare & Get Placed/i }),
    ).toBeInTheDocument();

    // Salary Tiers
    expect(
      screen.getByRole("heading", { name: /Corporate Placement Tiers & Hiring Bars/i }),
    ).toBeInTheDocument();
  });
});
