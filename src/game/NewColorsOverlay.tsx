import { ITTEN_COLORS } from "@/game/constants";

interface NewColorsOverlayProps {
  notice: { names: string[]; ids: number[] } | null;
}

export default function NewColorsOverlay({ notice }: NewColorsOverlayProps) {
  if (!notice) return null;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background: "rgba(30,30,30,0.82)",
        backdropFilter: "blur(2px)",
        borderRadius: 6,
        animation: "fade-in-overlay 0.3s ease",
        zIndex: 30,
      }}
    >
      <div
        className="font-mono font-bold text-center"
        style={{ fontSize: 13, color: "#666", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}
      >
        новые цвета
      </div>
      {notice.ids.map((id) => (
        <div
          key={id}
          className="font-mono font-bold text-center"
          style={{
            fontSize: 22,
            color: ITTEN_COLORS[id].hex,
            textShadow: `0 0 20px ${ITTEN_COLORS[id].hex}`,
            marginBottom: 4,
            letterSpacing: "0.05em",
          }}
        >
          {ITTEN_COLORS[id].name}
        </div>
      ))}
      <div
        className="font-mono text-center"
        style={{ fontSize: 11, color: "#444", marginTop: 12, letterSpacing: "0.1em" }}
      >
        поле расширилось
      </div>
    </div>
  );
}
