"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home, MapPin, CalendarDays, CreditCard, MessageCircle,
  TrendingDown, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";

interface Tenant {
  id: string;
  org_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
}

interface Property {
  id: string;
  title: string;
  address: string;
  city: string;
  rooms: number | null;
  area: number | null;
  photos: string[] | null;
}

interface Payment {
  id: string;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  method: string;
}

interface LeaseBlock {
  id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  deposit: number;
  status: string;
  property: Property | null;
  nextDue: Payment | null;
  totalDue: number;
  recentPayments: Payment[];
}

interface AgencyInfo {
  name: string;
  phone: string | null;
}

function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("221") ? digits : `221${digits}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export default function LocataireHomePage() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [leases, setLeases] = useState<LeaseBlock[]>([]);
  const [agency, setAgency] = useState<AgencyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: tenantData } = await supabase
        .from("tenants")
        .select("id, org_id, first_name, last_name, phone, email")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!tenantData) { setLoading(false); return; }
      setTenant(tenantData as Tenant);

      const { data: leasesData } = await supabase
        .from("leases")
        .select("id, start_date, end_date, rent_amount, deposit, status, properties(id, title, address, city, rooms, area, photos)")
        .eq("tenant_id", tenantData.id)
        .order("created_at", { ascending: false });

      const allLeases = leasesData ?? [];
      const leaseIds = allLeases.map((l) => l.id);

      const { data: allPayments } = leaseIds.length > 0
        ? await supabase
            .from("payments")
            .select("id, lease_id, amount, due_date, paid_date, status, method")
            .in("lease_id", leaseIds)
            .order("due_date", { ascending: true })
        : { data: [] };

      const paymentsByLease = new Map<string, Payment[]>();
      (allPayments ?? []).forEach((p) => {
        if (!paymentsByLease.has(p.lease_id)) paymentsByLease.set(p.lease_id, []);
        paymentsByLease.get(p.lease_id)!.push(p as Payment);
      });

      const blocks: LeaseBlock[] = allLeases.map((l) => {
        const property = Array.isArray(l.properties)
          ? ((l.properties[0] as unknown) as Property | undefined) ?? null
          : ((l.properties as unknown) as Property | null);

        const payments = paymentsByLease.get(l.id) ?? [];
        const nextDue = payments.find((p) => p.status === "PENDING" || p.status === "LATE") ?? null;
        const totalDue = payments
          .filter((p) => p.status === "PENDING" || p.status === "LATE")
          .reduce((sum, p) => sum + p.amount, 0);
        const recentPayments = [...payments].reverse().slice(0, 5);

        return { id: l.id, start_date: l.start_date, end_date: l.end_date, rent_amount: l.rent_amount, deposit: l.deposit, status: l.status, property, nextDue, totalDue, recentPayments };
      });

      // Actifs d'abord
      blocks.sort((a, b) => (a.status === "ACTIVE" ? -1 : 1) - (b.status === "ACTIVE" ? -1 : 1));
      setLeases(blocks);

      // Agence
      const { data: org } = await supabase
        .from("organizations")
        .select("name, memberships(role, status, profiles(phone))")
        .eq("id", tenantData.org_id)
        .single();

      let phone: string | null = null;
      const orgAny = org as unknown as { name?: string; memberships?: Array<{ role: string; status: string; profiles: { phone: string | null } | Array<{ phone: string | null }> | null }> } | null;
      if (orgAny?.memberships) {
        const m = orgAny.memberships.find((m) => m.role === "ADMIN" && m.status === "ACTIVE") ?? orgAny.memberships.find((m) => m.status === "ACTIVE");
        if (m) phone = Array.isArray(m.profiles) ? (m.profiles[0]?.phone ?? null) : (m.profiles?.phone ?? null);
      }
      setAgency({ name: orgAny?.name ?? "Jappalé Immo", phone });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Chargement...</p></div>;
  if (!tenant) return <div className="text-center py-20"><p>Locataire introuvable.</p></div>;

  const contactMessage = `Bonjour ${agency?.name ?? ""},\n\nJe vous contacte via mon espace locataire.`;
  const whatsappUrl = agency?.phone ? buildWhatsAppUrl(agency.phone, contactMessage) : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Bonjour {tenant.first_name} 👋</h1>
        <p className="text-muted-foreground mt-1">Bienvenue sur votre espace locataire.</p>
      </div>

      {leases.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun bail associé à votre compte.
          </CardContent>
        </Card>
      ) : (
        <>
          {leases.map((lease) => {
            const property = lease.property;
            const mainPhoto = property?.photos?.[0] ?? null;
            const isActive = lease.status === "ACTIVE";
            const dueStatus = !lease.nextDue
              ? { label: "À jour", tone: "bg-green-100 text-green-800" }
              : lease.nextDue.status === "LATE"
              ? { label: "En retard", tone: "bg-red-100 text-red-800" }
              : { label: "En attente", tone: "bg-yellow-100 text-yellow-800" };

            return (
              <div key={lease.id} className="space-y-4">
                {leases.length > 1 && (
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-base">{property?.title ?? "Bail"}</h2>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "Actif" : "Terminé"}
                    </Badge>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Logement */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-primary" />
                        Mon logement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {property ? (
                        <div className="flex flex-col sm:flex-row gap-4">
                          {mainPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mainPhoto} alt={property.title} className="w-full sm:w-48 h-40 object-cover rounded-lg" />
                          ) : (
                            <div className="w-full sm:w-48 h-40 rounded-lg bg-muted flex items-center justify-center">
                              <Home className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 space-y-2">
                            <h3 className="font-semibold text-lg">{property.title}</h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="h-4 w-4" />{property.address}, {property.city}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              {property.rooms && <Badge variant="secondary">{property.rooms} pièces</Badge>}
                              {property.area && <Badge variant="secondary">{property.area} m²</Badge>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Information non disponible.</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Prochaine échéance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        Prochaine échéance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {lease.nextDue ? (
                        <>
                          <p className="text-3xl font-bold">{lease.nextDue.amount.toLocaleString("fr-FR")} FCFA</p>
                          <p className="text-sm text-muted-foreground">
                            Échéance : {new Date(lease.nextDue.due_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                          </p>
                          <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${dueStatus.tone}`}>{dueStatus.label}</span>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-semibold">Aucune échéance en attente</p>
                          <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${dueStatus.tone}`}>{dueStatus.label}</span>
                        </>
                      )}
                      {lease.totalDue > 0 && (
                        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-destructive">
                          <TrendingDown className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-semibold">Solde dû : {lease.totalDue.toLocaleString("fr-FR")} FCFA</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Mon bail */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Mon bail
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Début</span>
                        <span className="font-medium">{new Date(lease.start_date).toLocaleDateString("fr-FR")}</span>
                      </div>
                      {lease.end_date && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Fin</span>
                          <span className="font-medium">{new Date(lease.end_date).toLocaleDateString("fr-FR")}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Loyer mensuel</span>
                        <span className="font-medium">{lease.rent_amount.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Caution</span>
                        <span className="font-medium">{lease.deposit.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                      <div className="pt-3">
                        <Link href="/locataire/paiements">
                          <Button variant="outline" size="sm" className="w-full">Voir mes paiements</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Historique récent */}
                  {lease.recentPayments.length > 0 && (
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <CreditCard className="h-5 w-5 text-primary" />
                          Historique récent
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {lease.recentPayments.map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                              <div className="flex items-center gap-3">
                                {p.status === "PAID" ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                  : p.status === "LATE" ? <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                                  : <Clock className="h-4 w-4 text-yellow-500 shrink-0" />}
                                <div>
                                  <p className="text-sm font-medium">
                                    {new Date(p.due_date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                                  </p>
                                  {p.status === "PAID" && p.paid_date && (
                                    <p className="text-xs text-muted-foreground">Payé le {new Date(p.paid_date).toLocaleDateString("fr-FR")}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{p.amount.toLocaleString("fr-FR")} FCFA</p>
                                <p className={`text-xs font-medium ${p.status === "PAID" ? "text-green-600" : p.status === "LATE" ? "text-destructive" : "text-yellow-600"}`}>
                                  {p.status === "PAID" ? "Payé" : p.status === "LATE" ? "En retard" : "En attente"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3">
                          <Link href="/locataire/paiements">
                            <Button variant="ghost" size="sm" className="w-full text-primary">Voir tous mes paiements →</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {leases.length > 1 && <hr className="border-border" />}
              </div>
            );
          })}
        </>
      )}

      {/* Contact agence */}
      <Card>
        <CardContent className="py-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-medium">Besoin d&apos;aide ?</p>
            <p className="text-sm text-muted-foreground">Contactez votre agence {agency?.name ? `· ${agency.name}` : ""}</p>
          </div>
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Button className="gap-2"><MessageCircle className="h-4 w-4" />Contacter l&apos;agence</Button>
            </a>
          ) : (
            <Button disabled className="gap-2"><MessageCircle className="h-4 w-4" />Contact indisponible</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
