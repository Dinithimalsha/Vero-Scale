# VeroScale
> **Stop Managing by Gut Feel. Start Leading by Algorithm.**

VeroScale is the first Enterprise Operating System (EOS) that operationalizes **Algorithmic Leadership**. We bridge the gap between engineering reality and business strategy, giving you a "Live Ledger" for your entire company's physics.

---

## The Problem: Enterprise Drift
Most companies drift because Engineering and Finance speak different languages.
*   **Engineering** measures Velocity (Story Points).
*   **Finance** measures Burn (Dollars).
*   **Result**: No one measures Truth.

## The Solution
VeroScale applies the physics of manufacturing to the chaos of software:

1.  **Toyota Efficiency for SaaS**: We apply Heijunka (level-loading) and Jidoka (automation) to software delivery.
2.  **Unit Economics Native**: We don't just track costs; we track the ROI of every commit.
3.  **Governance as Code**: We automate IP assignment and vesting. If the code isn't clean, the legal docs aren't signed.

---

## � Business Modules

### 1. The Operator (Efficiency)
*   **Digital Heijunka**: Stop burnout and bottlenecks. We level-load your engineering capacity automatically based on real velocity, not wishful thinking.
*   **Jidoka/Andon Cord**: When a build breaks, the pipeline locks. We force "swarm" behavior to fix quality issues instantly, reducing MTTR (Mean Time To Recovery).

### 2. The Controller (Financial Truth)
*   **Live Ledger**: Move beyond simple P&L. Track **LTV:CAC** ratios in real-time. Know exactly when you hit the "Rule of 40."
*   **Vesting Engine**: Automate the "cliff." If a founder or employee isn't performing, the system flags the equity risks *before* they vest.

---

## 🏗️ Engineered for Scale
VeroScale isn't just a dashboard; it's a **Modular Monolith** designed for strict boundary enforcement. We treat your business logic with the same rigor as mission-critical infrastructure.

*   **Maker vs. Manager Mode**: A UI that respects your flow. Deep work mode (🌙) for builders; command center (☀️) for leaders.
*   **Strict Boundaries**: Finance cannot import Operations directly. This ensures your financial data remains the "Source of Truth," uncorrupted by operational noise.

---

## 🛠️ Under the Hood (Technical Validation)
Built on a modern, type-safe stack for maximum reliability.

| Layer | Technology | Why? |
|-------|------------|------|
| **Core** | Node.js 20 LTS & TypeScript 5 | End-to-end type safety prevents runtime errors. |
| **Data** | PostgreSQL 16 + Prisma | ACID compliance ensures ledger integrity. |
| **Arch** | Hexagonal (Ports & Adapters) | Domain isolation allows modules to evolve independently. |

---

## � Get Algorithmic
VeroScale is currently in **Private Beta**.

*   **Deploy the MVP**: See the "Developer Preview" below to audit our code quality.
*   **Book a Demo**: [Contact Sales](mailto:sales@veroscale.ai)
*   **Connect**: Follow the "Live Ledger" journey on LinkedIn.

---

## 👨‍💻 Developer Preview (Run Locally)
Want to audit the architecture? Use this quick start guide.

### Prerequisites
*   Node.js 20+
*   PostgreSQL 16+

### Installation
```bash
# Clone repository
git clone https://github.com/Dinithimalsha/Vero-Scale.git
cd "d:\Vero Scale"

# Install dependencies
npm install

# Set up environment
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your database URL

# Generate Prisma client
npm run db:generate --workspace=@veroscale/backend

# Run database migrations
npm run db:migrate --workspace=@veroscale/backend

# Seed sample data
npm run db:seed --workspace=@veroscale/backend

# Start development servers
npm run dev
```

### Access
*   **Frontend**: http://localhost:5173
*   **Backend API**: http://localhost:3001
*   **Health Check**: http://localhost:3001/health

---
*VeroScale: From Latin "Vero" (truth) and English "Scale".*
