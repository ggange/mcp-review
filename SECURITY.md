# Security Policy

## Supported Versions

We actively support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of MCP Review seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** open a public issue

Please do not report security vulnerabilities through public GitHub issues.

### 2. Report privately

Email the maintainers directly or use GitHub's [Security Advisory feature](https://github.com/ggange/mcp-review/security/advisories/new).

**Preferred method:** Create a private security advisory:
1. Go to https://github.com/ggange/mcp-review/security/advisories/new
2. Click "Report a vulnerability"
3. Fill out the form with details about the vulnerability

**Alternative method:** If you cannot use GitHub Security Advisories, email the maintainers at the address listed in the repository's main contact information.

### 3. What to include

Please include the following information in your report:
- Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability

### 4. Response timeline

- **Initial response:** Within 48 hours
- **Status update:** Within 7 days
- **Resolution:** Depends on severity and complexity

### 5. Disclosure policy

- We will acknowledge receipt of your report within 48 hours
- We will keep you informed of the progress towards resolving the issue
- We will notify you when the vulnerability has been fixed
- We will credit you in the security advisory (unless you prefer to remain anonymous)

### 6. What NOT to do

- Do not access or modify data that does not belong to you
- Do not perform any actions that could harm the project or its users
- Do not violate any laws or breach any agreements in the course of your research

## Security Best Practices

When using MCP Review:

1. **Keep dependencies updated** - Run `npm audit` regularly and update packages
2. **Use strong secrets** - Generate secure `NEXTAUTH_SECRET` and `CRON_SECRET` values
3. **Protect your database** - Use connection pooling and SSL for production databases
4. **Enable rate limiting** - Consider using distributed rate limiting (Redis/Vercel KV) for production
5. **Review environment variables** - Never commit `.env` files or expose secrets
6. **Use HTTPS** - Always use HTTPS in production environments

## Known Security Features

MCP Review includes the following security measures:

- **CSRF Protection** - Origin header validation on API routes
- **Rate Limiting** - In-memory rate limiting (upgrade to distributed for production)
- **Input Validation** - Zod schemas for all user inputs
- **SQL Injection Prevention** - Prisma ORM with parameterized queries
- **XSS Protection** - React's built-in escaping and Content Security Policy headers
- **Security Headers** - Comprehensive security headers in `next.config.ts`

## Security Updates

Security updates will be released as patches to the current version. Critical vulnerabilities will be addressed immediately.

Thank you for helping keep MCP Review and its users safe!
