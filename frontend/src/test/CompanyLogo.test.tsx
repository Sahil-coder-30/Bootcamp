import { fireEvent, render, screen } from "@testing-library/react";
import { CompanyLogo } from "@/components/CompanyLogo";

describe("CompanyLogo", () => {
  it("shows initials when there is no logo", () => {
    render(<CompanyLogo name="Tata Consultancy" />);
    expect(screen.getByText("TC")).toBeInTheDocument();
  });

  it("uses the first two letters for a one-word name", () => {
    render(<CompanyLogo name="infosys" />);
    expect(screen.getByText("IN")).toBeInTheDocument();
  });

  it("falls back to initials when the image fails", () => {
    render(<CompanyLogo name="Acme Corp" logoUrl="https://broken.test/logo.png" />);
    const img = screen.getByRole("img", { name: "Acme Corp logo" });
    fireEvent.error(img);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AC")).toBeInTheDocument();
  });
});
