# Julekalender (midlertidigt navn)

Dansk ordgætningsspil som julekalender for børn på 5–10 år. Den drilske nisse stjæler en gave for hvert forkert bogstav – ingen galge, ingen uhygge. 24 låger, dekorationer til et personligt 3D-juletræ, juleaftensfinale, Fri leg hele året og flere lokale profiler.

React 19 + TypeScript + Vite, Three.js til juleverdenen. Ingen backend, login, reklamer eller køb.

## Kommandoer

| Kommando | Formål |
| --- | --- |
| `npm install` | Installér afhængigheder |
| `npm run dev` | Udviklingsserver (med datoværktøj, se nedenfor) |
| `npm test` | Unit- og integrationstests (Vitest + Testing Library, jsdom, fake-indexeddb) |
| `npm run test:e2e` | End-to-end i rigtig Chromium (Playwright; bygger og starter `preview` selv). Første gang: `npx playwright install chromium` |
| `npm run typecheck` | TypeScript-typetjek |
| `npm run build` | Produktionsbuild i `dist/` |
| `npm run preview` | Server produktionsbuildet lokalt |

## Arkitektur

```
src/
  domain/      Ren spillogik uden afhængigheder: typer, bogstaver/normalisering, runde,
               kalenderdatoer, deterministisk ordvalg, årsprogression og belønninger
  content/     Redigerbart indhold: words.ts (ordpuljer) og rewards.ts (belønningsoversigt)
  services/    dateService (Europe/Copenhagen, injicerbar), storage (interface + IndexedDB
               + hukommelse + validering), sound (Web Audio), speech (valgfri oplæsning),
               capabilities (WebGL, reduceret bevægelse, grafikniveau)
  app/         GameService – forbinder domæne, lagring og dato; tjekker adgang før hver handling
  ui/          React-skærme og komponenter (tilgængelig HTML), SVG-figurer, 2D-fallbackverden
  world/       Three.js-verden og finale (egen chunk, indlæses dovent)
  dev/         Udviklerværktøj (kun i dev-build)
e2e/           Playwright-tests
```

Vigtige beslutninger:

- **Domænet er rene funktioner.** `applyGuess`, `startDayRound`, `guessInYear` m.fl. tager state ind og returnerer ny state. Rendering, lyd, animation, dato og lagring kalder domænet, aldrig omvendt.
- **Belønninger udledes, de gemmes ikke som tællere.** Gaveantal = summen af officielle resultater for låge 1–23, eller præcis 240 efter finalesejr (`totalGifts`). Dekorationer = låger med officiel sejr + stjernen (`earnedRewards`). Dobbelte belønninger er derfor umulige, og intet optjent kan mistes.
- **Lågens resultat skrives i samme atomare opdatering som det afgørende gæt.** En tabt låge kan prøves igen lige så mange gange, man vil (samme ord), så alle børn kan få al pynten til deres træ. Vindes den, gives pynten og de gaver, der blev reddet i den vindende runde. En sejr er endelig: lågen kan ikke spilles igen, og belønningen gives aldrig dobbelt. `attempts` tæller forsøgene. (Øverunder med `mode: 'practice'` fra en tidligere version rører aldrig resultatet.)
- **Fri leg** viser point (reddede legegaver i vundne ord), antal vundne og tabte ord samt vinderprocent. Det er kun til sjov og påvirker aldrig kalenderen.
- **Atomar read-modify-write.** `storage.updateYear(fn)` kører læs → ren funktion → skriv i én IndexedDB-readwrite-transaktion. Browseren serialiserer transaktioner på tværs af faner, så en forældet fane altid arbejder på nyeste data. Gæt med et forældet runde-id afvises (`stale`). `BroadcastChannel` beder andre faner om at genindlæse.
- **Animationer er kun præsentation.** Finalesejren gemmes før animationen starter. Lukkes fanen undervejs, mistes intet, og finalen kan ses igen.
- **Dato:** Al tid går gennem `DateService`. Kalenderdatoen beregnes i Europe/Copenhagen. Adgangen tjekkes igen ved hver spilhandling, når fanen bliver aktiv igen, og hvert 15. sekund. Derfor lukker en åben låge ved midnat den 24./25. december.
- **Ordvalg:** Årets 24 ord vælges med en seedet PRNG ud fra `CONTENT_VERSION` og år. Profil-id og sværhedsgrad indgår ikke, så alle profiler får samme ord. Ordene gemmes som snapshot i årets progression, så senere indholdsændringer ikke påvirker en igangværende eller historisk kalender.
- **Finalen den 24.:** Første runde bruger lågens eget ord. Efter nederlag trækkes nye ord fra finalepuljen uden gentagelser, indtil puljen er brugt. Der er ingen grænse for antal forsøg. Missede låger kan stadig vindes den 24. og giver pynt, men totalen forbliver 240.
- **Skærmtastaturet** bruger dansk QWERTY (Å efter P, Æ og Ø efter L), som børnene kender fra tablets. Fysisk tastatur virker på spilskærmen, men aldrig i tekstfelter eller dialoger.
- **Grafik:** 3D indlæses separat og blokerer aldrig UI'et. Pixel ratio, skygger, antal snefnug og gaveæsker tilpasses enheden, og indstillingen "Færre effekter" tvinger det laveste niveau. Rendering pauser, når fanen er skjult eller scenen er ude af syne, og GPU-ressourcer frigives ved unmount. Uden WebGL, eller hvis grafikkonteksten tabes, vises en tegnet 2D-verden med samme optjente pynt.
- **Reduceret bevægelse** (systemindstilling eller "Færre effekter"): CSS-animationer slås fra, og finalen vises uden kameraflyvning, med korte trinvise skift.

