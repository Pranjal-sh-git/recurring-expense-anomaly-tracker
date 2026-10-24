# 📜 KharchaSense Backend API Contract & Shared Conventions

> **Version:** 1.0.0  
> **Target Runtime:** Node.js 20+  
> **Framework:** Express 5.x (CommonJS)  
> **ODM:** Mongoose 8.x (MongoDB)  
> **Status:** Specification & Foundation  

---

## 1. Overview & Architecture

This document formalizes the backend API conventions, data contracts, and architectural guidelines for **KharchaSense**. The backend service provides persistent multi-tenant data storage, secure user authentication, anomaly tracking persistence, and CRUD interfaces for financial transactions while strictly isolating user data.

```
┌────────────────────────────────────────────────────────┐
│                   KharchaSense Client                  │
│          Vanilla JS SPA (Browser / localStorage)       │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST JSON
                            │ Bearer <JWT>
┌───────────────────────────▼────────────────────────────┐
│                  Express 5 Backend API                 │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Helmet    │  │ CORS (Origin)│  │ Body Parsers │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│  ┌──────▼─────────────────▼─────────────────▼───────┐  │
│  │                Central Router                    │  │
│  │      /api/health • /api/auth • /api/transactions │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │ req.user.id                │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │            Controllers & Services Layer          │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │ Mongoose Models            │
│  ┌────────────────────────▼─────────────────────────┐  │
│  │                 MongoDB Database                 │  │
│  │       collections: users, transactions           │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Standard Response Envelope

All API endpoints must conform to a consistent JSON response envelope. This guarantees predictable parsing on client applications.

### 2.1 Success Response Shape

HTTP Status Code: `200 OK`, `201 Created`

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

- `success` (`boolean`): Always `true` for successful operations (HTTP status in the 2xx range).
- `message` (`string`): A descriptive confirmation message for user feedback or logging.
- `data` (`object` | `array` | `null`): The payload resulting from the operation. Can be a single object, an array of entities, or pagination metadata.

### 2.2 Error Response Shape

HTTP Status Code: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `500 Internal Server Error`

```json
{
  "success": false,
  "message": "Descriptive error message explaining the failure"
}
```

In development mode (`NODE_ENV=development`), error responses may also include an optional `stack` trace for debugging:

```json
{
  "success": false,
  "message": "Invalid transaction ID format",
  "stack": "CastError: Cast to ObjectId failed for value..."
}
```

---

## 3. Authentication & `req.user.id` Convention

### 3.1 Authentication Mechanism
- Stateless **JSON Web Tokens (JWT)** signed using HMAC-SHA256 with the secret key configured via `JWT_SECRET`.
- Clients transmit the token via the standard HTTP Authorization header:
  ```http
  Authorization: Bearer <jwt_token>
  ```

### 3.2 Authentication Middleware & `req.user.id`
The authentication middleware intercepts protected requests, verifies the JWT, and extracts the user identifier:
1. Validates presence and format of `Authorization: Bearer <token>`.
2. Verifies token validity and expiration.
3. Attaches the authenticated user payload to the Express request object:
   - `req.user.id`: The string/ObjectId representation of the authenticated user's ID.
   - `req.user`: Minimal user context (e.g. `{ id, email, name }`).
4. **Data Isolation Rule**: Every database query affecting user-owned resources (transactions, categories, analytics) **MUST** scope queries using `userId: req.user.id`. No client may read, modify, or delete a transaction belonging to another user.

### 3.3 Auth Endpoints Specification

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register a new user with name, email, and password |
| `POST` | `/api/auth/login` | No | Authenticate user credentials and return JWT token |
| `GET` | `/api/auth/me` | Yes (`Bearer`) | Retrieve current user profile from `req.user.id` |

#### `POST /api/auth/register` Request Body:
```json
{
  "name": "Alex Mercer",
  "email": "alex@example.com",
  "password": "SecurePassword123!"
}
```

#### Successful Auth Response:
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

---

## 4. Schemas & Data Models

### 4.1 User Schema (`backend/models/User.js`)

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `_id` | `ObjectId` | Yes (Auto) | MongoDB primary key |
| `name` | `String` | Yes | Trimmed, min length 2, max length 60 |
| `email` | `String` | Yes | Unique, lowercase, trimmed, valid email format |
| `password` | `String` | Yes | Min length 6, hashed with `bcryptjs` (salt rounds: 10), excluded from queries by default (`select: false`) |
| `createdAt` | `Date` | Yes (Auto) | Mongoose timestamps |
| `updatedAt` | `Date` | Yes (Auto) | Mongoose timestamps |

### 4.2 Transaction Schema (`backend/models/Transaction.js`)

Aligns with the KharchaSense frontend data model:

| Field | Type | Required | Default | Constraints / Notes |
|---|---|---|---|---|
| `_id` | `ObjectId` | Yes (Auto) | Auto | MongoDB primary key |
| `userId` | `ObjectId` | Yes | - | References `User` model (`ref: 'User'`), indexed |
| `title` | `String` | Yes | - | Non-empty, trimmed (e.g., "Grocery Shopping", "Netflix") |
| `amount` | `Number` | Yes | - | Positive finite number > 0 |
| `category` | `String` | Yes | - | Trimmed string (e.g., "Food", "Entertainment", "Utilities", "Housing", "Health", "Transportation", "Other") |
| `date` | `Date` | Yes | `Date.now` | Valid timestamp / ISO date string |
| `recurring` | `Boolean` | No | `false` | Indicates recurring/scheduled expense |
| `description` | `String` | No | `""` | Optional additional notes or memo |
| `isAnomaly` | `Boolean` | No | `false` | Flagged by anomaly detection service |
| `anomalyScore` | `Number` | No | `null` | Statistical Z-score or deviation rating |
| `createdAt` | `Date` | Yes (Auto) | - | Mongoose timestamps |
| `updatedAt` | `Date` | Yes (Auto) | - | Mongoose timestamps |

#### Recommended Mongoose Indexes:
```javascript
// Compound index for chronological querying per user
TransactionSchema.index({ userId: 1, date: -1 });

