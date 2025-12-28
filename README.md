# MCP Review

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An open-source marketplace for discovering and rating MCP (Model Context Protocol) servers. Browse, search, and review servers from the official MCP Registry.

## Features

- 🔍 **Browse & Search** - Discover MCP servers from the official registry
- ⭐ **Rate Servers** - Share your experience with trustworthiness and usefulness ratings
- 📊 **Aggregated Ratings** - See community ratings and reviews
- 🔄 **Auto-Sync** - Automatically syncs with the MCP Registry
- 🔐 **Authentication** - Sign in with GitHub or Google to rate servers
- 📱 **Responsive Design** - Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (we recommend [Neon](https://neon.tech) - free tier available)
- GitHub OAuth App (optional, for development)
- Google OAuth App (optional)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then configure the following variables in `.env`:

```bash
# Database (Required)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# NextAuth (Optional - only needed if using OAuth)
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth (Optional - for development)
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"

# Google OAuth (Optional)
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"

# Cron Secret (Optional, for production)
CRON_SECRET="your-cron-secret-here"
```

**Setup Instructions:**
- **Database** (Required): Sign up at [Neon](https://neon.tech), create a project, and copy the connection string
- **OAuth** (Optional for development): 
  - You can run the app without OAuth to browse servers. Authentication is only needed to rate servers.
  - **NextAuth Secret**: Run `openssl rand -base64 32` to generate a secret (only needed if using OAuth)
  - **GitHub OAuth**: Create an OAuth app at [GitHub Settings](https://github.com/settings/developers)
    - Callback URL: `http://localhost:3000/api/auth/callback/github`
  - **Google OAuth**: Create OAuth 2.0 credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
    - Redirect URI: `http://localhost:3000/api/auth/callback/google`

### 3. Set Up Database

```bash
npm run db:database
```

This will push the schema to your database and generate the Prisma client.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The app will automatically sync servers from the MCP Registry on first load if the database is empty.

For more detailed setup instructions, see [NEXT_STEPS.md](./NEXT_STEPS.md).

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 16 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with [Prisma](https://www.prisma.io)
- **Authentication**: [NextAuth.js](https://next-auth.js.org)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Testing**: Vitest

## Data Source

This project syncs server data from the [Official MCP Registry](https://registry.modelcontextprotocol.io). Servers are automatically synced daily via cron job, or can be manually synced via the `/api/sync` endpoint.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Model Context Protocol](https://modelcontextprotocol.io) - learn about MCP
- [MCP Registry](https://registry.modelcontextprotocol.io) - browse the official server registry

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
