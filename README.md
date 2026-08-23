# 💸 KharchaSense — Smart Expense & Anomaly Tracker

> A fully client-side expense intelligence web application that helps you track recurring expenses, analyze spending patterns, bulk import data via CSV, and automatically detect anomalous transactions using statistical methods.

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

**KharchaSense** is a Vanilla JavaScript single-page application (SPA) designed to give users complete visibility into their financial transactions. It runs entirely in the browser with **no backend** — all data is persisted using `localStorage`, making it zero-dependency and instantly deployable.

### Key Features

| Feature | Description |
|---|---|
| 🔐 **Multi-User Auth** | Sign up / Sign in system with per-user isolated data storage in `localStorage` |
| ➕ **Add Transactions** | Form-based entry for amount, category, date, description, and recurrence status |
| 📥 **CSV Bulk Import** | Upload `.csv` files to batch-import transactions with automatic validation and skipped-row reporting |
| 📄 **Sample Template** | One-click download of a pre-formatted `sample_transactions_template.csv` file |
| 📊 **Analytics Dashboard** | Daily spending trend charts, category breakdown charts, and recurring vs. one-off spending comparison |
| ⚠️ **Anomaly Detection** | Statistical Z-score analysis flags unusual transactions per category with severity indicators |
| 🔁 **Recurring Detection** | Identifies and counts regular scheduled transactions (subscriptions, utilities, rent) |
| 📅 **Date Range Filter** | Global navbar date picker with presets (This Month, Last 30 Days, Last 90 Days, This Year, Custom) |
| 🔍 **Smart Filters** | Filter transactions by category, amount range, type (recurring/one-off), and anomaly flag |
| 📱 **Responsive Design** | Fully responsive layout across mobile, tablet, and desktop viewports with slide-out drawer |
| 🌐 **Landing Page** | High-converting landing page with 3D-styled dashboard mockup preview and feature highlights |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Structure** | HTML5 (Semantic elements, accessible modal dialogs, SVG icons) |
| **Styling** | Vanilla CSS3 (Custom Properties / Design Tokens, Flexbox, Grid, CSS Animations, `dvh` units) |
| **Logic** | Vanilla JavaScript ES6+ (ES Modules, `FileReader` API, Blob downloads) |
| **Charts** | Native HTML5 `<canvas>` API (custom line, bar, and donut charts — zero charting libraries) |
| **Persistence** | Browser `localStorage` (per-user namespaced keys: `expense_tracker_transactions_${userId}`) |
| **Fonts** | Google Fonts — Inter |
| **Dev Server** | Vite / Static Server (for fast local development and ES module resolution) |
| **No Backend** | 100% client-side execution — zero server dependencies |
| **No Frameworks** | Pure Vanilla JS — no React, Vue, Angular, or jQuery |
| **No Libraries** | Hand-crafted animations, chart visualizers, and state synchronization |

---

## 🏗️ Project Architecture

The application is structured into clear, decoupled layers inspired by MVC (Model–View–Controller) principles:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                            │
│    index.html  ──  CSS (main.css, landing.css, auth.css,                │
│                         components.css, animations.css)                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ DOM events / render updates
┌────────────────────────────────────▼────────────────────────────────────┐
│                            UI LAYER  (js/ui/)                           │
│  navigation.js         authModal.js          dashboard.js               │
│  analyticsView.js      anomalyView.js        transactionTable.js        │
│  transactionFilters.js dateRangePicker.js    forms.js                   │
│  csvImport.js (File Upload, CSV Processing & Sample Template Generator) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ data requests / computed updates
┌────────────────────────────────────▼────────────────────────────────────┐
│                        ORCHESTRATOR  (js/app.js)                        │
│    Boots all modules • Manages global refresh cycle • Wires events      │
└─────────┬──────────────────────────┬──────────────────────────┬─────────┘
          │                          │                          │
┌─────────▼────────┐       ┌─────────▼────────┐       ┌─────────▼─────────┐
│   STATE LAYER    │       │  ANALYTICS LAYER │       │  SERVICES LAYER   │
│  (js/state/)     │       │  (js/analytics/) │       │  (js/services/)   │
│                  │       │                  │       │                   │
│ transactionStore │       │ analyticsService │       │ anomalyService.js │
│   .js            │       │   .js            │       │ authService.js    │
│ (in-memory cache │       │ charts.js        │       │ dataService.js    │
│  + storage sync) │       │ (HTML5 Canvas)   │       │ (Storage & CSV)   │
└──────────────────┘       └──────────────────┘       └───────────────────┘
                                                                │
                                                      ┌─────────▼─────────┐
                                                      │    UTILS LAYER    │
                                                      │   (js/utils/)     │
                                                      │ formatters.js     │
                                                      │ validators.js     │
                                                      └───────────────────┘
