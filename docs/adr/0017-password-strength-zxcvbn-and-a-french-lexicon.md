# Password strength: zxcvbn plus a full French lexicon, checked by the server

**Date:** 2026-10-31 · **Status:** accepted

The marking sheet asks for more than hashing: "any current French word
should not be accepted" as a password. A new password is checked on
registration (`POST /users`) and on a password change (`PATCH /users/:id`),
and will be on the reset (HYP-34). Never on login: an existing password is
only compared with its hash.

- `PasswordStrengthService` (`backend/src/users/`) scores the password with
  [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn): common passwords, the
  common, English and French dictionaries, keyboard walks (azerty included),
  dates, repeats, l33t. The account's email (and its local part), username
  and names count as dictionary words too.
- A score under **3 of 4** is refused with **422** and a generic message.
- On top of zxcvbn's own lists: the full French lexicon of
  `an-array-of-french-words` (336k words, inflections included, MIT), plus an
  accent-free copy of every word.

## Why

- **zxcvbn, not a blocklist alone.** A list catches `bonjour`, not
  `Bonjour2024`, `b0nj0ur` or `azertyuiop`. zxcvbn rates how guessable the
  whole password is, which is what "too weak" means, and its French
  dictionary and azerty graph fit an evaluator in Paris.
- **zxcvbn-ts, not the original zxcvbn.** The original is unmaintained since
  2017 and has English dictionaries only.
- **Score 3.** About 10^8 guesses: out of reach online (login is
  throttled), and slow offline behind argon2id (ADR-0001). Score 4 would
  refuse passphrases a person remembers (`correct horse` scores 3).
- **The full lexicon.** zxcvbn's French list only has the most frequent
  words: `anticonstitutionnellement` scored 4, and `demenagement` typed
  without accents 3. With the lexicon and its accent-free copy, every French
  word tried scores 1 or less.
- **The server decides, the page only reports.** One rule for every way in
  (the SPA, Swagger, a script with an API key, the reset later). A
  class-validator constraint, as HYP-37 first planned, would run before the
  DTO's length check stops a huge input, and on `PATCH` it would not see the
  saved names. The service runs after both.
- **422, apart from the 400 of a malformed body.** The SPA branches on the
  status only (`ApiError` keeps no body): with a 400, `/register` could only
  show the generic error, and the profile form already reads its 400 as "no
  password yet". A 422 gets its own message on both.
- **No meter in the browser.** zxcvbn with the French and common lists is
  about 0.5 MB gzipped for the page, and the lexicon would still only be on
  the server. The refusal is shown after submit, with advice on what works.

## Consequences

- **The dictionaries take about 50 MB of heap** and 0.6 s at startup
  (`onModuleInit`, not at import, so specs that mock the service do not pay
  it). A check takes about 10 ms.
- **The refusal is a network line in the console**, like the 401 of a wrong
  login and the 409 of a taken email (`known-limitations.md`): the browser's
  own log of a deliberate 4xx, not a script error.
- **Accounts created before this rule keep their password** until it
  changes: nothing re-checks a stored hash.
- **The lexicon's origin is not documented upstream**; the package is MIT.
  It is data only, read from its JSON file.
