import { useState } from "react";
import GameBoard from "@/game/GameBoard";
import { GameOverModal, WinModal } from "@/game/GameOverlay";
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
    comboScore,
    scoreAnim,
    lastPoints,
    poppingCells,
    pairPoppingCells,
    gravityMs,
    flyingTile,
    particles,
    gameOver,
    isWin,
    hoverCol,
    setHoverCol,
    litColorIds,
    newColorsNotice,
    currentColorId,
    nextColorId,
    activeColorIds,
    cellSize,
    boardPx,
    handleColumnClick,
    handleUndo,
    canUndo,
    undoUnlocked,
    showNextColor,
    swapUnlocked,
    handleSwap,
    restartGame,
    reviewPending,
    reviewCells,
    handleReviewTap,
    elapsedSeconds,
    darkColorsActive,
  } = useGameState();

  const [copied, setCopied] = useState(false);
  const shareUrl = "https://fotovuz.ru/igra-kolorist";

  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="min-h-screen font-sans flex flex-col items-center select-none"
      style={{ backgroundColor: BG }}
    >
      <div className="w-full max-w-xl px-3 flex-1 flex flex-col items-center">
        <div className="flex flex-col items-center gap-4 w-full pt-4">

          <WheelPanel
            litColorIds={litColorIds}
            activeColorIds={activeColorIds}
            currentColorId={currentColorId}
            nextColorId={nextColorId}
            showNextColor={showNextColor}
            canUndo={canUndo}
            undoUnlocked={undoUnlocked}
            onUndo={handleUndo}
            swapUnlocked={swapUnlocked}
            onSwap={handleSwap}
            score={score}
            comboScore={comboScore}
            scoreAnim={scoreAnim}
            lastPoints={lastPoints}
            boardPx={boardPx}
            darkColorsActive={darkColorsActive}
          />

          <div className="relative">
            <GameBoard
              grid={grid}
              cols={gridCols}
              rows={gridRows}
              cellSize={cellSize}
              boardPx={boardPx}
              flyingTile={flyingTile}
              particles={particles}
              poppingCells={poppingCells}
              pairPoppingCells={pairPoppingCells}
              gravityMs={gravityMs}
              hoverCol={hoverCol}
              reviewCells={reviewCells}
              getFlyingY={() => 0}
              onColumnClick={handleColumnClick}
              onColumnHover={setHoverCol}
            />
            <NewColorsOverlay notice={newColorsNotice} />
          </div>

          <a
            href="https://vk.ru/fotoklubpro"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono uppercase text-center"
            style={{
              width: boardPx,
              fontSize: 11.5,
              color: "#555",
              letterSpacing: "0.18em",
              textDecoration: "none",
              display: "block",
              marginTop: -8,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            хочешь научиться фотографировать?
          </a>

          <button
            onClick={handleShare}
            className="font-mono uppercase text-center"
            style={{
              width: boardPx,
              fontSize: 11.5,
              color: copied ? "#888" : "#555",
              letterSpacing: "0.18em",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "color 0.2s",
            }}
          >
            {copied ? "ссылка скопирована!" : "отправить другу"}
          </button>

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono uppercase text-center"
            style={{
              width: boardPx,
              fontSize: 11.5,
              color: "#555",
              letterSpacing: "0.18em",
              textDecoration: "none",
              display: "block",
              whiteSpace: "nowrap",
            }}
          >
            инструкция
          </a>
        </div>
      </div>

      {/* Пауза-ревью: тап в любое место продолжает игру */}
      {reviewPending && (
        <div
          className="fixed inset-0 z-50"
          style={{ touchAction: "manipulation" }}
          onClick={handleReviewTap}
          onTouchEnd={(e) => { e.preventDefault(); handleReviewTap(); }}
        >
          <div
            className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none"
          >
            <span
              className="font-mono uppercase tracking-widest"
              style={{
                fontSize: 12,
                color: "#555",
                animation: "float-up 1.5s ease-in-out infinite alternate",
              }}
            >
              нажми чтобы продолжить
            </span>
          </div>
        </div>
      )}

      {isWin && (
        <WinModal onRestart={restartGame} elapsedSeconds={elapsedSeconds} />
      )}

      {gameOver && !isWin && (
        <GameOverModal
          score={score}
          onRestart={restartGame}
        />
      )}

      {/* Зернистость поверх всего — как старая фотоплёнка */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9999, opacity: 0.4, mixBlendMode: "overlay" }}
      >
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      <style>{`
        @keyframes float-up {
          0%   { opacity: 0.3; transform: translateY(4px); }
          100% { opacity: 1;   transform: translateY(-4px); }
        }
        @keyframes fade-in-overlay {
          0%   { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          0%   { transform: translateY(var(--drop, 0px)); }
          100% { transform: translateY(0); }
        }

        @keyframes pop {
          0%   { transform: scale(1);    opacity: 1; }
          30%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0);    opacity: 0; }
        }
        @keyframes pop-pair {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(0);   opacity: 0; }
        }
        @keyframes particle-burst {
          0%   { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes fly-glow {
          0%   { opacity: 1; }
          100% { opacity: 0.75; }
        }
        @keyframes review-pulse {
          0%   { transform: scale(1); }
          45%  { transform: scale(0.7); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}