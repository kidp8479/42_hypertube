// Shared button: the one place the button look (solid / outline) is defined.
import type { ButtonHTMLAttributes } from 'react';
import { buttonClasses, type ButtonVariant } from './ui-button-classes';

/** Props of `Button`: every native button attribute plus the look. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
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
  const classes = [buttonClasses(variant), className].filter(Boolean).join(' ');
  return <button type={type} className={classes} {...rest} />;
}
