import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { NavbarAuth } from '@/components/navbar-auth'
import { Logo } from '@/components/logo'
import { SiGithub } from '@icons-pack/react-simple-icons'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="text-xl font-semibold text-foreground">MCP Review</span>
          </Link>
          <ThemeSwitcher />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="https://github.com/ggange/mcp-review"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <Button
              variant="ghost"
              className="rounded-full bg-black text-white hover:bg-gray-800 hover:text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:hover:text-black border border-transparent"
            >
              <SiGithub className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">GitHub</span>
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              About us
            </Button>
          </Link>
          <NavbarAuth />
        </div>
      </div>
    </nav>
  )
}

