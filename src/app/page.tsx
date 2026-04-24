"use client";

import { useState } from "react";
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
  ChevronDown,
  Star,
  Quote,
  MessageCircle,
  Mail,
  Phone,
} from "lucide-react";

const features = [
  {
    icon: Building2,
    title: "Gestion des biens",
    description:
      "Appartements, maisons, locaux commerciaux, terrains. Photos, adresse, loyer, statut — tout centralisé.",
  },
  {
    icon: Users,
    title: "Suivi des locataires",
    description:
      "Contrats de bail, CNI, coordonnées, historique des paiements. Un dossier complet par locataire.",
  },
  {
    icon: CreditCard,
    title: "Paiements et impayés",
    description:
      "Enregistrez les encaissements, suivez les retards et identifiez les impayés en un coup d'œil.",
  },
  {
    icon: FileText,
    title: "Quittances PDF",
    description:
      "Générez des quittances de loyer officielles en un clic. Numérotées, datées, prêtes à envoyer.",
  },
  {
    icon: Globe,
    title: "Mini-site public",
    description:
      "Chaque agence dispose d'une page publique avec ses biens disponibles, partageable sur WhatsApp.",
  },
  {
    icon: BarChart3,
    title: "Tableau de bord",
    description:
      "Taux d'occupation, revenus du mois, impayés, membres actifs. Tous vos KPIs en temps réel.",
  },
  {
    icon: Users,
    title: "Gestion d'équipe",
    description:
      "Invitez agents, managers ou comptables. Chaque rôle a ses propres accès et permissions.",
  },
  {
    icon: Bell,
    title: "Rappels automatiques",
    description:
      "Rappels de paiement par WhatsApp. Ne courez plus après vos locataires, l'app s'en charge.",
  },
  {
    icon: Smartphone,
    title: "100 % mobile",
    description:
      "Interface pensée pour le mobile. Gérez votre patrimoine depuis votre téléphone, partout.",
  },
];

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Créez votre compte",
    description: "Inscrivez-vous en 2 minutes. Aucune carte bancaire requise pour démarrer.",
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
    description: "Suivez vos paiements, générez vos quittances et gardez le contrôle de votre patrimoine.",
  },
];

