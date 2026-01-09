import Link from "next/link";
import type { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://mcpreview.dev'

export const metadata: Metadata = {
  title: 'About MCP Review',
  description: 'Learn about the philosophy behind MCP Review and our mission to help the developer community discover the best Model Context Protocol servers through community-driven ratings and reviews.',
  openGraph: {
    title: 'About MCP Review',
    description: 'Learn about the philosophy behind MCP Review and our mission to help the developer community discover the best Model Context Protocol servers.',
    url: `${baseUrl}/about`,
    type: 'website',
  },
  twitter: {
    title: 'About MCP Review',
    description: 'Learn about the philosophy behind MCP Review and our mission to help the developer community.',
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
    description: 'A community-driven repository where developers can rate and review Model Context Protocol (MCP) servers',
    url: baseUrl,
    founder: {
      '@type': 'Person',
      name: 'ggange',
      url: 'https://github.com/ggange',
      sameAs: [
        'https://x.com/ggange',
        'https://www.reddit.com/user/ggange03',
      ],
    },
    sameAs: [
      'https://github.com/ggange',
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          About MCP Review
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Learn about the philosophy behind MCP Review and our mission to help the developer community.
        </p>
      </div>

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
              <h2 className="mb-4 text-2xl font-semibold text-foreground">How you can contribute</h2>
              <p className="text-base leading-7 text-muted-foreground">
                We will soon open source the platform and you will be able to contribute to the project directly on GitHub.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">Who we are</h2>
              <p className="text-base leading-7 text-muted-foreground">
                Or better, who am I? I am <Link href="https://github.com/ggange" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">ggange</Link> and I created MCP Review because I felt lost navigating the MCP ecosystem.
                With this platform, I would like to bring peer-review to MCP servers and help the community discover the best MCP servers for their AI workflows. <br />
                If you have any questions or suggestions, please feel free to contact me via <Link href="www.linkedin.com/in/giuseppe-gangemi-10823715b" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">LinkedIn</Link>, <Link href="https://x.com/ggange" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">X</Link> or <Link href="https://www.reddit.com/user/ggange03" className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200">Reddit</Link>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

