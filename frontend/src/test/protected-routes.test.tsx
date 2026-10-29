import { describe, expect, it, beforeEach } from "vitest";
import { Route as IndexRoute } from "@/routes/index";
import { Route as LoginRoute } from "@/routes/login";
import { Route as DashboardRoute } from "@/routes/dashboard";
import { Route as TalentCheckRoute } from "@/routes/talent-check";
import { Route as ResumeRoute } from "@/routes/resume";
import { Route as SkillMatchRoute } from "@/routes/skill-match";
import { Route as JdRoute } from "@/routes/jd";
import { Route as FlowRoute } from "@/routes/flow";
import { Route as ProfileRoute } from "@/routes/profile";
import { Route as CompaniesRoute } from "@/routes/companies";
import { Route as CompanyRoute } from "@/routes/company";
import { saveStoredUser, clearStoredUser } from "@/lib/auth";
import { writeSession, clearSession } from "@/lib/authStorage";

describe("Protected Routes and Redirects", () => {
  beforeEach(() => {
    clearStoredUser();
    clearSession();
  });

  describe("Root route (/) redirect behavior", () => {
    it("redirects authenticated user to /dashboard", () => {
      saveStoredUser({
        id: "candidate-1",
        name: "Test Candidate",
        role: "SDE",
        avatarText: "TC",
        email: "test@jssaten.ac.in",
      });
      writeSession({ accessToken: "token-123", refreshToken: "ref-123" });

      expect(() => {
        // @ts-expect-error test beforeLoad
        IndexRoute.options.beforeLoad?.();
      }).toThrow();

      try {
        // @ts-expect-error test beforeLoad
        IndexRoute.options.beforeLoad?.();
      } catch (err: any) {
        expect(err.options?.to).toBe("/dashboard");
      }
    });

    it("allows unauthenticated visitor to see landing page", () => {
      expect(() => {
        // @ts-expect-error test beforeLoad
        IndexRoute.options.beforeLoad?.();
      }).not.toThrow();
    });
  });

  describe("Login route (/login) redirect behavior", () => {
    it("redirects already logged-in user to /dashboard", () => {
      saveStoredUser({
        id: "candidate-1",
        name: "Test Candidate",
        role: "SDE",
        avatarText: "TC",
        email: "test@jssaten.ac.in",
      });

      try {
        // @ts-expect-error test beforeLoad
        LoginRoute.options.beforeLoad?.({ search: {} });
      } catch (err: any) {
        expect(err.options?.to).toBe("/dashboard");
      }
    });

    it("redirects already logged-in user to custom redirect target if provided", () => {
      saveStoredUser({
        id: "candidate-1",
        name: "Test Candidate",
        role: "SDE",
        avatarText: "TC",
        email: "test@jssaten.ac.in",
      });

      try {
        // @ts-expect-error test beforeLoad
        LoginRoute.options.beforeLoad?.({ search: { redirect: "/talent-check" } });
      } catch (err: any) {
        expect(err.options?.to).toBe("/talent-check");
      }
    });
  });

  describe("Protected routes require authentication", () => {
    const protectedRoutes = [
      { name: "dashboard", route: DashboardRoute, path: "/dashboard" },
      { name: "talent-check", route: TalentCheckRoute, path: "/talent-check" },
      { name: "resume", route: ResumeRoute, path: "/resume" },
      { name: "skill-match", route: SkillMatchRoute, path: "/skill-match" },
      { name: "jd", route: JdRoute, path: "/jd" },
      { name: "flow", route: FlowRoute, path: "/flow" },
      { name: "profile", route: ProfileRoute, path: "/profile" },
      { name: "companies", route: CompaniesRoute, path: "/companies" },
      { name: "company", route: CompanyRoute, path: "/company" },
    ];

    it.each(protectedRoutes)("redirects unauthenticated access on $name to /login", ({ route, path }) => {
      try {
        // @ts-expect-error test beforeLoad
        route.options.beforeLoad?.({ location: { href: path } });
        expect.unreachable("should have thrown redirect");
      } catch (err: any) {
        expect(err.options?.to).toBe("/login");
        expect(err.options?.search).toEqual({ redirect: path });
      }
    });

    it.each(protectedRoutes)("allows access on $name when candidate is signed in", ({ route, path }) => {
      saveStoredUser({
        id: "candidate-1",
        name: "Test Candidate",
        role: "SDE",
        avatarText: "TC",
        email: "test@jssaten.ac.in",
      });

      expect(() => {
        // @ts-expect-error test beforeLoad
        route.options.beforeLoad?.({ location: { href: path } });
      }).not.toThrow();
    });
  });
});
