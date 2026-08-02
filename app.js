require('dotenv').config();

// ── Fix DNS for Windows (resolves MongoDB Atlas SRV records properly) ────────
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');

const express      = require('express');
const path         = require('path');
const fs           = require('fs');
const session      = require('express-session');
const { MongoStore } = require('connect-mongo');
const passport     = require('./config/passport');

const { connectDB }     = require('./config/database');
const { createIndexes } = require('./database/indexes');
const errorHandler      = require('./middleware/errorHandler');

const app = express();

// ── Ensure required directories exist ────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) fs.mkdirSync(viewsDir, { recursive: true });

// ── View Engine ───────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', viewsDir);

// Trust Render's reverse proxy
app.set('trust proxy', 1);

// ── Security Headers ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // SAMEORIGIN allows /uploads PDFs to be previewed in iframes on the same origin
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Session (must come before passport) ──────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'vaultpad-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl:      14 * 24 * 60 * 60, // 14 days
    autoRemove: 'native',
  }),
  cookie: {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   14 * 24 * 60 * 60 * 1000,
  },
}));

// ── Passport ──────────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Make req.user available in all EJS templates ──────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbState  = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.status(200).json({
    status: 'ok',
    db:     dbState[mongoose.connection.readyState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// ── Uploads Static ────────────────────────────────────────────────────────────
app.use('/uploads', (req, res, next) => {
  const safePath = path.normalize(req.path).replace(/^\//, '');
  if (safePath.includes('..')) return res.status(403).json({ error: 'Forbidden' });
  next();
}, express.static(uploadsDir));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/', require('./routes/auth'));       // Google OAuth routes
app.use('/', require('./routes/user'));       // User profile API
app.use('/', require('./routes/index'));
app.use('/', require('./routes/workspace'));
app.use('/', require('./routes/notes'));
app.use('/', require('./routes/files'));
app.use('/', require('./routes/search'));
app.use('/', require('./routes/trash'));

// ── 404 Fallback ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.accepts('html')) return res.status(404).render('index', { user: req.user || null });
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8050;

async function startServer() {
  try {
    await connectDB();
    await createIndexes();
  } catch (dbErr) {
    console.error('\n❌  MongoDB connection failed:', dbErr.message);
    console.error('   API routes will not work until MongoDB is connected.\n');
    if (process.env.NODE_ENV === 'production') {
      console.error('   Production requires a working MongoDB connection. Exiting.');
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`\n🚀  VaultPad running at  →  http://localhost:${PORT}`);
    console.log(`📝  Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

startServer();
module.exports = app;
