# Modernisering, publicering och deploy

Utvärdering av projektets tillstånd och en plan för att ta det till
referensstacken, publicera på minvalsedel.se och driftsätta på saga.

Beslut i det här dokumentet är märkta med sitt ursprung: *(användarbeslut)*,
*(befintlig konvention)* eller *(bedömning)*. Bedömningar är öppna att
ifrågasätta — de är förslag, inte avgjorda frågor.

`PLAN.md` och `PROGRESS.md` beskriver den ombyggnad som gjordes i januari 2026
och är inte uppdaterade efter det. De läses som historik.

## Sammanfattning

Appen fungerar och är liten — knappt 2 000 rader kod, typecheck är grön, hela
flödet från valtyp till nedladdad A6-PDF går igenom. Men den står på en annan
stack än timla, styrla och openvera, PDF-generering sker genom att
Next.js-processen kör `docker exec` mot en sidovagnscontainer, och partidata
kopieras in i en egen Postgres via en filsökväg till en checkout bredvid repot.
Ingen av de tre bär en driftsättning.

Referensstackens backend är Python, klartex är ett Python-bibliotek, och
klartex biblioteks-API är den enda vägen som löser partisymboler som assets.
Omformen till referensstacken är därför inte bara konvergens — den gör
PDF-integrationen enkel.

Tyngdpunkten i arbetet ligger inte i stackbytet utan i integritetsmodellen.
Att tjänsten inte ska kunna röja hur någon röstar är PoC:ens egentliga
påstående, och det påståendet ställer krav på varje dataanrop appen gör — inte
bara på renderingen.

## Fattade beslut

| Fråga | Beslut |
|-------|--------|
| Domän | `minvalsedel.se`, registrerad. Repot förblir `swedev/valsedel` *(användarbeslut)* |
| Docker på saga | Installeras; fler sajter kommer att behöva det *(användarbeslut)* |
| Delning | URL-kodad valsedel, ingen Postgres *(användarbeslut)* |
| Integritet | Nedladdningen innehåller fler valsedlar än användarens egen *(användarbeslut)* |
| klartex | `valsedel`-mall bidras till kärnan *(användarbeslut)* |
| Ikoner | `lucide-react` har ersatt FontAwesome Pro *(genomfört användarbeslut)* |
| FontAwesome-token | Roteras av dig, utanför det här arbetet *(användarbeslut)* |

