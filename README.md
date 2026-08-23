# 💸 ExpenseTrack — Recurring & Anomaly Expense Tracker

> A fully client-side expense intelligence web application that helps you track recurring expenses, analyze spending patterns, and automatically detect anomalous transactions using statistical methods.

---

## 📋 Table of Contents

- [Project Description](#-project-description)
- [Tech Stack](#-tech-stack)
- [Project Architecture](#-project-architecture)
- [Project Flow](#-project-flow)
- [Directory Structure](#-directory-structure)
- [Getting Started](#-getting-started)
- [Demo Account](#-demo-account)

---

## 📖 Project Description

**ExpenseTrack** is a Vanilla JavaScript single-page application (SPA) designed to give users complete visibility into their financial transactions. It runs entirely in the browser with **no backend** — all data is persisted using `localStorage`, making it zero-dependency and instantly deployable.

### Key Features

| Feature | Description |
|---|---|
| 🔐 **Multi-User Auth** | Sign up / Sign in system with per-user isolated data storage |
| ➕ **Add Transactions** | Form-based entry for amount, category, date, description, and recurrence |
| 📊 **Analytics Dashboard** | Daily spending trends, category breakdown charts, recurring vs. one-off comparison |
| ⚠️ **Anomaly Detection** | Statistical Z-score analysis flags unusual transactions per category |
| 🔁 **Recurring Detection** | Identifies and counts transactions marked as recurring |
| 📅 **Date Range Filter** | Global navbar date picker with preset ranges (This Month, Last 30 Days, etc.) |
| 🔍 **Smart Filters** | Filter transactions by category, amount range, type (recurring/one-off), and anomaly status |
| 📥 **CSV Import** | Bulk-import transactions from a CSV file with validation and skip-error reporting |
| 📱 **Responsive Design** | Fully responsive across mobile, tablet, and desktop viewports |
| 🌐 **Landing Page** | Marketing-style landing page with feature highlights and app mockup preview |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Structure** | HTML5 (Semantic) |
| **Styling** | Vanilla CSS3 (Custom Properties, Flexbox, Grid, CSS Animations) |
| **Logic** | Vanilla JavaScript ES6+ (ES Modules) |
| **Charts** | Native HTML5 `<canvas>` API (custom chart rendering — no libraries) |
| **Persistence** | Browser `localStorage` (per-user namespaced keys) |
| **Fonts** | Google Fonts — Inter |
| **Dev Server** | Vite (for local development with HMR) |
| **No Backend** | Zero server-side code — runs entirely client-side |
| **No Frameworks** | No React / Vue / Angular — pure Vanilla JS |
| **No Libraries** | No Chart.js / D3.js — all charts hand-drawn on Canvas |

---

## 🏗️ Project Architecture

The project follows a **layered, modular architecture** inspired by MVC (Model–View–Controller), separating concerns across distinct layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  index.html  ──  CSS (main, landing, auth, components,      │
│                       animations)                           │
└───────────────────────────┬─────────────────────────────────┘
                            │ DOM events / render calls
┌───────────────────────────▼─────────────────────────────────┐
│                       UI LAYER  (js/ui/)                     │
│  navigation.js    authModal.js     dashboard.js             │
│  analyticsView.js anomalyView.js   transactionTable.js      │
│  transactionFilters.js   dateRangePicker.js   forms.js      │
└───────────────────────────┬─────────────────────────────────┘
                            │ data requests / computed results
┌───────────────────────────▼─────────────────────────────────┐
│                   ORCHESTRATOR  (js/app.js)                  │
│  Boots all modules • Calls refresh cycle • Wires events     │
└────────┬──────────────────┬──────────────────┬──────────────┘
         │                  │                  │
┌────────▼────────┐ ┌───────▼──────┐ ┌────────▼──────────────┐
│  STATE LAYER    │ │ ANALYTICS    │ │   SERVICES LAYER       │
│ (js/state/)     │ │ (js/analytic)│ │  (js/services/)        │
│                 │ │              │ │                        │
│ transactionStore│ │analyticsServ.│ │ anomalyService.js      │
│   .js           │ │charts.js     │ │ authService.js         │
│ (in-memory +    │ │(Canvas charts│ │ dataService.js         │
│  localStorage   │ │ rendering)   │ │ (localStorage CRUD)    │
│  sync)          │ │              │ │                        │
└─────────────────┘ └──────────────┘ └────────────────────────┘
                                              │
                                   ┌──────────▼────────────────┐
                                   │   UTILS LAYER (js/utils/) │
                                   │  formatters.js            │
                                   │  validators.js            │
                                   └───────────────────────────┘
```

### Layer Responsibilities

| Layer | Files | Responsibility |
|---|---|---|
| **Orchestrator** | `app.js`, `landing.js` | Boots the app, wires all modules, drives the global refresh cycle |
| **UI Layer** | `js/ui/*.js` | DOM rendering, event handling, user interaction — purely presentational |
| **State Layer** | `js/state/transactionStore.js` | In-memory transaction cache, synced to `localStorage` per user |
| **Analytics Layer** | `js/analytics/analyticsService.js`, `charts.js` | Aggregations, summaries, Canvas chart rendering |
| **Services Layer** | `js/services/*.js` | Auth (login/signup/logout), data persistence, anomaly detection |
| **Utils Layer** | `js/utils/*.js` | Formatters (currency, dates), transaction validators |
| **CSS** | `css/*.css` | `main.css` (dashboard), `landing.css` (landing page), `auth.css` (modal), `components.css`, `animations.css` |

---

## 🔄 Project Flow

### 1. Application Boot
```
DOMContentLoaded
  └── app.js bootstrap
        ├── initNavigation()     → Set up sidebar, hamburger, nav links
        ├── initAuthModal()      → Bind auth form events
        ├── initDashboard()      → Reset metric cards to placeholders
        ├── initForm()           → Bind add-transaction form
        ├── initTransactionTable() → Initialize transaction table DOM
        ├── initAnalyticsView()  → Reset analytics section
        ├── initAnomalyView()    → Reset anomaly section
        ├── initFilters()        → Bind filter controls
        ├── initDateRangePicker() → Bind navbar date picker
        └── initLandingPage()    → Bind landing page scroll/CTA interactions
```

### 2. Authentication Flow
```
User visits site
  └── Landing Page shown (default)
        └── User clicks "Get Started" / "Explore Dashboard"
              └── Auth Modal opens
                    ├── Sign In tab (default)
                    │     └── authService.login(email, password)
                    │           └── Validates against localStorage users
                    │                 └── On success → showDashboard()
                    │                                   refreshApp()
                    └── Create Account tab
                          └── authService.signup(name, email, password)
                                └── Saves new user to localStorage
                                      └── On success → showDashboard()
                                                        refreshApp()
```

### 3. Core Data Refresh Cycle
```
refreshApp() triggered by: add transaction / delete / date range change / login
  │
  ├── getTransactions()             → Load from in-memory store
  ├── filterTransactionsByDate()    → Apply active date range filter
  ├── detectAnomalies()             → Z-Score analysis per category
  ├── generateDashboardSummary()    → Total expenses, count, top category
  ├── countAnomalies()              → Integer anomaly count
  │
  ├── updateDashboard()             → Metric cards (Total, Anomalies, Category)
  ├── updateRecurringCount()        → Recurring count card + sidebar badge
  ├── updateRecentTransactions()    → Recent 5 transactions feed
  ├── updateAnalyticsView()         → Charts + category insights table
  ├── updateAnomalyView()           → Anomaly Insights table + severity badges
  └── renderTransactions()          → Full transactions table with filters
```

### 4. Anomaly Detection Algorithm
```
Input: Array of transactions (within selected date range)
  │
  ├── Group transactions by Category
  │     e.g. { Subscriptions: [...], Groceries: [...], ... }
  │
  ├── For each category group:
  │     ├── Calculate Mean (μ) of amounts
  │     ├── Calculate Population Standard Deviation (σ)
  │     └── For each transaction in category:
  │           Z-Score = (amount - μ) / σ
  │           isAnomaly = |Z-Score| >= 2.0  (threshold)
  │
  └── Output: Annotated transactions with { isAnomaly: bool, zScore: float }
```

### 5. User Navigation Flow
```
Dashboard Sections (SPA routing via navigation.js):
  ├── Overview         → Metric cards + recent transactions + quick add form
  ├── Transactions     → Full paginated table with search, sort, filters
  ├── Analytics        → Daily trend chart + category breakdown + recurring bar
  └── Anomaly Insights → Anomaly table with Z-score, severity badges, filters

Sidebar (mobile) → Slide-out drawer with hamburger toggle
Top Navbar        → Date range picker + Add Transaction shortcut + Profile dropdown
                                                                    └── Logout
```

---

## 📁 Directory Structure

```
recurring-expense-anomaly-tracker/
├── README.md
└── frontend/
    ├── index.html                    # Single HTML file (SPA shell + all views)
    ├── css/
    │   ├── main.css                  # Dashboard layout, components, responsive
    │   ├── landing.css               # Landing page styles + mockup animations
    │   ├── auth.css                  # Auth modal glassmorphism styles
    │   ├── components.css            # Shared small component styles
    │   └── animations.css            # Keyframe animations, transitions
    └── js/
        ├── app.js                    # App orchestrator / entry point
        ├── landing.js                # Landing page interactions
        ├── analytics/
        │   ├── analyticsService.js   # Aggregation functions (totals, categories)
        │   └── charts.js             # Canvas chart renderers (line, bar, donut)
        ├── services/
        │   ├── authService.js        # Login, signup, logout, session management
        │   ├── dataService.js        # localStorage CRUD + CSV parser
        │   └── anomalyService.js     # Z-score based anomaly detection engine
        ├── state/
        │   └── transactionStore.js   # In-memory store + localStorage sync
        ├── ui/
        │   ├── navigation.js         # SPA routing, sidebar, navbar
        │   ├── authModal.js          # Auth modal open/close/form handling
        │   ├── dashboard.js          # Overview section DOM updates
        │   ├── analyticsView.js      # Analytics section render
        │   ├── anomalyView.js        # Anomaly Insights section render
        │   ├── transactionTable.js   # Transaction table render + pagination
        │   ├── transactionFilters.js # Filter bar (category, amount, type, anomaly)
        │   ├── dateRangePicker.js    # Global date range filter (navbar)
        │   └── forms.js              # Add-transaction form logic
        └── utils/
            ├── formatters.js         # Currency (₹), date formatters
            └── validators.js         # Transaction field validators + normalizers
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (for the Vite dev server)
- A modern browser (Chrome, Firefox, Edge, Safari)

### Run Locally

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open `http://localhost:5500` in your browser.

### No Build Needed
Since the app is pure Vanilla JS with ES Modules, you can also open `frontend/index.html` directly via any static server (like VS Code Live Server).

---

## 🎮 Demo Account

A pre-seeded demo account is available for instant testing:

| Field | Value |
|---|---|
| **Email** | `test@expensetrack.app` |
| **Password** | `password123` |

> All data is stored per-user in `localStorage`. Clearing browser data will reset everything.

---

## 👨‍💻 Built With

- **HTML5** — Semantic structure, a11y-aware markup
- **CSS3** — Custom properties, glassmorphism, smooth animations, `dvh` units
- **JavaScript (ES6+ Modules)** — No transpilation, no bundler required for core logic
- **Canvas API** — Hand-built charts without any charting library
- **localStorage** — Client-side persistence with multi-user namespace isolation
- **Vite** — Local dev server for fast module resolution
