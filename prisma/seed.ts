import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// ---------------------------------------------------------------------------
// French author names
// ---------------------------------------------------------------------------

const AUTHORS = [
  'Dr. Sophie Martin',
  'Prof. Jean-Pierre Dubois',
  'Marie Lefevre',
  'Dr. Nicolas Petit',
  'Isabelle Bernard',
  'Dr. Antoine Moreau',
  'Francois Durand',
  'Claire Girard',
  'Dr. Philippe Lambert',
  'Catherine Roux',
  'Dr. Laurent Thomas',
  'Anne-Marie Faure',
  'Prof. Michel Robert',
  'Dr. Helene Simon',
  'Pierre Bonnet',
]

// ---------------------------------------------------------------------------
// Tags per category
// ---------------------------------------------------------------------------

const TAGS_BY_CATEGORY: Record<string, string[]> = {
  reglementation: [
    'RGPD', 'certification', 'HAS', 'donnees de sante', 'souverainete',
    'interoperabilite', 'securite', 'conformite', 'CNIL', 'hebergement',
  ],
  'etudes-rapports': [
    'e-sante', 'telemedecine', 'parcours de soins', 'MaSante2022', 'DMP',
    'statistiques', 'analyse', 'benchmark', 'innovation', 'numerique',
  ],
  'fiches-pratiques': [
    'DMP', 'SI hospitalier', 'interoperabilite', 'HL7', 'FHIR',
    'guide', 'implementation', 'bonnes pratiques', 'securite', 'formation',
  ],
  'veille-tech': [
    'IA', 'imagerie', 'IoT', 'cloud', 'cybersecurite',
    'blockchain', 'big data', 'machine learning', 'dispositifs medicaux', 'robotique',
  ],
  formations: [
    'RGPD', 'cybersecurite', 'formation', 'e-learning', 'certification',
    'interoperabilite', 'SI hospitalier', 'sensibilisation', 'competences', 'DPC',
  ],
  'compte-rendus': [
    'reunion', 'GT', 'assemblee', 'comite', 'strategie',
    'FSN', 'gouvernance', 'bilan', 'perspectives', 'vote',
  ],
}

// ---------------------------------------------------------------------------
// Document title/description templates per category
// ---------------------------------------------------------------------------

interface DocTemplate {
  title: string
  description: string
}

function generateReglementationDocs(): DocTemplate[] {
  const years = [2023, 2024, 2025, 2026]
  const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
  const docs: DocTemplate[] = []

  for (const y of years) {
    docs.push({
      title: `Arrete du 15 ${randomElement(months)} ${y} relatif aux systemes d'information de sante`,
      description: `Texte reglementaire definissant les exigences applicables aux SI de sante pour l'annee ${y}. Ce document precise les obligations des etablissements.`,
    })
    docs.push({
      title: `Decret n${y}-${randomInt(100, 999)} sur la protection des donnees de sante`,
      description: `Decret encadrant le traitement des donnees de sante a caractere personnel dans le cadre de la loi informatique et libertes.`,
    })
    docs.push({
      title: `Circulaire DGOS relative a la certification HAS ${y}`,
      description: `Circulaire du Ministere de la Sante detaillant les modalites de certification des etablissements de sante par la HAS.`,
    })
    docs.push({
      title: `Referentiel de securite des SI de sante - Version ${y}.${randomInt(1, 4)}`,
      description: `Mise a jour du referentiel national de securite des systemes d'information de sante. Nouvelles exigences et recommandations.`,
    })
  }

  docs.push(
    {
      title: 'Cadre juridique de l\'hebergement des donnees de sante (HDS)',
      description: 'Analyse complete du cadre juridique applicable aux hebergeurs de donnees de sante en France et en Europe.',
    },
    {
      title: 'Obligations RGPD pour les etablissements de sante',
      description: 'Guide reglementaire sur les obligations issues du RGPD specifiques au secteur de la sante.',
    },
    {
      title: 'Directive NIS2 : impacts sur le secteur sante',
      description: 'Analyse des consequences de la directive europeenne NIS2 pour les operateurs de services essentiels du secteur sante.',
    },
    {
      title: 'Reglementation des dispositifs medicaux connectes (MDR 2017/745)',
      description: 'Synthese du reglement europeen relatif aux dispositifs medicaux et ses implications pour les logiciels de sante.',
    },
    {
      title: 'Loi Rist : volet numerique en sante',
      description: 'Presentation des dispositions de la loi Rist relatives a la transformation numerique du systeme de sante.',
    },
    {
      title: 'Referentiel d\'interoperabilite des SI de sante (CI-SIS)',
      description: 'Document de reference pour l\'interoperabilite des systemes d\'information de sante en France.',
    },
    {
      title: 'Instruction DGOS sur la convergence des SI hospitaliers',
      description: 'Instruction ministerielle encadrant les projets de convergence des systemes d\'information hospitaliers.',
    },
    {
      title: 'Arrete portant approbation du referentiel de teleconsultation',
      description: 'Texte officiel approuvant le referentiel technique et organisationnel de la teleconsultation.',
    },
    {
      title: 'Note juridique : consentement patient et espace numerique de sante',
      description: 'Analyse juridique des conditions de recueil du consentement patient pour l\'alimentation de l\'ENS.',
    },
    {
      title: 'Code de la sante publique - Titre relatif aux SI',
      description: 'Compilation des articles du Code de la sante publique applicables aux systemes d\'information.',
    },
    {
      title: 'Reglement europeen sur l\'espace europeen des donnees de sante (EHDS)',
      description: 'Presentation et analyse du reglement europeen EHDS et de ses implications pour la France.',
    },
    {
      title: 'Ordonnance relative a la gouvernance de la e-sante',
      description: 'Ordonnance definissant le cadre de gouvernance de la sante numerique au niveau national et regional.',
    },
    {
      title: 'Referentiel d\'homologation des logiciels d\'aide a la prescription',
      description: 'Referentiel technique et fonctionnel pour l\'homologation des logiciels d\'aide a la prescription medicale.',
    },
    {
      title: 'Arrete fixant les conditions d\'exercice de la telesurveillance',
      description: 'Texte reglementaire encadrant les conditions techniques et organisationnelles de la telesurveillance medicale.',
    },
    {
      title: 'Deliberation CNIL n2024-089 relative aux traitements de donnees de sante',
      description: 'Deliberation de la CNIL precisant les conditions de traitement des donnees de sante pour la recherche.',
    },
    {
      title: 'Instruction sur le deploiement de l\'Identite Nationale de Sante (INS)',
      description: 'Instruction ministerielle detaillant les modalites de deploiement de l\'INS dans les etablissements de sante.',
    },
    {
      title: 'Cadre reglementaire de l\'utilisation de l\'IA dans les dispositifs medicaux',
      description: 'Analyse du cadre juridique applicable aux dispositifs medicaux integrant de l\'intelligence artificielle.',
    },
    {
      title: 'Circulaire sur les obligations de signalement des incidents SI de sante',
      description: 'Circulaire relative aux obligations de signalement des incidents de securite des systemes d\'information de sante.',
    },
    {
      title: 'Referentiel de certification des editeurs de logiciels de sante',
      description: 'Exigences pour la certification des editeurs de logiciels destines aux professionnels et etablissements de sante.',
    },
    {
      title: 'Decret relatif au partage des donnees de sante dans le cadre du parcours coordonne',
      description: 'Decret precisant les conditions de partage des donnees de sante entre professionnels dans le cadre du parcours coordonne.',
    },
    {
      title: 'Arrete fixant la liste des actes de telemedecine remboursables',
      description: 'Texte officiel definissant les actes de telemedecine pris en charge par l\'Assurance Maladie.',
    },
    {
      title: 'Guide ANSSI : Securite des systemes d\'information de sante',
      description: 'Recommandations de l\'ANSSI pour la securisation des systemes d\'information dans le secteur de la sante.',
    },
    {
      title: 'Note d\'information DGOS sur les obligations en matiere d\'archivage medical',
      description: 'Note precisant les obligations reglementaires en matiere de conservation et d\'archivage des donnees medicales.',
    },
    {
      title: 'Cadre reglementaire de la prescription electronique en ville',
      description: 'Analyse du cadre juridique encadrant la prescription electronique pour les medecins de ville.',
    },
  )

  return docs
}

