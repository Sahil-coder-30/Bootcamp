import { useCallback, useState } from "react";
import { toErrorMessage } from "@/services/apiClient";
import { uploadCvAPI, type UploadedDocument } from "../service/profile.api";

export const MAX_CV_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** `.pdf` or `.docx`, at most 5 MB. Some browsers report an empty MIME type for .docx, so an extension match is enough then. */
export function validateCv(file: File): string | null {
  const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  if (ext !== "pdf" && ext !== "docx") return "Upload a PDF or Word (.docx) file";
  if (file.type && !ALLOWED_MIME.has(file.type)) return "That file type is not supported";
  if (file.size > MAX_CV_BYTES) return "The CV must be 5 MB or smaller";
  if (file.size === 0) return "That file is empty";
  return null;
}

/** Where the backend stores it when `POST /api/documents` does not say (`resume/<sha256>.<ext>`). */
export const cvPathFor = (doc: UploadedDocument, file: File): string => {
  if (doc.storage_path) return doc.storage_path;
  const ext = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase() ?? "pdf";
  return `resume/${doc.sha256}.${ext}`;
};

export function useCvUpload() {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    const problem = validateCv(file);
    if (problem) {
      setError(problem);
      return null;
    }
    setError(null);
    setProgress(0);
    setUploading(true);
    try {
      const doc = await uploadCvAPI(file, setProgress);
      const path = cvPathFor(doc, file);
      setCvFile(path);
      setDocumentId(doc.document_id);
      return { documentId: doc.document_id, cvFile: path };
    } catch (err) {
      setError(toErrorMessage(err, "Upload failed. Try again."));
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, progress, uploading, error, cvFile, documentId };
}
