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
      <FooterSection />
    </>
  )
}
