# Anifire - Fullstack Anime Streaming Platform

Anifire is a Java/Spring Boot + Next.js anime streaming project. In the course
requirements, anime titles work as the product module.

## Tech Stack

- Backend: Java 21, Spring Boot 4, Spring Data JPA/Hibernate, PostgreSQL, JWT auth.
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS.
- Database: local PostgreSQL through Docker Compose.
- External API: Jikan API v4 for initial top-anime seeding.

## Course Features

- Product module: add, edit, list and soft-delete anime records.
- ORM database access through Spring Data JPA.
- REST API with Swagger UI.
- Server-side pagination, title search and category filtering.
- Comments: add, edit, list and soft-delete comments for each anime.
- Authentication with token-based login/register/refresh/logout.
- User roles: `ADMIN` and `USER`.
- Admin-only anime deletion, category management and user role editing.
- Categories: add, edit, list, soft-delete and assign many categories to many anime.
- Frontend admin page at `/admin` with product/category/user management.

The first registered user becomes `ADMIN`, which gives the project a local
bootstrap path without hard-coded credentials.

## How To Run

Start PostgreSQL:

```bash
cd anime-backend/anime-backend
docker compose up -d
```

Start the backend:

```bash
cd anime-backend/anime-backend
./gradlew bootRun
```

Swagger UI:

```text
http://localhost:8080/swagger-ui/index.html
```

Start the frontend:

```bash
cd anime-streaming
npm install
npm run dev
```

Frontend URLs:

- App: `http://localhost:3000`
- Catalog: `http://localhost:3000/stream`
- Admin panel: `http://localhost:3000/admin`

## Checks

```bash
cd anime-backend/anime-backend && ./gradlew test
cd anime-streaming && npm run lint
cd anime-streaming && npm run build
```
