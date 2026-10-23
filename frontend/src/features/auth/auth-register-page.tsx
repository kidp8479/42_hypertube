// Public /register route: a CreateUserDto-shaped form wired to `registerRequest`.
// No auto-login on success - redirects to /login instead with an "account
// created" notice, so a fresh account always goes through the real login flow
// once. Maps the backend 409 (duplicate email/username) to a generic conflict
// message - like /login, never says which field clashed.
import { useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../lib/api';
import { useAuth } from './auth-context';
import { registerRequest } from './auth-actions';
import {
  describeValidationError,
  validateRegister,
  type RegisterField,
  type RegisterValues,
  type RegisterErrors,
  type ValidationError,
} from './auth-validation';
import { DEFAULT_LANGUAGE } from '../../lib/languages';
import { isSupportedLanguage } from '../../lib/language';
import { Alert } from '../../ui/ui-alert';
import { Button } from '../../ui/ui-button';
import { Field } from '../../ui/ui-field';
import { OAuthButtons } from './auth-oauth-buttons';
import styles from './auth-register-page.module.css';

// The form-level error is stored as a translation key, not a sentence, so it
// is translated at render time and follows a language switch.
type FormError = 'register.conflict' | 'errors.generic';

/** A labelled input plus its validation message, for one register field. */
function RegisterInput({
  field,
  type,
  autoComplete,
  value,
  error,
  onChange,
}: {
  field: RegisterField;
  type: 'email' | 'text' | 'password';
  autoComplete: string;
  value: string;
  error?: ValidationError;
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
      error={error && describeValidationError(field, error, t)}
    />
  );
}

/** The `/register` page: the sign-up form, validated client-side before submit. */
export function RegisterPage() {
  const { t, i18n } = useTranslation('auth');
  const { state } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<RegisterValues>({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    lastName: '',
    firstName: '',
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Someone who is already logged in has no business on /register either.
  if (state.status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  function handleChange(field: keyof RegisterValues, value: string) {
    setValues((prevValues) => ({
      ...prevValues,
      [field]: value,
    }));
  }

  async function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    setFormError(null);

    const validationErrors = validateRegister(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await registerRequest(
        values,
        isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE,
      );
      navigate('/login', { replace: true, state: { justRegistered: true } });
    } catch (caught) {
      const isConflict = caught instanceof ApiError && caught.status === 409;
      setFormError(isConflict ? 'register.conflict' : 'errors.generic');
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1>{t('register.title')}</h1>

      <RegisterInput
        field="email"
        type="email"
        autoComplete="email"
        value={values.email}
        error={errors.email}
        onChange={handleChange}
      />
      <RegisterInput
        field="username"
        type="text"
        autoComplete="username"
        value={values.username}
        error={errors.username}
        onChange={handleChange}
      />
      <RegisterInput
        field="firstName"
        type="text"
        autoComplete="given-name"
        value={values.firstName}
        error={errors.firstName}
        onChange={handleChange}
      />
      <RegisterInput
        field="lastName"
        type="text"
        autoComplete="family-name"
        value={values.lastName}
        error={errors.lastName}
        onChange={handleChange}
      />
      <RegisterInput
        field="password"
        type="password"
        autoComplete="new-password"
        value={values.password}
        error={errors.password}
        onChange={handleChange}
      />
      <RegisterInput
        field="confirmPassword"
        type="password"
        autoComplete="new-password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={handleChange}
      />
      {formError && <Alert tone="error">{t(formError)}</Alert>}

      <Button type="submit" variant="solid" disabled={isSubmitting}>
        {isSubmitting ? t('register.submitting') : t('register.submit')}
      </Button>

      <OAuthButtons />

      <p>
        {t('register.hasAccount')}{' '}
        <Link to="/login">{t('register.logIn')}</Link>
      </p>
    </form>
  );
}
