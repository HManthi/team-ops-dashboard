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

### GET / api/tickets

### description
Returns a list of tickets.


---
#### Success response (200)
```json
[
  {
    "id": 1,
    "title": "Investigate API latency",
    "status": "open",
    "priority": "high",
    "createdAt": "2026-01-31T10:15:00Z",
    "assignedTo": {
      "id": 1,
      "name": "Admin user"
    }
  }
]

## GET /api/tickets/:id/events

### Description
Returns the audit event timeline for a ticket.

---

### Success Response (200)
```json
[
  {
    "id": 2,
    "eventType": "ticket_created",
    "createdAt": "2026-01-30T18:49:06.860Z",
    "actor": {
      "id": 1,
      "email": "admin@teamops.local"
    },
    "oldValue": null,
    "newValue": "{\"title\":\"...\"}"
  }
]


### 400 – Invalid Ticket ID
{ "error": "Invalid ticket id" }

### 500 – Server Error
{ "error": "Internal server error" }

### PATCH / api/tickets/:id

### description
updates a ticket (status/priority/assignee) and writes a TicketEvent for each change.

### Request body (example)
```json
{ "status": "in_progress" }
{ "assignedToId": 2 }
{ "priority": "low" }