function generateEtudesRapportsDocs(): DocTemplate[] {
  const years = [2023, 2024, 2025]
  const docs: DocTemplate[] = []

  for (const y of years) {
    docs.push(
      {
        title: `Rapport annuel ${y} - Etat des lieux du numerique en sante`,
        description: `Rapport de synthese sur l'avancement de la strategie numerique en sante pour l'annee ${y}.`,
      },
      {
        title: `Barometre de la e-sante en France ${y}`,
        description: `Enquete annuelle aupres de 500 etablissements de sante sur l'adoption des outils numeriques.`,
      },
      {
        title: `Panorama des startups HealthTech en France ${y}`,
        description: `Cartographie et analyse de l'ecosysteme des startups de la sante numerique sur le territoire francais.`,
      },
      {
        title: `Bilan du deploiement du DMP - Annee ${y}`,
        description: `Chiffres cles et analyse qualitative de l'adoption du Dossier Medical Partage en France.`,
      },
    )
  }

  docs.push(
    {
      title: 'Etude d\'impact de la telemedecine en zone rurale',
      description: 'Analyse des effets de la telemedecine sur l\'acces aux soins dans les territoires ruraux et sous-dotes.',
    },
    {
      title: 'Analyse comparative des DPI en etablissements de sante',
      description: 'Comparaison fonctionnelle et technique des principaux logiciels de Dossier Patient Informatise du marche.',
    },
    {
      title: 'Etude sur la maturite numerique des GHT',
      description: 'Evaluation du niveau de maturite numerique des Groupements Hospitaliers de Territoire en France.',
    },
    {
      title: 'Rapport sur les cyberattaques en milieu hospitalier 2023-2025',
      description: 'Analyse retrospective des incidents de cybersecurite ayant touche les etablissements de sante francais.',
    },
    {
      title: 'Impact economique de la e-sante en France',
      description: 'Etude de l\'impact economique de la numerisation du systeme de sante francais, incluant les gains de productivite.',
    },
    {
      title: 'Enquete sur les usages de l\'IA en radiologie',
      description: 'Resultats de l\'enquete nationale sur l\'adoption des outils d\'intelligence artificielle en radiologie.',
    },
    {
      title: 'Rapport IGAS : Gouvernance du numerique en sante',
      description: 'Rapport de l\'Inspection Generale des Affaires Sociales sur la gouvernance de la strategie numerique en sante.',
    },
    {
      title: 'Etude medico-economique des parcours de soins numerises',
      description: 'Analyse cout-benefice de la numerisation des parcours de soins pour les pathologies chroniques.',
    },
    {
      title: 'Benchmark international des strategies nationales de e-sante',
      description: 'Comparaison des strategies de sante numerique de 15 pays europeens et nord-americains.',
    },
    {
      title: 'Les Francais et la sante numerique : perception et usages',
      description: 'Sondage d\'opinion et analyse des usages de la sante numerique par les citoyens francais.',
    },
    {
      title: 'Rapport sur l\'adoption de Mon Espace Sante',
      description: 'Bilan de l\'adoption de Mon Espace Sante par les professionnels de sante et les patients.',
    },
    {
      title: 'Etude sur la souverainete des donnees de sante en Europe',
      description: 'Analyse des enjeux de souverainete lies a l\'hebergement et au traitement des donnees de sante en Europe.',
    },
    {
      title: 'Rapport sur la teleradiologie en France : bilan et perspectives',
      description: 'Analyse du deploiement de la teleradiologie sur le territoire et ses effets sur l\'acces au diagnostic.',
    },
    {
      title: 'Etude sur le cout des incidents cyber en etablissement de sante',
      description: 'Evaluation financiere des consequences des cyberattaques dans les hopitaux francais.',
    },
    {
      title: 'Rapport d\'evaluation du programme Hop\'EN',
      description: 'Bilan du programme Hopital Numerique Ouvert sur l\'Exterieur et recommandations pour la suite.',
    },
    {
      title: 'Analyse de l\'offre de formation en sante numerique en France',
      description: 'Cartographie de l\'offre de formation initiale et continue en sante numerique sur le territoire.',
    },
    {
      title: 'Etude prospective : la sante numerique a horizon 2030',
      description: 'Scenarii prospectifs pour la sante numerique en France a l\'horizon 2030.',
    },
    {
      title: 'Rapport sur l\'accessibilite numerique des services de sante',
      description: 'Evaluation de l\'accessibilite numerique des portails patients et services de sante en ligne.',
    },
    {
      title: 'Barometre satisfaction des professionnels de sante vis-a-vis du DPI',
      description: 'Enquete de satisfaction sur les DPI aupres de 2000 professionnels de sante hospitaliers.',
    },
    {
      title: 'Etude comparative des modeles de gouvernance des donnees de sante en Europe',
      description: 'Comparaison des modeles de gouvernance des donnees de sante dans 10 pays europeens.',
    },
  )

  return docs
}

