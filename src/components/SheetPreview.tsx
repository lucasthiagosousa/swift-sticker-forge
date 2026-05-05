import { useMemo } from "react";

interface Props {
  pageW: number;
  pageH: number;
  margin: number;
  gap: number;
  labelW: number;
  labelH: number;
  orientation: "portrait" | "landscape";
  total: number;
  selectedIndex?: number;
}

export function SheetPreview({
  pageW,
  pageH,
  margin,
  gap,
  labelW,
  labelH,
  orientation,
  total,
  selectedIndex = -1,
}: Props) {
  const pw = orientation === "landscape" ? pageH : pageW;
  const ph = orientation === "landscape" ? pageW : pageH;

  const { cols, rows, perPage, pages } = useMemo(() => {
    const c = Math.max(1, Math.floor((pw - margin * 2 + gap) / (labelW + gap)));
    const r = Math.max(1, Math.floor((ph - margin * 2 + gap) / (labelH + gap)));
    const per = c * r;
    return {
      cols: c,
      rows: r,
      perPage: per,
      pages: Math.max(1, Math.ceil(Math.max(1, total) / per)),
    };
  }, [pw, ph, margin, gap, labelW, labelH, total]);

  // scale so the page fits a max width
  const maxW = 280;
  const scale = Math.min(maxW / pw, 360 / ph);
  const W = pw * scale;
  const H = ph * scale;

  const cells: { x: number; y: number; idx: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: (margin + c * (labelW + gap)) * scale,
        y: (margin + r * (labelH + gap)) * scale,
        idx: r * cols + c,
      });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {cols} × {rows} = <span className="font-medium text-foreground">{perPage}</span> por
          página
        </span>
        <span>
          {pages} {pages === 1 ? "página" : "páginas"} · {total} etiqueta
          {total === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex justify-center rounded-lg border border-border bg-muted/30 p-4">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="rounded-sm bg-background shadow-sm"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))" }}
        >
          <rect
            x={0.5}
            y={0.5}
            width={W - 1}
            height={H - 1}
            fill="var(--background)"
            stroke="var(--border)"
          />
          {cells.map((cell) => {
            const filled = cell.idx < total;
            const isSel = cell.idx === selectedIndex;
            return (
              <g key={cell.idx}>
                <rect
                  x={cell.x}
                  y={cell.y}
                  width={labelW * scale}
                  height={labelH * scale}
                  rx={2}
                  fill={
                    isSel
                      ? "var(--foreground)"
                      : filled
                        ? "var(--secondary)"
                        : "transparent"
                  }
                  stroke={isSel ? "var(--foreground)" : "var(--border)"}
                  strokeDasharray={filled ? undefined : "2 2"}
                  strokeWidth={isSel ? 1.2 : 0.6}
                />
                {filled && labelW * scale > 18 && labelH * scale > 12 && (
                  <text
                    x={cell.x + (labelW * scale) / 2}
                    y={cell.y + (labelH * scale) / 2 + 3}
                    textAnchor="middle"
                    fontSize={Math.min(10, labelH * scale * 0.45)}
                    fill={isSel ? "var(--background)" : "var(--muted-foreground)"}
                    style={{ fontFamily: "ui-monospace, monospace" }}
                  >
                    {cell.idx + 1}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}