const pricing = [
  {
    name: "Gratuit",
    price: "0",
    period: "FCFA/mois",
    subtitle: "Pour découvrir la plateforme",
    features: [
      "1 bien maximum",
      "1 utilisateur",
      "Gestion des locataires",
      "Quittances PDF",
      "Mini-site public",
      "Historique d'activité",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    name: "Pro",
    price: "5 000",
    period: "FCFA/mois",
    subtitle: "Pour les propriétaires actifs",
    features: [
      "3 biens maximum",
      "3 utilisateurs",
      "Toutes les fonctionnalités",
      "Mini-site public",
      "Historique d'activité",
      "Support email",
    ],
    cta: "Essai gratuit 1 mois",
    popular: true,
  },
  {
    name: "Agence",
    price: "10 000",
    period: "FCFA/mois",
    subtitle: "Pour les agences immobilières",
    features: [
      "15 biens maximum",
      "10 utilisateurs",
      "Toutes les fonctionnalités Pro",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 1 mois",
    popular: false,
  },
  {
    name: "Entreprise",
    price: "20 000",
    period: "FCFA/mois",
    subtitle: "Pour les grands portefeuilles",
    features: [
      "Biens illimités",
      "Utilisateurs illimités",
      "Toutes les fonctionnalités",
      "Support dédié",
    ],
    cta: "Nous contacter",
    popular: false,
  },
];

const stats = [
  { value: "100 %", label: "En ligne, accessible partout" },
  { value: "1 mois", label: "D'essai gratuit sans carte" },
  { value: "PDF", label: "Quittances conformes en 1 clic" },
  { value: "0 FCFA", label: "Pour commencer aujourd'hui" },
];

const testimonials = [
  {
    name: "Aïssatou Diallo",
    role: "Propriétaire, 8 biens",
    city: "Dakar, Plateau",
    avatar: "AD",
    rating: 5,
    quote:
      "Avant j'utilisais un cahier et Excel. Maintenant je sais exactement qui a payé, qui est en retard, et je génère mes quittances en 1 clic. Ça m'a changé la vie.",
  },
  {
    name: "Moussa Diop",
    role: "Gérant d'agence",
    city: "Thiès",
    avatar: "MD",
    rating: 5,
    quote:
      "Le paiement par Wave et Orange Money, c'est exactement ce qu'il nous fallait. Pas de carte bancaire à chercher, tout se fait depuis le téléphone. Bravo !",
  },
  {
    name: "Fatou Sow",
    role: "Propriétaire, 3 biens",
    city: "Saint-Louis",
    avatar: "FS",
    rating: 5,
    quote:
      "Mon fils m'a installé l'app sur mon téléphone. Même pour moi qui ne suis pas technicienne, c'est très facile. Les rappels WhatsApp font gagner un temps fou.",
  },
];

const faqs = [
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "Vous disposez d'un mois d'essai gratuit sur tous nos plans payants, sans aucune carte bancaire requise. À la fin de l'essai, vous choisissez librement de continuer ou de rester sur le plan Gratuit.",
  },
  {
    q: "Comment se passe le paiement ?",
    a: "Le paiement se fait via Wave ou Orange Money — les moyens les plus utilisés au Sénégal. Vous envoyez le montant au numéro indiqué, puis soumettez votre référence de transaction. La validation se fait sous 24 h ouvrées.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Oui. Toutes vos données sont chiffrées et stockées sur des serveurs sécurisés. Chaque organisation est isolée : vos locataires et biens ne sont accessibles qu'à vous et aux membres que vous autorisez.",
  },
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui. Vous pouvez passer à un plan supérieur à tout moment. Pour une rétrogradation, contactez le support — nous vous aidons à migrer sans perdre de données.",
  },
  {
    q: "Que se passe-t-il si je ne renouvelle pas mon abonnement ?",
    a: "Vos données restent intactes. Votre compte repasse simplement en plan Gratuit (1 bien, 1 utilisateur). Vous pourrez renouveler à tout moment pour retrouver toutes les fonctionnalités.",
  },
  {
    q: "Puis-je ajouter des collaborateurs ?",
    a: "Absolument. Selon votre plan, vous pouvez inviter jusqu'à 10 membres (Agence) ou un nombre illimité (Entreprise). Chaque membre a un rôle précis : administrateur, manager, agent, comptable ou secrétaire.",
  },
  {
    q: "L'application fonctionne-t-elle sur mobile ?",
    a: "Oui, 100 % des fonctionnalités sont disponibles sur mobile. L'interface a été pensée pour les smartphones. Pas besoin d'installer d'application — tout se passe dans votre navigateur.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Par email à contact@jappaleimmo.com ou via WhatsApp au +33 7 45 86 26 02. Les plans Agence et Entreprise bénéficient d'un support prioritaire avec réponse sous quelques heures.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left hover:text-primary transition-colors"
      >
        <span className="font-medium">{q}</span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="pb-5 text-muted-foreground leading-relaxed">{a}</div>
      )}
    </div>
  );
}

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
              Fonctionnalités
            </a>
            <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Comment ça marche
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </a>
            <Link href="/aide" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Aide
            </Link>
            <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login?redirect=/locataire" className="hidden sm:block">
              <Button variant="ghost" size="sm">Espace locataire</Button>
            </Link>
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
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="container mx-auto px-4 text-center relative">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <ShieldCheck className="h-4 w-4" />
            Plateforme made for Sénégal &amp; Afrique de l&apos;Ouest
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
            Gérez vos biens immobiliers{" "}
            <span className="relative inline-block">
              <span className="text-primary">simplement</span>
              <span className="absolute bottom-1 left-0 w-full h-2 bg-primary/20 -z-10 rounded" />
            </span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Biens, locataires, paiements et quittances — tout en un seul endroit.
            Conçu pour les propriétaires et agences au Sénégal.
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
                Voir les fonctionnalités
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Essai gratuit 1 mois · Aucune carte bancaire · Résiliable à tout moment
          </p>

          {/* Paiement par */}
          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>Paiement par</span>
            <span className="font-semibold text-foreground">Wave</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="font-semibold text-orange-600">Orange Money</span>
          </div>
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
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
              Fonctionnalités
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Tout ce dont vous avez besoin</h2>
            <p className="mt-4 text-muted-foreground">
              Une solution complète pour gérer votre patrimoine immobilier au Sénégal.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-xl border bg-white hover:shadow-lg transition-all hover:-translate-y-1 hover:border-primary/30"
              >
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
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
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
              Démarrage
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Opérationnel en 3 étapes</h2>
            <p className="mt-4 text-muted-foreground">
              Aucune formation requise. Vous êtes autonome en quelques minutes.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={step.number} className="relative text-center">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] border-t-2 border-dashed border-primary/20" />
                )}
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground text-lg font-bold mb-4 relative z-10 shadow-lg shadow-primary/25">
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

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
              Témoignages
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">
              Ils nous font confiance
            </h2>
            <p className="mt-4 text-muted-foreground">
              Des propriétaires et agences du Sénégal qui ont simplifié leur gestion.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="p-6 rounded-xl border bg-white shadow-sm relative"
              >
                <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/10" />
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  « {t.quote} »
                </p>
                <div className="mt-6 pt-4 border-t flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.role} · {t.city}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
              Tarifs
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Simples et transparents</h2>
            <p className="mt-4 text-muted-foreground">
              Choisissez le plan adapté à votre besoin. Pas de frais cachés. Changez à tout moment.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-7 rounded-xl border bg-white flex flex-col ${
                  plan.popular
                    ? "border-primary shadow-xl ring-2 ring-primary/20 lg:scale-[1.03]"
                    : "hover:shadow-md transition-shadow"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap shadow">
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
          <p className="text-center text-sm text-muted-foreground mt-10">
            Paiement par Wave ou Orange Money · Validation sous 24 h · Sans engagement
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center">
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2">Questions fréquentes</h2>
            <p className="mt-4 text-muted-foreground">
              Vous ne trouvez pas votre réponse ? Contactez-nous directement.
            </p>
          </div>
          <div className="mt-12 border rounded-xl bg-white px-6">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>

          {/* Contact */}
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            <a
              href="https://wa.me/33745862602"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl border hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold">WhatsApp</p>
                <p className="text-xs text-muted-foreground">+33 7 45 86 26 02</p>
              </div>
            </a>
            <a
              href="mailto:contact@jappaleimmo.com"
              className="flex items-center gap-3 p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Email</p>
                <p className="text-xs text-muted-foreground">contact@jappaleimmo.com</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 bg-primary text-primary-foreground relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="container mx-auto px-4 text-center relative">
          <h2 className="text-3xl md:text-4xl font-bold">Prêt à simplifier votre gestion ?</h2>
          <p className="mt-4 text-primary-foreground/80 max-w-xl mx-auto">
            Rejoignez les propriétaires et agences qui gèrent leur patrimoine avec Jappalé Immo.
            Aucune carte bancaire requise.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="text-base px-8 gap-2">
                Démarrer l&apos;essai gratuit
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="https://wa.me/33745862602" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 gap-2 bg-transparent border-white/30 text-white hover:bg-white/10"
              >
                <MessageCircle className="h-4 w-4" />
                Nous contacter
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="max-w-xs">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg">Jappalé Immo</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                La plateforme de gestion immobilière pour le Sénégal et l&apos;Afrique de l&apos;Ouest.
              </p>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <a href="mailto:contact@jappaleimmo.com" className="flex items-center gap-2 hover:text-foreground">
                  <Mail className="h-4 w-4" />
                  contact@jappaleimmo.com
                </a>
                <a href="tel:+33745862602" className="flex items-center gap-2 hover:text-foreground">
                  <Phone className="h-4 w-4" />
                  +33 7 45 86 26 02
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div>
                <p className="text-sm font-semibold mb-3">Produit</p>
                <ul className="space-y-2">
                  <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Fonctionnalités</a></li>
                  <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Tarifs</a></li>
                  <li><a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</a></li>
                  <li><Link href="/aide" className="text-sm text-muted-foreground hover:text-foreground">Documentation</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold mb-3">Compte</p>
                <ul className="space-y-2">
                  <li><Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">Connexion</Link></li>
                  <li><Link href="/register" className="text-sm text-muted-foreground hover:text-foreground">Inscription</Link></li>
                  <li><Link href="/login?redirect=/locataire" className="text-sm text-muted-foreground hover:text-foreground">Espace locataire</Link></li>
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold mb-3">Légal</p>
                <ul className="space-y-2">
                  <li><Link href="/cgu" className="text-sm text-muted-foreground hover:text-foreground">CGU</Link></li>
                  <li><Link href="/confidentialite" className="text-sm text-muted-foreground hover:text-foreground">Confidentialité</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 Jappalé Immo. Tous droits réservés.
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
