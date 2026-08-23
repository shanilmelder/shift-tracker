import { randomInt } from 'node:crypto';

/**
 * Characters a person can read off a screen and type on a phone without ambiguity: no 0/O,
 * no 1/l/I, no 5/S, no 8/B. A temp password is meant to be dictated over a counter or copied
 * out of an email, and every confusable pair turns into a failed sign-in the user reads as
 * "the password doesn't work".
 */
const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXYZabcdefghijkmnpqrtuvwxyz234679';

const GROUP_LENGTH = 4;
const GROUP_COUNT = 3;

/**
 * A single-use password for a brand-new account, or one a manager has reset.
 *
 * `randomInt` rather than `Math.random()`: this is a credential, and it is the only thing
 * standing in front of an account until its owner signs in. It is also rejected outright by
 * `Math.random()`'s predictability — a temp password that can be guessed from a previously
 * issued one would let anyone who was ever onboarded derive a colleague's.
 *
 * Rejection-free uniform selection comes from `randomInt`'s own range handling, so no modulo
 * bias is introduced here.
 *
 * 51^12 of entropy (about 68 bits), which is far more than enough for a credential expected to
 * live minutes to days, while staying short enough to read aloud.
 */
export function generateTempPassword(): string {
  const groups: string[] = [];
  for (let group = 0; group < GROUP_COUNT; group += 1) {
    let chars = '';
    for (let index = 0; index < GROUP_LENGTH; index += 1) {
      chars += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(chars);
  }
  // Dashed groups purely for legibility; Supabase stores the whole string as the password.
  return groups.join('-');
}
