// Public /register route: a CreateUserDto-shaped form wired to `registerRequest`.
// No auto-login on success - redirects to /login instead with an "account
// created" notice, so a fresh account always goes through the real login flow
// once. Maps the backend 409 (duplicate email/username) to a generic conflict
// message - like /login, never says which field clashed.
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccountForm } from './auth-account-form';
import { useAuth } from './auth-context';
import { registerRequest } from './auth-actions';
import {
  describeValidationError,
  validateRegister,
  type RegisterField,
  type RegisterValues,
  type ValidationError,
} from './auth-validation';
import { DEFAULT_LANGUAGE } from '../../lib/languages';
import { isSupportedLanguage } from '../../lib/language';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { Field } from '../../ui/ui-field';
import { OAuthButtons } from './auth-oauth-buttons';
import { AUTH_COLUMN, AUTH_LINKS } from './auth-form-classes';

const FORM = `${AUTH_COLUMN} max-w-md`;
const EMPTY_VALUES: RegisterValues = {
  email: '',
  password: '',
  confirmPassword: '',
  username: '',
  lastName: '',
  firstName: '',
};
// Pairs share a row when there is room, stack on a phone.
const ROW = 'grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4';

/** A labelled input plus its validation message, for one register field. */
function RegisterInput({
  field,
  type,
  autoComplete,
  value,
  error,
  hint,
  placeholder,
  onChange,
}: {
  field: RegisterField;
  type: 'email' | 'text' | 'password';
  autoComplete: string;
  value: string;
  error?: ValidationError;
  hint?: string;
  placeholder?: string;
  onChange: (field: RegisterField, value: string) => void;
}) {
  const { t } = useTranslation('auth');
  return (
    <Field
      label={t(`fields.${field}`)}
      type={type}
      value={value}
      onChange={(e) => onChange(field, e.target.value)}
      autoComplete={autoComplete}
      hint={hint}
      placeholder={placeholder}
      error={error && describeValidationError(field, error, t)}
    />
  );
}

/** The `/register` page: the sign-up form, validated client-side before submit. */
export function RegisterPage() {
  const { t, i18n } = useTranslation('auth');
  const { state } = useAuth();
  const navigate = useNavigate();

  const form = useAccountForm({
    initialValues: EMPTY_VALUES,
    validate: validateRegister,
    send: async (values: RegisterValues) => {
      await registerRequest(
        values,
        isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE,
      );
      navigate('/login', { replace: true, state: { justRegistered: true } });
    },
    refusals: { 409: 'register.conflict' },
  });

  // Someone who is already logged in has no business on /register either.
  if (state.status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <form className={FORM} onSubmit={form.submit} noValidate>
        <h1>{t('register.title')}</h1>

        <div className={ROW}>
          <RegisterInput
            field="firstName"
            type="text"
            autoComplete="given-name"
            value={form.values.firstName}
            error={form.errors.firstName}
            onChange={form.setValue}
          />
          <RegisterInput
            field="lastName"
            type="text"
            autoComplete="family-name"
            value={form.values.lastName}
            error={form.errors.lastName}
            onChange={form.setValue}
          />
        </div>
        <RegisterInput
          field="username"
          type="text"
          autoComplete="username"
          value={form.values.username}
          error={form.errors.username}
          hint={t('hints.username')}
          onChange={form.setValue}
        />
        <RegisterInput
          field="email"
          type="email"
          autoComplete="email"
          value={form.values.email}
          error={form.errors.email}
          placeholder={t('placeholders.email')}
          onChange={form.setValue}
        />
        <div className={ROW}>
          <RegisterInput
            field="password"
            type="password"
            autoComplete="new-password"
            value={form.values.password}
            error={form.errors.password}
            hint={t('hints.password')}
            onChange={form.setValue}
          />
          <RegisterInput
            field="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.values.confirmPassword}
            error={form.errors.confirmPassword}
            onChange={form.setValue}
          />
        </div>
        {form.outcome && (
          <Alert tone={form.outcome.tone}>{t(form.outcome.key)}</Alert>
        )}

        <Button type="submit" variant="solid" disabled={form.isSubmitting}>
          {form.isSubmitting ? t('register.submitting') : t('register.submit')}
        </Button>

        <OAuthButtons />

        <p className={`m-0 ${AUTH_LINKS}`}>
          {t('register.hasAccount')}{' '}
          <Link to="/login">{t('register.logIn')}</Link>
        </p>
      </form>
    </>
  );
}
