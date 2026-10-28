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

    // Auth buttons are available
    expect(
      screen.getAllByRole("button", { name: /Create Profile|Create Candidate Profile/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Sign In/i }).length).toBeGreaterThan(0);

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