function generateFichesPratiquesDocs(): DocTemplate[] {
  const docs: DocTemplate[] = [
    {
      title: 'Guide d\'implementation du DMP en etablissement',
      description: 'Guide etape par etape pour deployer le Dossier Medical Partage au sein d\'un etablissement de sante.',
    },
    {
      title: 'Fiche pratique : Securisation des acces au SI hospitalier',
      description: 'Recommandations operationnelles pour securiser les acces au systeme d\'information hospitalier.',
    },
    {
      title: 'Mode d\'emploi : Teleconsultation pour les praticiens',
      description: 'Guide pratique pour les medecins souhaitant mettre en place la teleconsultation dans leur exercice.',
    },
    {
      title: 'Guide de migration vers FHIR R4',
      description: 'Fiche technique detaillant les etapes de migration d\'un SI de sante vers le standard FHIR R4.',
    },
    {
      title: 'Fiche pratique : Gestion des identites patients (INS)',
      description: 'Procedures de mise en oeuvre de l\'Identite Nationale de Sante dans les logiciels de sante.',
    },
    {
      title: 'Checklist de conformite RGPD pour les editeurs de sante',
      description: 'Liste de verification des obligations RGPD a destination des editeurs de logiciels de sante.',
    },
    {
      title: 'Guide de bonnes pratiques en telemedecine',
      description: 'Recommandations organisationnelles et techniques pour la mise en place de la telemedecine.',
    },
    {
      title: 'Fiche technique : Integration HL7 v2 dans un SIH',
      description: 'Guide technique pour l\'integration des flux HL7 v2 au sein d\'un systeme d\'information hospitalier.',
    },
    {
      title: 'Mode d\'emploi : Alimentation de Mon Espace Sante',
      description: 'Procedures techniques pour alimenter Mon Espace Sante depuis un logiciel professionnel de sante.',
    },
    {
      title: 'Fiche pratique : Plan de continuite d\'activite SI',
      description: 'Guide pour elaborer un plan de continuite d\'activite du systeme d\'information de sante.',
    },
    {
      title: 'Guide de deploiement d\'une messagerie securisee de sante (MSSante)',
      description: 'Instructions pour le deploiement et la configuration de la messagerie securisee de sante.',
    },
    {
      title: 'Fiche pratique : Archivage legal des donnees medicales',
      description: 'Recommandations pour l\'archivage conforme des donnees medicales dans les etablissements de sante.',
    },
    {
      title: 'Guide d\'utilisation des API du DMP',
      description: 'Documentation technique pour l\'integration des API du Dossier Medical Partage dans les logiciels de sante.',
    },
    {
      title: 'Fiche pratique : Audit de securite d\'un SI de sante',
      description: 'Methodologie pour conduire un audit de securite du systeme d\'information de sante.',
    },
    {
      title: 'Mode d\'emploi : Prescription electronique',
      description: 'Guide pratique pour la mise en oeuvre de la prescription electronique dans un etablissement.',
    },
    {
      title: 'Fiche pratique : Telesurveillance des patients chroniques',
      description: 'Guide operationnel pour le deploiement de la telesurveillance medicale.',
    },
    {
      title: 'Guide de parametrage ProSante Connect',
      description: 'Instructions techniques pour l\'integration de ProSante Connect dans un logiciel de sante.',
    },
    {
      title: 'Fiche pratique : Gestion de crise cyber en etablissement',
      description: 'Plan de reaction et procedures en cas d\'incident de cybersecurite dans un etablissement de sante.',
    },
    {
      title: 'Guide de mise en oeuvre du volet medico-social du CI-SIS',
      description: 'Instructions pour implementer le cadre d\'interoperabilite dans le secteur medico-social.',
    },
    {
      title: 'Fiche pratique : Consentement numerique du patient',
      description: 'Modeles et procedures pour le recueil du consentement patient dans un contexte numerique.',
    },
    {
      title: 'Guide de mise en conformite hebergement HDS',
      description: 'Fiche pratique detaillant les etapes pour obtenir la certification Hebergeur de Donnees de Sante.',
    },
    {
      title: 'Fiche pratique : Deploiement de la e-prescription',
      description: 'Guide operationnel pour le deploiement de la prescription electronique en etablissement.',
    },
    {
      title: 'Mode d\'emploi : Integration du NIR dans les SI de sante',
      description: 'Guide technique pour l\'integration du Numero d\'Inscription au Repertoire dans les systemes de sante.',
    },
    {
      title: 'Fiche pratique : Gestion des habilitations SI hospitalier',
      description: 'Procedures et bonnes pratiques pour la gestion des droits d\'acces aux SI hospitaliers.',
    },
    {
      title: 'Guide : Teletransmission des feuilles de soins electroniques',
      description: 'Instructions pour la mise en place de la teletransmission SESAM-Vitale en cabinet.',
    },
    {
      title: 'Fiche pratique : Sauvegarde et restauration des donnees medicales',
      description: 'Recommandations operationnelles pour la sauvegarde et la restauration des donnees de sante.',
    },
    {
      title: 'Guide de configuration : VPN securise pour acces distant au SIH',
      description: 'Instructions techniques pour la mise en place d\'un acces VPN securise au systeme hospitalier.',
    },
    {
      title: 'Fiche pratique : Signalement des incidents de securite SI',
      description: 'Procedures de signalement des incidents de securite informatique en etablissement de sante.',
    },
    {
      title: 'Mode d\'emploi : Portail patient en etablissement',
      description: 'Guide de deploiement d\'un portail patient pour la prise de rendez-vous et l\'acces aux resultats.',
    },
    {
      title: 'Fiche technique : Normes IHE pour l\'imagerie medicale',
      description: 'Presentation des profils IHE applicables aux systemes de gestion d\'imagerie medicale.',
    },
  ]

  return docs
}

