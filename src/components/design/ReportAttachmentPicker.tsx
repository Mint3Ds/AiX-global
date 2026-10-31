"use client";

import { useId, useState } from "react";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
};
const ACCEPTED_TYPES = new Set(Object.values(MIME_BY_EXTENSION));
const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv";
const MAX_FILES = 5;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_TOTAL_SIZE = 6 * 1024 * 1024;

export function evidenceMediaType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return ACCEPTED_TYPES.has(file.type)
    ? file.type
    : MIME_BY_EXTENSION[extension] || file.type || "";
}

export function ReportAttachmentPicker({
  files,
  onChange,
  error,
  onError,
  label = "Add photos or files",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  error: string;
  onError: (error: string) => void;
  label?: string;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: File[]) => {
    const next = [...files, ...incoming];
    if (
      next.length > MAX_FILES ||
      next.some(
        (file) =>
          !ACCEPTED_TYPES.has(evidenceMediaType(file)) ||
          file.size > MAX_FILE_SIZE,
      ) ||
      next.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_SIZE
    ) {
      onError(
        "Choose up to five JPEG, PNG, WebP, PDF, TXT, or CSV files. Each can be 2 MB, with 6 MB total.",
      );
      return;
    }
    onError("");
    onChange(next);
  };

  return (
    <div className="report-evidence-picker">
      <label
        htmlFor={inputId}
        className={`report-evidence-drop ${dragging ? "is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          id={inputId}
          className="sr-only"
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(event) => {
            addFiles(Array.from(event.currentTarget.files || []));
            event.currentTarget.value = "";
          }}
        />
        <span className="report-evidence-plus" aria-hidden="true">+</span>
        <span className="report-evidence-copy">
          <strong>{label}</strong>
          <small>JPEG, PNG, WebP, PDF, TXT or CSV · 5 files · 2 MB each · 6 MB total</small>
        </span>
        <span className="report-evidence-browse">Browse</span>
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      {files.length > 0 && (
        <ul className="report-evidence-selected" aria-label="Selected evidence">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}-${index}`}>
              <span className="report-evidence-file-type">
                {evidenceMediaType(file).startsWith("image/")
                  ? "PHOTO"
                  : evidenceMediaType(file) === "application/pdf"
                    ? "PDF"
                    : evidenceMediaType(file) === "text/csv"
                      ? "CSV"
                      : "TXT"}
              </span>
              <span className="report-evidence-file-name">{file.name}</span>
              <small>{Math.max(1, Math.ceil(file.size / 1024))} KB</small>
              <button
                type="button"
                className="link"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
