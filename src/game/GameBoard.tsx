import React from "react";
import {
  BOARD_W, BOARD_H, GAP,
  ITTEN_COLORS, CELL_EMPTY, CELL_EMPTY_HOVER,
  Grid, FlyingTile, Particle,
} from "./constants";

interface GameBoardProps {
  grid: Grid;
  cols: number;
  rows: number;
  cellSize: number;
  flyingTile: FlyingTile | null;
  particles: Particle[];
  poppingCells: Set<string>;
  gravityMs: number;
  hoverCol: number | null;
  getFlyingY: (ft: FlyingTile) => number;
  onColumnClick: (col: number) => void;
  onColumnHover: (col: number | null) => void;
  boardRef?: React.RefObject<HTMLDivElement>;
}

export default function GameBoard({
  grid,
  cols,
  rows,
  cellSize,
  particles,
  poppingCells,
  gravityMs,
  hoverCol,
  onColumnClick,
  onColumnHover,
  boardRef,
}: GameBoardProps) {
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
      if (cell !== null) {
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
      style={{ width: BOARD_W, height: BOARD_H }}
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
        let anim: string | undefined;
        if (isPopping) {
          anim = "pop 0.32s cubic-bezier(0.36,0.07,0.19,0.97) forwards";
        } else if (dropFrom !== undefined) {
          anim = `slideUp ${dur}ms cubic-bezier(0.34,1.4,0.64,1) forwards`;
        }

        return (
          <div
            key={key}
            className="absolute pointer-events-none rounded-sm"
            style={{
              left: ci * (cellSize + GAP),
              top,
              width: cellSize,
              height: cellSize,
              backgroundColor: ITTEN_COLORS[colorId].hex,
              animation: anim,
              ["--drop" as string]: dropFrom !== undefined ? `${dropFrom}px` : "0px",
              zIndex: 2,
            }}
          />
        );
      })}

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
              left: p.x - 5,
              top: p.y - 5,
              width: 10,
              height: 10,
              backgroundColor: p.color,
              animation: "particle-burst 0.5s cubic-bezier(0.2,0.8,0.4,1) forwards",
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