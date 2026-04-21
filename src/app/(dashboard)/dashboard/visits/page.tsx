"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";

interface Visit {
  id: string;
  property_title: string;
  visitor_name: string;
  visitor_phone: string;
  visitor_email: string | null;
  requested_date: string;
  requested_time: string | null;
  message: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";
  created_at: string;
}

const statusLabel: Record<string, string> = {
  PENDING:   "En attente",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
  DONE:      "Effectuée",
};

const statusClass: Record<string, string> = {
  PENDING:   "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  DONE:      "bg-green-100 text-green-800",
};

export default function VisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/dashboard/visits")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setVisits(data);
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

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await fetch(`/api/dashboard/visits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setVisits((prev) => prev.map((v) => (v.id === id ? { ...v, status: status as Visit["status"] } : v)));
    setUpdating(null);
  }

  const filtered = filter === "ALL" ? visits : visits.filter((v) => v.status === filter);

  const tabs = [
    { key: "ALL",       label: `Toutes (${visits.length})` },
    { key: "PENDING",   label: `En attente (${visits.filter(v => v.status === "PENDING").length})` },
    { key: "CONFIRMED", label: `Confirmées (${visits.filter(v => v.status === "CONFIRMED").length})` },
    { key: "DONE",      label: `Effectuées (${visits.filter(v => v.status === "DONE").length})` },
    { key: "CANCELLED", label: `Annulées (${visits.filter(v => v.status === "CANCELLED").length})` },
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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Demandes de visite</h1>
          <p className="text-sm text-muted-foreground">Gérez les visites demandées depuis votre vitrine</p>
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
          <CalendarCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Aucune demande de visite dans cette catégorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((visit) => {
            const formattedDate = new Date(visit.requested_date).toLocaleDateString("fr-FR", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            });

            return (
              <div key={visit.id} className="bg-card border rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base">{visit.property_title}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass[visit.status] ?? "bg-muted text-muted-foreground"}`}>
                      {statusLabel[visit.status] ?? visit.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>
                      <span className="font-medium text-foreground">{visit.visitor_name}</span>
                      {" · "}
                      <a href={`tel:${visit.visitor_phone}`} className="hover:underline">{visit.visitor_phone}</a>
                      {visit.visitor_email && (
                        <> · <a href={`mailto:${visit.visitor_email}`} className="hover:underline">{visit.visitor_email}</a></>
                      )}
                    </p>
                    <p>{formattedDate}{visit.requested_time && ` à ${visit.requested_time}`}</p>
                    {visit.message && <p className="italic text-xs">"{visit.message}"</p>}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  {visit.status === "PENDING" && (
                    <>
                      <button
                        disabled={updating === visit.id}
                        onClick={() => updateStatus(visit.id, "CONFIRMED")}
                        className="text-sm font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-60"
                      >
                        {updating === visit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmer"}
                      </button>
                      <button
                        disabled={updating === visit.id}
                        onClick={() => updateStatus(visit.id, "CANCELLED")}
                        className="text-sm font-medium border px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-60"
                      >
                        Annuler
                      </button>
                    </>
                  )}
                  {visit.status === "CONFIRMED" && (
                    <>
                      <button
                        disabled={updating === visit.id}
                        onClick={() => updateStatus(visit.id, "DONE")}
                        className="text-sm font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-60"
                      >
                        {updating === visit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Effectuée"}
                      </button>
                      <button
                        disabled={updating === visit.id}
                        onClick={() => updateStatus(visit.id, "CANCELLED")}
                        className="text-sm font-medium border px-3 py-1.5 rounded-lg hover:bg-muted disabled:opacity-60"
                      >
                        Annuler
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
