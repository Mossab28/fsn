// seed-production.js — Run inside Docker container via: node /tmp/seed-production.js
// Populates the FSN platform with realistic test data

const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const db = new Database('prisma/dev.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function uid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 25);
}

function isoDate(dateStr) {
  return new Date(dateStr).toISOString();
}

// ─── Existing Users (read from DB) ────────────────────────────────────────
const users = db.prepare("SELECT id, email, role FROM User").all();
const userMap = {};
for (const u of users) userMap[u.email] = u.id;

// Pick the first ADMIN as fallback for any reference, so the seed stays
// compatible with whatever accounts are provisioned at boot.
const firstAdmin = users.find((u) => u.role === 'ADMIN') || users[0];
if (!firstAdmin) {
  console.error('No users in DB, skipping content seed.');
  process.exit(0);
}
const adminId = userMap['admin@fsn.fr'] || firstAdmin.id;
const membreId = userMap['membre@fsn.fr'] || firstAdmin.id;
const lecteurId = userMap['lecteur@fsn.fr'] || firstAdmin.id;

// ─── 1. Categories ────────────────────────────────────────────────────────
const categories = [
  { id: uid(), name: 'Réglementation', slug: 'reglementation', color: '#3B82F6', description: 'Textes réglementaires et normatifs' },
  { id: uid(), name: 'Formation', slug: 'formation', color: '#8B5CF6', description: 'Supports de formation et tutoriels' },
  { id: uid(), name: 'Stratégie', slug: 'strategie', color: '#F59E0B', description: 'Documents stratégiques et plans directeurs' },
  { id: uid(), name: 'Technique', slug: 'technique', color: '#00A88E', description: 'Documentation technique et spécifications' },
  { id: uid(), name: 'Communication', slug: 'communication', color: '#EC4899', description: 'Supports de communication et charte' },
];

const insertCategory = db.prepare(
  `INSERT INTO Category (id, name, slug, color, description, icon, createdAt)
   VALUES (?, ?, ?, ?, ?, NULL, ?)`
);

const catMap = {};
// Check if categories already exist
const existingCats = db.prepare("SELECT id, slug FROM Category").all();
if (existingCats.length > 0) {
  for (const c of existingCats) catMap[c.slug] = c.id;
  console.log('Categories already exist:', existingCats.length);
} else {
  const insertCategories = db.transaction(() => {
    for (const c of categories) {
      insertCategory.run(c.id, c.name, c.slug, c.color, c.description, isoDate('2026-03-01'));
      catMap[c.slug] = c.id;
    }
  });
  insertCategories();
  console.log('Categories created:', categories.length);
}

// ─── 2. User Groups ──────────────────────────────────────────────────────
const groups = [
  { id: uid(), name: 'Direction', color: '#3B82F6', description: 'Membres de la direction' },
  { id: uid(), name: 'Équipe Technique', color: '#00A88E', description: 'Équipe de développement et infrastructure' },
  { id: uid(), name: 'Communication', color: '#EC4899', description: 'Équipe communication et design' },
];

