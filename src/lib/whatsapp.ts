const typeLabels: Record<string, string> = {
  APARTMENT: "Appartement",
  HOUSE: "Maison",
  COMMERCIAL: "Local commercial",
  LAND: "Terrain",
};

interface PropertyForShare {
  title: string;
  type: string;
  address: string;
  city: string;
  rooms: number | null;
  area: number | null;
  rent_amount: number;
  sale_price?: number | null;
  listing_type?: string;
  status: string;
}

export function generateWhatsAppMessage(property: PropertyForShare, orgName: string, phone?: string): string {
  const type = typeLabels[property.type] ?? property.type;
  const rooms = property.rooms ? `${property.rooms} pieces` : "";
  const area = property.area ? `${property.area} m2` : "";
  const details = [type, rooms, area].filter(Boolean).join(" - ");

  const isSale = property.listing_type === "SALE";
  const isBoth = property.listing_type === "BOTH";
  const statusLabel = property.status === "AVAILABLE" ? "Disponible immediatement" : "Occupe";

  let message = `*${property.title}*\n\n`;
  message += `${details}\n`;
  message += `${property.address}, ${property.city}\n\n`;

  if (isSale) {
    if (property.sale_price) {
      message += `*${property.sale_price.toLocaleString("fr-FR")} FCFA*\n`;
    }
    message += `A vendre\n\n`;
  } else if (isBoth) {
    message += `*${property.rent_amount.toLocaleString("fr-FR")} FCFA / mois* (location)\n`;
    if (property.sale_price) {
      message += `*${property.sale_price.toLocaleString("fr-FR")} FCFA* (vente)\n`;
    }
    message += `${statusLabel}\n\n`;
  } else {
    message += `*${property.rent_amount.toLocaleString("fr-FR")} FCFA / mois*\n`;
    message += `A louer · ${statusLabel}\n\n`;
  }

  message += `${orgName}`;
  if (phone) message += `\nContact : ${phone}`;

  return message;
}

export function getWhatsAppShareUrl(message: string, phoneNumber?: string): string {
  const encoded = encodeURIComponent(message);
  if (phoneNumber) {
    const clean = phoneNumber.replace(/[^0-9]/g, "");
    return `https://wa.me/${clean}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function generateFacebookPost(property: PropertyForShare, orgName: string): string {
  const type = typeLabels[property.type] ?? property.type;
  const isSale = property.listing_type === "SALE";
  const isBoth = property.listing_type === "BOTH";

  let post = `${type} ${isSale ? "a vendre" : "a louer"} - ${property.title}\n\n`;
  post += `${property.address}, ${property.city}\n`;
  if (property.rooms) post += `${property.rooms} pieces`;
  if (property.area) post += ` - ${property.area} m2`;
  post += "\n\n";

  if (isSale) {
    if (property.sale_price) {
      post += `Prix : ${property.sale_price.toLocaleString("fr-FR")} FCFA\n\n`;
    }
  } else {
    post += `Loyer : ${property.rent_amount.toLocaleString("fr-FR")} FCFA / mois\n`;
    if (isBoth && property.sale_price) {
      post += `Prix de vente : ${property.sale_price.toLocaleString("fr-FR")} FCFA\n`;
    }
    post += "\n";
  }

  post += `Contactez ${orgName} pour plus d'informations.`;
  return post;
}
