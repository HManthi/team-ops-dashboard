# API Specification

## POST /api/tickets

### Description
Creates a new ticket and logs a ticket creation event.

---

### Request Body
```json
{
  "title": "Investigate API latency",
  "description": "Users report slow responses during peak hours",
  "priority": "high",
  "assignedToId": 1
}


### Field Rules
- title: required, string
- description: required,  string
- priority: one of 'low | medium | high'
- assignedToID: optional, integer

### Sucess Response (201)
```json
{
    "id": 1,
    "title": "Investigate API latency",
    "status": "open",
    "priority": "high",
    "createdAt": "2026-01-30T10:15:00Z"
}

### Error Responses

#### 400 – Validation Error
```json
{
  "error": "Invalid request payload"
}

### 403 - Forbidden Error
{
  "error": "You do not have permission to create tickets"
}


### 500 - Server error
{
  "error": "Internal server error"
}
