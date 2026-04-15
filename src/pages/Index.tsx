import { useRef } from "react";
import GameBoard from "@/game/GameBoard";
import { GameOverModal } from "@/game/GameOverlay";
import { BG, GAP, ITTEN_COLORS } from "@/game/constants";
import WheelPanel from "@/game/WheelPanel";
import NewColorsOverlay from "@/game/NewColorsOverlay";
import { useGameState } from "@/game/useGameState";

export default function Index() {
  const boardRef = useRef<HTMLDivElement>(null);

  const {
    grid,
    gridCols,
    gridRows,
    score,
    bestScore,
    scoreAnim,
    lastPoints,
    flyingTile,
    poppingCells,
    particles,
    gameOver,
    hoverCol,
    setHoverCol,
    litColorIds,
    newColorsNotice,
    currentColorId,
    activeColorIds,
    cellSize,
    handleColumnClick,
    restartGame,
    getFlyingY,
  } = useGameState();

  // Вычисляем fixed-координаты летящего блока
  const getFlyingFixed = () => {
    if (!flyingTile || !boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = rect.left + flyingTile.col * (cellSize + GAP);
    const y = rect.top + getFlyingY(flyingTile);
    return { x, y };
  };
  const flyingFixed = getFlyingFixed();

  return (
    <div
      className="min-h-screen font-sans flex flex-col items-center select-none"
      style={{ backgroundColor: BG }}
    >
      <div className="w-full max-w-xl px-3 flex-1 flex flex-col items-center">
        <div className="flex flex-col items-center gap-4 w-full pt-1">

          <WheelPanel
            litColorIds={litColorIds}
            activeColorIds={activeColorIds}
            currentColorId={currentColorId}
            score={score}
            bestScore={bestScore}
            scoreAnim={scoreAnim}
            lastPoints={lastPoints}
          />

          <div className="relative">
            <GameBoard
              grid={grid}
              cols={gridCols}
              rows={gridRows}
              cellSize={cellSize}
              flyingTile={flyingTile}
              particles={particles}
              poppingCells={poppingCells}
              hoverCol={hoverCol}
              getFlyingY={getFlyingY}
              onColumnClick={handleColumnClick}
              onColumnHover={setHoverCol}
              boardRef={boardRef}
            />
            <NewColorsOverlay notice={newColorsNotice} />
          </div>

          {/* Летящий блок в fixed-позиции — виден поверх всего, анимируется от низа экрана */}
          {flyingTile && flyingFixed && (
            <div
              className="fixed rounded-sm pointer-events-none"
              style={{
                left: flyingFixed.x,
                top: flyingFixed.y,
                width: cellSize,
                height: cellSize,
                backgroundColor: ITTEN_COLORS[flyingTile.colorId].hex,
                boxShadow: `0 2px 20px ${ITTEN_COLORS[flyingTile.colorId].hex}88`,
                zIndex: 50,
              }}
            />
          )}

          <div className="flex flex-col items-center gap-6 w-full pb-2">
            <a
              href="https://vk.ru/fotoklubpro"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono tracking-widest uppercase w-full text-center"
              style={{ fontSize: 15, color: "#777", letterSpacing: "0.1em", textDecoration: "none" }}
            >
              хочешь научиться фотографировать?
            </a>
          </div>
        </div>
      </div>

      {gameOver && (
        <GameOverModal
          score={score}
          onRestart={restartGame}
        />
      )}

      <style>{`
        @keyframes float-up {
          0%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-40px); }
        }
        @keyframes fade-in-overlay {
          0%   { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}