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
| Database | SQLite (dev), MariaDB/PostgreSQL (prod-ready) |

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

### Installation Steps

1. Clone repository:
```bash
git clone https://github.com/felixparejapmdit/LMS-2.0.git
cd LMS-2.0
```

2. Install dependencies:
```bash
npm run install-all
```

3. Start infrastructure:
```bash
docker compose up -d
```

4. Start frontend and backend:
```bash
npm run dev
```

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

