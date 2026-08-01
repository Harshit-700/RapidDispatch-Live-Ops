# Rapid Dispatch Prompts

This document contains the complete collection of structured prompts used during the development of the Rapid Dispatch Real-time Ticket Lock Server.

---

## 1. Backend Architecture

Create a scalable real-time backend application using Node.js, Express.js, and Socket.IO. Organize the application with a clean and maintainable architecture that efficiently manages ticket locks, connected agents, and real-time communication while remaining simple enough for future feature expansion.

---

## 2. Express Server Configuration

Develop an Express.js server that initializes successfully with proper middleware configuration. Configure JSON parsing, static file serving, CORS support, and HTTP server creation to provide a stable foundation for Socket.IO communication and REST API endpoints.

---

## 3. Socket.IO Integration

Integrate Socket.IO to establish real-time bidirectional communication between the server and multiple connected clients. Ensure every connected agent receives live updates whenever tickets are locked, unlocked, or automatically released.

---

## 4. Ticket Lock Management

Implement an in-memory ticket locking system using JavaScript Maps. Each ticket should store information such as socket ID, user ID, user name, and lock timestamp to ensure only one agent can edit a ticket at any given time.

---

## 5. Dashboard Initialization

Develop a dashboard initialization workflow where agents join the system using a custom Socket.IO event. When connected, the client should immediately receive the current ticket lock state, connected agent count, and synchronization data required to render the dashboard correctly.

---

## 6. Real-Time Ticket Locking

Create a ticket locking mechanism that prevents multiple agents from editing the same ticket simultaneously. If a ticket is already locked, reject additional lock requests and notify the requesting client with information about the current lock owner.

---

## 7. Manual Ticket Unlocking

Implement functionality allowing the ticket owner to manually release a lock. Once unlocked, broadcast the update to every connected dashboard so that all users immediately see the ticket become available again.

---

## 8. Automatic Lock Release

Develop an automatic cleanup mechanism that releases all ticket locks when an agent disconnects unexpectedly due to browser closure, network interruption, or application crash. Notify all connected dashboards instantly to prevent stale ticket locks.

---

## 9. Connected Agent Tracking

Maintain a collection of connected agents containing user identity and connection metadata. Update the active agent count whenever users join or leave the dashboard and broadcast the updated information in real time.

---

## 10. REST API Development

Create lightweight REST endpoints that provide useful debugging and monitoring functionality. Implement endpoints for server health status and active ticket locks while returning structured JSON responses suitable for API testing.

---

## 11. Frontend Integration

Develop a lightweight HTML-based dashboard that communicates with the backend using Socket.IO. The interface should allow agents to join the dashboard, lock tickets, unlock tickets, and observe live synchronization without requiring page refreshes.

---

## 12. Error Handling and Validation

Implement input validation for every Socket.IO event and REST endpoint. Validate required fields such as ticket identifiers and return meaningful error messages whenever invalid requests or unauthorized operations are attempted.

---

## 13. Real-Time Testing Workflow

Verify the application by opening multiple browser tabs representing different agents. Test ticket locking, lock rejection, manual unlocking, automatic disconnect handling, dashboard synchronization, and REST API endpoints to ensure reliable real-time collaboration.

---

## 14. Deployment Preparation

Prepare the application for deployment by supporting configurable environment variables, dynamic server ports, production-ready CORS settings, and optimized startup scripts. Ensure compatibility with hosting platforms such as Render, Railway, Docker, and VPS environments.

---

## 15. Future Scalability Planning

Design the project to support future enhancements including MongoDB persistence, JWT authentication, role-based access control, Redis-based distributed locking, React dashboard integration, audit logging, ticket history, notifications, analytics, Docker containerization, and horizontal scalability without requiring major architectural changes.

---