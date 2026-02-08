'use client'
import { PricingTable, useClerk } from "@clerk/nextjs";
import { dark } from '@clerk/themes'
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

function BillingNotReady() {
    return (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            <p className="text-lg font-medium">Pricing plans coming soon</p>
            <p className="mt-2 text-sm">
                Enable Billing in the Clerk Dashboard to display subscription plans.
            </p>
        </div>
    )
}

export default function CustomClerkPricing() {
    const { theme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()
    const clerk = useClerk()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Check if Clerk billing is enabled before rendering PricingTable
    // to avoid the dev-mode error when billing is disabled.
    // Clerk internally checks: __unstable__environment?.commerceSettings.billing.user.enabled
    const env = (clerk as unknown as Record<string, unknown>)?.__unstable__environment as
        { commerceSettings?: { billing?: { user?: { enabled?: boolean } } } } | undefined
    const billingEnabled = !!env?.commerceSettings?.billing?.user?.enabled

    if (!billingEnabled) {
        return <BillingNotReady />
    }

    // Determine redirect URL - if on payment-gated page, redirect back there after subscription
    const redirectUrl = pathname?.includes('/payment-gated')
        ? '/dashboard/payment-gated'
        : '/dashboard'

    return (
        <PricingTable
            appearance={{
                baseTheme: mounted && theme === "dark" ? dark : undefined,
                elements: {
                    pricingTableCardTitle: { // title
                        fontSize: 20,
                        fontWeight: 400,
                    },
                    pricingTableCardDescription: { // description
                        fontSize: 14
                    },
                    pricingTableCardFee: { // price
                        fontSize: 36,
                        fontWeight: 800,
                    },
                    pricingTable: {
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    },
                },
            }}
            newSubscriptionRedirectUrl={redirectUrl}
        />
    )
}
