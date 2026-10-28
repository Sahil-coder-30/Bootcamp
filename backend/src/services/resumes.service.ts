import { callAgent } from "./agent.service.js";

export interface ParseResumeParams {
  content_b64?: string;
  file_name?: string;
  mime?: string;
  sample_key?: string;
}

export async function parseResume(params: ParseResumeParams): Promise<any> {
  if (params.sample_key) {
    return callAgent(`extract/resume/sample/${encodeURIComponent(params.sample_key)}`);
  }
  return callAgent("extract/resume/json", {
    content_b64: params.content_b64,
    file_name: params.file_name || "resume.pdf",
    mime: params.mime || "application/pdf",
  });
}

export async function getSampleResume(candidateKey: string): Promise<any> {
  return callAgent(`extract/resume/sample/${encodeURIComponent(candidateKey)}`);
}

export async function inferLevels(extraction: any): Promise<any> {
  return callAgent("levels/infer", { extraction });
}
