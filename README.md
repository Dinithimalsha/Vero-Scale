# VeroScale

**The Unified Enterprise Operating System for Algorithmic Leadership**

> *"The machine must be built to build the machine."*

VeroScale bridges the ontological gap between deterministic engineering and probabilistic enterprise management. It is a comprehensive EOS designed specifically for the technical mind, operationalizing "Algorithmic Leadership" through Toyota Production System principles, SaaS unit economics, and structured governance.

---

## 🏗️ Architecture

**Modular Monolith** - Strict module boundaries with single deployment simplicity.

```
veroscale/
├── packages/
│   ├── backend/           # Node.js/TypeScript API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── operations/    # Heijunka, Jidoka, Muda
│   │   │   │   ├── finance/       # Unit Economics, Ledger
│   │   │   │   ├── legal/         # IP Airlock, Vesting
│   │   │   │   ├── strategy/      # MECE, 7S (Phase 3)
│   │   │   │   └── human-capital/ # Topgrading (Phase 4)
│   │   │   └── integrations/      # GitHub, Slack, DocuSign
│   │   └── prisma/                # Database schema
│   └── frontend/          # React/Vite UI
│       └── src/
│           ├── components/
│           │   ├── layout/        # Dual-Mode Shell
│           │   ├── operations/    # Heijunka Board, Andon
│           │   ├── finance/       # J-Curve, Unit Economics
│           │   └── legal/         # IP Airlock, Vesting
│           └── stores/            # Zustand state
└── package.json           # Monorepo root
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- pnpm or npm

### Installation

```bash
# Clone repository
cd "d:\Vero Scale"

# Install dependencies
npm install

# Set up environment
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your database URL and secrets

# Generate Prisma client
npm run db:generate --workspace=@veroscale/backend

# Run database migrations
npm run db:migrate --workspace=@veroscale/backend

# Seed sample data
npm run db:seed --workspace=@veroscale/backend

# Start development servers
npm run dev
```

Access:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

---

## 📦 Core Modules

### Phase 1: The Operator (Current)

| Module | Features |
|--------|----------|
| **Digital Heijunka** | Velocity-based capacity, Product mix control (Feature/Bug/Debt), WSJF prioritization |
| **Jidoka/Andon** | Pipeline lock on failure, MTTR tracking, Slack swarming, GitHub webhook integration |
| **IP Airlock** | PIIAA gatekeeper, DocuSign integration, Access enforcement |
| **Vesting Engine** | Cliff alerts, 83(b) tracking, Single/double trigger acceleration |

### Phase 2: The Controller (Planned)

| Module | Features |
|--------|----------|
| **Live Ledger** | Plaid integration, ML categorization, COGS/OPEX distinction |
| **Unit Economics** | CAC/LTV calculator, J-Curve, Rule of 40, Insolvency alerts |

---

## 🎨 UI Modes

VeroScale respects the **Maker/Manager dichotomy**:

- **Maker Mode** 🌙: Minimal UI, focus protection, reduced notifications
- **Manager Mode** ☀️: Full dashboard, real-time metrics, command center

Toggle via the mode switch in the sidebar.

---

## 🔌 API Endpoints

### Operations

```
GET  /api/operations/velocity/:orgId      # Rolling velocity metrics
GET  /api/operations/pitches/:orgId       # List production pitches
POST /api/operations/pitches              # Create pitch
POST /api/operations/tasks/assign         # Assign task (capacity enforced)
GET  /api/operations/health/:orgId        # System health status
POST /api/operations/andon/trigger        # Manual Andon trigger
```

### Finance

```
POST /api/finance/unit-economics/calculate  # Store snapshot
GET  /api/finance/unit-economics/health/:orgId    # LTV:CAC gauge
GET  /api/finance/unit-economics/j-curve/:orgId   # J-Curve data
GET  /api/finance/unit-economics/rule-of-40/:orgId
```

### Legal

```
GET  /api/legal/ip-airlock/check/:userId  # Access permission
POST /api/legal/ip-airlock/agreements     # Create agreement
GET  /api/legal/vesting/alerts/:orgId     # Cliff & 83(b) alerts
POST /api/legal/vesting/grants            # Create grant
```

---

## 🔐 Module Boundary Enforcement

Run dependency analysis to prevent "Big Ball of Mud":

```bash
npm run lint:deps --workspace=@veroscale/backend
```

Rules enforced:
- Operations ↔ Finance: No direct imports (use internal APIs)
- Legal module: Isolated from others
- Human Capital feedback: Privacy protected

---

## 📊 Test Scenarios (Seed Data)

After seeding, test these scenarios:

| Scenario | Expected Behavior |
|----------|-------------------|
| `contractor@external.com` IP check | Returns `PENDING` - access blocked |
| `dev@acme.com` cliff check | Alert: 29 days to approval |
| LTV:CAC gauge | Shows `5.83:1` - GREEN |
| Rule of 40 | Shows `35` - NEEDS_ATTENTION |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 LTS |
| Language | TypeScript 5.x |
| Backend | Express.js |
| Database | PostgreSQL 16 + Prisma |
| Frontend | React 18 + Vite |
| State | Zustand |
| Charts | Recharts |
| Validation | Zod |

---

## 📄 License

Proprietary - All Rights Reserved

---

*VeroScale: From Latin "Vero" (truth) and English "Scale" - the pursuit of absolute truth in business metrics.*
