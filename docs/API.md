# API Reference — Plainview Phase 2

Base URL: `https://your-railway-domain.railway.app`

All protected endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Auth

### POST /api/auth/login
Login and receive a JWT token.

**Body**
```json
{ "email": "peter@elise.com", "password": "password123" }
```
**Response**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": { "id": 1, "email": "...", "name": "...", "role": "admin" }
}
```

### GET /api/auth/me
Get the currently authenticated user.

**Response**
```json
{ "id": 1, "email": "...", "name": "...", "role": "admin", "company_id": 1 }
```

### POST /api/auth/register *(admin only)*
Create a new user.

**Body**
```json
{ "email": "user@company.com", "password": "...", "name": "John", "role": "user", "company_id": 1 }
```

### PUT /api/auth/password
Change current user's password.

**Body**
```json
{ "current_password": "...", "new_password": "..." }
```

---

## Analysis

### POST /api/analyze
Upload XER files and run full schedule analysis. Saves result to DB.

**Form Data**
- `files[]`: 1–4 `.xer` files (multipart)
- `file_type`: `"baseline"` or `"update"` (default: `"update"`)
- `notes`: optional string

**Response**
```json
{
  "analysis_id": 42,
  "kpis": { ... },
  "spi_by_contractor": [ ... ],
  "ppc": [ ... ],
  "scurve": { ... },
  "resources": [ ... ],
  "float_erosion": [ ... ],
  "milestones": [ ... ],
  "critical_path": [ ... ],
  "gantt": { "tasks": [...], "project_start": "...", "project_end": "..." },
  "observations": [ ... ],
  "files_analyzed": [ ... ],
  "data_dates": [ ... ]
}
```

---

## History

### GET /api/analyses
List all analyses for the authenticated user's company.

**Query params**: `?limit=20&offset=0&file_type=baseline`

**Response**
```json
{
  "items": [
    {
      "id": 42,
      "project_name": "Elise Tower",
      "filenames": ["update_w45.xer"],
      "file_type": "update",
      "notes": null,
      "created_at": "2026-05-10T14:32:00Z"
    }
  ],
  "total": 57
}
```

### GET /api/analyses/{id}
Get a full analysis result by ID.

**Response**: Full analysis JSON (same structure as POST /api/analyze response)

### PATCH /api/analyses/{id}
Update analysis metadata.

**Body**
```json
{ "file_type": "baseline", "notes": "Official baseline snapshot" }
```

### DELETE /api/analyses/{id}
Delete an analysis and its AI conversations.

---

## Companies

### GET /api/companies/{slug}
Get company info by slug.

**Response**
```json
{
  "id": 1,
  "slug": "plainview",
  "name": "Plainview / Elise Enterprise",
  "logo_url": "/api/companies/plainview/logo"
}
```

### POST /api/companies/{slug}/logo *(admin only)*
Upload company logo.

**Form Data**: `file`: PNG/JPG image

### PUT /api/companies/{slug} *(admin only)*
Update company name.

**Body**: `{ "name": "New Name" }`

---

## AI Chat

### POST /api/chat
Send a message and get an AI response based on schedule data.

**Body**
```json
{
  "message": "Which activities are most at risk?",
  "analysis_id": 42,
  "conversation_id": null
}
```

**Response**
```json
{
  "reply": "Based on the analysis, 12 activities have negative float...",
  "conversation_id": 7,
  "message_id": 23
}
```

### GET /api/chat/conversations
List all AI conversations for the current user.

**Response**
```json
[
  { "id": 7, "title": "Risk Assessment", "analysis_id": 42, "created_at": "..." }
]
```

### GET /api/chat/conversations/{id}
Get a conversation with all its messages.

**Response**
```json
{
  "id": 7,
  "title": "Risk Assessment",
  "messages": [
    { "id": 1, "role": "user", "content": "...", "created_at": "..." },
    { "id": 2, "role": "assistant", "content": "...", "created_at": "..." }
  ]
}
```

### DELETE /api/chat/conversations/{id}
Delete a conversation and all its messages.

---

## Admin

### GET /api/admin/stats *(admin only)*
System statistics.

**Response**
```json
{
  "total_analyses": 150,
  "total_users": 8,
  "total_companies": 3,
  "recent_analyses": [ ... ]
}
```

### GET /api/admin/users *(admin only)*
List all users.

### POST /api/admin/users *(admin only)*
Create a new user (same as /api/auth/register).

### DELETE /api/admin/users/{id} *(admin only)*
Deactivate a user account.

---

## Error Responses

All errors follow the standard FastAPI format:

```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (invalid input) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 422 | Validation error |
| 500 | Internal server error |
