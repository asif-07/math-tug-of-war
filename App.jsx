import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// AUDIO ENGINE - Web Audio API synthesized sounds & music
// ═══════════════════════════════════════════════════════
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicPlaying = false;
    this.musicNodes = [];
    this.musicInterval = null;
  }

  init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.12;
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.3;
    this.sfxGain.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  playNote(freq, duration, type = "square", gain = 0.3, dest = null) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playCorrect() {
    this.playNote(523, 0.1, "square", 0.25);
    setTimeout(() => this.playNote(659, 0.1, "square", 0.25), 80);
    setTimeout(() => this.playNote(784, 0.15, "square", 0.3), 160);
  }

  playWrong() {
    this.playNote(200, 0.15, "sawtooth", 0.2);
    setTimeout(() => this.playNote(160, 0.2, "sawtooth", 0.2), 120);
  }

  playPull() {
    this.playNote(130, 0.08, "triangle", 0.15);
    setTimeout(() => this.playNote(165, 0.08, "triangle", 0.15), 40);
    setTimeout(() => this.playNote(196, 0.12, "triangle", 0.2), 80);
  }

  playButtonPress() {
    this.playNote(880, 0.04, "sine", 0.1);
  }

  playCountdown(n) {
    this.playNote(n === 0 ? 880 : 440, n === 0 ? 0.4 : 0.15, "square", 0.2);
  }

  playWin() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    notes.forEach((n, i) => {
      setTimeout(() => this.playNote(n, 0.2, "square", 0.25), i * 120);
    });
  }

  startMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;

    const bassLine = [131, 165, 175, 147, 131, 165, 196, 175];
    const melodyLine = [262, 330, 392, 349, 330, 294, 262, 330];
    let step = 0;
    const bpm = 140;
    const interval = (60 / bpm) * 1000;

    this.musicInterval = setInterval(() => {
      if (!this.musicPlaying) return;
      const idx = step % bassLine.length;
      this.playNote(bassLine[idx], 0.2, "triangle", 0.15, this.musicGain);
      if (step % 2 === 0) {
        this.playNote(melodyLine[idx], 0.12, "square", 0.06, this.musicGain);
      }
      // Percussive hit on every beat
      if (this.ctx) {
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(step % 4 === 0 ? 0.08 : 0.03, this.ctx.currentTime);
        ng.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        noise.connect(ng);
        ng.connect(this.musicGain);
        noise.start();
      }
      step++;
    }, interval);
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

const audio = new AudioEngine();

// ═══════════════════════════════════════════════════════
// QUESTION GENERATOR
// ═══════════════════════════════════════════════════════
function generateQuestion(difficulty) {
  const ops =
    difficulty === "easy" ? ["+"] : difficulty === "medium" ? ["+", "-"] : ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer, display;

  if (op === "+") {
    const max = difficulty === "easy" ? 10 : difficulty === "medium" ? 25 : 50;
    a = Math.floor(Math.random() * max) + 1;
    b = Math.floor(Math.random() * max) + 1;
    answer = a + b;
    display = `${a} + ${b}`;
  } else if (op === "-") {
    const max = difficulty === "medium" ? 25 : 50;
    a = Math.floor(Math.random() * max) + 3;
    b = Math.floor(Math.random() * (a - 1)) + 1;
    answer = a - b;
    display = `${a} − ${b}`;
  } else {
    const max = 12;
    a = Math.floor(Math.random() * max) + 2;
    b = Math.floor(Math.random() * max) + 2;
    answer = a * b;
    display = `${a} × ${b}`;
  }
  return { display, answer };
}

// ═══════════════════════════════════════════════════════
// PARTICLE SYSTEM COMPONENT
// ═══════════════════════════════════════════════════════
function Particles({ particles }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50 }}>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: p.shape === "circle" ? "50%" : "2px",
            background: p.color,
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            transition: "none",
            animation: `particleFly ${p.duration}s ${p.easing} forwards`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ANIMATED CHARACTERS (SVG-based tug of war figures)
