const vib = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const hapticDrop = () => vib(18);
export const hapticPair = () => vib(30);
export const hapticTriad = () => vib([40, 30, 40]);
export const hapticTetrad = () => vib([50, 30, 50, 30, 50]);
