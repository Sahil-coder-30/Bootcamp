import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";

vi.mock("@/features/auth/service/auth.api", () => ({
  getAuthConfigAPI: vi.fn(),
  googleLoginAPI: vi.fn(),
  getMeAPI: vi.fn(),
  updateMeAPI: vi.fn(),
  logoutAPI: vi.fn(),
}));

import * as authApi from "@/features/auth/service/auth.api";
import { apiClient, setSessionLostHandler } from "@/services/apiClient";
import { AUTH_STORAGE_KEY, readSession, writeSession } from "@/lib/authStorage";
import { useAuth, useAuthBootstrap } from "@/features/auth/Hooks/auth.hooks";
import ProfilePage from "@/features/auth/components/ProfilePage";
import { safeRedirect } from "@/lib/safeRedirect";
import { makeStore, renderPage, withStore } from "./utils";

type Reply = [number, unknown];
const respond =
  (handler: (cfg: InternalAxiosRequestConfig) => Reply): AxiosAdapter =>
  async (cfg) => {
    const [status, data] = handler(cfg);
    const response = { data, status, statusText: "", headers: {}, config: cfg };
    if (status >= 400)
      throw new AxiosError(`status ${status}`, "ERR_BAD_REQUEST", cfg, undefined, response);
    return response;
  };

const user = {
  id: "u1",
  email: "a@b.c",
  name: "Alice",
  picture: null,
  role: "student" as const,
  phone: null,
  college: null,
  branch: null,
  graduationYear: null,
  resumeId: "resume-123",
  candidateProfileId: null,
};

const originalAdapters = {
  client: apiClient.defaults.adapter as AxiosAdapter,
  bare: axios.defaults.adapter as AxiosAdapter,
};
afterEach(() => {
  apiClient.defaults.adapter = originalAdapters.client;
  axios.defaults.adapter = originalAdapters.bare;
  window.localStorage.clear();
  setSessionLostHandler(() => {});
  vi.resetAllMocks();
});

describe("session storage", () => {
  it("round-trips and ignores garbage", () => {
    expect(readSession()).toBeNull();
    writeSession({ accessToken: "a", refreshToken: "r" });
    expect(readSession()).toEqual({ accessToken: "a", refreshToken: "r" });
    window.localStorage.setItem(AUTH_STORAGE_KEY, "{not json");
    expect(readSession()).toBeNull();
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: "a" }));
    expect(readSession()).toBeNull();
  });
});

describe("apiClient auth", () => {
  it("sends the bearer token", async () => {
    writeSession({ accessToken: "tok", refreshToken: "ref" });
    apiClient.defaults.adapter = respond((cfg) => [
      200,
      { auth: cfg.headers.get("Authorization") },
    ]);
    expect((await apiClient.get("/x")).data.auth).toBe("Bearer tok");
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    writeSession({ accessToken: "old", refreshToken: "ref" });
    let calls = 0;
    apiClient.defaults.adapter = respond((cfg) => {
      calls += 1;
      return cfg.headers.get("Authorization") === "Bearer new"
        ? [200, { ok: true }]
        : [401, { error: "expired" }];
    });
    axios.defaults.adapter = respond(() => [200, { accessToken: "new", refreshToken: "ref2" }]);

    expect((await apiClient.get("/data")).data).toEqual({ ok: true });
    expect(calls).toBe(2);
    expect(readSession()).toEqual({ accessToken: "new", refreshToken: "ref2" });
  });

  it("shares one refresh between parallel 401s", async () => {
    writeSession({ accessToken: "old", refreshToken: "ref" });
    apiClient.defaults.adapter = respond((cfg) =>
      cfg.headers.get("Authorization") === "Bearer new" ? [200, {}] : [401, {}],
    );
    let refreshes = 0;
    axios.defaults.adapter = respond(() => {
      refreshes += 1;
      return [200, { accessToken: "new", refreshToken: "ref2" }];
    });
    await Promise.all([apiClient.get("/a"), apiClient.get("/b"), apiClient.get("/c")]);
    expect(refreshes).toBe(1);
  });

  it("drops the session when the refresh fails", async () => {
    writeSession({ accessToken: "old", refreshToken: "ref" });
    const lost = vi.fn();
    setSessionLostHandler(lost);
    apiClient.defaults.adapter = respond(() => [401, { error: "expired" }]);
    axios.defaults.adapter = respond(() => [401, { error: "revoked" }]);

    await expect(apiClient.get("/data")).rejects.toThrow();
    expect(readSession()).toBeNull();
    expect(lost).toHaveBeenCalledOnce();
  });

  it("does not try to refresh without a session", async () => {
    apiClient.defaults.adapter = respond(() => [401, { error: "nope" }]);
    await expect(apiClient.get("/data")).rejects.toThrow();
  });
});

