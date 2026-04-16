// 12 цветов круга Итена
// Пары (через 6): 0↔6, 1↔7, 2↔8, 3↔9, 4↔10, 5↔11
export const ITTEN_COLORS = [
  { id: 0,  name: "Жёлтый",           hex: "#D4B84A" },
  { id: 1,  name: "Жёлто-оранжевый",  hex: "#C99240" },
  { id: 2,  name: "Оранжевый",        hex: "#C4733A" },
  { id: 3,  name: "Красно-оранжевый", hex: "#B8503A" },
  { id: 4,  name: "Красный",          hex: "#A83832" },
  { id: 5,  name: "Красно-фиолет.",   hex: "#8B3460" },
  { id: 6,  name: "Фиолетовый",       hex: "#5C3D7A" },
  { id: 7,  name: "Сине-фиолет.",     hex: "#3A3D7A" },
  { id: 8,  name: "Синий",            hex: "#2E6090" },
  { id: 9,  name: "Сине-зелёный",     hex: "#2E8070" },
  { id: 10, name: "Зелёный",          hex: "#2E7048" },
  { id: 11, name: "Жёлто-зелёный",    hex: "#6E8C3A" },
];

// Триады равносторонние (через 4): [0,4,8], [1,5,9], [2,6,10], [3,7,11]
// Триады острые (шаги 2+5 по кругу из 12) — 12 уникальных наборов
// Тетрады квадратные (шаг 3): [0,3,6,9], [1,4,7,10], [2,5,8,11]
// Тетрады прямоугольные (шаги 2+4): [0,2,6,8], [1,3,7,9], [2,4,8,10], [3,5,9,11], [4,6,10,0], [5,7,11,1]
export const TRIADS: number[][] = [
  // Равносторонние (шаг 4)
  [0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11],
  // Острые (шаги 2+5): 12 уникальных троек (каждая — уникальный набор)
  [0, 2, 7], [1, 3, 8], [2, 4, 9],  [3, 5, 10],
  [4, 6, 11],[5, 7, 0], [6, 8, 1],  [7, 9, 2],
  [8, 10, 3],[9, 11, 4],[10, 0, 5], [11, 1, 6],
];
export const TETRADS: number[][] = [
  // Квадратные (шаг 3)
  [0, 3, 6, 9], [1, 4, 7, 10], [2, 5, 8, 11],
  // Прямоугольные (шаги 2+4): охватывают все "несимметричные" квадраты на круге
  [0, 2, 6, 8], [1, 3, 7, 9], [2, 4, 8, 10],
  [3, 5, 9, 11], [4, 6, 10, 0], [5, 7, 11, 1],
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

// Старт 5×5, каждая новая пара +1 столбец и +1 строка
// 6 цветов → 5×5, 8 → 6×6, 10 → 7×7, 12 → 8×8
export const BASE_COLS = 5;
export const BASE_ROWS = 5;
export const BOARD_PX = 330;

export const getGridSize = (activeCount: number): { cols: number; rows: number } => {
  // Поле растёт только один раз: при 8 цветах (25 очков) → 6×6, дальше не растёт
  const extraPairs = Math.min(Math.floor((activeCount - 6) / 2), 1);
  return {
    cols: BASE_COLS + extraPairs,
    rows: BASE_ROWS + extraPairs,
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

export type Cell = { colorId: number; dropFrom?: number } | null;
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

// Тёплые: жёлтый, жёлто-оранж, оранж, красно-оранж, красный, красно-фиолет, жёлто-зелёный
// Холодные: фиолет, сине-фиолет, синий, сине-зелёный, зелёный
export const WARM_IDS = new Set([0, 1, 2, 3, 4, 5, 11]);
export const COOL_IDS = new Set([6, 7, 8, 9, 10]);

export const isWarm = (id: number): boolean => WARM_IDS.has(id);
export const isCool = (id: number): boolean => COOL_IDS.has(id);

export const randFromPool = (pool: number[]): number =>
  pool[Math.floor(Math.random() * pool.length)];

export const getComplement = (id: number): number => (id + 6) % 12;

export const getTriad = (id: number): number[] | null =>
  TRIADS.find((t) => t.includes(id)) ?? null;

export const getTriadsForColor = (id: number): number[][] =>
  TRIADS.filter((t) => t.includes(id));

export const getTetrad = (id: number): number[] | null =>
  TETRADS.find((t) => t.includes(id)) ?? null;

export const getTetradsForColor = (id: number): number[][] =>
  TETRADS.filter((t) => t.includes(id));

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

const COMBO_KEY = "colorist_best_combo_v1";
export const getBestCombo = (): number => {
  try { return parseInt(localStorage.getItem(COMBO_KEY) || "0", 10); } catch (e) { return 0; }
};
export const saveBestCombo = (combo: number) => {
  try {
    const prev = getBestCombo();
    if (combo > prev) localStorage.setItem(COMBO_KEY, String(combo));
  } catch (e) { /* ignore */ }
};

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const pluralScore = (n: number) => {
  if (n === 1) return "очко";
  if (n >= 2 && n <= 4) return "очка";
  return "очков";
};