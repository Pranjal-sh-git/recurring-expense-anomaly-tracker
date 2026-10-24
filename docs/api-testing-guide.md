# ⚡ KharchaSense API Testing Guide (Thunder Client & Postman)

A comprehensive guide for manually verifying and testing all KharchaSense backend REST API endpoints using **Thunder Client** (VS Code) or **Postman**.

---

## 1. Quick Setup & Configuration

- **Base URL:** `http://localhost:5000`
- **Global Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{token}}` *(for protected routes)*

### Automatic Token Environment Variable Setup
In Thunder Client / Postman, after sending the **Login** or **Register** request, save the returned token to your environment:
- **Variable Name:** `token`
- **Value:** `data.token` from the response JSON

---

## 2. Authentication Endpoints (`/api/auth`)

### 2.1 Register New User
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/auth/register`
- **Auth:** None
- **Body (JSON):**
```json
{
  "name": "Alex Mercer",
  "email": "alex@example.com",
  "password": "SecurePassword123!"
}
```
- **Expected Status:** `201 Created`
- **Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "671ad4ef8c983a54b3d11a21",
      "name": "Alex Mercer",
      "email": "alex@example.com",
      "createdAt": "2026-10-24T18:00:00.000Z"
    }
  }
}
```
- **Error Cases:**
  - `400 Bad Request`: Missing field, name length < 2 or > 60, invalid email format, or password < 6 chars.
  - `409 Conflict`: `{"success": false, "message": "An account with this email already exists"}`

---

### 2.2 Login User
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/auth/login`
- **Auth:** None
- **Body (JSON):**
```json
{
  "email": "alex@example.com",
  "password": "SecurePassword123!"
}
```
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "message": "User authenticated successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "671ad4ef8c983a54b3d11a21",
      "name": "Alex Mercer",
      "email": "alex@example.com",
      "createdAt": "2026-10-24T18:00:00.000Z"
    }
  }
}
```
- **Error Cases:**
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: `{"success": false, "message": "Invalid email or password"}` (generic for wrong password or non-existent user).

---

### 2.3 Get Current User Profile (`/me`)
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/auth/me`
- **Headers:** `Authorization: Bearer {{token}}`
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "id": "671ad4ef8c983a54b3d11a21",
      "name": "Alex Mercer",
      "email": "alex@example.com",
      "createdAt": "2026-10-24T18:00:00.000Z"
    }
  }
}
```
- **Error Cases:**
  - `401 Unauthorized`: Missing or invalid Bearer token.

---

## 3. Transactions Endpoints (`/api/transactions`)

*All transaction endpoints require `Authorization: Bearer {{token}}`.*

### 3.1 Create Transaction
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/transactions`
- **Body (JSON):**
```json
{
  "title": "Grocery Supermarket",
  "amount": 125.50,
  "category": "Groceries",
  "date": "2026-10-24",
  "recurring": false,
  "description": "Weekly grocery run"
}
```
- **Expected Status:** `201 Created`
- **Response:**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "id": "671ad6218c983a54b3d11b04",
    "userId": "671ad4ef8c983a54b3d11a21",
    "title": "Grocery Supermarket",
    "amount": 125.50,
    "category": "Groceries",
    "date": "2026-10-24T00:00:00.000Z",
    "recurring": false,
    "description": "Weekly grocery run",
    "createdAt": "2026-10-24T10:15:00.000Z"
  }
}
```

---

### 3.2 List All Transactions
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/transactions`
- **Optional Query Parameters:**
  - `startDate=2026-10-01`
  - `endDate=2026-10-31`
  - `category=Groceries`
  - `recurring=false`
  - `page=1`
  - `limit=20`
- **Expected Status:** `200 OK`

---

### 3.3 Get Single Transaction by ID
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/transactions/:id`
- **Expected Status:** `200 OK` (or `404 Not Found` if non-existent or owned by another user)

---

### 3.4 Update Transaction
- **Method:** `PUT`
- **URL:** `{{baseUrl}}/api/transactions/:id`
- **Body (JSON):**
```json
{
  "amount": 140.00,
  "title": "Grocery Supermarket & Bakery"
}
```
- **Expected Status:** `200 OK`

---

### 3.5 Delete Transaction
- **Method:** `DELETE`
- **URL:** `{{baseUrl}}/api/transactions/:id`
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "message": "Transaction deleted successfully",
  "data": {
    "id": "671ad6218c983a54b3d11b04"
  }
}
```

---

### 3.6 Bulk Import Transactions
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/transactions/bulk`
- **Body (JSON):**
```json
{
  "transactions": [
    {
      "title": "Coffee Shop",
      "amount": 5.25,
      "category": "Dining",
      "date": "2026-10-20",
      "recurring": false
    },
    {
      "title": "Gym Membership",
      "amount": 45.00,
      "category": "Healthcare",
      "date": "2026-10-01",
      "recurring": true
    }
  ]
}
```
- **Expected Status:** `201 Created`

---

## 4. Analytics Endpoints (`/api/analytics`)

*All analytics endpoints require `Authorization: Bearer {{token}}`.*

### 4.1 Overall Spending Summary
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/analytics/summary`
- **Optional Query Params:** `from=2026-10-01&to=2026-10-31`
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "message": "Spending summary retrieved successfully",
  "data": {
    "totalExpenses": 170.75,
    "totalTransactions": 3,
    "averageTransaction": 56.92,
    "highestSpendingCategory": "Groceries",
    "recurringCount": 1,
    "recurringTotal": 45.00
  }
}
```

---

### 4.2 Spending Breakdown by Category
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/analytics/categories`
- **Expected Status:** `200 OK`

---

### 4.3 Daily Chronological Spending Trends
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/analytics/trends`
- **Expected Status:** `200 OK`

---

### 4.4 Recurring vs One-Off Breakdown
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/analytics/recurring`
- **Expected Status:** `200 OK`

---

## 5. Anomaly Detection Endpoints (`/api/anomalies`)

*All anomaly endpoints require `Authorization: Bearer {{token}}`.*

### 5.1 Retrieve Flagged Anomalies
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/anomalies`
- **Optional Query Params:** `flaggedOnly=true` (default), `category=Groceries`
- **Expected Status:** `200 OK`
- **Response Shape:**
```json
{
  "success": true,
  "message": "Anomalies retrieved successfully",
  "data": {
    "anomalies": [ ... ],
    "totalFlagged": 1
  }
}
```

---

### 5.2 Statistical Anomaly Summary
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/anomalies/summary`
- **Expected Status:** `200 OK`

---

## 6. System & Health Probes

### 6.1 Liveness Probe (Public)
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/health`
- **Auth:** None
- **Expected Status:** `200 OK`
- **Response:**
```json
{
  "success": true,
  "message": "KharchaSense API is running",
  "data": {
    "status": "healthy",
    "uptime": 128,
    "timestamp": "2026-10-24T18:30:00.000Z",
    "environment": "development"
  }
}
```

---

### 6.2 404 Route Fallback
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/non-existent-route`
- **Expected Status:** `404 Not Found`
- **Response:**
```json
{
  "success": false,
  "message": "Resource not found: GET /api/non-existent-route"
}
```
