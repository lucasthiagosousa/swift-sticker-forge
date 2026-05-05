import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

export type CodeType = "qrcode" | "barcode" | "both";
export type BarcodeFormat = "CODE128" | "EAN13" | "EAN8" | "UPC" | "CODE39" | "ITF14";

export interface LabelConfig {
  type: CodeType;
  barcodeFormat: BarcodeFormat;
  title: string;
  subtitle: string;
  showValue: boolean;
  width: number; // mm
  height: number; // mm
  fontSize: number;
  padding: number;
  align: "left" | "center" | "right";
  fg: string;
  bg: string;
  /** Default QR link/content when type === "both" and item has no qrLink */
  qrLink?: string;
  /** Gap (mm) between QR and barcode when type === "both" */
  bothGap?: number;
}

export interface LabelItem {
  value: string;
  title?: string;
  subtitle?: string;
  /** Optional URL/text encoded into the QR when type === "both" or to override QR content */
  qrLink?: string;
}

export const defaultConfig: LabelConfig = {
  type: "qrcode",
  barcodeFormat: "CODE128",
  title: "",
  subtitle: "",
  showValue: true,
  width: 60,
  height: 40,
  fontSize: 10,
  padding: 4,
  align: "center",
  fg: "#111111",
  bg: "#ffffff",
  bothGap: 2,
};

export async function renderToCanvas(
  canvas: HTMLCanvasElement,
  value: string,
  cfg: LabelConfig,
) {
  const ctx = canvas.getContext("2d")!;
  const dpi = 8; // px per mm
  const W = Math.max(20, cfg.width) * dpi;
  const H = Math.max(20, cfg.height) * dpi;
  canvas.width = W;
  canvas.height = H;
  ctx.fillStyle = cfg.bg;
  ctx.fillRect(0, 0, W, H);

  const pad = cfg.padding * dpi;
  const fs = cfg.fontSize * (dpi / 4);
  ctx.fillStyle = cfg.fg;
  ctx.textBaseline = "top";
  ctx.textAlign = cfg.align as CanvasTextAlign;
  const ax = cfg.align === "left" ? pad : cfg.align === "right" ? W - pad : W / 2;

  let topY = pad;
  if (cfg.title) {
    ctx.font = `600 ${fs * 1.1}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(cfg.title, ax, topY);
    topY += fs * 1.4;
  }

  let bottomY = H - pad;
  if (cfg.subtitle) {
    ctx.font = `400 ${fs * 0.85}px ui-sans-serif, system-ui, sans-serif`;
    bottomY -= fs;
    ctx.fillText(cfg.subtitle, ax, bottomY);
    bottomY -= 4;
  }
  if (cfg.showValue && value) {
    ctx.font = `500 ${fs * 0.9}px ui-monospace, monospace`;
    bottomY -= fs;
    ctx.fillText(value, ax, bottomY);
    bottomY -= 4;
  }

  const codeAreaH = bottomY - topY;
  const codeAreaW = W - pad * 2;
  if (codeAreaH < 10 || codeAreaW < 10) return;

  const tmp = document.createElement("canvas");
  if (cfg.type === "both") {
    // QR on the left, barcode on the right, sharing codeAreaW with a configurable gap
    const gap = Math.max(0, (cfg.bothGap ?? 2) * dpi);
    const qrSize = Math.min(codeAreaH, Math.floor((codeAreaW - gap) * 0.4));
    const barW = codeAreaW - gap - qrSize;
    const qrCanvas = document.createElement("canvas");
    const qrContent = (cfg.qrLink && cfg.qrLink.trim()) || value || " ";
    await QRCode.toCanvas(qrCanvas, qrContent, {
      width: qrSize,
      margin: 0,
      color: { dark: cfg.fg, light: cfg.bg },
    });
    ctx.drawImage(qrCanvas, pad, topY + (codeAreaH - qrSize) / 2);
    const barCanvas = document.createElement("canvas");
    try {
      JsBarcode(barCanvas, value || "0", {
        format: cfg.barcodeFormat,
        displayValue: false,
        margin: 0,
        background: cfg.bg,
        lineColor: cfg.fg,
        height: Math.max(20, codeAreaH),
        width: 2,
      });
      const ratio = barCanvas.width / barCanvas.height;
      let bw = barW;
      let bh = bw / ratio;
      if (bh > codeAreaH) {
        bh = codeAreaH;
        bw = bh * ratio;
      }
      ctx.drawImage(
        barCanvas,
        pad + qrSize + gap,
        topY + (codeAreaH - bh) / 2,
        bw,
        bh,
      );
    } catch {
      ctx.fillStyle = "red";
      ctx.font = `${fs}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Valor inválido p/ barras", pad + qrSize + gap + barW / 2, topY + codeAreaH / 2);
    }
  } else if (cfg.type === "qrcode") {
    const size = Math.min(codeAreaH, codeAreaW);
    const qrContent = (cfg.qrLink && cfg.qrLink.trim()) || value || " ";
    await QRCode.toCanvas(tmp, qrContent, {
      width: Math.floor(size),
      margin: 0,
      color: { dark: cfg.fg, light: cfg.bg },
    });
    const dx =
      cfg.align === "left"
        ? pad
        : cfg.align === "right"
          ? W - pad - size
          : (W - size) / 2;
    ctx.drawImage(tmp, dx, topY + (codeAreaH - size) / 2);
  } else {
    try {
      JsBarcode(tmp, value || "0", {
        format: cfg.barcodeFormat,
        displayValue: false,
        margin: 0,
        background: cfg.bg,
        lineColor: cfg.fg,
        height: Math.max(20, codeAreaH),
        width: 2,
      });
    } catch {
      ctx.fillStyle = "red";
      ctx.font = `${fs}px sans-serif`;
      ctx.fillText("Valor inválido", W / 2, topY + codeAreaH / 2);
      return;
    }
    const ratio = tmp.width / tmp.height;
    let bw = codeAreaW;
    let bh = bw / ratio;
    if (bh > codeAreaH) {
      bh = codeAreaH;
      bw = bh * ratio;
    }
    const dx =
      cfg.align === "left"
        ? pad
        : cfg.align === "right"
          ? W - pad - bw
          : (W - bw) / 2;
    ctx.drawImage(tmp, dx, topY + (codeAreaH - bh) / 2, bw, bh);
  }
}