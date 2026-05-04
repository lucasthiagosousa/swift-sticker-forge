import { jsPDF } from "jspdf";
import { renderToCanvas, type LabelConfig, type LabelItem } from "./codegen";

export async function exportLabelsPDF(
  items: LabelItem[],
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
  for (let i = 0; i < items.length; i++) {
    const idx = i % perPage;
    if (i > 0 && idx === 0) doc.addPage();
    const c = idx % cols;
    const r = Math.floor(idx / cols);
    const x = margin + c * (W + gap);
    const y = margin + r * (H + gap);
    const it = items[i];
    const itemCfg: LabelConfig = {
      ...cfg,
      title: it.title ?? cfg.title,
      subtitle: it.subtitle ?? cfg.subtitle,
      qrLink: it.qrLink ?? cfg.qrLink,
    };
    await renderToCanvas(canvas, it.value, itemCfg);
    const data = canvas.toDataURL("image/png");
    doc.addImage(data, "PNG", x, y, W, H);
  }
  doc.save(filename);
}