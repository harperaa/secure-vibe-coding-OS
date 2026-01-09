'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface CategoryFilterProps {
  categories: string[]
  tags: string[]
}

export function CategoryFilter({ categories, tags }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {/* All posts link */}
      <Link href="/blog">
        <Button variant="outline" size="sm">
          All Posts
        </Button>
      </Link>

      {/* Categories dropdown */}
      {categories.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Categories
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {categories.map((category) => (
              <DropdownMenuItem key={category} asChild>
                <Link href={`/blog/category/${encodeURIComponent(category.toLowerCase())}`}>
                  {category}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Tags dropdown */}
      {tags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Tags
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="max-h-64 overflow-y-auto">
            {tags.map((tag) => (
              <DropdownMenuItem key={tag} asChild>
                <Link href={`/blog/tag/${encodeURIComponent(tag.toLowerCase())}`}>
                  #{tag}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
