import ColorWheel from "@/game/ColorWheel";
import { ITTEN_COLORS, BOARD_W, POINTS_TRIAD, POINTS_TETRAD } from "@/game/constants";

interface WheelPanelProps {
  litColorIds: Set<number>;
  activeColorIds: number[];
  currentColorId: number;
  nextColorId: number;
  showNextColor: boolean;
  canUndo: boolean;
  undoUnlocked: boolean;
  onUndo: () => void;
  score: number;
  bestScore: number;
  scoreAnim: boolean;
  lastPoints: number | null;
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
  score,
  bestScore,
  scoreAnim,
  lastPoints,
}: WheelPanelProps) {
  const wheelSize = BOARD_W * 0.92;
  const R = wheelSize / 2 - 4;
  const innerR = R * 0.38;
  const sqSize = innerR * 0.85;
  const nextSqSize = sqSize * 0.42;
  const currentColor = ITTEN_COLORS[currentColorId];
  const nextColor = ITTEN_COLORS[nextColorId];

  return (
    <div className="relative" style={{ width: BOARD_W, height: wheelSize }}>
      <div className="absolute" style={{ left: (BOARD_W - wheelSize) / 2, top: 0 }}>
        <ColorWheel litColorIds={litColorIds} activeColorIds={new Set(activeColorIds)} size={wheelSize} />

        {/* Текущий цвет */}
        <div
          className="absolute rounded-sm"
          style={{
            width: sqSize,
            height: sqSize,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: currentColor.hex,
            transition: "background-color 0.25s ease, box-shadow 0.25s, opacity 0.25s ease",
            boxShadow: `0 2px 16px ${currentColor.hex}99`,
            opacity: litColorIds.size > 0 ? 0 : 1,
          }}
        />

        {/* Следующий цвет — маленький квадратик справа от текущего */}
        {showNextColor && (
          <div
            className="absolute rounded-sm"
            style={{
              width: nextSqSize,
              height: nextSqSize,
              top: "50%",
              left: "50%",
              transform: `translate(calc(-50% + ${sqSize * 0.72}px), calc(-50% - ${sqSize * 0.52}px))`,
              backgroundColor: nextColor.hex,
              boxShadow: `0 1px 8px ${nextColor.hex}88`,
              opacity: litColorIds.size > 0 ? 0 : 1,
              transition: "background-color 0.25s ease, opacity 0.25s ease",
            }}
          />
        )}
      </div>

      {/* Очки — левый верхний угол */}
      <div className="absolute" style={{ left: 0, top: 4 }}>
        <div
          className="font-mono font-medium text-white leading-none relative"
          style={{
            fontSize: 24,
            transform: scoreAnim ? "scale(1.2)" : "scale(1)",
            transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
            display: "inline-block",
          }}
        >
          {score}
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
              +{lastPoints}
            </span>
          )}
        </div>
        <div className="font-mono" style={{ color: "#555", fontSize: 10 }}>очки</div>
      </div>

      {/* Рекорд — правый верхний угол */}
      <div className="absolute text-right" style={{ right: 0, top: 4 }}>
        <div className="font-mono font-medium leading-none" style={{ fontSize: 24, color: "#4a4a4a" }}>
          {bestScore}
        </div>
        <div className="font-mono" style={{ color: "#555", fontSize: 10 }}>рекорд</div>
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