## Juleverdenens begivenheder

- **Juleaftensfinalen** varer ca. 30 sekunder. Nissen går med sækken fra hytten, gaverne flyver ud på bunken, stjernen spiraler op i toppen, lyset breder sig op gennem træet, og nissen vinker. Undervejs vises korte tekster. Tempo og kameraets keyframes står i `src/world/finaleScript.ts`. Ved reduceret bevægelse vises en rolig version på ca. 8 sekunder.
- **Julemanden** flyver ind og lander med kane og fire rensdyr (Rudolf forrest) den 24. december. Landingen vises én gang pr. session; derefter står kanen parkeret. I 2D-visningen flyver en kanesilhuet forbi månen.
- **Besøgende i baggrunden:** Et rensdyr galopperer af og til forbi. Sjældent (10 %, `ThreeWorld.YETI_CHANCE`) kommer en yeti med nissehue, stopper og vinker. I **"Se mit træ"** kan børnene selv trykke **Send rensdyr** og **Send yeti** (højst 6 gæster ad gangen). Der kommer ingen tilfældige besøgende under finalen eller ved reduceret bevægelse, men knapperne virker stadig.

## Lagring og begrænsninger

- Data ligger i IndexedDB (`julekalender`, skemaversion `DB_VERSION` i `indexedDbStorage.ts`). Hver post har et `schema`-felt; migreringer tilføjes i `validate.ts`/`onupgradeneeded`.
- Beskadigede poster valideres ved læsning, flyttes til et `quarantine`-store, og brugeren får en forståelig besked. Resten af spillet virker videre.
- Skrivefejl vises som en venlig fejlbesked, og UI'et viser kun data, der faktisk er gemt.
- Er IndexedDB utilgængelig (fx visse private vinduer), kører spillet med hukommelseslagring og viser tydeligt, at fremskridt ikke gemmes.
- Data er lokale for browseren og enheden. De forsvinder ved rydning af browserdata og følger ikke med til en anden enhed. Der er ingen synkronisering eller import/eksport i denne version. Forældreområdet forklarer dette.

## Redigering af indhold

**Ord** – `src/content/words.ts`. Hver række er `[id, visningsord, hint, kategori]`, og den normaliserede form beregnes automatisk.

- `id` skal være stabilt og unikt. Genbrug aldrig et id til et andet ord.
- Kun A–Z, Æ, Ø, Å, mellemrum og bindestreg. Hintet må ikke indeholde selve ordet.
- Et ord må kun stå i én pulje. Ændrer du kalenderpuljen, så hæv `CONTENT_VERSION` (gemte kalendere påvirkes ikke).
- `npm run validate:content` tjekker dubletter, ugyldige tegn, tomme hints, hints der afslører ordet, overlap og puljestørrelser (≥100 / ≥50 / ≥50). Puljerne har nu 106 kalenderord, 60 Fri leg-ord og 54 finaleord.

