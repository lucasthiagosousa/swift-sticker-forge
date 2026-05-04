import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LabelPreview } from "@/components/LabelPreview";
import { defaultConfig, type LabelConfig } from "@/lib/codegen";
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
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({ component: Index });

interface Preset {
  id: string;
  name: string;
  config: LabelConfig;
}

const LS_PRESETS = "etiqueta.presets";
const LS_CONFIG = "etiqueta.config";

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
  const [value, setValue] = useState("ETQ-0001");
  const [batch, setBatch] = useState("ETQ-0001\nETQ-0002\nETQ-0003");
  const [presets, setPresets] = useState<Preset[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(LS_PRESETS) || "[]");
    } catch {
      return [];
    }
  });
  const [presetName, setPresetName] = useState("");

  useEffect(() => {
    localStorage.setItem(LS_CONFIG, JSON.stringify(config));
  }, [config]);
  useEffect(() => {
    localStorage.setItem(LS_PRESETS, JSON.stringify(presets));
  }, [presets]);

  const update = <K extends keyof LabelConfig>(k: K, v: LabelConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const batchValues = useMemo(
    () => batch.split("\n").map((s) => s.trim()).filter(Boolean),
    [batch],
  );

  const savePreset = () => {
    if (!presetName.trim()) return toast.error("Dê um nome ao preset");
    const p: Preset = { id: crypto.randomUUID(), name: presetName.trim(), config };
    setPresets((arr) => [p, ...arr]);
    setPresetName("");
    toast.success("Preset salvo");
  };

  const loadPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (p) {
      setConfig(p.config);
      toast.success(`Preset "${p.name}" aplicado`);
    }
  };

  const removePreset = (id: string) =>
    setPresets((arr) => arr.filter((x) => x.id !== id));

  const onImportCSV = (file: File) => {
    Papa.parse(file, {
      complete: (res) => {
        const rows = (res.data as string[][])
          .flat()
          .map((s) => String(s).trim())
          .filter(Boolean);
        setBatch(rows.join("\n"));
        toast.success(`${rows.length} valores importados`);
      },
    });
  };

  const exportSingle = () =>
    exportLabelsPDF([value || " "], config, "etiqueta.pdf");
  const exportBatch = () => {
    if (!batchValues.length) return toast.error("Lista vazia");
    exportLabelsPDF(batchValues, config, `etiquetas-${batchValues.length}.pdf`);
  };
  const exportListCSV = () => {
    const csv = Papa.unparse(batchValues.map((v) => [v]));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lista.csv";
    a.click();
  };

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

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[380px_1fr]">
        {/* Editor */}
        <section className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex gap-2">
              <Button
                variant={config.type === "qrcode" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => update("type", "qrcode")}
              >
                <QrCode /> QR Code
              </Button>
              <Button
                variant={config.type === "barcode" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => update("type", "barcode")}
              >
                <Barcode /> Barras
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Conteúdo</Label>
                <Input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Texto, URL, código..."
                />
              </div>

              {config.type === "barcode" && (
                <div>
                  <Label className="text-xs">Formato</Label>
                  <Select
                    value={config.barcodeFormat}
                    onValueChange={(v) => update("barcodeFormat", v as never)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["CODE128", "EAN13", "EAN8", "UPC", "CODE39", "ITF14"].map(
                        (f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={config.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div>
                  <Label className="text-xs">Subtítulo</Label>
                  <Input
                    value={config.subtitle}
                    onChange={(e) => update("subtitle", e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Layout</h3>
            <SliderRow
              label="Largura"
              suffix="mm"
              value={config.width}
              min={20}
              max={200}
              onChange={(v) => update("width", v)}
            />
            <SliderRow
              label="Altura"
              suffix="mm"
              value={config.height}
              min={20}
              max={200}
              onChange={(v) => update("height", v)}
            />
            <SliderRow
              label="Fonte"
              suffix="pt"
              value={config.fontSize}
              min={6}
              max={24}
              onChange={(v) => update("fontSize", v)}
            />
            <SliderRow
              label="Padding"
              suffix="mm"
              value={config.padding}
              min={0}
              max={20}
              onChange={(v) => update("padding", v)}
            />
            <div>
              <Label className="text-xs">Alinhamento</Label>
              <Select
                value={config.align}
                onValueChange={(v) => update("align", v as never)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                <input
                  type="color"
                  value={config.fg}
                  onChange={(e) => update("fg", e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-md border border-input bg-background"
                />
              </div>
              <div>
                <Label className="text-xs">Fundo</Label>
                <input
                  type="color"
                  value={config.bg}
                  onChange={(e) => update("bg", e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-md border border-input bg-background"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Mostrar valor</Label>
              <Switch
                checked={config.showValue}
                onCheckedChange={(v) => update("showValue", v)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Presets</h3>
            <div className="flex gap-2">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Nome do preset"
              />
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
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <button
                    onClick={() => loadPreset(p.id)}
                    className="text-sm font-medium hover:underline"
                  >
                    {p.name}
                  </button>
                  <button
                    onClick={() => removePreset(p.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preview + batch */}
        <section className="space-y-6">
          <LabelPreview value={value} config={config} />

          <Tabs defaultValue="single" className="rounded-xl border border-border bg-card p-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Etiqueta única</TabsTrigger>
              <TabsTrigger value="batch">Lote</TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="pt-4">
              <Button onClick={exportSingle} className="w-full">
                <Download /> Exportar PDF
              </Button>
            </TabsContent>
            <TabsContent value="batch" className="space-y-3 pt-4">
              <div>
                <Label className="text-xs">
                  Lista ({batchValues.length} itens) — um por linha
                </Label>
                <Textarea
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportBatch} className="flex-1 min-w-[160px]">
                  <Download /> Exportar PDF em lote
                </Button>
                <label className="inline-flex">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && onImportCSV(e.target.files[0])
                    }
                  />
                  <Button asChild variant="outline">
                    <span>
                      <Upload /> Importar CSV
                    </span>
                  </Button>
                </label>
                <Button onClick={exportListCSV} variant="outline">
                  <FileDown /> Exportar lista
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        Tudo acontece no seu navegador — nada é enviado para servidores.
      </footer>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}
