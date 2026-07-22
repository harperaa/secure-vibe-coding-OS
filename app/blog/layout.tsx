import { HeroHeader } from '@/app/(landing)/header'
import FooterSection from '@/app/(landing)/footer'

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <HeroHeader />
      <main className="min-h-screen pt-24">
        {children}
      </main>
      {/* modules:footer — the homepage-content module's INSTALL.md re-adds FooterSection here when installed */}
      <FooterSection />
    </>
  )
}
