const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // tighten this to your frontend origin in production
    methods: ['GET', 'POST'],
  },
});

app.use(express.static('public'));
app.use(express.json());

// ---------------------------------------------------------------------------
// IN-MEMORY STATE
// ---------------------------------------------------------------------------
// ticketLocks:   ticketId -> { socketId, userId, userName, lockedAt }
//   The source of truth for "is this ticket locked, and by whom".
const ticketLocks = new Map();

// socketTickets: socketId -> Set<ticketId>
//   Reverse index so that on disconnect we don't have to scan the entire
//   ticketLocks map. This turns the ghost-disconnect cleanup from an O(n)
//   scan into an O(1) lookup + O(k) unlock, where k = tickets that socket held
//   (almost always 0 or 1, but an agent could plausibly have several open).
const socketTickets = new Map();

// Optional: track socketId -> user metadata for nicer broadcasts / presence.
const connectedAgents = new Map(); // socketId -> { userId, userName, joinedAt }

function serializeLocks() {
  // Send the client a plain object it can easily consume.
  const obj = {};
  for (const [ticketId, lockInfo] of ticketLocks.entries()) {
    obj[ticketId] = lockInfo;
  }
  return obj;
}

function lockTicket(ticketId, socketId, userMeta = {}) {
  const lockInfo = {
    socketId,
    userId: userMeta.userId || null,
    userName: userMeta.userName || 'Unknown agent',
    lockedAt: Date.now(),
  };
  ticketLocks.set(ticketId, lockInfo);

  if (!socketTickets.has(socketId)) {
    socketTickets.set(socketId, new Set());
  }
  socketTickets.get(socketId).add(ticketId);

  return lockInfo;
}

function unlockTicket(ticketId) {
  const lockInfo = ticketLocks.get(ticketId);
  if (!lockInfo) return null;

  ticketLocks.delete(ticketId);

  const owned = socketTickets.get(lockInfo.socketId);
  if (owned) {
    owned.delete(ticketId);
    if (owned.size === 0) socketTickets.delete(lockInfo.socketId);
  }

  return lockInfo;
}

// ---------------------------------------------------------------------------
// SOCKET.IO EVENT HANDLERS
// ---------------------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ---- join_dashboard -------------------------------------------------
  // Client announces itself and asks for the current lock state so its UI
  // can render correctly on load, without waiting for the next broadcast.
  socket.on('join_dashboard', (payload = {}, ack) => {
    const { userId, userName } = payload;

    connectedAgents.set(socket.id, {
      userId: userId || null,
      userName: userName || 'Unknown agent',
      joinedAt: Date.now(),
    });

    socket.join('dashboard');

    const response = {
      ok: true,
      locks: serializeLocks(),
      agentCount: connectedAgents.size,
    };

    // Support both ack-callback and event-based patterns for the client.
    if (typeof ack === 'function') ack(response);
    socket.emit('dashboard_state', response);

    console.log(`[join_dashboard] ${socket.id} (${userName || 'unknown'})`);
  });

  // ---- lock_ticket ------------------------------------------------------
  socket.on('lock_ticket', (payload = {}, ack) => {
    const { ticketId } = payload;

    if (!ticketId) {
      const err = { ok: false, error: 'ticketId is required' };
      if (typeof ack === 'function') ack(err);
      return;
    }

    const existingLock = ticketLocks.get(ticketId);

    // Already locked by someone else -> reject.
    if (existingLock && existingLock.socketId !== socket.id) {
      const rejection = {
        ok: false,
        error: 'ticket_already_locked',
        ticketId,
        lockedBy: {
          userName: existingLock.userName,
          userId: existingLock.userId,
        },
      };
      if (typeof ack === 'function') ack(rejection);
      socket.emit('lock_rejected', rejection);
      return;
    }

    // Already locked by *this* socket -> idempotent success, no need to
    // re-broadcast, but ack normally so the client isn't left hanging.
    if (existingLock && existingLock.socketId === socket.id) {
      if (typeof ack === 'function') ack({ ok: true, ticketId, lock: existingLock });
      return;
    }

    // Free -> lock it.
    const agentMeta = connectedAgents.get(socket.id) || {};
    const lockInfo = lockTicket(ticketId, socket.id, agentMeta);

    const broadcastPayload = { ticketId, lock: lockInfo };

    if (typeof ack === 'function') ack({ ok: true, ticketId, lock: lockInfo });

    // Broadcast to EVERY connected client (including the locker) so all UIs
    // stay in sync from a single source of truth.
    io.emit('ticket_locked', broadcastPayload);

    console.log(`[lock_ticket] ${ticketId} locked by ${socket.id}`);
  });

  // ---- unlock_ticket ------------------------------------------------------
  socket.on('unlock_ticket', (payload = {}, ack) => {
    const { ticketId } = payload;

    if (!ticketId) {
      const err = { ok: false, error: 'ticketId is required' };
      if (typeof ack === 'function') ack(err);
      return;
    }

    const existingLock = ticketLocks.get(ticketId);

    if (!existingLock) {
      // Nothing to unlock - treat as success (idempotent) but flag it.
      if (typeof ack === 'function') ack({ ok: true, ticketId, note: 'was_not_locked' });
      return;
    }

    // Only the owner (or you could allow admins) can release the lock.
    if (existingLock.socketId !== socket.id) {
      const rejection = {
        ok: false,
        error: 'not_lock_owner',
        ticketId,
      };
      if (typeof ack === 'function') ack(rejection);
      return;
    }

    unlockTicket(ticketId);

    if (typeof ack === 'function') ack({ ok: true, ticketId });

    io.emit('ticket_unlocked', { ticketId, reason: 'manual_release' });

    console.log(`[unlock_ticket] ${ticketId} released by ${socket.id}`);
  });

  // ---- disconnect: THE GHOST DISCONNECT HANDLER --------------------------
  // This fires on ANY disconnect: closed laptop lid, network drop, browser
  // crash, tab close -- it does NOT require the client to have sent
  // unlock_ticket first. This is what prevents tickets from being stuck
  // locked forever.
  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id} (${reason})`);

    const ownedTickets = socketTickets.get(socket.id);

    if (ownedTickets && ownedTickets.size > 0) {
      // Copy to an array first -- unlockTicket() mutates the Set we're
      // iterating over (via socketTickets), so iterate over a snapshot.
      const releasedTicketIds = Array.from(ownedTickets);

      for (const ticketId of releasedTicketIds) {
        unlockTicket(ticketId);
        console.log(`[ghost_release] ${ticketId} auto-released (owner ${socket.id} disconnected)`);
      }

      // Broadcast ALL releases to remaining clients in one go so every
      // dashboard updates immediately, no polling, no stuck locks.
      io.emit('tickets_released', {
        ticketIds: releasedTicketIds,
        reason: 'agent_disconnected',
        socketId: socket.id,
      });
    }

    // Clean up presence bookkeeping too.
    connectedAgents.delete(socket.id);
    socketTickets.delete(socket.id);

    io.emit('agent_left', { socketId: socket.id, agentCount: connectedAgents.size });
  });
});

// ---------------------------------------------------------------------------
// OPTIONAL REST ENDPOINTS (handy for debugging / health checks)
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get('/api/locks', (req, res) => {
  res.json(serializeLocks());
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Ticket lock server listening on http://localhost:${PORT}`);
});
