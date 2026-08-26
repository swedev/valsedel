# Valsedel - Implementeringsplan

## Mål
Skapa en proof-of-concept för ranked choice voting i Sverige med modern, produktionsklar arkitektur.

## Arkitekturbeslut

| Beslut | Val | Motivering |
|--------|-----|------------|
| Framework | Next.js 15 (App Router) | Modern, server components, bättre DX |
| Databas | PostgreSQL | Relationsdata (partier, kandidater, regioner) |
| ORM | Drizzle | Type-safe, snabb, SQL-nära |
| Container | Docker + docker-compose | Reproducerbar miljö |
| Styling | Tailwind CSS 4 | Befintlig kunskap, modern version |
| Partisymboler | partidata | En gemensam valkretsbunt; inga lokala kopior eller anrop per valt parti |

## Katalogstruktur

```
valsedel/
├── docker-compose.yml             # PostgreSQL
├── Dockerfile                     # Next.js container
├── .env.example                   # Miljövariabler
│
├── src/db/
│   ├── schema.ts                  # Drizzle-schema
│   ├── index.ts                   # Databasanslutning
│   └── seed.ts                    # Importera partidata
│
├── scripts/                       # Från partidata (för dataimport)
│   ├── collect.ts                 # Hämta data från val.se
│   ├── import-parties.ts          # Importera till PostgreSQL
│   └── helpers.ts
│
├── src/
│   ├── app/                       # Next.js 15 App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Startsida
│   │   ├── skapa/
│   │   │   └── [valtyp]/
│   │   │       └── page.tsx       # Skapa valsedel
│   │   ├── valsedel/
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Delbar länk
│   │   └── api/
│   │       ├── partier/
│   │       │   └── route.ts       # GET /api/partier
│   │       ├── kandidater/
│   │       │   └── [kod]/route.ts
│   │       └── regioner/
│   │           └── route.ts
│   │
│   ├── components/
│   │   ├── BallotPreview.tsx
│   │   ├── ElectionTypeSelector.tsx
│   │   ├── PartySearch.tsx
│   │   └── CandidateList.tsx
│   │
│   └── lib/
│       └── types.ts
│
└── package.json
```

## API-design

### `GET /api/partier?search=&valtyp=&limit=`
Sök partier, filtrera på valtyp.

### `GET /api/kandidater/[partikod]?valtyp=&region=`
Hämta kandidatlista för ett parti.

### `GET /api/regioner?typ=lan|kommun`
Lista regioner.

## Databasschema (Drizzle)

Se `src/db/schema.ts` för komplett schema.

Tabeller:
- `parties` - Alla registrerade partier
- `regions` - Län och kommuner
- `candidates` - Kandidater per parti/region/val
- `election_participations` - Vilka partier ställer upp var
- `ballots` - Sparade valsedlar (för delningslänkar)
- `ballot_choices` - Val på en valsedel

## Implementeringsfaser

### Fas 0: Projektsetup
- [x] Skapa nytt Next.js 15-projekt med App Router
- [x] Konfigurera TypeScript, Tailwind CSS, ESLint
- [x] Skapa `docker-compose.yml` med PostgreSQL
- [x] Sätt upp Drizzle ORM med schema
- [x] Konfigurera `drizzle.config.ts`
- [ ] Skapa `Dockerfile` för Next.js
- [ ] Installera dotenv för seed-script
- [ ] Verifiera att `docker-compose up` fungerar

### Fas 1: Datainsamling & import
- [ ] Porta scripts från partidata till TypeScript
- [ ] Uppdatera för 2022 års val (verifiera val.se API)
- [ ] Implementera `src/db/seed.ts` för dataimport
- [ ] Importera partier, regioner, kandidater
- [ ] Hämta partisymboler från partidata som del av valkretsbunten

### Fas 2: API-endpoints
- [ ] `GET /api/partier?search=&valtyp=&regionKod=`
- [ ] `GET /api/regioner?typ=&lanKod=`
- [ ] `GET /api/kandidater/[partikod]?valtyp=&regionKod=`
- [ ] `POST /api/valsedel` - skapa delbar länk
- [ ] `GET /api/valsedel/[shortId]` - hämta sparad valsedel

### Fas 3: UI-komponenter
- [ ] `ElectionTypeSelector` - välj riksdag/region/kommun/EU
- [ ] `RegionSelector` - välj län/kommun (för region/kommun-val)
- [ ] `PartySearch` - sök och välj partier
- [ ] `CandidateList` - visa kandidater, välj personröst
- [ ] `BallotPreview` - valsedel med rätt färg per valtyp

### Fas 4: Flöde & UX
- [ ] Startsida med kort intro om ranked choice voting
- [ ] `/skapa/[valtyp]` - huvudflöde för att skapa valsedel
- [ ] Stöd för 1-3 rangordnade val
- [ ] Realtidsuppdatering av förhandsvisning
- [ ] Valsedelsfärger:
  - Riksdag: Gul (#F7F6C2)
  - Region: Blå (#CDE6F7)
  - Kommun: Vit
  - EU: Vit med EU-flagga

### Fas 5: Delning & utskrift
- [ ] `/valsedel/[shortId]` - visa sparad valsedel
- [ ] CSS print-styles (A4, rätt proportioner)
- [ ] "Skriv ut"-knapp
- [ ] "Kopiera länk"-knapp
- [ ] Open Graph-tags för förhandsvisning vid delning

## Vad vi INTE gör (PoC-scope)

- Användarkonton/inloggning
- Betalning/beställning av fysiska valsedlar
- Fullständig mobiloptimering
- Tillgänglighet (a11y) - men grundläggande keyboard-nav
- E2E-tester (manuell testning räcker för PoC)
- CI/CD pipeline
- Produktions-deploy (lokal Docker räcker)

## Verifiering

1. `docker-compose up -d db` - starta PostgreSQL
2. `npm run db:push` - kör Drizzle migrations
3. `npm run db:seed` - importera partidata
4. `npm run dev` - starta Next.js
5. Gå till http://localhost:3000
6. Välj valtyp → sök parti → se förhandsvisning
7. Testa utskrift via Ctrl+P / Cmd+P
8. Skapa valsedel, kopiera länk, öppna i nytt fönster

## Vad vi återanvänder

| Från | Vad | Hur |
|------|-----|-----|
| partidata | Datainsamlingsscripts | Porta till TypeScript |
| partidata | Regiondata (SCB) | Importera till PostgreSQL |
| partidata | Partisymboler | Leverera i valkretsbunten utan anrop per valt parti |
| valsedel (gamla) | Valsedel-CSS/design | Anpassa för nya komponenter |
| valsedel (gamla) | Autosuggest-logik | Inspirera ny PartySearch |

## Beslut

- **Valdata:** 2022 (hämta ny data)
- **Valtyper:** Alla fyra (riksdag, region, kommun, EU)
- **Stack:** Next.js 15+, PostgreSQL, Drizzle, Docker
