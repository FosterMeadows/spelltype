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

function App() {
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [difficulty, setDifficulty] = useState(1); // 1: Easy, 2: Medium, 3: Hard
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0); // Timer (in seconds, fractional)
  const [scoreList, setScoreList] = useState([]);
  const [submitting, setSubmitting] = useState(false); // New flag to prevent rapid submissions

  // Refs for timer interval and start time.
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(0);
  const inputRef = useRef(null);

  // Cloud Function URL.
  const CLOUD_FUNCTION_URL = "https://us-central1-spelling-game-452422.cloudfunctions.net/synthesizeSpeech";

  // Helper: Resets the timer.
  const resetTimer = () => {
    setTimeElapsed(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Helper: Returns background color based on difficulty.
  const getDifficultyBackground = (level) => {
    switch (level) {
      case 1: return "#a4d4a4"; // Greenish for Easy.
      case 2: return "#ffeb3b"; // Yellow for Medium.
      case 3: return "#ff9a9a"; // Red for Hard.
      default: return "transparent";
    }
  };

  // Helper: Returns the text label for difficulty.
  const getDifficultyLabel = (level) => {
    switch (level) {
      case 1: return "Easy";
      case 2: return "Medium";
      case 3: return "Hard";
      default: return "";
    }
  };

  // Fetch words only once.
  useEffect(() => {
    fetch('/words.json')
      .then(response => response.json())
      .then(data => {
        setWords(data);
      });
  }, []);

  // Whenever words or difficulty change, select a new word.
  useEffect(() => {
    if (words.length > 0) {
      const filtered = words.filter(word => word.difficulty === difficulty);
      const randomIndex = Math.floor(Math.random() * filtered.length);
      setCurrentWord(filtered[randomIndex]);
      setLives(3);
      resetTimer();
    }
  }, [words, difficulty]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentWord || submitting) return; // Prevent multiple submissions

    if (guess.trim().toLowerCase() === currentWord.word.toLowerCase()) {
      setFeedback("Correct!");
      setSubmitting(true); // Lock further submissions
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
          setSubmitting(false); // Unlock submission
        }, 1000);
      } else {
        setCorrectCount(newCount);
        setTimeout(() => {
          setLives(3);
          const filtered = words.filter(word => word.difficulty === difficulty);
          const randomIndex = Math.floor(Math.random() * filtered.length);
          setCurrentWord(filtered[randomIndex]);
          setFeedback("");
          setGuess("");
          resetTimer();
          setSubmitting(false); // Unlock submission
        }, 1000);
      }
    } else {
      // Wrong answer: reduce lives and auto replay audio.
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
   * Fetches audio from the Cloud Function and plays it.
   * On audio play, resets and starts the timer, and focuses the input.
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
    setScoreList([]);
    resetTimer();
    if (words.length > 0) {
      const filtered = words.filter(word => word.difficulty === 1);
      const randomIndex = Math.floor(Math.random() * filtered.length);
      setCurrentWord(filtered[randomIndex]);
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
        {/* Container 2: Info row */}
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
            <button type="submit" className="button" disabled={submitting}>Submit</button>
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
