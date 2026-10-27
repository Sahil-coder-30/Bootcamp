// Test helpers: a fresh Redux store per test and a tiny in-memory router, so pages render
// without the app's root head tags (jsdom never loads the stylesheets React waits on).
import type { ComponentType, ReactNode } from "react";
import type { RouteComponent } from "@tanstack/react-router";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

import companiesReducer from "@/features/companies/slice/companies.slice";
import intelligenceReducer from "@/features/intelligence/slice/intelligence.slice";
import skillsReducer from "@/features/skills/slice/skills.slice";
import type { CompanyProfile, CompanySummary } from "@/lib/companyData";

export const makeStore = () =>
  configureStore({
    reducer: {
      companies: companiesReducer,
      intelligence: intelligenceReducer,
      skills: skillsReducer,
    },
  });

export type TestStore = ReturnType<typeof makeStore>;

export function withStore(store: TestStore) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

const APP_PATHS = ["/", "/company/intelligence", "/company/skills"];

/** Renders `Page` at `path`; every other app path renders a "at <path>" marker. */
export function renderPage(Page: RouteComponent, path: string, store: TestStore = makeStore()) {
  const root = createRootRoute({ component: Outlet });
  const routes = APP_PATHS.map((p) =>
    createRoute({
      getParentRoute: () => root,
      path: p,
      component: p === path ? Page : () => <div>at {p}</div>,
    }),
  );
  const router = createRouter({
    routeTree: root.addChildren(routes),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  // The test router has its own route tree, not the app's registered one.
  const AnyRouterProvider = RouterProvider as unknown as ComponentType<{ router: unknown }>;
  const utils = render(
    <Provider store={store}>
      <AnyRouterProvider router={router} />
    </Provider>,
  );
  return { ...utils, router, store };
}

export const summary = (over: Partial<CompanySummary> = {}): CompanySummary => ({
  id: 1,
  name: "Acme Corp",
  shortName: "Acme",
  logoUrl: "",
  category: "Consulting",
  companyType: "Dream",
  incorporationYear: "1999",
  employeeSize: "1000",
  headquarters: "Delhi",
  operatingCountries: "India",
  officeLocations: "Delhi",
  yoyGrowthRate: "10%",
  websiteUrl: "https://acme.test",
  ...over,
});

export const profile = (over: Record<string, string> = {}): CompanyProfile => ({
  name: "Acme Corp",
  short_name: "Acme",
  category: "Consulting",
  logo_url: "",
  website_url: "https://acme.test",
  linkedin_url: "",
  ...over,
});
