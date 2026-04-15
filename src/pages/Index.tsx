import GameBoard from "@/game/GameBoard";
import { GameOverModal } from "@/game/GameOverlay";
import { BG } from "@/game/constants";
import WheelPanel from "@/game/WheelPanel";
import NewColorsOverlay from "@/game/NewColorsOverlay";
import { useGameState } from "@/game/useGameState";

export default function Index() {
  const {
    grid,
    gridCols,
    gridRows,
    score,
    bestScore,
    scoreAnim,
    lastPoints,
    poppingCells,
    gravityMs,
    particles,
    gameOver,
    hoverCol,
    setHoverCol,
    litColorIds,
    newColorsNotice,
    currentColorId,
    nextColorId,
    activeColorIds,
    cellSize,
    handleColumnClick,
    handleUndo,
    canUndo,
    undoUnlocked,
    showNextColor,
    restartGame,
    hintActive,
    hintColorIds,
    setHintActive,
  } = useGameState();

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
            nextColorId={nextColorId}
            showNextColor={showNextColor}
            canUndo={canUndo}
            undoUnlocked={undoUnlocked}
            onUndo={handleUndo}
            score={score}
            bestScore={bestScore}
            scoreAnim={scoreAnim}
            lastPoints={lastPoints}
            hintActive={hintActive}
            hintColorIds={hintColorIds}
            onHintStart={() => setHintActive(true)}
            onHintEnd={() => setHintActive(false)}
          />

          <div className="relative">
            <GameBoard
              grid={grid}
              cols={gridCols}
              rows={gridRows}
              cellSize={cellSize}
              flyingTile={null}
              particles={particles}
              poppingCells={poppingCells}
              gravityMs={gravityMs}
              hoverCol={hoverCol}
              highlightColorIds={hintActive ? hintColorIds : undefined}
              getFlyingY={() => 0}
              onColumnClick={handleColumnClick}
              onColumnHover={setHoverCol}
            />
            <NewColorsOverlay notice={newColorsNotice} />
          </div>

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
        @keyframes slideUp {
          0%   { transform: translateY(var(--drop, 0px)); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}