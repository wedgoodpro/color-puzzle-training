import React, { useEffect, useRef, memo } from "react";
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
  onCellClick?: (colorId: number) => void;
  boardRef?: React.RefObject<HTMLDivElement>;
}

// Летящий кубик — все стили управляются только через DOM (не через React props),
// чтобы ре-рендеры от расширения сетки не ломали анимацию.
const FlyingTileView = memo(function FlyingTileView({
  col, colorId, targetRow, cellSize, boardH,
}: { col: number; colorId: number; targetRow: number; cellSize: number; boardH: number; willMatch: boolean }) {
  const divRef = useRef<HTMLDivElement>(null);
  const hex = ITTEN_COLORS[colorId].hex;

  // Снапшот параметров на момент монтирования — больше не меняются
  const snapshot = useRef({
    landY: targetRow * (cellSize + GAP),
    left: col * (cellSize + GAP),
    size: cellSize,
    offset: boardH + cellSize - targetRow * (cellSize + GAP),
  });

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    const { landY, left, size, offset } = snapshot.current;

    // Сразу ставим все стили через DOM — React их не трогает (нет style в JSX)
    el.style.position = "absolute";
    el.style.left = `${left}px`;
    el.style.top = `${landY}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.transform = `translateY(${offset}px)`;
    el.style.transition = "none";
    el.style.willChange = "transform";

    // Два rAF: первый — браузер фиксирует начальную позицию, второй — запускает transition
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        if (!divRef.current) return;
        divRef.current.style.transition = "transform 300ms cubic-bezier(0.34,1.2,0.64,1)";
        divRef.current.style.transform = "translateY(0px)";
      });
      return () => cancelAnimationFrame(r2);
    });
    return () => cancelAnimationFrame(r1);
  }, []);

  // Никаких style-пропов кроме цвета и z-index — React не будет трогать transform/top/left
  return (
    <div
      ref={divRef}
      className="pointer-events-none rounded-sm"
      style={{ backgroundColor: hex, zIndex: 10 }}
    />
  );
});

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
  onCellClick,
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
              zIndex: 1,
            }}
          />
        ))
      )}

      {/* Цветные ячейки — pointer-events-none, анимации не трогаем */}
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
          anim = "pop-pair 0.18s ease-in forwards";
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
              zIndex: isReview ? 3 : 2,
            }}
          />
        );
      })}

      {/* Прозрачный кликабельный слой поверх цветных ячеек — только для инспекции */}
      {onCellClick && colorCells.map(({ key, ci, ri, colorId, isPopping }) => {
        if (isPopping) return null;
        return (
          <div
            key={`hit-${key}`}
            className="absolute rounded-sm cursor-pointer"
            style={{
              left: ci * (cellSize + GAP),
              top: ri * (cellSize + GAP),
              width: cellSize,
              height: cellSize,
              zIndex: 5,
              opacity: 0,
            }}
            onClick={(e) => { e.stopPropagation(); onCellClick(colorId); }}
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
              animation: "particle-burst 0.4s cubic-bezier(0.15,0.85,0.35,1) forwards",
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