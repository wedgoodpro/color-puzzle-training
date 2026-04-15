import { useState, useCallback, useRef, useEffect } from "react";
import {
  ITTEN_COLORS, COLOR_LEVELS,
  BOARD_H, ANIM_DURATION,
  POINTS_PAIR, POINTS_TRIAD, POINTS_TETRAD,
  Cell, Grid, FlyingTile, Particle,
  getComplement, getTriad, getTetrad,
  getActiveColorIds, randColorIdFromActive,
  emptyGrid, loadScores, getBestScore, saveScore, easeOutCubic,
  getGridSize, getCellSize, GAP,
} from "@/game/constants";

export function useGameState() {
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
  const [newColorsNotice, setNewColorsNotice] = useState<{ names: string[]; ids: number[] } | null>(null);
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
      if (flyingTile || gameOver || newColorsNotice) return;
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
    [flyingTile, gameOver, newColorsNotice, grid, gridRows, gridCols, currentColorId, findTargetRow, checkAndPop]
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
        const names = added.ids.map((id) => ITTEN_COLORS[id].name);
        setNewColorsNotice({ names, ids: added.ids });
        setLitColorIds(new Set(added.ids));
        setTimeout(() => {
          setNewColorsNotice(null);
          setLitColorIds(new Set());
        }, 4000);
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

  return {
    grid,
    gridCols,
    gridRows,
    score,
    bestScore,
    scoreAnim,
    lastPoints,
    flyingTile,
    poppingCells,
    particles,
    gameOver,
    hoverCol,
    setHoverCol,
    litColorIds,
    newColorsNotice,
    currentColorId,
    activeColorIds,
    cellSize,
    handleColumnClick,
    restartGame,
    getFlyingY,
  };
}
