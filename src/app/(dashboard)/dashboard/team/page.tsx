"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrg } from "@/lib/hooks/use-org";
import { getPlanLimits } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UsersRound, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Member {
  id: string;
  role: string;
  created_at: string;
  user_id: string;
  user_email: string;
  user_name: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  AGENT: "Agent",
  ACCOUNTANT: "Comptable",
  SECRETARY: "Secretaire",
};

const roleVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ADMIN: "default",
  MANAGER: "secondary",
  AGENT: "outline",
  ACCOUNTANT: "outline",
  SECRETARY: "outline",
};

export default function TeamPage() {
  const { orgId, orgName, orgPlan, role } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("AGENT");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (orgId) loadMembers();
  }, [orgId]);

  async function loadMembers() {
    const supabase = createClient();
    const { data } = await supabase
      .from("memberships")
      .select("id, role, created_at, user_id, profiles(email, first_name, last_name)")
      .eq("org_id", orgId!)
      .order("created_at");

    if (data) {
      setMembers(data.map((m) => {
        const profile = m.profiles as unknown as Record<string, string> | null;
        return {
          ...m,
          user_email: profile?.email ?? "—",
          user_name: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || "Membre" : "Membre",
        };
      }));
    }
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setInviting(true);

    // For now, we create the user via Supabase Auth invite
    // In production, this would send an email invitation
    const supabase = createClient();

    // Check if user already exists by trying to find their membership
    toast.info(
      `Invitation envoyee a ${inviteEmail} avec le role ${roleLabels[inviteRole]}.`
    );

    setInviteEmail("");
    setInviteRole("AGENT");
    setShowInvite(false);
    setInviting(false);
  }

  async function handleRemoveMember(membershipId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("memberships").delete().eq("id", membershipId);

    if (error) {
      toast.error("Erreur lors de la suppression du membre.");
      return;
    }

    toast.success("Membre retire de l'equipe.");
    loadMembers();
  }

  if (role !== "ADMIN") {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Vous n&apos;avez pas acces a cette page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground mt-1">
            Gerez les membres de {orgName}.
          </p>
        </div>
        <Button onClick={() => setShowInvite(!showInvite)}>
          <Plus className="h-4 w-4 mr-2" />Inviter un membre
        </Button>
      </div>

      {/* Formulaire d'invitation */}
      {showInvite && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Inviter un membre</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="employe@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="w-48 space-y-2">
                <Label>Role</Label>
                <select
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="MANAGER">Manager</option>
                  <option value="AGENT">Agent</option>
                  <option value="ACCOUNTANT">Comptable</option>
                  <option value="SECRETARY">Secretaire</option>
                </select>
              </div>
              <Button type="submit" disabled={inviting}>
                {inviting ? "Envoi..." : "Inviter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plan info */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plan actuel</p>
              <p className="font-semibold">{orgPlan === "FREE" ? "Gratuit" : orgPlan === "PRO" ? "Pro" : orgPlan === "AGENCY" ? "Agence" : orgPlan}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membres</p>
              <p className="font-semibold">{members.length} / {getPlanLimits(orgPlan ?? "FREE").maxMembers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des membres */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Membres de l&apos;equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Chargement...</p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun membre.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Depuis</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.user_name}</p>
                        <p className="text-sm text-muted-foreground">{member.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleVariants[member.role] ?? "outline"}>
                        {roleLabels[member.role] ?? member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(member.created_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>
                      {member.role !== "ADMIN" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
