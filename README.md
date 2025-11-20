# WhatsApp Marketing Automation Flow Builder

A scalable flow automation system enabling visual workflow creation with conditional logic, time delays, and parallel execution.

## Demo

Watch the live demo: [https://www.loom.com/share/41e036f912ef435fa448fc49947766e6](https://www.loom.com/share/41e036f912ef435fa448fc49947766e6)

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm

## Quick Start

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts MongoDB (port 27017) and Redis (port 6379).

### 2. Install Dependencies

```bash
npm run install:all
```

### 3. Start Backend

```bash
cd backend
npm run start:dev
```

Backend runs on `http://localhost:3000`

### 4. Start Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:3001`


### Build Production
```bash
npm run build:all
```

### Environment Variables

These are the default values hardcoded in the code.

Backend (`.env` in `backend/`):
```
MONGODB_URI=mongodb://localhost:27017/flow-builder
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=3000
```

Frontend (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Project Structure

```
├── backend/              # NestJS API server
│   ├── src/
│   │   ├── flows/        # Flow management & execution engine
│   │   └── mock-services/# Mock external services
│   └── dist/             # Compiled output
├── frontend/             # Next.js React app
│   ├── app/              # App router pages
│   └── components/       # React Flow components
└── docker-compose.yml    # Infrastructure setup
```

