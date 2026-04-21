import ColorWheel from "@/game/ColorWheel";
import { ITTEN_COLORS, BOARD_W, POINTS_TRIAD, POINTS_TETRAD, getDarkId } from "@/game/constants";

interface WheelPanelProps {
  litColorIds: Set<number>;
  activeColorIds: number[];
  currentColorId: number;
  nextColorId: number;
  showNextColor: boolean;
  canUndo: boolean;
  undoUnlocked: boolean;
  onUndo: () => void;
  swapUnlocked: boolean;
  onSwap: () => void;
  score: number;
  comboScore: number;
  scoreAnim: boolean;
  lastPoints: number | null;
  boardPx?: number;
  darkColorsActive?: boolean;
}

export default function WheelPanel({
  litColorIds,
  activeColorIds,
  currentColorId,
  nextColorId,
  showNextColor,
  canUndo,
  undoUnlocked,
  onUndo,
  swapUnlocked,
  onSwap,
  score,
  comboScore,
  scoreAnim,
  lastPoints,
  boardPx = BOARD_W,
  darkColorsActive = false,
}: WheelPanelProps) {
  const scoreDisplay = String(score);
  const wheelSize = boardPx * 0.92;
  const R = wheelSize / 2 - 4;
  const innerR = R * 0.38;
  const sqSize = innerR * 0.85;
  const currentColor = ITTEN_COLORS[currentColorId];
  const nextColor = ITTEN_COLORS[nextColorId];
  // Смещение следующего квадрата — выглядывает снизу-справа
  const nextOffset = sqSize * 0.28;

  return (
    <div className="relative" style={{ width: boardPx, height: wheelSize }}>
      <div className="absolute" style={{ left: (boardPx - wheelSize) / 2, top: 0 }}>
        <ColorWheel litColorIds={litColorIds} activeColorIds={new Set(activeColorIds)} size={wheelSize} darkColorsActive={darkColorsActive} />

        {/* Следующий цвет — под основным, выглядывает снизу-справа */}
        {showNextColor && (
          <div
            className="absolute rounded-sm"
            onClick={swapUnlocked ? onSwap : undefined}
            style={{
              width: sqSize * 0.78,
              height: sqSize * 0.78,
              top: "50%",
              left: "50%",
              transform: `translate(calc(-50% + ${nextOffset}px), calc(-50% + ${nextOffset}px))`,
              backgroundColor: nextColor.hex,
              opacity: 0.75,
              transition: "background-color 0.25s ease, opacity 0.25s ease",
              cursor: swapUnlocked ? "pointer" : "default",
            }}
          />
        )}

        {/* Текущий цвет */}
        <div
          className="absolute rounded-sm"
          onClick={swapUnlocked ? onSwap : undefined}
          style={{
            width: sqSize,
            height: sqSize,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: currentColor.hex,
            transition: "background-color 0.25s ease",
            opacity: 1,
            cursor: swapUnlocked ? "pointer" : "default",
            outline: `3px solid #2A2A2A`,
            outlineOffset: "-1px",
          }}
        >
          {/* Иконка свапа */}
          {swapUnlocked && (
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: sqSize * 0.38,
                opacity: 0.22,
                color: "#fff",
                pointerEvents: "none",
                userSelect: "none",
                lineHeight: 1,
              }}
            >
              ↻
            </span>
          )}
        </div>
      </div>

      {/* Очки — левый верхний угол */}
      <div className="absolute" style={{ left: 0, top: 4 }}>
        <div
          className="font-mono font-medium leading-none relative"
          style={{
            fontSize: 24,
            color: "#ffffff",
            transform: scoreAnim ? "scale(1.2)" : "scale(1)",
            transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
            display: "inline-block",
          }}
        >
          {scoreDisplay}
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
              -{lastPoints}
            </span>
          )}
        </div>
        <div className="font-mono" style={{ color: "#555", fontSize: 9 }}>очки</div>
      </div>

      {/* Схемы — правый верхний угол */}
      <div className="absolute text-right" style={{ right: 0, top: 4 }}>
        <div className="font-mono font-medium leading-none" style={{ fontSize: 24, color: "#ffffff" }}>
          {comboScore}
        </div>
        <div className="font-mono" style={{ color: "#555", fontSize: 9 }}>схемы</div>
      </div>

      {/* Кнопка отмены — нижний правый угол, появляется при 50 очках */}
      {undoUnlocked && (
        <div className="absolute text-right" style={{ right: 0, bottom: 4 }}>
          <button
            onClick={canUndo ? onUndo : undefined}
            className="font-mono font-medium leading-none block w-full text-right"
            style={{
              fontSize: 28,
              color: canUndo ? "#fff" : "#3a3a3a",
              background: "none",
              border: "none",
              padding: 0,
              cursor: canUndo ? "pointer" : "default",
              lineHeight: 1,
              transition: "color 0.3s",
            }}
          >
            ↩
          </button>
          <div className="font-mono" style={{ color: canUndo ? "#666" : "#333", fontSize: 10, transition: "color 0.3s" }}>отмена</div>
        </div>
      )}
    </div>
  );
}