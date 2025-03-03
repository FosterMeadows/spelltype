import React, { useState, useEffect, useRef } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import './App.css';

/**
 * ProgressIndicator renders five boxes to represent correct answers.
 */
function ProgressIndicator({ count, total = 5 }) {
  const boxes = [];
  for (let i = 0; i < total; i++) {
    boxes.push(
      <div key={i} className={`progress-box ${i < count ? 'filled' : ''}`}></div>
    );
  }
  return <div className="progress-indicator">{boxes}</div>;
}

/**
 * LivesIndicator renders three hearts using react-icons.
 */
function LivesIndicator({ lives, total = 3 }) {
  return (
    <div className="lives-indicator">
      {[...Array(total)].map((_, i) =>
        i < lives ? (
          <FaHeart key={i} color="red" size={24} />
        ) : (
          <FaRegHeart key={i} color="red" size={24} />
        )
      )}
    </div>
  );
}

// Helper function to shuffle an array (Fisher–Yates algorithm)
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function App() {
  const [words, setWords] = useState([]);
  const [availableWords, setAvailableWords] = useState([]); // Pool for current difficulty
  const [currentWord, setCurrentWord] = useState(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [difficulty, setDifficulty] = useState(1); // 1: Easy, 2: Medium, 3: Hard
  const [correctCount, setCorrectCount] = useState(0); // Correct answers in current level
  const [lives, setLives] = useState(3); // Lives for the current word
  const [gameOver, setGameOver] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // Timer in seconds (fractional)
  const [scoreList, setScoreList] = useState([]); // List of { word, time } objects

  // Refs for timer interval and start time.
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(0);
  // Ref for the input field.
  const inputRef = useRef(null);

  // Replace with your actual Cloud Function URL.
  const CLOUD_FUNCTION_URL = "https://us-central1-spelling-game-452422.cloudfunctions.net/synthesizeSpeech";

  // Helper: Resets the timer state and clears any active interval.
  const resetTimer = () => {
    setTimeElapsed(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Helper: Returns a background color based on difficulty.
  const getDifficultyBackground = (level) => {
    switch (level) {
      case 1:
        return "#a4d4a4"; // Greenish for Easy.
      case 2:
        return "#ffeb3b"; // Yellow for Medium.
      case 3:
        return "#ff9a9a"; // Red for Hard.
      default:
        return "transparent";
    }
  };

  // Helper: Returns the text label for difficulty.
  const getDifficultyLabel = (level) => {
    switch (level) {
      case 1:
        return "Easy";
      case 2:
        return "Medium";
      case 3:
        return "Hard";
      default:
        return "";
    }
  };

  // Helper: Chooses a random word from availableWords.
  // If the pool is empty, reset it by filtering words by difficulty and shuffling.
  const chooseRandomWord = () => {
    let pool = availableWords;
    if (!pool || pool.length === 0) {
      pool = shuffleArray(words.filter((word) => word.difficulty === difficulty));
    }
    const nextWord = pool[0];
    setAvailableWords(pool.slice(1));
    return nextWord;
  };

  // Load words from the local JSON file.
  useEffect(() => {
    fetch('/words.json')
      .then(response => response.json())
      .then(data => {
        setWords(data);
        // Initialize available words for the current difficulty.
        const filtered = shuffleArray(data.filter(word => word.difficulty === difficulty));
        setAvailableWords(filtered.slice(1));
        setCurrentWord(filtered[0]);
        setLives(3);
        resetTimer();
      });
  }, []);

  // When difficulty changes, reinitialize the pool for that difficulty.
  useEffect(() => {
    if (words.length > 0) {
      const filtered = shuffleArray(words.filter(word => word.difficulty === difficulty));
      setAvailableWords(filtered.slice(1));
      setCurrentWord(filtered[0]);
      setLives(3);
      resetTimer();
    }
  }, [difficulty, words]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentWord) return;

    if (guess.trim().toLowerCase() === currentWord.word.toLowerCase()) {
      setFeedback("Correct!");
      // Save the correct word and its time.
      setScoreList(prev => [...prev, { word: currentWord.word, time: timeElapsed }]);
      
      const newCount = correctCount + 1;
      if (newCount >= 5 && difficulty < 3) {
        setTimeout(() => {
          setDifficulty(difficulty + 1);
          setCorrectCount(0);
          setLives(3);
          setFeedback("");
          setGuess("");
          resetTimer();
        }, 1000);
      } else {
        setCorrectCount(newCount);
        setTimeout(() => {
          setLives(3); // Reset lives for the next word.
          const nextWord = chooseRandomWord();
          setCurrentWord(nextWord);
          setFeedback("");
          setGuess("");
          resetTimer();
        }, 1000);
      }
    } else {
      // Wrong answer: reduce lives and automatically replay audio to restart timer.
      if (lives > 1) {
        setFeedback("Try again!");
        setLives(lives - 1);
        setGuess("");
        speakWord();
      } else {
        setGameOver(true);
      }
    }
  };

  /**
   * Calls the Cloud Function to fetch synthesized speech and plays the audio.
   * When the audio's onplay event fires, the timer resets and starts counting up,
   * and the input field is focused.
   */
  const speakWord = async () => {
    if (!currentWord) return;
    try {
      const response = await fetch(`${CLOUD_FUNCTION_URL}?text=${encodeURIComponent(currentWord.word)}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onplay = () => {
        resetTimer();
        startTimeRef.current = performance.now();
        timerIntervalRef.current = setInterval(() => {
          const now = performance.now();
          setTimeElapsed((now - startTimeRef.current) / 1000);
        }, 100);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      };
      
      audio.play();
    } catch (error) {
      console.error('Error fetching audio from Cloud Function:', error);
    }
  };

  const resetGame = () => {
    setGameOver(false);
    setDifficulty(1);
    setCorrectCount(0);
    setLives(3);
    setFeedback("");
    setGuess("");
    setScoreList([]); // Clear the score list.
    resetTimer();
    if (words.length > 0) {
      const filtered = shuffleArray(words.filter(word => word.difficulty === 1));
      setAvailableWords(filtered.slice(1));
      setCurrentWord(filtered[0]);
    }
  };

  if (gameOver) {
    return (
      <div className="game-container">
        <div className="game-box">
          <h2 className="heading">Game Over!</h2>
          <p>You have used all your lives for the word "{currentWord && currentWord.word}".</p>
          <button onClick={resetGame} className="button">Play Again</button>
        </div>
      </div>
    );
  }

  return currentWord ? (
    <div className="two-column-container">
      {/* Left Column: Game Layout */}
      <div className="left-column">
        {/* Container 1: Title */}
        <div className="game-box title-box">
          <h1 className="title">Spelling Test</h1>
        </div>
        {/* Container 2: Info row with difficulty, progress, and hearts */}
        <div
          className="game-box info-box"
          style={{ backgroundColor: getDifficultyBackground(difficulty) }}
        >
          <div className="info-row">
            <span className="difficulty-label">{getDifficultyLabel(difficulty)}</span>
            <ProgressIndicator count={correctCount} />
            <LivesIndicator lives={lives} />
          </div>
        </div>
        {/* Container 3: Definition & TTS */}
        <div className="game-box definition-box">
          <p className="definition">Definition: {currentWord.definition}</p>
          <button onClick={speakWord} className="button">Hear the Word</button>
        </div>
        {/* Container 4: Input & Timer */}
        <div className="game-box input-box">
          <form onSubmit={handleSubmit} className="form">
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Type your guess..."
              className="input"
              autoFocus
            />
            <button type="submit" className="button">Submit</button>
          </form>
          <div className="timer">Time: {timeElapsed.toFixed(2)} sec</div>
        </div>
        {feedback && <p className="feedback">{feedback}</p>}
      </div>
      {/* Right Column: Score List */}
      <div className="right-column">
        <div className="game-box score-box">
          <h2 className="score-title">Score</h2>
          <ul className="score-list">
            {scoreList.map((entry, index) => (
              <li key={index}>
                {entry.word} - {entry.time.toFixed(2)} sec
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  ) : (
    <div>Loading...</div>
  );
}

export default App;