describe("useAuth", () => {
  it("signs in with a Google credential and stores the tokens", async () => {
    vi.mocked(authApi.googleLoginAPI).mockResolvedValue({
      accessToken: "a",
      refreshToken: "r",
      expiresIn: 900,
      user,
    });
    const store = makeStore();
    const { result } = renderHook(() => useAuth(), { wrapper: withStore(store) });
    let ok = false;
    await act(async () => {
      ok = await result.current.signInWithGoogle("cred-123456");
    });
    expect(ok).toBe(true);
    expect(result.current.user?.email).toBe("a@b.c");
    expect(readSession()).toEqual({ accessToken: "a", refreshToken: "r" });
  });

  it("surfaces a sign-in error", async () => {
    vi.mocked(authApi.googleLoginAPI).mockRejectedValue(
      new Error("Sign-in is limited to: jssaten.ac.in"),
    );
    const { result } = renderHook(() => useAuth(), { wrapper: withStore(makeStore()) });
    await act(async () => {
      await result.current.signInWithGoogle("cred-123456");
    });
    expect(result.current.user).toBeNull();
    expect(result.current.error).toMatch(/limited to/);
  });

  it("signs out and revokes the refresh token", async () => {
    writeSession({ accessToken: "a", refreshToken: "r" });
    vi.mocked(authApi.getMeAPI).mockResolvedValue(user);
    vi.mocked(authApi.logoutAPI).mockResolvedValue();
    const store = makeStore();
    const { result } = renderHook(() => ({ auth: useAuth(), boot: useAuthBootstrap() }), {
      wrapper: withStore(store),
    });
    await waitFor(() => expect(result.current.auth.user?.name).toBe("Alice"));
    await act(async () => {
      await result.current.auth.signOut();
    });
    expect(result.current.auth.user).toBeNull();
    expect(readSession()).toBeNull();
    expect(authApi.logoutAPI).toHaveBeenCalledWith("r");
  });

  it("bootstrap without a session marks the store ready and anonymous", async () => {
    const store = makeStore();
    renderHook(() => useAuthBootstrap(), { wrapper: withStore(store) });
    await waitFor(() => expect(store.getState().auth.ready).toBe(true));
    expect(store.getState().auth.user).toBeNull();
  });

  it("bootstrap with a dead session ends anonymous", async () => {
    writeSession({ accessToken: "a", refreshToken: "r" });
    vi.mocked(authApi.getMeAPI).mockRejectedValue(new Error("bad"));
    const store = makeStore();
    renderHook(() => useAuthBootstrap(), { wrapper: withStore(store) });
    await waitFor(() => expect(store.getState().auth.ready).toBe(true));
    expect(store.getState().auth.user).toBeNull();
  });
});

describe("ProfilePage", () => {
  it("shows the linked resume id and saves edits", async () => {
    vi.mocked(authApi.updateMeAPI).mockImplementation(
      async (patch) => ({ ...user, ...patch }) as typeof user,
    );
    const store = makeStore();
    const { setAuthUser } = await import("@/features/auth/slice/auth.slice");
    store.dispatch(setAuthUser(user));
    renderPage(ProfilePage, "/", store);

    expect(await screen.findByTestId("resume-id")).toHaveTextContent("resume-123");
    const branch = screen.getByLabelText("Branch");
    await userEvent.type(branch, "CSE");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(store.getState().auth.user?.branch).toBe("CSE");
  });

  it("asks anonymous visitors to sign in", async () => {
    const store = makeStore();
    const { setAuthReady } = await import("@/features/auth/slice/auth.slice");
    store.dispatch(setAuthReady());
    renderPage(ProfilePage, "/", store);
    expect(await screen.findByText(/signed out/i)).toBeInTheDocument();
  });
});

describe("safeRedirect", () => {
  it.each([
    ["/talent-check", "/talent-check"],
    ["//evil.com", "/"],
    ["https://evil.com", "/"],
    [undefined, "/"],
  ])("%s -> %s", (input, out) => {
    expect(safeRedirect(input)).toBe(out);
  });
});
