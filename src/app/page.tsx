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
  ArrowRight,
  Globe,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Settings,
  TrendingUp,
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Gestion des biens",
    description:
      "Appartements, maisons, locaux commerciaux. Photos, adresse, loyer, statut — tout centralise.",
  },
  {
    icon: Users,
    title: "Suivi des locataires",
    description:
      "Contrats de bail, CNI, coordonnees, historique des paiements. Un dossier complet par locataire.",
  },
  {
    icon: CreditCard,
    title: "Paiements et impayes",
    description:
      "Enregistrez les encaissements, suivez les retards et identifiez les impayes en un coup d'oeil.",
  },
  {
    icon: FileText,
    title: "Quittances PDF",
    description:
      "Generez des quittances de loyer officielles en un clic. Numerotees, datees, pret a envoyer.",
  },
  {
    icon: Globe,
    title: "Mini-site public",
    description:
      "Chaque agence dispose d'une page publique avec ses biens disponibles, partageables sur WhatsApp.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord",
    description:
      "Taux d'occupation, revenus du mois, impayes, membres actifs. Tous vos KPIs en temps reel.",
  },
  {
    icon: Users,
    title: "Gestion d'equipe",
    description:
      "Invitez des agents, managers ou comptables. Chaque role a ses propres acces et permissions.",
  },
  {
    icon: Bell,
    title: "Rappels automatiques",
    description:
      "Envoyez des rappels de paiement par SMS et email. Ne courez plus apres vos locataires.",
  },
  {
    icon: Smartphone,
    title: "100% mobile",
    description:
      "Interface pensee pour le mobile. Gerez votre patrimoine depuis votre telephone, partout.",
  },
];

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Creez votre compte",
    description: "Inscrivez-vous en 2 minutes. Aucune carte bancaire requise pour demarrer.",
  },
  {
    number: "02",
    icon: Settings,
    title: "Ajoutez vos biens",
    description: "Renseignez vos biens, locataires et contrats. Import facile depuis vos fichiers existants.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Pilotez sereinement",
    description: "Suivez vos paiements, generez vos quittances et gardez le controle de votre patrimoine.",
  },
];

const pricing = [
  {
    name: "Gratuit",
    price: "0",
    period: "FCFA/mois",
    subtitle: "Pour decouvrir la plateforme",
    features: [
      "1 bien maximum",
      "1 utilisateur",
      "Gestion des locataires",
      "Quittances PDF",
      "Gestion d'equipe",
      "Mini-site public",
      "Historique d'activite",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    name: "Pro",
    price: "5 000",
    period: "FCFA/mois",
    subtitle: "Pour les proprietaires actifs",
    features: [
      "3 biens maximum",
      "3 utilisateurs",
      "Toutes les fonctionnalites",
      "Mini-site public",
      "Historique d'activite",
      "Support email",
    ],
    cta: "Essai gratuit 14 jours",
    popular: true,
  },
  {
    name: "Agence",
    price: "10 000",
    period: "FCFA/mois",
    subtitle: "Pour les agences immobilieres",
    features: [
      "15 biens maximum",
      "10 utilisateurs",
      "Toutes les fonctionnalites Pro",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    popular: false,
  },
  {
    name: "Entreprise",
    price: "20 000",
    period: "FCFA/mois",
    subtitle: "Pour les grands portefeuilles",
    features: [
      "Biens illimites",
      "Utilisateurs illimites",
      "Toutes les fonctionnalites",
      "Support dedie",
    ],
    cta: "Nous contacter",
    popular: false,
  },
];

const stats = [
  { value: "100%", label: "En ligne, accessible partout" },
  { value: "14j", label: "D'essai gratuit sans carte" },
  { value: "PDF", label: "Quittances conformes en 1 clic" },
  { value: "0 FCFA", label: "Pour commencer aujourd'hui" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Jappalé Immo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalites
            </a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Comment ca marche
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Connexion</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">S&apos;inscrire</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <ShieldCheck className="h-4 w-4" />
            Plateforme made for Senegal &amp; Afrique de l&apos;Ouest
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
            Gerez vos biens immobiliers{" "}
            <span className="text-primary">simplement</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Biens, locataires, paiements et quittances — tout en un seul endroit.
            Concu pour les proprietaires et agences au Senegal.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-base px-8 gap-2">
                Commencer gratuitement
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="text-base px-8">
                Voir les fonctionnalites
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Essai gratuit 14 jours · Aucune carte bancaire · Resiliable a tout moment
          </p>
        </div>
      </section>

      {/* Stats band */}
      <section className="border-y bg-white py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">Tout ce dont vous avez besoin</h2>
            <p className="mt-4 text-muted-foreground">
              Une solution complete pour gerer votre patrimoine immobilier au Senegal.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border bg-white hover:shadow-md transition-all hover:-translate-y-0.5"
              >
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">Demarrez en 3 etapes</h2>
            <p className="mt-4 text-muted-foreground">
              Aucune formation requise. Vous etes operationnel en quelques minutes.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.number} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] border-t-2 border-dashed border-primary/20" />
                )}
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground text-lg font-bold mb-4 relative z-10">
                  {step.number}
                </div>
                <h3 className="text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold">Tarifs simples et transparents</h2>
            <p className="mt-4 text-muted-foreground">
              Choisissez le plan adapte a votre besoin. Pas de frais caches. Changez de plan a tout moment.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-7 rounded-xl border bg-white flex flex-col ${
                  plan.popular
                    ? "border-primary shadow-xl ring-2 ring-primary/20 scale-[1.03]"
                    : "hover:shadow-md transition-shadow"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                    Le plus choisi
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{plan.subtitle}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="block mt-6">
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

      {/* CTA final */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold">Pret a simplifier votre gestion ?</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Rejoignez les proprietaires et agences qui gerent leur patrimoine avec Jappalé Immo.
            Aucune carte bancaire requise.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-base px-8 gap-2">
                Demarrer l&apos;essai gratuit
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Jappalé Immo</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs">
                La plateforme de gestion immobiliere pour le Senegal et l&apos;Afrique de l&apos;Ouest.
              </p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="text-sm font-semibold mb-3">Produit</p>
                <ul className="space-y-2">
                  <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Fonctionnalites</a></li>
                  <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Tarifs</a></li>
                  <li><a href="#how" className="text-sm text-muted-foreground hover:text-foreground">Comment ca marche</a></li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold mb-3">Compte</p>
                <ul className="space-y-2">
                  <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Connexion</Link></li>
                  <li><Link href="/register" className="text-sm text-muted-foreground hover:text-foreground">Inscription</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Jappalé Immo. Tous droits reserves.
            </p>
            <p className="text-sm text-muted-foreground">
              Fait avec ❤️ pour le Sénégal
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
