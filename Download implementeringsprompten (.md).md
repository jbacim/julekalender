# Implementeringsprompt: Julekalender med ordgætning

Du er en erfaren full-stack-udvikler og game/UI-designer. Implementér nedenstående som en færdig, visuelt gennemarbejdet, mobilvenlig weboplevelse. Byg fungerende software, ikke blot en prototype eller en plan. Arbejd i det eksisterende repository, hvis der findes et. Undersøg først projektets struktur og følg dets konventioner. Er projektet tomt, anvend React, TypeScript og Vite med Three.js til juleverdenen. Brug et neutralt midlertidigt projektnavn: Julekalender. Det endelige navn besluttes senere.

## 1. Formål og målgruppe

Et dansk Hangman-inspireret ordspil som julekalender til børn på 5–10 år, primært på tablet, men også mobil og desktop. Ingen galge, vold eller uhyggelige elementer. En venlig, drilsk nisse stjæler gaver ved forkerte bogstaver. Spænding og hygge skal veje tungere end konkurrence.

Spillet har to helt adskilte tilstande:
- Kalender: 24 låger, daglige ord, gaver, dekorationer og personlig juleverden.
- Freeplay: Ubegrænset ordgætning hele året uden nogen ændring af kalenderens status, belønninger eller statistik.

Alt synligt indhold skal være på dansk. Ingen reklamer, køb, ranglister, login eller backend i første version.

## 2. Kalender og datoer

- Kalenderen vises som en rigtig julekalender med 24 nummererede låger, ikke blot en liste af knapper.
- Fra 1. til og med 24. december kan man spille dagens låge og tidligere, missede låger.
- Fremtidige låger er låst. Åbnede låger har tydelige tilstande: i gang, vundet og tabt. Farve må ikke være eneste indikator.
- Fra 25. december og indtil næste 1. december er kun Freeplay spilbart. Kalenderen og tidligere års træer kan stadig ses, men ikke spilles.
- Nyt år opretter en ny kalender pr. profil uden at overskrive tidligere år.
- Brug Europe/Copenhagen som kalenderens tidszone og én central, injicerbar datotjeneste. Brug ikke spredte direkte kald til systemdatoen.
- Kontrollér tilgængelighed igen ved genoptagelse af fanen og før spilhandlinger. Et åbent spil må ikke omgå sæsonlukningen.
- Lokal dato er tilstrækkelig i første version. Der kræves ikke beskyttelse mod manuel ændring af enhedens ur.

## 3. Grundregler for ordgætning

- Barnet vælger ét bogstav ad gangen på et stort dansk skærmtastatur med A–Z samt Æ, Ø og Å.
- Vis ordet med én tydelig plads pr. bogstav. Mellemrum og eventuelle bindestreger vises automatisk og skal ikke gættes.
- Et korrekt bogstav afslører alle forekomster.
- Gentagne tryk på samme bogstav er uden effekt og koster aldrig et forsøg.
- Der er 10 fejlmuligheder, ikke 10 samlede bogstavvalg.
- Hver fejl får nissen til at stjæle én af dagens 10 gaver.
- Ved 10 fejl tabes runden. Ved alle bogstaver afsløret vindes runden.
- Ved sejr med f fejl reddes 10-f gaver. En sejr kan dermed give 1–10 gaver.
- Understøt også fysisk tastatur, men kun når spillet har relevant fokus, og aldrig mens der skrives i profilfelter.
- Normalisér store/små bogstaver og Unicode konsekvent. Æ, Ø og Å er selvstændige bogstaver, ikke varianter af A eller O.
- Ved afslutning vises ordet tydeligt med en venlig dansk besked. Ingen nedladende eller skamfuld feedback.

## 4. Sværhedsgrad og hjælp

- Profilen har Nem eller Normal som indstilling.
- Begge bruger samme kalenderord og samme belønningsregler.
- På Nem bliver en tydelig hintknap tilgængelig efter præcis fem fejl. Den forbliver tilgængelig resten af runden. Hint koster ikke gaver.
- På Normal tilbydes ikke dette hint.
- Hvert ord har et håndskrevet dansk hint, der hjælper uden at afsløre selve ordet, fx en kategori eller kort beskrivelse.
- Lås sværhedsgraden for en igangværende runde, så indstillingsskift ikke skaber uklare regler.
- Tilbyd oplæsning af instruktioner, hint og det afsluttede ord, hvis en dansk stemme er tilgængelig. Læs aldrig det hemmelige ord højt før afslutning.
- Oplæsning skal være valgfri og fungere som progressiv forbedring. Manglende stemmestøtte må ikke blokere spillet.

## 5. Første forsøg, genforsøg og belønninger

