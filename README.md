# Backend Interview Challenge – API Documentation

This project provides a Task Management API with CRUD operations, along with Sync APIs for offline-first synchronization.

# 🌐 Base URL
https://backend-interview-challenge-gqr4.onrender.com/api

# 📋 Task APIs
1. Get All Tasks

Method: GET

Endpoint: /tasks

Description: Retrieve all tasks.

Response Codes:

200 OK → List of tasks

2. Get Single Task

Method: GET

Endpoint: /tasks/:id

Example: /tasks/80975acb-83c2-4f11-9a28-41ea90f02e37

Description: Retrieve a single task by ID.

Response Codes:

200 OK → Task found

404 Not Found → Task does not exist

3. Create a Task

Method: POST

Endpoint: /tasks

Description: Create a new task.

Request Body:

{
  "title": "Go to gym",
  "description": "Go to gym at 4 pm"
}


Response Codes:

201 Created → Task created

400 Bad Request → Invalid input

4. Update a Task

Method: PUT

Endpoint: /tasks/:id

Example: /tasks/80975acb-83c2-4f11-9a28-41ea90f02e37

Description: Update an existing task.

Request Body:

{
  "title": "Wake up at 9 am",
  "description": "wake up early",
  "completed": true
}


Response Codes:

200 OK → Task updated

404 Not Found → Task not found

5. Delete a Task

Method: DELETE

Endpoint: /tasks/:id

Example: /tasks/80975acb-83c2-4f11-9a28-41ea90f02e37

Description: Delete a task by ID.

Response Codes:

204 No Content → Task deleted

404 Not Found → Task not found

# 🔄 Sync APIs
1. Trigger Manual Sync

Method: POST

Endpoint: /sync

URL:
https://backend-interview-challenge-gqr4.onrender.com/api/sync

Description: Trigger a sync process to push/pull updates between client and server.

Response Codes:

200 OK → Sync completed

503 Service Unavailable → Server not reachable

500 Internal Server Error → Sync failed

2. Sync Health Check

Method: GET

Endpoint: /health

URL:
https://backend-interview-challenge-gqr4.onrender.com/api/health

Description: Check if the sync service is alive.

Response Codes:

200 OK → Service healthy

3. Sync Status

Method: GET

Endpoint: /status

URL:
https://backend-interview-challenge-gqr4.onrender.com/api/status

Description: Get current sync status, including pending sync items, last sync timestamp, and connectivity.

Response Codes:

200 OK → Status retrieved
