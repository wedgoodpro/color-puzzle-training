import React, { useEffect, useRef } from "react";
import {
  BOARD_W, GAP,
  ITTEN_COLORS, CELL_EMPTY, CELL_EMPTY_HOVER,
  Grid, FlyingTile, Particle,
} from "./constants";

interface GameBoardProps {
  grid: Grid;
  cols: number;
  rows: number;
  cellSize: number;
  boardPx?: number;
  flyingTile: FlyingTile | null;
  particles: Particle[];
  poppingCells: Set<string>;
  pairPoppingCells: Set<string>;
  gravityMs: number;
  hoverCol: number | null;
  reviewCells?: Set<string>;
  getFlyingY: (ft: FlyingTile) => number;
  onColumnClick: (col: number) => void;
  onColumnHover: (col: number | null) => void;
  boardRef?: React.RefObject<HTMLDivElement>;
}

// Летящий кубик — перемонтируется при каждом броске через key
function FlyingTileView({
  col, colorId, targetRow, cellSize, boardH, willMatch,
}: { col: number; colorId: number; targetRow: number; cellSize: number; boardH: number; willMatch: boolean }) {
  const landY = targetRow * (cellSize + GAP);
  const startOffset = boardH + cellSize - landY;
  const divRef = useRef<HTMLDivElement>(null);
  const hex = ITTEN_COLORS[colorId].hex;

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    void el.getBoundingClientRect();
    el.style.transition = "transform 300ms cubic-bezier(0.34,1.2,0.64,1)";
    el.style.transform = "translateY(0px)";
  }, []);

  return (
    <div
      ref={divRef}
      className="absolute pointer-events-none rounded-sm"
      style={{
        left: col * (cellSize + GAP),
        top: landY,
        width: cellSize,
        height: cellSize,
        backgroundColor: hex,
        zIndex: 10,
        transform: `translateY(${startOffset}px)`,
        transition: "none",

      }}
    />
  );
}

export default function GameBoard({
  grid,
  cols,
  rows,
  cellSize,
  boardPx = BOARD_W,
  flyingTile,
  particles,
  poppingCells,
  pairPoppingCells,
  gravityMs,
  hoverCol,
  reviewCells,
  onColumnClick,
  onColumnHover,
  boardRef,
}: GameBoardProps) {
  const boardW = boardPx;
  const boardH = rows * (cellSize + GAP) - GAP;

  const colorCells: {
    key: string; ci: number; ri: number;
    colorId: number; isPopping: boolean; dropFrom?: number;
  }[] = [];

  const actualRows = grid.length;
  const actualCols = grid[0]?.length ?? 0;



  for (let ci = 0; ci < actualCols; ci++) {
    let slotIdx = 0;
    for (let ri = 0; ri < actualRows; ri++) {
      const cell = grid[ri]?.[ci];
      if (cell != null) {
        colorCells.push({
          key: `c${ci}s${slotIdx}`,
          ci, ri,
          colorId: cell.colorId,
          isPopping: poppingCells.has(`${ri}-${ci}`),
          dropFrom: cell.dropFrom,
        });
        slotIdx++;
      }
    }
  }

  return (
    <div
      ref={boardRef}
      className="relative overflow-visible"
      style={{ width: boardW, height: boardH }}
    >
      {/* Фоновые ячейки */}
      {Array.from({ length: actualRows }, (_, ri) =>
        Array.from({ length: actualCols }, (_, ci) => (
          <div
            key={`bg-${ri}-${ci}`}
            onClick={() => onColumnClick(ci)}
            onMouseEnter={() => onColumnHover(ci)}
            onMouseLeave={() => onColumnHover(null)}
            className="absolute cursor-pointer rounded-sm"
            style={{
              left: ci * (cellSize + GAP),
              top: ri * (cellSize + GAP),
              width: cellSize,
              height: cellSize,
              backgroundColor: hoverCol === ci ? CELL_EMPTY_HOVER : CELL_EMPTY,
              transition: "background-color 0.1s",
            }}
          />
        ))
      )}

      {/* Цветные ячейки */}
      {colorCells.map(({ key, ci, ri, colorId, isPopping, dropFrom }) => {
        const top = ri * (cellSize + GAP);
        const dur = gravityMs > 0 ? gravityMs : 300;
        const cellKey = `${ri}-${ci}`;
        const isReview = !!reviewCells?.has(cellKey);
        const isPairPopping = pairPoppingCells.has(cellKey);
        let anim: string | undefined;
        if (isReview) {
          anim = "review-pulse 0.7s ease-in-out infinite";
        } else if (isPairPopping) {
          anim = "pop-pair 0.35s ease-in forwards";
        } else if (isPopping) {
          anim = "pop 0.55s cubic-bezier(0.36,0.07,0.19,0.97) forwards";
        } else if (dropFrom !== undefined) {
          anim = `slideUp ${dur}ms cubic-bezier(0.34,1.4,0.64,1) forwards`;
        }

        const hex = ITTEN_COLORS[colorId].hex;
        const elemKey = key;
        return (
          <div
            key={elemKey}
            className="absolute pointer-events-none rounded-sm"
            style={{
              left: ci * (cellSize + GAP),
              top,
              width: cellSize,
              height: cellSize,
              backgroundColor: hex,
              animation: anim,
              ["--drop" as string]: dropFrom !== undefined ? `${dropFrom}px` : "0px",
              zIndex: isReview ? 3 : 2,
            }}
          />
        );
      })}

      {/* Летящий кубик */}
      {flyingTile && (
        <FlyingTileView
          key={flyingTile.progress}
          col={flyingTile.col}
          colorId={flyingTile.colorId}
          targetRow={flyingTile.targetRow}
          cellSize={cellSize}
          boardH={boardH}
          willMatch={flyingTile.willMatch}
        />
      )}

      {/* Particles */}
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.sin(rad) * p.dist;
        const ty = -Math.cos(rad) * p.dist;
        return (
          <div
            key={p.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: p.x - 6,
              top: p.y - 6,
              width: 12,
              height: 12,
              backgroundColor: p.color,
              animation: "particle-burst 0.75s cubic-bezier(0.15,0.85,0.35,1) forwards",
              ["--tx" as string]: `${tx}px`,
              ["--ty" as string]: `${ty}px`,
              zIndex: 20,
            }}
          />
        );
      })}
    </div>
  );
}