const insertGroup = db.prepare(
  `INSERT INTO UserGroup (id, name, description, color, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const groupMap = {};
const existingGroups = db.prepare("SELECT id, name FROM UserGroup").all();
if (existingGroups.length > 0) {
  for (const g of existingGroups) groupMap[g.name] = g.id;
  console.log('Groups already exist:', existingGroups.length);
} else {
  const insertGroups = db.transaction(() => {
    const now = isoDate('2026-03-01');
    for (const g of groups) {
      insertGroup.run(g.id, g.name, g.description, g.color, now, now);
      groupMap[g.name] = g.id;
    }
  });
  insertGroups();
  console.log('User groups created:', groups.length);
}

// ─── 3. Assign users to groups ───────────────────────────────────────────
const updateUserGroup = db.prepare(`UPDATE User SET groupId = ?, updatedAt = ? WHERE id = ?`);
const now = isoDate('2026-03-05');
updateUserGroup.run(groupMap['Direction'], now, adminId);
updateUserGroup.run(groupMap['Équipe Technique'], now, membreId);
updateUserGroup.run(groupMap['Communication'], now, lecteurId);
console.log('Users assigned to groups');

// ─── 4. Folders ──────────────────────────────────────────────────────────
const folderIds = {};
const insertFolder = db.prepare(
  `INSERT INTO Folder (id, name, color, parentId, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const createFolders = db.transaction(() => {
  const ts = isoDate('2026-03-01');
  const folders = [
    { key: 'reglementation', name: 'Réglementation', color: '#3B82F6', parent: null },
    { key: 'textes', name: 'Textes officiels', color: null, parent: 'reglementation' },
    { key: 'normes', name: 'Normes', color: null, parent: 'reglementation' },
    { key: 'projets', name: 'Projets', color: '#F59E0B', parent: null },
    { key: 'plateforme', name: 'Plateforme documentaire', color: null, parent: 'projets' },
    { key: 'transfo', name: 'Transformation digitale', color: null, parent: 'projets' },
    { key: 'formations', name: 'Formations', color: '#8B5CF6', parent: null },
    // 'Archives' retiré: doublonnait avec la corbeille intégrée
  ];

  for (const f of folders) {
    const id = uid();
    folderIds[f.key] = id;
    insertFolder.run(id, f.name, f.color, f.parent ? folderIds[f.parent] : null, ts, ts);
  }
});
const existingFolders = db.prepare("SELECT id, name FROM Folder").all();
if (existingFolders.length > 0) {
  // Map folder names to IDs — need to match keys
  const nameToKey = { 'Réglementation': 'reglementation', 'Textes officiels': 'textes', 'Normes': 'normes', 'Projets': 'projets', 'Plateforme documentaire': 'plateforme', 'Transformation digitale': 'transfo', 'Formations': 'formations', 'Archives': 'archives' };
  for (const f of existingFolders) {
    const key = nameToKey[f.name];
    if (key) folderIds[key] = f.id;
  }
  console.log('Folders already exist:', existingFolders.length);
} else {
  createFolders();
  console.log('Folders created:', Object.keys(folderIds).length);
}

// ─── 5. Documents (with real files) ──────────────────────────────────────
const uploadsDir = '/app/uploads';

const docDefs = [
  {
    key: 'rgpd',
    title: 'Guide RGPD Santé Numérique',
    description: 'Guide complet de conformité RGPD pour les acteurs de la santé numérique',
    folder: 'textes',
    status: 'DIFFUSION',
    category: 'reglementation',
    author: 'Robert Picard',
    uploader: adminId,
    tags: ['RGPD', 'santé', 'conformité'],
    version: '1.2',
    date: '2026-03-15',
    content: `Guide de conformité RGPD pour la santé numérique

1. Introduction
Le Règlement Général sur la Protection des Données (RGPD) impose des obligations renforcées
aux acteurs de la santé numérique. Les données de santé, considérées comme des données
sensibles au sens de l'article 9 du RGPD, nécessitent une protection accrue.

2. Principes fondamentaux
- Licéité, loyauté et transparence du traitement
- Limitation des finalités
- Minimisation des données collectées
- Exactitude et mise à jour des données
- Limitation de la conservation
- Intégrité et confidentialité

3. Base légale du traitement des données de santé
Le traitement de données de santé est interdit par principe (art. 9§1 RGPD), sauf exceptions
prévues à l'article 9§2, notamment :
- Consentement explicite de la personne concernée
- Nécessité pour les soins de santé
- Intérêt public dans le domaine de la santé publique

4. Obligations spécifiques
- Désignation d'un Délégué à la Protection des Données (DPO)
- Réalisation d'analyses d'impact (AIPD)
- Tenue d'un registre des traitements
- Notification des violations de données à la CNIL sous 72h

5. Annexes
Annexe A : Modèle de registre des traitements
Annexe B : Formulaire de consentement type
Annexe C : Procédure de notification de violation`
  },
  {
    key: 'cahier',
    title: 'Cahier des charges - Plateforme FSN',
    description: 'Spécifications fonctionnelles et techniques de la plateforme documentaire FSN',
    folder: 'plateforme',
    status: 'RELECTURE',
    category: 'technique',
    author: "Moss'Ab Mirande-Ney",
    uploader: adminId,
    tags: ['cahier des charges', 'plateforme', 'spécifications'],
    version: '2.0',
    date: '2026-04-10',
    content: `Cahier des charges - Plateforme documentaire FSN
Version 2.0 - Avril 2026

1. Contexte et objectifs
La Fédération Santé Numérique souhaite se doter d'une plateforme documentaire moderne
permettant la gestion centralisée de l'ensemble de ses documents internes et réglementaires.

2. Périmètre fonctionnel
2.1 Gestion documentaire
- Upload et stockage sécurisé de documents (PDF, DOCX, XLSX, images)
- Organisation en dossiers hiérarchiques
- Catégorisation et étiquetage (tags)
- Recherche plein texte dans le contenu des documents
- Versioning automatique avec historique des modifications

2.2 Cycle de vie documentaire
- Statuts : Brouillon → Enrichissement → Relecture → Diffusion → Archive
- Workflow de validation configurable
- Notifications automatiques aux parties prenantes

2.3 Collaboration wiki
- Contributions collaboratives sur les documents
- Types : Notes, Commentaires, Annotations
- Système d'approbation des contributions

2.4 Administration
- Gestion des utilisateurs et des rôles (Admin, Membre, Lecteur)
- Groupes d'utilisateurs
- Journal d'activité complet
- Tableau de bord avec statistiques

3. Architecture technique
- Framework : Next.js 15 (App Router)
- Base de données : SQLite via Prisma
- Authentification : JWT avec bcrypt
- Hébergement : VPS Docker`
  },
  {
    key: 'plan',
    title: 'Plan stratégique 2026-2028',
    description: 'Orientations stratégiques de la FSN pour la période 2026-2028',
    folder: null,
    status: 'ENRICHISSEMENT',
    category: 'strategie',
    author: 'Robert Picard',
    uploader: adminId,
    tags: ['stratégie', 'plan', '2026'],
    version: '1.1',
    date: '2026-04-01',
    content: `Plan stratégique FSN 2026-2028

Vision : Devenir le référentiel documentaire incontournable de la santé numérique en France.

Axe 1 - Transformation digitale
- Objectif 1.1 : Déploiement de la plateforme documentaire (T1 2026)
- Objectif 1.2 : Numérisation de l'ensemble des archives papier (T2 2026)
- Objectif 1.3 : Mise en place de workflows automatisés (T3 2026)

Axe 2 - Conformité réglementaire
- Objectif 2.1 : Certification HDS (Hébergeur de Données de Santé)
- Objectif 2.2 : Audit RGPD annuel
- Objectif 2.3 : Veille réglementaire continue

Axe 3 - Formation et montée en compétences
- Objectif 3.1 : Programme de formation à la plateforme
- Objectif 3.2 : Ateliers mensuels sur la sécurité des données
- Objectif 3.3 : Certification des utilisateurs clés

Budget prévisionnel :
- 2026 : 150 000 EUR
- 2027 : 120 000 EUR
- 2028 : 100 000 EUR

Indicateurs de performance :
- Taux d'adoption de la plateforme > 90%
- Temps moyen de recherche documentaire < 30 secondes
- Conformité RGPD : 100%`
  },
  {
    key: 'formation',
    title: 'Formation - Prise en main plateforme',
    description: 'Guide de prise en main de la plateforme documentaire pour les nouveaux utilisateurs',
    folder: 'formations',
    status: 'DIFFUSION',
    category: 'formation',
    author: 'Marie Membre',
    uploader: membreId,
    tags: ['formation', 'tutoriel'],
    version: '1.0',
    date: '2026-04-15',
    content: `Formation : Prise en main de la plateforme documentaire FSN

Module 1 - Connexion et navigation
1. Accédez à la plateforme via votre navigateur
2. Saisissez vos identifiants (email + mot de passe)
3. Le tableau de bord s'affiche avec les documents récents

Module 2 - Recherche de documents
1. Utilisez la barre de recherche en haut de page
2. Filtrez par catégorie, statut ou dossier
3. La recherche plein texte permet de trouver du contenu dans les documents

Module 3 - Upload de documents
1. Cliquez sur le bouton "Nouveau document"
2. Sélectionnez le fichier à uploader
3. Renseignez les métadonnées (titre, catégorie, tags)
4. Choisissez le dossier de destination
5. Cliquez sur "Enregistrer"

Module 4 - Collaboration
1. Ouvrez un document existant
2. Cliquez sur l'onglet "Contributions"
3. Ajoutez une note, un commentaire ou une annotation
4. Votre contribution sera soumise à validation

Module 5 - Gestion des versions
1. Les versions sont créées automatiquement lors des modifications
2. Consultez l'historique via l'onglet "Versions"
3. Vous pouvez télécharger n'importe quelle version antérieure`
  },
  {
    key: 'protocole',
    title: 'Protocole de sécurité des données patients',
    description: 'Protocole de sécurité pour le traitement des données patients conformément aux normes ANSSI',
    folder: 'normes',
    status: 'DIFFUSION',
    category: 'reglementation',
    author: 'Dr. Martin',
    uploader: adminId,
    tags: ['sécurité', 'patients', 'protocole'],
    version: '1.0',
    date: '2026-03-20',
    content: `Protocole de sécurité des données patients
Conforme aux recommandations ANSSI et à la PGSSI-S

1. Objet
Ce protocole définit les mesures de sécurité à appliquer pour le traitement
des données patients dans le cadre des activités de la FSN.

2. Classification des données
- Niveau 1 : Données administratives (nom, prénom, coordonnées)
- Niveau 2 : Données médicales non sensibles (rendez-vous, parcours de soins)
- Niveau 3 : Données médicales sensibles (diagnostics, traitements, résultats)

3. Mesures techniques
- Chiffrement AES-256 au repos
- TLS 1.3 en transit
- Authentification multi-facteurs obligatoire pour les données niveau 3
- Journalisation de tous les accès
- Sauvegarde quotidienne chiffrée

4. Mesures organisationnelles
- Principe du moindre privilège
- Revue trimestrielle des accès
- Formation annuelle obligatoire à la sécurité
- Procédure d'incident documentée

5. Contrôle et audit
- Audit de sécurité annuel par un tiers
- Tests d'intrusion semestriels
- Revue de conformité ANSSI continue`
  },
  {
    key: 'rapport',
    title: 'Rapport transformation digitale Q1 2026',
    description: 'Bilan du premier trimestre de la transformation digitale de la FSN',
    folder: 'transfo',
    status: 'ARCHIVE',
    category: 'strategie',
    author: 'Sophie Durand',
    uploader: adminId,
    tags: [],
    version: '1.0',
    isArchived: true,
    date: '2026-04-05',
    content: `Rapport de transformation digitale - Q1 2026

Résumé exécutif :
Le premier trimestre 2026 a vu le lancement effectif de la plateforme documentaire FSN.
Les objectifs principaux ont été atteints avec un taux de complétion de 85%.

Réalisations clés :
- Déploiement de la plateforme en environnement de production
- Migration de 1 200 documents depuis l'ancien système
- Formation de 25 utilisateurs sur 30 prévus
- Mise en place du workflow de validation documentaire

Points d'attention :
- Retard de 2 semaines sur la formation (congés maladie formateur)
- Performance de recherche à optimiser pour les fichiers volumineux
- Demande d'ajout de fonctionnalité OCR pour les documents scannés

Budget Q1 :
- Prévu : 37 500 EUR
- Réalisé : 34 200 EUR
- Écart : -3 300 EUR (économie)

Objectifs Q2 :
- Compléter la formation de tous les utilisateurs
- Mettre en place les indicateurs de performance
- Démarrer la numérisation des archives papier`
  },
  {
    key: 'charte',
    title: 'Charte graphique FSN',
    description: 'Charte graphique et identité visuelle de la Fédération Santé Numérique',
    folder: null,
    status: 'BROUILLON',
    category: 'communication',
    author: 'Léo Lecteur',
    uploader: lecteurId,
    tags: ['charte', 'design', 'identité visuelle'],
    version: '1.0',
    date: '2026-04-20',
    content: `Charte graphique - Fédération Santé Numérique

1. Logo
- Logo principal : utilisation sur fond blanc ou clair
- Logo inversé : utilisation sur fond sombre
- Zone de protection : espace minimum autour du logo = hauteur du symbole

2. Couleurs
- Couleur principale : #00A88E (Vert FSN)
- Couleur secondaire : #3B82F6 (Bleu institutionnel)
- Couleur d'accent : #F59E0B (Jaune alerte)
- Neutres : #1F2937, #6B7280, #F3F4F6

3. Typographie
- Titres : Inter Bold, 24-32px
- Sous-titres : Inter Semi-Bold, 18-20px
- Corps de texte : Inter Regular, 14-16px
- Code : JetBrains Mono, 13px

4. Règles d'utilisation
- Toujours respecter les proportions du logo
- Ne pas modifier les couleurs de la charte
- Utiliser les templates fournis pour les présentations
- Soumettre toute création visuelle à validation`
  },
  {
    key: 'cr',
    title: 'Compte-rendu réunion 15 avril 2026',
    description: 'Compte-rendu de la réunion de suivi projet du 15 avril 2026',
    folder: 'plateforme',
    status: 'DIFFUSION',
    category: 'technique',
    author: 'Michaël Harbouche',
    uploader: membreId,
    tags: ['réunion', 'compte-rendu'],
    version: '1.0',
    date: '2026-04-16',
    content: `Compte-rendu de réunion - Suivi projet plateforme documentaire
Date : 15 avril 2026
Participants : R. Picard, M. Mirande-Ney, M. Harbouche, M. Membre

Ordre du jour :
1. Point d'avancement
2. Démonstration nouvelles fonctionnalités
3. Retours utilisateurs
4. Planning Q2

1. Avancement
- Module de versioning : terminé et déployé
- Module wiki : en cours de développement (80%)
- Recherche plein texte : opérationnelle
- Dashboard statistiques : maquettes validées

2. Démonstration
- Présentation du workflow de validation documentaire
- Démonstration de la recherche avancée avec filtres
- Prévisualisation des documents PDF en ligne

3. Retours utilisateurs
- Demande d'export en lot (priorité haute)
- Amélioration des notifications par email
- Ajout d'un mode sombre (priorité basse)

4. Planning Q2
- Semaine 16-17 : Finalisation module wiki
- Semaine 18-19 : Tests et recette
- Semaine 20 : Mise en production v2.0

Prochaine réunion : 29 avril 2026`
  },
  {
    key: 'note_vps',
    title: 'Note interne - Choix hébergement VPS',
    description: 'Analyse comparative des solutions VPS pour héberger la plateforme FSN',
    folder: 'plateforme',
    status: 'RELECTURE',
    category: 'technique',
    author: "Moss'Ab Mirande-Ney",
    uploader: adminId,
    tags: ['infrastructure', 'VPS', 'hébergement'],
    version: '1.0',
    date: '2026-03-25',
    content: `Note interne - Choix de la solution d'hébergement VPS

1. Contexte
La plateforme documentaire FSN nécessite un hébergement fiable et sécurisé.
Cette note compare les principales options disponibles.

2. Critères de sélection
- Performance (CPU, RAM, stockage SSD)
- Localisation des serveurs (France/UE obligatoire - RGPD)
- Disponibilité garantie (SLA > 99.9%)
- Support technique réactif
- Rapport qualité/prix

3. Solutions évaluées
| Critère | OVH | Scaleway | Hetzner |
|---------|-----|----------|---------|
| vCPU | 4 | 4 | 4 |
| RAM | 8 Go | 8 Go | 8 Go |
| SSD | 80 Go | 80 Go | 80 Go |
| Prix/mois | 26 EUR | 32 EUR | 18 EUR |
| Localisation | FR | FR | DE |

4. Recommandation
Nous recommandons OVH pour les raisons suivantes :
- Serveurs localisés en France (conformité RGPD)
- Bon rapport qualité/prix
- Support technique en français
- Expérience positive sur d'autres projets

5. Décision
Solution retenue : OVH VPS B2-15 (4 vCPU, 8 Go RAM, 80 Go SSD NVMe)
Budget mensuel : 26 EUR HT`
  },
  {
    key: 'glossaire',
    title: 'Glossaire termes santé numérique',
    description: 'Glossaire des principaux termes utilisés dans le domaine de la santé numérique',
    folder: 'formations',
    status: 'DIFFUSION',
    category: 'formation',
    author: 'Robert Picard',
    uploader: adminId,
    tags: ['glossaire', 'définitions'],
    version: '1.0',
    date: '2026-04-08',
    content: `Glossaire - Santé numérique

ANSSI : Agence Nationale de la Sécurité des Systèmes d'Information.
Organisme rattaché au Premier ministre chargé de la cybersécurité en France.

DMP : Dossier Médical Partagé. Carnet de santé numérique qui conserve
les informations de santé des patients.

DPO : Data Protection Officer (Délégué à la Protection des Données).
Personne chargée de veiller à la conformité RGPD d'une organisation.

e-Santé : Ensemble des technologies numériques appliquées au domaine
de la santé (télémédecine, objets connectés, plateformes de soins).

HDS : Hébergeur de Données de Santé. Certification obligatoire pour
tout hébergeur stockant des données de santé à caractère personnel.

INS : Identifiant National de Santé. Numéro unique permettant
d'identifier un patient dans le système de santé français.

PGSSI-S : Politique Générale de Sécurité des Systèmes d'Information de Santé.
Cadre de référence pour la sécurité des systèmes de santé.

RGPD : Règlement Général sur la Protection des Données.
Règlement européen encadrant le traitement des données personnelles.

Téléconsultation : Consultation médicale réalisée à distance via
des outils de visioconférence sécurisés.

Télémédecine : Pratique médicale à distance utilisant les technologies
numériques (téléconsultation, téléexpertise, télésurveillance).`
  },
];

// Create files and document records
const insertDoc = db.prepare(
  `INSERT INTO Document (id, title, description, filename, storedName, filePath, fileSize, mimeType,
   categoryId, folderId, tags, authorName, publishedAt, uploadedBy, status, currentVersion, isArchived,
   textContent, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const docIds = {};
const existingDocCount = db.prepare("SELECT COUNT(*) as c FROM Document").get().c;
if (existingDocCount > 0) {
  console.log('Documents already exist:', existingDocCount, '- skipping seed');
  db.close();
  process.exit(0);
}
const createDocuments = db.transaction(() => {
  for (const d of docDefs) {
    const id = uid();
    docIds[d.key] = id;
    const storedName = id + '.txt';
    const filePath = path.join(uploadsDir, storedName);
    const filename = d.title.replace(/[^a-zA-ZÀ-ÿ0-9\s-]/g, '').replace(/\s+/g, '_') + '.txt';

    // Write file
    fs.writeFileSync(filePath, d.content, 'utf8');
    const fileSize = Buffer.byteLength(d.content, 'utf8');

    const folderId = d.folder ? folderIds[d.folder] : null;
    const categoryId = catMap[d.category];
    const tags = JSON.stringify(d.tags || []);
    const createdAt = isoDate(d.date);
    const updatedAt = isoDate(d.date);
    const publishedAt = (d.status === 'DIFFUSION' || d.status === 'ARCHIVE') ? createdAt : null;

    insertDoc.run(
      id, d.title, d.description, filename, storedName, filePath, fileSize, 'text/plain',
      categoryId, folderId, tags, d.author, publishedAt, d.uploader, d.status, d.version,
      d.isArchived ? 1 : 0, d.content, createdAt, updatedAt
    );
  }
});
createDocuments();
console.log('Documents created:', Object.keys(docIds).length);

// ─── 6. Document Versions ────────────────────────────────────────────────
const insertVersion = db.prepare(
  `INSERT INTO DocumentVersion (id, documentId, version, type, filename, storedName, filePath, fileSize, changelog, uploadedBy, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const createVersions = db.transaction(() => {
  const versionSets = [
    {
      docKey: 'cahier',
      versions: [
        { v: '1.0', type: 'MAJOR', changelog: 'Version initiale du cahier des charges', date: '2026-03-10', uploader: adminId },
        { v: '1.1', type: 'MINOR', changelog: 'Corrections typographiques', date: '2026-03-20', uploader: membreId },
        { v: '2.0', type: 'MAJOR', changelog: 'Refonte suite retours client', date: '2026-04-10', uploader: adminId },
      ]
    },
    {
      docKey: 'plan',
      versions: [
        { v: '1.0', type: 'MAJOR', changelog: 'Version initiale du plan stratégique', date: '2026-03-15', uploader: adminId },
        { v: '1.1', type: 'MINOR', changelog: 'Ajout objectifs Q3', date: '2026-04-01', uploader: adminId },
      ]
    },
    {
      docKey: 'rgpd',
      versions: [
        { v: '1.0', type: 'MAJOR', changelog: 'Version initiale du guide RGPD', date: '2026-03-01', uploader: adminId },
        { v: '1.1', type: 'MINOR', changelog: 'Mise à jour articles', date: '2026-03-10', uploader: adminId },
        { v: '1.2', type: 'MINOR', changelog: 'Ajout annexes', date: '2026-03-15', uploader: adminId },
      ]
    },
  ];

  let count = 0;
  for (const vs of versionSets) {
    const docId = docIds[vs.docKey];
    // Get the doc's stored file info to reuse for version records
    const doc = db.prepare('SELECT filename, storedName, filePath, fileSize FROM Document WHERE id = ?').get(docId);
    for (const ver of vs.versions) {
      const vid = uid();
      const vStoredName = vid + '.txt';
      const vFilePath = path.join(uploadsDir, vStoredName);
      // Copy the document file for version
      fs.copyFileSync(doc.filePath, vFilePath);
      insertVersion.run(
        vid, docId, ver.v, ver.type, doc.filename, vStoredName, vFilePath, doc.fileSize,
        ver.changelog, ver.uploader, isoDate(ver.date)
      );
      count++;
    }
  }
  console.log('Document versions created:', count);
});
createVersions();

// ─── 7. Wiki Contributions ───────────────────────────────────────────────
const insertWiki = db.prepare(
  `INSERT INTO WikiContribution (id, documentId, userId, content, type, isApproved, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const createWiki = db.transaction(() => {
  const contribs = [
    {
      doc: 'cahier', user: adminId, type: 'NOTE',
      content: 'Points validés avec le client le 15 avril. Le périmètre fonctionnel est confirmé, reste à affiner les délais de livraison pour le module wiki.',
      approved: true, date: '2026-04-15'
    },
    {
      doc: 'cahier', user: membreId, type: 'COMMENTAIRE',
      content: 'Vérifier la section sécurité avec M. Harbouche. Il faudrait ajouter les détails sur le chiffrement des données au repos et en transit.',
      approved: true, date: '2026-04-16'
    },
    {
      doc: 'cahier', user: membreId, type: 'ANNOTATION',
      content: 'Page 12 : reformuler le paragraphe sur l\'archivage. La politique de rétention n\'est pas claire pour les documents de plus de 5 ans.',
      approved: false, date: '2026-04-18'
    },
    {
      doc: 'plan', user: adminId, type: 'NOTE',
      content: 'Budget validé en CA du 20 avril. Les enveloppes annuelles sont confirmées. Prévoir une revue budgétaire à mi-parcours en septembre.',
      approved: true, date: '2026-04-20'
    },
    {
      doc: 'rgpd', user: membreId, type: 'COMMENTAIRE',
      content: 'Ajouter référence au nouveau règlement européen sur l\'IA (AI Act) qui impacte également le traitement des données de santé par les algorithmes.',
      approved: true, date: '2026-04-12'
    },
    {
      doc: 'protocole', user: adminId, type: 'NOTE',
      content: 'Conforme aux exigences ANSSI. Vérifié lors de l\'audit du 10 avril 2026. Prochaine revue prévue en octobre 2026.',
      approved: true, date: '2026-04-11'
    },
  ];

  for (const c of contribs) {
    const ts = isoDate(c.date);
    insertWiki.run(uid(), docIds[c.doc], c.user, c.content, c.type, c.approved ? 1 : 0, ts, ts);
  }
  console.log('Wiki contributions created:', contribs.length);
});
createWiki();

// ─── 8. Activity Logs ───────────────────────────────────────────────────
const insertLog = db.prepare(
  `INSERT INTO ActivityLog (id, userId, action, entityType, entityId, entityName, metadata, ipAddress, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const createLogs = db.transaction(() => {
  const ip = '92.184.112.45';
  const logs = [
    { user: adminId, action: 'LOGIN', entity: 'USER', entityId: adminId, name: 'Administrateur FSN', date: '2026-03-01T08:30:00', meta: { browser: 'Chrome 124' } },
    { user: adminId, action: 'DOCUMENT_UPLOAD', entity: 'DOCUMENT', entityId: docIds.rgpd, name: 'Guide RGPD Santé Numérique', date: '2026-03-15T09:15:00', meta: { fileSize: 2048 } },
    { user: adminId, action: 'DOCUMENT_STATUS_CHANGE', entity: 'DOCUMENT', entityId: docIds.rgpd, name: 'Guide RGPD Santé Numérique', date: '2026-03-15T09:20:00', meta: { from: 'BROUILLON', to: 'DIFFUSION' } },
    { user: adminId, action: 'DOCUMENT_UPLOAD', entity: 'DOCUMENT', entityId: docIds.cahier, name: 'Cahier des charges - Plateforme FSN', date: '2026-03-10T10:00:00', meta: { fileSize: 3500 } },
    { user: membreId, action: 'LOGIN', entity: 'USER', entityId: membreId, name: 'Marie Membre', date: '2026-03-20T08:00:00', meta: { browser: 'Firefox 125' } },
    { user: membreId, action: 'DOCUMENT_VERSION_UPLOAD', entity: 'DOCUMENT', entityId: docIds.cahier, name: 'Cahier des charges - Plateforme FSN', date: '2026-03-20T10:30:00', meta: { version: '1.1', type: 'MINOR' } },
    { user: adminId, action: 'DOCUMENT_UPLOAD', entity: 'DOCUMENT', entityId: docIds.plan, name: 'Plan stratégique 2026-2028', date: '2026-03-15T14:00:00', meta: {} },
    { user: membreId, action: 'WIKI_CONTRIBUTION', entity: 'DOCUMENT', entityId: docIds.cahier, name: 'Cahier des charges - Plateforme FSN', date: '2026-04-16T11:00:00', meta: { type: 'COMMENTAIRE' } },
    { user: adminId, action: 'DOCUMENT_STATUS_CHANGE', entity: 'DOCUMENT', entityId: docIds.cahier, name: 'Cahier des charges - Plateforme FSN', date: '2026-04-10T16:00:00', meta: { from: 'ENRICHISSEMENT', to: 'RELECTURE' } },
    { user: lecteurId, action: 'LOGIN', entity: 'USER', entityId: lecteurId, name: 'Leo Lecteur', date: '2026-04-20T09:00:00', meta: { browser: 'Safari 18' } },
    { user: lecteurId, action: 'DOCUMENT_UPLOAD', entity: 'DOCUMENT', entityId: docIds.charte, name: 'Charte graphique FSN', date: '2026-04-20T09:30:00', meta: { fileSize: 1500 } },
    { user: adminId, action: 'USER_GROUP_ASSIGN', entity: 'USER', entityId: membreId, name: 'Marie Membre', date: '2026-03-05T10:00:00', meta: { group: 'Équipe Technique' } },
    { user: adminId, action: 'FOLDER_CREATE', entity: 'FOLDER', entityId: folderIds.reglementation, name: 'Réglementation', date: '2026-03-01T08:45:00', meta: {} },
    { user: adminId, action: 'CATEGORY_CREATE', entity: 'CATEGORY', entityId: catMap.reglementation, name: 'Réglementation', date: '2026-03-01T08:40:00', meta: {} },
    { user: adminId, action: 'DOCUMENT_ARCHIVE', entity: 'DOCUMENT', entityId: docIds.rapport, name: 'Rapport transformation digitale Q1 2026', date: '2026-04-30T17:00:00', meta: {} },
  ];

  for (const l of logs) {
    insertLog.run(uid(), l.user, l.action, l.entity, l.entityId || null, l.name || null,
      JSON.stringify(l.meta || {}), ip, isoDate(l.date));
  }
  console.log('Activity logs created:', logs.length);
});
createLogs();

// ─── Summary ─────────────────────────────────────────────────────────────
console.log('\n=== Seed Complete ===');
const counts = {
  categories: db.prepare('SELECT count(*) as c FROM Category').get().c,
  groups: db.prepare('SELECT count(*) as c FROM UserGroup').get().c,
  folders: db.prepare('SELECT count(*) as c FROM Folder').get().c,
  documents: db.prepare('SELECT count(*) as c FROM Document').get().c,
  versions: db.prepare('SELECT count(*) as c FROM DocumentVersion').get().c,
  contributions: db.prepare('SELECT count(*) as c FROM WikiContribution').get().c,
  logs: db.prepare('SELECT count(*) as c FROM ActivityLog').get().c,
};
console.log(JSON.stringify(counts, null, 2));

db.close();
