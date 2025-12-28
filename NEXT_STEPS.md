# MCP Marketplace - Setup & Next Steps

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

Copy the example environment file:
```bash
cp .env.example .env
```

Then configure the following:

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

### 3. Set Up Database

Push the schema to your database:
```bash
npx prisma db push
```

Generate the Prisma client:
```bash
npx prisma generate
```

### 4. Sync MCP Registry

Start the dev server:
```bash
npm run dev
```

Then trigger the initial sync:
```bash
curl -X POST http://localhost:3000/api/sync
```

Or visit `http://localhost:3000/api/sync` in your browser (GET works in development mode).

### 5. You're Ready!

Visit http://localhost:3000 to see the marketplace.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth.js handlers
│   │   ├── ratings/       # Rating submission endpoint
│   │   ├── servers/       # Public API endpoints
│   │   └── sync/          # Registry sync endpoint
│   ├── auth/signin/       # Custom sign-in page
│   ├── dashboard/         # User ratings dashboard
│   └── servers/[id]/      # Server detail page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # App components
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   ├── mcp-registry.ts   # Registry sync logic
│   └── utils.ts          # Helper functions
└── types/                # TypeScript types
```

---

## Public API

### List Servers
```
GET /api/servers
GET /api/servers?q=search_term
GET /api/servers?limit=20&cursor=server_id
```

Response:
```json
{
  "data": [...],
  "nextCursor": "next_server_id",
  "total": 100
}
```

### Get Server Details
```
GET /api/servers/{id}
```

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
    "ratings": [...]
  }
}
```

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
- `NEXTAUTH_URL` → Your production URL
- GitHub/Google OAuth callback URLs → Update to production domain

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

## Future Development Roadmap

### Phase 1: Sorting & Filtering
- [ ] Sort by: trending, top-rated, newest, most-reviewed
- [ ] Filter by: official only, minimum rating
- [ ] Implement trending score calculation

### Phase 2: Categories
- [ ] Define category taxonomy (AI/ML, Developer Tools, Data, etc.)
- [ ] Add category field to Server model
- [ ] Category-based navigation
- [ ] Auto-categorization using LLM (optional)

### Phase 3: User Uploads
- [ ] Server submission form
- [ ] Moderation queue
- [ ] R2/S3 storage for custom icons
- [ ] Verification system

### Phase 4: Enhanced Reviews
- [ ] Text reviews alongside ratings
- [ ] Review voting (helpful/not helpful)
- [ ] Review moderation

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

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon) + Prisma ORM
- **Auth**: NextAuth.js v5
- **Styling**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions
- **Hosting**: Vercel

---

## License

MIT

