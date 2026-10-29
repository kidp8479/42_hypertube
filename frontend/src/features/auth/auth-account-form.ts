// The state and submit flow every account form shares (login, register, the
// two profile forms): values, field errors, the message under the form.
import { useState, type SyntheticEvent } from 'react';
import { ApiError } from '../../lib/api';
import type { ValidationError } from './auth-validation';

/**
 * The message under a form, as a translation key plus its alert tone. The
 * tone travels with the key, so renaming a key cannot flip its colour.
 */
export interface FormOutcome<K extends string> {
  key: K;
  tone: 'success' | 'error';
}

/** What a successful send hands back: the message, and the values to show next. */
export interface SendResult<V, K extends string> {
  outcome: FormOutcome<K>;
  values?: V;
}

/** Options of {@link useAccountForm}. */
export interface AccountFormOptions<
  F extends string,
  V extends Record<F, string>,
  K extends string,
> {
  initialValues: V | (() => V);
  /** Client-side rules; an empty object lets the form send. */
  validate?: (values: V) => Partial<Record<F, ValidationError>>;
  /**
   * Sends the form. Resolves to the message to show, or to nothing when the
   * page moves on (a redirect). A rejection becomes an error message.
   */
  send: (values: V) => Promise<SendResult<V, K> | void>;
  /** The message for each HTTP status the backend refuses with. */
  refusals?: Partial<Record<number, K>>;
}

const GENERIC_ERROR: FormOutcome<'errors.generic'> = {
  key: 'errors.generic',
  tone: 'error',
};

/**
 * Owns an account form's state and its submit: clear the last message,
 * validate, stop on a field error, send, then show what came back. A refusal
 * whose status is in `refusals` gets its message, anything else the generic
 * one.
 */
export function useAccountForm<
  F extends string,
  V extends Record<F, string>,
  K extends string,
>({
  initialValues,
  validate,
  send,
  refusals = {},
}: AccountFormOptions<F, V, K>) {
  const [values, setValues] = useState<V>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<F, ValidationError>>>({});
  const [outcome, setOutcome] = useState<FormOutcome<
    K | 'errors.generic'
  > | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setValue(field: F, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  async function submit(event: SyntheticEvent) {
    event.preventDefault();
    setOutcome(null);
    const validationErrors = validate?.(values) ?? {};
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await send(values);
      if (result) {
        if (result.values) setValues(result.values);
        setOutcome(result.outcome);
      }
    } catch (caught) {
      const key =
        caught instanceof ApiError ? refusals[caught.status] : undefined;
      setOutcome(key ? { key, tone: 'error' } : GENERIC_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  return { values, setValue, errors, outcome, isSubmitting, submit };
}
