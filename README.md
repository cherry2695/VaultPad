# 🔐 VaultPad — Secure Digital Workspace

A premium, zero-registration private workspace for notes, code snippets, and media files. Built with Node.js, Express, MongoDB, and EJS.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)

### Install & Run

```bash
git clone <your-repo-url>
cd VaultPad
npm install
# Edit .env with your MongoDB URI
npm run dev
```

Open [http://localhost:8050](http://localhost:8050)

---

## 🌐 Deploy to Render (Production)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial VaultPad commit"
git remote add origin https://github.com/YOUR_USERNAME/vaultpad.git
git push -u origin main
```

> **Important:** The `.gitignore` excludes `.env` and `node_modules/`. Never commit your `.env` file.

### Step 2: Create Render Web Service

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name:** `vaultpad`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node app.js`
   - **Plan:** Free (or Starter for production)

### Step 3: Set Environment Variables in Render

In your Render service dashboard → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `8050` |
| `MONGODB_URI` | `mongodb+srv://chanikya_95:chanikya_95@cluster95.7r87fvj.mongodb.net/vaultpad?appName=Cluster95` |

### Step 4: Configure MongoDB Atlas

Allow Render's IP addresses in MongoDB Atlas:
1. Go to Atlas → Network Access
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (0.0.0.0/0) for simplicity
4. (Optional: Add Render static IPs for better security on paid plans)

### Step 5: Deploy

Click **Deploy** — Render will:
1. Clone your repo
2. Run `npm install`
3. Start with `node app.js`
4. Health-check the `/` endpoint

Your app will be live at: `https://vaultpad.onrender.com` (or similar)

---

## 📁 Project Structure

```
VaultPad/
├── app.js                    # Express entry point
├── config/
│   └── database.js           # MongoDB connection
├── controllers/
│   ├── workspaceController.js # Workspace entry/settings
│   ├── noteController.js      # Note CRUD + versioning
│   ├── fileController.js      # File upload/download/delete
│   ├── searchController.js    # Global search
│   └── trashController.js     # Soft-delete management
├── database/
│   └── indexes.js             # MongoDB index creation
├── middleware/
│   ├── errorHandler.js        # Centralized error handling
│   ├── uploadMiddleware.js    # Multer dynamic upload
│   └── validateRequest.js     # express-validator chains
├── models/
│   ├── Workspace.js           # Workspace schema
│   ├── Note.js                # Note + version history schema
│   ├── File.js                # File metadata schema
│   └── ActivityLog.js         # TTL-based activity log
├── routes/
│   ├── index.js               # Landing page
│   ├── workspace.js           # Workspace API
│   ├── notes.js               # Notes API
│   ├── files.js               # Files API
│   ├── search.js              # Search API
│   └── trash.js               # Trash API
├── utils/
│   ├── hashUtils.js           # bcrypt + SHA-256 hashing
│   ├── fileUtils.js           # File validation/sizing
│   └── responseUtils.js       # Standardized JSON responses
├── public/
│   ├── css/custom.css         # Theme + animations
│   └── js/
│       ├── theme.js           # Theme FOUC prevention
│       ├── main.js            # Landing page logic
│       ├── workspace.js       # Workspace orchestrator
│       ├── editor.js          # Note/code editor
│       ├── fileManager.js     # File upload/grid/list
│       └── search.js          # Global search
├── views/
│   ├── index.ejs              # Landing page
│   └── workspace.ejs          # Workspace dashboard
├── uploads/                   # Auto-created on server start
├── .env                       # Local env (not committed)
├── .gitignore
├── render.yaml                # Render deployment config
└── package.json
```

---

## 🔑 Security Model

- **Workspace codes** are never stored in plaintext
- **SHA-256** hash used for O(1) lookup (deterministic)
- **bcrypt** (salt factor 12) stored separately for verification
- **Path traversal prevention** on all file downloads
- **Soft deletes** — files remain in database until explicitly purged

---

## 📊 File Size Limits

| Type | Limit |
|------|-------|
| Images (.jpg/.png/.gif/.webp/.svg) | **10 MB** |
| PDF | **20 MB** |
| Word (.doc/.docx) | **20 MB** |
| Excel (.xls/.xlsx/.csv) | **20 MB** |
| Audio (.mp3/.wav/.ogg/.aac/.flac) | **50 MB** |
| Video (.mp4/.webm/.mov/.avi) | **100 MB** |
| Notes / Code | **5 MB** |

---

## 📝 Version History

- Last **20 versions** retained per note
- Version saved when content changes by **>50 characters** OR **>5 minutes** since last save
- Full restore with one click; current content saved as a version before restoring

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | MongoDB Atlas (Mongoose 8) |
| Templating | EJS |
| File Upload | Multer |
| Image Optimization | Sharp |
| Password Hashing | bcryptjs (factor 12) |
| Validation | express-validator |
| Frontend Styling | Tailwind CSS (CDN) + Custom CSS |
| Fonts | Inter + JetBrains Mono |
| Icons | Font Awesome 6 |
| Syntax Highlighting | Highlight.js |

---

## ⚠️ Important Notes for Render

- **Uploads folder**: Render's free tier has **ephemeral storage** — uploaded files will be lost on redeploy/restart. For production, use [Render Disk](https://render.com/docs/disks) ($0.25/GB/month) or integrate AWS S3/Cloudinary.
- **Free tier sleep**: Free Render services sleep after 15 minutes of inactivity. The first request after sleep takes ~30 seconds.
- **MongoDB Network**: Make sure to allowlist `0.0.0.0/0` in MongoDB Atlas for Render's dynamic IPs.
