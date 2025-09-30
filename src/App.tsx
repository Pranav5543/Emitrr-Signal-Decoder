import React, { useEffect, useMemo, useState } from "react";

type Cell = { index: number; row: number; col: number };

type Level = {
  id: number;
  title: string;
  ruleDescription: string;
  ruleFn: (cell: Cell) => boolean;
};

const GRID_SIZE = 5;
const FLASH_DURATION_MS = 10000; // 10s
const FLASH_INTERVAL_MS = 600; // flash toggle

const buildCells = (): Cell[] => {
  const cells: Cell[] = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++)
    cells.push({
      index: i,
      row: Math.floor(i / GRID_SIZE),
      col: i % GRID_SIZE,
    });
  return cells;
};

const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};

const LEVELS: Level[] = [
  {
    id: 1,
    title: "Even indices",
    ruleDescription: "index % 2 === 0",
    ruleFn: (c) => c.index % 2 === 0,
  },
  {
    id: 2,
    title: "Diagonals",
    ruleDescription: "main diagonals",
    ruleFn: (c) => c.row === c.col || c.row + c.col === GRID_SIZE - 1,
  },
  {
    id: 3,
    title: "Prime indices",
    ruleDescription: "prime indices",
    ruleFn: (c) => isPrime(c.index),
  },
  {
    id: 4,
    title: "Center cluster",
    ruleDescription: "center + 4 neighbours",
    ruleFn: (c) => {
      const center = Math.floor((GRID_SIZE * GRID_SIZE) / 2);
      const cr = Math.floor(center / GRID_SIZE);
      const cc = center % GRID_SIZE;
      const dr = Math.abs(c.row - cr);
      const dc = Math.abs(c.col - cc);
      return (dr === 0 && dc === 0) || dr + dc === 1;
    },
  },
  {
    id: 5,
    title: "(r + c) % 3 === 0",
    ruleDescription: "(row+col)%3===0",
    ruleFn: (c) => (c.row + c.col) % 3 === 0,
  },
];

