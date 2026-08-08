# 🎵 WaveNet — Decentralized Music Streaming System (Without Blockchain)

A full-stack, production-style music streaming platform that simulates **decentralized storage**
using plain local folders and a custom load-balancing layer — no blockchain, no IPFS, no Docker,
no paid services. Everything runs on your machine.

---

## 1. Project Overview

WaveNet lets listeners stream music, artists upload and track their songs, and admins manage the
whole platform — including the "decentralized" storage layer, which spreads uploaded songs across
5 local storage-node folders using a configurable load-balancing algorithm (Round Robin, Least
Used, or Random), with simulated failover if a node goes offline.

**Core stack**
- Backend: FastAPI + SQLAlchemy + PostgreSQL + JWT Auth + WebSockets
- Frontend: React + React Router + Tailwind CSS + Chart.js
- Storage: 5 local folders (`storage_nodes/storage_node1` … `storage_node5`) tracked in Postgres
- Recommendations: scikit-learn content-based cosine similarity

---

## 2. Features

### Authentication
- Register / Login / Logout, JWT access + refresh tokens, bcrypt password hashing
- **Email verification on signup**: a 6-digit confirmation code is generated and emailed (or
  printed to the backend console if SMTP isn't configured) for both listener and artist accounts;
  login is blocked until the code is confirmed, with a resend option
- Forgot / Reset password (reset link is printed to the backend console — simulated email)
- Role-based access: **User**, **Artist**, **Admin**

### Listener features
- Search songs by title/artist, filter by genre, sort by newest/popularity/most played
- Full music player: play/pause/seek/volume/queue/shuffle/repeat, mini player + full-screen player
- **Live, audio-reactive waveform visualizer** in the full-screen player, driven by the Web Audio
  API off the actual playing sound (not a canned animation)
- Like/favorite songs, recently played history, create/rename/delete public or private playlists
- **Any listener can upload their own songs** and stream them later — uploading isn't restricted
  to "artist" accounts (admins can still revoke this per-user from the Admin Panel)
- Personalized recommendations (scikit-learn cosine similarity on genre/artist/engagement)
- Dark/light theme toggle, responsive layout, toast notifications, loading skeletons

### Artist features
- Upload songs (MP3/WAV) with optional cover art — auto-distributed across storage nodes
- Edit/delete own songs, artist dashboard with play/like/download stats and a top-songs chart

### Admin features
- Dashboard: total users/artists/songs/plays, online storage nodes, LRU cache hit ratio
- Manage users (enable/disable, verified status, per-user upload privilege), manage songs
  (delete), manage storage nodes (online/offline)
- Switch the load-balancing algorithm live (Round Robin / Least Used / Random)
- Analytics: daily streams, top artists, storage usage — rendered with Chart.js

### Distributed storage simulation
- 5 local folders act as independent "storage nodes"
- `StorageManager` service selects a node per upload using the active algorithm
- A 30-second background heartbeat checks each node's reachability and disk usage
- Streaming automatically fails over to another online node if the primary is unreachable
- An in-memory LRU cache serves popular songs without hitting disk again

### 🗺️ Network Map — live decentralization visualizer (flagship demo feature)
- A dedicated page (`/network`, in the sidebar for every logged-in user) that visually shows the
  5 storage nodes and load balancer live, over the existing WebSocket channel
- Every time **anyone** streams a song, a pulse animates from the load balancer out to the exact
  node serving that file, in real time — this is the most direct, demoable way to show a panel
  that the "decentralized without blockchain" concept is actually working under the hood
- Toggling a node offline in the Admin Panel instantly reflects here (color change + toast), and
  the live listener count updates as people connect/disconnect

### Streaming
- Real HTTP Range Request support (`Accept-Ranges`, `206 Partial Content`) — browsers can seek
  and buffer exactly like a real streaming service, for both MP3 and WAV

### Real-time (WebSockets)
- `/ws/notifications` — per-user notifications
- `/ws/live` — global channel broadcasting live listener count, node status changes, and
  per-stream routing events (powers the Network Map above)

---

## 3. Architecture

```
Browser (React, :3000)
        │  REST (JWT) + WebSocket
        ▼
FastAPI backend (:8000)
   ├── auth, users, songs, streaming, playlists, favorites, history routes
   ├── StorageManager  → selects a node (round robin / least used / random)
   ├── LRUCache        → in-memory cache of popular song bytes
   ├── Heartbeat task   → checks node health every 30s
   ├── Recommendation engine (scikit-learn cosine similarity)
   └── WebSocket manager (notifications + live channel)
        │
        ▼
PostgreSQL (:5432)            storage_nodes/ (5 local folders on disk)
   all metadata & stats        actual song files, tracked via StorageNode rows
```

---

## 4. Folder Structure

```
MusicStreamingSystem/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # auth, users, songs, streaming, playlists, favorites,
│   │   │                     # history, catalog, artist, admin, analytics,
│   │   │                     # recommendations, notifications, websocket
│   │   ├── core/             # config, database, security, deps
│   │   ├── models/           # SQLAlchemy models (14 tables)
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── services/         # storage_manager, cache_manager, heartbeat,
│   │   │                     # recommendation, ws_manager
│   │   ├── utils/            # file_validation, audio_meta
│   │   └── main.py           # FastAPI entrypoint
│   ├── alembic/               # migration environment
│   ├── seed.py                 # creates default admin + starter genres
│   └── alembic.ini
├── frontend/
│   └── src/
│       ├── components/{common,layout,player}/
│       ├── context/           # AuthContext, PlayerContext, ToastContext
│       ├── pages/             # Login, Register, Dashboard, Search, Playlists,
│       │                     # ArtistUpload, ArtistDashboard, AdminDashboard, ...
│       └── services/api.js    # axios client with auto JWT refresh
├── storage_nodes/
│   ├── storage_node1 … storage_node5/    # simulated distributed storage
├── uploads/{songs,covers,avatars}/
├── logs/
├── requirements.txt
├── .env.example
└── README.md   ← you are here
```

---

## 5. Prerequisites

- **Python 3.12+**
- **Node.js 18+** and npm
- **PostgreSQL 14+** installed and running locally

---

## 6. PostgreSQL Setup

1. Install PostgreSQL if you haven't already ([postgresql.org/download](https://www.postgresql.org/download/)).
2. Start the PostgreSQL service.
3. Create the database:

```bash
psql -U postgres
CREATE DATABASE music_streaming_db;
\q
```

4. Note your Postgres username/password — you'll put them in `.env` in the next step.

---

## 7. Backend Setup

```bash
cd MusicStreamingSystem/backend

# Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r ../requirements.txt

# Configure environment variables
cp ../.env.example .env
# Edit backend/.env and set DATABASE_URL to match your Postgres credentials, e.g.:
# DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/music_streaming_db

# Seed the database (creates tables, default admin user, starter genres,
# and bootstraps the 5 storage node folders + DB rows)
python seed.py

# Optional but recommended for a demo/panel presentation: seeds ~14
# ready-to-play Bollywood-style songs distributed across all 5 nodes,
# with generated cover art and a demo artist account.
python seed_songs.py
```

This prints a default admin login:

```
username: admin
password: Admin@123
```

`seed_songs.py` also creates a demo artist account:

```
username: demo_artist
password: Artist@123
```

> **About the seeded songs:** actual copyrighted Bollywood MP3s can't be bundled here. The script
> generates original instrumental audio with Bollywood-style titles (e.g. "Dil Ki Dastaan") so the
> catalog looks and plays realistically for a demo. If you have your own **licensed** audio files,
> drop them into `backend/sample_songs/` before running the script and it'll use those instead —
> see `backend/sample_songs/README.txt`.

**Run the backend:**

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API base: `http://localhost:8000/api/v1`
- Swagger docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

> Note: `app.main` also calls `Base.metadata.create_all()` on startup, so tables are created
> automatically even if you skip `seed.py` — but you won't get the default admin account or
> starter genres without running the seed script.
>
> For schema changes going forward, use Alembic: `alembic revision --autogenerate -m "message"`
> then `alembic upgrade head`.

---

## 8. Frontend Setup

```bash
cd MusicStreamingSystem/frontend
npm install
npm start
```

Runs at `http://localhost:3000` and proxies API calls to `http://localhost:8000`.

---

## 9. Environment Variables

See `.env.example` at the project root for the full list. Key ones:

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgresql://postgres:postgres@localhost:5432/music_streaming_db` |
| `SECRET_KEY` | JWT signing secret — **change in production** | dev placeholder |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifetime | 30 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifetime | 7 |
| `LOAD_BALANCING_ALGORITHM` | `round_robin` \| `least_used` \| `random` | `round_robin` |
| `STORAGE_NODE_COUNT` | Number of simulated storage nodes | 5 |
| `LRU_CACHE_SIZE` | Max songs kept in memory cache | 50 |
| `MAX_UPLOAD_SIZE_MB` | Max upload size | 50 |
| `VERIFICATION_CODE_EXPIRE_MINUTES` | How long a signup verification code stays valid | 15 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_FROM_EMAIL` | Optional real email delivery for verification codes. Leave blank and the code is printed to the backend console instead — no setup required for local demo use. | blank |

---

## 10. Running Everything Together

Open three terminals:

```bash
# Terminal 1 — PostgreSQL (if not already running as a service)
pg_ctl start   # or: brew services start postgresql / systemctl start postgresql

# Terminal 2 — Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Terminal 3 — Frontend
cd frontend && npm start
```

Then open **http://localhost:3000**, log in with the default admin (or register a new
listener/artist account), and start uploading and streaming.

---

## 11. Trying Out the Decentralized Storage Features

1. Register an **artist** (or listener — uploads are open to everyone) account and upload a few
   songs — watch them get spread across `storage_nodes/storage_node1` … `storage_node5`
   round-robin style.
2. Open **Network Map** in the sidebar, then in a second browser tab/window play a song — watch
   the pulse travel live from the load balancer to the exact node serving it. This is the best
   single thing to show a panel: it makes the "decentralized without blockchain" concept visible.
3. Log in as **admin** → Admin Panel → Storage Nodes tab:
   - Switch the load-balancing algorithm and upload more songs to see the effect.
   - Click "Simulate Offline" on a node — the Network Map updates instantly — then try streaming
     a song stored there: the backend attempts failover to another online node.
   - Watch `used_space_mb` / `free_space_mb` update via the 30-second heartbeat.
4. Admin Panel → Overview tab shows the LRU cache hit ratio — replay the same song a few times
   to watch the hit ratio climb (also visible live on the Network Map side panel).

---

## 12. Screenshots

*(Add your own screenshots here after running the app — e.g. `docs/screenshot-dashboard.png`,
`docs/screenshot-player.png`, `docs/screenshot-admin.png`)*

---

## 13. Future Scope

- Real audio transcoding (e.g. normalize bitrate/format on upload)
- Actual file replication across nodes (currently metadata + single-copy simulation)
- Collaborative-filtering recommendations alongside the current content-based engine
- Mobile app client
- Email delivery via real SMTP instead of console-logged simulated links
- Automated CI pipeline running the test suite on every push

---

## 14. Troubleshooting

| Problem | Fix |
|---|---|
| `sqlalchemy.exc.OperationalError` on backend start | Postgres isn't running, or `DATABASE_URL` in `.env` is wrong. Verify with `psql -U postgres -d music_streaming_db`. |
| Frontend shows network errors | Confirm backend is running on port 8000 and CORS `FRONTEND_ORIGIN` in `.env` matches `http://localhost:3000`. |
| Songs won't upload | Check the file extension is `.mp3` or `.wav` and under `MAX_UPLOAD_SIZE_MB`. |
| Audio won't seek/buffer | Make sure you're streaming via `/api/v1/stream/{song_id}` (not a raw static file link) — that's the endpoint with Range support. |
| `ModuleNotFoundError` when running backend | Activate your virtual environment and re-run `pip install -r requirements.txt`. |
| Admin login doesn't work | Run `python seed.py` inside `backend/` — it creates the default admin account. |
| Can't log in after registering | New accounts need email verification first. Check the backend terminal for the printed 6-digit code, or go to `/verify-email` and enter your email + code. |
| Network Map shows "Reconnecting..." | The WebSocket at `/api/v1/ws/live` couldn't connect — confirm the backend is running and not blocked by a firewall/proxy. |
| Port already in use | Change `--port 8000` / frontend `PORT=3001 npm start`, and update `.env` / `api.js` accordingly. |

---

## 15. Default Credentials (after seeding)

```
Admin        → username: admin        | password: Admin@123
Demo Artist  → username: demo_artist  | password: Artist@123   (only if you ran seed_songs.py)
```

Both are pre-verified so you can log straight in without going through the email-code step.
Register your own listener/artist accounts from the app's sign-up page — those **will** require
entering the 6-digit verification code (check the backend terminal for it unless you've
configured real SMTP credentials in `.env`).

---

Built as a Final Year Project demonstrating decentralized-storage concepts (load balancing,
node health monitoring, failover, caching) without requiring blockchain, IPFS, or any paid
infrastructure — everything runs on localhost.
