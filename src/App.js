import React, { useState, useEffect, useRef } from 'react';
import { FaHeart, FaRegHeart } from 'react-icons/fa';
import './App.css';

/**
 * ProgressIndicator renders a progress bar that fills as the user completes words.
 * With 5 words per round, each word represents 20% of the bar.
 */
function ProgressIndicator({ count, total = 5 }) {
  const progress = Math.min((count / total) * 100, 100);
  return (
    <div className="progress-bar-container">
      <div className="progress-bar" style={{ width: `${progress}%` }}></div>
    </div>
  );
}

/**
 * LivesIndicator renders three heart icons to represent remaining lives.
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

/**
 * App Component - Main component for the Spelling Test game.
 */
function App() {
  // Game state variables.
  const [hasStarted, setHasStarted] = useState(false); // Start screen state.
  const [words, setWords] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [guess, setGuess] = useState('');
  const [feedback, setFeedback] = useState('');
  const [difficulty, setDifficulty] = useState(1); // 1: Easy, 2: Medium, 3: Hard
  const [correctCount, setCorrectCount] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false); // Win state.
  const [timeElapsed, setTimeElapsed] = useState(0); // Timer in seconds (fractional)
  const [score, setScore] = useState(0);             // Running total score.
  const [missCount, setMissCount] = useState(0);       // Count of misses for current word.
  const [submitting, setSubmitting] = useState(false);
  const [ipaActive, setIpaActive] = useState(false);
  const [animateFeedback, setAnimateFeedback] = useState(false);

  // Ref for tracking words that have been used (to avoid repeats).
  const usedWordsRef = useRef([]);

  // Refs for timer, input, and IPA button.
  const timerIntervalRef = useRef(null);
  const startTimeRef = useRef(0);
  const inputRef = useRef(null);
  const ipaButtonRef = useRef(null);

  // Cloud Function URL for text-to-speech.
  const CLOUD_FUNCTION_URL = "https://us-central1-spelling-game-452422.cloudfunctions.net/synthesizeSpeech";

  /**
   * resetTimer - Clears and resets the timer.
   */
  const resetTimer = () => {
    setTimeElapsed(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  /**
   * getDifficultyBackground - Returns a very light color for the difficulty background.
   */
  const getDifficultyBackground = (level) => {
    switch (level) {
      case 1:
        return "#e6ffeb"; // Soft green.
      case 2:
        return "#fffde7"; // Soft yellow.
      case 3:
        return "#ffe6e6"; // Soft red.
      default:
        return "transparent";
    }
  };

  /**
   * getDifficultyLabel - Returns a text label for the current difficulty.
   */
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

  // Fetch words.json once when the component mounts.
  useEffect(() => {
    fetch('/words.json')
      .then(response => response.json())
      .then(data => setWords(data));
  }, []);

  /**
   * New Word Selection Effect:
   * Filters words by current difficulty and excludes words already used in this round.
   * If no available words remain, resets the usedWords list.
   */
  useEffect(() => {
    if (words.length > 0) {
      let available = words.filter(
        (word) => word.difficulty === difficulty && !usedWordsRef.current.includes(word.word)
      );
      if (available.length === 0) {
        usedWordsRef.current = [];
        available = words.filter(word => word.difficulty === difficulty);
      }
      const randomIndex = Math.floor(Math.random() * available.length);
      const newWord = available[randomIndex];
      setCurrentWord(newWord);
      usedWordsRef.current.push(newWord.word);
      setLives(3);
      resetTimer();
      setMissCount(0);
    }
  }, [words, difficulty]);

  /**
   * Keydown Listener for Left Shift:
   * When pressed, triggers the IPA button's click and sets an active state.
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Shift" && event.location === 1) {
        setIpaActive(true);
        if (ipaButtonRef.current) {
          ipaButtonRef.current.click();
        }
        setTimeout(() => {
          setIpaActive(false);
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /**
   * handleSubmit - Called when the user submits their guess.
   * Updates score based on correct answer, difficulty, bonus, and penalty,
   * and triggers win state when the user completes 5 correct words at difficulty 3.
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentWord || submitting) return;

    if (guess.trim().toLowerCase() === currentWord.word.toLowerCase()) {
      let basePoints = difficulty === 1 ? 10 : difficulty === 2 ? 20 : 30;
      let bonus = (timeElapsed === 0 ? 5 : 0);
      let penaltyFactor = missCount === 0 ? 1 : missCount === 1 ? 0.75 : 0.5;
      let pointsAwarded = Math.round((basePoints + bonus) * penaltyFactor);

      setScore(prev => prev + pointsAwarded);
      setFeedback(`Correct! +${pointsAwarded} points`);
      setAnimateFeedback(true); // Trigger animation
      setSubmitting(true);
      setMissCount(0);

      const newCount = correctCount + 1;
      if (newCount >= 5) {
        if (difficulty < 3) {
          setTimeout(() => {
            setDifficulty(difficulty + 1);
            setCorrectCount(0);
            setLives(3);
            setFeedback("");
            setGuess("");
            resetTimer();
            setSubmitting(false);
            setAnimateFeedback(false);
          }, 1000);
        } else {
          setTimeout(() => {
            setHasWon(true);
            setSubmitting(false);
            setAnimateFeedback(false);
          }, 1000);
        }
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
          setSubmitting(false);
          setAnimateFeedback(false);
        }, 1000);
      }
    } else {
      setMissCount(prev => prev + 1);
      if (lives > 1) {
        setFeedback("Try again!");
        setAnimateFeedback(true);
        setLives(lives - 1);
        setGuess("");
        speakWord();
      } else {
        setGameOver(true);
      }
    }
  };

  /**
   * speakWord - Fetches and plays audio for the current word.
   * On play, resets/starts the timer and focuses the input field.
   */
  const speakWord = async () => {
    if (!currentWord) return;
    try {
      const response = await fetch(`${CLOUD_FUNCTION_URL}?text=${encodeURIComponent(currentWord.word)}`);
      if (!response.ok) throw new Error('Network response was not ok');
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
        if (inputRef.current) inputRef.current.focus();
      };

      audio.play();
    } catch (error) {
      console.error('Error fetching audio from Cloud Function:', error);
    }
  };

  /**
   * resetGame - Resets the game to its initial state.
   */
  const resetGame = () => {
    setGameOver(false);
    setHasWon(false);
    setDifficulty(1);
    setCorrectCount(0);
    setLives(3);
    setFeedback("");
    setGuess("");
    setScore(0);
    setMissCount(0);
    usedWordsRef.current = [];
    resetTimer();
    if (words.length > 0) {
      const filtered = words.filter(word => word.difficulty === 1);
      const randomIndex = Math.floor(Math.random() * filtered.length);
      setCurrentWord(filtered[randomIndex]);
      usedWordsRef.current.push(filtered[randomIndex].word);
    }
  };

  // Render the Start Screen if the game has not yet started.
  if (!hasStarted) {
    return (
      <div className="start-screen">
        <div className="start-panel">
          <h1>Welcome to Spelling Test!</h1>
          <p>
            Listen to the word by clicking the IPA button or pressing the left Shift key.
            Type your guess in the box below and hit Enter or click Submit.
          </p>
          <p>
            Earn points based on difficulty—with a bonus if you type correctly without hearing the word.
            Incorrect attempts reduce your potential points.
          </p>
          <button className="button" onClick={() => setHasStarted(true)}>
            Start
          </button>
        </div>
      </div>
    );
  }

  // Render Game Over screen if the user loses.
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

  // Render Win screen if the user wins.
  if (hasWon) {
    return (
      <div className="game-container">
        <div className="game-box">
          <h2 className="heading">YOU WIN!</h2>
          <p>Your final score is {score} points.</p>
          <button onClick={resetGame} className="button">Play Again</button>
        </div>
      </div>
    );
  }

  // Main render: Game layout.
  return currentWord ? (
    <div className="two-column-container">
      {/* Left Column: Game Layout */}
      <div className="left-column">
        {/* Container 1: Title */}
        <div className="game-box title-box">
          <h1 className="title kanit-bold">Spell Type</h1>
        </div>
        {/* Container 2: Definition, IPA Button & TTS */}
        <div className="game-box definition-box">
          <button
            ref={ipaButtonRef}
            className={`ipa ${ipaActive ? 'active' : ''}`}
            onClick={speakWord}
          >
            {currentWord.ipa}
          </button>
          <p className="definition-line">{currentWord.definition}</p>
        </div>
        {/* Container 3: Info Row (Progress Indicator & Lives) */}
        <div className="game-box info-box" style={{ backgroundColor: getDifficultyBackground(difficulty) }}>
          <div className="info-row">
            <span className="difficulty-label">{getDifficultyLabel(difficulty)}</span>
            <ProgressIndicator count={correctCount} />
            <LivesIndicator lives={lives} />
          </div>
        </div>
        {/* Container 4: Input & Timer */}
        <div className="game-box input-box">
          <form onSubmit={handleSubmit} className="form">
            <input
              ref={inputRef}
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Spell the word! Click the word or press Shift..."
              className="input"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <button type="submit" className="button submit-button" disabled={submitting}>
              Submit
            </button>
          </form>
          {/* Timer remains in code but is hidden */}
          <div className="timer">{timeElapsed.toFixed(2)} sec</div>
        </div>
        {feedback && (
          <p className={`feedback ${animateFeedback ? 'feedback-flash' : ''}`} key={feedback}>
            {feedback}
          </p>
        )}
      </div>
      {/* Right Column: Placeholder and Score Display */}
      <div className="right-column">
        <div className="game-box placeholder-box">
          <h2 className="placeholder-title">ACCOUNT STUFF</h2>
        </div>
        <div className="game-box score-box">
          <h2 className="score-title">Score</h2>
          <p className="score-display">{score} points</p>
        </div>
      </div>
    </div>
  ) : (
    <div>Loading...</div>
  );
}

export default App;
