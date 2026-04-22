"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle, Plus, FileText, ClipboardList,
  CheckCircle2, AlertCircle, Clock, Wrench, TrendingDown,
} from "lucide-react";

interface AgencyInfo {
  name: string;
  phone: string | null;
}

interface AccountSituation {
  leaseNumber: string;
  propertyAddress: string;
  propertyCity: string;
  totalDue: number;
  nextDueDate: string | null;
}

interface IssueItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  OPEN:        { label: "Ouvert",   color: "bg-orange-100 text-orange-800" },
  IN_PROGRESS: { label: "En cours", color: "bg-blue-100 text-blue-800" },
  RESOLVED:    { label: "Résolu",   color: "bg-green-100 text-green-800" },
  CLOSED:      { label: "Fermé",    color: "bg-gray-100 text-gray-700" },
};

function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("221") ? digits : `221${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export default function LocataireHomePage() {
  const [firstName, setFirstName] = useState<string>("");
  const [agency, setAgency] = useState<AgencyInfo | null>(null);
  const [situation, setSituation] = useState<AccountSituation | null>(null);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [issueTotal, setIssueTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, org_id, first_name")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!tenant) { setLoading(false); return; }
      setFirstName(tenant.first_name ?? "");

      // Leases + payments + issues en parallèle
      const [leasesRes, issuesRes, orgRes] = await Promise.all([
        supabase
          .from("leases")
          .select("id, created_at, start_date, rent_amount, status, properties(title, address, city)")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("issues")
          .select("id, title, status, created_at")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("organizations")
          .select("name, memberships(role, status, profiles(phone))")
          .eq("id", tenant.org_id)
          .single(),
      ]);

      // Agence
      let phone: string | null = null;
      const orgAny = orgRes.data as unknown as { name?: string; memberships?: Array<{ role: string; status: string; profiles: { phone: string | null } | Array<{ phone: string | null }> | null }> } | null;
      if (orgAny?.memberships) {
        const m = orgAny.memberships.find((m) => m.role === "ADMIN" && m.status === "ACTIVE") ?? orgAny.memberships.find((m) => m.status === "ACTIVE");
        if (m) phone = Array.isArray(m.profiles) ? (m.profiles[0]?.phone ?? null) : (m.profiles?.phone ?? null);
      }
      setAgency({ name: orgAny?.name ?? "Jappalé Immo", phone });

      // Situation compte : bail actif ou le plus récent
      const allLeases = leasesRes.data ?? [];
      const activeLease = allLeases.find((l) => l.status === "ACTIVE") ?? allLeases[0] ?? null;

      if (activeLease) {
        const leaseIds = allLeases.map((l) => l.id);
        const { data: payments } = await supabase
          .from("payments")
          .select("id, lease_id, amount, due_date, status")
          .in("lease_id", leaseIds)
          .in("status", ["PENDING", "LATE", "PARTIAL"])
          .order("due_date", { ascending: true });

        const leaseRentMap = new Map(allLeases.map((l) => [l.id, l.rent_amount]));
        const totalDue = (payments ?? []).reduce((s, p) => {
          if (p.status === "PARTIAL") {
            const rentAmount = leaseRentMap.get(p.lease_id) ?? 0;
            return s + Math.max(0, rentAmount - p.amount);
          }
          return s + p.amount;
        }, 0);
        const nextDue = (payments ?? [])[0]?.due_date ?? null;

        const prop = Array.isArray(activeLease.properties)
          ? (activeLease.properties[0] ?? null)
          : (activeLease.properties as { title: string; address: string; city: string } | null);

        const leaseNumber = `BAI-${new Date(activeLease.created_at).getFullYear()}-${activeLease.id.slice(0, 6).toUpperCase()}`;
        setSituation({
          leaseNumber,
          propertyAddress: prop?.address ?? "",
          propertyCity: prop?.city ?? "",
          totalDue,
          nextDueDate: nextDue,
        });
      }

      // Demandes
      const allIssues = (issuesRes.data ?? []) as IssueItem[];
      setIssueTotal(allIssues.length);
      // Seulement les actives (OPEN / IN_PROGRESS) pour l'aperçu
      const activeIssues = allIssues.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").slice(0, 3);
      setIssues(activeIssues);

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;

  const contactMessage = `Bonjour ${agency?.name ?? ""},\n\nJe vous contacte via mon espace locataire.`;
  const whatsappUrl = agency?.phone ? buildWhatsAppUrl(agency.phone, contactMessage) : null;

  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* En-tête de bienvenue */}
      <div className="rounded-xl bg-primary/5 border border-primary/10 p-6 space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Bonjour {firstName} 👋</h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
          Ce portail vous facilite l&apos;accès à vos informations contractuelles et vous permet d&apos;interagir
          avec votre bailleur. Vous pouvez consulter votre contrat, télécharger vos documents, suivre vos
          paiements, nous signaler un problème et bien d&apos;autres fonctionnalités — tout pour fluidifier
          votre relation avec {agency?.name ?? "votre agence"}.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">

        {/* Situation du compte */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-primary" />
              Situation de votre compte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">{todayCap}</p>
            {situation ? (
              <>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold">Contrat n° {situation.leaseNumber}</p>
                  {situation.propertyAddress && (
                    <p className="text-sm text-muted-foreground">{situation.propertyAddress}</p>
                  )}
                  {situation.propertyCity && (
                    <p className="text-sm text-muted-foreground">{situation.propertyCity}</p>
                  )}
                </div>

                {situation.totalDue === 0 ? (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">Votre solde est à jour.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <TrendingDown className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-semibold">
                      Solde dû : {situation.totalDue.toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                )}

                {situation.nextDueDate && situation.totalDue > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Prochaine échéance :{" "}
                    {new Date(situation.nextDueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                )}

                <Link href="/locataire/paiements">
                  <Button variant="outline" size="sm" className="w-full mt-1">
                    Voir mes paiements
                  </Button>
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun contrat associé.</p>
            )}
          </CardContent>
        </Card>

        {/* Vos demandes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-5 w-5 text-primary" />
              Vos demandes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {issues.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span className="text-sm">Vous n&apos;avez pas de demande en cours.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {issues.map((issue) => {
                  const s = statusConfig[issue.status] ?? { label: issue.status, color: "bg-gray-100 text-gray-700" };
                  return (
                    <div key={issue.id} className="flex items-start justify-between gap-2 py-1.5 border-b last:border-0">
                      <div className="flex items-start gap-2 min-w-0">
                        <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                        <p className="text-sm font-medium truncate">{issue.title}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${s.color}`}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Link href="/locataire/signaler">
                <Button size="sm" className="w-full gap-1.5">
                  <Plus className="h-4 w-4" />
                  Faire une nouvelle demande
                </Button>
              </Link>
              {issueTotal > 0 && (
                <Link href="/locataire/signaler">
                  <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground">
                    <ClipboardList className="h-4 w-4" />
                    Historique de mes demandes ({issueTotal})
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Contact agence */}
      <Card>
        <CardContent className="py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-medium">Besoin d&apos;aide ?</p>
            <p className="text-sm text-muted-foreground">
              Contactez votre agence {agency?.name ? `· ${agency.name}` : ""}
            </p>
          </div>
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2">
                <MessageCircle className="h-4 w-4" />
                Contacter l&apos;agence
              </Button>
            </a>
          ) : (
            <Button disabled className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Contact indisponible
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