function generateVeilleTechDocs(): DocTemplate[] {
  const years = [2023, 2024, 2025]
  const docs: DocTemplate[] = []

  for (const y of years) {
    docs.push({
      title: `IA en imagerie medicale : etat de l'art ${y}`,
      description: `Revue des avancees en intelligence artificielle appliquee a l'imagerie medicale pour l'annee ${y}.`,
    })
  }

  docs.push(
    {
      title: 'Blockchain et tracabilite des dispositifs medicaux',
      description: 'Analyse du potentiel de la blockchain pour la tracabilite des dispositifs medicaux et la lutte contre la contrefacon.',
    },
    {
      title: 'IoT medical : enjeux de cybersecurite',
      description: 'Etat des lieux des risques de cybersecurite lies a l\'Internet des Objets medicaux connectes.',
    },
    {
      title: 'Cloud souverain et hebergement de donnees de sante',
      description: 'Analyse comparative des solutions de cloud souverain certifiees HDS pour le secteur sante.',
    },
    {
      title: 'Jumeau numerique en sante : perspectives et defis',
      description: 'Exploration des cas d\'usage du jumeau numerique dans la medecine personnalisee et la simulation clinique.',
    },
    {
      title: 'Edge computing pour les dispositifs medicaux connectes',
      description: 'Etude des architectures edge computing pour le traitement temps reel des donnees de sante.',
    },
    {
      title: 'Intelligence artificielle generative en sante : opportunites et risques',
      description: 'Analyse des cas d\'usage de l\'IA generative dans le parcours de soins et la recherche medicale.',
    },
    {
      title: 'Informatique quantique : implications pour la cryptographie en sante',
      description: 'Veille sur les menaces et opportunites de l\'informatique quantique pour la securite des donnees de sante.',
    },
    {
      title: 'RPA et automatisation des processus administratifs hospitaliers',
      description: 'Retour d\'experience sur le deploiement de la Robotic Process Automation en milieu hospitalier.',
    },
    {
      title: 'Realite augmentee en chirurgie : tendances 2025',
      description: 'Panorama des technologies de realite augmentee et mixte utilisees en chirurgie.',
    },
    {
      title: 'Architectures Zero Trust pour les SI de sante',
      description: 'Presentation du modele Zero Trust et de son application aux systemes d\'information de sante.',
    },
    {
      title: '5G et sante connectee : cas d\'usage et deploiement',
      description: 'Analyse des cas d\'usage de la 5G pour la telechirurgie, le monitoring patient et le secours mobile.',
    },
    {
      title: 'Natural Language Processing pour le codage medical automatique',
      description: 'Veille technologique sur les outils de NLP pour le codage PMSI et CIM-10 automatique.',
    },
    {
      title: 'Interoperabilite FHIR : ecosysteme et maturite des implementations',
      description: 'Analyse de l\'ecosysteme FHIR mondial et etat de l\'art des implementations en France.',
    },
    {
      title: 'Big Data en epidemiologie : lecons du COVID-19',
      description: 'Retour d\'experience sur l\'utilisation du Big Data pour la surveillance epidemiologique.',
    },
    {
      title: 'Wearables medicaux : marche et innovation 2025',
      description: 'Panorama des objets connectes medicaux et de leur integration dans le parcours de soins.',
    },
    {
      title: 'DevSecOps pour les applications de sante',
      description: 'Guide de mise en oeuvre des pratiques DevSecOps dans le developpement logiciel de sante.',
    },
    {
      title: 'Plateforme de donnees de sante (Health Data Hub) : bilan technique',
      description: 'Analyse technique de la plateforme nationale Health Data Hub et de ses services.',
    },
    {
      title: 'Robotique chirurgicale : innovations et adoption en France',
      description: 'Panorama des innovations en robotique chirurgicale et etat de l\'adoption dans les blocs operatoires francais.',
    },
    {
      title: 'Impression 3D medicale : applications et perspectives',
      description: 'Veille sur les applications de l\'impression 3D en medecine : protheses, implants et modeles anatomiques.',
    },
    {
      title: 'Cybersecurite : analyse des ransomwares ciblant le secteur sante',
      description: 'Etude des ransomwares ayant cible le secteur sante et recommandations de protection.',
    },
    {
      title: 'Tokenisation des donnees de sante : approches et limites',
      description: 'Analyse des techniques de tokenisation pour la protection des donnees de sante sensibles.',
    },
    {
      title: 'API economy en sante : ecosysteme et modeles economiques',
      description: 'Veille sur l\'economie des API dans le secteur de la sante numerique et les modeles emergents.',
    },
    {
      title: 'Federated Learning : apprentissage distribue pour la sante',
      description: 'Exploration du Federated Learning pour l\'entrainement de modeles IA sans partager les donnees patients.',
    },
    {
      title: 'Technologies de monitoring patient a domicile',
      description: 'Panorama des technologies de surveillance patient a domicile et de leur integration dans le parcours de soins.',
    },
    {
      title: 'SIEM et SOC pour les etablissements de sante',
      description: 'Veille sur les solutions SIEM et les centres operationnels de securite adaptes au secteur sante.',
    },
    {
      title: 'Conteneurisation et microservices pour les SI de sante',
      description: 'Analyse des architectures conteneurisees et microservices pour la modernisation des SI de sante.',
    },
    {
      title: 'Voix et assistants virtuels en sante : etat des lieux',
      description: 'Veille sur les interfaces vocales et assistants virtuels pour les applications de sante.',
    },
  )

  return docs
}

