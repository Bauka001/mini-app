const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // In production, replace with actual origin
    methods: ["GET", "POST"]
  }
});

// Game State Storage
// Rooms: { [roomId]: { players: [socketId1, socketId2], scores: { [socketId]: 0 }, currentQuestion: null, state: 'waiting' | 'playing' | 'ended' } }
const rooms = {};
let waitingPlayer = null;

// Guild Storage
const guilds = {}; // { [id]: { id, name, creatorId, emblem, description, members: [{id, name, score}], messages: [], totalScore: 0 } }
const userGuildMap = {}; // { [socketId]: guildId }

// Global Chat
const globalMessages = []; // { id, sender, text, timestamp }

// Bot Logic
const handleBotResponse = (message, roomId = null) => {
  const lowerMsg = message.toLowerCase();
  let reply = null;

  if (lowerMsg.includes('help') || lowerMsg.includes('көмек')) {
    reply = "I'm here to help! You can ask about games, guilds, or battles. / Мен көмектесуге дайынмын! Ойындар, гильдиялар немесе жарыстар туралы сұраңыз.";
  } else if (lowerMsg.includes('hello') || lowerMsg.includes('сәлем')) {
    reply = "Hello there! Ready to train your brain? / Сәлем! Миыңызды жаттықтыруға дайынсыз ба?";
  } else if (lowerMsg.includes('game') || lowerMsg.includes('ойын')) {
    reply = "We have Schulte Table, Math, Stroop, and more! Check the Daily Workout. / Бізде Шульте кестесі, Математика, Струп және т.б. бар! Күнделікті жаттығуды тексеріңіз.";
  }

  if (reply) {
    const botMsg = {
      id: Date.now() + 1,
      sender: 'Focus Bot 🤖',
      text: reply,
      timestamp: new Date().toISOString(),
      isBot: true
    };
    
    setTimeout(() => {
      if (roomId) {
        // Guild Message
        if (guilds[roomId]) {
          guilds[roomId].messages.push(botMsg);
          io.to(`guild_${roomId}`).emit('new_guild_message', botMsg);
        }
      } else {
        // Global Message
        globalMessages.push(botMsg);
        if (globalMessages.length > 100) globalMessages.shift();
        io.emit('new_global_message', botMsg);
      }
    }, 1000);
  }
};

