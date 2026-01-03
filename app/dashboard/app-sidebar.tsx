"use client"

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconMessageCircle,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconSparkles,
  IconBrandOpenai,
  IconShieldCheck,
} from "@tabler/icons-react"

import { NavDocuments } from "@/app/dashboard/nav-documents"
import { NavMain } from "@/app/dashboard/nav-main"
import { NavSecondary } from "@/app/dashboard/nav-secondary"
import { NavUser } from "@/app/dashboard/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { ChatMaxingIconColoured } from "@/components/logo"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { usePathname, useRouter } from "next/navigation"

const data = {
  // Main navigation items (visible to all users)
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Payment gated",
      url: "/dashboard/payment-gated",
      icon: IconSparkles,
    },
  ],
  // Admin-only navigation items
  navAdmin: [
    {
      title: "Security Monitoring",
      url: "/dashboard/security",
      icon: IconShieldCheck,
    },
    {
      title: "User Management",
      url: "#",
      icon: IconUsers,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconFileWord,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isAdmin = useQuery(api.users.checkIsAdmin);
  const pathname = usePathname();
  const router = useRouter();

  // Query security summary for badge - only if admin
  const securitySummary = useQuery(
    api.security.getSecuritySummary,
    isAdmin ? {} : "skip"
  );

  const handleAdminNavigation = (url: string) => {
    router.push(url);
  };

  // Determine badge color based on severity
  const getBadgeVariant = () => {
    if (!securitySummary) return "secondary";
    if (securitySummary.criticalCount > 0) return "destructive";
    if (securitySummary.highCount > 0) return "destructive";
    if (securitySummary.mediumCount > 0) return "default";
    return "secondary";
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <ChatMaxingIconColoured className="!size-6" />
                <span className="text-base font-semibold">{process.env.NEXT_PUBLIC_SITE_NAME || 'More Secure Starter'}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* Administration section - only visible to admin */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              {data.navAdmin.map((item) => {
                const isActive = pathname === item.url;
                const isSecurityItem = item.url === "/dashboard/security";
                const unreadCount = securitySummary?.unreadCount ?? 0;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      onClick={() => handleAdminNavigation(item.url)}
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      {isSecurityItem && unreadCount > 0 && (
                        <Badge
                          variant={getBadgeVariant()}
                          className="ml-auto h-5 min-w-5 px-1.5 text-xs"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
