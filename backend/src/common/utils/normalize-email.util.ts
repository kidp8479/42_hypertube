// Shared trim+lowercase rule for an email address, so every entry point
// (a form DTO via `@NormalizeEmail`, or a raw OAuth provider profile that
// never goes through the validation pipe) feeds the same value to lookups
// and the `email` unique constraint.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
