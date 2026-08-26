# Valsedel.se - Framsteg

Senast uppdaterad: 2026-01-17

## Fas 0: Projektsetup - KLAR

### Klart

- [x] Next.js 16 projekt skapat med App Router
- [x] TypeScript, Tailwind CSS 4, ESLint konfigurerat
- [x] `docker-compose.yml` skapad med PostgreSQL 16
- [x] Drizzle ORM installerat (drizzle-orm, drizzle-kit)
- [x] `drizzle.config.ts` skapad
- [x] `src/db/schema.ts` - komplett databasschema
- [x] `src/db/index.ts` - databasanslutning
- [x] `src/db/seed.ts` - importerar parti- och regiondata från partidata-repo
- [x] `.env.example` och `.env.local` skapade
- [x] `dotenv` installerat för seed-script
- [x] `Dockerfile` för Next.js med multi-stage build
- [x] `.dockerignore` skapad
- [x] `docker-compose up -d db` verifierad - PostgreSQL fungerar
- [x] `npm run db:push` verifierad - skapar databastabeller
- [x] `npm run db:seed` verifierad - importerar data

### Data importerad

- **333 partier** importerade med kod, beteckning och förkortning
- **21 län** importerade
- **290 kommuner** importerade med koppling till sina län

## Fas 1: Datainsamling & import - KLAR (grundläggande)

Grundläggande import från partidata-repo fungerar:
- [x] Seed-script läser partidata från `../partidata`
- [x] Partier importeras med kod, beteckning, förkortning, registreringsdatum
- [x] Regioner (län och kommuner) importeras med hierarki
- [ ] Partisymboler ska hämtas från partidata i den framtida valkretsbunten; lokala kopior används inte

### Senare (ej nödvändigt för PoC)
- [ ] Hämta aktuell kandidatdata från val.se
- [ ] Importera valdeltagande per region

## Fas 2: API-endpoints - KLAR

Alla grundläggande API:er implementerade och testade:

- [x] `GET /api/partier?search=&limit=` - Sök partier
- [x] `GET /api/regioner?typ=&lanKod=` - Lista län och kommuner
- [x] `GET /api/kandidater/[partikod]?valtyp=&regionKod=` - Kandidatlista (redo för data)

### Exempel-anrop

```bash
# Sök partier
curl "http://localhost:3000/api/partier?search=center"

# Hämta alla län
curl "http://localhost:3000/api/regioner?typ=lan"

# Hämta kommuner i Stockholms län
curl "http://localhost:3000/api/regioner?typ=kommun&lanKod=01"

# Hämta kandidater för Moderaterna
curl "http://localhost:3000/api/kandidater/0001"
```

## Fas 3: UI-komponenter - KLAR

Alla komponenter implementerade och fungerar:

- [x] `ElectionTypeSelector` - Välj valtyp med rätt färgkodning
- [x] `RegionSelector` - Välj län/kommun (visas endast vid region/kommunval)
- [x] `PartySearch` - Sök partier med autocomplete och logotyper
- [x] `BallotPreview` - Förhandsvisning med:
  - Rätt bakgrundsfärg per valtyp (gul=riksdag, blå=region, vit=kommun/EU)
  - Partilogotyper
  - Rangordningsknappar (flytta upp/ner)
  - Ta bort-knapp

### Huvudsida (src/app/page.tsx)
- Steg-för-steg-flöde
- Responsiv layout (mobil + desktop)
- Sticky preview-panel på desktop
- Info-box om ranked choice voting

## Fas 4: LaTeX PDF-generering - KLAR

Exakt valsedelsgenerering via LaTeX/XeLaTeX:

### Specifikationer (enligt Valmyndigheten)
- [x] Format: A6 (105 × 148 mm)
- [x] Marginaler: 10mm sidor, 4mm topp
- [x] Typsnitt: Open Sans
- [x] Färger: Gul (riksdag), Blå (region), Vit (kommun/EU)
- [x] Signallinjer: 2 (riksdag), 1 (region), 0 (kommun/EU)
- [x] Kryssrutor med kandidatnummer
- [x] Partisymbol: 85,5 × 12,75 mm

### Implementerat
- [x] `src/lib/latex-generator.ts` - Genererar LaTeX från användardata
- [x] `POST /api/valsedel/pdf` - API-endpoint för PDF-generering
- [x] `latex/Dockerfile` - Docker-container med texlive/XeLaTeX
- [x] `latex/SPECIFIKATION.md` - Dokumenterade mått och regler

### Exempel-anrop
```bash
curl -X POST http://localhost:3000/api/valsedel/pdf \
  -H "Content-Type: application/json" \
  -d '{
    "electionType": "riksdag",
    "valkrets": "Stockholms kommun",
    "partibeteckning": "Socialdemokraterna",
    "kandidater": [
      {"fornamn": "Anna", "efternamn": "Andersson", "info": "45 år, lärare"}
    ]
  }' \
  --output valsedel.pdf
```

## Fas 5: Frontend-integration - KLAR

PDF-generering integrerad med frontend:

- [x] Ladda ner-knapp i BallotPreview-komponenten
- [x] API-endpoint fungerar med Docker-baserad LaTeX-kompilering
- [x] Open Sans font korrekt konfigurerad med absolut sökväg
- [x] Alla valtyper testade (riksdag, region, kommun)

## Nästa steg

1. Hämta kandidatlistor från val.se
2. Finjustera LaTeX-layout efter riktiga valsedlar
3. Lägg till partilogotyper i PDF:en

## Kommandon

```bash
# Starta PostgreSQL
docker-compose up -d db

# Skapa/uppdatera databastabeller
npm run db:push

# Importera partidata
npm run db:seed

# Starta utvecklingsserver
npm run dev

# Öppna Drizzle Studio (databasverktyg)
npm run db:studio

# Bygg och kör med Docker (full stack)
docker-compose up --build
```

## Projektstruktur

```
valsedel/
├── docs/
│   ├── PLAN.md          # Implementeringsplan
│   └── PROGRESS.md      # Denna fil
├── latex/
│   ├── Dockerfile       # texlive/XeLaTeX container
│   ├── SPECIFIKATION.md # Valsedelsmått från Valmyndigheten
│   ├── templates/       # LaTeX-mallar
│   └── output/          # Genererade filer
├── src/
│   ├── app/
│   │   ├── page.tsx     # Huvudsida med flöde
│   │   ├── layout.tsx   # Root layout
│   │   └── api/
│   │       ├── partier/route.ts
│   │       ├── regioner/route.ts
│   │       ├── kandidater/[partikod]/route.ts
│   │       └── valsedel/pdf/route.ts  # PDF-generering
│   ├── components/
│   │   ├── ElectionTypeSelector.tsx
│   │   ├── RegionSelector.tsx
│   │   ├── PartySearch.tsx
│   │   ├── BallotPreview.tsx
│   │   └── index.ts
│   ├── lib/
│   │   └── latex-generator.ts  # Genererar LaTeX-kod
│   └── db/
│       ├── schema.ts    # Drizzle-schema
│       ├── index.ts     # DB-anslutning
│       └── seed.ts      # Dataimport
├── public/
│   └── logos/           # Partilogotyper (104 st)
├── docker-compose.yml   # PostgreSQL + Next.js + LaTeX
├── Dockerfile           # Multi-stage build
├── drizzle.config.ts
├── .env                 # Miljövariabler
├── .env.local           # Lokala miljövariabler
└── package.json
```

## Relaterade resurser

- Partidata-repo: `/Users/matte/repos/partidata`
  - Innehåller: partidata, regiondata
  - Används av seed-scriptet för import
