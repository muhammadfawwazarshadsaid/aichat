"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Link,
  MoreHorizontal,
  StarOff,
  Trash2,
  ChevronDown,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavNewest({
  newest,
}: {
  newest: {
    name: string;
    url: string;
    created_at: string;
  }[];
}) {
  const { isMobile } = useSidebar();
  const [selectedFilter, setSelectedFilter] = useState("Hari Ini");

  // Time filter options with "Kemarin" added
  const filterOptions = [
    "Hari Ini",
    "Kemarin",
    "3 Hari yang Lalu",
    "7 Hari yang Lalu",
    "Bulan Ini",
    "Sudah Lama",
  ];

  // Filter chats based on selected time range
  const filterChats = () => {
    const now = new Date();
    const filteredChats = newest.filter((item) => {
      const createdAt = new Date(item.created_at);
      const diffInMs = now.getTime() - createdAt.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      switch (selectedFilter) {
        case "Hari Ini":
          return diffInDays < 1; // Less than 1 day (today only)
        case "Kemarin":
          return diffInDays >= 1 && diffInDays < 2; // 1 to less than 2 days
        case "3 Hari yang Lalu":
          return diffInDays > 1 && diffInDays <= 3; // More than 1, up to 3 days
        case "7 Hari yang Lalu":
          return diffInDays > 3 && diffInDays <= 7; // More than 3, up to 7 days
        case "Bulan Ini":
          return diffInDays > 7 && diffInDays <= 30; // More than 7, up to 30 days
        case "Sudah Lama":
          return diffInDays > 30; // More than 30 days
        default:
          return true;
      }
    });

    return filteredChats;
  };

  const filteredChats = filterChats();

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <span>{selectedFilter}</span>
              <ChevronDown className="h-4 w-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-lg">
            {filterOptions.map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => setSelectedFilter(option)}
                className="cursor-pointer"
              >
                <span>{option}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarGroupLabel>
      <SidebarMenu>
        {filteredChats.length > 0 ? (
          filteredChats.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild>
                <a href={item.url} title={item.name}>
                  <span>{item.name}</span>
                </a>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem>
                    <Link className="text-muted-foreground" />
                    <span>Copy Link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <ArrowUpRight className="text-muted-foreground" />
                    <span>Open in New Tab</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))
        ) : (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              <span>Tidak ada histori obrolan</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {filteredChats.length > 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70">
              {/* <MoreHorizontal /> */}
              {/* <span>More</span> */}
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}