import { useState, useEffect, useCallback, useRef } from "react";
import JSZip from "jszip";
import ColorWheel from "@/game/ColorWheel";
import GameBoard from "@/game/GameBoard";
import { GameOverModal } from "@/game/GameOverlay";
import {
  ITTEN_COLORS, COLOR_LEVELS,
  BOARD_W, BOARD_H, ANIM_DURATION, BG,
  POINTS_PAIR, POINTS_TRIAD, POINTS_TETRAD,
  Cell, Grid, FlyingTile, Particle,
  getComplement, getTriad, getTetrad,
  getActiveColorIds, randColorIdFromActive,
  emptyGrid, loadScores, getBestScore, saveScore, easeOutCubic,
  getGridSize, getCellSize, GAP,
} from "@/game/constants";

function DownloadHtmlButton() {
  const [loading, setLoading] = useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const origin = window.location.origin;
      const zip = new JSZip();
      const folder = zip.folder('colorist-game')!;

      const rawHtml = await fetch(origin + '/').then(r => r.text());
      const doc = document.implementation.createHTMLDocument('');
      doc.documentElement.innerHTML = rawHtml;

      doc.querySelectorAll('script[src]').forEach(el => {
        const src = el.getAttribute('src') || '';
        if (src.includes('poehali.dev') || src.includes('yandex')) el.remove();
      });
      doc.querySelectorAll('script:not([src])').forEach(el => {
        if (el.textContent?.includes('ym(') || el.textContent?.includes('Metrika')) el.remove();
      });
      doc.querySelectorAll('noscript').forEach(el => el.remove());
      doc.querySelectorAll('link').forEach(el => {
        const rel = el.getAttribute('rel') || '';
        const href = el.getAttribute('href') || '';
        if (href.includes('fonts.google') || href.includes('fonts.gstatic')) { el.remove(); return; }
        if (rel === 'modulepreload' || rel === 'prefetch') { el.remove(); return; }
      });

      const fs = doc.createElement('style');
      fs.textContent = `.font-mono{font-family:ui-monospace,"Cascadia Code",Menlo,Consolas,monospace!important}`;
      doc.head.appendChild(fs);

      const assetPaths = new Set<string>();
      doc.querySelectorAll('link[href]').forEach(el => {
        const href = el.getAttribute('href') || '';
        if (!href.startsWith('http') && !href.startsWith('//')) assetPaths.add(href);
      });
      doc.querySelectorAll('script[src]').forEach(el => {
        const src = el.getAttribute('src') || '';
        if (!src.startsWith('http') && !src.startsWith('//')) assetPaths.add(src);
      });

      for (const path of assetPaths) {
        const url = origin + (path.startsWith('/') ? path : '/' + path);
        const data = await fetch(url).then(r => r.arrayBuffer());
        folder.file(path.replace(/^\//, ''), data);
      }

      folder.file('index.html', '<!DOCTYPE html>\n' + doc.documentElement.outerHTML);

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = 'colorist-game.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={download}
      disabled={loading}
      className="font-mono uppercase tracking-widest"
      style={{ fontSize: 11, color: loading ? "#333" : "#555", letterSpacing: "0.15em", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      title="Скачать игру как HTML-файл"
    >
      {loading ? '...' : '↓ скачать игру'}
    </button>
  );
}

export default function Index() {
  const initialActiveIds = getActiveColorIds(0);
  const { cols: initCols, rows: initRows } = getGridSize(initialActiveIds.length);

  const [grid, setGrid] = useState<Grid>(emptyGrid(initRows, initCols));
  const [gridCols, setGridCols] = useState(initCols);
  const [gridRows, setGridRows] = useState(initRows);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [currentColorId, setCurrentColorId] = useState<number>(() => randColorIdFromActive(initialActiveIds));
  const [bestScore, setBestScore] = useState(getBestScore());
  const [scoreAnim, setScoreAnim] = useState(false);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [flyingTile, setFlyingTile] = useState<FlyingTile | null>(null);
  const [poppingCells, setPoppingCells] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const [gameOver, setGameOver] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [litColorIds, setLitColorIds] = useState<Set<number>>(new Set());
  const [newColorsNotice, setNewColorsNotice] = useState<string | null>(null);
  const prevActiveLenRef = useRef(initialActiveIds.length);
  const lastTwoColorsRef = useRef<number[]>([]);

  const animFrameRef = useRef<number | null>(null);
  const flyStartRef = useRef<number>(0);

  const cellSize = getCellSize(gridCols);

  const findTargetRow = useCallback((col: number, g: Grid, rows: number): number => {
    let top = 0;
    while (top < rows && g[top][col] !== null) top++;
    if (top >= rows) return -1;
    return top;
  }, []);

  const triggerScoreAnim = (pts: number) => {
    setLastPoints(pts);
    setScoreAnim(true);
    setTimeout(() => { setScoreAnim(false); setLastPoints(null); }, 700);
  };

  const spawnParticles = useCallback((cells: [number, number][], g: Grid, cs: number) => {
    const newParticles: Particle[] = [];
    cells.forEach(([r, c]) => {
      const cellColor = g[r][c]?.colorId ?? 0;
      const cx = c * (cs + GAP) + cs / 2;
      const cy = r * (cs + GAP) + cs / 2;
      for (let i = 0; i < 8; i++) {
        newParticles.push({
          id: ++particleIdRef.current,
          x: cx,
          y: cy,
          color: ITTEN_COLORS[cellColor].hex,
          angle: (360 / 8) * i + Math.random() * 15 - 7,
          dist: 30 + Math.random() * 35,
        });
      }
    });
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      const ids = new Set(newParticles.map((p) => p.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, 600);
  }, []);

  const checkAndPop = useCallback(
    (g: Grid, row: number, col: number, colorId: number, rows: number, cols: number, cs: number) => {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      const triad = getTriad(colorId);
      const triadOthers = triad ? triad.filter((id) => id !== colorId) : [];

      const neighbors: { r: number; c: number; colorId: number }[] = [];
      for (const [dr, dc] of dirs) {
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc]) {
          neighbors.push({ r: nr, c: nc, colorId: g[nr][nc]!.colorId });
        }
      }

      const neighborColorIds = neighbors.map((n) => n.colorId);

      let toRemove: [number, number][] = [];
      let points = 0;

      // Приоритет 1: тетрада — POINTS_TETRAD (6)
      const tetrad = getTetrad(colorId);
      const tetradOthers = tetrad ? tetrad.filter((id) => id !== colorId) : [];
      if (tetrad && tetradOthers.every((id) => neighborColorIds.includes(id))) {
        toRemove.push([row, col]);
        for (const otherId of tetradOthers) {
          const neighbor = neighbors.find((n) => n.colorId === otherId)!;
          toRemove.push([neighbor.r, neighbor.c]);
        }
        points = POINTS_TETRAD;
      // Приоритет 2: триада — POINTS_TRIAD (4)
      } else if (triad && triadOthers.every((id) => neighborColorIds.includes(id))) {
        toRemove.push([row, col]);
        for (const otherId of triadOthers) {
          const neighbor = neighbors.find((n) => n.colorId === otherId)!;
          toRemove.push([neighbor.r, neighbor.c]);
        }
        points = POINTS_TRIAD;
      // Приоритет 3: пара — POINTS_PAIR (1)
      } else {
        const complement = getComplement(colorId);
        for (const n of neighbors) {
          if (n.colorId === complement) {
            if (toRemove.length === 0) toRemove.push([row, col]);
            toRemove.push([n.r, n.c]);
            points += POINTS_PAIR;
          }
        }
      }

      if (toRemove.length === 0) return;

      const seen = new Set<string>();
      toRemove = toRemove.filter(([r, c]) => {
        const k = `${r}-${c}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      setPoppingCells(new Set(toRemove.map(([r, c]) => `${r}-${c}`)));
      spawnParticles(toRemove, g, cs);

      const removedColorIds = new Set(toRemove.map(([r, c]) => g[r][c]!.colorId));
      setLitColorIds(removedColorIds);
      setTimeout(() => setLitColorIds(new Set()), 900);

      setTimeout(() => {
        setGrid((prev) => {
          const next = prev.map((r) => [...r]) as Grid;
          toRemove.forEach(([r, c]) => { next[r][c] = null; });
          return next;
        });
        setPoppingCells(new Set());
        setScore((s) => {
          const newScore = s + points;
          scoreRef.current = newScore;
          return newScore;
        });
        triggerScoreAnim(points);
      }, 320);
    },
    [spawnParticles]
  );

  const handleColumnClick = useCallback(
    (col: number) => {
      if (flyingTile || gameOver) return;
      const targetRow = findTargetRow(col, grid, gridRows);
      if (targetRow === -1) return;

      const colorId = currentColorId;
      const activeColorIds = getActiveColorIds(scoreRef.current);
      const cs = getCellSize(gridCols);
      flyStartRef.current = performance.now();
      setFlyingTile({ col, colorId, targetRow, progress: 0 });

      const animate = (now: number) => {
        const elapsed = now - flyStartRef.current;
        const progress = Math.min(elapsed / ANIM_DURATION, 1);
        setFlyingTile((ft) => ft ? { ...ft, progress } : null);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setFlyingTile(null);
          setGrid((prev) => {
            const next = prev.map((r) => [...r]) as Grid;
            next[targetRow][col] = { colorId };
            checkAndPop(next, targetRow, col, colorId, gridRows, gridCols, cs);
            return next;
          });
          const last2 = lastTwoColorsRef.current;
          const excludeId = last2.length === 2 && last2[0] === last2[1] ? last2[0] : undefined;
          const nextId = randColorIdFromActive(activeColorIds, excludeId);
          lastTwoColorsRef.current = [last2[last2.length - 1] ?? colorId, nextId].slice(-2);
          setCurrentColorId(nextId);
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [flyingTile, gameOver, grid, gridRows, gridCols, currentColorId, findTargetRow, checkAndPop]
  );

  // Проверка game over — последняя строка заполнена
  useEffect(() => {
    if (!gameOver && !flyingTile) {
      const lastRowFull = grid[gridRows - 1]?.every((cell) => cell !== null);
      if (lastRowFull) {
        saveScore(score);
        const updated = loadScores();
        setBestScore(updated[0]?.score ?? score);
        setGameOver(true);
      }
    }
  }, [grid, flyingTile, gameOver, score, gridRows]);

  // Разблокировка новых цветов и расширение поля
  useEffect(() => {
    const activeIds = getActiveColorIds(score);
    const newLen = activeIds.length;
    if (newLen > prevActiveLenRef.current) {
      const added = COLOR_LEVELS.find((l) => l.threshold === score);
      if (added) {
        const names = added.ids.map((id) => ITTEN_COLORS[id].name).join(" и ");
        setNewColorsNotice(`+2 новых цвета: ${names}!`);
        setTimeout(() => setNewColorsNotice(null), 5000);
      }

      // Расширяем поле: +1 столбец и +1 строка
      const { cols: newCols, rows: newRows } = getGridSize(newLen);
      setGridCols(newCols);
      setGridRows(newRows);
      setGrid((prev) => {
        // Добавляем новый столбец (null) к каждой существующей строке
        const withNewCol = prev.map((row) => [...row, null as Cell]);
        // Добавляем новую строку снизу
        const newRow = Array(newCols).fill(null) as Cell[];
        return [...withNewCol, newRow];
      });
    }
    prevActiveLenRef.current = newLen;
  }, [score]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const restartGame = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const startIds = getActiveColorIds(0);
    const { cols, rows } = getGridSize(startIds.length);
    setGrid(emptyGrid(rows, cols));
    setGridCols(cols);
    setGridRows(rows);
    setCurrentColorId(randColorIdFromActive(startIds));
    setScore(0);
    scoreRef.current = 0;
    setFlyingTile(null);
    setPoppingCells(new Set());
    setGameOver(false);
    setLastPoints(null);
    prevActiveLenRef.current = startIds.length;
    lastTwoColorsRef.current = [];
  };

  const getFlyingY = (ft: FlyingTile) => {
    const p = easeOutCubic(ft.progress);
    const startY = BOARD_H + cellSize * 0.5;
    const endY = ft.targetRow * (cellSize + GAP);
    return startY + (endY - startY) * p;
  };

  const activeColorIds = getActiveColorIds(score);
  const currentColor = ITTEN_COLORS[currentColorId];

  return (
    <div
      className="min-h-screen font-sans flex flex-col items-center select-none"
      style={{ backgroundColor: BG }}
    >
      <div className="w-full max-w-xl px-3 flex-1 flex flex-col items-center">
        <div className="flex flex-col items-center gap-4 w-full pt-1">

            {/* Круг + очки поверх в углах */}
            {(() => {
              const wheelSize = BOARD_W * 0.92;
              const R = wheelSize / 2 - 4;
              const innerR = R * 0.38;
              const sqSize = innerR * 0.85;
              return (
                <div className="relative" style={{ width: BOARD_W, height: wheelSize }}>
                  <div className="absolute" style={{ left: (BOARD_W - wheelSize) / 2, top: 0 }}>
                    <ColorWheel litColorIds={litColorIds} activeColorIds={new Set(activeColorIds)} size={wheelSize} />
                    <div
                      className="absolute rounded-sm"
                      style={{
                        width: sqSize,
                        height: sqSize,
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        backgroundColor: currentColor.hex,
                        transition: "background-color 0.25s ease, box-shadow 0.25s",
                        boxShadow: `0 2px 16px ${currentColor.hex}99`,
                      }}
                    />
                  </div>

                  {/* Очки — левый верхний угол */}
                  <div className="absolute" style={{ left: 0, top: 4 }}>
                    <div
                      className="font-mono font-medium text-white leading-none relative"
                      style={{
                        fontSize: 24,
                        transform: scoreAnim ? "scale(1.2)" : "scale(1)",
                        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                        display: "inline-block",
                      }}
                    >
                      {score}
                      {lastPoints !== null && (
                        <span
                          key={score}
                          className="absolute font-mono font-medium pointer-events-none"
                          style={{
                            top: -2,
                            left: "100%",
                            marginLeft: 4,
                            fontSize: lastPoints >= POINTS_TETRAD ? 18 : lastPoints >= POINTS_TRIAD ? 14 : 11,
                            color: lastPoints >= POINTS_TETRAD ? "#FFD700" : lastPoints >= POINTS_TRIAD ? "#F7941D" : "#8DC63F",
                            animation: "float-up 0.7s ease-out forwards",
                            whiteSpace: "nowrap",
                          }}
                        >
                          +{lastPoints}
                        </span>
                      )}
                    </div>
                    <div className="font-mono" style={{ color: "#555", fontSize: 10 }}>очки</div>
                  </div>

                  {/* Рекорд — правый верхний угол */}
                  <div className="absolute text-right" style={{ right: 0, top: 4 }}>
                    <div className="font-mono font-medium leading-none" style={{ fontSize: 24, color: "#4a4a4a" }}>
                      {bestScore}
                    </div>
                    <div className="font-mono" style={{ color: "#555", fontSize: 10 }}>рекорд</div>
                  </div>
                </div>
              );
            })()}

            {/* Уведомление о новых цветах */}
            {newColorsNotice && (
              <div
                className="font-mono text-xs text-center animate-fade-in"
                style={{ color: "#aaa", letterSpacing: "0.05em", marginTop: -8 }}
              >
                {newColorsNotice}
              </div>
            )}

            <GameBoard
              grid={grid}
              cols={gridCols}
              rows={gridRows}
              cellSize={cellSize}
              flyingTile={flyingTile}
              particles={particles}
              poppingCells={poppingCells}
              hoverCol={hoverCol}
              getFlyingY={getFlyingY}
              onColumnClick={handleColumnClick}
              onColumnHover={setHoverCol}
            />

            <div className="flex flex-col items-center gap-6 w-full pb-2">
              <a
                href="https://vk.ru/fotoklubpro"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono tracking-widest uppercase w-full text-center"
                style={{ fontSize: 15, color: "#777", letterSpacing: "0.1em", textDecoration: "none" }}
              >
                хочешь научиться фотографировать?
              </a>
            </div>
          </div>

      </div>

      {gameOver && (
        <GameOverModal
          score={score}
          onRestart={restartGame}
        />
      )}

      <style>{`
        @keyframes float-up {
          0%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-40px); }
        }
      `}</style>
    </div>
  );
}
