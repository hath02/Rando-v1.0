// Customer accounts live in the clients table.

// Find a client by email for login and duplicate-email checks.
export async function findClientByEmail(db, email) {
  const sql = `
    SELECT id, username, email, password, phone, address, avatar, status
    FROM clients
    WHERE email = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [email]);
  return rows[0] ?? null;
}

// Create a client using an already-hashed password.
export async function createClient(
  db,
  username,
  email,
  hashedPassword,
  address
) {
  const sql = `
    INSERT INTO clients (username, email, password, address)
    VALUES (?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    username,
    email,
    hashedPassword,
    address,
  ]);

  return result.insertId;
}

// Safe account details: never returns the password hash.
export async function findClientById(db, id) {
  const sql = `
    SELECT id, username, email, phone, address, avatar, status
    FROM clients
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [id]);
  return rows[0] ?? null;
}


// Update the customer-editable profile fields; never accept password or email here.
export async function updateClientProfile(db, id, { username, phone, address }) {
  const sql = `
    UPDATE clients
    SET username = ?, phone = ?, address = ?
    WHERE id = ?
  `;

  await db.query(sql, [username, phone || null, address, id]);
  return findClientById(db, id);
}

// Set or clear the customer's profile photo (a stored image name, or null).
export async function updateClientAvatar(db, id, avatar) {
  await db.query('UPDATE clients SET avatar = ? WHERE id = ?', [avatar, id]);
  return findClientById(db, id);
}
