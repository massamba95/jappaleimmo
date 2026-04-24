export const metadata = {
  title: "Politique de confidentialité · Jappalé Immo",
};

export default function ConfidentialitePage() {
  return (
    <>
      <h1 className="text-3xl font-bold mb-2">Politique de confidentialité</h1>
      <p className="text-sm text-muted-foreground mb-8">Dernière mise à jour : 17 avril 2026</p>

      <p>
        La protection de vos données personnelles est au cœur de nos préoccupations. La présente
        politique de confidentialité décrit comment Jappalé Immo collecte, utilise, protège et
        partage vos données personnelles, conformément à la loi n° 2008-12 du 25 janvier 2008
        relative à la protection des données à caractère personnel au Sénégal et aux standards
        internationaux.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données est <strong>Jappalé Immo</strong>, joignable à
        l&apos;adresse <a href="mailto:contact@jappaleimmo.com" className="text-primary underline">
          contact@jappaleimmo.com
        </a>.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">2. Données collectées</h2>
      <h3 className="text-lg font-semibold mt-4 mb-2">2.1 Données des utilisateurs (vous)</h3>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li>Nom et prénom</li>
        <li>Adresse email</li>
        <li>Numéro de téléphone</li>
        <li>Adresse postale</li>
        <li>Mot de passe (chiffré)</li>
        <li>Nom de votre organisation</li>
        <li>Historique de connexion et d&apos;utilisation du Service</li>
      </ul>

      <h3 className="text-lg font-semibold mt-4 mb-2">2.2 Données saisies par vous</h3>
      <p>
        Dans le cadre de l&apos;utilisation du Service, vous pouvez saisir des données concernant
        des tiers (locataires, propriétaires, biens immobiliers). Vous êtes le responsable du
        traitement de ces données et devez obtenir le consentement des personnes concernées.
        Jappalé Immo agit uniquement en qualité de sous-traitant pour le stockage et le traitement
        de ces données :
      </p>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li>Informations sur les locataires (nom, téléphone, email, CNI)</li>
        <li>Informations sur les propriétaires</li>
        <li>Informations sur les biens (adresse, photos, loyers)</li>
        <li>Historique des paiements et des contrats</li>
      </ul>

      <h3 className="text-lg font-semibold mt-4 mb-2">2.3 Données de paiement</h3>
      <p>
        Les paiements sont effectués via Wave ou Orange Money. Jappalé Immo ne stocke <strong>aucune
        donnée bancaire</strong>. Seules les références de transaction sont enregistrées pour la
        validation.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">3. Finalités du traitement</h2>
      <p>Vos données sont collectées et traitées pour :</p>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li>Vous fournir l&apos;accès au Service et à ses fonctionnalités</li>
        <li>Gérer votre compte et votre abonnement</li>
        <li>Vous envoyer des notifications relatives au Service (expiration, rappels)</li>
        <li>Vous contacter en cas de besoin (support, sécurité)</li>
        <li>Améliorer le Service et ses fonctionnalités</li>
        <li>Respecter nos obligations légales</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">4. Base légale</h2>
      <p>Le traitement de vos données repose sur :</p>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li><strong>L&apos;exécution du contrat</strong> conclu entre vous et Jappalé Immo</li>
        <li><strong>Votre consentement</strong> pour certains traitements spécifiques</li>
        <li><strong>Notre intérêt légitime</strong> (sécurité du Service, lutte contre la fraude)</li>
        <li><strong>Nos obligations légales</strong> (comptabilité, données fiscales)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">5. Destinataires des données</h2>
      <p>Vos données peuvent être partagées avec :</p>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li>
          Les <strong>membres de votre organisation</strong> que vous avez invités (selon leur rôle)
        </li>
        <li>
          Nos <strong>prestataires techniques</strong> (hébergeur, base de données) dans le cadre
          strict de l&apos;exécution du Service
        </li>
        <li>Les <strong>autorités</strong> en cas de réquisition légale</li>
      </ul>
      <p className="mt-3">
        Nous ne vendons ni ne louons jamais vos données personnelles à des tiers à des fins
        commerciales.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">6. Durée de conservation</h2>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li><strong>Données de compte</strong> : tant que votre compte est actif, puis 3 ans après sa suppression pour obligations légales</li>
        <li><strong>Données de paiement</strong> : 10 ans (obligations comptables)</li>
        <li><strong>Logs techniques</strong> : 12 mois maximum</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">7. Sécurité</h2>
      <p>
        Jappalé Immo met en œuvre des mesures techniques et organisationnelles appropriées pour
        protéger vos données :
      </p>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li>Chiffrement des communications (HTTPS/TLS)</li>
        <li>Chiffrement des mots de passe (hashage)</li>
        <li>Isolation des données entre organisations</li>
        <li>Contrôle d&apos;accès strict au niveau de la base de données</li>
        <li>Sauvegardes régulières</li>
        <li>Hébergement chez des prestataires reconnus (Vercel, Supabase)</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">8. Vos droits</h2>
      <p>Conformément à la loi sénégalaise sur la protection des données, vous disposez des droits suivants :</p>
      <ul className="mt-2 space-y-1 list-disc pl-5">
        <li><strong>Droit d&apos;accès</strong> : obtenir la confirmation que des données vous concernant sont traitées et en obtenir une copie</li>
        <li><strong>Droit de rectification</strong> : corriger des données inexactes ou incomplètes</li>
        <li><strong>Droit à l&apos;effacement</strong> : demander la suppression de vos données</li>
        <li><strong>Droit d&apos;opposition</strong> : vous opposer au traitement de vos données</li>
        <li><strong>Droit à la portabilité</strong> : récupérer vos données dans un format structuré</li>
        <li><strong>Droit de retirer votre consentement</strong> à tout moment</li>
      </ul>
      <p className="mt-3">
        Pour exercer ces droits, écrivez-nous à{" "}
        <a href="mailto:contact@jappaleimmo.com" className="text-primary underline">
          contact@jappaleimmo.com
        </a>. Nous vous répondrons dans un délai maximal de 30 jours.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">9. Cookies</h2>
      <p>
        Jappalé Immo utilise uniquement des cookies strictement nécessaires au fonctionnement du
        Service (session utilisateur, sécurité). Aucun cookie publicitaire ou de suivi tiers
        n&apos;est utilisé.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">10. Transferts internationaux</h2>
      <p>
        Vos données peuvent être stockées sur des serveurs situés hors du Sénégal (États-Unis,
        Union Européenne, Singapour) dans le cadre des services de nos prestataires techniques
        (Vercel, Supabase). Ces prestataires offrent des garanties appropriées de protection des
        données.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">11. Commission de Protection des Données</h2>
      <p>
        En cas de préoccupation concernant le traitement de vos données personnelles, vous pouvez
        introduire une réclamation auprès de la{" "}
        <strong>Commission de Protection des Données Personnelles (CDP)</strong> du Sénégal :
      </p>
      <ul className="mt-2 space-y-1">
        <li><strong>Site web</strong> :{" "}
          <a href="https://www.cdp.sn" target="_blank" rel="noopener noreferrer" className="text-primary underline">
            www.cdp.sn
          </a>
        </li>
        <li><strong>Email</strong> : cdp@cdp.sn</li>
      </ul>

      <h2 className="text-xl font-semibold mt-8 mb-3">12. Modifications</h2>
      <p>
        Jappalé Immo se réserve le droit de modifier la présente politique de confidentialité à
        tout moment. Vous serez informé des modifications substantielles par email ou notification
        sur la plateforme.
      </p>

      <h2 className="text-xl font-semibold mt-8 mb-3">13. Contact</h2>
      <p>
        Pour toute question relative à la présente politique ou au traitement de vos données,
        contactez-nous à{" "}
        <a href="mailto:contact@jappaleimmo.com" className="text-primary underline">
          contact@jappaleimmo.com
        </a>.
      </p>
    </>
  );
}
