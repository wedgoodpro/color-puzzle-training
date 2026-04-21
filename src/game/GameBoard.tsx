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
  onCellPress?: (colorId: number) => void;
  onCellRelease?: () => void;
  boardRef?: React.RefObject<HTMLDivElement>;
}

// Летящий кубик — все стили управляются только через DOM (не через React props),
// чтобы ре-рендеры не ломали анимацию.
const FlyingTileView = memo(function FlyingTileView({
  col, colorId, targetRow, cellSize, boardH,
}: { col: number; colorId: number; targetRow: number; cellSize: number; boardH: number; willMatch: boolean }) {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;

    const landY = targetRow * (cellSize + GAP);
    const left = col * (cellSize + GAP);
    const offset = boardH + cellSize - landY;
    const hex = ITTEN_COLORS[colorId].hex;

    // Все стили — только через DOM, React не трогает этот элемент (нет style в JSX)
    el.style.position = "absolute";
    el.style.left = `${left}px`;
    el.style.top = `${landY}px`;
    el.style.width = `${cellSize}px`;
    el.style.height = `${cellSize}px`;
    el.style.backgroundColor = hex;
    el.style.borderRadius = "2px";
    el.style.zIndex = "10";
    el.style.pointerEvents = "none";
    el.style.transform = `translateY(${offset}px)`;
    el.style.transition = "none";
    el.style.willChange = "transform";

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

  // Никаких style/className — React не трогает DOM этого элемента
  return <div ref={divRef} />;
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
  onCellPress,
  onCellRelease,
  boardRef,
}: GameBoardProps) {
  const boardW = boardPx;
  const boardH = rows * (cellSize + GAP) - GAP;

  const actualRows = grid.length;
  const actualCols = grid[0]?.length ?? 0;

  // Строим карту занятых ячеек: "ri-ci" → colorId
  const occupiedMap = new Map<string, number>();
  for (let ri = 0; ri < actualRows; ri++) {
    for (let ci = 0; ci < actualCols; ci++) {
      const cell = grid[ri]?.[ci];
      if (cell != null) occupiedMap.set(`${ri}-${ci}`, cell.colorId);
    }
  }

  // Цветные ячейки для анимаций
  const colorCells: {
    key: string; ci: number; ri: number;
    colorId: number; isPopping: boolean; dropFrom?: number;
  }[] = [];

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
      {/* Фоновые ячейки (zIndex 1) — всегда кликабельны */}
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

      {/* Цветные ячейки (zIndex 2-3) — pointer-events-none, только визуал и анимации */}
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

      {/* Хит-слой поверх занятых ячеек (zIndex 4) — удержание показывает цвет на колесе */}
      {onCellPress && Array.from({ length: actualRows }, (_, ri) =>
        Array.from({ length: actualCols }, (_, ci) => {
          const colorId = occupiedMap.get(`${ri}-${ci}`);
          if (colorId === undefined) return null;
          const cellKey = `${ri}-${ci}`;
          if (poppingCells.has(cellKey) || pairPoppingCells.has(cellKey)) return null;
          return (
            <div
              key={`hit-${ri}-${ci}`}
              className="absolute rounded-sm"
              style={{
                left: ci * (cellSize + GAP),
                top: ri * (cellSize + GAP),
                width: cellSize,
                height: cellSize,
                zIndex: 4,
                opacity: 0,
                cursor: "pointer",
                touchAction: "none",
              }}
              onPointerDown={(e) => { e.stopPropagation(); onCellPress(colorId); }}
              onPointerUp={(e) => { e.stopPropagation(); onCellRelease?.(); }}
              onPointerLeave={() => onCellRelease?.()}
              onPointerCancel={() => onCellRelease?.()}
            />
          );
        })
      )}

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