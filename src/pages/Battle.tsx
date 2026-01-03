import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { Zap, Trophy } from 'lucide-react';
import { clsx } from 'clsx';

// Initialize socket outside component to avoid multiple connections
// In a real app, use a Context or custom hook
const SOCKET_URL = 'http://localhost:3001';

type GameState = 'lobby' | 'finding' | 'playing' | 'ended';

interface Question {
  text: string;
  answer: number;
  options: number[];
}

export const BattlePage = () => {
  const navigate = useNavigate();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [question, setQuestion] = useState<Question | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [roomId, setRoomId] = useState('');

  // Connect to socket on mount
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 3,
        timeout: 5000,
        autoConnect: false // Disabled to prevent console errors when backend is offline
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('connect_error', (err) => {
        console.warn('Socket connection error:', err.message);
        setStatusMsg('Connection failed. Playing offline/demo mode not available yet.');
    });

    newSocket.on('waiting_for_opponent', () => {
      setGameState('finding');
      setStatusMsg('Searching for opponent...');
    });

    newSocket.on('match_found', (data) => {
      setRoomId(data.roomId);
      setStatusMsg('Match Found! Starting...');
      // Wait for game_start event
    });

    newSocket.on('game_start', (data) => {
      setGameState('playing');
      setQuestion(data.question);
    });

    newSocket.on('next_question', (data) => {
      setQuestion(data.question);
      updateScores(data.scores, newSocket.id);
    });

    newSocket.on('game_over', (data) => {
      setGameState('ended');
      updateScores(data.scores, newSocket.id);
    });

    newSocket.on('opponent_disconnected', () => {
      setStatusMsg('Opponent disconnected. You win!');
      setGameState('ended');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const updateScores = (serverScores: any, myId: string | undefined) => {
    if (!myId) return;
    setMyScore(serverScores[myId] || 0);
    // Find opponent score (any key that is not myId)
    const oppId = Object.keys(serverScores).find(id => id !== myId);
    if (oppId) setOppScore(serverScores[oppId]);
  };

  const findMatch = () => {
    if (socket) {
      socket.emit('find_match');
      setGameState('finding');
    }
  };

  const submitAnswer = (ans: number) => {
    if (socket && roomId) {
      socket.emit('submit_answer', { roomId, answer: ans });
    }
  };

  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-primary/50 blur-xl rounded-full animate-pulse" />
            <Trophy size={64} className="text-primary relative z-10" />
          </div>
          
          <h1 className="text-4xl font-black mb-2 uppercase tracking-tighter">
            Online <span className="text-primary">Battle</span>
          </h1>
          <p className="text-gray-400 mb-8 max-w-xs">
            Compete against real players in real-time math battles!
          </p>

          <button 
            onClick={findMatch}
            className="w-full max-w-xs py-4 bg-gradient-to-r from-primary to-blue-600 text-white font-black text-xl rounded-2xl shadow-lg shadow-primary/30 hover:scale-105 transition-transform flex items-center justify-center gap-3"
          >
            <Zap size={24} className="animate-pulse" />
            Find Match
          </button>
          
          <button onClick={() => navigate(-1)} className="mt-6 text-gray-500 text-sm font-bold">
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'finding') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-2xl font-bold animate-pulse">{statusMsg}</h2>
        <p className="text-gray-500 mt-2">Waiting for opponent...</p>
        <button onClick={() => window.location.reload()} className="mt-8 text-red-500 text-sm font-bold">
          Cancel
        </button>
      </div>
    );
  }

  if (gameState === 'ended') {
    const isWin = myScore > oppScore;
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className={clsx("text-5xl font-black mb-4", isWin ? "text-green-400" : "text-red-400")}>
          {isWin ? "YOU WON!" : "YOU LOST"}
        </h1>
        <div className="text-2xl font-bold mb-8">
           {myScore} - {oppScore}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-white text-black font-bold rounded-xl"
        >
          Play Again
        </button>
        <button onClick={() => navigate('/')} className="mt-4 text-gray-500">
          Home
        </button>
      </div>
    );
  }

  // Playing State
  return (
    <div className="min-h-screen bg-black text-white p-4 flex flex-col relative overflow-hidden">
      {/* Header Scores */}
      <div className="flex justify-between items-center mb-8 relative z-10">
        <div className="flex flex-col items-start bg-blue-500/20 p-3 rounded-xl border border-blue-500/50">
           <span className="text-xs text-blue-300 font-bold uppercase">You</span>
           <span className="text-2xl font-black text-white">{myScore}</span>
        </div>
        <div className="text-xl font-black text-gray-600">VS</div>
        <div className="flex flex-col items-end bg-red-500/20 p-3 rounded-xl border border-red-500/50">
           <span className="text-xs text-red-300 font-bold uppercase">Opponent</span>
           <span className="text-2xl font-black text-white">{oppScore}</span>
        </div>
      </div>

      {question && (
        <div className="flex-1 flex flex-col items-center justify-center relative z-10">
          <div className="w-full bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 mb-8 text-center shadow-2xl">
            <h2 className="text-6xl font-black text-white drop-shadow-lg">{question.text}</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            {question.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => submitAnswer(opt)}
                className="py-6 bg-white/10 hover:bg-primary hover:text-black rounded-2xl text-3xl font-bold transition-all active:scale-95 border border-white/5"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BattlePage;
