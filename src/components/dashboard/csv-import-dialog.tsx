"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ImportType = "properties" | "tenants";

interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
}

const TEMPLATES: Record<ImportType, { headers: string[]; example: string[] }> = {
  properties: {
    headers: ["titre", "type", "annonce", "ville", "adresse", "pieces", "superficie", "loyer", "charges", "prix_vente"],
    example: ["Appartement F3 Plateau", "APARTMENT", "RENT", "Dakar", "Rue 10 Plateau", "3", "80", "250000", "15000", ""],
  },
  tenants: {
    headers: ["prenom", "nom", "telephone", "email", "cni"],
    example: ["Amadou", "Diallo", "+221771234567", "amadou@example.com", ""],
  },
};

const TYPE_LABELS: Record<ImportType, string> = {
  properties: "biens",
  tenants: "locataires",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

function downloadTemplate(type: ImportType) {
  const { headers, example } = TEMPLATES[type];
  const csv = [headers.join(","), example.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template_${type}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface CsvImportDialogProps {
  type: ImportType;
  onSuccess?: () => void;
}

export function CsvImportDialog({ type, onSuccess }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed);
      setResult(null);
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    if (!rows.length) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/import/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult(data);
      if (data.imported > 0) {
        toast.success(`${data.imported} ${TYPE_LABELS[type]} importés avec succès.`);
        onSuccess?.();
      }
    } catch {
      toast.error("Erreur lors de l'import.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setRows([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" />
        Importer CSV
      </Button>
    );
  }

  const headers = TEMPLATES[type].headers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Importer des {TYPE_LABELS[type]} via CSV</h2>
          <button onClick={() => { setOpen(false); reset(); }} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Étape 1 : template */}
          <div>
            <p className="text-sm font-medium mb-2">1. Téléchargez le modèle CSV</p>
            <Button variant="outline" size="sm" onClick={() => downloadTemplate(type)}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger le modèle
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              Colonnes : {headers.join(", ")}
            </p>
          </div>

          {/* Étape 2 : upload */}
          <div>
            <p className="text-sm font-medium mb-2">2. Chargez votre fichier CSV rempli</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-input file:text-sm file:bg-background file:cursor-pointer"
            />
          </div>

          {/* Prévisualisation */}
          {rows.length > 0 && !result && (
            <div>
              <p className="text-sm font-medium mb-2">{rows.length} ligne(s) détectée(s)</p>
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {headers.map((h) => (
                        <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {headers.map((h) => (
                          <td key={h} className="px-2 py-1 max-w-[120px] truncate">{row[h] || "—"}</td>
                        ))}
                      </tr>
                    ))}
                    {rows.length > 5 && (
                      <tr className="border-t">
                        <td colSpan={headers.length} className="px-2 py-1 text-muted-foreground text-center">
                          ... et {rows.length - 5} ligne(s) supplémentaire(s)
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Résultat */}
          {result && (
            <div className="space-y-2">
              {result.imported > 0 && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">{result.imported} {TYPE_LABELS[type]} importés avec succès.</span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="bg-destructive/10 p-3 rounded space-y-1">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{result.errors.length} erreur(s)</span>
                  </div>
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive ml-6">Ligne {e.row} : {e.message}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Fermer</Button>
          {rows.length > 0 && !result && (
            <Button onClick={handleImport} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Import en cours...</> : `Importer ${rows.length} ligne(s)`}
            </Button>
          )}
          {result && <Button onClick={reset}>Nouvel import</Button>}
        </div>
      </div>
    </div>
  );
}
