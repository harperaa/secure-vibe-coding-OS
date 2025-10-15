'use client'
import { PricingTable } from "@clerk/nextjs";
import { dark } from '@clerk/themes'
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"

export default function CustomClerkPricing() {
    const { theme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Determine redirect URL - if on payment-gated page, redirect back there after subscription
    const redirectUrl = pathname?.includes('/payment-gated')
        ? '/dashboard/payment-gated'
        : '/dashboard'

    return (
        <>
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
        </>
    )
}