For dag 1–23:
- Første afsluttede runde fastlåser dagens officielle resultat.
- Sejr giver de resterende gaver og dagens unikke dekoration.
- Nederlag giver nul gaver og ingen dekoration.
- Man må spille lågen igen efter nederlag, men dette er tydeligt markeret som øvelse uden belønning. Øvelse ændrer aldrig det officielle resultat, gaveantal eller dekorationer.
- Øvelsesrunden bruger samme dagsord. Det er acceptabelt, at ordet allerede er kendt.
- Genindlæsning eller profilskift midt i første forsøg fortsætter den gemte runde. Det må ikke nulstille fejl eller skabe et nyt officielt forsøg.
- Allerede optjente gaver kan aldrig mistes.
- Belønninger skal være idempotente: dobbelttryk, genindlæsning og gentagen afslutningshåndtering må aldrig give ekstra belønninger.

## 6. Finale den 24. december

Den 24. er en bevidst undtagelse:
1. Barnet spiller en runde med 10 fejlmuligheder.
2. Ved nederlag kan barnet forsøge igen med et nyt ord fra en separat finaleordpulje.
3. Gentag indtil sejr. Ingen begrænsning på antal runder inden for den 24. december.
4. Ved sejr vinder barnet stjernen til juletræets top.
5. Nissen returnerer alle gaver, der mangler, så alle profiler, der gennemfører finalen, ender med præcis 240 gaver: 24 dage gange 10 gaver.
6. Det omfatter også gaver fra missede og tabte dage samt finalens egne gaver. Det er en bevidst designbeslutning, der sikrer samme slutbunke uanset forløb.
7. Manglende dekorationer fra dag 1–23 returneres IKKE.
8. Vis en flot, kort 3D-finale: nissen afleverer gaver, stjernen placeres, træet lyser op, og kameraet præsenterer barnets personlige træ.
9. Derefter kan barnet selv rotere kameraet rundt om træet med en finger eller mus. Begræns kameraet, så man ikke kommer under jorden eller ind i træet.

Finalen kræver ikke, at tidligere låger er spillet. Missede låger kan stadig spilles resten af den 24. og give deres dekoration ved første-forsøgssejr, men ikke yderligere gaver efter gaveopfyldningen. Totalen forbliver 240.

Gem finalesejr og belønninger før animationen starter. Hvis fanen lukkes under animationen, bevares alt, og finalen kan ses igen uden nye belønninger. Efter den 24. er finalen ikke spilbar, men et allerede vundet træ og dets finalepræsentation kan besøges igen som visning.

## 7. Juleverden og visuel retning

Skab en varm, eventyrlig, sammenhængende juleverden med sne, varmt lys, træ, stof og hyggelige materialer. Den skal føles som et færdigt børnespil, ikke et administrationsdashboard med juleikoner.

Scenen indeholder:
- Den interaktive kalender med 24 låger.
- Et juletræ med de faktisk vundne dekorationer.
- En voksende gavebunke ved siden af eller under træet.
- Nissens lille hytte eller et tilsvarende hjemsted.
- Små stemningsdetaljer, fx afdæmpet sne og lys.

Der er 23 unikke dekorationer fordelt på dag 1–23. Nogle er træpynt, andre er selvstændige dekorationer i verdenen, fx lanterne, snemand eller lyskæde. Dag 24 giver stjernen. Definér en eksplicit belønningsoversigt med dag, dekorations-id, dansk navn, placering og visuelt udtryk.

Dekorationer skal fungere uafhængigt. Et træ med få vundne dekorationer skal stadig være pænt. Vis ikke dystre tomme pladser eller røde fejlmarkører i verdenen.

Det samlede gaveantal er altid synligt som en letlæselig UI-tæller under kalenderoplevelsen og visning af juleverdenen. Gavebunken er en visuel repræsentation, ikke noget barnet skal tælle. Vis dagens resterende gaver separat og med tydelig tekst. Freeplay skal være klart markeret og må ikke få sine midlertidige gaver til at ligne kalenderbelønninger.

Nissen reagerer kort og charmerende på rigtige og forkerte gæt. Animationer må ikke blokere næste input eller skabe race conditions. Undgå lange gentagne sekvenser.

Brug Three.js til den personlige 3D-verden og finale, men hold ord, tastatur, knapper og tællere som tilgængelig HTML ovenpå eller ved siden af scenen. Undgå afhængighed af eksternt hostede modeller og teksturer. Lokale assets eller veludførte stiliserede 3D-objekter er acceptable. Ingen tilfældige placeholder-emojis som endeligt visuelt design.

## 8. Profiler og lagring

