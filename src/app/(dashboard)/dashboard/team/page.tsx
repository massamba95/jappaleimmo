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
import { UsersRound, Plus, Trash2, AlertTriangle } from "lucide-react";
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
  const { orgId, orgName, orgPlan, role, userId } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("AGENT");
  const [inviting, setInviting] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");

  const limits = getPlanLimits(orgPlan ?? "FREE");
  const canAddMore = members.length < limits.maxMembers;

  useEffect(() => {
    if (orgId) {
      loadMembers();
      loadInviteCode();
    }
  }, [orgId]);

  async function loadInviteCode() {
    const supabase = createClient();
    const { data } = await supabase
      .from("organizations")
      .select("invite_code")
      .eq("id", orgId!)
      .single();
    if (data?.invite_code) setInviteCode(data.invite_code);
  }

  async function loadMembers() {
    const supabase = createClient();
    const { data } = await supabase
      .from("memberships")
      .select("id, role, created_at, user_id")
      .eq("org_id", orgId!)
      .order("created_at");

    if (data && data.length > 0) {
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, first_name, last_name")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p])
      );

      setMembers(data.map((m) => {
        const profile = profileMap.get(m.user_id);
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
    if (!orgId || !canAddMore) return;
    setInviting(true);

    // Verifier si l'email existe deja dans les profils
    const supabase = createClient();
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", inviteEmail)
      .single();

    if (existingProfile) {
      // L'utilisateur existe, l'ajouter directement
      const { error } = await supabase.from("memberships").insert({
        org_id: orgId,
        user_id: existingProfile.id,
        role: inviteRole,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("Cet utilisateur est deja membre de l'equipe.");
        } else {
          toast.error("Erreur lors de l'ajout du membre.");
        }
      } else {
        toast.success(`${inviteEmail} ajoute avec le role ${roleLabels[inviteRole]}.`);
        loadMembers();
      }
    } else {
      toast.error("Aucun compte trouve avec cet email. L'utilisateur doit d'abord creer un compte sur Jappale Immo.");
    }

    setInviteEmail("");
    setInviteRole("AGENT");
    setShowInvite(false);
    setInviting(false);
  }

  async function handleChangeRole(membershipId: string, newRole: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("memberships")
      .update({ role: newRole })
      .eq("id", membershipId);

    if (error) {
      toast.error("Erreur lors du changement de role.");
    } else {
      toast.success("Role modifie avec succes.");
      setChangingRole(null);
      loadMembers();
    }
  }

  async function handleRemoveMember(membershipId: string) {
    if (deleting !== membershipId) {
      setDeleting(membershipId);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("memberships").delete().eq("id", membershipId);

    if (error) {
      toast.error("Erreur lors de la suppression du membre.");
    } else {
      toast.success("Membre retire de l'equipe.");
      setDeleting(null);
      loadMembers();
    }
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
          <p className="text-muted-foreground mt-1">Gerez les membres de {orgName}.</p>
        </div>
        {canAddMore ? (
          <Button onClick={() => setShowInvite(!showInvite)}>
            <Plus className="h-4 w-4 mr-2" />Ajouter un membre
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Limite de {limits.maxMembers} membre(s) atteinte
          </div>
        )}
      </div>

      {/* Formulaire d'invitation */}
      {showInvite && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Ajouter un membre</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              L&apos;utilisateur doit deja avoir un compte sur Jappale Immo. Entrez son email pour l&apos;ajouter a votre equipe.
            </p>
            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="email">Email de l&apos;employe</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="employe@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="w-full sm:w-48 space-y-2">
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
                {inviting ? "Ajout..." : "Ajouter"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Code d'invitation */}
      {inviteCode && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Code d&apos;invitation</p>
                <p className="text-2xl font-mono font-bold tracking-widest">{inviteCode}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Partagez ce code avec vos employes pour qu&apos;ils rejoignent votre equipe lors de leur inscription.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(inviteCode);
                  toast.success("Code copie !");
                }}
              >
                Copier
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan info */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plan actuel</p>
              <p className="font-semibold">{limits.label}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membres</p>
              <p className="font-semibold">{members.length} / {limits.maxMembers}</p>
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
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isCurrentUser = member.user_id === userId;
                  const isAdmin = member.role === "ADMIN";
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{member.user_name}</p>
                          <p className="text-sm text-muted-foreground">{member.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {changingRole === member.id ? (
                          <select
                            className="h-8 rounded border border-input bg-background px-2 text-sm"
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value)}
                            onBlur={() => setChangingRole(null)}
                            autoFocus
                          >
                            <option value="ADMIN">Administrateur</option>
                            <option value="MANAGER">Manager</option>
                            <option value="AGENT">Agent</option>
                            <option value="ACCOUNTANT">Comptable</option>
                            <option value="SECRETARY">Secretaire</option>
                          </select>
                        ) : (
                          <Badge
                            variant={roleVariants[member.role] ?? "outline"}
                            className={!isCurrentUser && !isAdmin ? "cursor-pointer" : ""}
                            onClick={() => !isCurrentUser && !isAdmin && setChangingRole(member.id)}
                          >
                            {roleLabels[member.role] ?? member.role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(member.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        {!isCurrentUser && !isAdmin && (
                          <div className="flex items-center gap-1">
                            {deleting === member.id ? (
                              <div className="flex gap-1">
                                <Button variant="destructive" size="sm" onClick={() => handleRemoveMember(member.id)}>Confirmer</Button>
                                <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>Non</Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        )}
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground">Vous</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