// Helper to generate question
const generateQuestion = () => {
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, ans;

  if (op === '*') {
    a = Math.floor(Math.random() * 9) + 2;
    b = Math.floor(Math.random() * 9) + 2;
    ans = a * b;
  } else {
    a = Math.floor(Math.random() * 50) + 1;
    b = Math.floor(Math.random() * 50) + 1;
    if (op === '-') {
      if (a < b) [a, b] = [b, a];
      ans = a - b;
    } else {
      ans = a + b;
    }
  }
  
  // Generate options
  const options = new Set();
  options.add(ans);
  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 10) - 5;
    const optionVal = ans + offset;
    if (optionVal !== ans && optionVal > 0) options.add(optionVal);
    if (options.size < 4) options.add(ans + Math.floor(Math.random() * 20) + 1);
  }

  return {
    text: `${a} ${op} ${b}`,
    answer: ans,
    options: Array.from(options).sort(() => Math.random() - 0.5)
  };
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('find_match', () => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      // Match found
      const roomId = waitingPlayer.id + '#' + socket.id;
      const opponent = waitingPlayer;
      
      socket.join(roomId);
      opponent.join(roomId);
      
      rooms[roomId] = {
        id: roomId,
        players: [opponent.id, socket.id],
        scores: { [opponent.id]: 0, [socket.id]: 0 },
        currentQuestion: generateQuestion(),
        state: 'playing',
        round: 1
      };

      console.log(`Match found in room ${roomId}`);
      io.to(roomId).emit('match_found', { 
        roomId, 
        opponentId: socket.id 
      }); // Notify both? No, notify individually ideally, but room emit works
      
      // Start Game
      io.to(roomId).emit('game_start', { 
        question: rooms[roomId].currentQuestion 
      });

      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      socket.emit('waiting_for_opponent');
      console.log('User waiting:', socket.id);
    }
  });

  socket.on('submit_answer', ({ roomId, answer }) => {
    const room = rooms[roomId];
    if (!room || room.state !== 'playing') return;

    const isCorrect = answer === room.currentQuestion.answer;
    
    if (isCorrect) {
      room.scores[socket.id] += 10;
      room.round += 1;

      if (room.round > 10) {
        // Game Over
        room.state = 'ended';
        io.to(roomId).emit('game_over', { scores: room.scores });
        delete rooms[roomId];
      } else {
        // Next Question
        room.currentQuestion = generateQuestion();
        io.to(roomId).emit('next_question', { 
          question: room.currentQuestion,
          scores: room.scores,
          winnerId: socket.id // Who won this round
        });
      }
    } else {
      // Wrong answer logic? Maybe penalty?
      // For now just ignore or emit 'wrong_answer'
      socket.emit('wrong_answer');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
    
    // Find active room and notify opponent
    // Simplified: Iterate all rooms
    for (const roomId in rooms) {
      if (rooms[roomId].players.includes(socket.id)) {
        io.to(roomId).emit('opponent_disconnected');
        delete rooms[roomId];
        break;
      }
    }
  });

  // --- GLOBAL CHAT EVENTS ---
  socket.on('join_global_chat', ({ userName, userId, photoUrl }) => {
    socket.emit('global_history', globalMessages);
  });

  socket.on('global_message', ({ message, userName, userId, photoUrl }) => {
    const msg = {
      id: Date.now(),
      sender: userName,
      text: message,
      timestamp: new Date().toISOString(),
      userId,
      photoUrl
    };
    globalMessages.push(msg);
    if (globalMessages.length > 100) globalMessages.shift();
    io.emit('new_global_message', msg);
    
    // Check for bot response - Removed from Global Chat as requested
    // handleBotResponse(message);
  });

  // --- ADMIN CHAT EVENTS ---
  socket.on('admin_get_global_messages', () => {
    socket.emit('admin_global_messages', globalMessages);
  });

  socket.on('admin_delete_message', ({ messageId }) => {
    const index = globalMessages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      globalMessages.splice(index, 1);
      io.emit('admin_global_messages', globalMessages);
    }
  });

  // --- GUILD EVENTS ---

  socket.on('get_guilds', () => {
    socket.emit('guilds_list', Object.values(guilds));
  });

  socket.on('create_guild', ({ name, userName, emblem, description }) => {
    const guildId = Date.now().toString();
    const newGuild = {
      id: guildId,
      name,
      creatorId: socket.id,
      emblem: emblem || '🛡️',
      description: description || 'No description',
      members: [{ id: socket.id, name: userName, score: 0 }],
      messages: [],
      totalScore: 0
    };
    guilds[guildId] = newGuild;
    userGuildMap[socket.id] = guildId;
    
    socket.join(`guild_${guildId}`);
    socket.emit('guild_created', newGuild);
    io.emit('guilds_list', Object.values(guilds)); // Update everyone
  });

  socket.on('leave_guild', ({ guildId }) => {
    const guild = guilds[guildId];
    if (guild) {
      guild.members = guild.members.filter(m => m.id !== socket.id);
      socket.leave(`guild_${guildId}`);
      delete userGuildMap[socket.id];
      
      if (guild.members.length === 0) {
        delete guilds[guildId];
      } else {
        io.to(`guild_${guildId}`).emit('guild_updated', guild);
      }
      
      socket.emit('guild_left');
      io.emit('guilds_list', Object.values(guilds));
    }
  });

  socket.on('join_guild', ({ guildId, userName }) => {
    const guild = guilds[guildId];
    if (guild) {
      // Check if already in a guild
      const currentGuildId = userGuildMap[socket.id];
      if (currentGuildId) {
        // Auto leave previous
        const prevGuild = guilds[currentGuildId];
        if (prevGuild) {
           prevGuild.members = prevGuild.members.filter(m => m.id !== socket.id);
           socket.leave(`guild_${currentGuildId}`);
           if (prevGuild.members.length === 0) delete guilds[currentGuildId];
           else io.to(`guild_${currentGuildId}`).emit('guild_updated', prevGuild);
        }
      }

      // Check if already member
      if (!guild.members.find(m => m.id === socket.id)) {
        guild.members.push({ id: socket.id, name: userName, score: 0 });
        userGuildMap[socket.id] = guildId;
      }
      
      socket.join(`guild_${guildId}`);
      socket.emit('guild_joined', guild);
      io.to(`guild_${guildId}`).emit('guild_updated', guild); // Notify members
      io.emit('guilds_list', Object.values(guilds)); // Update list for others
    }
  });

  socket.on('guild_message', ({ guildId, message, userName }) => {
    const guild = guilds[guildId];
    if (guild) {
      const msg = {
        id: Date.now(),
        sender: userName,
        text: message,
        timestamp: new Date().toISOString()
      };
      guild.messages.push(msg);
      // Keep only last 50 messages
      if (guild.messages.length > 50) guild.messages.shift();
      
      io.to(`guild_${guildId}`).emit('new_guild_message', msg);
      
      // Check for bot response
      handleBotResponse(message, guildId);
    }
  });

});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
