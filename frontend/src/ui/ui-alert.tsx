import type { ReactNode } from 'react';
import styles from './ui-alert.module.css';

/** Props of `Alert`. */
export interface AlertProps {
  /** `error` is for a failure, `success` for a confirmation. */
  tone: 'error' | 'success';
  children: ReactNode;
}

/**
 * A boxed message. An error is announced at once (`role="alert"`), a success
 * politely (`role="status"`). The colour never carries the meaning alone: the
 * icon badge ("!" or a tick) says it too.
 */
export function Alert({ tone, children }: AlertProps) {
  return (
    <div
      className={`${styles.alert} ${styles[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className={styles.badge} aria-hidden="true">
        {tone === 'error' ? '!' : '✓'}
      </span>
      <span>{children}</span>
    </div>
  );
}
