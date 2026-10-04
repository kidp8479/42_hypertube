// Public /register route: a CreateUserDto-shaped form wired to `registerRequest`.
// No auto-login on success - redirects to /login instead with an "account
// created" notice, so a fresh account always goes through the real login flow
// once. Maps the backend 409 (duplicate email/username) to a generic conflict
// message - like /login, never says which field clashed.
import { useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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
import styles from './auth-register-page.module.css';

const CONFLICT_ERROR = 'An account with this email or username already exists.';
const GENERIC_ERROR = 'Something went wrong. Please try again.';

/** One field's validation message, or nothing when the field is valid. */
function FieldError({
  field,
  error,
}: {
  field: RegisterField;
  error?: ValidationError;
}) {
  if (!error) {
    return null;
  }
  return (
    <p className={styles.fieldError}>{describeValidationError(field, error)}</p>
  );
}

export function RegisterPage() {
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
  const [formError, setFormError] = useState<string | null>(null);
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
      await registerRequest(values);
      navigate('/login', { replace: true, state: { justRegistered: true } });
    } catch (caught) {
      const isConflict = caught instanceof ApiError && caught.status === 409;
      setFormError(isConflict ? CONFLICT_ERROR : GENERIC_ERROR);
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1>Register</h1>

      <label className={styles.field}>
        Email
        <input
          type="email"
          value={values.email}
          onChange={(e) => handleChange('email', e.target.value)}
          autoComplete="email"
        />
      </label>
      <FieldError field="email" error={errors.email} />

      <label className={styles.field}>
        Username
        <input
          type="text"
          value={values.username}
          onChange={(e) => handleChange('username', e.target.value)}
          autoComplete="username"
        />
      </label>
      <FieldError field="username" error={errors.username} />

      <label className={styles.field}>
        First name
        <input
          type="text"
          value={values.firstName}
          onChange={(e) => handleChange('firstName', e.target.value)}
          autoComplete="given-name"
        />
      </label>
      <FieldError field="firstName" error={errors.firstName} />

      <label className={styles.field}>
        Last name
        <input
          type="text"
          value={values.lastName}
          onChange={(e) => handleChange('lastName', e.target.value)}
          autoComplete="family-name"
        />
      </label>
      <FieldError field="lastName" error={errors.lastName} />

      <label className={styles.field}>
        Password
        <input
          type="password"
          value={values.password}
          onChange={(e) => handleChange('password', e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <FieldError field="password" error={errors.password} />

      <label className={styles.field}>
        Confirm password
        <input
          type="password"
          value={values.confirmPassword}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <FieldError field="confirmPassword" error={errors.confirmPassword} />

      {formError && (
        <p className={styles.error} role="alert">
          {formError}
        </p>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Registering...' : 'Register'}
      </button>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
