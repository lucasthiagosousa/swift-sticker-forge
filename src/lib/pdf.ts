import { jsPDF } from "jspdf";
import { renderToCanvas, type LabelConfig } from "./codegen";

export async function exportLabelsPDF(
  values: string[],
  cfg: LabelConfig,
  filename = "etiquetas.pdf",
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 8;
  const gap = 3;
  const W = cfg.width;
  const H = cfg.height;
  const cols = Math.max(1, Math.floor((pageW - margin * 2 + gap) / (W + gap)));
  const rows = Math.max(1, Math.floor((pageH - margin * 2 + gap) / (H + gap)));
  const perPage = cols * rows;

  const canvas = document.createElement("canvas");
  for (let i = 0; i < values.length; i++) {
    const idx = i % perPage;
    if (i > 0 && idx === 0) doc.addPage();
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const x = margin + c * (W + gap);
    const y = margin + r * (H + gap);
    await renderToCanvas(canvas, values[i], cfg);
    const data = canvas.toDataURL("image/png");
    doc.addImage(data, "PNG", x, y, W, H);
  }
  doc.save(filename);
}