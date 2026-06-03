// QULA SOǴYSY — Tower War online multiplayer (authoritative server)
// Node + ws. Serves the client and runs the game simulation.
import { createServer } from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer } from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.TW_PORT || 8123;

// ---------- static file serving ----------
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css' };
const server = createServer((req, res) => {
  let path = req.url.split('?')[0];
  if (path === '/' || path === '') path = '/index.html';
  try {
    const ext = path.slice(path.lastIndexOf('.'));
    const buf = readFileSync(join(__dirname, path));
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) {
    res.writeHead(404); res.end('not found');
  }
});

// ---------- game config ----------
const TICK_MS = 50;            // 20 ticks/sec
const DT = TICK_MS / 1000;
const GROW_MS = 950;           // owned towers gain +1 each interval
const CAP = 60;                // max troops a tower holds
const SQUAD_SPEED = 0.17;      // map-units per second (map is 0..1)
const BOT_THINK_MS = 1100;
const QUEUE_BOT_TIMEOUT = 5000;

// Symmetric map (point-symmetric about center → fair for both sides).
// owner: 0 neutral, 1 bottom player, 2 top player. type is cosmetic.
function freshMap() {
  return [
    { id:0,  x:0.50, y:0.90, owner:1, count:22, type:'home' },
    { id:1,  x:0.50, y:0.10, owner:2, count:22, type:'home' },
    { id:2,  x:0.20, y:0.78, owner:0, count:10, type:'arrow' },
    { id:3,  x:0.80, y:0.22, owner:0, count:10, type:'arrow' },
    { id:4,  x:0.80, y:0.78, owner:0, count:10, type:'arrow' },
    { id:5,  x:0.20, y:0.22, owner:0, count:10, type:'arrow' },
    { id:6,  x:0.50, y:0.66, owner:0, count:16, type:'cannon' },
    { id:7,  x:0.50, y:0.34, owner:0, count:16, type:'cannon' },
    { id:8,  x:0.16, y:0.50, owner:0, count:12, type:'mage' },
    { id:9,  x:0.84, y:0.50, owner:0, count:12, type:'mage' },
    { id:10, x:0.50, y:0.50, owner:0, count:25, type:'fort' },
  ];
}

let nextSquadId = 1;
let nextRoomId = 1;
const rooms = new Map();
let waiting = null;          // a single waiting socket
let waitTimer = null;

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function createRoom(p1, p2 /* p2 null => bot */) {
  const room = {
    id: nextRoomId++,
    towers: freshMap(),
    squads: [],
    growAcc: 0,
    over: false,
    bot: !p2,
    botAcc: 0,
    players: [p1, p2].filter(Boolean),
  };
  p1.room = room; p1.playerNum = 1;
  if (p2) { p2.room = room; p2.playerNum = 2; }
  rooms.set(room.id, room);
  send(p1, { type:'matched', you:1, opponent: p2 ? 'human' : 'bot' });
  if (p2) send(p2, { type:'matched', you:2, opponent:'human' });
  return room;
}

function tower(room, id) { return room.towers.find(t => t.id === id); }

function doSend(room, owner, fromId, toId) {
  if (room.over) return;
  const from = tower(room, fromId), to = tower(room, toId);
  if (!from || !to || from.id === to.id) return;
  if (from.owner !== owner) return;
  const n = Math.floor(from.count / 2);
  if (n < 1) return;
  from.count -= n;
  const d = Math.hypot(to.x - from.x, to.y - from.y) || 0.001;
  room.squads.push({
    id: nextSquadId++, owner, count: n,
    fromX: from.x, fromY: from.y, toX: to.x, toY: to.y,
    target: to.id, x: from.x, y: from.y, progress: 0, dist: d,
  });
}

function resolveArrival(room, sq) {
  const to = tower(room, sq.target);
  if (!to) return;
  if (to.owner === sq.owner) {
    to.count = Math.min(CAP + 40, to.count + sq.count);
  } else {
    to.count -= sq.count;
    if (to.count < 0) { to.owner = sq.owner; to.count = -to.count; }
    else if (to.count === 0) { to.owner = sq.owner; }
  }
}

function checkWin(room) {
  const present = new Set();
  for (const t of room.towers) if (t.owner !== 0) present.add(t.owner);
  for (const s of room.squads) present.add(s.owner);
  // game is live once someone could lose; if only one side present → winner
  if (present.size <= 1) {
    const winner = present.values().next().value || 0;
    room.over = true;
    for (const p of room.players) {
      send(p, { type:'gameover', winner, youWon: p.playerNum === winner });
    }
  }
}

