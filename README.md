# 💸 KharchaSense — Smart Expense & Anomaly Tracker

> A full-stack, three-tier expense intelligence web application that helps you track recurring expenses, analyze spending patterns, bulk import data via CSV, and automatically detect anomalous transactions using backend statistical methods.

---

## 📋 Table of Contents

- [Project Description](#-project-description)
- [Phase 1 vs Phase 2 Comparison](#-phase-1-vs-phase-2-comparison)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Project Flow](#-project-flow)
- [REST API Reference](#-rest-api-reference)
- [Directory Structure](#-directory-structure)
- [Getting Started](#-getting-started)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security & Authentication](#-security--authentication)
- [Deployment & Cloud Infrastructure](#-deployment--cloud-infrastructure)
- [Demo Account](#-demo-account)
- [Team Contributions](#-team-contributions)

---

## 📖 Project Description

**KharchaSense** is a full-stack financial intelligence application built on a modern **three-tier MVC architecture** (Presentation, Application, and Data layers). Originally prototyped as a client-side Single Page Application (Phase 1), KharchaSense has now been completely re-engineered in **Phase 2** into an enterprise-ready, production-capable web platform.

The presentation layer is crafted using **HTML5, Vanilla CSS3, and ES6+ JavaScript** with native HTML5 Canvas charts — entirely free of heavyweight JavaScript frameworks. The application layer is powered by a robust **Node.js and Express.js REST API**, featuring stateless **JSON Web Token (JWT)** authentication, **bcryptjs** password encryption, and dedicated micro-services for statistical anomaly detection and trend analytics. All data is persisted in a cloud-hosted **MongoDB Atlas** database managed through strict **Mongoose** object-data modeling schemas with per-user data isolation.

### Key Features

| Feature | Description |
|---|---|
| 🔐 **Multi-User Authentication** | Secure user registration and login powered by salted `bcryptjs` password hashing and signed JWT bearer tokens |
| ➕ **Transaction CRUD** | Full RESTful lifecycle (Create, Read, Update, Delete) persisted to MongoDB Atlas with per-user ownership scoping |
| 📥 **CSV Bulk Import** | Upload `.csv` files to batch-import transactions with RFC 4180 parsing, schema validation, and skipped-row reporting |
| 📄 **Sample Template** | One-click instant generation and download of a standardized `sample_transactions_template.csv` file |
| 📊 **Backend Analytics Engine** | Server-side calculation of total expenditure, category distributions, monthly trajectories, and recurring obligations |
| ⚠️ **Statistical Anomaly Detection** | Category-level statistical Z-score outlier detection engine ($|Z| \ge 2.0$) with low-sample and zero-variance safeguards |
| 🔁 **Recurring Expense Tracking** | Automated detection, aggregation, and proportion tracking for scheduled commitments (rent, utilities, subscriptions) |
| 📅 **Dynamic Date Range Filtering** | Global navigation date picker supporting presets (This Month, Last 30 Days, Last 90 Days, This Year) and custom dates |
| 🔍 **Multi-Parameter Search** | Search and filter transactions by category, amount threshold, recurrence type, and anomaly status |
| 📶 **Offline Connection Feedback** | Real-time backend connectivity detection, non-destructive error handling, preserved form state, and retry prompts |
| 📱 **Responsive Vanilla UI** | Sleek dark-mode interface with glassmorphism, responsive navigation drawer, fluid CSS grid, and micro-animations |
| 📈 **Native Canvas Visualizations** | Custom HTML5 `<canvas>` charts (Line, Bar, and Donut) drawn dynamically without external charting packages |
| 🌐 **Interactive Landing Page** | High-converting landing page with 3D-styled interactive mockups, feature overviews, and direct dashboard handoff |

---

## ⚖️ Phase 1 vs Phase 2 Comparison

KharchaSense underwent a foundational architectural transformation from Phase 1 to Phase 2. The table below outlines the core differences:

| Dimension | Phase 1 (Client-Side Prototype) | Phase 2 (Full-Stack Production System) |
|---|---|---|
| **Architecture** | 1-Tier monolithic Single Page Application (SPA) | 3-Tier decoupled architecture (Presentation, Application, Data) |
| **Authentication** | Client-side plaintext user objects stored in `localStorage` | Cryptographic JWT Bearer tokens + 10-round salted `bcryptjs` hashing |
| **Data Persistence** | Browser `localStorage` (device-bound, easily cleared) | Cloud database on **MongoDB Atlas** via strict **Mongoose** schemas |
| **Transaction CRUD** | In-memory array manipulation writing directly to browser storage | RESTful Express API endpoints (`/api/transactions`) with schema validation |
| **Data Isolation** | Client-side key prefixing (`expense_tracker_transactions_${id}`) | Server-side query scoping (`req.user.id`) enforced by authentication middleware |
| **Analytics Processing** | Client-side JavaScript array reducers and loops in browser | Dedicated backend `analyticsService` providing aggregated summaries and trends |
| **Anomaly Detection** | Local JavaScript Z-score loop executed in browser memory | Centralized backend `anomalyService` executing robust statistical algorithms |
| **Security & Headers** | None (client-side only, vulnerable to XSS and token tampering) | Protected by **Helmet** security headers, **CORS** origin whitelisting, and JWT guards |
| **Offline Resilience** | Implicit local storage writes without backend synchronization | Network state awareness, persistent form buffers, error banners, and reconnect hooks |
| **Deployment** | Static file hosting only | Cloud-native multi-tier: Backend on **Render**, Database on **Atlas**, Frontend on **Netlify** |

---

## 🛠️ Tech Stack

KharchaSense is engineered with zero frontend framework dependencies, prioritizing pure web platform standards and high performance.

| Tier / Layer | Technology | Version / Spec | Purpose & Details |
|---|---|---|---|
| **Presentation** | HTML5 | Semantic HTML5 | Accessible modal dialogs, semantic markup, SVG icons, and SEO metadata |
| **Styling** | Vanilla CSS3 | CSS3 Modules | Custom CSS variables (design tokens), Flexbox, CSS Grid, glassmorphism, and responsive `dvh` units |
| **Client Logic** | Vanilla JavaScript | ES6+ Modules | Native `fetch` API, ES module imports/exports, DOM event delegation, Blob downloads, FileReader |
| **Data Visualization** | HTML5 Canvas API | Native Canvas 2D | Custom-rendered line graphs, bar charts, and donut charts with zero external charting libraries |
| **Application Server** | Node.js | `>= 20.0.0` | Asynchronous, event-driven server-side JavaScript runtime |
| **Web Framework** | Express.js | `^5.0.0` | Next-generation Express framework with native async route handling, centralized error routing |
| **Database** | MongoDB Atlas | AWS Cloud M0 | Highly available cloud NoSQL document store with replica sets and automated backups |
| **Data Modeling (ODM)** | Mongoose | `^8.10.0` | Schema definition, validation rules, lifecycle hooks, compound indexing, and query isolation |
| **Authentication** | JSON Web Tokens | `^9.0.2` | Stateless `jsonwebtoken` authentication signing and token verification middleware |
| **Password Encryption** | bcryptjs | `^2.4.3` | One-way cryptographic salted hashing (10 salt rounds) for password security |
| **Security Headers** | Helmet | `^8.0.0` | Sets standard HTTP security headers (CSP, X-Content-Type-Options, Strict-Transport-Security) |
| **Cross-Origin Security** | CORS | `^2.8.5` | Dynamic cross-origin resource sharing middleware restricting access to trusted frontend origins |
| **Environment Config** | dotenv | `^16.4.7` | Secure environment variable injection from `.env` configuration files |
| **Development Tooling** | nodemon | `^3.1.9` | Automated server restarts during local backend development |
| **Test Suite** | Node.js Test Runner | Native `node --test` | High-performance, zero-dependency unit, integration, and persistence test runner |
| **Backend Hosting** | Render | Cloud Web Service | Continuous deployment web service hosting the Node.js/Express REST API |
| **Frontend Hosting** | Netlify | Global CDN | Global static asset hosting for responsive presentation layer |

> 📌 **Design Philosophy Note:** KharchaSense intentionally avoids React, Vue, Angular, Svelte, Tailwind CSS, or heavyweight chart packages (e.g., Chart.js, D3). All UI state management, reactivity, DOM mutations, and canvas renderings are hand-crafted to demonstrate foundational mastery of standard web technologies.

---

## 🏗️ Project Architecture

KharchaSense implements an enterprise-grade **Three-Tier Model-View-Controller (MVC)** architecture. The system cleanly decouples presentation, application business logic, and cloud data persistence.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER (Frontend)                         │
│   frontend/index.html • CSS (main.css, landing.css, auth.css, components.css)    │
│   Vanilla JS Modules:                                                            │
│   ├── UI Components: navigation.js, dashboard.js, transactionTable.js,           │
│   │                  analyticsView.js, anomalyView.js, authModal.js, forms.js    │
│   ├── Visualizations: charts.js (Native HTML5 <canvas> — Line, Bar, Donut)       │
│   └── API Client: apiClient.js, analyticsApiClient.js (Fetch API + JWT Bearer)   │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTPS / REST API Calls
                                         │ Header: Authorization: Bearer <jwt_token>
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                           APPLICATION LAYER (Backend API)                        │
│   Node.js (v20+) • Express.js (v5.0.0) • MVC Architecture                        │
│   backend/server.js • backend/app.js                                             │
│                                                                                  │
│   ├── Middleware:                                                                │
│   │   ├── helmet (HTTP Security Headers) • cors (Origin Whitelisting)            │
│   │   ├── express.json() • express.urlencoded()                                  │
│   │   └── authMiddleware.js (JWT Verification & req.user Injection)              │
│   │                                                                              │
│   ├── Routes:                                                                    │
│   │   ├── /api/auth         → authRoutes.js (register, login, me)                │
│   │   ├── /api/transactions → transactionRoutes.js (CRUD & batch import)         │
│   │   ├── /api/analytics    → analyticsRoutes.js (summary, categories, trends)   │
│   │   ├── /api/anomalies    → anomalyRoutes.js (Z-score detection & summary)     │
│   │   └── /api/health       → Health check & uptime probe                        │
│   │                                                                              │
│   ├── Controllers:                                                               │
│   │   ├── authController.js        • transactionController.js                    │
│   │   ├── analyticsController.js   • anomalyController.js                        │
│   │                                                                              │
│   └── Business Logic & Statistical Services:                                     │
│       ├── analyticsService.js (Aggregation, category metrics, trend analysis)    │
│       └── anomalyService.js   (Statistical Z-score engine: Mean, StdDev, Outlier)│
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ Mongoose ODM (v8.10.0)
                                         │ Schema Validation & Query Scoping
┌────────────────────────────────────────▼─────────────────────────────────────────┐
│                              DATA LAYER (Database)                               │
│   MongoDB Atlas Cloud Cluster (Replica Set)                                      │
│                                                                                  │
│   ├── Database: kharchasense                                                     │
│   │   ├── users Collection                                                       │
│   │   │   └── Schemas: User.js (name, email, passwordHash, timestamps)           │
│   │   └── transactions Collection                                                │
│   │       └── Schemas: Transaction.js (user [Ref: User], title, amount,         │
│   │                                    category, date, isRecurring, timestamps)  │
│   │                                                                              │
│   └── Data Protection: Compound indexing & per-user query isolation             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Architectural Layer Responsibilities

| Layer | Component Modules | Core Responsibilities |
|---|---|---|
| **Presentation Layer** | `frontend/index.html`<br>`frontend/js/ui/*.js`<br>`frontend/js/analytics/charts.js` | Renders user views, handles user gestures and form submissions, dynamically paints native Canvas charts, and coordinates asynchronous requests via `apiClient.js`. |
| **API Client Layer** | `frontend/js/services/apiClient.js`<br>`frontend/js/services/analyticsApiClient.js` | Centralizes all `fetch()` communication with Express, injects stored JWT tokens into `Authorization` headers, detects offline failures, and dispatches connection status events. |
| **Routing Layer** | `backend/routes/*.js` | Routes HTTP requests to corresponding controller actions. Mounts canonical authentication guards (`protect`) on private resources. |
| **Middleware Layer** | `backend/middleware/authMiddleware.js`<br>`helmet`, `cors`, `express.json` | Validates JWT signatures, extracts user identifiers, injects authenticated user records into `req.user`, enforces CORS origin policies, and applies HTTP security headers. |
| **Controller Layer** | `backend/controllers/*.js` | Validates incoming request payloads, maps query parameters to business services, handles HTTP response codes, and coordinates Mongoose operations. |
| **Services Layer** | `backend/services/analyticsService.js`<br>`backend/services/anomalyService.js` | Implements mathematical and business rules: Category breakdowns, monthly time-series, recurring detection, and pure statistical Z-score outlier calculations. |
| **Data Access Layer** | `backend/models/User.js`<br>`backend/models/Transaction.js`<br>`backend/config/db.js` | Manages persistent cloud connection to MongoDB Atlas, enforces schema types and required constraints, handles password pre-save salting, and guarantees strict query scoping. |

---

## 🔄 Project Flow

### 1. Application Boot & Lifecycle
```
DOMContentLoaded
  │
  ├── Token Discovery & Validation
  │     ├── Checks localStorage for stored session token ('kharchasense_token')
  │     └── If token exists:
  │           ├── apiClient.get('/api/auth/me') verifies session validity with backend
  │           └── Updates navbar with authenticated user initials and email
  │
  ├── UI Module Initialization
  │     ├── initNavigation()      → Binds sidebar drawer, view switcher, and return-to-landing
  │     ├── initDashboard()       → Resets overview metric cards and skeleton loaders
  │     ├── initAnalyticsView()   → Prepares Canvas chart containers and category breakdowns
  │     ├── initAnomalyView()     → Initializes anomaly threshold filters and table containers
  │     ├── initForm()            → Binds submit listeners on Add / Edit Transaction forms
  │     ├── initFilters()         → Binds multi-parameter category, amount, and status filters
  │     ├── initTransactionTable()→ Configures table row actions (edit, delete, pagination)
  │     ├── initDateRangePicker() → Binds global date range presets and custom picker dropdown
  │     ├── initCSVImport()       → Sets up drag-and-drop CSV parser and template generator
  │     └── initAuthModal()       → Binds Sign In / Sign Up tab controls and modal triggers
  │
  └── Initial Data Hydration (refreshApp())
        ├── GET /api/transactions?from=...&to=... → Loads user transactions from MongoDB
        ├── GET /api/analytics/summary           → Hydrates total expenditure & KPI metrics
        ├── GET /api/analytics/categories        → Populates Category Donut chart and breakdown
        ├── GET /api/analytics/trends            → Draws Monthly & Daily Spending Line chart
        ├── GET /api/analytics/recurring         → Populates Recurring Expense breakdown card
        ├── GET /api/anomalies                   → Renders flagged outlier transactions and badges
        └── Set connection status indicator: "Synced with server" (Green dot)
```

### 2. Authentication Flow
```
User Action: Submit Sign In or Create Account Form
  │
  ├── Client-Side Form Validation (Email format, password length >= 6 chars)
  │
  ├── HTTP POST Request:
  │     ├── Registration: POST /api/auth/register  { name, email, password }
  │     └── Login:        POST /api/auth/login     { email, password }
  │
  ├── Express Application Layer (authController.js)
  │     ├── Registration:
  │     │     ├── Check for existing user with same email (409 Conflict if found)
  │     │     ├── User Schema pre('save') hook salts and hashes password via bcryptjs (10 rounds)
  │     │     └── Mongoose creates new User document in MongoDB Atlas
  │     │
  │     └── Login:
  │           ├── User.findOne({ email }).select('+password') queries MongoDB Atlas
  │           ├── bcryptjs.compare(candidatePassword, user.password) checks hash
  │           └── Returns 401 Unauthorized if email or password invalid
  │
  ├── JWT Token Minting
  │     ├── jsonwebtoken signs payload { id: user._id } with JWT_SECRET
  │     └── Token signed with expiration window (e.g. 7 days)
  │
  ├── HTTP 200/201 Response
  │     └── Payload: { success: true, token: "ey...", user: { id, name, email } }
  │
  └── Frontend Session Activation
        ├── Stores token in localStorage ('kharchasense_token')
        ├── Injects token into apiClient default headers
        ├── Closes authentication modal with transition
        ├── Transitions view from Landing Page to Dashboard
        └── Invokes refreshApp() to load user's isolated data
```

### 3. Transaction CRUD Flow
```
User Action: Add, Edit, or Delete Transaction
  │
  ├── Frontend Action Handler (forms.js / transactionTable.js)
  │     ├── Normalizes inputs (converts amount to positive Float, standardizes ISO date)
  │     └── Selects API method:
  │           ├── Create: POST   /api/transactions
  │           ├── Update: PUT    /api/transactions/:id
  │           └── Delete: DELETE /api/transactions/:id
  │
  ├── API Client (apiClient.js)
  │     ├── Attaches HTTP Header: Authorization: Bearer <jwt_token>
  │     └── Executes fetch() to Express backend
  │
  ├── Express Router & Middleware (authMiddleware.protect)
  │     ├── Extracts Bearer token from Authorization header (rejects with 401 if missing)
  │     ├── jwt.verify() validates cryptographic signature against JWT_SECRET
  │     └── Injects verified user into request context: req.user = { id: decoded.id }
  │
  ├── Transaction Controller (transactionController.js)
  │     ├── CREATE: Instantiates Transaction with { ...body, user: req.user.id }
  │     ├── UPDATE: Validates ownership with findOneAndUpdate({ _id: id, user: req.user.id })
  │     ├── DELETE: Validates ownership with findOneAndDelete({ _id: id, user: req.user.id })
  │     └── Returns 404 Not Found if record does not exist or belongs to another user
  │
  ├── MongoDB Atlas Persistence
  │     └── Mongoose commits mutation to transactions collection
  │
  ├── HTTP Response (200 OK / 201 Created)
  │
  └── UI State Synchronization (refreshApp())
        ├── Updates local in-memory dataset
        ├── Re-fetches fresh analytics and anomaly statistics from backend
        ├── Re-renders table rows, metrics cards, and Canvas charts
        └── Displays success toast notification to user
```

### 4. CSV Bulk Import & Template Flow
```
User Action: "Import CSV" button clicked in Transactions view
  │
  ├── Hidden <input type="file" accept=".csv"> triggered
  ├── User selects a local .csv file
  ├── FileReader reads file contents as UTF-8 text
  │
  ├── Client-Side Parsing & Validation (csvImport.js)
  │     ├── Parses RFC 4180 comma-separated and quoted fields
  │     ├── Normalizes headers: title, amount, category, date, recurring
  │     ├── Validates each row:
  │     │     ├── Date format verified (YYYY-MM-DD)
  │     │     ├── Amount verified as positive float
  │     │     └── Category checked against recognized taxonomy
  │     └── Identifies invalid records and compiles skipped-row report
  │
  ├── Batch Submission to Backend
  │     └── POST /api/transactions/import
  │           Header: Authorization: Bearer <jwt_token>
  │           Body:   { transactions: [ { title, amount, category, date, isRecurring }, ... ] }
  │
  ├── Express Controller (transactionController.importTransactions)
  │     ├── Injects req.user.id into every validated transaction object
  │     ├── Filters intra-batch duplicate records
  │     ├── Executes atomic batch persistence: Transaction.insertMany(transactions)
  │     └── Returns { success: true, count: X, skipped: Y }
  │
  ├── UI Response
  │     ├── refreshApp() re-hydrates all metrics, charts, and table rows
  │     └── Toast Notification: "✓ Successfully imported X transactions (Y skipped)"
  │
  └── One-Click Sample Template Flow
        ├── User clicks "Download Template"
        ├── Generates standard CSV Blob: title,amount,category,date,recurring
        └── Prompts automatic download of sample_transactions_template.csv
```

### 5. Analytics & Visualization Flow
```
User Action: Date range altered (or Analytics tab selected)
  │
  ├── Global date range coordinates dispatched: { from: '2026-01-01', to: '2026-01-31' }
  │
  ├── Parallel Asynchronous Fetch via analyticsApiClient.js:
  │     ├── GET /api/analytics/summary?from=...&to=...
  │     ├── GET /api/analytics/categories?from=...&to=...
  │     ├── GET /api/analytics/trends?from=...&to=...
  │     └── GET /api/analytics/recurring?from=...&to=...
  │
  ├── Backend Analytics Processing (analyticsService.js)
  │     ├── Queries transactions filtered strictly by { user: req.user.id, date: { $gte, $lte } }
  │     ├── Computes KPI aggregations: Total spend, transaction count, average per transaction
  │     ├── Aggregates Category Breakdown: Category totals, frequency, and percentage of spend
  │     ├── Calculates Time-Series Trends: Daily spend array and monthly spend aggregations
  │     └── Aggregates Recurring Expenses: Committed subscription totals vs. discretionary spend
  │
  ├── JSON Payloads returned to client
  │
  └── Native HTML5 Canvas Rendering (charts.js)
        ├── Daily / Monthly Trend: Paints responsive multi-point smooth bezier line chart with grid lines
        ├── Category Distribution: Draws multi-segmented donut chart with interactive hover arcs
        ├── Recurring vs One-Off: Paints comparative dual-bar chart with currency markers
        └── Updates Overview KPI Cards: Total Spent, Daily Average, Top Category, Recurring Count
```

### 6. Statistical Anomaly Detection Engine (Z-Score)
```
Request: GET /api/anomalies (or /api/anomalies/summary)
  │
  ├── Controller queries user transactions from MongoDB Atlas:
  │     Transaction.find({ user: req.user.id, date: { $gte: from, $lte: to } })
  │
  ├── Execution in anomalyService.js:
  │     │
  │     ├── 1. Partition dataset by Category:
  │     │      { Groceries: [...], Subscriptions: [...], Dining: [...], Utilities: [...] }
  │     │
  │     ├── 2. Evaluate Baseline Validity per Category:
  │     │      - Requires at least MIN_BASELINE_COUNT = 3 records to evaluate an entry
  │     │      - If baseline count < 3: Transactions classified as normal (insufficient baseline)
  │     │
  │     ├── 3. Statistical Baseline Calculation:
  │     │      ├── Arithmetic Mean (μ):
  │     │      │     μ = ( ∑ amount ) / N
  │     │      │
  │     │      ├── Population Standard Deviation (σ):
  │     │      │     σ = √( [ ∑ (amount - μ)² ] / N )
  │     │      │
  │     │      └── Zero-Variance Safeguard:
  │     │             If σ === 0 (all transactions in category identical):
  │     │             Set Z-Score = 0 to prevent division by zero or false outlier flags
  │     │
  │     ├── 4. Individual Transaction Evaluation:
  │     │      For each transaction X with amount x_i:
  │     │      ├── Calculate Z-Score:
  │     │      │     Z = ( x_i - μ ) / σ
  │     │      │
  │     │      └── Outlier Classification:
  │     │             isAnomaly = |Z| >= ANOMALY_Z_THRESHOLD (2.0)
  │     │             severity  = |Z| >= 3.0 ? 'critical' : 'moderate'
  │     │
  │     └── 5. Dynamic Read-Time Output:
  │            Returns decorated array with { isAnomaly, zScore, categoryMean, categoryStdDev }
  │            (Note: Anomaly status is computed dynamically; no hardcoded flags are written to MongoDB)
  │
  └── Presentation in anomalyView.js:
        ├── Flags transaction rows in main table with warning indicator badges
        └── Populates dedicated Anomaly Insights table with Z-Scores, deviations, and amounts
```

### 7. Offline Detection & Network Resilience Flow
```
User Action: User interacts while Express backend or network connection is offline
  │
  ├── Fetch attempt to backend fails (TypeError: Failed to fetch / HTTP 5xx / Timeout)
  │
  ├── Resilience Pipeline (apiClient.js):
  │     ├── Catches network failure cleanly without crashing the runtime
  │     ├── Prevents silent fallback writes to localStorage (prevents stale / diverged state)
  │     └── Dispatches global 'api:connection-status' event: { online: false }
  │
  ├── UI Feedback Updates:
  │     ├── Top/Sidebar Connection Indicator: Switches to "Connection lost" (Red/Amber dot)
  │     ├── In-Memory State Protection: Preserves existing displayed transactions without wiping
  │     ├── Offline Banner: Displays #table-offline-banner above transaction table
  │     │     "Server disconnected. Viewing cached session data. New entries cannot be saved."
  │     ├── Form Buffer Retention: Add/Edit transaction modal retains inputs so user does not retype
  │     └── Disables state-altering submission buttons until connection is restored
  │
  ├── Reconnection & Retry Cycle:
  │     ├── User clicks "Retry Connection" button or automated ping polls GET /api/health
  │     └── When backend responds with 200 OK:
  │           ├── Connection Indicator updates to "Synced with server" (Green dot)
  │           ├── Offline banner automatically dismisses
  │           └── refreshApp() syncs all tables and charts directly from MongoDB Atlas
```

---

## 📡 REST API Reference

The KharchaSense backend exposes a standardized RESTful API structured around predictable JSON resource endpoints.

### Authentication & Headers
- All protected endpoints require a signed JWT token provided via the HTTP `Authorization` header:
  ```http
  Authorization: Bearer <your_jwt_token>
  ```
- All request and response bodies use `Content-Type: application/json`.

### Endpoints Overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/` | API service root information, version, and links | Public |
| `GET` | `/api/health` | Health check probe (uptime, timestamp, service health) | Public |
| `POST` | `/api/auth/register` | Register a new user account with hashed password | Public |
| `POST` | `/api/auth/login` | Authenticate existing user and receive JWT Bearer token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile details | Protected |
| `GET` | `/api/transactions` | Retrieve paginated transactions (supports `from`, `to`, `category`) | Protected |
| `POST` | `/api/transactions` | Create a new transaction record | Protected |
| `GET` | `/api/transactions/:id` | Retrieve a single transaction by its MongoDB ObjectId | Protected |
| `PUT` | `/api/transactions/:id` | Update an existing transaction record | Protected |
| `DELETE` | `/api/transactions/:id` | Delete a specific transaction record | Protected |
| `POST` | `/api/transactions/import` | Bulk import an array of pre-validated transactions | Protected |
| `POST` | `/api/transactions/bulk` | Alias endpoint for batch transaction import | Protected |
| `GET` | `/api/analytics/summary` | Summary KPIs (total spend, transaction counts, recurring ratio) | Protected |
| `GET` | `/api/analytics/categories` | Spending aggregated by category with percentages and counts | Protected |
| `GET` | `/api/analytics/trends` | Time-series data points (monthly and daily spending breakdown) | Protected |
| `GET` | `/api/analytics/recurring` | Recurring expenditure metrics and subscription commitments | Protected |
| `GET` | `/api/anomalies` | Retrieve transactions flagged as statistical anomalies ($|Z| \ge 2$) | Protected |
| `GET` | `/api/anomalies/summary` | High-level anomaly statistics, inspected count, and distribution | Protected |

---

### Request & Response Examples

#### 1. User Registration
`POST /api/auth/register`

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123"
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "673f1a2b9c4d5e6f7a8b9c0d",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "createdAt": "2026-10-27T10:15:30.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3M2YxYTJiOWM0ZDVlNmY3YThiOWMwZCIsImlhdCI6MTczMDAzNDUzMCwiZXhwIjoxNzMwNjM5MzMwfQ..."
  }
}
```

---

#### 2. User Login
`POST /api/auth/login`

**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "673f1a2b9c4d5e6f7a8b9c0d",
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3M2YxYTJiOWM0ZDVlNmY3YThiOWMwZCIsImlhdCI6MTczMDAzNDUzMCwiZXhwIjoxNzMwNjM5MzMwfQ..."
  }
}
```

---

#### 3. Create Transaction
`POST /api/transactions`  
*Header: `Authorization: Bearer <jwt_token>`*

**Request Body:**
```json
{
  "title": "Monthly Fiber Broadband",
  "amount": 999.00,
  "category": "Utilities",
  "date": "2026-10-27",
  "isRecurring": true
}
```

**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "id": "673f2c8d1e2f3a4b5c6d7e8f",
    "title": "Monthly Fiber Broadband",
    "amount": 999,
    "category": "Utilities",
    "date": "2026-10-27T00:00:00.000Z",
    "isRecurring": true,
    "user": "673f1a2b9c4d5e6f7a8b9c0d",
    "createdAt": "2026-10-27T10:30:00.000Z",
    "updatedAt": "2026-10-27T10:30:00.000Z"
  }
}
```

---

#### 4. Update Transaction
`PUT /api/transactions/673f2c8d1e2f3a4b5c6d7e8f`  
*Header: `Authorization: Bearer <jwt_token>`*

**Request Body:**
```json
{
  "title": "Monthly Fiber Broadband (Upgraded Speed)",
  "amount": 1199.00,
  "category": "Utilities",
  "isRecurring": true
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Transaction updated successfully",
  "data": {
    "id": "673f2c8d1e2f3a4b5c6d7e8f",
    "title": "Monthly Fiber Broadband (Upgraded Speed)",
    "amount": 1199,
    "category": "Utilities",
    "date": "2026-10-27T00:00:00.000Z",
    "isRecurring": true,
    "updatedAt": "2026-10-27T10:45:00.000Z"
  }
}
```

---

### Thunder Client / Postman Testing Guide

To test the KharchaSense REST API in **Thunder Client** (VS Code) or **Postman**:

1. **Obtain Token:** Send a `POST` request to `http://localhost:5000/api/auth/login` (or `/api/auth/register`) with the demo credentials. Copy the `data.token` string from the JSON response.
2. **Configure Authorization:** In Thunder Client or Postman, navigate to the **Auth** tab of any protected request (e.g. `GET /api/transactions`). Select **Bearer Token** from the dropdown and paste your token.
3. **Execute Protected Requests:** Send requests to `/api/transactions`, `/api/analytics/summary`, or `/api/anomalies`. The Express server verifies the signature via `authMiddleware.js` and securely scopes all operations to your account.

---

## 📁 Directory Structure

The KharchaSense repository adheres strictly to a clean, modular structure reflecting its 3-tier MVC architecture:

```
recurring-expense-anomaly-tracker/
├── README.md                          # Comprehensive technical documentation & project guide
│
├── backend/                           # Node.js + Express 5 Application Layer & REST API
│   ├── server.js                      # Application bootstrap & HTTP server entry point
│   ├── app.js                         # Express app configuration, security middleware, routing
│   ├── package.json                   # Backend dependencies, dev tools, and test runner scripts
│   ├── package-lock.json              # Deterministic dependency lockfile
│   ├── .env.example                   # Environment configuration template (PORT, MONGO_URI, JWT_SECRET)
│   ├── .gitignore                     # Ignores node_modules, local .env, coverage reports
│   │
│   ├── config/                        # Configuration Modules
│   │   └── db.js                      # MongoDB Atlas connection manager via Mongoose
│   │
│   ├── controllers/                   # MVC Controller Layer (HTTP Request Handlers)
│   │   ├── authController.js          # User registration, login, profile retrieval
│   │   ├── transactionController.js   # Transaction CRUD operations and CSV batch import
│   │   ├── analyticsController.js     # Summary KPIs, category aggregations, trend analytics
│   │   └── anomalyController.js       # Z-score statistical anomaly endpoints & summaries
│   │
│   ├── middleware/                    # Custom Express Middleware
│   │   └── authMiddleware.js          # JWT bearer token verification & user context injection
│   │
│   ├── models/                        # Mongoose Data Models & Schemas
│   │   ├── User.js                    # User account schema with bcrypt password hashing
│   │   └── Transaction.js             # Expense transaction schema with user references & indexes
│   │
│   ├── routes/                        # Express API Route Definitions
│   │   ├── authRoutes.js              # /api/auth route bindings
│   │   ├── transactionRoutes.js       # /api/transactions CRUD and batch routes
│   │   ├── analyticsRoutes.js         # /api/analytics endpoints
│   │   └── anomalyRoutes.js           # /api/anomalies endpoints
│   │
│   ├── services/                      # Core Business Logic & Mathematical Engines
│   │   ├── analyticsService.js        # KPI calculators, category aggregators, monthly time-series
│   │   └── anomalyService.js          # Pure statistical Z-Score outlier detection engine
│   │
│   └── tests/                         # Automated Backend Test Suite (Node.js Native Runner)
│       ├── auth.test.js               # Registration, bcrypt hashing, JWT validation tests
│       ├── transactions.test.js       # CRUD operations, pagination, date filtering, user isolation
│       ├── analytics.test.js          # Mathematical calculation and category breakdown tests
│       ├── anomaly.test.js            # Baseline rules, population std dev, Z-score boundary tests
│       ├── integration.smoke.test.js  # Route mounting, health probe, and 404 handler tests
│       ├── offline.feedback.test.js   # Network failure and connection status feedback tests
│       └── phase2.persistence.test.js # Multi-user isolation, token alternation, storage rules tests
│
├── frontend/                          # Presentation Layer (Vanilla Web Technologies)
│   ├── index.html                     # Single Page Application HTML shell & accessible dialogs
│   │
│   ├── css/                           # Vanilla CSS Design System
│   │   ├── main.css                   # Core styles, layout containers, responsive breakpoints
│   │   ├── landing.css                # Landing page presentation, hero mockups & animations
│   │   ├── auth.css                   # Glassmorphism authentication modal styling
│   │   ├── components.css             # Reusable buttons, badges, dropdowns, cards, banners
│   │   └── animations.css             # CSS keyframes, micro-interactions, smooth transitions
│   │
│   └── js/                            # Vanilla JavaScript Client Logic (ES Modules)
│       ├── app.js                     # Main client orchestrator & lifecycle manager
│       ├── landing.js                 # Landing page scroll observers & interaction logic
│       │
│       ├── services/                  # Network & Communication Layer
│       │   ├── apiClient.js           # Central Fetch API client with JWT headers & offline handling
│       │   ├── analyticsApiClient.js  # Dedicated API client for backend analytics & anomalies
│       │   ├── authService.js         # Authentication helpers and token session storage
│       │   ├── anomalyService.js      # Client-side statistical fallback helpers
│       │   └── dataService.js         # CSV RFC-4180 parsing and template generation
│       │
│       ├── state/                     # In-Memory State Management
│       │   └── transactionStore.js    # Reactive in-memory transaction store for UI rendering
│       │
│       ├── analytics/                 # Visualization Subsystem
│       │   ├── charts.js              # Native HTML5 Canvas charts (Line, Bar, Donut renderers)
│       │   └── analyticsService.js    # Client-side aggregation and formatting helpers
│       │
│       ├── ui/                        # DOM Renderers & View Controllers
│       │   ├── navigation.js          # View switcher, mobile drawer navigation
│       │   ├── authModal.js           # Authentication dialog controls and tab switching
│       │   ├── dashboard.js           # Overview section metric cards & recent feeds
│       │   ├── analyticsView.js       # Analytics view charts and category table controller
│       │   ├── anomalyView.js         # Outlier insights table and severity badge renderer
│       │   ├── transactionTable.js    # Main transaction table, pagination, inline actions
│       │   ├── transactionFilters.js  # Multi-parameter search toolbar and status filters
│       │   ├── dateRangePicker.js     # Global navbar date filter dropdown with presets
│       │   ├── forms.js               # Add / Edit Transaction modal and validation
│       │   └── csvImport.js           # CSV drag-and-drop file upload and sample template actions
│       │
│       └── utils/                     # Formatting & Validation Utilities
│           ├── formatters.js          # Indian Rupee (₹) currency and ISO date formatters
│           └── validators.js          # Field-level transaction validation and schema sanitization
│
└── docs/                              # Project Documentation Assets
```

---

## 🚀 Getting Started

Follow the instructions below to clone, configure, and run KharchaSense locally.

### Prerequisites

- **Node.js**: Version `20.0.0` or higher installed ([Download Node.js](https://nodejs.org/))
- **npm**: Version `10.0.0` or higher (bundled with Node.js)
- **MongoDB**: A free cloud cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended) or a local MongoDB instance
- **Web Browser**: Any modern browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Apple Safari)

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/Pranjal-sh-git/recurring-expense-anomaly-tracker.git
cd recurring-expense-anomaly-tracker
```

---

### Step 2: Configure Environment Variables

Navigate to the `backend/` directory and create your `.env` configuration file:

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` in your text editor and configure the environment variables:

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Local port for the Express application server | `5000` |
| `NODE_ENV` | Runtime environment mode | `development` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/kharchasense?retryWrites=true&w=majority` |
| `JWT_SECRET` | Cryptographic secret for signing JWT tokens | `your_super_secret_jwt_key_min_32_characters` |
| `JWT_EXPIRES_IN` | Token validity lifespan | `7d` |
| `FRONTEND_URL` | Allowed client origin for CORS headers | `http://localhost:5173` |

> ⚠️ **Security Warning:** Never commit your actual `.env` file containing sensitive credentials to Git.

---

### Step 3: Install Backend Dependencies

Inside the `backend/` directory, install all required production and development packages:

```bash
npm install
```

---

### Step 4: Run the Backend Server

Start the backend with automatic code-reloading via `nodemon`:

```bash
npm run dev
```

For production execution:
```bash
npm start
```

When successfully connected, the console outputs:
```
[Server] Express 5 server running in development mode on port 5000
[Database] MongoDB connected successfully: ac-cluster.mongodb.net
```

---

### Step 5: Test the API Health

In another terminal, verify that the Express backend is healthy:

```bash
curl http://localhost:5000/api/health
```

Expected JSON response:
```json
{
  "success": true,
  "message": "KharchaSense API is running",
  "data": {
    "status": "healthy",
    "uptime": 12,
    "timestamp": "2026-10-27T14:50:00.000Z",
    "environment": "development"
  }
}
```

---

### Step 6: Start the Frontend Application

Because the frontend is built entirely with standard ES6+ Modules without framework compilers, you can serve it using any lightweight static web server:

**Option A: Using Python (built-in)**
```bash
# From repository root:
python -m http.server 8080 --directory frontend
```

**Option B: Using npx serve**
```bash
npx -y serve frontend -l 8080
```

**Option C: Using VS Code Live Server Extension**
Right-click on `frontend/index.html` and click **"Open with Live Server"**.

Open your browser and navigate to `http://localhost:8080`.

---

### Step 7: Run Automated Backend Tests

The project includes a comprehensive automated test suite powered by the native Node.js test runner:

```bash
cd backend
npm test
```

To run a static syntax and syntax consistency check across server files:
```bash
npm run check
```

---

## 🧪 Testing & Quality Assurance

KharchaSense incorporates rigorous automated testing covering all layers of the backend application:

```
ℹ tests 141
ℹ suites 37
ℹ pass 141
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

### Test Suite Breakdown

1. **Authentication Tests (`tests/auth.test.js`)**
   - Validates user registration with HTTP `201` status and JSON Web Token generation.
   - Enforces uniqueness constraints; duplicate email registrations return HTTP `409 Conflict`.
   - Validates input boundaries: short passwords (< 6 characters), invalid email syntax, and missing names.
   - Verifies that `bcryptjs` generates unique cryptographic salts for identical plaintext passwords.
   - Asserts that password hashes are never exposed in user JSON representations (`toAuthJSON`).

2. **Transaction API & CRUD Tests (`tests/transactions.test.js`)**
   - Validates that unauthenticated requests to `/api/transactions` are rejected with HTTP `401 Unauthorized`.
   - Tests transaction creation with positive numbers, date parsing, and assigned MongoDB ObjectIds.
   - Enforces user isolation: prevents client request bodies from re-assigning ownership to other users.
   - Tests single-item lookup, updating, and deletion with HTTP `200` responses.
   - Validates date range filtering (`from` and `to` query parameters) and category filters.

3. **Multi-User Isolation & Persistence Tests (`tests/phase2.persistence.test.js`)**
   - Simulates two separate accounts (User Alpha and User Beta) creating transactions concurrently in MongoDB Atlas.
   - Asserts strict query isolation: User Alpha cannot view, update, or delete User Beta's records (enforcing HTTP `404 Not Found`).
   - Simulates alternating JWT Bearer token sessions to guarantee zero cross-account data leakage.

4. **Statistical Anomaly Tests (`tests/anomaly.test.js`)**
   - Verifies arithmetic mean ($\mu$) and population standard deviation ($\sigma$) algorithms against known mathematical benchmarks.
   - Asserts the minimum baseline count requirement (`MIN_BASELINE_COUNT = 3`) to prevent premature anomaly alerts.
   - Validates zero-variance handling: when all transactions in a category are identical ($\sigma = 0$), $Z = 0$ is returned without division-by-zero errors.
   - Tests outlier classification at $|Z| \ge 2.0$.

5. **Analytics Engine Tests (`tests/analytics.test.js`)**
   - Validates summary calculations (Total Spend, Transaction Counts, Recurring Totals).
   - Verifies category aggregations, spending percentages, and daily/monthly time-series grouping.

6. **Offline Resilience & Error Handling Tests (`tests/offline.feedback.test.js`)**
   - Verifies that rejected network writes never corrupt the cloud database or leave phantom records.
   - Confirms that the frontend cleanly differentiates valid cloud ObjectIds from temporary in-memory entries.

---

## 🔒 Security & Authentication

Security best practices are implemented at every layer of the KharchaSense architecture:

- **Salted Password Hashing:** User passwords are encrypted before persistence using `bcryptjs` with 10 salt rounds. Plaintext passwords are never logged, stored, or exposed.
- **Stateless JWT Tokens:** Authentication utilizes cryptographically signed JSON Web Tokens (`jsonwebtoken`) signed with a secure server secret (`JWT_SECRET`) and a 7-day expiration window.
- **Canonical Authentication Middleware:** All private routes pass through `authMiddleware.protect`. The middleware validates the `Authorization: Bearer <token>` header, verifies the signature, and injects the authenticated `req.user.id`.
- **Query-Level Data Isolation:** Every Mongoose query and mutation strictly includes `{ user: req.user.id }`. Users cannot access or tamper with another account's transactions even if they know the target MongoDB ObjectId.
- **HTTP Security Headers:** The application integrates `helmet` to set defensive HTTP headers, mitigating cross-site scripting (XSS), clickjacking, and MIME-sniffing attacks.
- **CORS Whitelisting:** Cross-Origin Resource Sharing is controlled via the `cors` package, restricting API consumption to authorized frontend domains specified in `FRONTEND_URL`.
- **Environment Variable Isolation:** Credentials, database connection URIs, and JWT signing keys are stored exclusively in `.env` files and loaded via `dotenv`, keeping secrets out of the codebase.

---

## 🌐 Deployment & Cloud Infrastructure

KharchaSense uses a modern, decoupled cloud infrastructure designed for reliability and scalability:

```
┌─────────────────────────┐          ┌─────────────────────────┐          ┌─────────────────────────┐
│     FRONTEND (CDN)      │  HTTPS   │   BACKEND (REST API)    │   TLS    │    DATABASE (CLOUD)     │
│         Netlify         ├─────────►│         Render          ├─────────►│      MongoDB Atlas      │
│  Static Asset Delivery  │ REST+JWT │  Node.js + Express 5    │ Mongoose │  AWS Multi-Region M0    │
└─────────────────────────┘          └─────────────────────────┘          └─────────────────────────┘
```

### Live Deployments

- **Production Backend API (Render):**  
  [`https://kharchasense-api.onrender.com`](https://kharchasense-api.onrender.com)  
  *Health Check Probe:* [`https://kharchasense-api.onrender.com/api/health`](https://kharchasense-api.onrender.com/api/health)
- **Phase 1 Legacy Frontend (Netlify):**  
  [`https://recurringexpenseanomalytracker.netlify.app`](https://recurringexpenseanomalytracker.netlify.app)
- **Phase 2 Production Frontend:**  
  *Currently undergoing final continuous deployment configuration for dedicated Netlify static hosting, targeting the Render cloud backend.*

### Cloud Infrastructure Details

1. **Backend on Render:**
   - Hosted as a continuous-deployment Web Service connected to the GitHub repository.
   - Deploys the `backend/` directory using Node.js runtime with `npm start`.
   - Configured with environment variables (`MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`).
   - *Cold-Start Note:* On Render's Free tier, services spin down after 15 minutes of inactivity. The initial request to a sleeping instance may take approximately 30–50 seconds to warm up. Subsequent requests respond with sub-second latency.
2. **Database on MongoDB Atlas:**
   - Fully managed cloud replica set deployed on AWS.
   - Enforces TLS 1.3 encryption in transit and encrypted storage at rest.
   - IP access control configured to permit authorized cloud application access.
3. **Frontend on Netlify:**
   - Hosted on Netlify's high-performance global Content Delivery Network (CDN).
   - In production, the frontend detects its host environment and points all `apiClient` requests directly to `https://kharchasense-api.onrender.com`.

---

## 🎮 Demo Account

A pre-configured demo account is available for faculty evaluation and testing:

| Field | Demo Credentials |
|---|---|
| **Email** | `test@kharchasense.app` |
| **Password** | `password123` |

> 💡 **Self-Registration Supported:** You can also register new personal accounts using any valid email address. Every registered user receives a completely isolated, private database space in MongoDB Atlas.

---

## 👥 Team Contributions

KharchaSense was developed collaboratively for academic evaluation. The table below documents verified member contributions:

| Team Member | Project Responsibilities & Delivered Modules |
|---|---|
| **Pranjal Sharma** | Frontend/backend architectural integration, UI refinement, MongoDB persistence integration, offline connection feedback & recovery handling, automated test suites, and cloud deployment. |
| **Maneshwar** | Transaction CRUD implementation, Express transaction routing, controller endpoints, Mongoose schema modeling, and batch import mechanisms. |
| **Garima** | Backend analytics service, spending metric aggregation, category breakdown algorithms, recurring expense detection, and time-series trend calculation. |
| **Dilpreet** | Backend statistical anomaly detection engine, Z-score mathematical formulation, baseline category grouping, low-sample safeguards, and anomaly endpoints. |

---

<div align="center">

**KharchaSense — Smart Expense & Anomaly Tracker**  
*Built with HTML5, Vanilla CSS3, ES6+ JavaScript, Node.js, Express 5, and MongoDB Atlas.*

</div>