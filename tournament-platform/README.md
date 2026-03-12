Plateforme de tournoi Free Fire 1v1 (Spam / One Tap) avec système de crédits, ROI, défis, matchs et dashboard admin.

## Getting Started

### 1) Variables d'environnement

Copier `.env.example` vers `.env` et remplir :

- `DATABASE_URL` (PostgreSQL)
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `CLOUDINARY_*`

### 2) Base de données (Prisma)

```bash
npx prisma migrate dev
```

### 3) Démarrer en dev

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Admin

Pour créer un admin, mets `role=ADMIN` sur le joueur concerné (via Prisma Studio `npx prisma studio` ou SQL).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

Stack: Next.js 14 (App Router), TypeScript, TailwindCSS, Prisma + PostgreSQL, NextAuth (Credentials), Cloudinary.

## App Mobile Et Desktop

Une base d'app officielle est maintenant preparee dans le repo autour du site existant.

- PWA installable directement depuis le navigateur
- Shell desktop Electron avec splash local et ouverture du site officiel
- Base mobile Capacitor pour Android et iOS autour de l'URL de production

### Variables utiles

- `KING_LEAGUE_APP_URL` pour definir l'URL web utilisee par les shells mobile et desktop

URL actuelle attendue: `https://kingleague.space`

### Commandes

```bash
npm install
npm run app:desktop
npm run app:desktop:dev
npm run app:mobile:sync
npm run app:mobile:android
npm run app:mobile:ios
```

### Important

La base technique est prete dans le code, mais une app officiellement certifiee passe ensuite par une vraie signature et une publication sur les canaux adequats:

- Android: signature release puis Google Play ou distribution MDM
- iOS: signature Apple puis App Store ou TestFlight
- Desktop: signature Windows ou notarisation macOS selon la cible

Le fichier de loader `icons8-chargement-infini-50.apng.png` n'etait pas present dans le workspace au moment de cette mise en place, donc le chargement premium utilise pour l'instant une animation integree.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
