import React, { useState, useEffect, useCallback, useRef } from 'react';
import normalPepe from './assets/normal.webp';
import happyPepe from './assets/happy.webp';
import sadPepe from './assets/sad.webp';

const CheeseSlice = ({ width = 100, height = 20, rotation = 0 }) => (
  <svg width={width} height={height} viewBox="0 0 100 20" style={{ transform: `rotate(${rotation}deg)` }}>
    <path d="M5 2 L95 2 L90 18 L10 18 Z" fill="#ffd966" stroke="#f6b26b" strokeWidth="1" />
    <circle cx="25" cy="8" r="2" fill="#ffe599" />
    <circle cx="60" cy="10" r="2.5" fill="#ffe599" />
    <circle cx="40" cy="12" r="2" fill="#ffe599" />
    <circle cx="75" cy="7" r="1.5" fill="#ffe599" />
  </svg>
);

const CheeseGame = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);
  const [cheesePosition, setCheesePosition] = useState(150);
  const [direction, setDirection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mouseState, setMouseState] = useState('normal');
  const [stack, setStack] = useState([]);
  const [isToppling, setIsToppling] = useState(false);
  const [topplingDirection, setTopplingDirection] = useState(0);
  const lastTapRef = useRef(0);

  const CHEESE_WIDTH = 100;
  const GAME_WIDTH = 400;
  const BASE_SPEED = 4;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();
  }, []);

  const BOUNDARY_RIGHT = isMobile ? GAME_WIDTH - CHEESE_WIDTH - 105 : GAME_WIDTH - CHEESE_WIDTH + 142;
  const currentSpeed = BASE_SPEED + ((multiplier - 1) * 2);

  const checkStability = useCallback((stackPieces) => {
    if (stackPieces.length < 2) return { stable: true, direction: 0 };

    const baseCenter = stackPieces[0].position + CHEESE_WIDTH / 2;
    let totalMoment = 0;
    let totalWeight = 0;

    for (let i = 0; i < stackPieces.length; i++) {
      const piece = stackPieces[i];
      const pieceCenter = piece.position + CHEESE_WIDTH / 2;
      const offset = pieceCenter - baseCenter;

      if (Math.abs(offset) > CHEESE_WIDTH * 0.1) {
        const height = i + 1;
        totalWeight += height;
        totalMoment += offset * height;
      }
    }

    const centerOfMass = totalMoment / (totalWeight || 1);
    const maxOffset = CHEESE_WIDTH * 0.4;

    return {
      stable: Math.abs(centerOfMass) < maxOffset,
      direction: Math.sign(centerOfMass)
    };
  }, []);

  const startGame = () => {
    setStack([]);
    setScore(0);
    setMultiplier(1);
    setGameOver(false);
    setIsPlaying(true);
    setCheesePosition(150);
    setDirection(1);
    setMouseState('normal');
    setIsToppling(false);
  };

  const placeCheese = useCallback(() => {
    if (gameOver || !isPlaying || isToppling) return;

    const newCheese = {
      position: Math.round(cheesePosition),
      rotation: 0,
      id: Date.now()
    };

    if (stack.length === 0) {
      setMouseState('happy');
      setStack([newCheese]);
      setScore(prev => prev + multiplier);
      return;
    }

    const previousCheese = stack[stack.length - 1];
    const overlapStart = Math.max(newCheese.position, previousCheese.position);
    const overlapEnd = Math.min(
      newCheese.position + CHEESE_WIDTH,
      previousCheese.position + CHEESE_WIDTH
    );

    if (overlapEnd <= overlapStart) {
      setMouseState('sad');
      setGameOver(true);
      if (score > highScore) setHighScore(score);
      return;
    }

    const newStack = [...stack, newCheese];
    const stability = checkStability(newStack);

    if (!stability.stable) {
      setMouseState('sad');
      setTopplingDirection(stability.direction);
      setIsToppling(true);
      setStack(newStack);
      return;
    }

    setMouseState('happy');
    setStack(newStack);
    setScore(prev => prev + multiplier);

    if (newStack.length >= 15) {
      setTimeout(() => {
        setStack([]);
        setMultiplier(prev => prev + 1);
      }, 100);
    }
  }, [cheesePosition, gameOver, isPlaying, stack, score, highScore, multiplier, checkStability, isToppling]);

  const handleAction = useCallback(() => {
    if (!isPlaying || gameOver) {
      startGame();
    } else {
      placeCheese();
    }
  }, [isPlaying, gameOver, placeCheese]);

  useEffect(() => {
    if (!gameOver && isPlaying && !isToppling) {
      let animationId;
      let lastTime = performance.now();

      const animate = (currentTime) => {
        const deltaTime = (currentTime - lastTime) / 16;
        lastTime = currentTime;

        setCheesePosition(prev => {
          const newPos = prev + (direction * currentSpeed * deltaTime);

          if (newPos >= BOUNDARY_RIGHT) {
            setDirection(-1);
            return BOUNDARY_RIGHT;
          }
          if (newPos <= 0) {
            setDirection(1);
            return 0;
          }

          return newPos;
        });

        animationId = requestAnimationFrame(animate);
      };

      animationId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationId);
    }
  }, [gameOver, direction, isPlaying, isToppling, currentSpeed, BOUNDARY_RIGHT]);

  useEffect(() => {
    if (isToppling) {
      let frame = 0;
      const animateTopple = () => {
        setStack(prev => prev.map((cheese, index) => ({
          ...cheese,
          rotation: (cheese.rotation || 0) + (2 * topplingDirection * (index + 1)),
          position: cheese.position + (topplingDirection * 1)
        })));

        frame++;
        if (frame < 50) {
          requestAnimationFrame(animateTopple);
        } else {
          setGameOver(true);
          setMouseState('sad');
          if (score > highScore) setHighScore(score);
        }
      };
      requestAnimationFrame(animateTopple);
    }
  }, [isToppling, topplingDirection, score, highScore]);

  useEffect(() => {
    if (mouseState === 'happy') {
      const timer = setTimeout(() => setMouseState('normal'), 500);
      return () => clearTimeout(timer);
    }
  }, [mouseState]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        handleAction();
      }
    };

    const handleTouchOrClick = (e) => {
      if (e.type === 'touchstart') {
        e.preventDefault();
        if (!lastTapRef.current || Date.now() - lastTapRef.current > 200) {
          lastTapRef.current = Date.now();
          handleAction();
        }
      } else if (!isMobile) {
        handleAction();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchstart', handleTouchOrClick);
    window.addEventListener('click', handleTouchOrClick);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchstart', handleTouchOrClick);
      window.removeEventListener('click', handleTouchOrClick);
    };
  }, [handleAction, isMobile]);

  return (
    <div className="w-full max-w-xl mx-auto p-4 bg-green-50 rounded-lg select-none touch-none">
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-green-800 mb-4 text-center">Umm, cheesed to meet you?</h1>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-green-100 p-2 rounded">
            <p className="text-2xl text-green-800">Score: {score}</p>
          </div>
          <div className="bg-green-100 p-2 rounded">
            <p className="text-2xl text-green-800">Multiplier: {multiplier}x</p>
          </div>
          <div className="bg-green-100 p-2 rounded">
            <p className="text-2xl text-green-800">High Score: {highScore}</p>
          </div>
        </div>
      </div>
  
      <div className="relative h-96 bg-green-100 border-4 border-green-400 rounded-lg overflow-visible">
        <div className="absolute bottom-0 left-0 w-full h-full">
          {stack.map((cheese, index) => (
            <div
              key={cheese.id}
              className="absolute"
              style={{
                width: `${CHEESE_WIDTH}px`,
                height: '20px',
                left: `${cheese.position}px`,
                bottom: `${index * 22}px`,
                transform: `rotate(${cheese.rotation || 0}deg)`,
                transformOrigin: 'center bottom',
                transition: isToppling ? 'none' : 'transform 0.1s'
              }}
            >
              <CheeseSlice width={CHEESE_WIDTH} height={20} />
            </div>
          ))}
  
          {isPlaying && !gameOver && !isToppling && (
            <div
              className="absolute"
              style={{
                width: `${CHEESE_WIDTH}px`,
                height: '20px',
                left: `${cheesePosition}px`,
                bottom: `${stack.length * 22}px`
              }}
            >
              <CheeseSlice width={CHEESE_WIDTH} height={20} />
            </div>
          )}
        </div>
      </div>
  
      {/* Separate Pepe container based on device */}
      {isMobile ? (
        <div className="mt-4 flex justify-center">
          <div className="w-32 h-32">
            <img
              src={mouseState === 'normal' ? normalPepe :
                mouseState === 'happy' ? happyPepe :
                  sadPepe}
              alt={`Pepe Mouse ${mouseState}`}
              className={`w-full h-full object-contain transition-transform duration-200 
                ${mouseState === 'happy' ? 'transform -translate-y-2' : mouseState === 'sad' ? 'transform rotate-12' : ''}`}
            />
          </div>
        </div>
      ) : (
        <div className="absolute -bottom-32 -right-32 w-32 h-32">
          <img
            src={mouseState === 'normal' ? normalPepe :
              mouseState === 'happy' ? happyPepe :
                sadPepe}
            alt={`Pepe Mouse ${mouseState}`}
            className={`w-full h-full object-contain transition-transform duration-200 
              ${mouseState === 'happy' ? 'transform -translate-y-2' : mouseState === 'sad' ? 'transform rotate-12' : ''}`}
          />
        </div>
      )}
  
      <div className="text-center mt-4">
        {(gameOver || !isPlaying) ? (
          <button
            onClick={startGame}
            className="px-6 py-3 text-xl bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            {gameOver ? 'Play Again' : 'Start Game'}
          </button>
        ) : (
          <p className="text-xl text-gray-700">
            {isMobile ? "Tap to stack cheese!" : "Press SPACE to stack cheese!"}
          </p>
        )}
      </div>
    </div>
  );
};

export default CheeseGame;