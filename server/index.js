import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import mysql from 'mysql2/promise';

import createHomeRoutes from './routes/homeRoutes.js';
import createProductRoutes from './routes/productRoutes.js';
import createAuthRoutes from './routes/authRoutes.js';
import createAdminAuthRoutes from './routes/adminAuthRoutes.js';
import createAdminRoutes from './routes/adminRoutes.js';
import createCartRoutes from './routes/cartRoutes.js';
import createOrderRoutes from './routes/orderRoutes.js';

const app = express();

// Allow the Vite dev server on 5173 and the 5174 fallback it uses when
// 5173 is busy, plus any origin set in CLIENT_URL.
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

// Cookie-based sessions. MemoryStore is suitable for local development,
// not production. Customers and admins get separate cookies and stores,
// so signing in as one never signs out (or grants access as) the other.
function createSession(name, maxAgeMs) {
  return session({
    name,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // Local HTTP development only.
      maxAge: maxAgeMs,
    },
  });
}

const clientSession = createSession('rando.sid', 1000 * 60 * 60 * 24);
const adminSession = createSession('rando.admin.sid', 1000 * 60 * 60 * 8);

app.use('/api', (req, res, next) => {
  const isAdminRoute =
    req.path === '/admin' || req.path.startsWith('/admin/');

  return (isAdminRoute ? adminSession : clientSession)(req, res, next);
});

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3308),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'rando',
  waitForConnections: true,
  connectionLimit: 10,
});

// Expose the shared pool to authorization middleware.
app.locals.db = db;

app.get('/api/health', async (_req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    res.json({ api: 'ok', database: 'connected', result: rows[0].ok });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    res.status(500).json({
      api: 'ok',
      database: 'error',
      message: 'Check your MySQL service and .env settings.',
    });
  }
});

// Register routes before starting the server.
app.use('/api/home', createHomeRoutes(db));
app.use('/api/products', createProductRoutes(db));
app.use('/api/auth', createAuthRoutes(db));
app.use('/api/admin/auth', createAdminAuthRoutes(db));
app.use('/api/admin', createAdminRoutes(db));
app.use('/api/cart', createCartRoutes(db));
app.use('/api/orders', createOrderRoutes(db));

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});