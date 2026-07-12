# LMS 2.0 - Letter Management System

> "The Silicon Backbone for Official Correspondence"

LMS 2.0 is a full-stack correspondence platform for registering, routing, endorsing, tracking, and archiving official letters.

---

## Project Overview

Core goals:

- Digital transformation of paper-based workflows.
- Workflow automation across departments and process steps.
- Full auditability through logs and comments.
- Hybrid physical and digital tracking through trays and attachments.
- Role-based access control through the Access Matrix.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite), Tailwind CSS |
| Backend | Node.js, Express.js |
| ORM | Sequelize |
| Auth/Identity | Directus |
| Infrastructure | Docker, Docker Compose |
| Database | SQLite (shared file-backed DB) |

---

## Database Models

The backend currently uses these Sequelize models and tables:

| Model | Collection/Table |
|---|---|
| `Letter` | `letters` |
| `LetterAssignment` | `letter_assignments` |
| `LetterLog` | `letter_logs` |
| `Comment` | `comments` |
| `Endorsement` | `endorsements` |
| `LinkLetter` | `link_letters` |
| `Tray` | `ref_trays` |
| `Status` | `ref_statuses` |
| `LetterKind` | `ref_letter_kinds` |
| `ProcessStep` | `ref_process_steps` |
| `Department` | `ref_departments` |
| `Attachment` | `ref_attachments` |
| `User` | `directus_users` |
| `Role` | `directus_roles` |
| `RolePermission` | `role_permissions` |
| `SystemPage` | `system_pages` |
| `Person` | `person` |

### Collection Relationships

- `letters` (`Letter`): belongs to `ref_letter_kinds` (`kind`), `ref_statuses` (`global_status`), `directus_users` (`encoder_id`), `ref_attachments` (`attachment_id`), `ref_trays` (`tray_id`); has many `letter_assignments`, `letter_logs`, `comments`, `endorsements`; has many `link_letters` through `main_letter_id`.
- `letter_assignments` (`LetterAssignment`): belongs to `letters` (`letter_id`), `ref_departments` (`department_id`), `ref_process_steps` (`step_id`), `ref_statuses` (`status_id`), `directus_users` (`assigned_by`).
- `letter_logs` (`LetterLog`): belongs to `letters` (`letter_id`) and `directus_users` (`user_id`).
- `comments` (`Comment`): belongs to `letters` (`letter_id`) and `directus_users` (`user_id`).
- `endorsements` (`Endorsement`): belongs to `letters` (`letter_id`) and `directus_users` (`endorsed_by`).
- `link_letters` (`LinkLetter`): belongs to `letters` twice: `main_letter_id` (`mainLetter`) and `attached_letter_id` (`attachedLetter`).
- `ref_trays` (`Tray`): belongs to `ref_departments` (`dept_id`); has many `letters`.
- `ref_process_steps` (`ProcessStep`): belongs to `ref_departments` (`dept_id`); has many `letter_assignments`.
- `ref_statuses` (`Status`): belongs to `ref_departments` (`dept_id`).
- `ref_letter_kinds` (`LetterKind`): belongs to `ref_departments` (`dept_id`).
- `ref_departments` (`Department`): has many `directus_users` (`dept_id`) and is referenced by `letter_assignments`.
- `directus_users` (`User`): belongs to `ref_departments` (`dept_id`) and `directus_roles` (`role`); referenced by `letters`, `letter_assignments`, `letter_logs`, `comments`, `endorsements`.
- `directus_roles` (`Role`): has many `role_permissions`.
- `role_permissions` (`RolePermission`): belongs to `directus_roles` (`role_id`); stores per-page permissions (`can_view`, `can_create`, `can_edit`, `can_delete`, `can_special`, `field_permissions`).
- `system_pages` (`SystemPage`): catalog of permissionable page keys used by Access Matrix.
- `ref_attachments` (`Attachment`): referenced by `letters.attachment_id`; stores physical/reference attachment metadata.
- `person` (`Person`): currently standalone at ORM level; used as sender/endorsement name directory.

