import { AxiosError, AxiosHeaders } from "axios";
import { apiClient, toErrorMessage } from "@/services/apiClient";

const axiosError = (data: unknown, message = "Request failed with status code 500") =>
  new AxiosError(message, "ERR_BAD_RESPONSE", undefined, undefined, {
    data,
    status: 500,
    statusText: "",
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe("apiClient", () => {
  it("talks to the backend under /api", () => {
    expect(apiClient.defaults.baseURL).toBe("/api");
  });
});

describe("toErrorMessage", () => {
  it("prefers the backend's { error } body", () => {
    expect(toErrorMessage(axiosError({ error: "Company not found" }), "fallback")).toBe(
      "Company not found",
    );
  });

  it("uses the Axios message when the body has no error", () => {
    expect(toErrorMessage(axiosError(null, "Network Error"), "fallback")).toBe("Network Error");
  });

  it("uses Error.message for plain errors", () => {
    expect(toErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("falls back for anything else", () => {
    expect(toErrorMessage("weird", "fallback")).toBe("fallback");
  });
});
