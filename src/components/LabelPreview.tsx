import { useEffect, useRef } from "react";
import { renderToCanvas, type LabelConfig } from "@/lib/codegen";

export function LabelPreview({ value, config }: { value: string; config: LabelConfig }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderToCanvas(ref.current, value, config);
  }, [value, config]);
  return (
    <div className="flex items-center justify-center rounded-lg border border-border bg-muted/30 p-8">
      <canvas
        ref={ref}
        className="max-w-full rounded shadow-sm"
        style={{
          width: `${config.width * 4}px`,
          height: `${config.height * 4}px`,
          maxWidth: "100%",
        }}
      />
    </div>
  );
}