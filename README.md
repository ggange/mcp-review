# MCP Review

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.1-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.2-2D3748?logo=prisma)](https://www.prisma.io/)

> An open-source repository for discovering and rating MCP (Model Context Protocol) servers. Browse, search, and review servers from the official MCP Registry.

## ✨ Features

- 🔍 **Browse & Search** - Discover MCP servers from the official registry with advanced filtering
- ⭐ **Rate Servers** - Share your experience with trustworthiness and usefulness ratings
- 📝 **Write Reviews** - Leave detailed reviews to help others make informed decisions
- 👍 **Review Voting** - Vote reviews as helpful or not helpful
- 📊 **Aggregated Ratings** - See community ratings and reviews in real-time
- 📤 **Upload Servers** - Community members can upload their own MCP servers
- 👑 **Official Servers** - Admins can upload official servers representing organizations
- 🚀 **GitHub Import** - Auto-fill server forms by importing from GitHub repositories
- 📄 **Tools Markdown Upload** - Upload tools markdown files to quickly populate tool definitions
- 🖼️ **Custom Icons** - Upload custom icons for your servers (via Cloudflare R2)
- 🔄 **Auto-Sync** - Automatically syncs with the MCP Registry daily
- 🔐 **Authentication** - Sign in with GitHub or Google to rate servers
- 🛡️ **Security First** - Built with rate limiting, CSRF protection, and input validation
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices
- 🌙 **Dark Mode** - Beautiful dark theme support
- 📛 **GitHub Badges** - Embed dynamic rating badges in your repository README

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
   
   # Redis (Optional - for production rate limiting and caching)
   # For local development: REDIS_URL="redis://localhost:6379"
   # For Vercel: Install Redis from Vercel Marketplace (REDIS_URL auto-added)
   REDIS_URL="redis://localhost:6379"
   ```

4. **Set up the database**
   ```bash
   npm run db:database
   ```
   This will push the Prisma schema to your database and generate the Prisma client.
   
   **Note**: After the initial setup, if you need to add admin users, you can update the user role in the database:
   ```sql
   UPDATE "User" SET role = 'admin' WHERE email = 'your-email@example.com';
   ```

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

#### Redis Setup (Optional but Recommended for Production)

Redis is used for:
- **Distributed Rate Limiting**: Works across multiple server instances
- **Session Storage**: Faster session lookups (optional - can use PostgreSQL)
- **Server-Side Caching**: User-specific data caching

**For Vercel Deployment:**
1. Go to Vercel Dashboard → Your Project → Integrations
2. Browse Marketplace and install Redis (e.g., Upstash Redis)
3. The `REDIS_URL` environment variable will be automatically added
4. Redeploy your application

**For Local Development:**
- Install Redis locally: `brew install redis` (macOS) or use Docker
- Start Redis: `redis-server` (or `brew services start redis`)
- Set `REDIS_URL="redis://localhost:6379"` in your `.env` file

**Note**: The app will work without Redis, but rate limiting will use in-memory storage (not suitable for production with multiple instances).

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

## 🚀 Uploading Servers

### Official Servers (Admin Only)

Administrators can upload official servers representing organizations:

1. **Set up Admin Access**: Update a user's role in the database to `'admin'`:
   ```sql
   UPDATE "User" SET role = 'admin' WHERE email = 'admin@example.com';
   ```

2. **Upload Official Server**: 
   - Navigate to Dashboard (only visible to admins)
   - Click "Upload Official Server" button
   - Fill in the form (organization is required for official servers)
   - Official servers are marked with a gold "Official" badge

**Key Differences from User Servers:**
- Organization field is **required** (not optional)
- No author username displayed (represents organization, not individual)
- Only admins can upload official servers
- Official servers have a distinct gold badge

### GitHub Repository Import

When uploading a new server, you can automatically populate the form by importing from a GitHub repository:

1. Enter the GitHub repository URL in the "Repository URL" field
2. Click "Import from GitHub repo"
3. The form will be auto-filled with:
   - Server name (from repository name)
   - Description (from README or repository description)
   - Tools (parsed from README or tools markdown file)
   - Version (from package.json or README)
   - Usage tips (from README)
   - Category (auto-categorized based on description)

The import feature parses:
- Repository metadata from GitHub API
- README content for descriptions and tool definitions
- Tools markdown files (`TOOLS.md`, `docs/TOOLS.md`, `example_TOOLS.md`, etc.)
- Package.json for version information

### Tools Markdown File

You can document your MCP server tools in a markdown file and upload it directly:

1. Click "Upload Tools File" in the Tools section
2. Select a markdown file (`.md` or `.markdown`)
3. The file will be parsed to extract tool names and descriptions
4. Download the example file (`example_TOOLS.md`) to see the supported format

**Supported formats:**

**Detailed format:**
```markdown
### `tool_name`

Description of what the tool does.

**Arguments:**
- `param1` (type): Description
```

**Simple list format:**
```markdown
- **`tool_name`**: Brief description
- **`another_tool`**: Another description
```

The parser automatically detects both formats and extracts tool information.

## 📛 Badge Integration

Add a dynamic rating badge to your GitHub repository README to showcase your MCP server's ratings and reviews!

### Badge Overview

The MCP Review badge displays your server's trustworthiness and usefulness ratings, or a custom message if no ratings exist yet. The badge automatically updates as your server receives new ratings and reviews.

### Basic Usage

Add this to your repository's README.md:

```markdown
[![MCP Review](https://mcpreview.dev/api/badge/your-server-id)](https://mcpreview.dev/servers/your-server-id)
```

Replace `your-server-id` with your actual server ID (e.g., `my-org/my-server` or just `my-server`).

### Custom Text for No Ratings

When your server doesn't have ratings yet, you can customize the message displayed on the badge using the `text` query parameter:

```markdown
[![MCP Review](https://mcpreview.dev/api/badge/your-server-id?text=Come%20rate%20%26%20review%20us)](https://mcpreview.dev/servers/your-server-id)
```

**Default Messages:**
- Default: "Available on MCP Review"
- Custom: Provide your own message via the `text` parameter (max 50 characters)

**URL Encoding:** When using custom text, make sure to URL-encode special characters:
- Spaces: `%20`
- Ampersand: `%26`
- Other special characters should be properly encoded

### Examples

**Server with ratings:**
```markdown
[![MCP Review](https://mcpreview.dev/api/badge/ai.exa/exa)](https://mcpreview.dev/servers/ai.exa/exa)
```
Displays: `Trust: 4.5 | Use: 4.2` (example ratings)

**Server without ratings (default):**
```markdown
[![MCP Review](https://mcpreview.dev/api/badge/my-server)](https://mcpreview.dev/servers/my-server)
```
Displays: `Available on MCP Review`

**Server without ratings (custom):**
```markdown
[![MCP Review](https://mcpreview.dev/api/badge/my-server?text=Rate%20us%20on%20MCP%20Review)](https://mcpreview.dev/servers/my-server)
```
Displays: `Rate us on MCP Review`

### Badge Appearance

- **With Ratings**: Shows trustworthiness and usefulness ratings side by side (e.g., "Trust: 4.5 | Use: 4.2")
- **Without Ratings**: Displays your custom message or the default "Available on MCP Review"
- **Colors**: Badge uses a violet/purple gradient matching the MCP Review theme
- **Clickable**: Badge links directly to your server's review page

### API Reference

**Endpoint:** `GET /api/badge/[id]`

**Parameters:**
- `id` (path): Server ID (URL-encoded)
- `text` (query, optional): Custom message for no-ratings state (max 50 characters)

**Response:**
- Content-Type: `image/svg+xml`
- Status: `200` (success), `404` (server not found), `429` (rate limited), `500` (error)

**Response Headers:**
- `Cache-Control: public, max-age=300` (badges are cached for 5 minutes)
- `X-Content-Type-Options: nosniff`

**Error Responses:**
- `404`: Server not found - returns a "Not Found" badge
- `429`: Rate limit exceeded - returns JSON error
- `500`: Server error - returns an "Error" badge

### Troubleshooting

**Badge not displaying?**
- Check that your server ID is correct and URL-encoded
- Verify the server exists on MCP Review
- Ensure the badge URL is accessible (not blocked by firewall)

**Custom text not showing?**
- Make sure the text is properly URL-encoded
- Check that the text doesn't exceed 50 characters
- Verify special characters are escaped correctly

**Badge shows "Not Found"?**
- Verify your server ID matches exactly (case-sensitive)
- Check if your server has been uploaded to MCP Review
- Ensure organization/name format is correct (e.g., `org/name`)


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
- [ ] **Set up Redis** (recommended for production):
  - **Vercel**: Install Redis from [Vercel Marketplace](https://vercel.com/integrations) (e.g., Upstash Redis)
  - The `REDIS_URL` environment variable will be automatically added
  - Redis is used for distributed rate limiting and session storage

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [Model Context Protocol](https://modelcontextprotocol.io) - Learn about MCP
- [MCP Registry](https://registry.modelcontextprotocol.io) - Browse the official server registry
- [Prisma Documentation](https://www.prisma.io/docs) - Learn about Prisma ORM
- [NextAuth.js Documentation](https://next-auth.js.org) - Learn about authentication

## 🙏 Acknowledgments

- Built with the [Next.js](https://nextjs.org) framework
- Server data provided by the [MCP Registry](https://registry.modelcontextprotocol.io) and users
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ggange/mcp-review/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ggange/mcp-review/discussions) (if enabled)
- **Security**: See [SECURITY.md](./SECURITY.md) for vulnerability reporting

---

Made with ❤️ by the open source community