// ═══════════════════════════════════════════════════════
function TugCharacter({ team, pulling, index }) {
  const isBlue = team === "blue";
  const bodyColor = isBlue ? "#2563eb" : "#dc2626";
  const skinColor = "#fbbf24";
  const delay = index * 0.08;

  return (
    <svg
      width="44"
      height="56"
      viewBox="0 0 44 56"
      style={{
        animation: pulling
          ? `${isBlue ? "pullLeft" : "pullRight"} 0.4s ease-in-out infinite alternate`
          : "idle 1.5s ease-in-out infinite alternate",
        animationDelay: `${delay}s`,
        filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.25))",
        transform: isBlue ? "scaleX(1)" : "scaleX(-1)",
      }}
    >
      {/* Head */}
      <circle cx="22" cy="10" r="8" fill={skinColor} />
      {/* Eyes */}
      <circle cx="19" cy="9" r="1.5" fill="#1e293b" />
      <circle cx="25" cy="9" r="1.5" fill="#1e293b" />
      {/* Mouth - determined expression */}
      <path d="M18 14 Q22 12 26 14" stroke="#92400e" strokeWidth="1.5" fill="none" />
      {/* Body */}
      <rect x="14" y="18" width="16" height="18" rx="4" fill={bodyColor} />
      {/* Arms reaching for rope */}
      <line x1="14" y1="24" x2="2" y2="28" stroke={skinColor} strokeWidth="4" strokeLinecap="round" />
      <line x1="30" y1="24" x2="42" y2="20" stroke={skinColor} strokeWidth="4" strokeLinecap="round" />
      {/* Legs */}
      <line x1="18" y1="36" x2="12" y2="52" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" />
      <line x1="26" y1="36" x2="32" y2="52" stroke={bodyColor} strokeWidth="5" strokeLinecap="round" />
      {/* Shoes */}
      <ellipse cx="10" cy="53" rx="5" ry="3" fill="#1e293b" />
      <ellipse cx="34" cy="53" rx="5" ry="3" fill="#1e293b" />
      {/* Headband */}
      <rect x="14" y="4" width="16" height="4" rx="2" fill={isBlue ? "#93c5fd" : "#fca5a5"} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════
