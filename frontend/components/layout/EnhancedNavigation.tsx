'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Home,
    Users2,
    HandHeart,
    FolderHeart,
    ClipboardList,
    MessageCircle,
    FileCheck2,
    CalendarDays,
    AreaChart
} from "lucide-react";

const navigationLinks = [
    {
        href: "/admin",
        icon: Home,
        label: "Dashboard",
    },
    {
        href: "/admin/users",
        icon: Users2,
        label: "Users",
    },
    {
        href: "/admin/volunteers",
        icon: HandHeart,
        label: "Volunteers",
        badge: 6,
    },
    {
        href: "/admin/donations",
        icon: FolderHeart,
        label: "Donations",
    },
    {
        href: "/admin/help-requests",
        icon: ClipboardList,
        label: "Help Requests",
    },
    {
        href: "/admin/communications",
        icon: MessageCircle,
        label: "Communications",
    },
    {
        href: "/admin/documents",
        icon: FileCheck2,
        label: "Documents",
    },
    {
        href: "/admin/volunteers/shifts",
        icon: CalendarDays,
        label: "Shifts",
    },
    {
        href: "/admin/analytics",
        icon: AreaChart,
        label: "Analytics",
    },
];

const EnhancedNavigation = () => {
    const pathname = usePathname();

    return (
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navigationLinks.map(({ href, icon: Icon, label, badge }) => (
                <Link
                    key={label}
                    href={href}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                        pathname === href && "bg-accent text-primary"
                    )}
                >
                    <Icon className="h-4 w-4" />
                    {label}
                    {badge && (
                        <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                            {badge}
                        </Badge>
                    )}
                </Link>
            ))}
        </nav>
    );
};

export default EnhancedNavigation; 