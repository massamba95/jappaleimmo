import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_TYPES = ["APARTMENT", "HOUSE", "COMMERCIAL", "LAND"];
const VALID_LISTINGS = ["RENT", "SALE", "BOTH"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { rows } = await req.json();
  let imported = 0;
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    if (!row.titre?.trim()) { errors.push({ row: rowNum, message: "Le titre est requis" }); continue; }
    const type = row.type?.trim().toUpperCase();
    if (!VALID_TYPES.includes(type)) { errors.push({ row: rowNum, message: `Type invalide (${type}). Valeurs: ${VALID_TYPES.join(", ")}` }); continue; }
    const listing_type = row.annonce?.trim().toUpperCase();
    if (!VALID_LISTINGS.includes(listing_type)) { errors.push({ row: rowNum, message: `Annonce invalide (${listing_type}). Valeurs: ${VALID_LISTINGS.join(", ")}` }); continue; }
    if ((listing_type === "RENT" || listing_type === "BOTH") && !row.loyer) { errors.push({ row: rowNum, message: "Le loyer est requis pour une location" }); continue; }
    if ((listing_type === "SALE" || listing_type === "BOTH") && !row.prix_vente) { errors.push({ row: rowNum, message: "Le prix de vente est requis pour une vente" }); continue; }

    const { error } = await supabase.from("properties").insert({
      user_id: user.id,
      org_id: membership.org_id,
      title: row.titre.trim(),
      type,
      listing_type,
      city: row.ville?.trim() || "",
      address: row.adresse?.trim() || "",
      rooms: row.pieces ? parseInt(row.pieces) || null : null,
      area: row.superficie ? parseFloat(row.superficie) || null : null,
      rent_amount: row.loyer ? parseInt(row.loyer) || 0 : 0,
      charges: row.charges ? parseInt(row.charges) || 0 : 0,
      sale_price: row.prix_vente ? parseInt(row.prix_vente) || null : null,
      status: "AVAILABLE",
      photos: [],
    });

    if (error) {
      errors.push({ row: rowNum, message: error.message.includes("Limite") ? error.message : "Erreur d'insertion" });
    } else {
      imported++;
    }
  }

  return NextResponse.json({ imported, errors });
}
