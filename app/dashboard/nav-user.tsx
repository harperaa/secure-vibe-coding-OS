"use client"

import { IconDotsVertical } from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { useClerk, useUser } from "@clerk/nextjs"
import { dark } from '@clerk/themes'
import { useTheme } from "next-themes"

export function NavUser() {
  const { isMobile } = useSidebar()
  const { openUserProfile } = useClerk()
  const { theme } = useTheme()
  const { user: clerkUser } = useUser();

  const appearance = {
    baseTheme: theme === "dark" ? dark : undefined,
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              onClick={() => openUserProfile({ appearance: {
                baseTheme: theme === "dark" ? dark : undefined,
              } })}
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={clerkUser?.imageUrl} alt={clerkUser?.fullName || ""} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{clerkUser?.fullName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {clerkUser?.primaryEmailAddress?.emailAddress}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
