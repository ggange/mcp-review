import Link from "next/link";
import type { Metadata } from 'next'
import { JsonLdScript } from '@/components/json-ld-script'

// Force static generation - this page has no dynamic content
export const dynamic = 'force-static'
export const revalidate = 3600 // Revalidate every hour

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

export const metadata: Metadata = {
  title: 'About MCP Review - Open Source MCP Server Directory',
  description: 'MCP Review is an open-source, community-driven platform for discovering and reviewing Model Context Protocol servers. MIT licensed, built transparently on GitHub. Join the MCP community and contribute!',
  keywords: [
    'about MCP Review',
    'open source MCP',
    'MCP community',
    'Model Context Protocol community',
    'OSS AI tools',
    'MIT license',
    'GitHub project',
  ],
  openGraph: {
    title: 'About MCP Review - Open Source MCP Community Project',
    description: 'Learn about MCP Review, the open-source community platform for discovering and reviewing Model Context Protocol servers. MIT licensed and built transparently on GitHub.',
    url: `${baseUrl}/about`,
    type: 'website',
  },
  twitter: {
    title: 'About MCP Review - Open Source MCP Community',
    description: 'Learn about MCP Review, the open-source community platform for MCP server discovery. MIT licensed. ⭐ Star us on GitHub!',
  },
  alternates: {
    canonical: `${baseUrl}/about`,
  },
}

export default function AboutPage() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MCP Review',
    alternateName: 'MCP Review Community',
    description: 'An open-source, community-driven platform where developers can discover, rate, and review Model Context Protocol (MCP) servers. Free, transparent, and MIT licensed.',
    url: baseUrl,
    logo: `${baseUrl}/icon.svg`,
    founder: {
      '@type': 'Person',
      name: 'ggange',
      url: 'https://github.com/Ggangemi03',
      sameAs: [
        'https://x.com/Ggangemi03',
        'https://www.reddit.com/user/ggange03',
      ],
    },
    sameAs: [
      'https://github.com/ggange/mcp-review',
      'https://github.com/ggange',
    ],
    publishingPrinciples: 'https://github.com/ggange/mcp-review/blob/main/CONTRIBUTING.md',
    license: 'https://opensource.org/licenses/MIT',
    knowsAbout: [
      'Model Context Protocol',
      'MCP Servers',
      'AI Tools',
      'Open Source Software',
      'Developer Tools',
    ],
  }

  // SoftwareSourceCode schema for the OSS project
  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'MCP Review',
    description: 'Open-source MCP server directory and community review platform',
    codeRepository: 'https://github.com/ggange/mcp-review',
    programmingLanguage: ['TypeScript', 'React', 'Next.js'],
    license: 'https://opensource.org/licenses/MIT',
    runtimePlatform: 'Node.js',
    targetProduct: {
      '@type': 'WebApplication',
      name: 'MCP Review',
      url: baseUrl,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
    },
  }

  // BreadcrumbList for navigation
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'About',
        item: `${baseUrl}/about`,
      },
    ],
  }

  return (
    <>
      <JsonLdScript data={organizationSchema} id="organization-schema" />
      <JsonLdScript data={softwareSchema} id="software-schema" />
      <JsonLdScript data={breadcrumbSchema} id="breadcrumb-schema" />
      <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <header className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          About MCP Review
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          The <strong>open-source</strong>, <strong>community-driven</strong> platform for <abbr title="Model Context Protocol">MCP</abbr> server discovery. 
          Learn about our mission to help the developer community.
        </p>
      </header>

      {/* Content Section */}
      <div className="mx-auto max-w-3xl">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <div className="space-y-6 text-foreground">

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">The Problem</h2>
              <p className="text-base leading-7 text-muted-foreground">
                When working with MCP servers, developers often face the uncertainty of choosing between various options without 
                knowing their quality, reliability, or suitability for specific use cases. This lack of information can lead to 
                wasted time, suboptimal choices, and frustration.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">Our Philosophy</h2>
              <p className="text-base leading-7 text-muted-foreground">
                MCP Review is a community-driven repository where developers can rate and review Model Context Protocol (MCP) servers. 
                Our mission is to overcome the challenge of using unknown products by providing a transparent platform for the developer 
                community to share their experiences, insights, and recommendations.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">Our Solution</h2>
              <p className="text-base leading-7 text-muted-foreground">
                By creating a centralized platform for ratings and reviews, we empower developers to make informed decisions. 
                Through community contributions, we build a comprehensive knowledge base that helps everyone discover the best MCP 
                servers for their AI workflows. Together, we transform the challenge of unknown products into an opportunity for 
                collective learning and growth.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">How you can help</h2>
              <p className="text-base leading-7 text-muted-foreground">
                You can help by rating and reviewing the MCP servers you use. 
                You can upload your own MCP servers to the platform and give users hints and tips on how to use your product; in this way, you can expand the outreach of your product and obtain direct feedback from your users.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">100% Open Source (MIT License)</h2>
              <p className="text-base leading-7 text-muted-foreground">
                MCP Review is <strong>fully open source</strong> under the <strong>MIT license</strong>. We believe in transparency, community collaboration, and building in public. 
                You can explore the codebase, report issues, suggest features, or contribute directly on{' '}
                <Link href="https://github.com/ggange/mcp-review" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">GitHub</Link>.
                Whether you&apos;re fixing a bug, improving documentation, or adding new features, every contribution matters.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link 
                  href="https://github.com/ggange/mcp-review" 
                  className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80 transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Star on GitHub
                </Link>
                <Link 
                  href="https://github.com/ggange/mcp-review/blob/main/CONTRIBUTING.md" 
                  className="inline-flex items-center gap-2 rounded-full bg-violet-100 dark:bg-violet-900/30 px-4 py-2 text-sm font-medium text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                >
                  Contribute
                </Link>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">Who we are</h2>
              <p className="text-base leading-7 text-muted-foreground">
                Or better, who am I? I am <Link href="https://github.com/ggange" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">ggange</Link> and I created MCP Review because I felt lost navigating the MCP ecosystem.
                With this platform, I would like to bring peer-review to MCP servers and help the community discover the best MCP servers for their AI workflows. <br />
                If you have any questions or suggestions, please feel free to contact me via <Link href="https://www.linkedin.com/in/giuseppe-gangemi-10823715b" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">LinkedIn</Link>, <Link href="https://x.com/Ggangemi03" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">X</Link> or <Link href="https://www.reddit.com/user/ggange03" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">Reddit</Link>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

