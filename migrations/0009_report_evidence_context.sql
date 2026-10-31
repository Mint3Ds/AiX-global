ALTER TABLE task_report_attachments
  ADD COLUMN IF NOT EXISTS uploaded_by text NOT NULL DEFAULT 'staff';

ALTER TABLE task_report_attachments
  ADD COLUMN IF NOT EXISTS context text NOT NULL DEFAULT 'completion';
