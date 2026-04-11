import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  CreditCard,
  FileText,
  BarChart3,
  Bell,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Gestion des biens",
    description:
      "Ajoutez et gerez tous vos biens immobiliers : appartements, maisons, locaux commerciaux.",
  },
  {
    icon: Users,
    title: "Suivi des locataires",
    description:
      "Centralisez les informations de vos locataires, contrats de bail et historiques.",
  },
  {
    icon: CreditCard,
    title: "Paiements simplifies",
    description:
      "Enregistrez les paiements et suivez les impayes. Integration Wave et Orange Money.",
  },
  {
    icon: FileText,
    title: "Quittances automatiques",
    description:
      "Generez des quittances de loyer en PDF en un clic, conformes et professionnelles.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord",
    description:
      "Visualisez vos revenus, taux d'occupation et indicateurs cles en temps reel.",
  },
  {
    icon: Bell,
    title: "Rappels automatiques",
    description:
      "Envoyez des rappels de paiement par SMS et email automatiquement.",
  },
];

const pricing = [
  {
    name: "Gratuit",
    price: "0",
    period: "FCFA/mois",
    features: [
      "2 biens maximum",
      "Gestion des locataires",
      "Quittances PDF",
      "Tableau de bord basique",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    name: "Pro",
    price: "5 000",
    period: "FCFA/mois",
    features: [
      "20 biens maximum",
      "Toutes les fonctionnalites",
      "Rappels automatiques",
      "Paiement mobile",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    popular: true,
  },
  {
    name: "Agence",
    price: "15 000",
    period: "FCFA/mois",
    features: [
      "Biens illimites",
      "Multi-utilisateurs",
      "Rapports avances",
      "API access",
      "Support dedie",
    ],
    cta: "Nous contacter",
    popular: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Jappale Immo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Fonctionnalites
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Tarifs
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button>S&apos;inscrire</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            Gerez vos biens immobiliers{" "}
            <span className="text-primary">simplement</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            La plateforme de gestion immobiliere pensee pour le Senegal.
            Biens, locataires, paiements et quittances — tout en un seul endroit.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                Commencer gratuitement
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Decouvrir
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Gratuit jusqu&apos;a 2 biens. Aucune carte bancaire requise.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">
            Tout ce dont vous avez besoin
          </h2>
          <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
            Une solution complete pour gerer votre patrimoine immobilier au Senegal et en Afrique de l&apos;Ouest.
          </p>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <feature.icon className="h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center">
            Tarifs simples et transparents
          </h2>
          <p className="mt-4 text-center text-muted-foreground">
            Choisissez le plan adapte a votre besoin. Pas de frais caches.
          </p>
          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`p-8 rounded-xl border bg-white ${
                  plan.popular
                    ? "border-primary shadow-lg ring-2 ring-primary/20 scale-105"
                    : ""
                }`}
              >
                {plan.popular && (
                  <span className="inline-block bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full mb-4">
                    Populaire
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">
                    {plan.period}
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block mt-8">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-bold">Jappale Immo</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Jappale Immo. Tous droits reserves.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