function generateFormationsDocs(): DocTemplate[] {
  const docs: DocTemplate[] = [
    {
      title: 'Support de formation : RGPD applique au secteur sante',
      description: 'Module de formation sur l\'application du RGPD dans les etablissements de sante.',
    },
    {
      title: 'Module e-learning : Bases de la cybersecurite hospitaliere',
      description: 'Formation en ligne sur les fondamentaux de la cybersecurite en milieu hospitalier.',
    },
    {
      title: 'Formation continue : Interoperabilite des SI de sante',
      description: 'Programme de formation sur les normes et standards d\'interoperabilite en sante.',
    },
    {
      title: 'Atelier pratique : Prise en main de Mon Espace Sante',
      description: 'Support d\'atelier pour la formation des professionnels de sante a Mon Espace Sante.',
    },
    {
      title: 'Formation DPC : Telemedecine et pratique medicale',
      description: 'Programme de Developpement Professionnel Continu sur la telemedecine.',
    },
    {
      title: 'Support de cours : Administration des bases de donnees medicales',
      description: 'Formation technique sur l\'administration et l\'optimisation des bases de donnees en sante.',
    },
    {
      title: 'Module de sensibilisation : Phishing et ingenierie sociale en sante',
      description: 'Formation de sensibilisation aux techniques de phishing ciblant le secteur sante.',
    },
    {
      title: 'Formation AMOA : Cahier des charges SI de sante',
      description: 'Formation a la redaction de cahiers des charges pour les projets SI de sante.',
    },
    {
      title: 'Parcours certifiant : Referent securite SI de sante',
      description: 'Programme de certification pour devenir referent securite des SI de sante.',
    },
    {
      title: 'Formation technique : API FHIR pour developpeurs',
      description: 'Formation pratique au developpement d\'applications utilisant les API FHIR.',
    },
    {
      title: 'Module e-learning : Identitovigilance et INS',
      description: 'Formation en ligne sur l\'identitovigilance et l\'Identite Nationale de Sante.',
    },
    {
      title: 'Atelier : Conduite du changement numerique en etablissement',
      description: 'Formation a l\'accompagnement du changement lors des projets de transformation numerique.',
    },
    {
      title: 'Support de formation : Utilisation du DPI pour les soignants',
      description: 'Guide de formation destine au personnel soignant pour l\'utilisation du Dossier Patient Informatise.',
    },
    {
      title: 'Formation : Gestion de projet SI de sante - Methode Agile',
      description: 'Formation aux methodologies agiles appliquees aux projets de systemes d\'information de sante.',
    },
    {
      title: 'Module : Protection des donnees pour les DPO hospitaliers',
      description: 'Formation approfondie pour les Delegues a la Protection des Donnees en milieu hospitalier.',
    },
    {
      title: 'Formation continue : Analyse de donnees de sante avec Python',
      description: 'Initiation a l\'analyse de donnees de sante avec Python, pandas et les outils de visualisation.',
    },
    {
      title: 'Atelier pratique : Securisation des postes de travail en sante',
      description: 'Formation pratique a la configuration securisee des postes de travail en environnement hospitalier.',
    },
    {
      title: 'Webinaire : Les enjeux de la certification ISO 27001 en sante',
      description: 'Support de webinaire sur la certification ISO 27001 appliquee aux SI de sante.',
    },
    {
      title: 'Formation : Droit des patients et numerique',
      description: 'Module de formation sur les droits des patients dans le cadre de la numerisation du parcours de soins.',
    },
    {
      title: 'Support pedagogique : Architecture technique d\'un SIH',
      description: 'Cours sur l\'architecture technique des systemes d\'information hospitaliers modernes.',
    },
    {
      title: 'Formation e-learning : Codage PMSI pour debutants',
      description: 'Module d\'initiation au codage PMSI destine aux professionnels de sante debutants.',
    },
    {
      title: 'Atelier : Tableaux de bord et indicateurs qualite en sante',
      description: 'Formation pratique a la conception de tableaux de bord pour le pilotage qualite en etablissement.',
    },
    {
      title: 'Formation continue : Cloud computing pour DSI hospitaliers',
      description: 'Programme de formation sur les architectures cloud adaptees au secteur hospitalier.',
    },
    {
      title: 'Module : Ethique et IA - Enjeux pour les professionnels de sante',
      description: 'Formation aux enjeux ethiques de l\'intelligence artificielle dans la pratique medicale.',
    },
    {
      title: 'Support de formation : Messagerie securisee MSSante',
      description: 'Guide de formation a l\'utilisation de la messagerie securisee de sante pour les professionnels.',
    },
    {
      title: 'Formation DPC : Prescription connectee et circuit du medicament',
      description: 'Programme DPC sur la prescription electronique et la securisation du circuit du medicament.',
    },
    {
      title: 'Atelier pratique : Tests d\'intrusion SI de sante',
      description: 'Formation aux tests de penetration appliques aux systemes d\'information de sante.',
    },
    {
      title: 'Module e-learning : SNOMED CT et terminologies de sante',
      description: 'Introduction aux terminologies medicales standardisees et a leur utilisation dans les SI de sante.',
    },
    {
      title: 'Formation : Management de la qualite des donnees de sante',
      description: 'Programme de formation sur la gouvernance et la qualite des donnees dans les SI de sante.',
    },
    {
      title: 'Support de cours : Reseaux et infrastructures en milieu hospitalier',
      description: 'Formation technique sur les reseaux informatiques et les infrastructures en environnement hospitalier.',
    },
  ]

  return docs
}

