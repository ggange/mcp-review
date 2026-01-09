# MCP Review

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.2-2D3748?logo=prisma)](https://www.prisma.io/)

> An open-source marketplace for discovering and rating MCP (Model Context Protocol) servers. Browse, search, and review servers from the official MCP Registry.

## ✨ Features

- 🔍 **Browse & Search** - Discover MCP servers from the official registry with advanced filtering
- ⭐ **Rate Servers** - Share your experience with trustworthiness and usefulness ratings
- 📝 **Write Reviews** - Leave detailed reviews to help others make informed decisions
- 👍 **Review Voting** - Vote reviews as helpful or not helpful
- 📊 **Aggregated Ratings** - See community ratings and reviews in real-time
- 📤 **Upload Servers** - Community members can upload their own MCP servers
- 🖼️ **Custom Icons** - Upload custom icons for your servers (via Cloudflare R2)
- 🔄 **Auto-Sync** - Automatically syncs with the MCP Registry daily
- 🔐 **Authentication** - Sign in with GitHub or Google to rate servers
- 🛡️ **Security First** - Built with rate limiting, CSRF protection, and input validation
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🌙 **Dark Mode** - Beautiful dark theme support

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ ([Download](https://nodejs.org/))
- **PostgreSQL** database ([Neon](https://neon.tech) free tier recommended)
- **Git** for cloning the repository

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ggange/mcp-review.git
   cd mcp-review
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file:
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
   
   # App URL (Optional, for CSRF protection in production)
   NEXT_PUBLIC_APP_URL="https://your-domain.com"
   
   # Cloudflare R2 Storage (Optional - for custom server icons)
   R2_ACCOUNT_ID="your-cloudflare-account-id"
   R2_ACCESS_KEY_ID="your-r2-access-key-id"
   R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
   R2_BUCKET_NAME="mcp-server-icons"
   ```

4. **Set up the database**
   ```bash
   npm run db:database
   ```
   This will push the Prisma schema to your database and generate the Prisma client.

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

The app will automatically sync servers from the MCP Registry on first load if the database is empty.

### Environment Setup Details

#### Database Setup
- **Recommended**: Sign up at [Neon](https://neon.tech) (free tier available)
- Create a new project and copy the connection string
- Paste it into your `.env` file as `DATABASE_URL`

#### OAuth Setup (Optional)
You can run the app without OAuth to browse servers. Authentication is only needed to rate servers.

- **NextAuth Secret**: Generate with `openssl rand -base64 32`
- **GitHub OAuth**: 
  - Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/developers)
  - Create a new OAuth App
  - Callback URL: `http://localhost:3000/api/auth/callback/github`
- **Google OAuth**: 
  - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  - Create OAuth 2.0 credentials
  - Redirect URI: `http://localhost:3000/api/auth/callback/google`

#### Cloudflare R2 Setup (Optional)
R2 storage is used for custom server icons. Without it, user-uploaded servers will use default gradient avatars.

1. **Create R2 Bucket**: Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → R2 → Create bucket
2. **Create API Token**: R2 → Manage R2 API Tokens → Create API token (Object Read & Write permissions)
3. **Add to `.env`**:
   ```bash
   R2_ACCOUNT_ID="your-account-id"
   R2_ACCESS_KEY_ID="your-access-key-id"
   R2_SECRET_ACCESS_KEY="your-secret-access-key"
   R2_BUCKET_NAME="mcp-server-icons"
   ```

> **Note**: The R2 bucket can remain private. Icons are served through a Next.js proxy route (`/api/icons/[key]`).

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint -- --fix # Fix auto-fixable linting issues
npm test             # Run tests
npm run test:watch   # Run tests in watch mode

# Database
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:database  # Push schema and generate client
npm run db:studio    # Open Prisma Studio (database GUI)
```

### Project Structure

```
mcp-review/
├── src/
│   ├── app/              # Next.js app router pages and API routes
│   │   ├── api/          # API endpoints
│   │   ├── auth/         # Authentication pages
│   │   └── ...           # Other pages
│   ├── components/       # React components
│   │   ├── ui/          # Reusable UI components
│   │   └── ...          # Feature components
│   ├── lib/             # Utility functions and configurations
│   └── types/           # TypeScript type definitions
├── prisma/
│   └── schema.prisma    # Database schema
└── public/              # Static assets
```

### Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode during development:
```bash
npm run test:watch
```

## 🏗️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 16 with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma](https://www.prisma.io)
- **Authentication**: [NextAuth.js](https://next-auth.js.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Form Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)
- **Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) (optional, for custom icons)

## 📊 Data Source

This project syncs server data from the [Official MCP Registry](https://registry.modelcontextprotocol.io). 

- Servers are automatically synced daily via cron job
- Manual sync available via the `/api/sync` endpoint
- Sync respects rate limits and includes error handling

## 🤝 Contributing

We welcome contributions from the community! Whether it's bug fixes, new features, documentation improvements, or feedback, we'd love to have your help.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Run tests and linting** (`npm test && npm run lint`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

For detailed guidelines, please see our [Contributing Guide](./CONTRIBUTING.md).

### Development Guidelines

- Follow existing code patterns and style
- Write TypeScript for all new code
- Add tests for new features when appropriate
- Update documentation as needed
- Keep commits focused and descriptive

## 🐛 Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/ggange/mcp-review/issues)!

When reporting bugs, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (Node version, OS, etc.)
- Screenshots if applicable

## 🔒 Security

Security is important to us. If you discover a security vulnerability, please **do not** open a public issue. Instead, email the maintainers directly or use GitHub's [security advisory feature](https://github.com/ggange/mcp-review/security/advisories/new).

### Security Features

- Rate limiting on all API endpoints
- CSRF protection via Origin header validation
- Input validation and sanitization
- SQL injection prevention via Prisma
- XSS protection through React's built-in escaping

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🚀 Deployment

### Deploy on Vercel (Recommended)

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com/new)
3. Add your environment variables
4. Deploy!

Vercel will automatically detect Next.js and configure the build settings.

### Other Deployment Options

- **Railway**: [Deploy Guide](https://docs.railway.app/getting-started)
- **Render**: [Deploy Guide](https://render.com/docs/deploy-nextjs-app)
- **Self-hosted**: Follow the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `NEXTAUTH_URL` with your production domain
- [ ] Set `NEXT_PUBLIC_APP_URL` for CSRF protection
- [ ] Generate a secure `NEXTAUTH_SECRET`
- [ ] Set `CRON_SECRET` for sync endpoint protection
- [ ] Configure database connection pooling
- [ ] Set up cron job for automatic syncing (or use Vercel Cron)
- [ ] Configure R2 storage for custom icons (optional)

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Model Context Protocol](https://modelcontextprotocol.io) - Learn about MCP
- [MCP Registry](https://registry.modelcontextprotocol.io) - Browse the official server registry
- [Prisma Documentation](https://www.prisma.io/docs) - Learn about Prisma ORM
- [NextAuth.js Documentation](https://next-auth.js.org) - Learn about authentication

## 🙏 Acknowledgments

- Built with the [Next.js](https://nextjs.org) framework
- Server data provided by the [MCP Registry](https://registry.modelcontextprotocol.io)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ggange/mcp-review/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ggange/mcp-review/discussions) (if enabled)
- **Security**: See [SECURITY.md](./SECURITY.md) for vulnerability reporting

---

Made with ❤️ by the open source community