// ROPE COMPONENT
// ═══════════════════════════════════════════════════════
function Rope({ position, maxPos }) {
  const pct = (position / maxPos) * 35;
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: `translate(calc(-50% + ${pct}%), -50%)`,
        width: "88%",
        height: "10px",
        transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: 5,
      }}
    >
      {/* Rope texture */}
      <div
        style={{
          width: "100%",
          height: "10px",
          background: `repeating-linear-gradient(90deg, #92400e 0px, #b45309 5px, #78350f 10px)`,
          borderRadius: 5,
          boxShadow: "0 3px 8px rgba(0,0,0,0.3), inset 0 -2px 3px rgba(0,0,0,0.2)",
        }}
      />
      {/* Center marker / flag */}
      <div
        style={{
          position: "absolute",
          top: -28,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "1.6rem",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
        }}
      >
        🚩
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NUMPAD COMPONENT
// ═══════════════════════════════════════════════════════
function Numpad({ team, onInput, onClear, onSubmit, disabled }) {
  const isBlue = team === "blue";
  const accentBg = isBlue ? "#dbeafe" : "#fee2e2";
  const accentColor = isBlue ? "#1d4ed8" : "#b91c1c";

  const handleBtn = (val) => {
    if (disabled) return;
    audio.resume();
    audio.playButtonPress();
    onInput(val);
  };

  const btnStyle = (special) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Fredoka', sans-serif",
    fontWeight: 700,
    fontSize: "clamp(1.1rem, 4vw, 1.5rem)",
    border: "none",
    borderRadius: 14,
    cursor: disabled ? "default" : "pointer",
    color: special === "clear" ? "#dc2626" : special === "go" ? "#fff" : "#1e293b",
    background:
      special === "clear"
        ? "#fee2e2"
        : special === "go"
        ? `linear-gradient(135deg, ${isBlue ? "#2563eb" : "#dc2626"}, ${isBlue ? "#3b82f6" : "#ef4444"})`
        : "rgba(255,255,255,0.92)",
    boxShadow:
      special === "go"
        ? `0 4px 0 ${isBlue ? "#1e40af" : "#991b1b"}, 0 6px 20px ${isBlue ? "rgba(37,99,235,0.3)" : "rgba(220,38,38,0.3)"}`
        : "0 3px 0 #d1d5db, 0 4px 12px rgba(0,0,0,0.06)",
    transition: "transform 0.08s, box-shadow 0.08s",
    WebkitTapHighlightColor: "transparent",
    opacity: disabled ? 0.5 : 1,
    minHeight: 0,
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 7,
        width: "100%",
        maxWidth: 280,
        flex: 1,
        minHeight: 0,
        padding: "0 4px",
      }}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <button
          key={n}
          style={btnStyle()}
          onPointerDown={(e) => {
            e.preventDefault();
            handleBtn(String(n));
          }}
        >
          {n}
        </button>
      ))}
      <button
        style={btnStyle("clear")}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!disabled) {
            audio.resume();
            onClear();
          }
        }}
      >
        ✕
      </button>
      <button
        style={btnStyle()}
        onPointerDown={(e) => {
          e.preventDefault();
          handleBtn("0");
        }}
      >
        0
      </button>
      <button
        style={btnStyle("go")}
        onPointerDown={(e) => {
          e.preventDefault();
          if (!disabled) {
            audio.resume();
            onSubmit();
          }
        }}
      >
        GO
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLAYER PANEL
// ═══════════════════════════════════════════════════════
function PlayerPanel({ team, question, input, streak, onInput, onClear, onSubmit, feedback, disabled }) {
  const isBlue = team === "blue";
  const bgGrad = isBlue
    ? "linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)"
    : "linear-gradient(180deg, #fef2f2 0%, #fee2e2 100%)";
  const labelColor = isBlue ? "#1d4ed8" : "#b91c1c";
  const qBg = isBlue
    ? "linear-gradient(135deg, #1e40af, #2563eb)"
    : "linear-gradient(135deg, #991b1b, #dc2626)";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "8px 6px 10px",
        background: bgGrad,
        position: "relative",
        overflow: "hidden",
        gap: 4,
      }}
    >
      {/* Team label */}
      <div
        style={{
          fontFamily: "'Lilita One', cursive",
          fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)",
          color: labelColor,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {isBlue ? "⚡ Team 1" : "Team 2 🔥"}
      </div>

      {/* Streak indicator */}
      {streak > 1 && (
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 800,
            color: "#f59e0b",
            background: "rgba(245,158,11,0.15)",
            padding: "1px 10px",
            borderRadius: 20,
            animation: "pulse 0.6s ease-in-out infinite alternate",
          }}
        >
          🔥 {streak}x Streak!
        </div>
      )}

      {/* Question box */}
      <div
        style={{
          fontFamily: "'Lilita One', cursive",
          fontSize: "clamp(1.6rem, 5.5vw, 2.6rem)",
          color: "white",
          background: qBg,
          padding: "6px 18px",
          borderRadius: 16,
          width: "92%",
          textAlign: "center",
          boxShadow: `0 4px 20px ${isBlue ? "rgba(37,99,235,0.3)" : "rgba(220,38,38,0.3)"}`,
          position: "relative",
          lineHeight: 1.3,
        }}
      >
        {question}
        <span style={{ opacity: 0.7, fontSize: "0.7em" }}> = ?</span>
      </div>

      {/* Answer display */}
      <div
        style={{
          fontFamily: "'Lilita One', cursive",
          fontSize: "clamp(1.3rem, 4.5vw, 1.8rem)",
          minHeight: 34,
          color: input ? "#1e293b" : "#94a3b8",
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(8px)",
          padding: "2px 20px",
          borderRadius: 12,
          border: `2px dashed ${input ? labelColor : "#cbd5e1"}`,
          minWidth: 80,
          textAlign: "center",
          transition: "border-color 0.2s",
        }}
      >
        {input || "—"}
      </div>

      {/* Numpad */}
      <Numpad team={team} onInput={onInput} onClear={onClear} onSubmit={onSubmit} disabled={disabled} />

      {/* Feedback overlay */}
      {feedback && (
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "clamp(3rem, 10vw, 5rem)",
            zIndex: 20,
            animation: "popBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            pointerEvents: "none",
            filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
          }}
        >
          {feedback === "correct" ? "✅" : "❌"}
        </div>
      )}

      {/* Flash overlay */}
      {feedback && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: feedback === "correct" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
            animation: "flashFade 0.4s ease forwards",
            pointerEvents: "none",
            zIndex: 15,
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN GAME COMPONENT
// ═══════════════════════════════════════════════════════
// Global styles injected once
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lilita+One&family=Fredoka:wght@400;500;600;700&display=swap');

    @keyframes pullLeft {
      from { transform: translateX(0) rotate(0deg); }
      to { transform: translateX(-4px) rotate(-3deg); }
    }
    @keyframes pullRight {
      from { transform: translateX(0) rotate(0deg); }
      to { transform: translateX(4px) rotate(3deg); }
    }
    @keyframes idle {
      from { transform: translateY(0); }
      to { transform: translateY(-2px); }
    }
    @keyframes popBounce {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
      50% { transform: translate(-50%, -50%) scale(1.4); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    }
    @keyframes flashFade {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }
    @keyframes pulse {
      from { transform: scale(1); opacity: 0.8; }
      to { transform: scale(1.05); opacity: 1; }
    }
    @keyframes bounceIn {
      0% { transform: scale(0) rotate(-5deg); opacity: 0; }
      60% { transform: scale(1.1) rotate(2deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes countPop {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.2); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes float {
      from { transform: translateY(0) rotate(0deg); }
      to { transform: translateY(-20px) rotate(5deg); }
    }
    @keyframes cloudDrift {
      from { transform: translateX(-100px); }
      to { transform: translateX(calc(100vw + 100px)); }
    }
    @keyframes particleFly {
      0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
      100% { transform: translate(60px, 150px) rotate(500deg) scale(0); opacity: 0; }
    }
    @keyframes shakeX {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { overflow: hidden; touch-action: manipulation; }
    button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
  `}</style>
);

export default function MathTugOfWar() {
  const [screen, setScreen] = useState("start"); // start | countdown | game | win
  const [difficulty, setDifficulty] = useState("medium");
  const [winScore, setWinScore] = useState(5);
  const [blueScore, setBlueScore] = useState(0);
  const [redScore, setRedScore] = useState(0);
  const [ropePos, setRopePos] = useState(0);
  const [blueQ, setBlueQ] = useState(null);
  const [redQ, setRedQ] = useState(null);
  const [blueInput, setBlueInput] = useState("");
  const [redInput, setRedInput] = useState("");
  const [blueFeedback, setBlueFeedback] = useState(null);
  const [redFeedback, setRedFeedback] = useState(null);
  const [blueStreak, setBlueStreak] = useState(0);
  const [redStreak, setRedStreak] = useState(0);
  const [timer, setTimer] = useState(0);
  const [countdownNum, setCountdownNum] = useState(3);
  const [winner, setWinner] = useState(null);
  const [particles, setParticles] = useState([]);
  const [musicOn, setMusicOn] = useState(true);
  const timerRef = useRef(null);
  const particleId = useRef(0);

  // ── COUNTDOWN ──
  const startCountdown = useCallback(() => {
    audio.init();
    audio.resume();
    setScreen("countdown");
    setCountdownNum(3);
    setBlueScore(0);
    setRedScore(0);
    setRopePos(0);
    setBlueInput("");
    setRedInput("");
    setBlueStreak(0);
    setRedStreak(0);
    setTimer(0);
    setWinner(null);
    setParticles([]);

    let n = 3;
    audio.playCountdown(n);
    const cdInterval = setInterval(() => {
      n--;
      if (n > 0) {
        setCountdownNum(n);
        audio.playCountdown(n);
      } else if (n === 0) {
        setCountdownNum(0);
        audio.playCountdown(0);
      } else {
        clearInterval(cdInterval);
        setScreen("game");
        setBlueQ(generateQuestion(difficulty));
        setRedQ(generateQuestion(difficulty));
        if (musicOn) audio.startMusic();
        timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
      }
    }, 800);
  }, [difficulty, musicOn]);

  // ── SUBMIT HANDLERS ──
  const submitBlue = useCallback(() => {
    if (!blueQ || !blueInput) return;
    const val = parseInt(blueInput);
    if (isNaN(val)) return;

    if (val === blueQ.answer) {
      audio.playCorrect();
      audio.playPull();
      setBlueScore((s) => s + 1);
      setBlueStreak((s) => s + 1);
      setRopePos((p) => p - 1);
      setBlueFeedback("correct");
      setBlueQ(generateQuestion(difficulty));
      spawnBurstParticles("blue");
    } else {
      audio.playWrong();
      setBlueStreak(0);
      setBlueFeedback("wrong");
    }
    setBlueInput("");
    setTimeout(() => setBlueFeedback(null), 500);
  }, [blueQ, blueInput, difficulty]);

  const submitRed = useCallback(() => {
    if (!redQ || !redInput) return;
    const val = parseInt(redInput);
    if (isNaN(val)) return;

    if (val === redQ.answer) {
      audio.playCorrect();
      audio.playPull();
      setRedScore((s) => s + 1);
      setRedStreak((s) => s + 1);
      setRopePos((p) => p + 1);
      setRedFeedback("correct");
      setRedQ(generateQuestion(difficulty));
      spawnBurstParticles("red");
    } else {
      audio.playWrong();
      setRedStreak(0);
      setRedFeedback("wrong");
    }
    setRedInput("");
    setTimeout(() => setRedFeedback(null), 500);
  }, [redQ, redInput, difficulty]);

  // ── WIN CHECK ──
  useEffect(() => {
    if (screen !== "game") return;
    if (blueScore >= winScore) {
      audio.stopMusic();
      audio.playWin();
      clearInterval(timerRef.current);
      setWinner("blue");
      setScreen("win");
      spawnConfetti();
    } else if (redScore >= winScore) {
      audio.stopMusic();
      audio.playWin();
      clearInterval(timerRef.current);
      setWinner("red");
      setScreen("win");
      spawnConfetti();
    }
  }, [blueScore, redScore, winScore, screen]);

  // ── CLEANUP ──
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      audio.stopMusic();
    };
  }, []);

  // ── PARTICLES ──
  const spawnBurstParticles = (team) => {
    const colors =
      team === "blue"
        ? ["#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe", "#fbbf24"]
        : ["#ef4444", "#f87171", "#fca5a5", "#fee2e2", "#fbbf24"];
    const x = team === "blue" ? "25%" : "75%";
    const newP = [];
    for (let i = 0; i < 12; i++) {
      newP.push({
        id: particleId.current++,
        x,
        y: "50%",
        size: 6 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.5 ? "circle" : "square",
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random(),
        opacity: 1,
        duration: 0.6 + Math.random() * 0.6,
        delay: Math.random() * 0.15,
        easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      });
    }
    setParticles((p) => [...p, ...newP]);
    setTimeout(() => setParticles((p) => p.filter((pp) => !newP.includes(pp))), 1500);
  };

  const spawnConfetti = () => {
    const colors = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f97316"];
    const newP = [];
    for (let i = 0; i < 100; i++) {
      newP.push({
        id: particleId.current++,
        x: Math.random() * 100 + "%",
        y: "-5%",
        size: 6 + Math.random() * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.3 ? "square" : "circle",
        rotation: Math.random() * 720,
        scale: 0.5 + Math.random(),
        opacity: 1,
        duration: 2 + Math.random() * 3,
        delay: Math.random() * 2,
        easing: "ease-out",
      });
    }
    setParticles(newP);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ═══════════════ RENDER ═══════════════

  // ── START SCREEN ──
  if (screen === "start") {
    return (
      <>
      <GlobalStyles />
      <div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 30%, #164e63 60%, #0f766e 85%, #065f46 100%)",
          fontFamily: "'Fredoka', sans-serif",
          position: "relative",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* Animated background circles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 100 + i * 80,
              height: 100 + i * 80,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.05)",
              top: `${20 + Math.sin(i) * 30}%`,
              left: `${10 + i * 15}%`,
              animation: `float ${6 + i * 2}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}

        <div style={{ fontSize: "clamp(3rem, 10vw, 5rem)", zIndex: 1, animation: "bounceIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          🪢
        </div>

        <h1
          style={{
            fontFamily: "'Lilita One', cursive",
            fontSize: "clamp(2.2rem, 8vw, 4.5rem)",
            color: "white",
            textAlign: "center",
            lineHeight: 1.05,
            textShadow: "0 4px 0 rgba(0,0,0,0.3), 0 0 40px rgba(59,130,246,0.3)",
            zIndex: 1,
            margin: 0,
          }}
        >
          MATH
          <br />
          <span style={{ background: "linear-gradient(90deg, #fbbf24, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            TUG OF WAR
          </span>
        </h1>

        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)", fontWeight: 600, zIndex: 1, textAlign: "center", padding: "0 30px" }}>
          Two players. One screen. Solve math. Pull the rope!
        </p>

        {/* Settings card */}
        <div
          style={{
            zIndex: 1,
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 24,
            padding: "18px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: "min(90%, 340px)",
          }}
        >
          {/* Difficulty */}
          <div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
              Difficulty
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["easy", "medium", "hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 12,
                    border: "2px solid",
                    borderColor: difficulty === d ? "#fbbf24" : "rgba(255,255,255,0.15)",
                    background: difficulty === d ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
                    color: difficulty === d ? "#fbbf24" : "rgba(255,255,255,0.6)",
                    fontFamily: "'Fredoka', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Win Score */}
          <div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
              First to
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[3, 5, 7, 10].map((s) => (
                <button
                  key={s}
                  onClick={() => setWinScore(s)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 12,
                    border: "2px solid",
                    borderColor: winScore === s ? "#fbbf24" : "rgba(255,255,255,0.15)",
                    background: winScore === s ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.05)",
                    color: winScore === s ? "#fbbf24" : "rgba(255,255,255,0.6)",
                    fontFamily: "'Fredoka', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Sound toggle */}
          <button
            onClick={() => setMusicOn((m) => !m)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "8px",
              color: "rgba(255,255,255,0.7)",
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            {musicOn ? "🔊 Music ON" : "🔇 Music OFF"}
          </button>
        </div>

        {/* Play button */}
        <button
          onClick={startCountdown}
          style={{
            zIndex: 1,
            padding: "16px 50px",
            fontFamily: "'Lilita One', cursive",
            fontSize: "clamp(1.4rem, 4vw, 2rem)",
            background: "linear-gradient(135deg, #f59e0b, #f97316)",
            color: "white",
            border: "none",
            borderRadius: 60,
            cursor: "pointer",
            boxShadow: "0 6px 0 #c2410c, 0 10px 40px rgba(249,115,22,0.4)",
            transition: "transform 0.1s",
            letterSpacing: 1,
          }}
          onPointerDown={(e) => (e.currentTarget.style.transform = "translateY(4px)")}
          onPointerUp={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          START GAME 💪
        </button>
      </div>
      </>
    );
  }

  // ── COUNTDOWN SCREEN ──
  if (screen === "countdown") {
    return (
      <><GlobalStyles /><div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a, #1e293b)",
          fontFamily: "'Lilita One', cursive",
          userSelect: "none",
        }}
      >
        <div
          key={countdownNum}
          style={{
            fontSize: countdownNum === 0 ? "clamp(3rem, 12vw, 6rem)" : "clamp(6rem, 25vw, 14rem)",
            color: countdownNum === 0 ? "#fbbf24" : "white",
            textShadow: `0 0 60px ${countdownNum === 0 ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.3)"}`,
            animation: "countPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {countdownNum === 0 ? "PULL!" : countdownNum}
        </div>
      </div></>
    );
  }

  // ── GAME SCREEN ──
  if (screen === "game") {
    return (
      <><GlobalStyles /><div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Fredoka', sans-serif",
          userSelect: "none",
          overflow: "hidden",
        }}
      >
        {/* Scoreboard */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 14px",
            background: "linear-gradient(90deg, #1e3a5f, #0f172a, #5f1e1e)",
            height: 52,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#93c5fd" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, letterSpacing: 1 }}>TEAM 1</span>
            <span
              style={{
                fontFamily: "'Lilita One', cursive",
                fontSize: "1.6rem",
                background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                minWidth: 28,
                textAlign: "center",
              }}
            >
              {blueScore}
            </span>
          </div>

          <div
            style={{
              fontFamily: "'Lilita One', cursive",
              fontSize: "1rem",
              color: "#fbbf24",
              background: "rgba(251,191,36,0.1)",
              padding: "3px 14px",
              borderRadius: 20,
              border: "1px solid rgba(251,191,36,0.2)",
            }}
          >
            {formatTime(timer)}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fca5a5" }}>
            <span
              style={{
                fontFamily: "'Lilita One', cursive",
                fontSize: "1.6rem",
                background: "linear-gradient(135deg, #ef4444, #f87171)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                minWidth: 28,
                textAlign: "center",
              }}
            >
              {redScore}
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 800, letterSpacing: 1 }}>TEAM 2</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: "#1e293b", position: "relative", flexShrink: 0 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${(blueScore / winScore) * 50}%`,
              background: "linear-gradient(90deg, #2563eb, #3b82f6)",
              transition: "width 0.4s ease",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              height: "100%",
              width: `${(redScore / winScore) * 50}%`,
              background: "linear-gradient(270deg, #dc2626, #ef4444)",
              transition: "width 0.4s ease",
            }}
          />
        </div>

        {/* ARENA */}
        <div
          style={{
            position: "relative",
            height: "clamp(100px, 18vh, 150px)",
            flexShrink: 0,
            background: "linear-gradient(180deg, #7dd3fc 0%, #bae6fd 30%, #86efac 65%, #22c55e 85%, #15803d 100%)",
            overflow: "hidden",
          }}
        >
          {/* Clouds */}
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `${5 + i * 12}%`,
                left: `${10 + i * 30}%`,
                width: 60 + i * 20,
                height: 20 + i * 5,
                background: "rgba(255,255,255,0.5)",
                borderRadius: 20,
                animation: `cloudDrift ${20 + i * 10}s linear infinite`,
                animationDelay: `${i * -5}s`,
              }}
            />
          ))}

          {/* Center line */}
          <div style={{ position: "absolute", top: "10%", left: "50%", width: 2, height: "50%", background: "rgba(0,0,0,0.1)", transform: "translateX(-50%)" }} />

          {/* Win zone indicators */}
          <div style={{ position: "absolute", top: "10%", left: "15%", width: 2, height: "50%", background: "rgba(37,99,235,0.2)", borderRadius: 2 }} />
          <div style={{ position: "absolute", top: "10%", right: "15%", width: 2, height: "50%", background: "rgba(220,38,38,0.2)", borderRadius: 2 }} />

          {/* Blue team characters */}
          <div
            style={{
              position: "absolute",
              top: "18%",
              left: "8%",
              display: "flex",
              gap: 0,
              zIndex: 10,
              transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: `translateX(${(ropePos / winScore) * -30}%)`,
            }}
          >
            {[0, 1, 2].map((i) => (
              <TugCharacter key={i} team="blue" pulling={screen === "game"} index={i} />
            ))}
          </div>

          {/* Rope */}
          <Rope position={ropePos} maxPos={winScore} />

          {/* Red team characters */}
          <div
            style={{
              position: "absolute",
              top: "18%",
              right: "8%",
              display: "flex",
              gap: 0,
              zIndex: 10,
              transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: `translateX(${(ropePos / winScore) * -30}%)`,
            }}
          >
            {[0, 1, 2].map((i) => (
              <TugCharacter key={i} team="red" pulling={screen === "game"} index={i} />
            ))}
          </div>

          {/* Ground texture */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              width: "100%",
              height: "30%",
              background: "linear-gradient(180deg, #22c55e, #15803d)",
              borderRadius: "40% 40% 0 0 / 100% 100% 0 0",
            }}
          />
        </div>

        {/* PLAYER AREAS */}
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <PlayerPanel
            team="blue"
            question={blueQ?.display || "..."}
            input={blueInput}
            streak={blueStreak}
            feedback={blueFeedback}
            disabled={!!blueFeedback}
            onInput={(v) => setBlueInput((p) => (p.length < 4 ? p + v : p))}
            onClear={() => setBlueInput("")}
            onSubmit={submitBlue}
          />
          <div style={{ width: 3, background: "linear-gradient(180deg, #64748b, #334155, #64748b)", flexShrink: 0 }} />
          <PlayerPanel
            team="red"
            question={redQ?.display || "..."}
            input={redInput}
            streak={redStreak}
            feedback={redFeedback}
            disabled={!!redFeedback}
            onInput={(v) => setRedInput((p) => (p.length < 4 ? p + v : p))}
            onClear={() => setRedInput("")}
            onSubmit={submitRed}
          />
        </div>

        <Particles particles={particles} />
      </div></>
    );
  }

  // ── WIN SCREEN ──
  if (screen === "win") {
    const isBlue = winner === "blue";
    return (
      <><GlobalStyles /><div
        style={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: isBlue
            ? "linear-gradient(135deg, #0f172a, #1e3a8a, #2563eb)"
            : "linear-gradient(135deg, #0f172a, #7f1d1d, #dc2626)",
          fontFamily: "'Fredoka', sans-serif",
          position: "relative",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <Particles particles={particles} />

        {/* Glow ring */}
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${isBlue ? "rgba(59,130,246,0.2)" : "rgba(239,68,68,0.2)"} 0%, transparent 70%)`,
            animation: "pulse 2s ease-in-out infinite",
          }}
        />

        <div style={{ fontSize: "clamp(4rem, 15vw, 8rem)", zIndex: 1, animation: "bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          🏆
        </div>

        <h1
          style={{
            fontFamily: "'Lilita One', cursive",
            fontSize: "clamp(2rem, 7vw, 4rem)",
            color: "white",
            textShadow: "0 4px 0 rgba(0,0,0,0.3)",
            zIndex: 1,
            textAlign: "center",
            margin: 0,
            animation: "bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both",
          }}
        >
          {isBlue ? "TEAM 1" : "TEAM 2"} WINS!
        </h1>

        <div
          style={{
            zIndex: 1,
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(20px)",
            borderRadius: 20,
            padding: "16px 28px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            border: "1px solid rgba(255,255,255,0.15)",
            animation: "bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both",
          }}
        >
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#93c5fd", fontSize: "0.7rem", fontWeight: 800, letterSpacing: 1 }}>TEAM 1</div>
              <div style={{ fontFamily: "'Lilita One', cursive", fontSize: "2rem", color: "white" }}>{blueScore}</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "'Lilita One', cursive", fontSize: "1.4rem" }}>—</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#fca5a5", fontSize: "0.7rem", fontWeight: 800, letterSpacing: 1 }}>TEAM 2</div>
              <div style={{ fontFamily: "'Lilita One', cursive", fontSize: "2rem", color: "white" }}>{redScore}</div>
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontWeight: 700 }}>Time: {formatTime(timer)}</div>
        </div>

        <button
          onClick={() => {
            setParticles([]);
            setScreen("start");
          }}
          style={{
            zIndex: 1,
            padding: "14px 44px",
            fontFamily: "'Lilita One', cursive",
            fontSize: "clamp(1.2rem, 3.5vw, 1.6rem)",
            background: "linear-gradient(135deg, #f59e0b, #f97316)",
            color: "white",
            border: "none",
            borderRadius: 60,
            cursor: "pointer",
            boxShadow: "0 5px 0 #c2410c, 0 8px 30px rgba(249,115,22,0.4)",
            animation: "bounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both",
          }}
        >
          PLAY AGAIN 🔁
        </button>
      </div></>
    );
  }

  return null;
}
