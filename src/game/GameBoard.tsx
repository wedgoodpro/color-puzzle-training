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
  flyingTile,
  particles,
  poppingCells,
  hoverCol,
  getFlyingY,
  onColumnClick,
  onColumnHover,
  boardRef,
}: GameBoardProps) {
  void rows;
  return (
    <div
      ref={boardRef}
      className="relative overflow-visible"
      style={{ width: BOARD_W, height: BOARD_H }}
    >
      {grid.map((row, ri) =>
        row.map((cell, ci) => {
          const key = `${ri}-${ci}`;
          const isPopping = poppingCells.has(key);
          const isHoverCol = hoverCol === ci;
          const c = cell ? ITTEN_COLORS[cell.colorId] : null;
          return (
            <div
              key={key}
              onClick={() => onColumnClick(ci)}
              onMouseEnter={() => onColumnHover(ci)}
              onMouseLeave={() => onColumnHover(null)}
              className="absolute cursor-pointer rounded-sm"
              style={{
                left: ci * (cellSize + GAP),
                top: ri * (cellSize + GAP),
                width: cellSize,
                height: cellSize,
                backgroundColor: c ? c.hex : isHoverCol ? CELL_EMPTY_HOVER : CELL_EMPTY,
                animation: isPopping
                  ? "pop 0.32s cubic-bezier(0.36,0.07,0.19,0.97) forwards"
                  : undefined,
                transition: c ? undefined : "background-color 0.1s",
              }}
            />
          );
        })
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

      {/* Flying tile рендерится в Index.tsx как fixed */}
    </div>
  );
}