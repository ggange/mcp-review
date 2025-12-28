# Contributing to MCP Review

Thank you for your interest in contributing! This document provides a simple guide to get you started.

## Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mcp-review.git
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
   Then fill in your `.env` file with your configuration (see [README.md](./README.md) for details).

4. **Set up the database**
   ```bash
   npm run db:database
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Development Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Follow existing code patterns and style
   - Use TypeScript for all new code
   - Write clear, descriptive commit messages

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Description of your changes"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request on GitHub.

## Code Style

- Follow the existing code patterns in the project
- Use TypeScript for all new code
- Run `npm run lint` before committing
- Use meaningful variable and function names
- Add comments for complex logic

## Testing

- Run tests before submitting: `npm test`
- Ensure all tests pass
- Add tests for new features when appropriate

## Pull Requests

When creating a Pull Request:

1. **Describe your changes** - What did you change and why?
2. **Link related issues** - Reference any issues your PR addresses
3. **Ensure tests pass** - All tests should pass before submitting
4. **Keep PRs focused** - One feature or fix per PR is easier to review

## Reporting Issues

When reporting a bug or requesting a feature:

1. **Check existing issues** - Make sure the issue hasn't been reported
2. **Provide details**:
   - What happened?
   - What did you expect to happen?
   - Steps to reproduce (for bugs)
   - Environment details (Node version, OS, etc.)

## Questions?

Feel free to open an issue for questions or discussions. We're happy to help!

Thank you for contributing! 🎉

