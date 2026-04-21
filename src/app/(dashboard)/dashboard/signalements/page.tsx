"use client";

import { useEffect, useState } from "react";
import { Wrench, Loader2 } from "lucide-react";

interface IssueRow {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  created_at: string;
  resolved_at: string | null;
  tenants: { first_name: string; last_name: string; phone: string } | null;
  properties: { title: string; address: string; city: string } | null;
}

const statusLabel: Record<string, string> = {
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
  CLOSED: "Fermé",
};

const statusClass: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-800",
};

const categoryLabel: Record<string, string> = {
  PLUMBING: "Plomberie",
  ELECTRICITY: "Électricité",
  APPLIANCE: "Appareils",
  HEATING: "Chauffage / clim",
  STRUCTURE: "Structure",
  OTHER: "Autre",
};

export default function SignalementsPage() {
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/dashboard/issues")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setIssues(data as IssueRow[]);
        } else {
          setError(data?.error ?? "Erreur inconnue");
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function updateStatus(id: string, status: IssueRow["status"]) {
    setUpdating(id);
    const res = await fetch(`/api/dashboard/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setIssues((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                status,
                resolved_at:
                  status === "RESOLVED" || status === "CLOSED"
                    ? new Date().toISOString()
                    : null,
              }
            : i
        )
      );
    }
    setUpdating(null);
  }

  const filtered = filter === "ALL" ? issues : issues.filter((i) => i.status === filter);

  const tabs = [
    { key: "ALL", label: `Tous (${issues.length})` },
    { key: "OPEN", label: `Ouverts (${issues.filter((i) => i.status === "OPEN").length})` },
    {
      key: "IN_PROGRESS",
      label: `En cours (${issues.filter((i) => i.status === "IN_PROGRESS").length})`,
    },
    {
      key: "RESOLVED",
      label: `Résolus (${issues.filter((i) => i.status === "RESOLVED").length})`,
    },
    {
      key: "CLOSED",
      label: `Fermés (${issues.filter((i) => i.status === "CLOSED").length})`,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Erreur : {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Wrench className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Signalements</h1>
          <p className="text-sm text-muted-foreground">
            Suivez les problèmes remontés par vos locataires.
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Wrench className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Aucun signalement dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => {
            const tenant = issue.tenants;
            const property = issue.properties;
            return (
              <div
                key={issue.id}
                className="bg-card border rounded-xl p-5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base">{issue.title}</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          statusClass[issue.status] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {statusLabel[issue.status] ?? issue.status}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {categoryLabel[issue.category] ?? issue.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tenant ? (
                        <>
                          <span className="font-medium text-foreground">
                            {tenant.first_name} {tenant.last_name}
                          </span>
                          {" · "}
                          <a href={`tel:${tenant.phone}`} className="hover:underline">
                            {tenant.phone}
                          </a>
                        </>
                      ) : (
                        "Locataire inconnu"
                      )}
                      {property && (
                        <>
                          {" · "}
                          {property.title} — {property.city}
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reçu le{" "}
                      {new Date(issue.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {issue.status === "OPEN" && (
                      <button
                        disabled={updating === issue.id}
                        onClick={() => updateStatus(issue.id, "IN_PROGRESS")}
                        className="text-sm font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-60"
                      >
                        {updating === issue.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Prendre en charge"
                        )}
                      </button>
                    )}
                    {issue.status === "IN_PROGRESS" && (
                      <button
                        disabled={updating === issue.id}
                        onClick={() => updateStatus(issue.id, "RESOLVED")}
                        className="text-sm font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-60"
                      >
                        {updating === issue.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Marquer résolu"
                        )}
                      </button>
                    )}
                    {(issue.status === "OPEN" || issue.status === "IN_PROGRESS") && (
                      <button
                        disabled={updating === issue.id}
                        onClick={() => updateStatus(issue.id, "CLOSED")}
                        className="text-sm font-medium border px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-60"
                      >
                        Fermer
                      </button>
                    )}
                    {(issue.status === "RESOLVED" || issue.status === "CLOSED") && (
                      <button
                        disabled={updating === issue.id}
                        onClick={() => updateStatus(issue.id, "OPEN")}
                        className="text-sm font-medium border px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-60"
                      >
                        Rouvrir
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap border-t pt-3">
                  {issue.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