**Håndvalgte kalenderord** – `CALENDAR_OVERRIDES` i `words.ts` (år → låge → ord-id) fastlægger enkelte dage. De øvrige låger vælges stadig automatisk og flyttes ikke. 1. december 2026 er sat til "Kalender". `CALENDAR_FIXED_DAYS` gælder hvert år: den 24. er altid "Stjerne" (det er også finalens første ord). Det påvirker kun kalendere, der endnu ikke er oprettet på en enhed.

**Dekorationer** – `src/content/rewards.ts`. Én post pr. dag med id, dansk navn, beskrivelse, placering (`tree` med vinkel/højde eller `world` med x/z), farver og visuel type. Nye visuelle typer kræver en byggefunktion i `src/world/builders.ts` (3D) og `src/ui/world/World2D.tsx` (2D).

## Udviklerværktøj (kun dev)

`npm run dev` viser en lille **DEV**-knap nederst til højre. Den indgår ikke i produktionsbuildet (`import.meta.env.DEV` plus dynamisk import, så koden fjernes ved build). Værktøjet kan:

- sætte den simulerede dato (forudindstillede knapper som 30/11 23:59, 24/12, 25/12, eller en valgfri dato) – datoen huskes i sessionen,
- vinde eller tabe låge 1–N for den aktive profil med et valgfrit antal fejl,
- tabe eller vinde en finalerunde,
- tvinge 2D-fallback (uden WebGL).

## Test

- `src/domain/*.test.ts`: gætteregler, Æ/Ø/Å og Unicode, hint-regler, kalenderdatoer og overgange i dansk tidszone.
- `src/content/content.test.ts`: indholdsvalidering og deterministisk ordvalg.
- `src/app/gameService.test.ts`: tabt låge kan prøves igen og sejr er endelig, genoptagelse, idempotens, isolation mellem profiler og år, sæsonlukning i åben fane, finale (nye ord, én stjerne, præcis 240), Fri leg uden kalenderpåvirkning, lagringsfejl, beskadigede data, og to "faner" mod rigtig (fake) IndexedDB.
- `src/ui/App.test.tsx`: hele flowet i UI'et, QWERTY-tastatur, fysisk tastatur, låste låger, Fri leg, profilskift, fejlbeskeder, uden for sæsonen, midnat i åben fane, finale med 2D-fallback og færre effekter.
- `e2e/`: tablet (iPad), mobil (320 px) og desktop i Chromium. Tjekker, at der ikke er vandret sidescroll, at tasterne har trykflader på mindst 44 px i højden, at data overlever genindlæsning, og at 3D-træet kan roteres. Afspiller også den rigtige 3D-finale uden konsolfejl.

## Installation som app (PWA)

Siden kan gemmes på hjemmeskærmen og åbner så i fuld skærm, også offline.

- `public/manifest.webmanifest` indeholder navn, farver og ikoner.
- `public/sw.js` er service workeren. Navigationer hentes fra netværket først; øvrige filer hentes fra cachen først. Hæv `CACHE`-navnet, hvis cachen skal tømmes helt.
- `src/services/pwa.ts` registrerer service workeren (kun i produktion), fanger installationsprompten og beder browseren om varig lagring.
- Første gang forsiden vises på en enhed, der kan installere (og ikke allerede kører som app), spørger en venlig dialog **én gang**: "Gem Julekalender som app?". At den er vist, gemmes i indstillingerne (`installPromptSeen`).
- Forældreområdet har kortet **Gem som app**: en direkte knap på Android/Chrome/Edge og en vejledning på iPhone/iPad (Safari → Del → Føj til hjemmeskærm).
- Ikonerne laves ud fra `public/icons/icon.svg` med `node scripts/generate-icons.mjs`.
- På iOS har en installeret app sin egen lagring adskilt fra Safari, så fremskridt følger ikke med. Det står også i forældreområdet.

## Udgivelse (GitHub Pages)

`.github/workflows/deploy.yml` kører typecheck, tests og build ved hvert push til `main` og udgiver `dist/` til GitHub Pages. `BASE_PATH` sættes til `/<repo-navn>/`, så stierne passer til `https://<bruger>.github.io/<repo-navn>/`. Lokalt bygges med base `/`.

Bemærk: Hvert domæne har sin egen IndexedDB. Data fra `localhost` følger derfor ikke med til den udgivne side.
