import { BG, ITTEN_COLORS, WHEEL_COUNT, isDark, getDarkId } from "./constants";

interface ColorWheelProps {
  litColorIds: Set<number>;
  activeColorIds: Set<number>;
  size: number;
  darkColorsActive?: boolean;
}

export default function ColorWheel({ litColorIds, activeColorIds, size, darkColorsActive = false }: ColorWheelProps) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 4;
  const r = R * 0.38;
  // Когда тёмные активны — делим кольцо на внутр (светлый) и внешн (тёмный)
  const rMid = darkColorsActive ? r + (R - r) * 0.5 : r;

  const baseColors = ITTEN_COLORS.slice(0, 12);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {baseColors.map((color, idx) => {
        const angleDeg = (360 / WHEEL_COUNT) * idx - 90;
        const rad = (angleDeg * Math.PI) / 180;
        const segAngle = (2 * Math.PI) / WHEEL_COUNT;

        const startRad = rad - segAngle / 2;
        const endRad = rad + segAngle / 2;

        // Внутреннее кольцо (светлый цвет): от r до rMid
        const x1oI = cx + rMid * Math.cos(startRad);
        const y1oI = cy + rMid * Math.sin(startRad);
        const x2oI = cx + rMid * Math.cos(endRad);
        const y2oI = cy + rMid * Math.sin(endRad);
        const x1iI = cx + r * Math.cos(startRad);
        const y1iI = cy + r * Math.sin(startRad);
        const x2iI = cx + r * Math.cos(endRad);
        const y2iI = cy + r * Math.sin(endRad);

        const dInner = [
          `M ${x1iI} ${y1iI}`,
          `L ${x1oI} ${y1oI}`,
          `L ${x2oI} ${y2oI}`,
          `L ${x2iI} ${y2iI}`,
          `A ${r} ${r} 0 0 0 ${x1iI} ${y1iI}`,
          "Z",
        ].join(" ");

        // Внешнее кольцо (тёмный цвет): от rMid до R
        const x1oO = cx + R * Math.cos(startRad);
        const y1oO = cy + R * Math.sin(startRad);
        const x2oO = cx + R * Math.cos(endRad);
        const y2oO = cy + R * Math.sin(endRad);
        const x1iO = cx + rMid * Math.cos(startRad);
        const y1iO = cy + rMid * Math.sin(startRad);
        const x2iO = cx + rMid * Math.cos(endRad);
        const y2iO = cy + rMid * Math.sin(endRad);

        const dOuter = [
          `M ${x1iO} ${y1iO}`,
          `L ${x1oO} ${y1oO}`,
          `A ${R} ${R} 0 0 1 ${x2oO} ${y2oO}`,
          `L ${x2iO} ${y2iO}`,
          `L ${x1iO} ${y1iO}`,
          "Z",
        ].join(" ");

        const darkId = getDarkId(color.id);
        const darkColor = ITTEN_COLORS[darkId];

        const isLitBase = litColorIds.has(color.id);
        const isLitDark = litColorIds.has(darkId);
        const isActiveBase = activeColorIds.has(color.id);
        const isActiveDark = activeColorIds.has(darkId);
        const hasFocus = litColorIds.size > 0;

        const opacityBase = !isActiveBase ? 0.07 : hasFocus ? (isLitBase ? 1 : 0.2) : 0.85;
        const opacityDark = !isActiveDark ? 0.07 : hasFocus ? (isLitDark ? 1 : 0.2) : 0.85;

        if (!darkColorsActive) {
          // Режим без тёмных — рисуем одно кольцо (от r до R) как раньше
          const x1o = cx + R * Math.cos(startRad);
          const y1o = cy + R * Math.sin(startRad);
          const x2o = cx + R * Math.cos(endRad);
          const y2o = cy + R * Math.sin(endRad);
          const x1i = cx + r * Math.cos(startRad);
          const y1i = cy + r * Math.sin(startRad);
          const x2i = cx + r * Math.cos(endRad);
          const y2i = cy + r * Math.sin(endRad);

          const d = [
            `M ${x1i} ${y1i}`,
            `L ${x1o} ${y1o}`,
            `A ${R} ${R} 0 0 1 ${x2o} ${y2o}`,
            `L ${x2i} ${y2i}`,
            `A ${r} ${r} 0 0 0 ${x1i} ${y1i}`,
            "Z",
          ].join(" ");

          return (
            <path
              key={color.id}
              d={d}
              fill={color.hex}
              opacity={opacityBase}
              stroke={BG}
              strokeWidth={1.5}
              style={{
                transition: "opacity 0.25s ease, filter 0.25s ease",
                filter: isLitBase ? `drop-shadow(0 0 10px ${color.hex})` : undefined,
              }}
            />
          );
        }

        // Режим с тёмными — два кольца
        return (
          <g key={color.id}>
            {/* Внутренняя половина — светлый оригинальный цвет */}
            <path
              d={dInner}
              fill={color.hex}
              opacity={opacityBase}
              stroke={BG}
              strokeWidth={1}
              style={{
                transition: "opacity 0.25s ease, filter 0.25s ease",
                filter: isLitBase ? `drop-shadow(0 0 8px ${color.hex})` : undefined,
              }}
            />
            {/* Внешняя половина — тёмный оттенок */}
            <path
              d={dOuter}
              fill={darkColor.hex}
              opacity={opacityDark}
              stroke={BG}
              strokeWidth={1}
              style={{
                transition: "opacity 0.25s ease, filter 0.25s ease",
                filter: isLitDark ? `drop-shadow(0 0 8px ${darkColor.hex})` : undefined,
              }}
            />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill={BG} />
    </svg>
  );
}