function generateCompteRendusDocs(): DocTemplate[] {
  const years = [2023, 2024, 2025, 2026]
  const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'septembre', 'octobre', 'novembre', 'decembre']
  const docs: DocTemplate[] = []

  for (const y of years) {
    for (let i = 0; i < 3; i++) {
      const m = randomElement(months)
      docs.push({
        title: `CR Reunion pleniere FSN du ${randomInt(1, 28)} ${m} ${y}`,
        description: `Compte-rendu de la reunion pleniere de la Filiere Sante Numerique du ${randomInt(1, 28)} ${m} ${y}.`,
      })
    }
    docs.push({
      title: `PV Assemblee Generale FSN ${y}`,
      description: `Proces-verbal de l'Assemblee Generale de la Filiere Sante Numerique pour l'annee ${y}.`,
    })
  }

  for (let i = 1; i <= 8; i++) {
    docs.push({
      title: `Compte-rendu GT Interoperabilite - Session ${i}`,
      description: `Compte-rendu de la session ${i} du Groupe de Travail Interoperabilite de la FSN.`,
    })
  }

  docs.push(
    {
      title: 'CR Comite de pilotage Strategie Numerique en Sante',
      description: 'Compte-rendu du comite de pilotage sur la feuille de route du numerique en sante.',
    },
    {
      title: 'CR Reunion du bureau FSN - Bilan semestriel',
      description: 'Compte-rendu de la reunion du bureau avec presentation du bilan semestriel d\'activite.',
    },
    {
      title: 'CR Commission ethique et IA en sante',
      description: 'Compte-rendu de la commission sur les questions ethiques liees a l\'IA en sante.',
    },
    {
      title: 'CR GT Cybersecurite - Retour d\'incident majeur',
      description: 'Compte-rendu du groupe de travail cybersecurite suite a un incident majeur en etablissement.',
    },
    {
      title: 'CR Journee annuelle FSN - Synthese des ateliers',
      description: 'Synthese des ateliers de la journee annuelle de la Filiere Sante Numerique.',
    },
    {
      title: 'CR Comite technique FHIR France',
      description: 'Compte-rendu du comite technique en charge de la strategie FHIR pour la France.',
    },
    {
      title: 'CR GT Telemedecine - Bilan des experimentations',
      description: 'Compte-rendu du groupe de travail telemedecine presentant le bilan des experimentations en cours.',
    },
    {
      title: 'CR Comite des editeurs de logiciels de sante',
      description: 'Compte-rendu de la reunion du comite des editeurs sur les evolutions reglementaires a venir.',
    },
    {
      title: 'CR Reunion DSI des CHU - Partage d\'experience',
      description: 'Compte-rendu de la reunion des directeurs des SI des CHU sur le partage de bonnes pratiques.',
    },
    {
      title: 'CR Comite strategie numerique ARS Ile-de-France',
      description: 'Compte-rendu du comite de strategie numerique de l\'ARS Ile-de-France.',
    },
    {
      title: 'CR Atelier prospective sante numerique 2030',
      description: 'Synthese de l\'atelier de prospective sur la sante numerique a horizon 2030.',
    },
    {
      title: 'CR GT Donnees de sante et recherche',
      description: 'Compte-rendu du groupe de travail sur l\'utilisation des donnees de sante pour la recherche.',
    },
    {
      title: 'CR Seminaire annuel cybersecurite sante',
      description: 'Compte-rendu du seminaire annuel sur la cybersecurite dans le secteur de la sante.',
    },
    {
      title: 'CR Reunion partenaires industriels FSN',
      description: 'Compte-rendu de la reunion avec les partenaires industriels de la Filiere Sante Numerique.',
    },
    {
      title: 'CR Comite de suivi programme SEGUR numerique',
      description: 'Compte-rendu du comite de suivi du volet numerique du Segur de la Sante.',
    },
    {
      title: 'CR GT Formation et competences numeriques en sante',
      description: 'Compte-rendu du groupe de travail sur les besoins en formation et competences numeriques.',
    },
  )

  return docs
}

