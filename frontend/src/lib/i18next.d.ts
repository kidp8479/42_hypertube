// Types i18next against the English trees (the French ones are typed against
// them too), so `t('a.key')` with a key no namespace holds is a compile error
// instead of a raw key on screen and a console warning. Keep `defaultNS` and
// `fallbackNS` in step with the `init` options in `i18n.ts`.
import 'i18next';
import type { apiKeysEn } from '../features/api-keys/api-keys-locale-en';
import type { commonEn } from '../app/common-locale-en';
import type { authEn } from '../features/auth/auth-locale-en';
import type { usersEn } from '../features/users/users-locale-en';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'auth';
    fallbackNS: 'common';
    resources: {
      apiKeys: typeof apiKeysEn;
      auth: typeof authEn;
      common: typeof commonEn;
      users: typeof usersEn;
    };
  }
}
