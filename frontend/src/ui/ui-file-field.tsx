// Shared file picker: the native input stays for keyboard and screen readers,
// but every word the user sees is the app's, in the app's language.
import { useId, useState, type ChangeEvent } from 'react';
import { buttonClasses } from './ui-button-classes';
import { FIELD_LABEL, FieldMessage } from './ui-field';

/** Props of `FileField`. */
export interface FileFieldProps {
  label: string;
  /** The text of the button that opens the file dialog. */
  chooseLabel: string;
  /** Shown beside the button while no file is picked. */
  emptyLabel: string;
  accept?: string;
  hint?: string;
  /** Replaces the hint and marks the input invalid. */
  error?: string;
  onFile: (file: File | null) => void;
}

/**
 * A labelled file input. The browser's own control prints "Choose File" in
 * the browser's language, whatever the app's; here the native input is
 * visually hidden and a second `<label>` styled as a button opens it, next
 * to the picked file's name. The input keeps the focus, so the button shows
 * the focus ring through `peer-focus-visible`.
 */
export function FileField({
  label,
  chooseLabel,
  emptyLabel,
  accept,
  hint,
  error,
  onFile,
}: FileFieldProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const [fileName, setFileName] = useState<string | null>(null);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFileName(file?.name ?? null);
    onFile(file);
  }

  return (
    <div className="grid content-start gap-2">
      <label htmlFor={inputId} className={FIELD_LABEL}>
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={pick}
          className="peer sr-only"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
        />
        <label
          htmlFor={inputId}
          className={`${buttonClasses('outline')} peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink peer-aria-invalid:border-alert`}
        >
          {chooseLabel}
        </label>
        <span className="min-w-0 text-sm wrap-anywhere text-muted">
          {fileName ?? emptyLabel}
        </span>
      </div>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}
