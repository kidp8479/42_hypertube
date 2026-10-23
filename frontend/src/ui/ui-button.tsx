import type { ButtonHTMLAttributes } from 'react';
import styles from './ui-button.module.css';

/** Props of `Button`: every native button attribute plus the look. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `solid` is the one main action of a screen, `outline` is any other. */
  variant?: 'solid' | 'outline';
}

/**
 * The app's button. `type` defaults to `button`, not the HTML default
 * `submit`, so a button dropped inside a form never submits it by accident.
 */
export function Button({
  variant = 'outline',
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(' ');
  return <button type={type} className={classes} {...rest} />;
}
