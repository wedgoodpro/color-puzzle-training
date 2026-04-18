import { useState, useCallback, useRef, useEffect } from "react";
import {
  ITTEN_COLORS, COLOR_LEVELS, TRIADS, TETRADS,
  POINTS_PAIR, POINTS_TRIAD, POINTS_TETRAD,
  Cell, Grid, Particle, FlyingTile,
  getComplement, getTriad, getTriadsForColor, getTetrad, getTetradsForColor,
  getActiveColorIds, randColorIdFromActive, randFromPool,
  emptyGrid, loadScores, getBestScore, saveScore,
  getGridSize, getCellSize, GAP,
  getBestCombo, saveBestCombo,
} from "@/game/constants";

export function useGameState() {
  // Динамический размер поля — вписываемся в реальную ширину экрана (минус паддинги)
  const boardPx = Math.min(330, Math.floor(window.innerWidth - 24));

  const initialActiveIds = getActiveColorIds(0);
  const { cols: initCols, rows: initRows } = getGridSize(0);

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
  const [comboScore, setComboScore] = useState(0);
  const [currentColorId, setCurrentColorId] = useState<number>(() => randColorIdFromActive(initialActiveIds));
  const [nextColorId, setNextColorId] = useState<number>(() => randColorIdFromActive(initialActiveIds, randColorIdFromActive(initialActiveIds)));
  const [bestScore, setBestScore] = useState(getBestScore());
  const [bestCombo, setBestCombo] = useState(getBestCombo());
  const [scoreAnim, setScoreAnim] = useState(false);
  const [lastPoints, setLastPoints] = useState<number | null>(null);
  const [poppingCells, setPoppingCells] = useState<Set<string>>(new Set());
  const [pairPoppingCells, setPairPoppingCells] = useState<Set<string>>(new Set());
  const [litColorIds, setLitColorIds] = useState<Set<number>>(new Set());

  const [gravityMs, setGravityMs] = useState(0);
  const [flyingTile, setFlyingTile] = useState<FlyingTile | null>(null);
  const flyIdRef = useRef(0);
  const isBusyRef = useRef(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const [gameOver, setGameOver] = useState(false);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  const [reviewPending, setReviewPending] = useState(false);
  const reviewPendingRef = useRef(false);
  const [reviewCells, setReviewCells] = useState<Set<string>>(new Set());
  const reviewResolveRef = useRef<(() => void) | null>(null);
  const [newColorsNotice, setNewColorsNotice] = useState<{ names: string[]; ids: number[] } | null>(null);
  const prevActiveLenRef = useRef(initialActiveIds.length);
  const lastTwoColorsRef = useRef<number[]>([]);
  const colorFreqRef = useRef<Record<number, number>>({});
  // Undo: сохраняем snapshot до хода
  const [undoSnapshot, setUndoSnapshot] = useState<{ grid: Grid; currentColorId: number; nextColorId: number; score: number } | null>(null);
  const [undoUsed, setUndoUsed] = useState(false);

  const cellSize = Math.floor((boardPx - (gridCols - 1) * GAP) / gridCols);

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
    }, 400);
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

  // Проверяет что набор ячеек образует связную цепочку (каждая соседствует хотя бы с одной другой)
  // и каждый цвет из группы присутствует ровно один раз (без повторов)
  const isValidChain = (cells: [number, number][], g: Grid, groupColorIds: number[]): boolean => {
    if (cells.length !== groupColorIds.length) return false;
    // Все цвета уникальны и совпадают с группой
    const cellColors = cells.map(([r, c]) => g[r][c]!.colorId);
    const colorSet = new Set(cellColors);
    if (colorSet.size !== groupColorIds.length) return false;
    for (const id of groupColorIds) if (!colorSet.has(id)) return false;
    // Связность: граф из ячеек — все достижимы друг из друга через соседство
    const cellSet = new Set(cells.map(([r, c]) => `${r}-${c}`));
    const visited = new Set<string>();
    const queue: [number, number][] = [cells[0]];
    visited.add(`${cells[0][0]}-${cells[0][1]}`);
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      for (const [dr, dc] of dirs) {
        const key = `${r+dr}-${c+dc}`;
        if (cellSet.has(key) && !visited.has(key)) {
          visited.add(key);
          queue.push([r+dr, c+dc]);
        }
      }
    }
    return visited.size === cells.length;
  };

  // Ищет группу ячеек на поле: по одной ячейке каждого цвета из groupIds,
  // соседних друг с другом (цепочка без повторов цвета)
  const findGroupOnBoard = (g: Grid, rows: number, cols: number, groupIds: number[]): [number, number][] | null => {
    const groupSet = new Set(groupIds);

    // Собираем все ячейки каждого цвета группы
    const byColor = new Map<number, [number, number][]>();
    for (const id of groupIds) byColor.set(id, []);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = g[r][c];
        if (cell && groupSet.has(cell.colorId)) {
          byColor.get(cell.colorId)!.push([r, c]);
        }
      }
    }
    // Если хотя бы одного цвета нет — группы нет
    for (const id of groupIds) if (byColor.get(id)!.length === 0) return null;

    // Перебираем все комбинации (по одной ячейке каждого цвета) через DFS
    const result: [number, number][] = new Array(groupIds.length);
    const usedCells = new Set<string>();

    const dfs = (idx: number): boolean => {
      if (idx === groupIds.length) {
        return isValidChain(result, g, groupIds);
      }
      const colorId = groupIds[idx];
      for (const [r, c] of byColor.get(colorId)!) {
        const key = `${r}-${c}`;
        if (usedCells.has(key)) continue;
        result[idx] = [r, c];
        usedCells.add(key);
        if (dfs(idx + 1)) return true;
        usedCells.delete(key);
      }
      return false;
    };

    return dfs(0) ? [...result] : null;
  };

  // Возвращает очки за пару в зависимости от текущего счёта
  const getPairPoints = (currentScore: number): number => {
    if (currentScore >= 300) return 0.1;
    if (currentScore >= 200) return 0.5;
    return POINTS_PAIR;
  };

  // Чистая функция: ищет одно совпадение на всей доске (приоритет: тетрада > триада > пара)
  // Возвращает { cells, points } или null
  const findAnyMatch = (g: Grid, rows: number, cols: number): { cells: [number, number][]; points: number } | null => {
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    // Тетрады
    for (const tetrad of TETRADS) {
      const cells = findGroupOnBoard(g, rows, cols, tetrad);
      if (cells) return { cells, points: POINTS_TETRAD };
    }

    // Триады
    for (const triad of TRIADS) {
      const cells = findGroupOnBoard(g, rows, cols, triad);
      if (cells) return { cells, points: POINTS_TRIAD };
    }

    // Пары — прямые соседи комплементарных цветов
    const pairPts = getPairPoints(scoreRef.current);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (!g[row][col]) continue;
        const colorId = g[row][col]!.colorId;
        const complement = getComplement(colorId);
        const pairCells: [number, number][] = [];
        for (const [dr, dc] of dirs) {
          const nr = row + dr; const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc]?.colorId === complement) {
            pairCells.push([nr, nc]);
          }
        }
        if (pairCells.length > 0) {
          return { cells: [[row, col], ...pairCells] as [number, number][], points: pairPts * pairCells.length };
        }
      }
    }
    return null;
  };

  const checkAndPop = useCallback(
    (g: Grid, row: number, col: number, colorId: number, rows: number, cols: number, cs: number) => {
      let toRemove: [number, number][] = [];
      let points = 0;

      // Приоритет 1: тетрада — перебираем все тетрады в которые входит этот цвет
      const tetrads = getTetradsForColor(colorId);
      for (const tetrad of tetrads) {
        const cells = findGroupOnBoard(g, rows, cols, tetrad);
        if (cells && cells.some(([r, c]) => r === row && c === col)) {
          toRemove = cells;
          points = POINTS_TETRAD;
          break;
        }
      }

      // Приоритет 2: триада — проверяем все триады в которые входит этот цвет
      if (toRemove.length === 0) {
        const triads = getTriadsForColor(colorId);
        for (const triad of triads) {
          const cells = findGroupOnBoard(g, rows, cols, triad);
          if (cells && cells.some(([r, c]) => r === row && c === col)) {
            toRemove = cells;
            points = POINTS_TRIAD;
            break;
          }
        }
      }

      // Приоритет 3: пара — прямые соседи комплементарного цвета
      if (toRemove.length === 0) {
        const pairPts = getPairPoints(scoreRef.current);
        const complement = getComplement(colorId);
        const pairDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of pairDirs) {
          const nr = row + dr; const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc]?.colorId === complement) {
            if (toRemove.length === 0) toRemove.push([row, col]);
            toRemove.push([nr, nc]);
            points += pairPts;
          }
        }
      }

      if (toRemove.length === 0) { isBusyRef.current = false; return; }

      const dedup = (arr: [number, number][]) => {
        const seen = new Set<string>();
        return arr.filter(([r, c]) => { const k = `${r}-${c}`; if (seen.has(k)) return false; seen.add(k); return true; });
      };
      toRemove = dedup(toRemove);

      // Пара: pop-pair анимация 350ms. Триада/тетрада: пауза для тапа
      const getTimings = (pts: number) => {
        if (pts >= POINTS_TETRAD) return { popDelay: 750, gravMs: 600 };
        if (pts >= POINTS_TRIAD)  return { popDelay: 600, gravMs: 480 };
        return                           { popDelay: 180, gravMs: 360 };
      };

      // Запускаем каскад: анимация → (пауза для триады/тетрады) → удаление → гравитация → повтор
      const runCascade = (currentGrid: Grid, removeCells: [number, number][], pts: number) => {
        const { popDelay, gravMs } = getTimings(pts);
        const isTriadOrTetrad = pts >= POINTS_TRIAD;

        if (isTriadOrTetrad) {
          setPoppingCells(new Set(removeCells.map(([r, c]) => `${r}-${c}`)));
        } else {
          setPairPoppingCells(new Set(removeCells.map(([r, c]) => `${r}-${c}`)));
        }
        spawnParticles(removeCells, currentGrid, cs);
        const removedColors = new Set(removeCells.map(([r, c]) => currentGrid[r][c]!.colorId));
        setLitColorIds(removedColors);
        const proceed = () => {
          reviewPendingRef.current = false;
          setReviewPending(false);
          setReviewCells(new Set());
          reviewResolveRef.current = null;
          setLitColorIds(new Set());

          // Удаляем совпавшие ячейки
          const afterRemove = currentGrid.map((r) => [...r]) as Grid;
          removeCells.forEach(([r, c]) => { afterRemove[r][c] = null; });
          setPoppingCells(new Set());
          setPairPoppingCells(new Set());

          // Применяем гравитацию и считаем dropFrom для каждой сдвинувшейся ячейки
          const afterGravity = applyGravity(afterRemove, rows, cols);
          const cs2 = getCellSize(cols);
          for (let c = 0; c < cols; c++) {
            const oldPositions: number[] = [];
            for (let r = 0; r < rows; r++) {
              if (afterRemove[r][c] !== null) oldPositions.push(r);
            }
            let newIdx = 0;
            for (let r = 0; r < rows; r++) {
              if (afterGravity[r][c] !== null) {
                const oldR = oldPositions[newIdx];
                if (oldR !== undefined && oldR !== r) {
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
          triggerScoreAnim(pts);

          setTimeout(() => {
            const cleanGrid = afterGravity.map((r) =>
              r.map((cell) => cell ? { colorId: cell.colorId } : null)
            ) as Grid;
            setGrid((prev) => {
              const curRows = prev.length;
              const curCols = prev[0]?.length ?? cols;
              if (curRows === rows && curCols === cols) return cleanGrid;
              return prev.map((row, ri) =>
                row.map((cell, ci) =>
                  ri < rows && ci < cols ? (cleanGrid[ri]?.[ci] ?? null) : cell
                )
              ) as Grid;
            });
            // Начисляем очки после гравитации — useEffect расширения сетки сработает здесь
            setScore((s) => {
              const newScore = s + pts;
              scoreRef.current = newScore;
              return newScore;
            });
            // Комбо-счётчик: +1 за каждую триаду или тетраду
            if (pts >= POINTS_TRIAD) {
              setComboScore((c) => {
                const next = c + 1;
                saveBestCombo(next);
                setBestCombo(getBestCombo());
                return next;
              });
            }
            const actualRows = gridRef.current.length;
            const actualCols = gridRef.current[0]?.length ?? cols;
            const nextMatch = findAnyMatch(cleanGrid, Math.min(rows, actualRows), Math.min(cols, actualCols));
            if (nextMatch) {
              runCascade(cleanGrid, nextMatch.cells, nextMatch.points);
            } else {
              setGravityMs(0);
              setGameOver(cleanGrid.every((r) => r.every((c) => c !== null)));
              isBusyRef.current = false;
            }
          }, gravMs + 50);
        };

        if (isTriadOrTetrad) {
          // Пауза — ждём тапа пользователя
          const cellKeys = new Set(removeCells.map(([r, c]) => `${r}-${c}`));
          setReviewCells(cellKeys);
          reviewPendingRef.current = true;
          setReviewPending(true);
          reviewResolveRef.current = proceed;
        } else {
          // Пара: pop сразу, удаление через popDelay
          setTimeout(() => setLitColorIds(new Set()), gravMs + popDelay);
          setTimeout(proceed, popDelay);
        }
      };

      runCascade(g, toRemove, points);
    },
    [spawnParticles]
  );

  const handleColumnClick = useCallback(
    (col: number) => {
      if (gameOver || newColorsNotice || isBusyRef.current) return;
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

      // Вычисляем финальную строку после гравитации ДО запуска анимации
      currentGrid[targetRow][col] = { colorId };
      const afterGravity = applyGravity(currentGrid, rows, cols);
      let filledCount = 0;
      for (let r = 0; r < rows; r++) {
        if (afterGravity[r][col] !== null) filledCount++;
      }
      const newRow = filledCount - 1;

      // Предсказываем совпадение — подсвечиваем колесо сразу во время полёта
      const previewGrid = afterGravity.map((r) =>
        r.map((cell) => cell ? { colorId: cell.colorId } : null)
      ) as Grid;
      const previewColors = (() => {
        for (const tetrad of getTetradsForColor(colorId)) {
          const cells = findGroupOnBoard(previewGrid, rows, cols, tetrad);
          if (cells?.some(([r, c]) => r === newRow && c === col))
            return { colors: new Set(cells.map(([r, c]) => previewGrid[r][c]!.colorId)), isPair: false, cells: null };
        }
        for (const triad of getTriadsForColor(colorId)) {
          const cells = findGroupOnBoard(previewGrid, rows, cols, triad);
          if (cells?.some(([r, c]) => r === newRow && c === col))
            return { colors: new Set(cells.map(([r, c]) => previewGrid[r][c]!.colorId)), isPair: false, cells: null };
        }
        const complement = getComplement(colorId);
        for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]] as [number,number][]) {
          const nr = newRow + dr; const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && previewGrid[nr][nc]?.colorId === complement)
            return { colors: new Set([colorId, complement]), isPair: true, cells: [[newRow, col], [nr, nc]] as [number,number][] };
        }
        return null;
      })();
      if (previewColors) setLitColorIds(previewColors.colors);

      // Летящий кубик анимируется до финальной позиции (после гравитации)
      const FLY_MS = 300;
      flyIdRef.current += 1;
      isBusyRef.current = true;
      setFlyingTile({ col, colorId, targetRow: newRow, progress: flyIdRef.current, willMatch: false });

      setTimeout(() => {
        setFlyingTile(null);
        const cleanGrid = afterGravity.map((r) =>
          r.map((cell) => cell ? { colorId: cell.colorId } : null)
        ) as Grid;
        setGrid(cleanGrid);
        checkAndPop(cleanGrid, newRow, col, colorId, rows, cols, cs);
      }, FLY_MS);

      // Следующий цвет становится текущим, генерируем новый следующий
      // Обновляем историю последних 2 и счётчик частот
      const last2 = [...lastTwoColorsRef.current, colorId].slice(-2);
      lastTwoColorsRef.current = last2;
      colorFreqRef.current[colorId] = (colorFreqRef.current[colorId] ?? 0) + 1;

      const pickNextId = (activeIds: number[], hardExclude: number[]): number => {
        const hardSet = new Set(hardExclude);
        // Если цвет выпал 2 раза подряд — жёсткий запрет
        const twoInRow = last2.length === 2 && last2[0] === last2[1];
        const mustExclude = new Set(hardSet);
        if (twoInRow) mustExclude.add(last2[0]);

        const freq = colorFreqRef.current;
        const total = Object.values(freq).reduce((a, b) => a + b, 0) + 1;

        // Мягкий баланс: взвешенный выбор — редкие цвета получают больший вес
        const candidates = activeIds.filter((id) => !mustExclude.has(id));
        const pool = candidates.length > 0 ? candidates : activeIds.filter((id) => !hardSet.has(id));
        const finalPool = pool.length > 0 ? pool : activeIds;

        const weights = finalPool.map((id) => {
          const f = (freq[id] ?? 0) / total;
          return Math.max(0.1, 1 - f * activeIds.length);
        });
        const totalW = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * totalW;
        for (let i = 0; i < finalPool.length; i++) {
          r -= weights[i];
          if (r <= 0) return finalPool[i];
        }
        return finalPool[finalPool.length - 1];
      };

      const safeNextColorId = nextColorId;
      const newNextId = pickNextId(activeColorIds, [colorId, safeNextColorId]);

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
    setFlyingTile(null);
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
        // Показываем уведомление о новых цветах после небольшой задержки
        // чтобы не конфликтовать с текущей анимацией/паузой
        const noticeDelay = reviewPendingRef.current ? 500 : 0;
        setTimeout(() => {
          setNewColorsNotice({ names, ids: added.ids });
          setLitColorIds(new Set(added.ids));
          setTimeout(() => {
            setNewColorsNotice(null);
            setLitColorIds(new Set());
          }, 4000);
        }, noticeDelay);
      }

      // Расширяем поле только если размер реально изменился
      const { cols: newCols, rows: newRows } = getGridSize(score);
      const prevCols = gridColsRef.current;
      const prevRows = gridRowsRef.current;
      if (newCols !== prevCols || newRows !== prevRows) {
        setGridCols(newCols);
        setGridRows(newRows);
        setGrid((prev) => {
          const colDiff = newCols - (prev[0]?.length ?? prevCols);
          const rowDiff = newRows - prev.length;
          // Добавляем столбцы к существующим строкам
          let next = prev.map((row) => {
            const r = [...row];
            for (let i = 0; i < colDiff; i++) r.push(null as Cell);
            return r;
          });
          // Добавляем новые строки
          for (let i = 0; i < rowDiff; i++) {
            next = [...next, Array(newCols).fill(null) as Cell[]];
          }
          return next;
        });
      }
    }
    prevActiveLenRef.current = newLen;
  }, [score]);

  const restartGame = () => {
    const startIds = getActiveColorIds(0);
    const { cols, rows } = getGridSize(0);
    setGrid(emptyGrid(rows, cols));
    setGridCols(cols);
    setGridRows(rows);
    const firstColor = randColorIdFromActive(startIds);
    const secondColor = randColorIdFromActive(startIds, firstColor);
    setCurrentColorId(firstColor);
    setNextColorId(secondColor);
    setScore(0);
    scoreRef.current = 0;
    setComboScore(0);
    setPoppingCells(new Set());
    setPairPoppingCells(new Set());
    isBusyRef.current = false;
    setGameOver(false);
    setLastPoints(null);
    setUndoSnapshot(null);
    setUndoUsed(false);
    prevActiveLenRef.current = startIds.length;
    lastTwoColorsRef.current = [];
    colorFreqRef.current = {};
    setFlyingTile(null);
  };

  const activeColorIds = getActiveColorIds(score);
  const undoUnlocked = score >= 50;
  const canUndo = undoUnlocked && !!undoSnapshot && !undoUsed;
  const showNextColor = score >= 75;
  const swapUnlocked = score >= 100;

  const handleSwap = useCallback(() => {
    if (!swapUnlocked || gameOver || newColorsNotice) return;
    setCurrentColorId(nextColorId);
    setNextColorId(currentColorId);
  }, [swapUnlocked, gameOver, newColorsNotice, currentColorId, nextColorId]);

  // Тап для продолжения после паузы-ревью
  const handleReviewTap = useCallback(() => {
    if (reviewResolveRef.current) {
      reviewResolveRef.current();
    }
  }, []);

  return {
    grid,
    gridCols,
    gridRows,
    score,
    comboScore,
    bestScore,
    bestCombo,
    scoreAnim,
    lastPoints,
    poppingCells,
    pairPoppingCells,
    litColorIds,
    gravityMs,
    flyingTile,
    particles,
    gameOver,
    hoverCol,
    setHoverCol,

    newColorsNotice,
    currentColorId,
    nextColorId,
    activeColorIds,
    cellSize,
    boardPx,
    handleColumnClick,
    handleUndo,
    canUndo,
    undoUnlocked,
    showNextColor,
    swapUnlocked,
    handleSwap,
    restartGame,
    reviewPending,
    reviewCells,
    handleReviewTap,
  };
}