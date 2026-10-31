// English strings of the `apiKeys` namespace (source of truth: `fr` must
// mirror these keys, see api-keys-locale-fr.ts).
export const apiKeysEn = {
  title: 'API keys',
  intro:
    'A key lets a script use the API as you. Send its client and secret to POST /api/oauth/token, then use the access_token it answers as a bearer token.',
  name: {
    label: 'Key name',
    hint: 'To tell your keys apart, 50 characters at most.',
    required: 'Name the key',
    tooLong: 'The name must be at most {{max}} characters long',
  },
  create: {
    submit: 'Create a key',
    submitting: 'Creating...',
    tooMany: 'You already have 5 keys: revoke one first.',
  },
  created: {
    title: 'Copy the secret now',
    warning:
      'It will not be shown again. Lost it? Revoke this key and create another.',
    client: 'Client',
    secret: 'Secret',
    copy: 'Copy the secret',
    copied: 'Secret copied.',
    copyFailed: 'Copy failed: select the secret and copy it by hand.',
    done: 'Done, I copied it',
  },
  list: {
    label: 'Your keys',
    empty: 'No API key yet.',
    createdOn: 'Created {{date}}',
    revoke: 'Revoke',
    revokeName: 'Revoke the key {{name}}',
    revoked: 'Key revoked.',
  },
};
