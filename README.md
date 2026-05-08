# 🧑‍🤝‍🧑 Civis

**Civis** is a self-hosted people management application with integrated AI-powered face recognition. Manage persons, organize them into groups, map their relationships, and identify them via facial recognition — all running locally in Docker.

---

## ✨ Features

- 📋 **People Management** — Create, view, update, and delete person profiles with photos
- 👥 **Groups** — Organize people into hierarchical groups with nested subgroups
- 🔗 **Relationships** — Bidirectional relationship links (family, partner, social) with automatic reverse-role calculation
- 🧠 **Face Recognition** — Identify persons from images using InsightFace (ArcFace)
- 📷 **Face Scanner** — Live camera-based face scanning and identification
- 🔄 **Immich Integration** — Sync person photos from an [Immich](https://immich.app/) instance
- 🕸️ **Network Graph** — Interactive visualization of relationships between persons
- 🔍 **Search** — Real-time search across the entire database
- 🔐 **Auth & Roles** — JWT-based login with role-based access (Admin, Editor, Viewer)
- 🐳 **Docker-first** — Fully containerized; runs on any Docker-capable host

---

## 🏗️ Architecture

| Service     | Description                            | Port  |
|-------------|----------------------------------------|-------|
| `client`    | Frontend web interface (React)         | 10000 |
| `server`    | REST API backend (Node.js / Express)   | 5005  |
| `db`        | PostgreSQL database                    | 5432  |
| `face-ai`   | Face recognition (InsightFace)         | —     |

```
┌─────────────┐        ┌─────────────┐
│   Browser   │──────▶│   Client    │  :10000
└─────────────┘        └──────┬──────┘
                              │
                     ┌────────▼────────┐
                     │     Server      │  :5005
                     └──┬──────────┬──┘
                        │          │
               ┌────────▼──┐  ┌────▼────────┐
               │ PostgreSQL│  │  Face-AI    │
               └───────────┘  └─────────────┘
```

---

## 🛠️ Tech Stack

| Layer      | Technology                                                              |
|------------|-------------------------------------------------------------------------|
| Frontend   | React 19, Tailwind CSS, Framer Motion, Vite                            |
| Backend    | Node.js, Express, JWT, Sharp, Multer                                   |
| Database   | PostgreSQL 15                                                          |
| AI Service | Python, FastAPI, InsightFace (buffalo_l / ArcFace)                     |
| DevOps     | Docker, Docker Compose, GitHub Actions                                 |

---

## 🚀 Quick Start

```bash
git clone https://github.com/JuCraft0/Civis.git
cd Civis
docker compose up -d
```

- **UI:** http://localhost:10000
- **API:** http://localhost:5005

---

## 📜 License

All rights reserved by [JuCraft0](https://github.com/JuCraft0).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/JuCraft0">JuCraft0</a>
</p>
