// Shared form field: label, input, hint and error wired together for
// assistive technology, so no page rebuilds that by hand.
import { useId, type InputHTMLAttributes } from 'react';

/** Props of `Field`: every native input attribute plus its texts. */
export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Help shown under the input while it is valid. */
  hint?: string;
  /** Replaces the hint and marks the input invalid. */
  error?: string;
  /** Marks the input invalid when the message lives elsewhere (a form-level alert). */
  invalid?: boolean;
}

/**
 * A labelled text input with its hint and error message. The label, the hint
 * and the error are wired to the input (`for`, `aria-describedby`,
 * `aria-invalid`), so a screen reader announces them with the field.
 */
export function Field({
  label,
  hint,
  error,
  invalid,
  id,
  'aria-describedby': callerDescribedBy,
  ...input
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error || hint;
  // The caller's own description (rules, format) comes first, then ours.
  const describedBy =
    [callerDescribedBy, message ? messageId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className="grid content-start gap-2">
      <label
        htmlFor={inputId}
        className="font-mono text-xs leading-label font-medium tracking-caps text-muted uppercase"
      >
        {label}
      </label>
      <input
        {...input}
        id={inputId}
        className="w-full border border-edge bg-transparent p-3 focus:border-ink aria-invalid:border-alert"
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={describedBy}
      />
      {error && (
        <span
          id={messageId}
          className="flex items-start gap-2 text-sm text-alert"
        >
          <svg
            viewBox="0 0 12 12"
            aria-hidden="true"
            className="mt-1 size-3 flex-none fill-none stroke-current stroke-[1.2px]"
          >
            <circle cx="6" cy="6" r="5" />
            <path d="M6 3.2v3.4M6 8.4v.2" />
          </svg>
          <span>{error}</span>
        </span>
      )}
      {!error && hint && (
        <span
          id={messageId}
          className="font-mono text-xs leading-label text-muted"
        >
          {hint}
        </span>
      )}
    </div>
  );
}
