"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";
import { toast } from "sonner";

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

const categoryOptions: { value: string; label: string }[] = [
  { value: "PLUMBING", label: "Plomberie" },
  { value: "ELECTRICITY", label: "Électricité" },
  { value: "APPLIANCE", label: "Appareils" },
  { value: "HEATING", label: "Chauffage / clim" },
  { value: "STRUCTURE", label: "Structure" },
  { value: "OTHER", label: "Autre" },
];

const categoryLabels: Record<string, string> = Object.fromEntries(
  categoryOptions.map((o) => [o.value, o.label])
);

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  OPEN: { label: "Ouvert", variant: "outline" },
  IN_PROGRESS: { label: "En cours", variant: "secondary" },
  RESOLVED: { label: "Résolu", variant: "default" },
  CLOSED: { label: "Fermé", variant: "secondary" },
};

export default function LocataireSignalerPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);

  async function loadIssues() {
    setLoadingIssues(true);
    const res = await fetch("/api/locataire/issues");
    const data = await res.json();
    if (Array.isArray(data)) setIssues(data);
    setLoadingIssues(false);
  }

  useEffect(() => {
    loadIssues();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Le titre est requis.");
      return;
    }
    if (!description.trim()) {
      toast.error("La description est requise.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/locataire/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim().slice(0, 100),
          category,
          description: description.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erreur lors de l'envoi.");
        return;
      }
      toast.success("Signalement envoyé !");
      setTitle("");
      setDescription("");
      setCategory("OTHER");
      loadIssues();
    } catch {
      toast.error("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Signaler un problème</h1>
        <p className="text-muted-foreground mt-1">
          Décrivez le problème, votre agence en sera notifiée.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau signalement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                placeholder="Ex : fuite sous l'évier"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Décrivez le problème en détail..."
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Envoi..." : "Envoyer le signalement"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mes signalements</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingIssues ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              Chargement...
            </p>
          ) : issues.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Wrench className="h-10 w-10 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground mt-3">
                Aucun signalement pour le moment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => {
                const status = statusConfig[issue.status] ?? {
                  label: issue.status,
                  variant: "outline" as const,
                };
                return (
                  <div key={issue.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <p className="font-semibold">{issue.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabels[issue.category] ?? issue.category} ·{" "}
                          {new Date(issue.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {issue.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
