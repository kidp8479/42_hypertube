// Shared form field: label, input, hint and error wired together for
// assistive technology, so no page rebuilds that by hand.
import { useId, type InputHTMLAttributes } from 'react';
import styles from './ui-field.module.css';

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
  ...input
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;
  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        {...input}
        id={inputId}
        className={styles.input}
        aria-invalid={error || invalid ? true : undefined}
        aria-describedby={message ? messageId : undefined}
      />
      {error && (
        <span id={messageId} className={styles.error}>
          <svg viewBox="0 0 12 12" aria-hidden="true" className={styles.icon}>
            <circle cx="6" cy="6" r="5" />
            <path d="M6 3.2v3.4M6 8.4v.2" />
          </svg>
          <span>{error}</span>
        </span>
      )}
      {!error && hint && (
        <span id={messageId} className={styles.hint}>
          {hint}
        </span>
      )}
    </div>
  );
}
