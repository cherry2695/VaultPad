require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./config/database');
const { createIndexes } = require('./database/indexes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) {
  fs.mkdirSync(viewsDir, { recursive: true });
  fs.writeFileSync(path.join(viewsDir, 'index.ejs'), '<h1>VaultPad</h1>');
  fs.writeFileSync(path.join(viewsDir, 'workspace.ejs'), '<h1>Workspace</h1>');
}

app.set('view engine', 'ejs');
app.set('views', viewsDir);

// Trust Render's proxy (needed for correct IP/protocol detection)
app.set('trust proxy', 1);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint (used by Render and uptime monitors)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/uploads', (req, res, next) => {
  const safePath = path.normalize(req.path).replace(/^\//, '');
  if (safePath.includes('..')) return res.status(403).json({ error: 'Forbidden' });
  next();
}, express.static(uploadsDir));

app.use('/', require('./routes/index'));
app.use('/', require('./routes/workspace'));
app.use('/', require('./routes/notes'));
app.use('/', require('./routes/files'));
app.use('/', require('./routes/search'));
app.use('/', require('./routes/trash'));

app.use((req, res) => {
  if (req.accepts('html')) res.status(404).render('index');
  else res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 8050;

async function startServer() {
  await connectDB();
  await createIndexes();
  app.listen(PORT, () => {
    console.log(`VaultPad server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
