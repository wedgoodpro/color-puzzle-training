// 12 цветов круга Итена
// Пары (через 6): 0↔6, 1↔7, 2↔8, 3↔9, 4↔10, 5↔11
export const ITTEN_COLORS = [
  { id: 0,  name: "Жёлтый",           hex: "#F9E01B" },
  { id: 1,  name: "Жёлто-оранжевый",  hex: "#FDB827" },
  { id: 2,  name: "Оранжевый",        hex: "#F7941D" },
  { id: 3,  name: "Красно-оранжевый", hex: "#F05A23" },
  { id: 4,  name: "Красный",          hex: "#E8231A" },
  { id: 5,  name: "Красно-фиолет.",   hex: "#A6195A" },
  { id: 6,  name: "Фиолетовый",       hex: "#662D91" },
  { id: 7,  name: "Сине-фиолет.",     hex: "#2E3192" },
  { id: 8,  name: "Синий",            hex: "#0072BC" },
  { id: 9,  name: "Сине-зелёный",     hex: "#00A99D" },
  { id: 10, name: "Зелёный",          hex: "#009444" },
  { id: 11, name: "Жёлто-зелёный",    hex: "#8DC63F" },
];

// Триады (через 4): [0,4,8], [1,5,9], [2,6,10], [3,7,11]
// Тетрады (через 3): [0,3,6,9], [1,4,7,10], [2,5,8,11]
export const TRIADS: number[][] = [
  [0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11],
];
export const TETRADS: number[][] = [
  [0, 3, 6, 9], [1, 4, 7, 10], [2, 5, 8, 11],
];

// Очки за сочетание
export const POINTS_PAIR = 1;   // 2 цвета (пара)
export const POINTS_TRIAD = 4;  // 3 цвета (триада)
export const POINTS_TETRAD = 6; // 4 цвета (тетрада)

// Прогрессия: стартуем с 6 цветов (3 пары), каждые 25 очков +1 пара
// Пары добавляются по порядку: 0↔6, 1↔7, 2↔8, 3↔9, 4↔10, 5↔11
// Стартовые 3 пары: 0,6 / 2,8 / 4,10  (чётные = основные)
// Далее: 1,7 / 3,9 / 5,11
export const COLOR_LEVELS: { threshold: number; ids: number[] }[] = [
  { threshold: 0,   ids: [0, 6, 2, 8, 4, 10] }, // старт: 6 цветов (3 пары)
  { threshold: 25,  ids: [1, 7] },               // +1 пара при 25 очках
  { threshold: 50,  ids: [3, 9] },               // +1 пара при 50 очках
  { threshold: 75,  ids: [5, 11] },              // +1 пара при 75 очках
  // далее 12 цветов — максимум
];

// Стартовый размер поля: 6 цветов → 5x5
// Каждая новая пара: +1 столбец и +1 строка
// 6 цветов (0 пар добавлено) → 5 cols, 5 rows
// 8 цветов (1 пара) → 6 cols, 6 rows
// 10 цветов (2 пары) → 7 cols, 7 rows
// 12 цветов (3 пары) → 8 cols, 8 rows
export const BASE_COLS = 5;
export const BASE_ROWS = 5;
export const BOARD_PX = 330; // фиксированный размер поля в пикселях

export const getGridSize = (activeCount: number): { cols: number; rows: number } => {
  const pairs = Math.floor((activeCount - 6) / 2);
  return {
    cols: BASE_COLS + pairs,
    rows: BASE_ROWS + pairs,
  };
};

export const getCellSize = (cols: number): number => {
  const gap = 4;
  return Math.floor((BOARD_PX - (cols - 1) * gap) / cols);
};

// Обратная совместимость — динамические значения через функции
export const COLS = BASE_COLS;
export const ROWS = BASE_ROWS;
export const GAP = 4;
export const CELL_SIZE = getCellSize(BASE_COLS);
export const BOARD_W = BOARD_PX;
export const BOARD_H = BOARD_PX;

export const ANIM_DURATION = 400;
export const STORAGE_KEY = "colorist_scores_v4";
export const BG = "#2A2A2A";
export const CELL_EMPTY = "#363636";
export const CELL_EMPTY_HOVER = "#404040";
export const WHEEL_COUNT = ITTEN_COLORS.length;

export type Cell = { colorId: number } | null;
export type Grid = Cell[][];

export interface FlyingTile {
  col: number;
  colorId: number;
  targetRow: number;
  progress: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  angle: number;
  dist: number;
}

export interface ScoreEntry {
  score: number;
  date: string;
}

export const getComplement = (id: number): number => (id + 6) % 12;

export const getTriad = (id: number): number[] | null =>
  TRIADS.find((t) => t.includes(id)) ?? null;

export const getTetrad = (id: number): number[] | null =>
  TETRADS.find((t) => t.includes(id)) ?? null;

export const getActiveColorIds = (score: number): number[] => {
  const ids: number[] = [];
  for (const level of COLOR_LEVELS) {
    if (score >= level.threshold) ids.push(...level.ids);
  }
  return ids;
};

export const randColorIdFromActive = (activeIds: number[], exclude?: number) => {
  const pool = activeIds.length > 1 && exclude !== undefined
    ? activeIds.filter((id) => id !== exclude)
    : activeIds;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const emptyGrid = (rows: number, cols: number): Grid =>
  Array.from({ length: rows }, () => Array(cols).fill(null));

export const loadScores = (): ScoreEntry[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

export const getBestScore = (): number => {
  const s = loadScores();
  return s.length > 0 ? s[0].score : 0;
};

export const saveScore = (score: number) => {
  const scores = loadScores();
  scores.push({ score, date: new Date().toLocaleDateString("ru-RU") });
  scores.sort((a, b) => b.score - a.score);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores.slice(0, 10)));
};

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const pluralScore = (n: number) => {
  if (n === 1) return "очко";
  if (n >= 2 && n <= 4) return "очка";
  return "очков";
};