- Flere lokale børneprofiler på samme enhed med kaldenavn, avatar og sværhedsgrad.
- Hver profil har isoleret årsprogression, igangværende runder, gaver, dekorationer og finale-status.
- Let profilskift med tydelig visning af aktiv profil.
- Ingen krav om rigtige navne, fødselsdato, e-mail eller andre personoplysninger.
- Brug et versionsstyret lokalt lagringsformat bag et storage-interface. IndexedDB er et passende standardvalg; tilpas til eksisterende projekt, hvis nødvendigt.
- Gem efter hvert gyldigt bogstav og hver statusændring, ikke kun ved afslutning.
- Håndtér manglende, beskadiget eller utilgængelig lagring med en forståelig besked. Lov ikke, at data er gemt, hvis skrivningen fejler.
- Oplys i et forældreområde, at data er lokale og kan forsvinde ved rydning af browserdata eller skift af enhed.
- Profil- og datasletning kræver en tydelig bekræftelse i forældreområdet.
- Bevar tidligere års træer i et julealbum, der kun er til visning.
- Første version behøver ikke cloudsynkronisering eller import/eksport.
- Håndtér flere åbne faner, så forældet state ikke kan overskrive et afsluttet resultat eller udløse dobbelte belønninger.

## 9. Ordindhold og deterministisk kalender

Lever rigtig dansk indholdsdata, ikke kun en håndfuld eksempler:
- Mindst 100 forskellige, manuelt kuraterede juleord i kalenderpuljen.
- Separate, ikke-overlappende puljer til Freeplay og finale, som også er store nok til varieret spil. Sigt efter mindst 50 ord i hver, men prioritér naturlige, alderssvarende ord frem for fyldord.
- Hvert ord har stabilt id, visningsord, normaliseret form, hint og eventuel kategori.
- Ord skal være relateret til jul eller den hyggelige vinterverden og forståelige for målgruppen. Undgå kunstige sammensætninger og meget lange ord, der kun er med for at nå et antal.
- Brug korte og mellem-lange ord som hovedregel. UI skal dog kunne håndtere længere ord på små skærme.
- Valider dubletter, ugyldige tegn, tomme hints og overlap mellem puljerne automatisk.
- Kalenderens 24 ord vælges deterministisk pr. år, uden gentagelser inden for året og ens for alle profiler på samme indholdsversion. Profil-id og sværhedsgrad må ikke påvirke ordvalget.
- Variér kalenderen mellem år. Gem årets valgte ord-id'er og indholdsversion, så en senere indholdsopdatering ikke ændrer en igangværende kalender.
- Gem også nødvendigt ordindhold for aktive og historiske runder, så fjernede ord-id'er ikke ødelægger gemte spil.
- Freeplay og finalen undgår gentagelser, indtil deres pulje er gennemløbet. Derefter blandes igen, uden straks at gentage seneste ord.
- Lav en overskuelig indholdsstruktur, så ord og hints nemt kan redigeres uden at ændre spillogikken.

## 10. Skærme og brugerflow

Implementér mindst:
1. Profilvælger og oprettelse af profil.
2. Hjem med kalender, juleverden, aktiv profil og samlet gaveantal.
3. Ordspil med dagens lågenummer, ordpladser, tastatur, resterende gaver, nisse og eventuelt hint.
4. Resultatvisning med tydelig belønning eller venlig mulighed for øvelse.
5. Freeplay med tydelig adskillelse fra kalenderprogression.
6. Finale og efterfølgende interaktiv trævisning.
7. Julealbum med tidligere års træer.
8. Enkelt forældre-/indstillingsområde med lyd, bevægelse, profiladministration og forklaring af lokal lagring.
9. Uden for sæsonen: hyggelig låst kalender, adgang til Freeplay og mulighed for at besøge optjente træer.

Undgå unødvendige menuer og teksttunge forklaringer. Barnet skal hurtigt kunne finde dagens låge og spille.

## 11. Tablet, tilgængelighed og performance

- Responsivt fra 320 CSS-pixels til stor tablet og desktop, i både portræt og landskab.
- Store trykflader, som udgangspunkt mindst 44 x 44 CSS-pixels. Tastaturet skal tilpasses uden vandret sidescroll.
- Ord, tastatur og primære handlinger prioriteres over baggrundsscenen på små skærme.
- Ingen centrale handlinger må kræve hover, præcis dragging eller multitouch.
- Brug semantiske knapper, synlig fokusmarkering, tilstrækkelig kontrast og relevante skærmlæserbeskeder.
- Tilbyd alternative rotationsknapper til træet ud over touch-dragging.
- Understøt prefers-reduced-motion og en lokal indstilling for færre effekter. Finalen skal stadig være meningsfuld uden kameraflyvning og kraftige effekter.
- Lyd starter kun efter brugerinteraktion. Let tilgængelig mute. Spillet fungerer fuldt uden lyd.
- Tilpas pixel ratio, skygger, partikler og detaljer til enhedens kapacitet. Pause rendering, når fanen er skjult, og frigiv GPU-ressourcer korrekt.
- Ved manglende WebGL eller tabt grafik-kontekst skal hele spillet stadig fungere med en pæn statisk/2D-repræsentation af verdenen og træets optjente pynt.
- Indlæs tunge 3D-dele separat. UI må ikke vente på, at hele verdenen er klar.