```

### Layer Responsibilities

| Layer | Primary Files | Core Responsibility |
|---|---|---|
| **Orchestrator** | `app.js`, `landing.js` | Bootstraps modules, coordinates user events, runs the global `refreshApp()` lifecycle |
| **UI Layer** | `js/ui/*.js` | DOM rendering, event delegation, forms, CSV modal/toasts, and navigation |
| **State Layer** | `js/state/transactionStore.js` | Single source of truth in memory, user sync, and persistent storage write-through |
| **Analytics Layer** | `js/analytics/analyticsService.js`, `charts.js` | Spending calculations, aggregations, trend analytics, and native Canvas chart drawing |
| **Services Layer** | `js/services/anomalyService.js`, `authService.js`, `dataService.js` | Z-score statistical engine, user auth/sessions, and localStorage CRUD / CSV parsing |
| **Utils Layer** | `js/utils/formatters.js`, `validators.js` | INR currency formatting, date parsing, input validation, and normalization rules |

---

## 🔄 Project Flow

### 1. Application Boot & Lifecycle
```
DOMContentLoaded
  └── app.js bootstrap
        ├── initNavigation()      → Binds sidebar drawer, navbar links, return-home
        ├── initDashboard()       → Resets overview metric cards to placeholder state
        ├── initAnalyticsView()   → Resets analytics charts and category tables
        ├── initAnomalyView()     → Resets anomaly stats and flagged outlier table
        ├── initForm()            → Renders and binds the Add Transaction form
        ├── initFilters()         → Binds category, amount, type, and anomaly filters
        ├── initTransactionTable()→ Binds table rendering, delete handlers, and pagination
        ├── initDateRangePicker() → Binds navbar preset dropdown & custom date picker
        ├── initCSVImport()       → Binds CSV file upload, parser, and template download
        ├── initLandingPage()     → Initializes scroll reveals and CTA triggers
        ├── initAuthModal()       → Sets up login/signup glassmorphism dialog
        └── refreshApp()          → Reads store data & performs first full render
```

### 2. Authentication Flow
```
User visits application
  └── Landing Page active by default
        └── User clicks "Get Started" / "Explore Dashboard"
              └── Glassmorphic Auth Modal opens
                    ├── Sign In Tab
                    │     └── authService.login(email, password)
                    │           ├── Verifies credentials in localStorage (`expenseTrackUsers`)
                    │           └── On success:
                    │                 ├── reloadForUser() (switches storage key)
                    │                 ├── updateNavbarUserDisplay()
                    │                 ├── showDashboard('overview')
                    │                 └── refreshApp()
                    └── Create Account Tab
                          └── authService.signup(name, email, password)
                                ├── Saves new user record to localStorage
                                └── On success: auto-logs in and opens dashboard
```

### 3. Core Data Refresh Cycle (`refreshApp()`)
```
Action (Add Tx / Delete Tx / CSV Import / Date Filter / Account Switch)
  │
  ├── getTransactions()             → Loads active user's transactions from memory store
  ├── filterTransactionsByDate()    → Applies active navbar date range (All Time, This Month, etc.)
  ├── detectAnomalies()             → Runs Category-based Z-score outlier analysis
  ├── generateDashboardSummary()    → Computes Total Spend, Transaction Count, Top Category
  ├── countAnomalies()              → Computes total flagged anomalies count
  │
  ├── updateDashboard()             → Updates Overview metric cards & sidebar count badges
  ├── updateRecurringCount()        → Updates Recurring expenses card & sidebar mirror
  ├── updateRecentTransactions()    → Renders top 5 most recent entries in Overview feed
  ├── updateAnalyticsView()         → Re-draws Daily Trend & Category charts on Canvas
  ├── updateAnomalyView()           → Renders Anomaly Insights table with Z-scores & badges
  └── renderFilteredTable()         → Applies active table filters and renders paginated rows
```

### 4. CSV Bulk Import & Template Flow
```
User clicks "Import CSV" on Transactions Page
  │
  ├── Hidden <input type="file" accept=".csv"> triggered
  ├── User selects a .csv file
  ├── FileReader parses text stream
  ├── dataService.parseCSV(csvText)
  │     ├── Parses comma-separated & quoted fields
  │     ├── Validates columns: title, amount, category, date, recurring
  │     ├── Normalizes accepted rows
  │     └── Collects invalid rows into skipped list with line reasons
  │
  ├── transactionStore.loadDemoData(acceptedTransactions, append = true)
  │     └── Writes updated transaction list to user's localStorage bucket
  │
  ├── refreshApp() → Instantly re-calculates all metrics, charts, anomalies & table
  └── Floating Toast displays: "✓ Successfully imported X transactions (Y skipped)"
```

### 5. Anomaly Detection Algorithm (Z-Score Outlier Analysis)
```
Input: Array of transactions (scoped to active date range)
  │
  ├── Group transactions by category (Subscriptions, Groceries, Rent, Utilities, etc.)
  │
  ├── For each category subset:
  │     ├── Calculate Arithmetic Mean (μ):
  │     │     μ = (∑ amount) / N
  │     │
  │     ├── Calculate Population Standard Deviation (σ):
  │     │     σ = √( (∑ (amount - μ)²) / N )
  │     │
  │     └── For each transaction in category:
  │           Z-Score = (amount - μ) / σ
  │           isAnomaly = |Z-Score| >= 2.0 (Threshold)
  │
  └── Output: Annotated transaction objects with { isAnomaly: boolean, zScore: number }
```

---

## 📁 Directory Structure

```
recurring-expense-anomaly-tracker/
├── README.md                         # Comprehensive documentation
└── frontend/
    ├── index.html                    # Single Page Application HTML shell
    ├── css/
    │   ├── main.css                  # Core app styles, dashboard layout, responsive rules
    │   ├── landing.css               # Landing page presentation, hero mockup & animations
    │   ├── auth.css                  # Glassmorphism authentication modal styles
    │   ├── components.css            # Reusable button, badge, dropdown & card components
    │   └── animations.css            # CSS keyframe definitions and smooth transitions
    └── js/
        ├── app.js                    # Central application orchestrator & lifecycle manager
        ├── landing.js                # Landing page scroll observers & interaction logic
        ├── analytics/
        │   ├── analyticsService.js   # Mathematical aggregations, category breakdowns
        │   └── charts.js             # HTML5 Canvas chart renderers (line, bar, donut)
        ├── services/
        │   ├── anomalyService.js     # Statistical Z-score anomaly detection engine
        │   ├── authService.js        # Multi-user login, signup, session & demo accounts
        │   └── dataService.js        # LocalStorage persistence layer & CSV parser
        ├── state/
        │   └── transactionStore.js   # Reactive in-memory store + storage synchronization
        ├── ui/
        │   ├── navigation.js         # SPA view switcher, sidebar drawer, return-home
        │   ├── authModal.js          # Auth modal controls, tab switcher & input resets
        │   ├── dashboard.js          # Overview section DOM update controller
        │   ├── analyticsView.js      # Analytics section charts & category table renderer
        │   ├── anomalyView.js        # Anomaly insights view & severity badge renderer
        │   ├── transactionTable.js   # Transactions table renderer, delete & pagination
        │   ├── transactionFilters.js # Multi-parameter search & category filter toolbar
        │   ├── dateRangePicker.js    # Global navbar date range filter dropdown
        │   ├── forms.js              # Add-transaction form validation & submissions
        │   └── csvImport.js          # CSV file upload, processing, templates & toast alerts
        └── utils/
            ├── formatters.js         # INR (₹) currency formatters, date format utilities
            └── validators.js         # Transaction normalization & schema validation rules
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (installed on your machine)
- Any modern web browser (Chrome, Edge, Firefox, Safari)

### Run Locally

```bash
# Clone the repository
git clone https://github.com/Dhawalsingh2006/Recurring-Expense-Anomaly-Tracker.git
cd recurring-expense-anomaly-tracker

# Start the dev server
npm run dev
```

Then open `http://localhost:5500` (or the URL shown in your terminal) in your browser.

### No Build Step Required
Because the application is written in standard ES Modules, you can also run it using VS Code's **Live Server** extension or Python's built-in HTTP server:

```bash
python -m http.server 8080 --directory frontend
```

---

## 🎮 Demo Account

A pre-configured demo account is included for immediate testing:

| Field | Value |
|---|---|
| **Email** | `test@kharchasense.app` |
| **Password** | `password123` |

> 💡 **Data Isolation:** You can create new accounts freely. Each account maintains its own isolated transactions bucket in `localStorage`.

---

## 👨‍💻 Built With

- **HTML5 & Vanilla CSS3** — Responsive layouts with modern custom properties and fluid typography
- **Modern JavaScript (ES6+)** — Modular code architecture with zero external runtime dependencies
- **HTML5 Canvas API** — Fully responsive charts drawn natively without heavyweight chart packages
- **Browser Web Storage** — Client-side persistent data management with multi-user isolation
- **Statistical Mathematics** — Standard deviation and Z-score outlier analysis
