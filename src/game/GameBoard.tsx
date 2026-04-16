import React, { useEffect, useState } from "react";
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
  boardPx?: number;
  flyingTile: FlyingTile | null;
  particles: Particle[];
  poppingCells: Set<string>;
  gravityMs: number;
  hoverCol: number | null;
  reviewCells?: Set<string>;
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
  boardPx = BOARD_W,
  flyingTile,
  particles,
  poppingCells,
  gravityMs,
  hoverCol,
  reviewCells,
  onColumnClick,
  onColumnHover,
  boardRef,
}: GameBoardProps) {
  const boardW = boardPx;
  const boardH = rows * (cellSize + GAP) - GAP;

  // Анимация летящего кубика через translateY
  const [flyOffset, setFlyOffset] = useState<number>(0);
  const [flyAnimating, setFlyAnimating] = useState(false);

  useEffect(() => {
    if (!flyingTile) {
      setFlyAnimating(false);
      return;
    }
    const landY = flyingTile.targetRow * (cellSize + GAP);
    const startOffset = boardH + GAP - landY; // сколько пикселей ниже целевой позиции
    // Сначала без transition — ставим кубик внизу
    setFlyOffset(startOffset);
    setFlyAnimating(false);
    // Следующий кадр — запускаем transition к 0
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlyOffset(0);
        setFlyAnimating(true);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [flyingTile ? `${flyingTile.col}-${flyingTile.colorId}-${flyingTile.targetRow}` : null]);
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
        let anim: string | undefined;
        if (isReview) {
          anim = "review-pulse 0.7s ease-in-out infinite";
        } else if (isPopping) {
          anim = "pop 0.55s cubic-bezier(0.36,0.07,0.19,0.97) forwards";
        } else if (dropFrom !== undefined) {
          anim = `slideUp ${dur}ms cubic-bezier(0.34,1.4,0.64,1) forwards`;
        }

        const hex = ITTEN_COLORS[colorId].hex;
        return (
          <div
            key={key}
            className="absolute pointer-events-none rounded-sm"
            style={{
              left: ci * (cellSize + GAP),
              top,
              width: cellSize,
              height: cellSize,
              backgroundColor: hex,
              animation: anim,
              ["--drop" as string]: dropFrom !== undefined ? `${dropFrom}px` : "0px",
              ["--glow" as string]: hex,
              zIndex: isReview ? 3 : 2,
            }}
          />
        );
      })}

      {/* Летящий кубик — translateY снизу вверх с пружинным отскоком */}
      {flyingTile && (
        <div
          className="absolute pointer-events-none rounded-sm"
          style={{
            left: flyingTile.col * (cellSize + GAP),
            top: flyingTile.targetRow * (cellSize + GAP),
            width: cellSize,
            height: cellSize,
            backgroundColor: ITTEN_COLORS[flyingTile.colorId].hex,
            zIndex: 10,
            transform: `translateY(${flyOffset}px)`,
            transition: flyAnimating
              ? "transform 300ms cubic-bezier(0.34,1.56,0.64,1)"
              : "none",
          }}
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