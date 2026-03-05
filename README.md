# Taible : AI-Powered Tactical Football Coaching

Taible is an AI-powered football coaching platform that transforms natural-language drill descriptions into **animated 3D tactical visualisations** with optional voice-over narration.

> Describe a drill in plain English (or any language) → get an interactive pitch animation + audio coaching narration.

---

## ✨ Features

| Feature | Description |
|---|---|
| **AI Drill Generation** | Describe a drill in natural language and Mistral AI produces a precise JSON schema governing player & ball movements on a 105 × 68 pitch. |
| **60 FPS Smooth Animation** | Key-frame phases are interpolated at 60 FPS with smooth-step easing and automatic ball-snap to the nearest receiver. |
| **Voice Narration** | ElevenLabs text-to-speech generates a coach voice-over directly from the drill narration. |
| **Video Export** | Drills can be exported as video files via MoviePy. |
| **Player Management** | Browse and manage player profiles with position-specific attributes. |
| **Collections & Brainstorm** | Organise drills into collections and brainstorm new tactical ideas through an AI-assisted chat. |
| **Speech-to-Text** | Dictate drills with the built-in STT endpoint. |
| **Multi-language Support** | Narration can be generated in any language specified by the user. |

---

## 🏗️ Project Structure

```
mistral/
├── backend/                  # FastAPI backend
│   ├── main.py               # App entry-point, router registration
│   ├── requirements.txt      # Python dependencies
│   ├── api/                  # Route handlers
│   │   ├── generate.py       # POST /api/generate — drill generation pipeline
│   │   ├── drills.py         # Drill CRUD
│   │   ├── collections.py    # Drill collections
│   │   ├── brainstorm.py     # AI brainstorm chat
│   │   ├── players.py        # Player profiles
│   │   ├── export.py         # Video / data export
│   │   ├── stt.py            # Speech-to-text
│   │   ├── auth.py           # JWT authentication
│   │   └── schemas.py        # Pydantic request/response models
│   ├── services/             # Business logic
│   │   ├── mistral_service.py    # Mistral AI integration & interpolation script
│   │   ├── elevenlabs_service.py # ElevenLabs TTS
│   │   ├── video_service.py      # Video rendering via MoviePy
│   │   └── stt_service.py        # Speech-to-text service
│   ├── core/                 # Configuration
│   └── db/                   # SQLAlchemy models & database setup
├── frontend/                 # Lightweight HTML dashboard & drill library
│   ├── dashboard.html / .js
│   └── library.html / .js
├── taible-frontend/          # React + Vite SPA (Tailwind CSS v4)
│   ├── src/
│   └── package.json
├── .env                      # Environment variables (do NOT commit)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+** & npm
- API keys for **Mistral AI** and **ElevenLabs**

### 1. Clone the repository

```bash
git clone <repo-url>
cd mistral
```

### 2. Configure environment variables

Copy `.env.example` (or create `.env`) at the project root:

```env
MISTRAL_API_KEY=your_mistral_key
ELEVEN_LABS_API_KEY=your_elevenlabs_key
SECRET_KEY=your_jwt_secret
DATABASE_URL=your_database_url
CORS_ORIGINS=http://localhost:5173,http://localhost:8001
ENVIRONMENT=development
```

### 3. Backend setup

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8001
```

The API will be available at **http://localhost:8001**. Interactive docs are served at `/docs`.

### 4. Frontend setup (React)

```bash
cd taible-frontend
npm install
npm run dev
```

The React app will be available at **http://localhost:5173**.

---

## 🔑 API Highlights

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/generate/` | Generate a drill from a text prompt |
| `GET` | `/api/drills/` | List saved drills |
| `GET` | `/api/players/` | List player profiles |
| `POST` | `/api/brainstorm/` | AI brainstorm session |
| `POST` | `/api/stt/` | Speech-to-text transcription |
| `POST` | `/api/export/` | Export drill as video |

Full OpenAPI schema: **http://localhost:8001/docs**

---

## 🛠️ Tech Stack

- **Backend:** FastAPI · SQLAlchemy · Pydantic · Mistral AI · ElevenLabs · MoviePy
- **Frontend:** React 19 · Vite · Tailwind CSS v4 · Lucide Icons · React Router
- **Database:** PostgreSQL (Neon) / SQLite (local dev)

---

## 📄 License

This project was built for the **Mistral AI Hackathon**.