## 12. Arkitektur og dataintegritet

Hold domænelogik adskilt fra rendering, lyd, animationer, dato og storage. Brug eksplicitte tilstande og typer frem for løse booleans.

Modellér mindst:
- Profile og indstillinger.
- YearProgress med kalenderord, dagsresultater, dekorationer og finale-status.
- Round med mode, ordsnapshot, gættede bogstaver, fejl, sværhedsgrad og status.
- DayResult med officielt udfald og reddede gaver.
- RewardDefinition og WordEntry.

Beregn gaveantal ud fra officielle resultater og finaleopfyldning, eller brug en tilsvarende konsistent model. Efter finale er totalen altid 240, også når missede dage senere gennemføres. Hold første-forsøgsresultater til historik, men læg ikke deres gaver oven i finaleopfyldningen.

Animationer er præsentation af allerede besluttede tilstandsændringer. De må aldrig være den autoritative kilde til belønninger eller progression.

## 13. Test og acceptkriterier

Skriv automatiske unit-tests for domænelogikken og relevante integration-/end-to-end-tests. Brug projektets eksisterende testværktøjer; ellers vælg passende værktøjer og dokumentér dem.

Dæk mindst:
- Korrekt bogstav afslører alle forekomster; gentaget bogstav koster intet.
- Præcis 10 fejl giver nederlag; korrekt sidste bogstav giver sejr.
- Æ, Ø, Å, store/små bogstaver og Unicode-normalisering.
- Hint på Nem efter fem fejl, men ikke tidligere og ikke på Normal.
- Første resultat er uforanderligt; øvelse ændrer ingen belønninger.
- Genindlæsning fortsætter samme runde med samme fejl.
- Dobbelt afslutning giver ikke dobbelte gaver eller dekorationer.
- Profiler og år er isolerede.
- Alle profiler får samme dagsord; ingen dubletter i årets 24 ord.
- Fremtidige låger er låst; missede låger er spilbare i sæsonen.
- Datoovergange 30/11→1/12 og 24/12→25/12 i dansk tidszone, også i en åben fane.
- Finale tillader nye ord efter nederlag og tildeler stjernen én gang.
- Finale giver præcis 240 gaver uanset tidligere sejre, nederlag og missede dage.
- Missede dage efter finalen kan give pynt, men aldrig mere end 240 gaver.
- Afbrudt finaleanimation mister ingen belønninger.
- Freeplay ændrer aldrig kalenderdata.
- Historiske træer kan ses, men ikke spilles.
- Storagefejl og ugyldige gemte data håndteres forståeligt.
- WebGL-fallback og reduceret bevægelse fungerer.
- Tablet-/mobilflow, profilskift, skærmtastatur og ingen vandret sidescroll.

Tilføj et udviklerværktøj til at simulere dato, profilprogression og finale. Det må kun være tilgængeligt i udvikling/test, ikke som synlig snydemenu i produktion.

## 14. Arbejdsform og leverance

1. Undersøg repository og lav en kort konkret implementeringsplan.
2. Implementér domænelogik, indhold og tests først, derefter det komplette spilflow og til sidst den visuelle polering og finale.
3. Fortsæt med implementeringen efter planen uden at vente på godkendelse af hvert trin.
4. Træf rimelige tekniske beslutninger selv og dokumentér dem. Stil kun spørgsmål, hvis noget reelt blokerer arbejdet.
5. Installér nødvendige afhængigheder, hvis miljøet tillader det. Brug aktuelle kompatible versioner og repositoryets package manager.
6. Kør tests, typecheck og produktionsbuild. Ret fejl. Angiv ærligt, hvis en kontrol ikke kan køres.
7. Lever README med start-, test- og buildkommandoer, arkitekturoverblik, lagringsbegrænsninger, redigering af ord/dekorationer og brug af datotestværktøj.
8. Afslut med en kort opsummering af det implementerede, udførte kontroller og eventuelle reelle mangler.

Definition of done: Et barn kan oprette sin profil, åbne en tilladt låge, spille og få gemt sit resultat, se sine gaver og sin pynt, skifte profil uden datalæk, spille Freeplay uden påvirkning af kalenderen og gennemføre den særlige juleaftensfinale med et personligt roterbart 3D-træ. Hele oplevelsen fungerer også uden lyd og med grafisk fallback.
