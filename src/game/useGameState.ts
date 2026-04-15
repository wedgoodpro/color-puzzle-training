import { useState, useCallback, useRef, useEffect } from "react";
import {
  ITTEN_COLORS, COLOR_LEVELS,
  POINTS_PAIR, POINTS_TRIAD, POINTS_TETRAD,
  Cell, Grid, Particle,
  getComplement, getTriad, getTetrad,
  getActiveColorIds, randColorIdFromActive,
  emptyGrid, loadScores, getBestScore, saveScore,
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
  const [nextColorId, setNextColorId] = useState<number>(() => randColorIdFromActive(initialActiveIds, randColorIdFromActive(initialActiveIds)));
  const [bestScore, setBestScore] = useState(getBestScore());
  const [scoreAnim, setScoreAnim] = useState(false);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [poppingCells, setPoppingCells] = useState<Set<string>>(new Set());
  const [gravityMs, setGravityMs] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const [gameOver, setGameOver] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [litColorIds, setLitColorIds] = useState<Set<number>>(new Set());
  const [newColorsNotice, setNewColorsNotice] = useState<{ names: string[]; ids: number[] } | null>(null);
  const prevActiveLenRef = useRef(initialActiveIds.length);
  const lastTwoColorsRef = useRef<number[]>([]);
  // Undo: сохраняем snapshot до хода
  const [undoSnapshot, setUndoSnapshot] = useState<{ grid: Grid; currentColorId: number; nextColorId: number; score: number } | null>(null);
  const [undoUsed, setUndoUsed] = useState(false);

  const cellSize = getCellSize(gridCols);

  // Гравитация к верху: новый блок добавляется в нижнюю свободную строку
  const findTargetRow = useCallback((col: number, g: Grid): number => {
    const bottom = g.length - 1;
    let r = bottom;
    while (r >= 0 && g[r]?.[col] !== null) r--;
    return r;
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
      for (let i = 0; i < 10; i++) {
        newParticles.push({
          id: ++particleIdRef.current,
          x: cx,
          y: cy,
          color: ITTEN_COLORS[cellColor].hex,
          angle: (360 / 10) * i + Math.random() * 18 - 9,
          dist: 40 + Math.random() * 50,
        });
      }
    });
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      const ids = new Set(newParticles.map((p) => p.id));
      setParticles((prev) => prev.filter((p) => !ids.has(p.id)));
    }, 850);
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

        // Пара — все соседи комплементарного цвета
        const complement = getComplement(colorId);
        const pairDirs2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        const pairCells: [number, number][] = [];
        for (const [dr, dc] of pairDirs2) {
          const nr = row + dr; const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc]?.colorId === complement) {
            pairCells.push([nr, nc]);
          }
        }
        if (pairCells.length > 0) {
          return { cells: [[row, col], ...pairCells] as [number, number][], points: POINTS_PAIR * pairCells.length };
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

      // Приоритет 3: пара — исчезают ВСЕ соседи комплементарного цвета
      if (toRemove.length === 0) {
        const complement = getComplement(colorId);
        const pairDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of pairDirs) {
          const nr = row + dr; const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc]?.colorId === complement) {
            if (toRemove.length === 0) toRemove.push([row, col]);
            toRemove.push([nr, nc]);
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

      // Длительность гравитации и задержка зависят от типа совпадения
      const getTimings = (pts: number) => {
        if (pts >= POINTS_TETRAD) return { popDelay: 750, gravMs: 600 };
        if (pts >= POINTS_TRIAD)  return { popDelay: 600, gravMs: 480 };
        return                           { popDelay: 450, gravMs: 360 };
      };

      // Запускаем каскад: анимация → удаление → гравитация → повтор
      const runCascade = (currentGrid: Grid, removeCells: [number, number][], pts: number) => {
        const { popDelay, gravMs } = getTimings(pts);

        setPoppingCells(new Set(removeCells.map(([r, c]) => `${r}-${c}`)));
        spawnParticles(removeCells, currentGrid, cs);
        const removedColors = new Set(removeCells.map(([r, c]) => currentGrid[r][c]!.colorId));
        setLitColorIds(removedColors);
        setTimeout(() => setLitColorIds(new Set()), gravMs + popDelay);

        setTimeout(() => {
          // Удаляем совпавшие ячейки
          const afterRemove = currentGrid.map((r) => [...r]) as Grid;
          removeCells.forEach(([r, c]) => { afterRemove[r][c] = null; });
          setPoppingCells(new Set());

          // Применяем гравитацию и считаем dropFrom для каждой сдвинувшейся ячейки
          const afterGravity = applyGravity(afterRemove, rows, cols);
          const cs2 = getCellSize(cols);
          for (let c = 0; c < cols; c++) {
            // Собираем старые позиции ячеек (до удаления) по colorId
            const oldPositions: number[] = [];
            for (let r = 0; r < rows; r++) {
              if (afterRemove[r][c] !== null) oldPositions.push(r);
            }
            // Новые позиции после гравитации
            let newIdx = 0;
            for (let r = 0; r < rows; r++) {
              if (afterGravity[r][c] !== null) {
                const oldR = oldPositions[newIdx];
                if (oldR !== undefined && oldR !== r) {
                  // ячейка сдвинулась с oldR на r (вверх), dropFrom = разница в пикселях
                  afterGravity[r][c] = { ...afterGravity[r][c]!, dropFrom: (oldR - r) * (cs2 + GAP) };
                }
                newIdx++;
              }
            }
          }

          setGrid((prev) => {
            const curRows = prev.length;
            const curCols = prev[0]?.length ?? cols;
            if (curRows === rows && curCols === cols) return afterGravity;
            return prev.map((row, ri) =>
              row.map((_, ci) =>
                ri < rows && ci < cols ? (afterGravity[ri]?.[ci] ?? null) : null
              )
            ) as Grid;
          });
          setScore((s) => {
            const newScore = s + pts;
            scoreRef.current = newScore;
            return newScore;
          });
          triggerScoreAnim(pts);

          // После анимации убираем dropFrom и ищем новые совпадения
          setTimeout(() => {
            const cleanGrid = afterGravity.map((r) =>
              r.map((cell) => cell ? { colorId: cell.colorId } : null)
            ) as Grid;
            // Не перетираем сетку если она уже была расширена (используем актуальный prev)
            setGrid((prev) => {
              const curRows = prev.length;
              const curCols = prev[0]?.length ?? cols;
              if (curRows === rows && curCols === cols) return cleanGrid;
              // Сетка уже расширена — накладываем cleanGrid только на старую область
              return prev.map((row, ri) =>
                row.map((cell, ci) =>
                  ri < rows && ci < cols ? (cleanGrid[ri]?.[ci] ?? null) : cell
                )
              ) as Grid;
            });
            const actualRows = gridRef.current.length;
            const actualCols = gridRef.current[0]?.length ?? cols;
            const nextMatch = findAnyMatch(cleanGrid, Math.min(rows, actualRows), Math.min(cols, actualCols));
            if (nextMatch) {
              runCascade(cleanGrid, nextMatch.cells, nextMatch.points);
            }
          }, gravMs + 50);
        }, popDelay);
      };

      runCascade(g, toRemove, points);
    },
    [spawnParticles]
  );

  const handleColumnClick = useCallback(
    (col: number) => {
      if (gameOver || newColorsNotice) return;
      const targetRow = findTargetRow(col, gridRef.current);
      if (targetRow === -1) return;

      const colorId = currentColorId;
      const activeColorIds = getActiveColorIds(scoreRef.current);
      const rows = gridRef.current.length;
      const cols = gridRef.current[0]?.length ?? gridColsRef.current;
      const cs = getCellSize(cols);

      // Сохраняем snapshot для undo (один раз за игру пока не использован)
      setUndoSnapshot({
        grid: gridRef.current.map((r) => [...r]) as Grid,
        currentColorId: colorId,
        nextColorId,
        score: scoreRef.current,
      });
      setUndoUsed(false);

      const currentGrid = gridRef.current.map((r) => [...r]) as Grid;
      // dropFrom = сколько пикселей кубик пролетит снизу вверх (от низа поля до целевой строки)
      const dropFrom = (rows - 1 - targetRow) * (getCellSize(cols) + GAP) + getCellSize(cols);
      currentGrid[targetRow][col] = { colorId, dropFrom };
      const afterGravity = applyGravity(currentGrid, rows, cols);
      let filledCount = 0;
      for (let r = 0; r < rows; r++) {
        if (afterGravity[r][col] !== null) filledCount++;
      }
      const newRow = filledCount - 1;
      setGrid(afterGravity);
      // Убираем dropFrom после анимации и проверяем совпадения
      setTimeout(() => {
        setGrid((prev) => {
          const next = prev.map((r) => [...r]) as Grid;
          if (next[newRow][col]) next[newRow][col] = { colorId };
          return next;
        });
        checkAndPop(afterGravity, newRow, col, colorId, rows, cols, cs);
      }, 320);

      // Следующий цвет становится текущим, генерируем новый следующий
      // Запоминаем последние 4 реально упавших цвета
      const last4 = [...lastTwoColorsRef.current, colorId].slice(-4);
      lastTwoColorsRef.current = last4;

      // Запрет 3 подряд одинаковых: если 2 последних = colorId, исключаем его из следующего
      const last2same = last4.length >= 2 && last4[last4.length - 1] === last4[last4.length - 2];
      const excludeFor3 = last2same ? colorId : undefined;

      // Борьба с "2 цвета долго": если из последних 4 используется только 2 уникальных цвета
      // при наличии >2 активных — форсируем третий цвет
      const uniqueInLast4 = new Set(last4);
      const forceNewColor =
        activeColorIds.length > 2 &&
        last4.length === 4 &&
        uniqueInLast4.size <= 2;

      let safeNextColorId = nextColorId;
      if (activeColorIds.length > 2 && nextColorId === colorId && last2same) {
        safeNextColorId = randColorIdFromActive(activeColorIds, colorId);
      }

      let newNextId: number;
      if (forceNewColor) {
        // Принудительно выбираем цвет НЕ из тех 2, что были последние 4 хода
        const pool = activeColorIds.filter((id) => !uniqueInLast4.has(id));
        newNextId = pool.length > 0
          ? pool[Math.floor(Math.random() * pool.length)]
          : randColorIdFromActive(activeColorIds, excludeFor3);
      } else {
        newNextId = randColorIdFromActive(activeColorIds, excludeFor3);
      }

      setCurrentColorId(safeNextColorId);
      setNextColorId(newNextId);
    },
    [gameOver, newColorsNotice, currentColorId, nextColorId, findTargetRow, checkAndPop]
  );

  const handleUndo = useCallback(() => {
    if (!undoSnapshot || undoUsed) return;
    setGrid(undoSnapshot.grid);
    setCurrentColorId(undoSnapshot.currentColorId);
    setNextColorId(undoSnapshot.nextColorId);
    setScore(undoSnapshot.score);
    scoreRef.current = undoSnapshot.score;
    setUndoUsed(true);
    setUndoSnapshot(null);
    setPoppingCells(new Set());
    setGravityMs(0);
  }, [undoSnapshot, undoUsed]);

  // Проверка game over — всё поле заполнено (нет ни одной свободной ячейки)
  useEffect(() => {
    if (!gameOver) {
      const lastRowFull = grid.every((row) => row.every((cell) => cell !== null));
      if (lastRowFull) {
        saveScore(score);
        const updated = loadScores();
        setBestScore(updated[0]?.score ?? score);
        setGameOver(true);
      }
    }
  }, [grid, gameOver, score]);

  // Разблокировка новых цветов + расширение поля каждые 25 очков
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
        const withNewCol = prev.map((row) => [...row, null as Cell]);
        const newRow = Array(newCols).fill(null) as Cell[];
        return [...withNewCol, newRow];
      });
    }
    prevActiveLenRef.current = newLen;
  }, [score]);

  const restartGame = () => {
    const startIds = getActiveColorIds(0);
    const { cols, rows } = getGridSize(startIds.length);
    setGrid(emptyGrid(rows, cols));
    setGridCols(cols);
    setGridRows(rows);
    const firstColor = randColorIdFromActive(startIds);
    const secondColor = randColorIdFromActive(startIds, firstColor);
    setCurrentColorId(firstColor);
    setNextColorId(secondColor);
    setScore(0);
    scoreRef.current = 0;
    setPoppingCells(new Set());
    setGameOver(false);
    setLastPoints(null);
    setUndoSnapshot(null);
    setUndoUsed(false);
    prevActiveLenRef.current = startIds.length;
    lastTwoColorsRef.current = [];
  };

  const activeColorIds = getActiveColorIds(score);
  const undoUnlocked = score >= 50;
  const canUndo = undoUnlocked && !!undoSnapshot && !undoUsed;
  const showNextColor = score >= 75;

  return {
    grid,
    gridCols,
    gridRows,
    score,
    bestScore,
    scoreAnim,
    lastPoints,
    poppingCells,
    gravityMs,
    particles,
    gameOver,
    hoverCol,
    setHoverCol,
    litColorIds,
    newColorsNotice,
    currentColorId,
    nextColorId,
    activeColorIds,
    cellSize,
    handleColumnClick,
    handleUndo,
    canUndo,
    undoUnlocked,
    showNextColor,
    restartGame,
  };
}