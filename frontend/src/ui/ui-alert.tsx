// Shared boxed message for form-level errors and confirmations.
import type { ReactNode } from 'react';

/** Props of `Alert`. */
export interface AlertProps {
  /** `error` is for a failure, `success` for a confirmation. */
  tone: 'error' | 'success';
  children: ReactNode;
}

// The tone colours the box edge and the badge, never the text.
const TONES: Record<AlertProps['tone'], { box: string; badge: string }> = {
  error: { box: 'border-alert', badge: 'border-alert text-alert' },
  success: { box: 'border-mint', badge: 'border-mint text-mint' },
};

/**
 * A boxed message. An error is announced at once (`role="alert"`), a success
 * politely (`role="status"`). The colour never carries the meaning alone: the
 * icon badge ("!" or a tick) says it too.
 */
export function Alert({ tone, children }: AlertProps) {
  return (
    <div
      className={`flex items-center gap-3 border px-3 py-2 text-sm ${TONES[tone].box}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span
        className={`inline-grid size-5 flex-none place-items-center rounded-round border font-mono text-xs leading-label font-medium ${TONES[tone].badge}`}
        aria-hidden="true"
      >
        {tone === 'error' ? '!' : '✓'}
      </span>
      <span>{children}</span>
    </div>
  );
}
