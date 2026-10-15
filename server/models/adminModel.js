// Administrator accounts live in the admins table.

export async function findAdminByEmail(db, email) {
  const sql = `
    SELECT id, username, email, password, avatar, status
    FROM admins
    WHERE email = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [email]);
  return rows[0] ?? null;
}

// Safe admin details: never returns the password hash.
export async function findAdminById(db, id) {
  const sql = `
    SELECT id, username, email, avatar, status
    FROM admins
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [id]);
  return rows[0] ?? null;
}
