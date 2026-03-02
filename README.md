# LMS 2.0 - Letter Management System

## Project Objectives
- **Centralized Repository**: Single source of truth for official correspondence.
- **Workflow Automation**: Digital routing of letter tasks across departments.
- **Accountability and Tracking**: Real-time visibility of letter location, owner, and duration.
- **Data Integrity**: Protection of files and metadata from accidental loss.

## Key Features
- Unified Digital Inbox per user.
- Flexible Routing Engine by department and process step.
- Integrated Document Management for PDF/Image files.
- Live Audit Trail of status and action history.
- Tray Management for physical filing references.

## Technology Stack
- **Frontend**: React + Tailwind CSS + Vite
- **Backend (Middleware)**: Node.js + Express + Sequelize (ORM)
- **CMS/Database Core**: Directus (Headless CMS)
- **Database**: SQLite (local setup) / MariaDB / PostgreSQL
- **Containerization**: Docker / Docker Compose

## Folder Structure
```text
LMS 2.0/
├── backend/                # Express server & Sequelize models
│   ├── src/
│   │   ├── config/         # DB connection
│   │   ├── controllers/    # Request logic
│   │   ├── models/         # Sequelize associations & templates
│   │   └── routes/         # API endpoints
│   └── package.json
├── react-frontend/         # Vite + React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   └── package.json
├── directus/               # Directus volumes & config
├── docker-compose.yml      # Infrastructure setup
├── package.json            # Root manager (Unified scripts)
└── README.md
```

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Docker Desktop (Running)

### 2. Setup
Install all dependencies for both backend and frontend from the root folder:
```bash
npm run install-all
```

### 3. Launching the System
You can now start everything with a single command from the root directory:

**Start Database & Services (Docker):**
```bash
docker compose up -d
```

**Start Backend & Frontend:**
```bash
npm run dev
```

## Accessing the Apps
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Directus Admin**: [http://localhost:8055](http://localhost:8055)

---
*Default Directus Credentials:*
- Email: `admin@example.com`
- Password: `password`
