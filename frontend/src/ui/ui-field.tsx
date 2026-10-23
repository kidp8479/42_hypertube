import { useId, type InputHTMLAttributes } from 'react';
import styles from './ui-field.module.css';

/** Props of `Field`: every native input attribute plus its texts. */
export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Help shown under the input while it is valid. */
  hint?: string;
  /** Replaces the hint and marks the input invalid. */
  error?: string;
}

/**
 * A labelled text input with its hint and error message. The label, the hint
 * and the error are wired to the input (`for`, `aria-describedby`,
 * `aria-invalid`), so a screen reader announces them with the field.
 */
export function Field({ label, hint, error, id, ...input }: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;
  return (
    <div className={styles.field}>
      <label htmlFor={inputId}>{label}</label>
      <input
        {...input}
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
      />
      {message && (
        <span id={messageId} className={error ? styles.error : styles.hint}>
          {message}
        </span>
      )}
    </div>
  );
}
