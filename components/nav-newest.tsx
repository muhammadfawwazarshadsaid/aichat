"use client";

import {
  ArrowUpRight,
  Link as LinkIcon,
  MoreHorizontal,
  StarOff,
  Trash2,
  ChevronDown,
  CheckCircle,
  Pin,
  PinOff,
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";

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
import { togglePin } from "@/lib/supabaseClient";
import React from "react";

export function NavNewest({
  newest,
  refetch,
}: {
  newest: {
    name: string;
    url: string;
    created_at: string;
    pinned: boolean;
  }[];
  refetch?: () => void;
}) {
  const { isMobile } = useSidebar();
  const [selectedFilter, setSelectedFilter] = React.useState("Hari Ini");

  const filterOptions = [
    "Hari Ini",
    "Kemarin",
    "3 Hari yang Lalu",
    "7 Hari yang Lalu",
    "Bulan Ini",
    "Sudah Lama",
  ];

  const filterChats = () => {
    const now = new Date();
    const filteredChats = newest.filter((item) => {
      const createdAt = new Date(item.created_at);
      const diffInMs = now.getTime() - createdAt.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      switch (selectedFilter) {
        case "Hari Ini":
          return diffInDays < 1;
        case "Kemarin":
          return diffInDays >= 1 && diffInDays < 2;
        case "3 Hari yang Lalu":
          return diffInDays > 1 && diffInDays <= 3;
        case "7 Hari yang Lalu":
          return diffInDays > 3 && diffInDays <= 7;
        case "Bulan Ini":
          return diffInDays > 7 && diffInDays <= 30;
        case "Sudah Lama":
          return diffInDays > 30;
        default:
          return true;
      }
    });

    return filteredChats.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const filteredChats = filterChats();

  const handleCopyLink = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      toast.success("Berhasil disalin!", {
        description: "Link disalin ke clipboard",
        position: "top-center",
        icon: <CheckCircle className="text-green-500" />,
      });
    }).catch((err) => {
      console.error("Failed to copy link:", err);
      toast.error("Gagal menyalin link");
    });
  };

  const handleOpenInNewTab = (url: string) => {
    window.open(url, "_blank");
  };

  const handlePinToggle = async (url: string, isPinned: boolean) => {
    const chatId = url.split("/").filter(Boolean).pop() || ""; // Robustly extract chatId
    const token = Cookies.get("auth_token");

    console.log("Toggling pin for chatId:", chatId, "to pinned:", !isPinned);

    try {
      const response = await togglePin(chatId, !isPinned, token);
      console.log("togglePin response:", response);
      toast.success(isPinned ? "Chat dilepas dari pin!" : "Chat dipin!");
      if (refetch) refetch();
    } catch (err) {
      console.error("Failed to toggle pin:", err);
      toast.error(`Gagal mengubah status pin: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

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
                  {item.pinned && <Pin className="h-4 w-4 mr-2 inline" />}
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
                  <DropdownMenuItem onClick={() => handleCopyLink(item.url)}>
                    <LinkIcon className="text-muted-foreground mr-2 h-4 w-4" />
                    <span>Copy Link</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenInNewTab(item.url)}>
                    <ArrowUpRight className="text-muted-foreground mr-2 h-4 w-4" />
                    <span>Open in New Tab</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handlePinToggle(item.url, item.pinned)}
                  >
                    {item.pinned ? (
                      <>
                        <PinOff className="text-muted-foreground mr-2 h-4 w-4" />
                        <span>Unpin</span>
                      </>
                    ) : (
                      <>
                        <Pin className="text-muted-foreground mr-2 h-4 w-4" />
                        <span>Pin</span>
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="text-muted-foreground mr-2 h-4 w-4" />
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