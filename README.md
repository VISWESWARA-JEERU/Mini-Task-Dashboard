# MINI Task Dashboard

A full-stack mini application for team members to manage **assigned tasks** and **subtasks**, and to record **daily status updates** with a date-wise history.

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** FastAPI + SQLAlchemy (PostgreSQL)

---

## Features

### Member workflow
- View a dashboard grid of tasks/subtasks assigned to the current member
- Create a **subtask** under a task
- Update subtask fields:
  - `status` (`Not Started`, `In-Progress`, `Done`)
  - `environment` (`Dev`, `Prod`)
  - `area` (`Backend`, `UI`)
- Add or edit a **today’s status description** for a subtask
  - (A subtask can have only one status entry per day; today updates are edited)
- View **status history** per subtask (newest first)

---

## Architecture (high level)

### Database model
- `User`
- `Task` (assigned to a member via `resource_id`)
- `Subtask`
- `StatusUpdate` (unique per `subtask_id` + `update_date`)

Backend endpoints are grouped under `/api` and currently include the **Member Module**.

### Authentication note
Authentication is not implemented yet.
- The backend uses a temporary constant: `CURRENT_USER_ID = 5`.
- Replace it later with a real JWT-based `current_user.user_id`.

---

## Tech Stack

### Frontend
- React 19
- Vite
- TailwindCSS
- Axios

### Backend
- FastAPI
- Uvicorn (run server)
- SQLAlchemy 2.0
- PostgreSQL driver: `psycopg2-binary`
- Pydantic

---

## Setup & Run

### 1) Backend (FastAPI)

1. Go to `backend/`
2. Configure PostgreSQL connection via environment variables expected by `backend/database.py`:

- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`

3. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

4. Start the API server (default in code):

```bash
uvicorn main:app --reload --port 8000
```

Backend summary:
- API base path: `http://127.0.0.1:8000/api`
- CORS is enabled for all origins (`allow_origins=["*"]`).

---

### 2) Frontend (React)

1. Go to `frontend/`
2. Start the dev server:

```bash
cd frontend
npm install
npm run dev
```

Frontend notes:
- The API base URL is currently hardcoded in `frontend/src/services/api.js`:
  - `http://127.0.0.1:8000/api`

---

## API Reference (Member Module)

All endpoints below are under the router prefix:

- `GET /api/my-tasks`
  - Returns the task/subtask grid for the current member, including the latest status description.

- `POST /api/subtasks`
  - Create a new subtask under a parent task.

- `PATCH /api/subtasks/{subtask_id}`
  - Partially update subtask fields.

- `POST /api/subtasks/{subtask_id}/status-updates`
  - Add or update today’s status description.

- `GET /api/subtasks/{subtask_id}/status-history`
  - Get date-wise status history for a subtask (newest first).

---

## Data Constraints (important)

- `Task.status` must be one of:
  - `Not Started`, `In-Progress`, `Done`
- `Subtask.status` must be one of:
  - `Not Started`, `In-Progress`, `Done`
- `Subtask.environment` must be one of:
  - `Dev`, `Prod`
- `Subtask.area` must be one of:
  - `Backend`, `UI`
- `StatusUpdate` is unique per day per subtask:
  - (`subtask_id`, `update_date`)

---

## Frontend UI Mapping

- `MemberDashboard` (`frontend/src/pages/MemberDashboard.jsx`)
  - Fetches `/api/my-tasks` and renders the grid.
- `MyWorkGrid` (`frontend/src/components/MyWorkGrid.jsx`)
  - Displays rows, allows status/environment/area updates, and triggers today status save.
- `StatusHistory` (`frontend/src/components/StatusHistory.jsx`)
  - Fetches `/api/subtasks/{subtaskId}/status-history`.
- `AddSubtaskModal` (`frontend/src/components/AddSubtaskModal.jsx`)
  - Creates subtask and (optionally) inserts today’s description.

---

## Project Layout

- `backend/`
  - `main.py` – FastAPI app bootstrap
  - `database.py` – DB engine + session
  - `models.py` – SQLAlchemy models
  - `schemas.py` – Pydantic request/response schemas
  - `routers/member.py` – Member module routes

- `frontend/`
  - `src/pages/MemberDashboard.jsx`
  - `src/components/*`
  - `src/services/*` – API calls

---

## Notes / Known Limitations

- Authentication is temporary (fixed `CURRENT_USER_ID`).
- Frontend API base URL is hardcoded; consider switching to `VITE_*` env vars.
- `GET /my-tasks` returns a list of rows (one per subtask) to match the grid UI.

---

## License

Add your license information here (e.g., MIT) once decided.

