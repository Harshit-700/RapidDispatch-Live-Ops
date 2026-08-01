# Rapid Dispatch

Rapid Dispatch is a lightweight real-time ticket locking application built using **Node.js, Express.js, and Socket.IO**. The project demonstrates how multiple support agents can collaborate on the same dashboard while preventing concurrent editing of the same ticket through a real-time locking mechanism.

The application automatically releases ticket locks when an agent disconnects, preventing stale locks and ensuring uninterrupted collaboration.

---

# 📸 Screenshot



---

# 🔗 Live Demo

**Local Server:** https://rapiddispatch-live-ops.onrender.com

---

# 📁 Project Structure

```txt
Rapid_dispatch/
│
├── server.js          # Express + Socket.IO server
├── index.html         # Demo frontend interface
├── package.json       # Project dependencies
└── README.md          # Documentation
```

---

# ✨ Features

- Real-time ticket locking
- Automatic ticket unlock on disconnect
- Multi-user synchronization using Socket.IO
- Live dashboard updates
- Prevents simultaneous ticket editing
- In-memory lock management
- REST API for health checks
- Simple demo frontend
- Lightweight Express server
- Cross-Origin support

---

# 🚀 Getting Started

## 1. Clone Repository

```bash
git clone <repository-url>
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Start Server

```bash
npm start
```

or

```bash
node server.js
```

---

Expected Output

```bash
Ticket lock server listening on http://localhost:3001
```

---

## 4. Open Browser

```text
http://localhost:3001
```

Open the application in **two browser tabs** to observe real-time ticket locking and automatic synchronization.

---

# 🔗 REST API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Ticket Lock Dashboard |
| GET | `/health` | Server health status |
| GET | `/api/locks` | Current active ticket locks |

---

# 🔌 Socket.IO Events

## Client → Server

| Event | Description |
|--------|-------------|
| join_dashboard | Register agent and receive dashboard state |
| lock_ticket | Lock a ticket |
| unlock_ticket | Release a ticket lock |

---

## Server → Client

| Event | Description |
|--------|-------------|
| dashboard_state | Initial dashboard data |
| ticket_locked | Ticket successfully locked |
| ticket_unlocked | Ticket manually unlocked |
| tickets_released | Locks released after disconnect |
| lock_rejected | Lock request rejected |
| agent_left | Agent disconnected |

---

# 📊 Backend Functionalities

| Functionality | Description |
|---------------|-------------|
| Express Server | Hosts frontend and APIs |
| Socket.IO | Real-time communication |
| Ticket Locking | Prevents concurrent edits |
| Auto Unlock | Releases locks on disconnect |
| In-memory Storage | Stores active ticket locks |
| Health Endpoint | Checks server availability |
| Lock API | Returns active lock information |

---

# 🧪 How to Test

### Open two browser tabs

Tab 1

- Join as **Agent A**
- Lock Ticket **TCK-101**

Tab 2

- Join as **Agent B**
- Observe that Ticket **TCK-101** is already locked.

Close Tab 1 without unlocking.

Result:

- Ticket automatically becomes available.
- Remaining clients receive an instant update.

---

# ⚡ Technologies Used

| Technology | Purpose |
|------------|---------|
| Node.js | JavaScript Runtime |
| Express.js | Web Server |
| Socket.IO | Real-time Communication |
| HTML5 | Frontend Interface |
| JavaScript | Client-side Logic |

---

# 🛠️ Built With

- Node.js
- Express.js
- Socket.IO
- HTML5
- CSS3
- JavaScript

---

# 💡 Future Improvements

- MongoDB integration
- JWT Authentication
- User Login System
- Role-Based Access Control
- Persistent Ticket Storage
- Redis for Distributed Locking
- Modern React Dashboard
- Tailwind CSS UI
- Audit Logs
- Docker Deployment

---

# 🌍 Deployment

Supported Platforms

- Render
- Railway
- VPS
- Docker
- AWS EC2

---

# 📄 License

This project is licensed under the **MIT License**.
