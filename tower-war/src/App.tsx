import { useEffect, useRef } from 'react';
import { Game } from './game/engine';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize Game
    const game = new Game(canvasRef.current);

    // Handle Resize
    const resize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div className="w-full h-screen bg-gray-900 overflow-hidden">
      <canvas ref={canvasRef} className="block" />
      <div className="absolute top-4 left-4 text-white pointer-events-none select-none">
        <h1 className="text-2xl font-bold text-blue-500">Tower War Clone</h1>
        <p className="text-sm text-gray-400">Drag from BLUE tower to capture others!</p>
      </div>
    </div>
  );
}

export default App;
