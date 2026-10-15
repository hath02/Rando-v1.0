import bcrypt from 'bcryptjs';

// PHP password_hash() stores bcrypt hashes with a $2y$ prefix.
// bcryptjs expects $2b$, so normalize the prefix before comparing.
export async function verifyPassword(plainPassword, storedHash) {
  if (!storedHash) return false;

  const hash = storedHash.startsWith('$2y$')
    ? storedHash.replace(/^\$2y\$/, '$2b$')
    : storedHash;

  return bcrypt.compare(plainPassword, hash);
}

export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 12);
}
