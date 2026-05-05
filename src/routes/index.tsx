import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LabelPreview } from "@/components/LabelPreview";
import { defaultConfig, type LabelConfig, type LabelItem, type CodeType } from "@/lib/codegen";
import { exportLabelsPDF } from "@/lib/pdf";
import {
  QrCode,
  Barcode,
  Download,
  Save,
  Trash2,
  Upload,
  FileDown,
  Sparkles,
  Plus,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({ component: Index });

interface BatchItem extends LabelItem {
  id: string;
  type?: CodeType;
}

interface Preset {
  id: string;
  name: string;
  config: LabelConfig;
}

const LS_PRESETS = "etiqueta.presets";
const LS_CONFIG = "etiqueta.config";
const LS_ITEMS = "etiqueta.items";
const LS_PRINT = "etiqueta.print";

interface PrintConfig {
  format: "a4" | "letter" | "zebra" | "custom";
  pageW: number; // mm
  pageH: number; // mm
  margin: number; // mm
  gap: number; // mm
  orientation: "portrait" | "landscape";
}

const PRINT_PRESETS: Record<PrintConfig["format"], { pageW: number; pageH: number }> = {
  a4: { pageW: 210, pageH: 297 },
  letter: { pageW: 216, pageH: 279 },
  zebra: { pageW: 102, pageH: 152 }, // 4x6"
  custom: { pageW: 100, pageH: 150 },
};

const defaultPrint: PrintConfig = {
  format: "a4",
  pageW: 210,
  pageH: 297,
  margin: 8,
  gap: 3,
  orientation: "portrait",
};

const newItem = (overrides: Partial<BatchItem> = {}): BatchItem => ({
  id: crypto.randomUUID(),
  value: "ETQ-0001",
  title: "",
  subtitle: "",
  ...overrides,
});

function Index() {
  const [config, setConfig] = useState<LabelConfig>(() => {
    if (typeof window === "undefined") return defaultConfig;
    try {
      const raw = localStorage.getItem(LS_CONFIG);
      return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const [items, setItems] = useState<BatchItem[]>(() => {
    if (typeof window === "undefined") return [newItem()];
    try {
      const raw = localStorage.getItem(LS_ITEMS);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.length ? parsed : [newItem()];
    } catch {
      return [newItem()];
    }
  });

  const [selectedId, setSelectedId] = useState<string>(() => "");
  const selected = items.find((i) => i.id === selectedId) || items[0];

  useEffect(() => {
    if (!items.find((i) => i.id === selectedId) && items[0]) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const [presets, setPresets] = useState<Preset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(LS_PRESETS) || "[]");
    } catch {
      return [];
    }
  });
  const [presetName, setPresetName] = useState("");

  const [printCfg, setPrintCfg] = useState<PrintConfig>(() => {
    if (typeof window === "undefined") return defaultPrint;
    try {
      const raw = localStorage.getItem(LS_PRINT);
      return raw ? { ...defaultPrint, ...JSON.parse(raw) } : defaultPrint;
    } catch {
      return defaultPrint;
    }
  });
  const updatePrint = <K extends keyof PrintConfig>(k: K, v: PrintConfig[K]) =>
    setPrintCfg((c) => ({ ...c, [k]: v }));

  useEffect(() => {
    localStorage.setItem(LS_CONFIG, JSON.stringify(config));
  }, [config]);
  useEffect(() => {
    localStorage.setItem(LS_PRESETS, JSON.stringify(presets));
  }, [presets]);
  useEffect(() => {
    localStorage.setItem(LS_ITEMS, JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    localStorage.setItem(LS_PRINT, JSON.stringify(printCfg));
  }, [printCfg]);

  const update = <K extends keyof LabelConfig>(k: K, v: LabelConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const updateItem = (id: string, patch: Partial<BatchItem>) =>
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const previewConfig: LabelConfig = useMemo(
    () =>
      selected
        ? {
            ...config,
            type: selected.type ?? config.type,
            title: selected.title ?? config.title,
            subtitle: selected.subtitle ?? config.subtitle,
            qrLink: selected.qrLink ?? config.qrLink,
          }
        : config,
    [config, selected],
  );

  const savePreset = () => {
    if (!presetName.trim()) return toast.error("Dê um nome ao preset");
    setPresets((arr) => [
      { id: crypto.randomUUID(), name: presetName.trim(), config },
      ...arr,
    ]);
    setPresetName("");
    toast.success("Preset salvo");
  };
  const loadPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (p) {
      setConfig(p.config);
      toast.success(`"${p.name}" aplicado`);
    }
  };
  const removePreset = (id: string) =>
    setPresets((arr) => arr.filter((x) => x.id !== id));

  const onImportCSV = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data;
        let imported: BatchItem[] = [];
        if (rows.length && typeof rows[0] === "object" && !Array.isArray(rows[0])) {
          imported = rows
            .map((r) => {
              const value =
                r.value || r.valor || r.code || r.codigo || Object.values(r)[0] || "";
              if (!value) return null;
              const t = (r.type || r.tipo || "").toLowerCase();
              return newItem({
                value: String(value).trim(),
                title: r.title || r.titulo || "",
                subtitle: r.subtitle || r.subtitulo || "",
            qrLink: r.qrlink || r.link || r.url || "",
                type:
              t === "barcode" || t === "barras"
                ? "barcode"
                : t === "qrcode" || t === "qr"
                  ? "qrcode"
                  : t === "both" || t === "ambos"
                    ? "both"
                    : undefined,
              });
            })
            .filter(Boolean) as BatchItem[];
        }
        if (!imported.length) {
          // fallback: parse as plain list
          Papa.parse(file, {
            complete: (r2) => {
              const flat = (r2.data as string[][])
                .flat()
                .map((s) => String(s).trim())
                .filter(Boolean);
              setItems(flat.map((v) => newItem({ value: v })));
              toast.success(`${flat.length} itens importados`);
            },
          });
          return;
        }
        setItems(imported);
        toast.success(`${imported.length} itens importados`);
      },
    });
  };

  const exportSingle = () => {
    if (!selected) return;
    exportMixed(
      [{ ...selected, type: selected.type ?? config.type }],
      config,
      printCfg,
      "etiqueta.pdf",
    );
  };

  const exportBatch = () => {
    if (!items.length) return toast.error("Lista vazia");
    exportMixed(items, config, printCfg);
  };

  const exportListCSV = () => {
    const csv = Papa.unparse(
      items.map((i) => ({
        value: i.value,
        title: i.title || "",
        subtitle: i.subtitle || "",
        qrlink: i.qrLink || "",
        type: i.type || config.type,
      })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "etiquetas.csv";
    a.click();
  };

  const addItem = () => {
    const it = newItem({ value: `ETQ-${String(items.length + 1).padStart(4, "0")}` });
    setItems((arr) => [...arr, it]);
    setSelectedId(it.id);
  };
  const dupItem = (id: string) => {
    const src = items.find((i) => i.id === id);
    if (!src) return;
    const it = newItem({ ...src, id: crypto.randomUUID() });
    setItems((arr) => {
      const idx = arr.findIndex((i) => i.id === id);
      const next = [...arr];
      next.splice(idx + 1, 0, it);
      return next;
    });
  };
  const delItem = (id: string) =>
    setItems((arr) => (arr.length > 1 ? arr.filter((i) => i.id !== id) : arr));

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Etiqueta</h1>
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            QR Code & Código de Barras · 100% no navegador
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[320px_1fr_340px]">
        {/* Lista de etiquetas */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Etiquetas ({items.length})</h2>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus /> Nova
            </Button>
          </div>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
            {items.map((it) => {
              const active = it.id === selected?.id;
              const t = it.type ?? config.type;
              return (
                <div
                  key={it.id}
                  onClick={() => setSelectedId(it.id)}
                  className={`group cursor-pointer rounded-lg border p-3 transition ${
                    active
                      ? "border-foreground bg-secondary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 text-muted-foreground">
                      {t === "qrcode" ? (
                        <QrCode className="h-4 w-4" />
                      ) : (
                        <Barcode className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs">{it.value || "—"}</div>
                      {(it.title || it.subtitle) && (
                        <div className="truncate text-xs text-muted-foreground">
                          {[it.title, it.subtitle].filter(Boolean).join(" · ")}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dupItem(it.id);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          delItem(it.id);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex flex-1">
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] && onImportCSV(e.target.files[0])
                  }
                />
                <Button asChild variant="outline" size="sm" className="w-full">
                  <span>
                    <Upload /> Importar
                  </span>
                </Button>
              </label>
              <Button onClick={exportListCSV} variant="outline" size="sm" className="flex-1">
                <FileDown /> Exportar CSV
              </Button>
            </div>
            <Button onClick={exportBatch} className="w-full" size="sm">
              <Download /> PDF em lote
            </Button>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              CSV aceita colunas: value, title, subtitle, type (qrcode/barcode).
            </p>
          </div>
        </section>

        {/* Preview + edição do item */}
        <section className="space-y-4">
          <LabelPreview value={selected?.value || ""} config={previewConfig} />

          {selected && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Editar etiqueta</h3>
                <Button onClick={exportSingle} size="sm" variant="outline">
                  <Download /> PDF desta
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={
                    (selected.type ?? config.type) === "qrcode" ? "default" : "outline"
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => updateItem(selected.id, { type: "qrcode" })}
                >
                  <QrCode /> QR
                </Button>
                <Button
                  variant={
                    (selected.type ?? config.type) === "barcode" ? "default" : "outline"
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => updateItem(selected.id, { type: "barcode" })}
                >
                  <Barcode /> Barras
                </Button>
                <Button
                  variant={
                    (selected.type ?? config.type) === "both" ? "default" : "outline"
                  }
                  size="sm"
                  className="flex-1"
                  onClick={() => updateItem(selected.id, { type: "both" })}
                >
                  <QrCode /> + <Barcode /> Ambos
                </Button>
              </div>

              <div>
                <Label className="text-xs">Conteúdo</Label>
                <Input
                  value={selected.value}
                  onChange={(e) => updateItem(selected.id, { value: e.target.value })}
                />
              </div>
              {((selected.type ?? config.type) === "qrcode" ||
                (selected.type ?? config.type) === "both") && (
                <div>
                  <Label className="text-xs">
                    Link do chamado (QR){" "}
                    <span className="text-muted-foreground">— opcional</span>
                  </Label>
                  <Input
                    placeholder="https://chamados.exemplo.com/123"
                    value={selected.qrLink || ""}
                    onChange={(e) =>
                      updateItem(selected.id, { qrLink: e.target.value })
                    }
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Se preenchido, o QR aponta para este link em vez do conteúdo.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={selected.title || ""}
                    onChange={(e) => updateItem(selected.id, { title: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Subtítulo</Label>
                  <Input
                    value={selected.subtitle || ""}
                    onChange={(e) =>
                      updateItem(selected.id, { subtitle: e.target.value })
                    }
                  />
                </div>
              </div>

              {(selected.type ?? config.type) === "barcode" && (
                <div>
                  <Label className="text-xs">Formato (global)</Label>
                  <Select
                    value={config.barcodeFormat}
                    onValueChange={(v) => update("barcodeFormat", v as never)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["CODE128", "EAN13", "EAN8", "UPC", "CODE39", "ITF14"].map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Layout + Presets */}
        <section className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Layout</h3>
            <SliderRow label="Largura" suffix="mm" value={config.width} min={20} max={200}
              onChange={(v) => update("width", v)} />
            <SliderRow label="Altura" suffix="mm" value={config.height} min={20} max={200}
              onChange={(v) => update("height", v)} />
            <SliderRow label="Fonte" suffix="pt" value={config.fontSize} min={6} max={24}
              onChange={(v) => update("fontSize", v)} />
            <SliderRow label="Padding" suffix="mm" value={config.padding} min={0} max={20}
              onChange={(v) => update("padding", v)} />
            <div>
              <Label className="text-xs">Alinhamento</Label>
              <Select value={config.align} onValueChange={(v) => update("align", v as never)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Esquerda</SelectItem>
                  <SelectItem value="center">Centro</SelectItem>
                  <SelectItem value="right">Direita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Cor</Label>
                <input type="color" value={config.fg}
                  onChange={(e) => update("fg", e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-md border border-input bg-background" />
              </div>
              <div>
                <Label className="text-xs">Fundo</Label>
                <input type="color" value={config.bg}
                  onChange={(e) => update("bg", e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-md border border-input bg-background" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Mostrar valor</Label>
              <Switch checked={config.showValue}
                onCheckedChange={(v) => update("showValue", v)} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Presets de layout</h3>
            <div className="flex gap-2">
              <Input value={presetName} onChange={(e) => setPresetName(e.target.value)}
                placeholder="Nome" />
              <Button onClick={savePreset} size="icon" variant="outline">
                <Save />
              </Button>
            </div>
            {presets.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Salve combinações de layout para reutilizar.
              </p>
            )}
            <div className="space-y-1">
              {presets.map((p) => (
                <div key={p.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <button onClick={() => loadPreset(p.id)} className="text-sm font-medium hover:underline">
                    {p.name}
                  </button>
                  <button onClick={() => removePreset(p.id)}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Tudo no seu navegador — nada é enviado para servidores.
      </footer>
    </div>
  );
}

async function exportMixed(
  items: BatchItem[],
  cfg: LabelConfig,
  print: PrintConfig,
  filename = `etiquetas-${items.length}.pdf`,
) {
  const { jsPDF } = await import("jspdf");
  const { renderToCanvas } = await import("@/lib/codegen");
  const orient = print.orientation;
  const pw = orient === "landscape" ? print.pageH : print.pageW;
  const ph = orient === "landscape" ? print.pageW : print.pageH;
  const doc = new jsPDF({
    unit: "mm",
    format: [pw, ph],
    orientation: orient,
  });
  const pageW = pw, pageH = ph, margin = print.margin, gap = print.gap;
  const W = cfg.width, H = cfg.height;
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
      type: it.type ?? cfg.type,
      title: it.title ?? cfg.title,
      subtitle: it.subtitle ?? cfg.subtitle,
    };
    await renderToCanvas(canvas, it.value, itemCfg);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", x, y, W, H);
  }
  doc.save(filename);
}

function SliderRow({
  label, value, min, max, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number; suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value}{suffix}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={1}
        onValueChange={(v) => onChange(v[0])} />
    </div>
  );
}