Asset-luckan i klartex HTTP-API är anmäld som
[swedev/klartex.se#18](https://github.com/swedev/klartex.se/issues/18). Den
blockerar inte minvalsedel, eftersom biblioteksvägen används här.

## Nuläge

### Vad som finns

| Del | Tillstånd |
|-----|-----------|
| Next.js 16 App Router, React 19, Tailwind 4 + daisyUI | Fungerar |
| Drizzle + Postgres 16, sex tabeller | Fungerar, seedad |
| `GET /api/partier`, `/api/regioner`, `/api/kandidater/[partikod]` | Fungerar |
| `POST /api/valsedel/pdf` | Fungerar lokalt med Docker igång |
| Fyra UI-komponenter, enstegsflöde | Fungerar |
| LaTeX-generator för A6-valsedel | Fungerar, mätt mot Valmyndighetens spec |
| `latex/SPECIFIKATION.md` | Genomarbetad, med källhänvisningar |
| Delbara länkar, utskriftsvy, OG-tags | Ej byggt |
| Tester, CI, precommit | Saknas helt |

Hela ombyggnaden ligger stagead i indexet sedan januari utan commit. Det är i
sig en risk: arbetet finns bara i arbetskatalogen.

### Vad som blockerar

**1. FontAwesome Pro-token i git-historiken.** En token är committad i
`15d9834`. `swedev/valsedel` är ett publikt repo, så token har legat exponerad.
Rotation är rätt åtgärd; historikskrivning på ett publikt repo hjälper inte
mot något som redan är läst. FontAwesome-konfigurationen och paketen har nu
tagits bort ur arbetskopian och ikonerna har ersatts med `lucide-react`.

**2. PDF-vägen bär ingen drift.** `src/app/api/valsedel/pdf/route.ts` kör
`docker cp` och `docker exec` mot containern `valsedel-latex-1` från
webbprocessen. Det kräver att appen når dockersocketen, filnamn interpoleras in
i skalkommandon, och `.tex`/`.pdf` mellanlagras i `/tmp` och en `output/`-katalog.
Dessutom sväljs kompileringsfel: `xelatex` misslyckas, felet loggas, och svaret
blir ett generiskt "Kunde inte skapa PDF".

**3. Partidata kopieras in på fel nyckel.** `src/db/seed.ts` läser
`../partidata/data/…` från filsystemet och skriver partier och regioner till
egen Postgres. Kopplingen görs på `kod`. Partidata dokumenterar uttryckligen att
`kod` byts — `tidigare_koder` och `kodbyten.json` finns just för det — och att
`uuid` är den stabila identitet andra projekt ska referera. Valkompassens README
formulerar samma princip för ekosystemet. Valsedel bygger alltså på ett fält som
ändras. Vilken version av partidata databasen speglar går inte att svara på.

**4. Kandidatdata hämtas förbi partidata.** `src/db/seed-candidates.ts` läser
`data.val.se/filer/val2026/parti/kandidaturer.csv` direkt. Partidata har redan
`val/<år>/kandidatlistor/` som hem för detta, om än i utkastform, och äger
importlogiken för Valmyndighetens filer.

**5. API:t röjer valet innan någon PDF genereras.** `GET /api/kandidater/[partikod]`
talar om för servern exakt vilket parti användaren tittar på. Samma sak gäller
varje partisymbol som hämtas som egen bild när användaren väljer parti. Det
spelar ingen roll hur väl den slutliga renderingen skyddas om urvalet redan har
läckt på vägen dit. Se integritetsavsnittet.

## Gap mot referensstacken

Referensen är timla, styrla och openvera, med valkompass som färskaste
frontend-exempel i swedev-organisationen.

| | Valsedel idag | Referensstacken |
|---|---|---|
| Backend | Next.js API routes | Flask 3 + gunicorn |
| Frontend | Next App Router | Vite 6 + React 19 |
| UI-bibliotek | daisyUI | Radix Themes + `@swedev/ui` |
| Ikoner | `lucide-react` | `lucide-react` |
| Datahämtning | `fetch` i komponent | TanStack Query |
| Routing | Next filbaserad | react-router |
| Repoform | enkelt npm-projekt | npm workspaces, node >= 24 |
| Kvalitetsgrind | ingen | `npm run precommit` + CI |
| Drift | docker-compose lokalt | `docker-compose.prod.yml`, GHCR, versionspinning |

Katalogformen i alla tre: `app/` (Flask), `frontend/` (Vite), `infra/`,
`scripts/`, `design/`, `agent-docs/`. SQLAlchemy, Alembic och Postgres ingår i
referensen men inte här — beslutet om URL-kodad delning tar bort databasen.

## Målarkitektur

```
valsedel/
├── app/                    # Flask + gunicorn, tillståndslös
│   ├── app.py              # factory, ProxyFix, en X-Forwarded-hop
│   ├── config.py
│   ├── routes/             # /api/valkrets/<kod>, /api/valsedel/pdf, /api/health
│   ├── partidata.py        # läser den pinnade datamängden
│   └── pdf.py              # import klartex; render(...)
├── frontend/               # Vite + React 19 + Radix Themes + @swedev/ui
├── data/                   # partidata, pinnad version, byggd i CI
├── infra/                  # compose, nginx-vhost, provisionering
├── scripts/
├── Dockerfile              # multi-stage: frontend-build + Python + TeX Live
└── docker-compose.prod.yml
```

Ingen databas. Appen håller inget tillstånd mellan anrop: partidata är
inbyggd och versionspinnad, och en delad valsedel bor i sin egen URL.

## Integritet

Det här är PoC:ens egentliga innehåll och bör byggas som ett uttalat påstående
som går att granska, inte som en funktion vid sidan av.

### Vem som kan lära sig vad

| Motpart | Ser idag | Bör se |
|---------|----------|--------|
| Servern | Valet, via kandidatuppslag och renderingsanrop | Valkretsen, inget mer |
| Den som senare hittar filen | Valet | En mängd valsedlar, utan markör för vilken som är användarens |
| Den som ser användaren i vallokalen | Valet | Utom räckhåll — inget teknikval ändrar det |

Valkretsen går inte att dölja: den står tryckt på valsedeln. Det är den enda
uppgift tjänsten behöver, och gränsen bör dras exakt där.

### Principen som följer av det

**Inget anrop får bero på användarens partival.** Alla data hämtas per valkrets,
aldrig per parti. Det ger tre konkreta konsekvenser:

- `GET /api/kandidater/[partikod]` utgår. Ersätts av ett anrop per valkrets som
  ger partier, kandidatlistor och symboler i ett svar.
- Partisymboler får inte hämtas som enskilda bilder när användaren väljer parti.
  Antingen följer valkretsens alla symboler med i samma svar, eller så visar
  förhandsvisningen ingen symbol. Ett `<img src="/logos/0002.png">` som laddas
  när användaren klickar är samma läcka som kandidatuppslaget.
- Förhandsvisning och rangordning sker helt i klienten, mot data den redan har.

En valkretsbunt är hanterbar. Partidata är 28 MB totalt, varav 11 MB
partisymboler i 251 filer om i snitt 46 KB. En enskild valkrets rymmer
storleksordningen tio till fyrtio partier, alltså ett par MB, och den är
cachebar och identisk för alla som väljer samma valkrets.

### Nedladdningen

Idén är att nedladdningen innehåller fler valsedlar än användarens egen, så att
varken servern eller den som senare hittar filen kan säga vilken som är
användarens *(användarbeslut)*. Fyra saker avgör om det blir ett verkligt skydd
eller bara en gest.

**Urvalet måste ske i klienten.** Genererar servern utfyllnaden vet den vilken
som är den riktiga, och hela poängen faller. Klienten väljer mängden, blandar
ordningen och skickar den utan markör. Servern renderar en mängd valsedlar den
inte kan skilja åt.

**Utfyllnaden måste vara trovärdig.** Slumpade partier ur hela registret ger en
mängd som domineras av småpartier, och den riktiga sticker ut för var och en som
kan svensk politik. *(Bedömning:)* för ett enkelval bör mängden i stället vara
**fullständig** — en valsedel per parti som ställer upp i valkretsen. Då lär sig
servern ingenting alls utöver valkretsen, och det går att förklara i en mening.

För rangordnade valsedlar går fullständighet inte: fyrtio partier ger runt
59 000 möjliga treställiga rangordningar. *(Bedömning:)* låt förstahandsvalet
vara fullständigt — varje parti i valkretsen förekommer som förstahandsval
exakt en gång — och slumpa andra- och tredjehandsval. Förstahandsvalet, som är
det som betyder mest, blir då perfekt dolt. Kvar finns en svaghet värd att skriva
ut i klartext: en motpart som modellerar hur svenska väljare faktiskt rangordnar
kan poängsätta mängden, och användarens egen rangordning är dragen ur
verkligheten medan utfyllnadens är slumpad. Att erkänna den svagheten är mer
värt för en PoC än att låtsas att den inte finns.

**Formatet bör vara en PDF med N sidor, inte en zip med N filer** *(bedömning)*.
En zip läcker på flera ställen samtidigt: filnamn som numrerar, mtime per post
som skiljer sig i millisekunder, och `/CreationDate` och `/ID` per PDF. Renderas
den riktiga först har den systematiskt tidigast tidsstämpel. En enda PDF har ett
enda metadatablock, inga filnamn, och sidordningen blandas i klienten. Den kräver
dessutom en xelatex-körning i stället för femtio, vilket är skillnaden mellan
någon sekund och över en halv minut. Metadata bör göras deterministisk —
`SOURCE_DATE_EPOCH` styr `/CreationDate` i XeLaTeX — vilket är en rimlig sak att
ta med i klartex-bidraget oavsett.

**Var ärlig om gränsen.** Skyddet gäller den nedladdade filen. Skriver användaren
sedan ut sin egen sida är utskriftsjobbet inte skyddat, och IP och tidpunkt syns
för servern som för vilken webbplats som helst. En mening om vad mekanismen inte
gör hör hemma i gränssnittet.

*(Bedömning:)* låt mängden vara förvalet, förklarad i en mening, med en direkt
nedladdning av enbart den egna valsedeln som synligt alternativ och en ärlig
notis om vad det alternativet röjer. Att tvinga fram det säkra valet är sämre än
att göra det till förval och låta användaren välja medvetet.

### Klientsidan som alternativ

Client side-generering är inte utesluten, men den kostar mer än den ger här.

`pdf-lib` klarar den här layouten — text, linjer, rektanglar, en inbäddad font
och en PNG. Det är hundra rader. Problemet är att det blir **en andra
implementation av Valförordning 2005:874**. Hela skälet att bidra en
`valsedel`-mall till klartex är att det ska finnas exakt en korrekt
implementation av måtten; två som glider isär ger en PoC som producerar
valsedlar som är nästan rätt, vilket är värdelöst. XeTeX via WASM finns
(SwiftLaTeX) men väger tiotals MB och skulle ändå flytta LaTeX-genereringen till
klienten, så klartex används inte i någotdera fallet.

Det avgörande är att klientrendering inte heller löser problemet ensam. Hämtar
klienten kandidatlistan för ett parti har servern redan fått veta valet, oavsett
var PDF:en sätts ihop. Datamodellen ovan — allt per valkrets — behövs för båda
designerna. Och när den finns på plats skyddar utfyllnadsmängden det enda anrop
som är kvar.

*(Bedömning:)* server­rendering via klartex, med utfyllnadsmängden som
integritetsmekanism. Att tjänsten bevisligen inte kan lära sig valet är ett
starkare och mer granskningsbart påstående för en PoC än att räkna ut det i
webbläsaren och be om tillit. Skulle det senare bli intressant är vägen öppen:
appen är tillståndslös och partidata statisk, så en ren statisk sajt med
WASM-renderare är möjlig utan att något av det här arbetet kastas.

## klartex för PDF-generering

### Vilken yta

**Biblioteket, inte HTTP-API:t** *(bedömning)*. `render()` tar
`asset_dir=<katalog>`, så partisymbolerna kan ligga i appens egen datakatalog.
HTTP-ytan saknar motsvarande väg — det är precis luckan i
[klartex.se#18](https://github.com/swedev/klartex.se/issues/18). Biblioteksvägen
tar dessutom bort ett runtime-beroende mellan två sajter och en API-token, och
en rendering med ett par dussin symboler blir en lokal filkatalog i stället för
några MB base64 över nätet.

### Vilken mall

En `valsedel`-recipe i klartex-kärnan *(användarbeslut)*:
`templates/valsedel/{recipe.yaml, schema.json}`, en `klartex-valsedel.sty` för
partisektioner, kryssrutor och signallinjer, och en page template för
A6-formatet. Valsedelns layout är reglerad i Valförordning (2005:874) och stabil
över tid, vilket är precis den fasta dokumenttyp recipe-vägen finns för.

Minvalsedel skickar då domänformad JSON och beskriver ingen layout:

```json
{
  "valtyp": "riksdag",
  "valkrets": "Norrbottens län",
  "valkretskod": "11901",
  "listtypkod": "3456",
  "valsedlar": [
    {"partier": [
      {"beteckning": "…", "symbol": "0002-socialdemokraterna.png",
       "kandidat": {"nummer": 1, "namn": "…", "info": "…"}}
    ]}
  ]
}
```

Mallen behöver ta emot en lista av valsedlar, inte en enda, eftersom
nedladdningen är en PDF med många sidor. Det är en följd av
integritetsmodellen och bör med från början i schemat.

All escaping sköts av klartex `escape_data()` i stället för den handskrivna
`escapeLatex()` i `src/lib/latex-generator.ts`.

### Den tekniska osäkerheten

`klartex-base.cls` laddar `article` med `a4paper` och sätter fasta marginaler,
`fancyhdr`, `parskip` och `setstretch`. Allt det är fel för en valsedel. En page
template injiceras i preambeln och kan i princip överstyra med ett senare
`\geometry{paperwidth=105mm, paperheight=148mm, …}` och `\pagecolor`, men det är
inte verifierat mot klartex som det ser ut idag.

**Det bör provas först av allt i fas 3** — en spike som renderar två tomma
A6-sidor i rätt färg via klartex avgör om page template-vägen räcker eller om
kärnan behöver ta emot pappersformat som klass-option.

### Följdeffekter

- `latex/`, `src/lib/latex-generator.ts`, `output/` och LaTeX-containern utgår.
  `latex/SPECIFIKATION.md` följer med till klartex som underlag för mallen.
- Backend-imagen behöver TeX Live och Open Sans. `klartex.se/backend/Dockerfile`
  gör redan det och kan följas. Imagen blir stor, i storleksordningen ett par GB.

## partidata som datakälla

Principen i ekosystemet är att partidata är källan och att andra projekt kopplar
mot dess stabila identiteter i stället för att kopiera registret *(befintlig
konvention: valkompassens README, partidatas README)*.

- **Koppla på `uuid`, inte `kod`.** `kod` blir en egenskap, inte en nyckel.
- **Partisymboler kommer ur partidata**, med sin proveniens, i stället för de 104
  kod-namngivna kopiorna i `public/logos/`.
- **Inga partidata i egen databas.** Den pinnade datamängden läses av processen
  vid request, precis som partidata.se självt gör med sin `data/`-katalog.
- **Kandidatlistor drivs i partidata.** `val/<år>/kandidatlistor/` är utkast idag;
  behovet hör hemma som ett issue där, inte som en egen CSV-import här.
  Utfyllnadsmängden gör behovet skarpare: den kräver kandidatlistor för *alla*
  partier i en valkrets, inte bara för det parti användaren valt.

### Distributionsväg

Partidata serverar HTML och partisymbolbilder men exponerar ingen JSON-yta och
publicerar ingen datamängd som artefakt. Något behöver tillkomma:

| Väg | Innebörd | Bedömning |
|-----|----------|-----------|
| Pinnad checkout i CI | Ingen ändring i partidata; versionen är en commit | Duger som brygga |
| Datamängd som release-artefakt från partidatas `v*`-tagg | Ren separation, spårbar version | **Förslag** |
| Publikt JSON-API på partidata.se | Färskast, men runtime-beroende mellan två sajter | Överkurs för data som ändras några gånger per år |

*(Bedömning.)* Release-artefakten kräver ett litet tillägg i partidatas
deploy-workflow och ger minvalsedel en versionsstämpel att visa i UI:t.

## Publicering på minvalsedel.se och deploy på saga

### Vad saga är idag

Hetzner, hcloud-kontexten `insector`, deploy-konto `webback`, nginx med certbot
som TLS-terminator, DNS via Loopia. Maskinen kör redan swedev.org som statisk
export, partidata.se som systemd-tjänst på `127.0.0.1:3000` bakom nginx, och
forsberg som statiskt bygge. Deploy-mönstret är genomgående: GitHub Actions på
`v*`-tagg bygger artefakten, rsyncar den till saga och startar om tjänsten.
Inget byggs på servern. Hemligheter ligger i GitHub-environmentet `production`.

### Form

Docker installeras på saga *(användarbeslut)*, och minvalsedel körs som en
compose-stack bunden till `127.0.0.1` bakom maskinens befintliga nginx. Imagen
hämtas versionspinnad från GHCR, samma form som timla och styrla. nginx förblir
maskinens enda TLS-terminator — Caddy introduceras inte på saga, eftersom tre
sajter redan terminerar där.

Två skäl gör Docker rätt val här snarare än systemd som för partidata.se: TeX
Live hör inte hemma systemglobalt på en maskin som också servar swedev.org och
partidata.se, och rollback blir en versionsändring i `.env` plus `up -d`.

Eftersom saga blir en delad Docker-värd bör compose-projektnamnet sättas
explicit i `docker-compose.prod.yml`, som i styrla och timla, så att stackarna
inte kolliderar.

### Publicering

- **DNS (Loopia):** `minvalsedel.se` och `www.minvalsedel.se` → A mot sagas IPv4,
  AAAA mot dess IPv6.
- **nginx:** en vhost efter mönstret i `partidata/deploy/partidata.se.conf` —
  apex omdirigerar till www, proxy mot loopback-porten, `X-Content-Type-Options`
  och `Referrer-Policy`, gzip.
- **TLS:** `certbot --nginx -d minvalsedel.se -d www.minvalsedel.se` efter att DNS
  pekar rätt.
- **Namnet i koden:** rubrik, `<title>`, OG-tags och LaTeX-kommentaren följer
  domänen.
- **Release:** `v*`-tagg bygger image till GHCR och kör deploy — merge är inte
  release *(befintlig konvention: partidata, swedev.org, timla)*.
- **Verifiering:** `/api/health` plus ett smoke-test som renderar en valsedel
  end-to-end efter deploy.

## Faser

### Fas 0 — Säkra nuläget

- Ta ställning till den staged ombyggnaden: committa den eller kassera den medvetet.
- För in domännamnet i UI, `<title>` och PDF-headern.

### Fas 1 — Repoform

- npm workspaces: `frontend/` (Vite, React 19, Radix Themes, `@swedev/ui`,
  TanStack Query, react-router), `app/` (Flask, gunicorn).
- `eslint.config.js` och `precommit` efter referensprojekten, CI som kör precommit.
- Porta de fyra komponenterna. daisyUI byts mot Radix Themes; befintliga
  `lucide-react`-ikoner behålls.

### Fas 2 — Data och integritetsmodell

- Pinnad partidata-version hämtas i CI och följer med artefakten.
- Byt identitetsnyckel från `kod` till `uuid`.
- Ersätt de tre API-anropen med ett per valkrets. `GET /api/kandidater/[partikod]`
  utgår. Partisymboler följer med valkretsbunten; inga bildanrop per parti.
- Öppna ett issue i partidata om kandidatlistor för alla partier per valkrets.

Fas 2 är där integritetspåståendet vinns eller förloras, och den är oberoende av
både stackbytet och klartex. Den kan göras först om något ska prioriteras.

### Fas 3 — PDF via klartex

- Spike: två tomma A6-sidor i rätt färg via klartex page template. Avgör om
  kärnan behöver ändras.
- Bidra `valsedel`-mall till klartex, med stöd för flera valsedlar per dokument
  och deterministisk metadata.
- Backend anropar `render(..., asset_dir=…)`. `latex/`, `latex-generator.ts` och
  LaTeX-containern utgår.

### Fas 4 — Utfyllnad, delning och utskrift

- Urval av utfyllnadsmängden i klienten, blandad ordning, ingen markör.
- URL-kodad valsedel för delning.
- Text i gränssnittet om vad mekanismen skyddar och vad den inte skyddar.
- Utskriftsvy och OG-tags.

### Fas 5 — Drift

- `infra/` med compose, nginx-vhost och provisionering.
- Docker på saga, DNS, certbot, GitHub-environment `production`.
- `v*`-tagg → GHCR → deploy → smoke-test.

## Kvarvarande frågor

- **Utfyllnadens storlek.** Fullständig täckning av valkretsen ger en mängd som
  varierar med valkretsen, från runt tio till runt fyrtio. Femtio som fast tal är
  enklare att förklara men ger sämre skydd i en liten valkrets och onödigt
  många sidor i en stor.
- **Kandidatlistornas storlek per valkrets.** Avgör om valkretsbunten är hundratals
  KB eller flera MB, och därmed om den kan hämtas direkt eller behöver delas upp.
  Bör mätas mot partidatas 2026-data innan fas 2 planeras klart.
