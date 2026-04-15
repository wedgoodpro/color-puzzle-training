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

  const [grid, setGridState] = useState<Grid>(emptyGrid(initRows, initCols));
  const gridRef = useRef<Grid>(emptyGrid(initRows, initCols));
  const setGrid = (g: Grid | ((prev: Grid) => Grid)) => {
    if (typeof g === 'function') {
      setGridState((prev) => { const next = g(prev); gridRef.current = next; return next; });
    } else {
      gridRef.current = g; setGridState(g);
    }
  };
  const [gridCols, setGridColsState] = useState(initCols);
  const [gridRows, setGridRowsState] = useState(initRows);
  const gridColsRef = useRef(initCols);
  const gridRowsRef = useRef(initRows);
  const setGridCols = (v: number) => { gridColsRef.current = v; setGridColsState(v); };
  const setGridRows = (v: number) => { gridRowsRef.current = v; setGridRowsState(v); };
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

  // Гравитация к верху: новый блок добавляется в нижнюю свободную строку
  const findTargetRow = useCallback((col: number, g: Grid, rows: number): number => {
    let bottom = rows - 1;
    while (bottom >= 0 && g[bottom][col] !== null) bottom--;
    return bottom; // -1 если столбец полон
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

  // Чистая функция: притягивает кубики к верху по каждому столбцу
  const applyGravity = (g: Grid, rows: number, cols: number): Grid => {
    const next = g.map((r) => [...r]) as Grid;
    for (let c = 0; c < cols; c++) {
      const cells = [];
      for (let r = 0; r < rows; r++) {
        if (next[r][c] !== null) cells.push(next[r][c]);
      }
      for (let r = 0; r < rows; r++) {
        next[r][c] = r < cells.length ? cells[r] : null;
      }
    }
    return next;
  };

  // Чистая функция: ищет одно совпадение на всей доске (приоритет: тетрада > триада > пара)
  // Возвращает { cells, points } или null
  const findAnyMatch = (g: Grid, rows: number, cols: number): { cells: [number, number][]; points: number } | null => {
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    const findConnected = (startR: number, startC: number, targetColorId: number, allowedColorIds: number[]): [number, number][] => {
      const allowed = new Set(allowedColorIds);
      const visited = new Set<string>();
      const result: [number, number][] = [];
      const queue: [number, number][] = [[startR, startC]];
      visited.add(`${startR}-${startC}`);
      while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        for (const [dr, dc] of dirs) {
          const nr = r + dr; const nc = c + dc;
          const key = `${nr}-${nc}`;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key) && g[nr][nc]) {
            const nColor = g[nr][nc]!.colorId;
            if (allowed.has(nColor)) {
              visited.add(key);
              if (nColor === targetColorId) result.push([nr, nc]);
              queue.push([nr, nc]);
            }
          }
        }
      }
      return result;
    };

    // Перебираем все занятые клетки
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!g[row][col]) continue;
        const colorId = g[row][col]!.colorId;

        const neighbors: { r: number; c: number; colorId: number }[] = [];
        for (const [dr, dc] of dirs) {
          const nr = row + dr; const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc]) {
            neighbors.push({ r: nr, c: nc, colorId: g[nr][nc]!.colorId });
          }
        }
        const neighborColorIds = neighbors.map((n) => n.colorId);

        // Тетрада
        const tetrad = getTetrad(colorId);
        const tetradOthers = tetrad ? tetrad.filter((id) => id !== colorId) : [];
        if (tetrad) {
          if (tetradOthers.every((id) => neighborColorIds.includes(id))) {
            const cells: [number, number][] = [[row, col]];
            for (const otherId of tetradOthers) {
              const n = neighbors.find((n) => n.colorId === otherId)!;
              cells.push([n.r, n.c]);
            }
            return { cells, points: POINTS_TETRAD };
          }
          const foundCells: Map<number, [number, number]> = new Map([[colorId, [row, col]]]);
          for (const otherId of tetradOthers) {
            const found = findConnected(row, col, otherId, tetrad);
            if (found.length > 0) foundCells.set(otherId, found[0]);
          }
          if (foundCells.size === 4) {
            const cells: [number, number][] = [];
            foundCells.forEach(([r, c]) => cells.push([r, c]));
            return { cells, points: POINTS_TETRAD };
          }
        }

        // Триада
        const triad = getTriad(colorId);
        const triadOthers = triad ? triad.filter((id) => id !== colorId) : [];
        if (triad) {
          if (triadOthers.every((id) => neighborColorIds.includes(id))) {
            const cells: [number, number][] = [[row, col]];
            for (const otherId of triadOthers) {
              const n = neighbors.find((n) => n.colorId === otherId)!;
              cells.push([n.r, n.c]);
            }
            return { cells, points: POINTS_TRIAD };
          }
          const foundCells: Map<number, [number, number]> = new Map([[colorId, [row, col]]]);
          for (const otherId of triadOthers) {
            const found = findConnected(row, col, otherId, triad);
            if (found.length > 0) foundCells.set(otherId, found[0]);
          }
          if (foundCells.size === 3) {
            const cells: [number, number][] = [];
            foundCells.forEach(([r, c]) => cells.push([r, c]));
            return { cells, points: POINTS_TRIAD };
          }
        }

        // Пара
        const complement = getComplement(colorId);
        const pairNeighbors = neighbors.filter((n) => n.colorId === complement);
        if (pairNeighbors.length > 0) {
          const cells: [number, number][] = [[row, col], ...pairNeighbors.map((n): [number, number] => [n.r, n.c])];
          return { cells, points: POINTS_PAIR * pairNeighbors.length };
        }
      }
    }
    return null;
  };

  const checkAndPop = useCallback(
    (g: Grid, row: number, col: number, colorId: number, rows: number, cols: number, cs: number) => {
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

      const findConnected = (startR: number, startC: number, targetColorId: number, allowedColorIds: number[]): [number, number][] => {
        const allowed = new Set(allowedColorIds);
        const visited = new Set<string>();
        const result: [number, number][] = [];
        const queue: [number, number][] = [[startR, startC]];
        visited.add(`${startR}-${startC}`);
        while (queue.length > 0) {
          const [r, c] = queue.shift()!;
          for (const [dr, dc] of dirs) {
            const nr = r + dr; const nc = c + dc;
            const key = `${nr}-${nc}`;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key) && g[nr][nc]) {
              const nColor = g[nr][nc]!.colorId;
              if (allowed.has(nColor)) {
                visited.add(key);
                if (nColor === targetColorId) result.push([nr, nc]);
                queue.push([nr, nc]);
              }
            }
          }
        }
        return result;
      };

      const neighbors: { r: number; c: number; colorId: number }[] = [];
      for (const [dr, dc] of dirs) {
        const nr = row + dr; const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc]) {
          neighbors.push({ r: nr, c: nc, colorId: g[nr][nc]!.colorId });
        }
      }
      const neighborColorIds = neighbors.map((n) => n.colorId);

      let toRemove: [number, number][] = [];
      let points = 0;

      // Приоритет 1: тетрада
      const tetrad = getTetrad(colorId);
      const tetradOthers = tetrad ? tetrad.filter((id) => id !== colorId) : [];
      if (tetrad) {
        if (tetradOthers.every((id) => neighborColorIds.includes(id))) {
          toRemove.push([row, col]);
          for (const otherId of tetradOthers) {
            const n = neighbors.find((n) => n.colorId === otherId)!;
            toRemove.push([n.r, n.c]);
          }
          points = POINTS_TETRAD;
        } else {
          const foundCells: Map<number, [number, number]> = new Map([[colorId, [row, col]]]);
          for (const otherId of tetradOthers) {
            const found = findConnected(row, col, otherId, tetrad);
            if (found.length > 0) foundCells.set(otherId, found[0]);
          }
          if (foundCells.size === 4) {
            foundCells.forEach(([r, c]) => toRemove.push([r, c]));
            points = POINTS_TETRAD;
          }
        }
      }

      // Приоритет 2: триада
      if (toRemove.length === 0) {
        const triad = getTriad(colorId);
        const triadOthers = triad ? triad.filter((id) => id !== colorId) : [];
        if (triad) {
          if (triadOthers.every((id) => neighborColorIds.includes(id))) {
            toRemove.push([row, col]);
            for (const otherId of triadOthers) {
              const n = neighbors.find((n) => n.colorId === otherId)!;
              toRemove.push([n.r, n.c]);
            }
            points = POINTS_TRIAD;
          } else {
            const foundCells: Map<number, [number, number]> = new Map([[colorId, [row, col]]]);
            for (const otherId of triadOthers) {
              const found = findConnected(row, col, otherId, triad);
              if (found.length > 0) foundCells.set(otherId, found[0]);
            }
            if (foundCells.size === 3) {
              foundCells.forEach(([r, c]) => toRemove.push([r, c]));
              points = POINTS_TRIAD;
            }
          }
        }
      }

      // Приоритет 3: пара
      if (toRemove.length === 0) {
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

      const dedup = (arr: [number, number][]) => {
        const seen = new Set<string>();
        return arr.filter(([r, c]) => { const k = `${r}-${c}`; if (seen.has(k)) return false; seen.add(k); return true; });
      };
      toRemove = dedup(toRemove);

      // Запускаем каскад: анимация → удаление → гравитация → повтор
      const runCascade = (currentGrid: Grid, removeCells: [number, number][], pts: number, delay: number) => {
        setPoppingCells(new Set(removeCells.map(([r, c]) => `${r}-${c}`)));
        spawnParticles(removeCells, currentGrid, cs);
        const removedColors = new Set(removeCells.map(([r, c]) => currentGrid[r][c]!.colorId));
        setLitColorIds(removedColors);
        setTimeout(() => setLitColorIds(new Set()), 900);

        setTimeout(() => {
          // Удаляем совпавшие ячейки
          const afterRemove = currentGrid.map((r) => [...r]) as Grid;
          removeCells.forEach(([r, c]) => { afterRemove[r][c] = null; });
          setPoppingCells(new Set());

          // Гравитация
          const afterGravity = applyGravity(afterRemove, rows, cols);

          setGrid(afterGravity);
          setScore((s) => {
            const newScore = s + pts;
            scoreRef.current = newScore;
            return newScore;
          });
          triggerScoreAnim(pts);

          // Ищем новые совпадения после гравитации
          const nextMatch = findAnyMatch(afterGravity, rows, cols);
          if (nextMatch) {
            runCascade(afterGravity, nextMatch.cells, nextMatch.points, 350);
          }
        }, delay);
      };

      runCascade(g, toRemove, points, 320);
    },
    [spawnParticles]
  );

  const handleColumnClick = useCallback(
    (col: number) => {
      if (flyingTile || gameOver || newColorsNotice) return;
      const targetRow = findTargetRow(col, gridRef.current, gridRowsRef.current);
      if (targetRow === -1) return;

      const colorId = currentColorId;
      const activeColorIds = getActiveColorIds(scoreRef.current);
      const cs = getCellSize(gridColsRef.current);
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
          // Строим новый grid, применяем гравитацию, запускаем проверку совпадений
          const rows = gridRowsRef.current;
          const cols = gridColsRef.current;
          const currentGrid = gridRef.current.map((r) => [...r]) as Grid;
          currentGrid[targetRow][col] = { colorId };
          const afterGravity = applyGravity(currentGrid, rows, cols);
          let filledCount = 0;
          for (let r = 0; r < rows; r++) {
            if (afterGravity[r][col] !== null) filledCount++;
          }
          const newRow = filledCount - 1;
          setGrid(afterGravity);
          checkAndPop(afterGravity, newRow, col, colorId, rows, cols, cs);
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

  // Проверка game over — верхняя строка заполнена (гравитация к верху)
  useEffect(() => {
    if (!gameOver && !flyingTile) {
      const lastRowFull = grid[0]?.every((cell) => cell !== null);
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
    const startY = BOARD_H + cellSize * 2;
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