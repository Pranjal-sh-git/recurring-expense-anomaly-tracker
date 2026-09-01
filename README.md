# 💸 KharchaSense — Your Personal Expense Radar

> Track spending, spot recurring patterns, and catch unusual transactions before they become habits.

**Live Demo:** https://recurringexpenseanomalytracker.netlify.app/#landing

---

## Why KharchaSense?
KharchaSense is a fast, no-backend expense intelligence app built with pure JavaScript. Everything runs in your browser, so setup is simple and your data stays local to your device.

It helps you:
- understand where your money goes,
- monitor recurring costs,
- import transaction history in bulk,
- and automatically flag suspicious spending spikes.

---

## ✨ Highlights
- 🔐 **Multi-user sign in/sign up** with per-user local data isolation
- ➕ **Quick transaction entry** (amount, date, category, recurrence, notes)
- 📥 **CSV bulk import** with validation and skipped-row feedback
- 📊 **Visual analytics dashboard** for trends and category breakdowns
- ⚠️ **Z-score anomaly detection** to identify outlier transactions
- 🔁 **Recurring expense tracking** for subscriptions/utilities/rent
- 📅 **Date range presets + custom filtering**
- 📱 **Responsive UI** across mobile, tablet, and desktop

---

## 🧠 How anomaly detection works
For each category, KharchaSense calculates:
1. Mean transaction value
2. Standard deviation
3. Z-score per transaction

Transactions with `|z| >= 2.0` are flagged as anomalies.

---

## 🏗️ Project structure

```text
recurring-expense-anomaly-tracker/
├── README.md
└── frontend/
    ├── index.html
    ├── css/
    └── js/
        ├── app.js
        ├── analytics/
        ├── services/
        ├── state/
        ├── ui/
        └── utils/
```

---

## 🛠️ Tech stack
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES Modules)
- **Charts:** Native HTML5 Canvas
- **Storage:** Browser `localStorage`
- **Architecture:** Modular SPA with orchestration + service/state/ui layers

No frameworks. No backend. No runtime dependencies.

---

## 🚀 Run locally

### Prerequisite
Any modern browser.

### Option 1: Live Server (VS Code)
Open the repo and serve the `frontend` folder.

### Option 2: Python HTTP server
```bash
cd recurring-expense-anomaly-tracker
python -m http.server 8080 --directory frontend
```
Then open: `http://localhost:8080`

---

## 🎮 Demo account
| Field | Value |
|---|---|
| Email | `test@kharchasense.app` |
| Password | `password123` |

> Each user account gets isolated transaction storage in `localStorage`.

---

## 🌟 What makes it interesting?
Unlike basic expense trackers, KharchaSense doesn’t just store transactions — it interprets them. You get a compact, privacy-friendly spending intelligence tool that can reveal hidden patterns in your day-to-day expenses.