export default function App(): JSX.Element {
  const cells = useMemo(() => buildCells(), []);

  const [levelIndex, setLevelIndex] = useState(0);
  const [isFlashing, setIsFlashing] = useState(true);
  const [flashOn, setFlashOn] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<{
    correct: Set<number>;
    incorrect: Set<number>;
  } | null>(null);
  const [score, setScore] = useState(0);
  const [hintShown, setHintShown] = useState(false);
  const [timeLeft, setTimeLeft] = useState(Math.ceil(FLASH_DURATION_MS / 1000));

  // a simple counter to force a fresh round even if levelIndex is unchanged
  const [round, setRound] = useState(0);

  const level = LEVELS[levelIndex];

  const targetSet = useMemo(() => {
    const s = new Set<number>();
    for (const c of cells) if (level.ruleFn(c)) s.add(c.index);
    return s;
  }, [cells, level]);

  // Start flashing on level change or round change
  useEffect(() => {
    setIsFlashing(true);
    setFlashOn(true);
    setSelected(new Set());
    setResults(null);
    setHintShown(false);
    setTimeLeft(Math.ceil(FLASH_DURATION_MS / 1000));

    const toggle = setInterval(() => setFlashOn((v) => !v), FLASH_INTERVAL_MS);
    const countdown = setInterval(
      () => setTimeLeft((t) => (t > 0 ? t - 1 : 0)),
      1000
    );

    const stop = setTimeout(() => {
      setIsFlashing(false);
      setFlashOn(false);
      clearInterval(toggle);
      clearInterval(countdown);
    }, FLASH_DURATION_MS);

    return () => {
      clearInterval(toggle);
      clearInterval(countdown);
      clearTimeout(stop);
    };
  }, [levelIndex, round, cells]);

  const toggleSelect = (idx: number) => {
    if (isFlashing) return;
    if (results) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const submit = () => {
    if (isFlashing) return;
    const correct = new Set<number>();
    const incorrect = new Set<number>();
    for (const idx of selected) {
      if (targetSet.has(idx)) correct.add(idx);
      else incorrect.add(idx);
    }
    const missed = new Set<number>();
    for (const t of targetSet) if (!selected.has(t)) missed.add(t);

    const delta = correct.size - incorrect.size;
    setScore((s) => s + Math.max(0, delta));
    setResults({ correct, incorrect: new Set([...incorrect, ...missed]) });
  };

  const nextLevel = () =>
    setLevelIndex((i) => Math.min(LEVELS.length - 1, i + 1));
  const prevLevel = () => setLevelIndex((i) => Math.max(0, i - 1));

  // Restart properly: bump round so useEffect runs and everything resets
  const resetLevel = () => setRound((r) => r + 1);

  // UI theming
  const GOLD = "#FFD166"; // warm gold
  const GOLD_ALT = "#FFB703";
  const BG = "#060607"; // black
  const CARD = "rgba(255,255,255,0.03)";
  const SOFT = "rgba(255,209,102,0.12)";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${BG} 0%, #000000ff 100%)`,
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        color: "#fff",
        padding: 20,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <style>{`
        .container { width:100%; max-width:980px; margin-top:36px; }
        .card { background:${CARD}; border-radius:28px; padding:18px; box-shadow: 0 12px 40px rgba(255, 187, 0, 0.73); backdrop-filter: blur(8px); border: 1px solid rgba(255, 180, 5, 0.85); transition: transform .36s cubic-bezier(.2,.9,.2,1); }
        .card:hover{ transform: translateY(-6px); }
        .header{ display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .title{ font-size:18px; font-weight:700; letter-spacing:0.2px; }
        .sub{ color: rgba(242, 242, 242, 0.7); font-size:13px }
        .meta{ display:flex; gap:12px; align-items:center }

        .grid { display:grid; grid-template-columns: repeat(${GRID_SIZE}, 72px); gap:12px; justify-content:center; padding:6px; }
        .cell { width:72px; height:72px; border-radius:16px; display:flex; align-items:center; justify-content:center; user-select:none; touch-action: manipulation; cursor:pointer; background: rgba(247, 168, 21, 0); border: 1px solid rgba(255, 255, 255, 0.02); transition: transform .18s cubic-bezier(.2,.9,.2,1), box-shadow .18s ease, background .2s ease; }
        .cell:active{ transform: scale(.98); }

        .lit { box-shadow: 0 14px 30px rgba(255,177,20,0.18); animation: pulse 900ms infinite; background: linear-gradient(180deg, rgba(255,209,102,0.12), rgba(255,177,20,0.06)); border: 1px solid rgba(255,209,102,0.18); }
        @keyframes pulse { 0%{ transform: scale(1); } 50%{ transform: scale(1.06);} 100%{ transform: scale(1);} }

        .selected { box-shadow: 0 10px 26px rgba(255,177,20,0.12); outline: 3px solid rgba(255, 177, 20, 0.77); }
        .correct { background: linear-gradient(180deg, rgba(16,185,129,0.06), rgba(16,185,129,0.04)); border:1px solid rgba(16,185,129,0.16); box-shadow: 0 8px 20px rgba(16,185,129,0.06); }
        .incorrect { background: linear-gradient(180deg, rgba(239,68,68,0.06), rgba(239,68,68,0.04)); border:1px solid rgba(239,68,68,0.14); box-shadow: 0 8px 20px rgba(239,68,68,0.06); }

        .controls { display:flex; gap:10px; flex-wrap:wrap; }
        .btn { border-radius:14px; padding:10px 14px; font-weight:700; border:none; cursor:pointer; transition: transform .18s cubic-bezier(.2,.9,.2,1), box-shadow .18s ease; }
        .btn:active{ transform: translateY(2px) scale(.996); }
        .btn-ghost{ background: transparent; color: rgba(255,255,255,0.9); border:1px solid rgba(17, 16, 16, 1); padding:8px 12px; }
        .btn-primary{ background: linear-gradient(90deg, ${GOLD}, ${GOLD_ALT}); color: #000000ff; box-shadow: 0 8px 26px rgba(255, 170, 0, 1); }
        .btn-muted{ background: rgba(255,255,255,0.03); color: rgba(255, 255, 255, 0.9); border: 1px solid rgba(255, 62, 62, 0); }

        .panel-right{ min-width:260px; max-width:360px; }
        .levels { display:flex; gap:8px; flex-wrap:wrap; }

        .footer-note { color: rgba(255,255,255,0.5); font-size:13px; margin-top:10px; }

        @media (max-width:680px){ .grid { grid-template-columns: repeat(${GRID_SIZE}, 56px); gap:10px; } .cell{ width:56px; height:56px; border-radius:12px; } .btn{ border-radius:12px; } }
      `}</style>

      <div className="container">
        <div className="card">
          <div className="header">
            <div>
              <div className="title">Signal Decoder</div>
              <div className="sub">
                The Invisible Pattern Game — Level {level.id} • {level.title}
              </div>
            </div>

            <div className="meta">
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  {score}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                  Score
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{ color: "rgba(255,255,255,0.9)", fontWeight: 700 }}
                >
                  {isFlashing
                    ? `Memorize — ${timeLeft}s`
                    : results
                    ? "Result"
                    : "Select the cells"}
                </div>
                <div className="controls">
                  <button
                    className="btn btn-ghost"
                    onClick={prevLevel}
                    disabled={levelIndex === 0}
                    aria-label="Previous level"
                  >
                    Prev
                  </button>
                  <button
                    className="btn btn-muted"
                    onClick={resetLevel}
                    aria-label="Restart level"
                  >
                    Restart
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setHintShown((s) => !s)}
                    aria-pressed={hintShown}
                  >
                    {hintShown ? "Hide hint" : "Show hint"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <div className="grid" role="grid" aria-label="Signal grid">
                  {cells.map((c) => {
                    const isTarget = targetSet.has(c.index);
                    const isLit = isFlashing && isTarget && flashOn;
                    const isSelected = selected.has(c.index);
                    const resCorrect = results?.correct.has(c.index) ?? false;
                    const resIncorrect =
                      results?.incorrect.has(c.index) ?? false;

                    const classNames = ["cell"];
                    if (isLit) classNames.push("lit");
                    if (isSelected) classNames.push("selected");
                    if (results) {
                      if (resCorrect) classNames.push("correct");
                      else if (resIncorrect) classNames.push("incorrect");
                    }

                    return (
                      <div
                        key={c.index}
                        role="gridcell"
                        aria-selected={isSelected}
                        onClick={() => toggleSelect(c.index)}
                        className={classNames.join(" ")}
                        title={`Cell ${c.index} (${c.row},${c.col})`}
                        style={{
                          touchAction: "manipulation",
                          WebkitTapHighlightColor: "transparent",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            color:
                              isLit || isSelected || results
                                ? "#050505"
                                : "rgba(255,255,255,0.8)",
                            fontWeight: 700,
                          }}
                        >
                          {c.index}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="panel-right">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{ fontWeight: 800, color: "rgba(255,255,255,0.95)" }}
                >
                  Actions
                </div>
                <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                  {results ? "Results" : isFlashing ? "Watching" : "Ready"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={submit}
                  disabled={isFlashing || !!results}
                  aria-disabled={isFlashing || !!results}
                >
                  Submit
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={nextLevel}
                  disabled={levelIndex === LEVELS.length - 1}
                >
                  Next
                </button>
              </div>

              <div style={{ marginBottom: 12, fontSize: 14 }}>
                {results ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>✅ Correct</div>
                      <div>{results.correct.size}</div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>❌ Incorrect / Missed</div>
                      <div>{results.incorrect.size}</div>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: "rgba(255,255,255,0.8)" }}>
                    Select the squares you remember and press{" "}
                    <strong>Submit</strong>.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>
                  Level hint
                </div>
                <div style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
                  {hintShown
                    ? level.ruleDescription
                    : "(hidden) — click 'Show hint'"}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Levels</div>
                <div className="levels">
                  {LEVELS.map((L, i) => (
                    <button
                      key={L.id}
                      className={`btn ${
                        i === levelIndex ? "btn-primary" : "btn-ghost"
                      }`}
                      onClick={() => setLevelIndex(i)}
                      style={{ minWidth: 44 }}
                    >
                      {L.id}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.56)" }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Tip:</strong> Focus on positions (row/col) and index
                  numbers — warm gold highlights help memory.
                </div>
                <div className="footer-note">
                  Built with React + TypeScript • Smooth animations •
                  Mobile-first interactions
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
