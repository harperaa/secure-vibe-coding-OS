import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { IconShieldCheck, IconAlertTriangle, IconActivity } from '@tabler/icons-react'

export default function SecurityMonitoring() {
    return (
        <section className="py-12 md:py-16">
            <div className="mx-auto w-full max-w-5xl px-6">
                <div className="text-center">
                    <h2 className="text-foreground text-4xl font-semibold">Real-Time Security Monitoring</h2>
                    <p className="text-muted-foreground mb-6 mt-4 text-balance text-lg">
                        Comprehensive security dashboard that monitors threats across your application.
                        Track 19+ attack types with real-time alerts and detailed event logging.
                    </p>
                    <div className="bg-foreground/5 rounded-3xl p-6">
                        <Image
                            src="/security-dashboard.png"
                            alt="Security Monitoring Dashboard"
                            width={2880}
                            height={1842}
                            className="rounded-lg"
                        />
                    </div>
                </div>

                <div className="border-foreground/10 relative mt-12 grid gap-8 border-b pb-8 [--radius:1rem] md:grid-cols-2">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <IconShieldCheck className="size-6 text-green-600" />
                                <h3 className="text-foreground text-xl font-semibold">Multi-Layer Protection</h3>
                            </div>
                            <p className="text-muted-foreground my-4 text-lg">
                                Monitor XSS attacks, CSRF attempts, prompt injection, rate limiting violations,
                                and 15+ other security threats in real-time.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <Badge variant="outline">XSS Protection</Badge>
                                <Badge variant="outline">CSRF Guards</Badge>
                                <Badge variant="outline">Rate Limiting</Badge>
                                <Badge variant="outline">Input Validation</Badge>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <IconAlertTriangle className="size-6 text-orange-600" />
                                <h3 className="text-foreground text-xl font-semibold">Severity-Based Alerting</h3>
                            </div>
                            <p className="text-muted-foreground my-4 text-lg">
                                Events are categorized by severity (Critical, High, Medium, Low) so you can
                                prioritize responses and focus on the most important threats first.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <Badge variant="destructive">Critical</Badge>
                                <Badge variant="outline" className="border-orange-600 text-orange-600">High</Badge>
                                <Badge variant="outline" className="border-yellow-600 text-yellow-600">Medium</Badge>
                                <Badge variant="outline">Low</Badge>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <div className="flex items-center gap-2 mb-4">
                            <IconActivity className="size-6 text-blue-600" />
                            <h3 className="text-foreground text-xl font-semibold">Advanced Filtering & Analysis</h3>
                        </div>
                        <p className="text-muted-foreground text-lg">
                            Filter events by date range, event type, severity, and status. View detailed metadata
                            including IP addresses, fingerprints, endpoints, and request payloads to investigate
                            security incidents thoroughly.
                        </p>
                    </div>

                    <blockquote className="before:bg-primary relative mt-8 max-w-xl pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-full">
                        <p className="text-foreground text-lg">
                            The security dashboard gives us complete visibility into threats. We caught a
                            coordinated attack attempt within minutes and blocked it before any damage was done.
                        </p>
                        <footer className="mt-4 flex items-center gap-2">
                            <cite>Security Team</cite>
                            <span
                                aria-hidden
                                className="bg-foreground/15 size-1 rounded-full"></span>
                            <span className="text-muted-foreground">Enterprise User</span>
                        </footer>
                    </blockquote>
                </div>
        </section>
    )
}