// ---------------------------------------------------------------------------
// File generation
// ---------------------------------------------------------------------------

function generatePdfContent(title: string, description: string, targetSize: number): Buffer {
  // Create a realistic text body to pad the file
  const loremFr = `La sante numerique represente un enjeu majeur pour la transformation du systeme de sante francais. Les etablissements de sante doivent integrer les technologies de l'information pour ameliorer la qualite des soins, optimiser les parcours patients et renforcer la securite des donnees medicales. Ce document presente les principales recommandations et bonnes pratiques en la matiere. L'interoperabilite des systemes d'information de sante constitue un prerequis essentiel pour garantir la continuite du parcours de soins. Les standards HL7 FHIR, adoptes a l'echelle internationale, permettent d'assurer l'echange fluide des donnees entre les differents acteurs du systeme de sante. La protection des donnees de sante, encadree par le RGPD et les dispositions specifiques du Code de la sante publique, impose aux acteurs de mettre en place des mesures techniques et organisationnelles appropriees. L'hebergement des donnees de sante est soumis a une certification specifique (HDS) delivree par un organisme accredite. La telemedecine s'est considerablement developpee ces dernieres annees, notamment sous l'impulsion de la crise sanitaire. Les teleconsultations, la teleexpertise et la telesurveillance medicale offrent de nouvelles modalites de prise en charge, particulierement benefiques pour les patients en zone sous-dotee. L'intelligence artificielle ouvre des perspectives prometteuses en sante, que ce soit en aide au diagnostic, en imagerie medicale, en pharmacovigilance ou en epidemiologie. Son deploiement doit neanmoins respecter un cadre ethique strict et garantir la transparence des algorithmes. La cybersecurite des systemes d'information de sante est devenue une priorite nationale, les etablissements de sante etant de plus en plus cibles par des cyberattaques. La mise en oeuvre d'une politique de securite robuste, incluant un plan de continuite d'activite, est indispensable. `

  const streamContent = `BT /F1 16 Tf 72 750 Td (${title.substring(0, 80)}) Tj ET\nBT /F1 10 Tf 72 720 Td (${description.substring(0, 120)}) Tj ET\n`

  // Repeat the lorem text to reach target size
  const repetitions = Math.max(1, Math.ceil(targetSize / loremFr.length))
  let textBody = ''
  for (let i = 0; i < repetitions; i++) {
    textBody += `BT /F1 9 Tf 72 ${700 - (i % 60) * 12} Td (${loremFr.substring(0, 200)}) Tj ET\n`
  }

  const fullStream = streamContent + textBody
  const streamLength = Buffer.byteLength(fullStream, 'latin1')

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${fullStream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
%%EOF`

  const pdfBuffer = Buffer.from(pdf, 'latin1')

  // Pad to reach target size if needed
  if (pdfBuffer.length < targetSize) {
    const padding = Buffer.alloc(targetSize - pdfBuffer.length, 0x20) // spaces
    return Buffer.concat([pdfBuffer, padding])
  }

  return pdfBuffer
}

function generateDocxContent(title: string, description: string, targetSize: number): Buffer {
  // Create a text-based content that simulates a document
  const header = `[Document DOCX]\n\nTitre: ${title}\n\n${description}\n\n`
  const loremFr = `La transformation numerique du systeme de sante francais repose sur plusieurs piliers fondamentaux : l'interoperabilite des systemes d'information, la securite des donnees de sante, le deploiement de la telemedecine et l'adoption de l'intelligence artificielle. Les etablissements de sante sont confrontes a des defis majeurs en matiere de modernisation de leurs infrastructures informatiques, de formation des personnels aux outils numeriques et de conformite reglementaire. La Filiere Sante Numerique accompagne les acteurs dans cette transition en proposant des referentiels, des guides de bonnes pratiques et un cadre de concertation entre les differentes parties prenantes. `

  const repetitions = Math.max(1, Math.ceil(targetSize / loremFr.length))
  let content = header
  for (let i = 0; i < repetitions; i++) {
    content += `\nSection ${i + 1}\n${loremFr}\n`
  }

  const buffer = Buffer.from(content, 'utf-8')
  if (buffer.length < targetSize) {
    return Buffer.concat([buffer, Buffer.alloc(targetSize - buffer.length, 0x20)])
  }
  return buffer.subarray(0, targetSize)
}

function generateXlsxContent(title: string, description: string, targetSize: number): Buffer {
  // Create a CSV-like text content
  const header = `Titre;${title}\nDescription;${description}\n\n`
  const tableHeader = 'ID;Etablissement;Region;Score;Date;Statut\n'

  const regions = ['Ile-de-France', 'Auvergne-Rhone-Alpes', 'Nouvelle-Aquitaine', 'Occitanie', 'Hauts-de-France', 'Grand Est', 'Provence-Alpes-Cote d\'Azur', 'Bretagne', 'Normandie', 'Pays de la Loire']
  const statuts = ['Conforme', 'En cours', 'A evaluer', 'Non conforme', 'Certifie']
  const etablissements = ['CHU', 'CH', 'Clinique', 'EHPAD', 'Hopital prive', 'Centre de sante', 'Maison de sante']

  let content = header + tableHeader
  const rowCount = Math.max(50, Math.ceil(targetSize / 100))
  for (let i = 1; i <= rowCount; i++) {
    const etab = `${randomElement(etablissements)} ${randomElement(['Saint-Louis', 'Pasteur', 'Dupuytren', 'Pellegrin', 'Purpan', 'Hautepierre', 'Pitie-Salpetriere', 'Necker', 'Cochin', 'Bichat'])}`
    content += `${i};${etab};${randomElement(regions)};${randomInt(40, 100)};${randomInt(2023, 2025)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')};${randomElement(statuts)}\n`
  }

  const buffer = Buffer.from(content, 'utf-8')
  if (buffer.length < targetSize) {
    return Buffer.concat([buffer, Buffer.alloc(targetSize - buffer.length, 0x20)])
  }
  return buffer.subarray(0, targetSize)
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding database...')

  // Ensure uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }

  // ---- Users ----
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@fsn.fr' },
    update: {},
    create: {
      email: 'admin@fsn.fr',
      password: adminPassword,
      name: 'Administrateur FSN',
      role: 'ADMIN',
    },
  })

  const memberPassword = await bcrypt.hash('member123', 12)
  const member = await prisma.user.upsert({
    where: { email: 'membre@fsn.fr' },
    update: {},
    create: {
      email: 'membre@fsn.fr',
      password: memberPassword,
      name: 'Marie Dupont',
      role: 'MEMBER',
    },
  })

  const uploaders = [admin.id, member.id]

  // ---- Categories ----
  const categoryDefs = [
    { name: 'Reglementation', slug: 'reglementation', color: '#3B82F6', icon: 'Scale', description: 'Textes reglementaires et legislatifs' },
    { name: 'Etudes & Rapports', slug: 'etudes-rapports', color: '#00C9A7', icon: 'BarChart2', description: 'Etudes de marche et rapports sectoriels' },
    { name: 'Fiches Pratiques', slug: 'fiches-pratiques', color: '#F59E0B', icon: 'BookOpen', description: 'Guides et fiches operationnelles' },
    { name: 'Veille Technologique', slug: 'veille-tech', color: '#8B5CF6', icon: 'Cpu', description: 'Innovations et tendances technologiques' },
    { name: 'Formations', slug: 'formations', color: '#EC4899', icon: 'GraduationCap', description: 'Supports de formation et pedagogiques' },
    { name: 'Compte-rendus', slug: 'compte-rendus', color: '#6B7280', icon: 'FileText', description: 'Comptes-rendus de reunions et evenements' },
  ]

  const categoryMap: Record<string, string> = {}

  for (const cat of categoryDefs) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    })
    categoryMap[cat.slug] = record.id
  }

  // ---- Delete existing documents and their files ----
  const existingDocs = await prisma.document.findMany({ select: { filePath: true } })
  for (const doc of existingDocs) {
    const fullPath = path.join(process.cwd(), doc.filePath)
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
  }
  await prisma.document.deleteMany()
  console.log(`Deleted ${existingDocs.length} existing documents`)

  // ---- Generate documents ----
  const docsByCategory: Record<string, DocTemplate[]> = {
    reglementation: generateReglementationDocs(),
    'etudes-rapports': generateEtudesRapportsDocs(),
    'fiches-pratiques': generateFichesPratiquesDocs(),
    'veille-tech': generateVeilleTechDocs(),
    formations: generateFormationsDocs(),
    'compte-rendus': generateCompteRendusDocs(),
  }

  const allSlugs = Object.keys(docsByCategory)
  const startDate = new Date('2023-01-01')
  const endDate = new Date('2026-03-01')

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }

  let totalCreated = 0

  for (const slug of allSlugs) {
    const templates = docsByCategory[slug]
    const categoryId = categoryMap[slug]
    const categoryTags = TAGS_BY_CATEGORY[slug]

    console.log(`  Seeding ${templates.length} documents for category "${slug}"...`)

    for (const template of templates) {
      // Determine file type: 70% PDF, 20% DOCX, 10% XLSX
      const roll = Math.random()
      let ext: string
      if (roll < 0.7) ext = 'pdf'
      else if (roll < 0.9) ext = 'docx'
      else ext = 'xlsx'

      const mimeType = mimeTypes[ext]

      // Generate filename
      const safeTitle = template.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60)
      const filename = `${safeTitle}.${ext}`
      const storedName = `${crypto.randomUUID()}.${ext}`
      const filePath = `uploads/${storedName}`
      const fullFilePath = path.join(UPLOADS_DIR, storedName)

      // Target file size: 50KB to 2MB
      const targetSize = randomInt(50 * 1024, 2 * 1024 * 1024)

      // Generate file content
      let fileBuffer: Buffer
      if (ext === 'pdf') {
        fileBuffer = generatePdfContent(template.title, template.description, targetSize)
      } else if (ext === 'docx') {
        fileBuffer = generateDocxContent(template.title, template.description, targetSize)
      } else {
        fileBuffer = generateXlsxContent(template.title, template.description, targetSize)
      }

      // Write file to disk
      fs.writeFileSync(fullFilePath, fileBuffer)

      // Random tags (1-3)
      const tagCount = randomInt(1, 3)
      const tags = JSON.stringify(randomElements(categoryTags, tagCount))

      // Random dates
      const publishedAt = randomDate(startDate, endDate)
      const createdAt = new Date(publishedAt.getTime() + randomInt(0, 7 * 24 * 60 * 60 * 1000))

      // Create document record
      await prisma.document.create({
        data: {
          title: template.title,
          description: template.description,
          filename,
          storedName,
          filePath,
          fileSize: fileBuffer.length,
          mimeType,
          categoryId,
          tags,
          authorName: randomElement(AUTHORS),
          publishedAt,
          uploadedBy: randomElement(uploaders),
          createdAt,
        },
      })

      totalCreated++
    }
  }

  console.log(`\nSeed completed successfully!`)
  console.log(`  Users: admin@fsn.fr / admin123, membre@fsn.fr / member123`)
  console.log(`  Categories: ${allSlugs.length}`)
  console.log(`  Documents created: ${totalCreated}`)
  console.log(`  Files written to: ${UPLOADS_DIR}`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
