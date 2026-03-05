# 📄 LMS 2.0 — Letter Management System

> **"The Silicon Backbone for Official Correspondence"**
>
> A state-of-the-art, full-stack ecosystem designed to digitize, route, track, and archive official letters with precision and military-grade accountability.

---

## 🚀 Project Overview

LMS 2.0 is an advanced correspondence management platform built to replace traditional paper-based workflows. It provides a centralized, secure repository for all official letters, automating the routing process while providing real-time visibility through a comprehensive audit trail.

---

## 🎯 Strategic Objectives

- **Digital Transformation** — Move from physical filing to a high-speed, searchable digital archive.
- **Workflow Automation** — Route tasks dynamically between departments (For Review ➔ For Signature ➔ For Action).
- **Absolute Accountability** — Maintain a transparent "Universal Audit Trail" for every document interaction.
- **Precision Filing (Trays)** — Map digital letters to physical storage locations (Trays) for hybrid management.
- **Granular Security** — Enforce strict Role-Based Access Control (RBAC) via the project's internal Access Matrix.

---

## 🧬 Core DNA (Project Architecture)

The system is built on a **Modular Object-Oriented Engine**, ensuring scalability and clean separation of concerns.

### 1. The Workflow Engine
The heart of LMS 2.0 is the **Process Step Matrix**. It dynamically routes correspondence based on:
- **Sequential Triggers:** Automatic assignment progression (e.g., from Department 1 to Department 2).
- **Dynamic Statuses:** Real-time visibility through statuses like `Pending`, `Endorsed`, `On Hold`, and `Filed`.

### 2. The Universal Audit Trail (Logs)
Every interaction is captured in the `letter_logs` system, providing a history of:
- **Actions:** Created, Assigned, Endorsed, Commented, Completed.
- **Participants:** Dedicated tracking of the user and department involved.
- **Marginal Notes:** High-level executive instructions recorded alongside the document.

### 3. The Access Matrix
Centralized control over system permissions:
- **Permission Guards:** UI elements (buttons, menus) are conditionally rendered based on user "DNA".
- **Intelligent Routing:** Users are funneled to specific dashboards (Staff, VIP, or Guest) based on their role.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend UI** | **React 18** (Vite) + **Tailwind CSS** |
| **Icons & Visuals** | **Lucide React** (Premium Aesthetics) |
| **Logic Server** | **Node.js** + **Express.js** (OOP Implementation) |
| **ORM / Data** | **Sequelize** (Relational Data Mapping) |
| **Identity / Auth** | **Directus** (Headless CMS Gateway) |
| **Infrastructure** | **Docker** + **Docker Compose** |
| **Database** | **SQLite** (Dev) / **MariaDB / PostgreSQL** (Prod) |

---

## 📊 Database Models

The schema is designed to support complex many-to-many relationships and historical tracking:

- **`Letter`**: The core document entity (LMS ID, Entry ID, Sender, Summary).
- **`LetterAssignment`**: Tracks active routing (Letter ➔ Department ➔ Step).
- **`LetterLog`**: The immutable audit trail for all changes.
- **`Endorsement`**: Specific assignments directed to individuals within a department.
- **`Comment`**: Threaded discussion for collaborative document review.
- **`Tray`**: Represents physical filing units for document archiving.
- **`ProcessStep`**: Defines the workflow stages specific to each department.
- **`Status`**: Global lifecycle states for the entire system.

---

## ⚡ Deployment & Setup

### Prerequisites
- **Node.js** v18+
- **Docker Desktop** (must be running)
- **Git**

### Installation Steps

1. **Clone the Hub**
   ```bash
   git clone https://github.com/felixparejapmdit/LMS-2.0.git
   cd LMS-2.0
   ```

2. **Sync Dependencies**
   From the root folder, install all required modules:
   ```bash
   npm run install-all
   ```

3. **Initialize Infrastructure**
   Start the Directus engine and database services:
   ```bash
   docker compose up -d
   ```

4. **Ignite the Engines**
   Start both the Backend API and Frontend App:
   ```bash
   npm run dev
   ```

---

## 📁 System Blueprint

```text
LMS 2.0/
├── backend/                    # The Logic Engine
│   ├── src/
│   │   ├── controllers/        # Request handlers (OOP)
│   │   ├── models/             # Database Schemas & Associations
│   │   ├── routes/             # REST Endpoints
│   │   └── config/             # DB & Environment Logic
├── react-frontend/             # The User Experience
│   ├── src/
│   │   ├── components/         # Atomic UI Components
│   │   ├── pages/              # Domain-specific Views
│   │   ├── services/           # API Communication Layers
│   │   └── context/            # Auth & Theme Storage
├── directus/                   # Identity Gateway
└── docker-compose.yml          # Container Orchestration
```

---

## 📌 Project Status
> 🟢 **Ready for Action** | Core Engine: Stable | UI: Premium Polished.

*Developed with ❤️ by Felix Pareja · PMD-ITT Projects · 2026*