function botThink(room) {
  // bot is player 2. Pick strongest bot tower, attack weakest reachable non-bot tower.
  const mine = room.towers.filter(t => t.owner === 2 && t.count > 6);
  if (!mine.length) return;
  const targets = room.towers.filter(t => t.owner !== 2);
  if (!targets.length) return;
  mine.sort((a,b) => b.count - a.count);
  const src = mine[0];
  // prefer nearby weak targets: score = count + distance*20
  targets.sort((a,b) => {
    const da = Math.hypot(a.x-src.x, a.y-src.y), db = Math.hypot(b.x-src.x, b.y-src.y);
    return (a.count + da*25) - (b.count + db*25);
  });
  const tgt = targets[0];
  // only attack if we have a reasonable chance, or it's neutral
  if (src.count > tgt.count * 0.6 || tgt.owner === 0) {
    doSend(room, 2, src.id, tgt.id);
  }
}

function tick(room) {
  if (room.over) return;
  // growth
  room.growAcc += TICK_MS;
  if (room.growAcc >= GROW_MS) {
    room.growAcc -= GROW_MS;
    for (const t of room.towers) {
      if (t.owner !== 0 && t.count < CAP) t.count++;
    }
  }
  // bot
  if (room.bot) {
    room.botAcc += TICK_MS;
    if (room.botAcc >= BOT_THINK_MS) { room.botAcc = 0; botThink(room); }
  }
  // squads
  for (let i = room.squads.length - 1; i >= 0; i--) {
    const s = room.squads[i];
    s.progress += (SQUAD_SPEED * DT) / s.dist;
    if (s.progress >= 1) {
      resolveArrival(room, s);
      room.squads.splice(i, 1);
    } else {
      s.x = s.fromX + (s.toX - s.fromX) * s.progress;
      s.y = s.fromY + (s.toY - s.fromY) * s.progress;
    }
  }
  checkWin(room);
  broadcast(room);
}

function broadcast(room) {
  const payload = {
    type: 'state',
    towers: room.towers.map(t => ({ id:t.id, x:t.x, y:t.y, o:t.owner, c:Math.round(t.count), ty:t.type })),
    squads: room.squads.map(s => ({ x:+s.x.toFixed(3), y:+s.y.toFixed(3), o:s.owner, c:s.count })),
  };
  for (const p of room.players) send(p, payload);
}

// master loop
setInterval(() => { for (const room of rooms.values()) if (!room.over) tick(room); }, TICK_MS);

// cleanup finished/empty rooms periodically
setInterval(() => {
  for (const [id, room] of rooms) {
    const alive = room.players.some(p => p.readyState === 1);
    if (room.over || !alive) {
      // give clients a moment to read gameover, then drop
      if (!room._reap) room._reap = 1;
      else rooms.delete(id);
    }
  }
}, 3000);

// ---------- websocket ----------
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  send(ws, { type:'hello' });

  ws.on('message', (data) => {
    let msg; try { msg = JSON.parse(data); } catch { return; }

    if (msg.type === 'find') {
      if (ws.room) return;
      if (waiting && waiting !== ws && waiting.readyState === 1) {
        const opp = waiting; waiting = null;
        if (waitTimer) { clearTimeout(waitTimer); waitTimer = null; }
        createRoom(opp, ws);
      } else {
        waiting = ws;
        send(ws, { type:'searching' });
        if (waitTimer) clearTimeout(waitTimer);
        waitTimer = setTimeout(() => {
          if (waiting && waiting.readyState === 1 && !waiting.room) {
            const solo = waiting; waiting = null; waitTimer = null;
            createRoom(solo, null); // vs bot
          }
        }, QUEUE_BOT_TIMEOUT);
      }
    }

    else if (msg.type === 'bot') { // play vs bot immediately
      if (ws.room) return;
      if (waiting === ws) { waiting = null; if (waitTimer) clearTimeout(waitTimer); }
      createRoom(ws, null);
    }

    else if (msg.type === 'send' && ws.room) {
      doSend(ws.room, ws.playerNum, msg.from, msg.to);
    }

    else if (msg.type === 'leave') {
      cleanup(ws);
    }
  });

  ws.on('close', () => cleanup(ws));
  ws.on('error', () => cleanup(ws));
});

function cleanup(ws) {
  if (waiting === ws) { waiting = null; if (waitTimer) { clearTimeout(waitTimer); waitTimer = null; } }
  const room = ws.room;
  if (room && !room.over) {
    // opponent wins by forfeit
    room.over = true;
    for (const p of room.players) {
      if (p !== ws) send(p, { type:'gameover', winner:p.playerNum, youWon:true, forfeit:true });
    }
  }
  if (room) ws.room = null;
}

server.listen(PORT, () => {
  console.log(`QULA SOǴYSY server → http://localhost:${PORT}`);
});
