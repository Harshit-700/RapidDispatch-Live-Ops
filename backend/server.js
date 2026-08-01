const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST'],
  },
});

 const path = require('path');


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


const ticketLocks = new Map();


const socketTickets = new Map();


const connectedAgents = new Map(); 

function serializeLocks() {

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


io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  
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

    if (typeof ack === 'function') ack(response);
    socket.emit('dashboard_state', response);

    console.log(`[join_dashboard] ${socket.id} (${userName || 'unknown'})`);
  });


  socket.on('lock_ticket', (payload = {}, ack) => {
    const { ticketId } = payload;

    if (!ticketId) {
      const err = { ok: false, error: 'ticketId is required' };
      if (typeof ack === 'function') ack(err);
      return;
    }

    const existingLock = ticketLocks.get(ticketId);

   
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

    if (existingLock && existingLock.socketId === socket.id) {
      if (typeof ack === 'function') ack({ ok: true, ticketId, lock: existingLock });
      return;
    }

  
    const agentMeta = connectedAgents.get(socket.id) || {};
    const lockInfo = lockTicket(ticketId, socket.id, agentMeta);

    const broadcastPayload = { ticketId, lock: lockInfo };

    if (typeof ack === 'function') ack({ ok: true, ticketId, lock: lockInfo });

    
    io.emit('ticket_locked', broadcastPayload);

    console.log(`[lock_ticket] ${ticketId} locked by ${socket.id}`);
  });


  socket.on('unlock_ticket', (payload = {}, ack) => {
    const { ticketId } = payload;

    if (!ticketId) {
      const err = { ok: false, error: 'ticketId is required' };
      if (typeof ack === 'function') ack(err);
      return;
    }

    const existingLock = ticketLocks.get(ticketId);

    if (!existingLock) {
   
      if (typeof ack === 'function') ack({ ok: true, ticketId, note: 'was_not_locked' });
      return;
    }

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


  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id} (${reason})`);

    const ownedTickets = socketTickets.get(socket.id);

    if (ownedTickets && ownedTickets.size > 0) {
     
      const releasedTicketIds = Array.from(ownedTickets);

      for (const ticketId of releasedTicketIds) {
        unlockTicket(ticketId);
        console.log(`[ghost_release] ${ticketId} auto-released (owner ${socket.id} disconnected)`);
      }

      io.emit('tickets_released', {
        ticketIds: releasedTicketIds,
        reason: 'agent_disconnected',
        socketId: socket.id,
      });
    }

  
    connectedAgents.delete(socket.id);
    socketTickets.delete(socket.id);

    io.emit('agent_left', { socketId: socket.id, agentCount: connectedAgents.size });
  });
});


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
