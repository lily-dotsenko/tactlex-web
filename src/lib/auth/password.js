import { Algorithm, hash, verify } from "@node-rs/argon2";

export const ARGON2ID_OPTIONS = Object.freeze({
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
});

export function hashPassword(password) {
  return hash(password, ARGON2ID_OPTIONS);
}

export async function verifyPassword(passwordHash, password) {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
