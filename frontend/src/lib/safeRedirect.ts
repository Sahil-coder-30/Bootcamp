/** Only same-site paths are allowed as a post-login target (no open redirect). Defaults to '/'. */
export function safeRedirect(target: string | undefined, fallback: string = "/"): string {
  return target && target.startsWith("/") && !target.startsWith("//") && target !== "/"
    ? target
    : fallback;
}