// Category aggregation query index
TransactionSchema.index({ userId: 1, category: 1 });
```

---

## 5. Transactions API Routes Contract

All transaction routes require valid JWT authentication via `Authorization: Bearer <token>`.

### 5.1 `GET /api/transactions`
Fetch transactions for the authenticated user (`req.user.id`).

- **Query Parameters:**
  - `startDate` (`string`, optional): ISO Date string filter (inclusive)
  - `endDate` (`string`, optional): ISO Date string filter (inclusive)
  - `category` (`string`, optional): Exact category filter
  - `recurring` (`boolean`, optional): Filter recurring status (`true`/`false`)
  - `isAnomaly` (`boolean`, optional): Filter anomaly status (`true`/`false`)
  - `page` (`number`, optional, default: 1): Page number
  - `limit` (`number`, optional, default: 50): Number of records per page
  - `sortBy` (`string`, optional, default: `date`): Sort field (`date`, `amount`, `title`)
  - `sortOrder` (`string`, optional, default: `desc`): `asc` or `desc`

- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "id": "671ad6218c983a54b3d11b04",
        "userId": "671ad4ef8c983a54b3d11a21",
        "title": "Grocery Supermarket",
        "amount": 78.50,
        "category": "Food",
        "date": "2026-10-24T00:00:00.000Z",
        "recurring": false,
        "description": "Weekly essentials",
        "isAnomaly": false,
        "anomalyScore": 0.42,
        "createdAt": "2026-10-24T10:15:00.000Z",
        "updatedAt": "2026-10-24T10:15:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

---

### 5.2 `POST /api/transactions`
Create a new transaction for the authenticated user (`req.user.id`).

- **Request Body:**
```json
{
  "title": "Internet Bill",
  "amount": 59.99,
  "category": "Utilities",
  "date": "2026-10-24",
  "recurring": true,
  "description": "Monthly fiber broadband"
}
```

- **Validation Rules:**
  - `title`: Non-empty string
  - `amount`: Positive finite number > 0
  - `category`: Non-empty string
  - `date`: Valid date string or timestamp

- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "id": "671ad7348c983a54b3d11b05",
    "userId": "671ad4ef8c983a54b3d11a21",
    "title": "Internet Bill",
    "amount": 59.99,
    "category": "Utilities",
    "date": "2026-10-24T00:00:00.000Z",
    "recurring": true,
    "description": "Monthly fiber broadband",
    "isAnomaly": false,
    "anomalyScore": null,
    "createdAt": "2026-10-24T12:00:00.000Z",
    "updatedAt": "2026-10-24T12:00:00.000Z"
  }
}
```

---

### 5.3 `GET /api/transactions/:id`
Retrieve a single transaction by ID.

