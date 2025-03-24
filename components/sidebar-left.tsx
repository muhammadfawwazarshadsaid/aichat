"use client"
import Cookies from "js-cookie";
import * as React from "react"
import {
  AudioWaveform,
  Blocks,
  Calendar,
  Command,
  // Home,
  // Inbox,
  MessageCircleQuestion,
  // Search,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react"

import { NavNewest } from "@/components/nav-newest"
import { NavMain } from "@/components/nav-main"
// import { NavSecondary } from "@/components/nav-secondary"
// import { NavWorkspaces } from "@/components/nav-workspaces"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser } from "./nav-user"
import { getUserProfile } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation";
// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  // teams: [
  //   {
  //     name: "Acme Inc",
  //     logo: Command,
  //     plan: "Enterprise",
  //   },
  //   {
  //     name: "Acme Corp.",
  //     logo: AudioWaveform,
  //     plan: "Startup",
  //   },
  //   {
  //     name: "Evil Corp.",
  //     logo: Command,
  //     plan: "Free",
  //   },
  // ],
  navMain: [
    // {
    //   title: "Search",
    //   url: "#",
    //   icon: Search,
    // },
    {
      title: "Ask AI",
      url: "#",
      icon: Sparkles,
    },
    // {
    //   title: "Home",
    //   url: "#",
    //   icon: Home,
    //   isActive: true,
    // },
    // {
    //   title: "Inbox",
    //   url: "#",
    //   icon: Inbox,
    //   badge: "10",
    // },
  ],
  // navSecondary: [
  //   {
  //     title: "Calendar",
  //     url: "#",
  //     icon: Calendar,
  //   },
  //   {
  //     title: "Settings",
  //     url: "#",
  //     icon: Settings2,
  //   },
  //   {
  //     title: "Templates",
  //     url: "#",
  //     icon: Blocks,
  //   },
  //   {
  //     title: "Trash",
  //     url: "#",
  //     icon: Trash2,
  //   },
  //   {
  //     title: "Help",
  //     url: "#",
  //     icon: MessageCircleQuestion,
  //   },
  // ],
  newest: [
    {
      name: "Project Management & Task Tracking",
      url: "#",
      emoji: "📊",
    },
    {
      name: "Family Recipe Collection & Meal Planning",
      url: "#",
      emoji: "🍳",
    },
    {
      name: "Fitness Tracker & Workout Routines",
      url: "#",
      emoji: "💪",
    },
    {
      name: "Book Notes & Reading List",
      url: "#",
      emoji: "📚",
    },
    {
      name: "Sustainable Gardening Tips & Plant Care",
      url: "#",
      emoji: "🌱",
    },
    {
      name: "Language Learning Progress & Resources",
      url: "#",
      emoji: "🗣️",
    },
    {
      name: "Home Renovation Ideas & Budget Tracker",
      url: "#",
      emoji: "🏠",
    },
    {
      name: "Personal Finance & Investment Portfolio",
      url: "#",
      emoji: "💰",
    },
    {
      name: "Movie & TV Show Watchlist with Reviews",
      url: "#",
      emoji: "🎬",
    },
    {
      name: "Daily Habit Tracker & Goal Setting",
      url: "#",
      emoji: "✅",
    },
  ],
  // workspaces: [
  //   {
  //     name: "Personal Life Management",
  //     emoji: "🏠",
  //     pages: [
  //       {
  //         name: "Daily Journal & Reflection",
  //         url: "#",
  //         emoji: "📔",
  //       },
  //       {
  //         name: "Health & Wellness Tracker",
  //         url: "#",
  //         emoji: "🍏",
  //       },
  //       {
  //         name: "Personal Growth & Learning Goals",
  //         url: "#",
  //         emoji: "🌟",
  //       },
  //     ],
  //   },
  //   {
  //     name: "Professional Development",
  //     emoji: "💼",
  //     pages: [
  //       {
  //         name: "Career Objectives & Milestones",
  //         url: "#",
  //         emoji: "🎯",
  //       },
  //       {
  //         name: "Skill Acquisition & Training Log",
  //         url: "#",
  //         emoji: "🧠",
  //       },
  //       {
  //         name: "Networking Contacts & Events",
  //         url: "#",
  //         emoji: "🤝",
  //       },
  //     ],
  //   },
  //   {
  //     name: "Creative Projects",
  //     emoji: "🎨",
  //     pages: [
  //       {
  //         name: "Writing Ideas & Story Outlines",
  //         url: "#",
  //         emoji: "✍️",
  //       },
  //       {
  //         name: "Art & Design Portfolio",
  //         url: "#",
  //         emoji: "🖼️",
  //       },
  //       {
  //         name: "Music Composition & Practice Log",
  //         url: "#",
  //         emoji: "🎵",
  //       },
  //     ],
  //   },
  //   {
  //     name: "Home Management",
  //     emoji: "🏡",
  //     pages: [
  //       {
  //         name: "Household Budget & Expense Tracking",
  //         url: "#",
  //         emoji: "💰",
  //       },
  //       {
  //         name: "Home Maintenance Schedule & Tasks",
  //         url: "#",
  //         emoji: "🔧",
  //       },
  //       {
  //         name: "Family Calendar & Event Planning",
  //         url: "#",
  //         emoji: "📅",
  //       },
  //     ],
  //   },
  //   {
  //     name: "Travel & Adventure",
  //     emoji: "🧳",
  //     pages: [
  //       {
  //         name: "Trip Planning & Itineraries",
  //         url: "#",
  //         emoji: "🗺️",
  //       },
  //       {
  //         name: "Travel Bucket List & Inspiration",
  //         url: "#",
  //         emoji: "🌎",
  //       },
  //       {
  //         name: "Travel Journal & Photo Gallery",
  //         url: "#",
  //         emoji: "📸",
  //       },
  //     ],
  //   },
  // ],
}

export function SidebarLeft({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState<{ name: string; email: string; avatar: string } | null>(null)
  const router = useRouter();

  React.useEffect(() => {
  const token = Cookies.get("auth_token");
  const userId = Cookies.get("user_id");

  if (!token || !userId) {
    router.push("/login");
  } else {
    getUserProfile(userId, token)
      .then(profile => setUser({ name: profile.username, email: profile.email, avatar: "" }))
      .catch(err => console.error("Gagal mengambil profil:", err));
  }
}, [router]); // Tambahin `router` biar dependensinya jelas



  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <NavUser user={{ name: user?.name || "", email: user?.email || "", avatar: "" }}/>
        {/* <TeamSwitcher teams={data.teams} />
        <NavMain items={data.navMain} /> */}
      </SidebarHeader>
      <SidebarContent>
        <NavNewest newest={data.newest} />
        {/* <NavWorkspaces workspaces={data.workspaces} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      {/* <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter> */}
      <SidebarRail />
    </Sidebar>
  )
}
