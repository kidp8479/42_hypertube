// Refuses a password that is easy to guess: common passwords, dictionary
// words in French or English, keyboard walks, the user's own names.
import {
  Injectable,
  OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommon from '@zxcvbn-ts/language-common';
import * as zxcvbnEn from '@zxcvbn-ts/language-en';
import * as zxcvbnFr from '@zxcvbn-ts/language-fr';
import { readFileSync } from 'node:fs';

/**
 * zxcvbn's score, 0 to 4. 3 means about 10^8 guesses or more: out of reach
 * of an online attack, and slow to crack offline behind argon2id (ADR-0017).
 */
export const MIN_PASSWORD_SCORE = 3;

/** The message of a refused password: no hint of the rule beyond this. */
export const WEAK_PASSWORD_MESSAGE = 'password is too easy to guess';

/** What a password is checked against beside the dictionaries: the account's own data. */
export interface PasswordOwner {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
}

/**
 * The full French lexicon (336k words, inflections included) with an
 * accent-free copy of each word: zxcvbn's own French list only holds the
 * most frequent words, so a long one ("anticonstitutionnellement") or one
 * typed without accents ("demenagement") would pass. Read from the JSON file
 * rather than imported, since the package is a bare JSON `main`.
 */
function frenchLexicon(): string[] {
  const words = JSON.parse(
    readFileSync(require.resolve('an-array-of-french-words'), 'utf8'),
  ) as string[];
  const unaccented = words.map((word) =>
    word.normalize('NFD').replace(/\p{M}/gu, ''),
  );
  return [...new Set([...words, ...unaccented])];
}

/**
 * The password strength rule (marking sheet: "any current French word should
 * not be accepted"), on registration and on a password change. Never on
 * login: an existing password is checked by its hash only. The dictionaries
 * (about 50 MB once ranked) are built once, when the module starts, not when
 * this file is imported.
 */
@Injectable()
export class PasswordStrengthService implements OnModuleInit {
  private zxcvbn: ZxcvbnFactory | null = null;

  onModuleInit(): void {
    this.zxcvbn = new ZxcvbnFactory({
      dictionary: {
        ...zxcvbnCommon.dictionary,
        ...zxcvbnFr.dictionary,
        ...zxcvbnEn.dictionary,
        frenchLexicon: frenchLexicon(),
      },
      graphs: zxcvbnCommon.adjacencyGraphs,
      translations: zxcvbnEn.translations,
    });
  }

  /**
   * @throws {UnprocessableEntityException} 422 when `password` scores under
   * {@link MIN_PASSWORD_SCORE}. A status of its own, apart from the 400 of a
   * malformed body, so a client can say what is wrong without reading the
   * message.
   */
  assertStrong(password: string, owner: PasswordOwner): void {
    if (!this.zxcvbn) {
      throw new Error('PasswordStrengthService used before onModuleInit');
    }
    const { score } = this.zxcvbn.check(password, [
      owner.email,
      owner.email.split('@')[0],
      owner.username,
      owner.firstName,
      owner.lastName,
    ]);
    if (score < MIN_PASSWORD_SCORE) {
      throw new UnprocessableEntityException(WEAK_PASSWORD_MESSAGE);
    }
  }
}
