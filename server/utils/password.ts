import argon2 from 'argon2';

export async function encrypt(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

export async function verify(password: string, passwordHash: string): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}
