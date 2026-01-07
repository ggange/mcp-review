export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Our Mission
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
              <h2 className="mb-4 text-2xl font-semibold text-foreground">Our Philosophy</h2>
              <p className="text-base leading-7 text-muted-foreground">
                MCP Review is a community-driven repository where developers can rate and review Model Context Protocol (MCP) servers. 
                Our mission is to overcome the challenge of using unknown products by providing a transparent platform for the developer 
                community to share their experiences, insights, and recommendations.
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-2xl font-semibold text-foreground">The Problem We Solve</h2>
              <p className="text-base leading-7 text-muted-foreground">
                When working with MCP servers, developers often face the uncertainty of choosing between various options without 
                knowing their quality, reliability, or suitability for specific use cases. This lack of information can lead to 
                wasted time, suboptimal choices, and frustration.
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
                <h2 className="mb-4 text-2xl font-semibold text-foreground"> Soon</h2>
                <p className="text-base leading-7 text-muted-foreground">
                    You will be able to upload your own MCP servers to the platform. Customize your page and give users hints and tips on how to use your product.
                </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

