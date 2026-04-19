# JanMitra Ready Project

This workspace is now set up as a connected full-stack project:

- `backend/` contains the Flask API
- `frontend/` contains the React + JS UI


## What was integrated

- Citizen registration is connected to `POST /api/register-voter`
- Admin and citizen login are connected to `POST /api/login`
- Citizen dashboard and profile are connected to `GET /api/profile/<username>`
- Admin dashboard uses:
  - `GET /api/voters`
  - `GET /api/duplicates`
  - `GET /api/fake`
  - `GET /api/address-anomaly`

## Run the project

### Backend

```powershell
cd C:\Users\HP\Desktop\JanMitra\backend
pip install -r requirements.txt
python app.py
```

### Frontend

```powershell
cd C:\Users\HP\Desktop\JanMitra\frontend
npm install
npm run dev
```

Frontend runs on the Vite port shown in the terminal, and it calls the Flask API at `http://127.0.0.1:5000`.

## Quick start helper

You can also double-run this helper from the project root:

```powershell
cd C:\Users\HP\Desktop\JanMitra
.\start-project.ps1
```

That opens one PowerShell window for the backend and one for the frontend.

## Default test accounts

If your MySQL database already contains the sample users created by `backend/create_users.py`, these work:

- Admin: `admin1` / `admin123`
- Voter: `voter1` / `voter123`

## Database note

The backend now supports environment-based database settings:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `SECRET_KEY`

If you do not set them, the current local defaults in the project are used.
