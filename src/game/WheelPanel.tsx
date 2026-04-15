import ColorWheel from "@/game/ColorWheel";
import { ITTEN_COLORS, BOARD_W, POINTS_TRIAD, POINTS_TETRAD } from "@/game/constants";

interface WheelPanelProps {
  litColorIds: Set<number>;
  activeColorIds: number[];
  currentColorId: number;
  score: number;
  bestScore: number;
  scoreAnim: boolean;
  lastPoints: number | null;
}

export default function WheelPanel({
  litColorIds,
  activeColorIds,
  currentColorId,
  score,
  bestScore,
  scoreAnim,
  lastPoints,
}: WheelPanelProps) {
  const wheelSize = BOARD_W * 0.92;
  const R = wheelSize / 2 - 4;
  const innerR = R * 0.38;
  const sqSize = innerR * 0.85;
  const currentColor = ITTEN_COLORS[currentColorId];

  return (
    <div className="relative" style={{ width: BOARD_W, height: wheelSize }}>
      <div className="absolute" style={{ left: (BOARD_W - wheelSize) / 2, top: 0 }}>
        <ColorWheel litColorIds={litColorIds} activeColorIds={new Set(activeColorIds)} size={wheelSize} />
        <div
          className="absolute rounded-sm"
          style={{
            width: sqSize,
            height: sqSize,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: currentColor.hex,
            transition: "background-color 0.25s ease, box-shadow 0.25s",
            boxShadow: `0 2px 16px ${currentColor.hex}99`,
          }}
        />
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
    </div>
  );
}
