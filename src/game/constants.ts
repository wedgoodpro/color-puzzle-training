// 12 основных цветов круга Итена (ids 0–11)
// Пары (через 6): 0↔6, 1↔7, 2↔8, 3↔9, 4↔10, 5↔11
// Тёмные оттенки (ids 12–23): тёмная версия каждого цвета, id = original + 12
// Тёмные пары: 12↔18, 13↔19, 14↔20, 15↔21, 16↔22, 17↔23
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
  // Тёмные оттенки (id = original + 12)
  { id: 12, name: "Тёмно-жёлтый",        hex: "#7A6820" },
  { id: 13, name: "Коричнево-золотой",    hex: "#7A5218" },
  { id: 14, name: "Коричневый",           hex: "#7A3E18" },
  { id: 15, name: "Тёмно-красный",        hex: "#6E2818" },
  { id: 16, name: "Бордовый",             hex: "#6E1A18" },
  { id: 17, name: "Тёмно-пурпурный",      hex: "#5A1838" },
  { id: 18, name: "Тёмно-фиолетовый",     hex: "#2E1A48" },
  { id: 19, name: "Тёмно-индиго",         hex: "#1A1E4A" },
  { id: 20, name: "Тёмно-синий",          hex: "#122C50" },
  { id: 21, name: "Тёмно-бирюзовый",      hex: "#104030" },
  { id: 22, name: "Тёмно-зелёный",        hex: "#103820" },
  { id: 23, name: "Оливковый",            hex: "#384818" },
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
export const POINTS_PAIR = 1;    // 2 цвета (пара)
export const POINTS_TRIAD = 5;   // 3 цвета (триада)
export const POINTS_TETRAD = 10; // 4 цвета (тетрада)

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

export const getGridSize = (score: number): { cols: number; rows: number } => {
  const extra = score >= 75 ? 1 : 0;
  return { cols: BASE_COLS + extra, rows: BASE_ROWS + extra };
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

export const POINTS_PAIR   = 2;
export const POINTS_TRIAD  = 3;
export const POINTS_TETRAD = 4;
export const BG = "#2A2A2A";
export const CELL_EMPTY = "#363636";
export const CELL_EMPTY_HOVER = "#404040";
export const WHEEL_COUNT = 12; // только основные цвета на колесе

export type Cell = { colorId: number; dropFrom?: number } | null;
export type Grid = Cell[][];

export interface FlyingTile {
  col: number;
  colorId: number;
  targetRow: number;
  progress: number;
  willMatch: boolean;     // летит в совпадение — подсветить свечением
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

// Уровни тёмных цветов: счёт убывает, первая пара при 350, далее каждые 25
// Порядок: оранжевый↔синий, жёлтый↔фиолетовый, красный↔зелёный, затем промежуточные
export const DARK_COLOR_LEVELS: { threshold: number; ids: number[] }[] = [
  { threshold: 375, ids: [2, 14, 8, 20]  },  // оранжевый + коричневый, синий + тёмно-синий
  { threshold: 350, ids: [0, 12, 6, 18]  },  // жёлтый + тёмно-жёлтый, фиолетовый + тёмно-фиолет
  { threshold: 325, ids: [4, 16, 10, 22] },  // красный + бордовый, зелёный + тёмно-зелёный
  { threshold: 300, ids: [1, 13, 7, 19]  },  // жёлто-оранж + коричн-золот, сине-фиолет + тёмно-индиго
  { threshold: 275, ids: [3, 15, 9, 21]  },  // красно-оранж + тёмно-красн, сине-зелён + тёмно-бирюз
  { threshold: 250, ids: [5, 17, 11, 23] },  // красно-фиолет + тёмно-пурп, жёлто-зелён + оливковый
];

// Тёмный цвет для id 0–11: id + 12. Основной для id 12–23: id - 12.
export const getDarkId = (id: number): number => id + 12;
export const getBaseId = (id: number): number => id % 12;
export const isDark = (id: number): boolean => id >= 12;

// Дополнение: тёмные дополняют тёмные (12↔18, аналогично 0↔6 со сдвигом +12)
export const getComplement = (id: number): number =>
  isDark(id) ? ((id - 12 + 6) % 12) + 12 : (id + 6) % 12;

// Все варианты противоположного: и светлый и тёмный
// Любой цвет (светлый или тёмный) бьёт оба варианта противоположного
export const getComplementIds = (id: number): number[] => {
  const base = getBaseId(id);
  const baseComplement = (base + 6) % 12;
  return [baseComplement, baseComplement + 12];
};

// Для тёмного цвета возвращаем те же триады что у оригинала, но с id+12
export const getTriad = (id: number): number[] | null => {
  const base = getBaseId(id);
  const t = TRIADS.find((tr) => tr.includes(base));
  if (!t) return null;
  return isDark(id) ? t.map((x) => x + 12) : t;
};

export const getTriadsForColor = (id: number): number[][] => {
  const base = getBaseId(id);
  const baseTriads = TRIADS.filter((t) => t.includes(base));
  if (!isDark(id)) return baseTriads;
  return baseTriads.map((t) => t.map((x) => x + 12));
};

export const getTetrad = (id: number): number[] | null => {
  const base = getBaseId(id);
  const t = TETRADS.find((te) => te.includes(base));
  if (!t) return null;
  return isDark(id) ? t.map((x) => x + 12) : t;
};

export const getTetradsForColor = (id: number): number[][] => {
  const base = getBaseId(id);
  const baseTetrads = TETRADS.filter((t) => t.includes(base));
  if (!isDark(id)) return baseTetrads;
  return baseTetrads.map((t) => t.map((x) => x + 12));
};

export const getActiveColorIds = (score: number, currentScore?: number): number[] => {
  const ids: number[] = [];
  for (const level of COLOR_LEVELS) {
    if (score >= level.threshold) ids.push(...level.ids);
  }
  return ids;
};

// Возвращает активные тёмные ids по текущему счёту
export const getActiveDarkIds = (score: number): number[] => {
  const ids: number[] = [];
  for (const level of DARK_COLOR_LEVELS) {
    if (score <= level.threshold) ids.push(...level.ids);
  }
  return ids;
};

// Возвращает активные цвета с учётом текущего счёта (светлые + тёмные)
export const getActiveColorIdsWithDark = (progress: number, score: number): number[] => {
  const base = getActiveColorIds(progress);
  const dark = getActiveDarkIds(score).filter((id) => {
    // Добавляем тёмный только если его светлый оригинал уже активен
    return base.includes(id - 12);
  });
  return dark.length > 0 ? [...base, ...dark] : base;
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