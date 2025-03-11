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
  const [hasWon, setHasWon] = useState(false); // New win state.
  const [timeElapsed, setTimeElapsed] = useState(0); // Timer in seconds (fractional)
  const [score, setScore] = useState(0);             // Running total score.
  const [missCount, setMissCount] = useState(0);       // Count of misses for current word.
  const [submitting, setSubmitting] = useState(false);
  const [ipaActive, setIpaActive] = useState(false);
  // Add this state near the top with your other state variables.
const [usedWords, setUsedWords] = useState([]);


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
   * getDifficultyBackground - Returns a lighter background color based on difficulty.
   */
  const getDifficultyBackground = (level) => {
    switch (level) {
      case 1:
        return "#e0f7e0"; // Light green.
      case 2:
        return "#fff9e0"; // Pale yellow.
      case 3:
        return "#ffe0e0"; // Pale red.
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

  // Fetch words.json once on mount.
  useEffect(() => {
    fetch('/words.json')
      .then(response => response.json())
      .then(data => {
        setWords(data);
      });
  }, []);

  useEffect(() => {
    if (words.length > 0) {
      // Filter for words of the current difficulty that haven't been used yet.
      const available = words.filter(
        (word) => word.difficulty === difficulty && !usedWords.includes(word.word)
      );
      // If there are no available words, reset the usedWords list.
      if (available.length === 0) {
        setUsedWords([]);
        // Recalculate available words.
        available.push(...words.filter(word => word.difficulty === difficulty));
      }
      const randomIndex = Math.floor(Math.random() * available.length);
      const newWord = available[randomIndex];
      setCurrentWord(newWord);
      // Mark the word as used.
      setUsedWords((prev) => [...prev, newWord.word]);
      setLives(3);
      resetTimer();
      setMissCount(0);
    }
  }, [words, difficulty]);
  

  /**
   * Keydown listener for left Shift key.
   * When pressed, triggers the IPA button's click and simulates an active state.
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
      // Calculate scoring:
      // Base points: 10 for difficulty 1, 20 for 2, 30 for 3.
      let basePoints = difficulty === 1 ? 10 : difficulty === 2 ? 20 : 30;
      // Bonus of 5 if the user never played the sound (timer is 0).
      let bonus = (timeElapsed === 0 ? 5 : 0);
      // Penalty factor: 100% for 0 misses, 75% for 1 miss, 50% for 2+ misses.
      let penaltyFactor = missCount === 0 ? 1 : missCount === 1 ? 0.75 : 0.5;
      let pointsAwarded = Math.round((basePoints + bonus) * penaltyFactor);

      // Update score and provide feedback.
      setScore(prev => prev + pointsAwarded);
      setFeedback(`Correct! +${pointsAwarded} points`);
      setSubmitting(true);
      setMissCount(0);

      const newCount = correctCount + 1;
      // If 5 correct words in current difficulty...
      if (newCount >= 5) {
        if (difficulty < 3) {
          // Increase difficulty if not yet at difficulty 3.
          setTimeout(() => {
            setDifficulty(difficulty + 1);
            setCorrectCount(0);
            setLives(3);
            setFeedback("");
            setGuess("");
            resetTimer();
            setSubmitting(false);
          }, 1000);
        } else {
          // At difficulty 3, reaching 5 correct means the game is won.
          setTimeout(() => {
            setHasWon(true);
            setSubmitting(false);
          }, 1000);
        }
      } else {
        // Otherwise, simply move to the next word.
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
        }, 1000);
      }
    } else {
      // Incorrect guess: increment miss count and reduce lives.
      setMissCount(prev => prev + 1);
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
   * speakWord - Fetches and plays audio for the current word.
   * On play, resets/starts the timer and focuses the input.
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
    resetTimer();
    if (words.length > 0) {
      const filtered = words.filter(word => word.difficulty === 1);
      const randomIndex = Math.floor(Math.random() * filtered.length);
      setCurrentWord(filtered[randomIndex]);
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
            Earn points based on difficulty, with a bonus if you type correctly without hearing the word.
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
          <h1 className="title">Spelling Test</h1>
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
        {feedback && <p className="feedback">{feedback}</p>}
      </div>
      {/* Right Column: Score Display */}
      <div className="right-column">
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
