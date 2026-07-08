# Simple Finance — Self-Hosted Finance Tracker

Simple Finance is a modern, self-hosted personal finance tracking application designed with a premium dark-mode interface (inspired by Selvault Finance). It is built using the latest modern web technologies: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Prisma ORM, and PostgreSQL.

---

## 🚀 Quick Start with Docker

The entire stack (application + database) is containerized and ready to run.

### 1. Configure Environment
Clone the `.env.example` file and create `.env`:
```bash
cp .env.example .env
```
Ensure you update the `AUTH_SECRET` inside the `.env` file with a secure random key. You can generate one with:
```bash
openssl rand -base64 32
```

### 2. Start Services
Run Docker Compose to build and start the application and PostgreSQL containers:
```bash
docker compose up -d --build
```
This starts:
- **PostgreSQL Database** container at port `5432` (with healthcheck enabled)
- **Next.js Standalone App** container running at port `3000` (builds after database healthcheck returns success)

### 3. Initialize Database Schemas & Seed Demo Data
Once the containers are up and running, trigger database migrations and load the mock statements:
```bash
# Run migrations
docker compose exec app npx prisma migrate deploy

# Seed demo statements and accounts
docker compose exec app npx prisma db seed
```
Now open [http://localhost:3000](http://localhost:3000) and sign in using the seeded demo credentials:
* **Email**: `demo@simplefinance.app`
* **Password**: `password123`

---

## 🛠️ Local Development (Without Docker App container)

If you wish to run the Next.js app locally with hot reloading while using a Dockerized database:

1. **Spin up database only**:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```
2. **Install Node dependencies**:
   ```bash
   npm install
   ```
3. **Generate Prisma Client & Run Migrations**:
   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```
4. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) inside your browser.

---

## 📁 Architecture Overview

```
simple-finance/
├── prisma/
│   ├── schema.prisma           # Data schema defining 16 normalized tables
│   └── seed.ts                 # Database seeder (HDFC/ICICI accounts, 30 days history)
├── src/
│   ├── app/
│   │   ├── (auth)/             # Login, Signup pages
│   │   ├── (dashboard)/        # Main dashboard pages (home, accounts, transactions)
│   │   └── api/                # Next.js Route handlers (REST endpoints)
│   ├── components/
│   │   ├── dashboard/          # Recharts visualization modules
│   │   ├── layout/             # Sidebar, Mobile navigation drawer, Top Navbar
│   │   └── shared/             # Currency input, empty states, loading skeletons
│   ├── hooks/                  # Debouncing and media query hooks
│   └── lib/
│       ├── auth.ts             # Auth.js v5 credentials configuration
│       ├── prisma.ts           # Singleton Prisma client instance
│       └── format.ts           # Compact Currency (INR) and date formatters
├── Dockerfile                  # Optimized multi-stage build running node:20-alpine
├── docker-compose.yml          # Production docker configuration
└── docker-compose.dev.yml      # Development postgres-only docker configuration
```

---

## 🔐 Security Features
- **Session Management**: Secure JSON Web Tokens (JWT) using NextAuth / Auth.js v5.
- **Password Hashing**: Secure salted hashes using `bcryptjs` with round strength of 12.
- **Double Entry Atomic Actions**: Balance changes on account ledgers are computed inside atomic Prisma transactions to prevent corrupt states during creations, updates, or deletions.