- **Security Constraint:** Must match both `_id === req.params.id` and `userId === req.user.id`.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Transaction retrieved successfully",
  "data": {
    "id": "671ad7348c983a54b3d11b05",
    "userId": "671ad4ef8c983a54b3d11a21",
    "title": "Internet Bill",
    "amount": 59.99,
    "category": "Utilities",
    "date": "2026-10-24T00:00:00.000Z",
    "recurring": true,
    "description": "Monthly fiber broadband",
    "isAnomaly": false,
    "anomalyScore": null,
    "createdAt": "2026-10-24T12:00:00.000Z",
    "updatedAt": "2026-10-24T12:00:00.000Z"
  }
}
```
- **Response `404 Not Found`:**
```json
{
  "success": false,
  "message": "Transaction not found"
}
```

---

### 5.4 `PUT /api/transactions/:id`
Update an existing transaction owned by `req.user.id`.

- **Security Constraint:** Cannot modify transactions belonging to other users.
- **Request Body:** Partial or complete transaction fields (`title`, `amount`, `category`, `date`, `recurring`, `description`).
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Transaction updated successfully",
  "data": {
    "id": "671ad7348c983a54b3d11b05",
    "userId": "671ad4ef8c983a54b3d11a21",
    "title": "High-Speed Internet Bill",
    "amount": 64.99,
    "category": "Utilities",
    "date": "2026-10-24T00:00:00.000Z",
    "recurring": true,
    "description": "Upgraded speed tier",
    "isAnomaly": false,
    "anomalyScore": null,
    "createdAt": "2026-10-24T12:00:00.000Z",
    "updatedAt": "2026-10-24T12:30:00.000Z"
  }
}
```

---

### 5.5 `DELETE /api/transactions/:id`
Delete an existing transaction owned by `req.user.id`.

- **Security Constraint:** Scoped strictly to `_id === req.params.id` and `userId === req.user.id`.
- **Response `200 OK`:**
```json
{
  "success": true,
  "message": "Transaction deleted successfully",
  "data": {
    "id": "671ad7348c983a54b3d11b05"
  }
}
```

---

### 5.6 `POST /api/transactions/bulk`
Batch import transactions (supports CSV bulk import feature).

- **Request Body:**
```json
{
  "transactions": [
    {
      "title": "Coffee Shop",
      "amount": 4.50,
      "category": "Food",
      "date": "2026-10-20",
      "recurring": false
    },
    {
      "title": "Gym Membership",
      "amount": 45.00,
      "category": "Health",
      "date": "2026-10-01",
      "recurring": true
    }
  ]
}
```
- **Response `201 Created`:**
```json
{
  "success": true,
  "message": "Successfully imported 2 transactions",
  "data": {
    "importedCount": 2,
    "transactions": [ ... ]
  }
}
```

---

## 6. System & Health Endpoints

### 6.1 `GET /api/health`
Liveness and readiness health probe.

- **Auth Required:** No
- **Response `200 OK`:**
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

### 6.2 404 Route Fallback
Unmatched routes trigger the centralized 404 handler:

- **Response `404 Not Found`:**
```json
{
  "success": false,
  "message": "Resource not found: GET /api/unknown-endpoint"
}
```

---

## 7. Backend Directory Organization

```
backend/
├── .env.example            # Environment variables blueprint
├── .gitignore              # Ignores node_modules, .env, and logs
├── package.json            # Node.js dependencies & scripts
├── app.js                  # Express 5 app setup, CORS, Helmet, 404, errors
├── server.js               # Entry point, database bootstrap, process handlers
├── config/
│   └── db.js               # Mongoose database connection module
├── controllers/            # Route handler logic (MVC)
│   └── .gitkeep
├── models/                 # Mongoose schema definitions (MVC)
│   └── .gitkeep
├── routes/                 # Express route definitions (MVC)
│   └── .gitkeep
├── middlewares/            # Custom middleware (auth, error, validation)
│   └── .gitkeep
└── utils/                  # Helper utilities, formatters, and wrappers
    └── .gitkeep
```

---

## 8. Summary of Shared Conventions

1. **Envelope Uniformity**: All API responses must follow `{ success: true, data, message }` or `{ success: false, message }`.
2. **User Isolation**: All operations on user-specific resources must filter by `userId === req.user.id`.
3. **No Breaking Changes**: Field names (`title`, `amount`, `category`, `date`, `recurring`, `description`) remain consistent between client models and backend schemas.
4. **Environment-Driven Configuration**: Ports, database URIs, JWT secrets, and allowed CORS origins are supplied via environment variables without hardcoded secrets.
