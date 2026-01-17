import Link from "next/link";
import type { Metadata } from "next";
import { JsonLdScript } from "@/components/json-ld-script";

export const dynamic = "force-static";
export const revalidate = 3600;

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  "https://mcpreview.dev";

const PRIVACY_POLICY_URL = "https://www.iubenda.com/privacy-policy/27793305";

export const metadata: Metadata = {
  title: "Terms and Conditions - MCP Review",
  description:
    "Terms and Conditions for using MCP Review, the open-source directory for Model Context Protocol servers. Read our terms of service, user responsibilities, and community guidelines.",
  keywords: [
    "terms and conditions",
    "terms of service",
    "MCP Review terms",
    "user agreement",
    "legal terms",
    "privacy policy",
  ],
  openGraph: {
    title: "Terms and Conditions - MCP Review",
    description:
      "Terms and Conditions for using MCP Review, the open-source MCP server directory.",
    url: `${baseUrl}/terms`,
    type: "website",
  },
  twitter: {
    title: "Terms and Conditions - MCP Review",
    description:
      "Read the Terms and Conditions for using MCP Review, the open-source MCP server directory.",
  },
  alternates: {
    canonical: `${baseUrl}/terms`,
  },
};

export default function TermsPage() {
  const lastUpdated = "2026-01-17";

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: baseUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Terms and Conditions",
        item: `${baseUrl}/terms`,
      },
    ],
  } as const;

  return (
    <>
      <JsonLdScript data={breadcrumbSchema} id="breadcrumb-schema" />

      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Please also read our{" "}
            <Link
              href={PRIVACY_POLICY_URL}
              className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200 underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              Privacy Policy
            </Link>
            , which explains how we collect and process personal data, cookies and
            tracking technologies, and your rights.
          </p>
        </header>

        <div className="mx-auto max-w-3xl">
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <div className="space-y-10 text-foreground">
              {/* 1 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">1. Definitions</h2>
                <ul className="list-disc pl-6 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>
                    <strong>"Service"</strong> means the MCP Review website,
                    applications, and related services.
                  </li>
                  <li>
                    <strong>"Operator"</strong> means the MCP Review Community,
                    including maintainers and contributors operating the Service.
                  </li>
                  <li>
                    <strong>"User"</strong>, <strong>"you"</strong>, or{" "}
                    <strong>"your"</strong> means any individual or entity
                    accessing or using the Service.
                  </li>
                  <li>
                    <strong>"User Content"</strong> means any content submitted,
                    posted, or displayed by Users, including reviews, ratings,
                    server listings, comments, and related metadata.
                  </li>
                  <li>
                    <strong>"MCP Server"</strong> means a Model Context Protocol
                    server listed on the Service.
                  </li>
                </ul>
              </section>

              {/* 2 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">2. Acceptance of Terms</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  By accessing or using the Service, you agree to be bound by
                  these Terms. If you do not agree, you must not access or use
                  the Service.
                </p>
                <p className="text-base leading-7 text-muted-foreground">
                  These Terms apply to all visitors, registered users, and
                  contributors.
                </p>
              </section>

              {/* 3 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">3. Eligibility</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  You must be at least <strong>13 years old</strong> (or the
                  minimum legal age in your jurisdiction) to use the Service. By
                  using the Service, you represent that you meet this
                  requirement.
                </p>
              </section>

              {/* 4 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">
                  4. Description of the Service
                </h2>
                <p className="text-base leading-7 text-muted-foreground">
                  MCP Review is a community-driven directory and review platform
                  for MCP Servers. The Service enables Users to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>Browse and discover MCP Servers</li>
                  <li>Submit ratings and reviews</li>
                  <li>List MCP Servers they operate or represent</li>
                  <li>Access community-generated content and feedback</li>
                </ul>
                <p className="text-base leading-7 text-muted-foreground">
                  We may modify, suspend, or discontinue any part of the Service
                  at any time without liability.
                </p>
              </section>

              {/* 5 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">
                  5. Accounts and Security
                </h2>
                <p className="text-base leading-7 text-muted-foreground">
                  Some features may require an account. If you create an account,
                  you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Maintain and update your information as needed</li>
                  <li>Safeguard your credentials</li>
                  <li>Accept responsibility for activity under your account</li>
                  <li>Notify us promptly of unauthorized use</li>
                </ul>
              </section>

              {/* 6 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">6. User Content</h2>

                <h3 className="mb-3 text-xl font-semibold">6.1 Ownership and License</h3>
                <p className="text-base leading-7 text-muted-foreground">
                  You retain ownership of your User Content. By submitting User
                  Content, you grant the Operator a worldwide, non-exclusive,
                  royalty-free license to use, host, store, reproduce, modify,
                  publish, display, and distribute that content solely for the
                  purpose of operating, improving, securing, and promoting the
                  Service.
                </p>

                <h3 className="mb-3 text-xl font-semibold">6.2 Reviews and Ratings</h3>
                <p className="text-base leading-7 text-muted-foreground">
                  When submitting reviews or ratings, you agree that they:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>Reflect your genuine experience</li>
                  <li>Are accurate and not misleading</li>
                  <li>Are not submitted for compensation or improper benefit</li>
                  <li>Do not violate law or third-party rights</li>
                  <li>Do not include confidential or personal data of others without consent</li>
                </ul>

                <h3 className="mb-3 text-xl font-semibold">6.3 Server Listings</h3>
                <p className="text-base leading-7 text-muted-foreground">
                  By listing an MCP Server, you represent that:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>You have authority to submit the listing</li>
                  <li>The information is accurate and not misleading</li>
                  <li>The server complies with applicable laws</li>
                  <li>The listing does not infringe intellectual property rights</li>
                </ul>
              </section>

              {/* 7 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">7. Prohibited Conduct</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  You agree not to use the Service to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>Violate any applicable law or regulation</li>
                  <li>Transmit malware, viruses, or harmful code</li>
                  <li>Attempt unauthorized access to systems or accounts</li>
                  <li>Disrupt, overload, or interfere with the Service</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Impersonate others or misrepresent affiliation</li>
                  <li>Collect personal data about users without consent</li>
                  <li>Use bots/scrapers/automation without permission</li>
                  <li>Post spam or unsolicited commercial communications</li>
                </ul>
              </section>

              {/* 8 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">8. Intellectual Property</h2>

                <h3 className="mb-3 text-xl font-semibold">8.1 Service Content</h3>
                <p className="text-base leading-7 text-muted-foreground">
                  The Service software is open source and provided under the MIT
                  License. Source code is available on{" "}
                  <Link
                    href="https://github.com/ggange/mcp-review"
                    className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </Link>
                  . Any non-user content, branding, and trademarks remain the
                  property of their respective owners.
                </p>

                <h3 className="mb-3 text-xl font-semibold">8.2 Third-Party Content and MCP Servers</h3>
                <p className="text-base leading-7 text-muted-foreground">
                  MCP Servers listed on the Service are owned by their respective
                  owners and may be subject to separate licenses and terms. The
                  Service may also contain links to third-party websites or
                  resources. We do not control or endorse third-party content or
                  services.
                </p>
              </section>

              {/* 9 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">
                  9. Moderation and Enforcement
                </h2>
                <p className="text-base leading-7 text-muted-foreground">
                  We reserve the right (but not the obligation) to monitor,
                  review, and moderate User Content and Service usage, and to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>Remove or refuse to post content that violates these Terms</li>
                  <li>Suspend or terminate accounts</li>
                  <li>Restrict access to features</li>
                  <li>Take appropriate legal action where warranted</li>
                </ul>
                <p className="text-base leading-7 text-muted-foreground">
                  You may be exposed to content you find objectionable. You use
                  the Service at your own risk.
                </p>
              </section>

              {/* 10 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">10. Disclaimers</h2>

                <h3 className="mb-3 text-xl font-semibold">10.1 Service Availability</h3>
                <p className="text-base leading-7 text-muted-foreground">
                  The Service is provided "as is" and "as available." We do not
                  warrant uninterrupted, secure, or error-free operation.
                </p>

                <h3 className="mb-3 text-xl font-semibold">10.2 Content Accuracy</h3>
                <p className="text-base leading-7 text-muted-foreground">
                  We do not warrant the accuracy, completeness, or usefulness of
                  information on the Service. User Content reflects Users'
                  opinions and does not represent our views.
                </p>

                <h3 className="mb-3 text-xl font-semibold">10.3 MCP Servers</h3>
                <p className="text-base leading-7 text-muted-foreground">
                  We do not endorse, guarantee, or assume responsibility for MCP
                  Servers listed on the Service. Use of any MCP Server is at
                  your own risk.
                </p>
              </section>

              {/* 11 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">11. Limitation of Liability</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  To the fullest extent permitted by applicable law, the
                  Operator, its contributors, and affiliates will not be liable
                  for any indirect, incidental, special, consequential, or
                  punitive damages, or any loss of profits, revenues, data, use,
                  goodwill, or other intangible losses arising from:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>Your use of or inability to use the Service</li>
                  <li>Any conduct or content of third parties</li>
                  <li>Unauthorized access to or use of systems or data</li>
                  <li>Interruptions or cessation of transmission</li>
                  <li>Bugs, malware, or similar harmful elements</li>
                  <li>Errors or omissions in content</li>
                </ul>
              </section>

              {/* 12 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">12. Indemnification</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  You agree to defend, indemnify, and hold harmless the Operator
                  from and against claims, liabilities, damages, losses, and
                  expenses (including reasonable legal and accounting fees)
                  arising out of or related to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>Your use of the Service</li>
                  <li>Your violation of these Terms</li>
                  <li>Your violation of third-party rights</li>
                  <li>Your User Content</li>
                </ul>
              </section>

              {/* 13 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">13. Termination</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  We may suspend or terminate your access to the Service at any
                  time for any reason, including for violations of these Terms.
                  Upon termination, your right to use the Service will cease
                  immediately.
                </p>
                <p className="text-base leading-7 text-muted-foreground">
                  Licenses granted by you to the Operator (including the User
                  Content license) survive termination to the extent necessary
                  to operate and maintain the Service (for example, to keep
                  historical reviews), unless we decide to remove such content.
                </p>
              </section>

              {/* 14 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">14. Privacy</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  Our Privacy Policy describes how we collect, use, and share
                  personal data and how cookies and similar technologies are
                  used. It also explains your rights (including under GDPR/CCPA
                  where applicable). You can review it here:{" "}
                  <Link
                    href={PRIVACY_POLICY_URL}
                    className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {PRIVACY_POLICY_URL}
                  </Link>
                  .
                </p>
              </section>

              {/* 15 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">
                  15. Governing Law and Venue
                </h2>
                <p className="text-base leading-7 text-muted-foreground">
                  These Terms are governed by and construed in accordance with
                  the laws of the jurisdiction in which the Operator primarily
                  operates, excluding conflict of law principles. Any disputes
                  arising out of or relating to these Terms or the Service shall
                  be subject to the exclusive jurisdiction of the courts in that
                  jurisdiction, unless mandatory consumer protection laws
                  provide otherwise.
                </p>
                <p className="text-base leading-7 text-muted-foreground">
                  If you are located in the European Union, nothing in these
                  Terms limits your rights as a consumer under mandatory
                  provisions of applicable law.
                </p>
              </section>

              {/* 16 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">16. Changes to These Terms</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  We may update these Terms from time to time. If changes are
                  material, we will try to provide at least 30 days' notice
                  before they take effect. Continued use of the Service after
                  updates become effective constitutes acceptance of the updated
                  Terms.
                </p>
              </section>

              {/* 17 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">17. Severability</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  If any provision of these Terms is held invalid or
                  unenforceable, the remaining provisions will remain in full
                  force and effect.
                </p>
              </section>

              {/* 18 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">18. Entire Agreement</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  These Terms, together with the Privacy Policy and any legal
                  notices published on the Service, constitute the entire
                  agreement between you and the Operator regarding the Service.
                </p>
              </section>

              {/* 19 */}
              <section>
                <h2 className="mb-4 text-2xl font-semibold">19. Contact</h2>
                <p className="text-base leading-7 text-muted-foreground">
                  If you have questions about these Terms, please contact us:
                </p>
                <ul className="list-none pl-0 space-y-2 text-base leading-7 text-muted-foreground">
                  <li>
                    • GitHub:{" "}
                    <Link
                      href="https://github.com/ggange/mcp-review"
                      className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://github.com/ggange/mcp-review
                    </Link>
                  </li>
                  <li>
                    • Issues:{" "}
                    <Link
                      href="https://github.com/ggange/mcp-review/issues"
                      className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Report issues on GitHub
                    </Link>
                  </li>
                </ul>
              </section>

              <section className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  By using MCP Review, you acknowledge that you have read,
                  understood, and agree to be bound by these Terms and the{" "}
                  <Link
                    href={PRIVACY_POLICY_URL}
                    className="text-violet-600 dark:text-violet-300 hover:text-violet-700 dark:hover:text-violet-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
