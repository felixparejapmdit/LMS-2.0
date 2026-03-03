# LMS 2.0 — Letter Management System

> A full-stack correspondence management platform for digitizing, routing, tracking, and archiving official letters across departments.

---

## 🚀 Project Overview

LMS 2.0 is an internal correspondence management system designed to replace paper-based letter handling with a fully digital workflow. It supports multi-role access, letter routing, department-level inbox management, and real-time tracking.

---

## 🎯 Project Objectives

- **Centralized Repository** — Single source of truth for all official correspondence
- **Workflow Automation** — Digital routing of letter tasks across departments
- **Accountability & Tracking** — Real-time visibility of letter location, owner, and duration
- **Data Integrity** — Protection of files and metadata from accidental loss
- **Role-Based Access Control** — Granular permissions per role, per page, per action

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📥 Unified Inbox | Per-user inbox filtered by department |
| 🔀 Routing Engine | Flexible routing by department and process step |
| 📄 Document Management | PDF/Image upload, preview, and tracking |
| 🧾 Audit Trail | Live action history for every letter |
| 🗃️ Tray Management | Physical filing location reference |
| 🔔 Endorsement Hub | Notification-driven letter endorsement system |
| 👁️ VIP View | Special dashboard for designated VIP roles |
| 🔐 Access Matrix | Admin-controlled RBAC with per-page, per-action permissions |
| 📊 Analytics Dashboard | Real-time stats on active, done, and ATG-flagged letters |
| 📬 Letter Tracker | Public tracking page for external senders |

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + Tailwind CSS |
| **UI Components** | Lucide React (icons), custom component library |
| **Backend API** | Node.js + Express.js |
| **ORM** | Sequelize (SQLite in dev) |
| **CMS / Auth Core** | Directus (Headless CMS) |
| **Database** | SQLite (local) / MariaDB / PostgreSQL (production) |
| **Containerization** | Docker + Docker Compose |

---

## 📁 Folder Structure

```text
LMS 2.0/
├── backend/                    # Express API server
│   ├── src/
│   │   ├── config/             # Database connection (Sequelize)
│   │   ├── controllers/        # Request handlers (OOP style)
│   │   ├── models/             # Sequelize models & associations
│   │   └── routes/             # API route definitions
│   └── package.json
├── react-frontend/             # Vite + React SPA
│   ├── src/
│   │   ├── components/         # Reusable UI components (Sidebar, LetterCard…)
│   │   ├── context/            # AuthContext (RBAC, theme, layout)
│   │   ├── hooks/              # Directus SDK hook
│   │   ├── pages/              # Page components by section
│   │   │   ├── auth/           # Login page
│   │   │   ├── dashboard/      # Home, Dashboard, VIPView, Spam
│   │   │   ├── guest/          # Public letter tracker & send form
│   │   │   ├── management/     # MasterTable, Letters, Endorsements, RBAC…
│   │   │   ├── setup/          # SetupWizard
│   │   │   └── user/           # Settings page
│   │   └── services/           # Axios API service modules
│   └── package.json
├── directus/                   # Directus volumes, config, schema
├── docker-compose.yml          # Full infrastructure definition
├── package.json                # Root scripts (install-all, dev)
└── README.md
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js** v18+
- **Docker Desktop** (must be running)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/felixparejapmdit/LMS-2.0.git
cd "LMS-2.0"
```

### 2. Install All Dependencies
From the root folder, install both backend and frontend dependencies:
```bash
npm run install-all
```

### 3. Start Docker Services (Database + Directus)
```bash
docker compose up -d
```

### 4. Start Backend & Frontend (Dev Mode)
```bash
npm run dev
```

---

## 🌐 Accessing the Application

| Service | URL |
|---|---|
| **Frontend App** | http://localhost:5173 |
| **Backend API** | http://localhost:5000 |
| **Directus Admin** | http://localhost:8055 |
| **API Health Check** | http://localhost:5000/health |

---

## 👤 Default Credentials

> ⚠️ Change these immediately in a production environment.

**Directus Admin:**
- Email: `admin@example.com`
- Password: `password`

---

## 🔐 Role System

| Role | Access Level |
|---|---|
| **Admin / Super Admin** | Full access — bypasses all permission checks |
| **Developer** | Full access + Developer DNA menu |
| **VIP** | Dedicated VIP View dashboard |
| **User** | Letter Tracker & Send Letter only |
| **Standard Staff** | Department inbox, master table, based on Access Matrix |

---

## 🔄 Common Git Workflow

```bash
# After making changes:
git add .
git commit -m "describe your change"
git push
```

---

## 📌 Project Status

> 🟢 **Active Development** — Core features complete, refinements ongoing.

---

*Developed by Felix Pareja · PMD-ITT Projects · 2026*
