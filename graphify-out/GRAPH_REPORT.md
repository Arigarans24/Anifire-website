# Graph Report - .  (2026-06-02)

## Corpus Check
- 38 files · ~114,430 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 162 nodes · 170 edges · 24 communities (15 shown, 9 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.81)
- Token cost: 81,647 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Anime Data & Persistence|Anime Data & Persistence]]
- [[_COMMUNITY_TypeScript Compiler Config|TypeScript Compiler Config]]
- [[_COMMUNITY_Next.js App Shell & Layout|Next.js App Shell & Layout]]
- [[_COMMUNITY_Streaming UI & Mock Data|Streaming UI & Mock Data]]
- [[_COMMUNITY_Database Seeding Flow|Database Seeding Flow]]
- [[_COMMUNITY_Frontend Dev Dependencies|Frontend Dev Dependencies]]
- [[_COMMUNITY_Anime REST Controller|Anime REST Controller]]
- [[_COMMUNITY_Frontend Runtime Dependencies|Frontend Runtime Dependencies]]
- [[_COMMUNITY_NPM Scripts & Metadata|NPM Scripts & Metadata]]
- [[_COMMUNITY_Gemini MCP Settings|Gemini MCP Settings]]
- [[_COMMUNITY_Spring Boot App Entry|Spring Boot App Entry]]
- [[_COMMUNITY_Standalone Main Stub|Standalone Main Stub]]
- [[_COMMUNITY_Backend Test Suite|Backend Test Suite]]
- [[_COMMUNITY_Firecrawl MCP Config|Firecrawl MCP Config]]
- [[_COMMUNITY_Hero Artwork Assets|Hero Artwork Assets]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Local MCP Settings|Local MCP Settings]]
- [[_COMMUNITY_Gradle Build Concept|Gradle Build Concept]]
- [[_COMMUNITY_Firecrawl MCP Server|Firecrawl MCP Server]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `StreamPage()` - 8 edges
3. `Anime` - 6 edges
4. `AnimeRepository` - 6 edges
5. `AnimeService.fetchAndSaveTopAnime` - 6 edges
6. `scripts` - 5 edges
7. `Home()` - 5 edges
8. `AnimeController` - 4 edges
9. `StreamNavbar()` - 4 edges
10. `Movie` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Frontend Stack (Next.js/Tailwind/TypeScript)` --conceptually_related_to--> `Home()`  [INFERRED]
  README.md → anime-streaming/src/app/page.tsx
- `Anime` --conceptually_related_to--> `PostgreSQL Docker Compose Service`  [INFERRED]
  anime-backend/anime-backend/src/main/java/com/example/animebackend/entity/Anime.java → anime-backend/anime-backend/compose.yaml
- `Anime` --semantically_similar_to--> `JikanAnime`  [INFERRED] [semantically similar]
  anime-backend/anime-backend/src/main/java/com/example/animebackend/entity/Anime.java → anime-backend/anime-backend/src/main/java/com/example/animebackend/dto/JikanResponse.java
- `RootLayout()` --references--> `StreamPage()`  [INFERRED]
  anime-streaming/src/app/layout.tsx → anime-streaming/src/app/stream/page.tsx
- `PrismCube()` --conceptually_related_to--> `Home()`  [INFERRED]
  anime-streaming/src/components/ui/PrismCube.tsx → anime-streaming/src/app/page.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Anime Database Seeding Flow from Jikan API** — config_datainitializer_initdatabase, service_animeservice_fetchandsavetopanime, jikan_api, repository_animerepository_animerepository, entity_anime_anime [INFERRED 0.85]
- **Anime REST API Read/Delete Layer** — controller_animecontroller_animecontroller, repository_animerepository_animerepository, entity_anime_anime [INFERRED 0.85]
- **Stream Page Data-Driven Movie Carousel** — stream_page_streampage, stream_page_nfcard, data_mockanime_mock_movies, data_mockanime_movie [EXTRACTED 1.00]
- **Landing-to-Stream Conversion Flow** — app_page_home, stream_page_streampage, app_layout_rootlayout [INFERRED 0.85]
- **Anime Streaming Hero Artwork Set** — public_hero_1_herobanner, public_hero_2_herobanner, public_hero_3_herobanner [INFERRED 0.85]
- **Fiery Dark Visual Theme** — public_furnace_bg_background, public_hero_1_herobanner, public_hero_2_herobanner, public_hero_3_herobanner [INFERRED 0.75]

## Communities (24 total, 9 thin omitted)

### Community 0 - "Anime Data & Persistence"
Cohesion: 0.14
Nodes (16): Anime, List, PostgreSQL Docker Compose Service, DataInitializer.initDatabase, AnimeController.deleteAnime, AnimeController.getAllAnimes, Images, JikanAnime (+8 more)

### Community 1 - "TypeScript Compiler Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 2 - "Next.js App Shell & Layout"
Cohesion: 0.12
Nodes (13): geistMono, geistSans, metadata, RootLayout(), featureCards, footerNavigation, footerProfile, Home() (+5 more)

### Community 3 - "Streaming UI & Mock Data"
Cohesion: 0.24
Nodes (10): MOCK_MOVIES, Movie, NAV_ITEMS, React Compiler Enabled (Next.js), GSAP Animation Dependency, EliteTitle, NfCard(), StreamNavbar() (+2 more)

### Community 4 - "Database Seeding Flow"
Cohesion: 0.24
Nodes (7): AnimeRepository, AnimeRepository, AnimeService, Bean, CommandLineRunner, DataInitializer, AnimeService

### Community 5 - "Frontend Dev Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, babel-plugin-react-compiler, eslint, eslint-config-next, postcss, tailwindcss, @tailwindcss/postcss (+4 more)

### Community 6 - "Anime REST Controller"
Cohesion: 0.24
Nodes (7): Anime, AnimeRepository, List, AnimeController, DeleteMapping, GetMapping, Long

### Community 7 - "Frontend Runtime Dependencies"
Cohesion: 0.20
Nodes (10): dependencies, better-auth, gsap, lucide-react, motion, next, react, react-dom (+2 more)

### Community 8 - "NPM Scripts & Metadata"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 9 - "Gemini MCP Settings"
Cohesion: 0.40
Nodes (4): args, command, mcpServers, firecrawl

### Community 13 - "Firecrawl MCP Config"
Cohesion: 0.50
Nodes (3): npx, firecrawl, firecrawl-mcp

### Community 14 - "Hero Artwork Assets"
Cohesion: 0.83
Nodes (4): Furnace Neon Frame Background, Crimson vs Lightning Duel Hero Banner, Flame Sword Samurai Hero Banner, Titan Siege on the Walls Hero Banner

## Knowledge Gaps
- **72 isolated node(s):** `enabledMcpjsonServers`, `command`, `args`, `npx`, `firecrawl-mcp` (+67 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Frontend Dev Dependencies` to `NPM Scripts & Metadata`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `StreamPage()` connect `Streaming UI & Mock Data` to `Next.js App Shell & Layout`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Anime` (e.g. with `JikanAnime` and `PostgreSQL Docker Compose Service`) actually correct?**
  _`Anime` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `enabledMcpjsonServers`, `command`, `args` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Anime Data & Persistence` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `TypeScript Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Next.js App Shell & Layout` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._