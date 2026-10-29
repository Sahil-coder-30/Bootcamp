/** Only same-site paths are allowed as a post-login target (no open redirect). */
export function safeRedirect(target: string | undefined): string {
  return target && target.startsWith("/") && !target.startsWith("//") ? target : "/";
}
