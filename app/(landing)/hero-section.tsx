import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { HeroHeader } from "./header"
import { Sparkle } from 'lucide-react'

export default function HeroSection() {
    return (
        <>
            <HeroHeader />
            <main>
                <section className="">
                    <div className="pt-8 pb-4 md:pt-12 md:pb-6">
                        <div className="relative z-10 mx-auto max-w-5xl pt-6 px-6 text-center">
                            <div>
                                <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">Build Secure Applications with {process.env.NEXT_PUBLIC_SITE_NAME || 'Secure Vibe Coding'}</h1>
                                <p className="text-muted-foreground mx-auto mt-4 mb-5 max-w-xl text-balance text-xl">Real-time security monitoring and threat detection built into your Next.js applications.</p>

                                <div className="flex items-center justify-center gap-3 mb-4">
                                    <Button
                                        asChild
                                        size="lg">
                                        <Link href="#link">
                                            <span className="text-nowrap">Start Building</span>
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        size="lg"
                                        variant="outline">
                                        <Link href="#link">
                                            <span className="text-nowrap">Watch Video</span>
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="relative z-10 mx-auto max-w-5xl px-6">
                                <div className="">
                                    <div className="bg-background rounded-(--radius) relative mx-auto overflow-hidden border border-transparent shadow-lg shadow-black/10 ring-1 ring-black/10">
                                        <Image
                                            src="/hero-section-main-app-dark.png"
                                            alt="Secure Vibe Coding dashboard"
                                            width={2856}
                                            height={1798}
                                            priority
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}