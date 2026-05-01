# 🧑‍🤝‍🧑 Civis

**Civis** is a self-hosted people management application with integrated face recognition. It allows you to manage a database of persons, organize them into groups, assign relationships, and identify them via AI-powered facial recognition — all running locally in Docker.

---

## ✨ Features

- 📋 **People Management** — Create, view, update, and delete person profiles
- 👥 **Groups** — Organize people into custom groups
- 🔗 **Relationships** — Assign and manage partner/relationship links between persons
- 🧠 **Face Recognition** — Identify persons from images using an AI-powered face recognition service (DeepFace)
- 🐳 **Docker-first** — Fully containerized; runs on any Docker-capable host (e.g. ZimaOS, a home server, or a VPS)
- 🔄 **CI/CD via GitHub Actions** — Images are automatically built and pushed to Docker Hub on every push

---

## 🏗️ Architecture

Civis consists of four services orchestrated via Docker Compose:

| Service     | Description                              | Port  |
|-------------|------------------------------------------|-------|
| `client`    | Frontend web interface                   | 10000 |
| `server`    | REST API backend (Node.js)               | 5005  |
| `db`        | PostgreSQL database                      | 5432  |
| `face-ai`   | Face recognition service (DeepFace)      | —     |

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

## 🚀 Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)

### Run with Docker Compose

```bash
git clone https://github.com/JuCraft0/Civis.git
cd Civis
docker compose up -d
```

Then open your browser:

- **Client (UI):** http://localhost:10000
- **Server API:** http://localhost:5005

---

## 🐳 Docker Hub

Pre-built images are available on Docker Hub under the [`jucraft0`](https://hub.docker.com/u/jucraft0) namespace and are updated automatically via GitHub Actions on every push to `main`.

---

## 🗄️ Database

Civis uses **PostgreSQL** as its database. The schema is managed via migration scripts included in the repository.

To manually check or repair the database, utility scripts are provided at the root level:

| Script               | Purpose                                      |
|----------------------|----------------------------------------------|
| `check_db.js`        | Verify database connectivity                 |
| `check_schema.js`    | Inspect current schema                       |
| `check_users.js`     | List existing users                          |
| `migrate_db.js`      | Run database migrations                      |
| `fix_db.js`          | Apply fixes to the database                  |
| `fix_admin.js`       | Reset or repair the admin account            |
| `debug_user_creation.js` | Debug user creation issues              |

Run any script with Node.js:

```bash
node check_db.js
```

---

## 🧠 Face Recognition

The face recognition service is powered by **[DeepFace](https://github.com/serengil/deepface)**. It runs as a separate container and is called internally by the server.

> **Note:** For CPU-only deployments with limited RAM (e.g. ~5 GB), the `opencv` detector backend is recommended for best performance.

---

## 📁 Project Structure

```
Civis/
├── client/           # Frontend (web UI)
├── server/           # Backend API (Node.js)
├── docker/           # Docker-related configs
├── docker-compose.yml
├── .dockerignore
├── .gitignore
├── *.js              # DB utility & test scripts
└── README.md
```

---

## ⚙️ Development

### Windows (Local Dev)

A `start_app.bat` script is included for quickly starting the application on Windows without Docker:

```bat
start_app.bat
```

### Testing

A suite of test scripts is provided for API and integration testing:

```bash
node test_create_person.js
node test_get_person.js
node test_list_people.js
node test_groups.js
node test_assign_partner.js
node test_unassign_partner.js
node test_api_response.js
node test_api_sim.js
node test_db_insert.js
```

---

## 🔧 Configuration

Environment variables can be configured in `docker-compose.yml` or via a `.env` file. Key variables include database credentials and service URLs.

---

## 📜 License

This project is currently unlicensed. All rights reserved by [JuCraft0](https://github.com/JuCraft0).

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/JuCraft0">JuCraft0</a>
</p>