---

## 🚀 System Flow & Letter Lifecycle

1. **Submission & Ingestion (Internal & Guest Portals)**  
   - Letters can be officially encoded by registered users directly from the LMS dashboard or submitted anonymously via the external `Guest Portal/Send Letter` pipeline.
   - **Smart Name Resolution**: When a guest encodes a letter on behalf of an existing entity, LMS 2.0 automatically performs a first name and last name resolution to link the `Encoder_ID` or `Sender` to the respective registered user—even without an active session login.

2. **Real-time Notifications**  
   - Webhook events securely broadcast `Telegram Bot` notifications, proactively notifying departmental teams or VIPs about new high-priority correspondence generated within the system.

3. **Visibility & Tracking Queues**  
   - The platform employs a robust dynamic client-and-server-side **Visibility Engine**.
   - Standard users retain pervasive read-access over any correspondence where they are declared the `Sender`, `Endorsed Actionee`, or `Encoder`.
   - Admin and VIP roles exercise cross-departmental supervision (via `dept_id=all`) dynamically fetching respective reference metadata (Statuses, Letter Kinds, Attachments) uninhibited.

4. **Action Routing**  
   - Assigned letters migrate across organizational queues (`Inbox`, `Tracker`, `Master Table`) progressing laterally through standard milestones (`Pending` → `For Review` → `For Signature` → `VEM Letter`). User interactions continuously log to the `comments` and `letter_logs` tables ensuring iron-clad auditability.

5. **Completion & Archiving**  
   - The workflow culminates when a correspondence reaches terminal status labels (`ATG Note`, `Hold`, or `Done`). Associated physical attachments and digitized PDFs populate the final `ref_attachments` and link chains permanently.

---

## Deployment and Setup

### Prerequisites

- Node.js v18+
- Docker Desktop
- Git

### Environment Files

- `backend/.env` contains backend-local defaults.
- Root `.env` is used by Docker Compose and shared runtime values.
- `react-frontend/.env.local` is used when running the frontend with Vite locally.
- `react-frontend/.env` is used for production-style frontend builds.
- If you move the project to another machine or host, update `DIRECTUS_PUBLIC_URL`, `VITE_API_URL`, and `VITE_DIRECTUS_URL` so they match your URL.

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/felixparejapmdit/LMS-2.0.git
cd LMS-2.0
```

2. Install the root dependencies:
```bash
npm install
```

3. Install the backend and frontend dependencies:
```bash
npm run install-all
```

### Run With Docker

Start the complete stack:

```bash
docker compose up -d --build
```

This starts:

- Frontend: `http://localhost`
- Backend API: `http://localhost:5000`
- Directus: `http://localhost:8055`

Useful Docker commands:

```bash
docker compose ps
docker compose logs -f directus
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
```

### Run In Local Dev Mode

If you want to run the backend and frontend on your machine instead of in containers:

1. Start Directus only:
```bash
docker compose up -d directus
```

2. Start the host development servers:
```bash
npm run dev
```

`npm run dev` starts the backend and frontend together, but it does not start Directus, so keep the Directus container running in this mode.

Local dev URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

### Database Credentials / Access

- Default database: SQLite file at `directus/database/data.db`
- SQLite does not use a username/password login
- Default Directus admin credentials used by the Docker bootstrap:
  - Email: `admin@example.com`
  - Password: `password`
- You can override the Directus admin credentials with `DIRECTUS_ADMIN_EMAIL` and `DIRECTUS_ADMIN_PASSWORD` in `.env`
- You can override the backend SQLite file path with `DB_PATH`

---

## Project Structure

```text
LMS 2.0/
|-- backend/
|   |-- src/
|   |   |-- controllers/
|   |   |-- models/
|   |   |-- routes/
|   |   `-- config/
|-- react-frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- services/
|   |   `-- context/
|-- directus/
`-- docker-compose.yml
```
