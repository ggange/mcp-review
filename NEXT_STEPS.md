# MCP Review - Setup & Next Steps

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (we recommend [Neon](https://neon.tech) - free tier available)
- GitHub OAuth App
- Google OAuth App (optional)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file in the root directory (or copy from `.env.example` if it exists):

```bash
touch .env
```

Then configure the following environment variables:

#### Database (Neon PostgreSQL)
1. Sign up at https://neon.tech (free)
2. Create a new project
3. Copy the connection string to `DATABASE_URL`

#### NextAuth Secret
Generate a secret:
```bash
openssl rand -base64 32
```
Set it as `NEXTAUTH_SECRET`

#### GitHub OAuth
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Set Homepage URL: `http://localhost:3000`
4. Set Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
5. Copy Client ID to `GITHUB_ID`
6. Generate and copy Client Secret to `GITHUB_SECRET`

#### Google OAuth (Optional)
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID to `GOOGLE_ID` and Client Secret to `GOOGLE_SECRET`

#### Cron Secret (Optional, for production)
For production deployments, set `CRON_SECRET` to secure the sync endpoint:
```bash
openssl rand -base64 32
```
Set it as `CRON_SECRET` in your environment variables.

### 3. Set Up Database

Push the schema to your database and generate the Prisma client:
```bash
npm run db:database
```

This command runs both `prisma db push` and `prisma generate` in sequence.

### 4. Sync MCP Registry

Start the dev server:
```bash
npm run dev
```

The app will automatically sync servers from the MCP Registry on first load if the database is empty.

You can also manually trigger a sync:
```bash
curl -X POST http://localhost:3000/api/sync
```

Or visit `http://localhost:3000/api/sync` in your browser (GET works in development mode only).

**Note:** In production, the sync endpoint requires authorization via `CRON_SECRET` or the `x-vercel-cron` header (for Vercel cron jobs).

### 5. You're Ready!

Visit http://localhost:3000 to see the marketplace.

**Key Features Available:**
- Browse servers from the official MCP Registry
- Filter by category (Database, Search, Code, Web, AI, Data, Tools, Other)
- Search servers by name, organization, or description
- View Community-uploaded servers in a separate tab
- Rate servers (requires authentication)
- View your ratings in the Dashboard
- Upload new servers (requires authentication)

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth.js handlers
│   │   ├── ratings/       # Rating submission endpoint
│   │   ├── servers/       # Public API endpoints (GET, POST)
│   │   │   └── [id]/      # Individual server endpoint
│   │   └── sync/          # Registry sync endpoint
│   ├── auth/signin/       # Custom sign-in page
│   ├── dashboard/         # User ratings dashboard
│   ├── servers/[id]/      # Server detail page with rating form
│   └── page.tsx           # Home page with server tabs
├── components/            # React components
│   ├── ui/               # Radix UI components (shadcn/ui style)
│   ├── rating/           # Rating display and form components
│   ├── server/           # Server-related components
│   │   ├── category-filter.tsx
│   │   ├── pagination.tsx
│   │   ├── server-card.tsx
│   │   ├── server-grid.tsx
│   │   ├── server-tabs.tsx
│   │   └── server-upload-form.tsx
│   ├── navbar.tsx
│   ├── search-bar.tsx
│   └── theme-switcher.tsx
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   ├── mcp-registry.ts   # Registry sync logic
│   ├── server-categories.ts  # Category classification
│   ├── utils.ts          # Helper functions
│   └── validations.ts    # Zod schemas
└── types/                # TypeScript types
```

---

## Public API

### List Servers
```
GET /api/servers
GET /api/servers?q=search_term
GET /api/servers?category=database
GET /api/servers?page=1
GET /api/servers?q=search&category=ai&page=2
```

Query Parameters:
- `q` (optional): Search term to filter by name, organization, or description
- `category` (optional): Filter by category (`database`, `search`, `code`, `web`, `ai`, `data`, `tools`, `other`, or `all`)
- `sort` (optional): Sort order (`most-reviewed`, `top-rated`, `newest`, `trending`) - default: `most-reviewed`
- `minRating` (optional): Minimum rating threshold (`0`, `3`, `4`, `4.5`, or any decimal value 0-5) - default: `0`
- `maxRating` (optional): Maximum rating threshold (any decimal value 0-5)
- `dateFrom` (optional): Filter servers created on or after this date (ISO date format: `YYYY-MM-DD`)
- `dateTo` (optional): Filter servers created on or before this date (ISO date format: `YYYY-MM-DD`)
- `page` (optional): Page number for pagination (default: 1)

Response:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "totalPages": 5
}
```

### Get Server Details
```
GET /api/servers/{id}
```

The `id` parameter should be URL-encoded (e.g., `ai.exa%2Fexa` for `ai.exa/exa`).

Response:
```json
{
  "data": {
    "id": "ai.exa/exa",
    "name": "exa",
    "organization": "ai.exa",
    "description": "...",
    "avgTrustworthiness": 4.5,
    "avgUsefulness": 4.2,
    "totalRatings": 10,
    "ratings": [
      {
        "id": "...",
        "trustworthiness": 5,
        "usefulness": 4,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "user": {
          "name": "John Doe"
        }
      }
    ]
  }
}
```

### Upload Server (Authenticated)
```
POST /api/servers
Authorization: Required (via NextAuth session)
Content-Type: application/json
```

Request Body:
```json
{
  "name": "my-server",
  "organization": "my-org",
  "description": "Server description",
  "version": "1.0.0",
  "repositoryUrl": "https://github.com/my-org/my-server"
}
```

Response (201 Created):
```json
{
  "data": {
    "id": "my-org/my-server",
    "name": "my-server",
    "organization": "my-org",
    "description": "Server description",
    "version": "1.0.0",
    "repositoryUrl": "https://github.com/my-org/my-server",
    "category": "other",
    "source": "user",
    ...
  }
}
```

### Submit Rating (Authenticated)
```
POST /api/ratings
Authorization: Required (via NextAuth session)
Content-Type: application/json
```

Request Body:
```json
{
  "serverId": "ai.exa/exa",
  "trustworthiness": 5,
  "usefulness": 4
}
```

Both `trustworthiness` and `usefulness` must be integers between 1 and 5.

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

The `vercel.json` includes a daily cron job to sync the registry at 6:00 AM UTC.

### Environment Variables for Production

Update these for production:
- `NEXTAUTH_URL` → Your production URL (e.g., `https://yourdomain.com`)
- `DATABASE_URL` → Your production PostgreSQL connection string
- `CRON_SECRET` → Set a secure secret for the sync endpoint (optional but recommended)
- GitHub/Google OAuth callback URLs → Update to production domain:
  - GitHub: `https://yourdomain.com/api/auth/callback/github`
  - Google: `https://yourdomain.com/api/auth/callback/google`

---

## Testing

Run tests:
```bash
npm test
```

Watch mode:
```bash
npm run test:watch
```

---

## Current Features

### ✅ Implemented
- **Search & Filter**: Full-text search across name, organization, and description
- **Category Filtering**: Filter by 8 categories (database, search, code, web, ai, data, tools, other)
- **Sorting Options**: Sort by Most Reviewed, Top Rated, Newest, or Trending
- **Rating Filter**: Filter servers by minimum rating threshold (3+, 4+, 4.5+ stars)
- **Trending Algorithm**: Calculates trending based on recent ratings (last 30 days)
- **Server Tabs**: Separate views for Registry servers and Community-uploaded servers
- **User Uploads**: POST endpoint and form component for submitting new servers
- **Auto-Categorization**: Servers are automatically categorized based on description keywords
- **Rating System**: Users can rate servers on trustworthiness and usefulness (1-5 scale)
- **Aggregated Ratings**: Average ratings and total count displayed per server
- **User Dashboard**: View all your ratings in one place
- **Pagination**: Offset-based pagination for server listings

## Future Development Roadmap

### Phase 1: Enhanced Sorting & Filtering ✅ (Completed)
- [x] Sort by: trending, top-rated, newest, most-reviewed
- [x] Filter by: minimum rating threshold
- [x] Implement trending score calculation (based on recent ratings count)
- [x] Advanced search filters (date range, rating range)

### Phase 2: Categories ✅ (Completed)
- [x] Define category taxonomy (Database, Search, Code, Web, AI, Data, Tools, Other)
- [x] Add category field to Server model
- [x] Category-based navigation and filtering
- [x] Auto-categorization based on description keywords


### Phase 3: Enhanced Reviews
- [ ] Text reviews alongside ratings
- [ ] Review voting (helpful/not helpful)
- [ ] Review moderation

### Phase 4: User Uploads (Mostly Complete)
- [x] POST /api/servers endpoint for user-uploaded servers
- [x] Server upload form component (`ServerUploadForm`)
- [x] User-uploaded servers listing (Community tab)
- [ ] Integrate upload form into dashboard UI
- [ ] Moderation queue for user submissions
- [ ] R2/S3 storage for custom icons
- [ ] Verification system for user-uploaded servers


### Phase 5: Advanced Features
- [ ] Server comparison tool
- [ ] Bookmark/favorites list
- [ ] Email notifications for updates
- [ ] API rate limiting with Redis
- [ ] Full-text search with PostgreSQL tsvector

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run linter: `npm run lint`
6. Commit: `git commit -m 'Add amazing feature'`
7. Push: `git push origin feature/amazing-feature`
8. Open a Pull Request

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: NextAuth.js v5 (beta)
- **Styling**: Tailwind CSS + Radix UI components
- **Testing**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions (if configured)
- **Hosting**: Vercel (recommended)

---

## License

MIT

