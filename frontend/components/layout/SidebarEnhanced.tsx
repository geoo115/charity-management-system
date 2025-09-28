import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import EnhancedNavigation from "./EnhancedNavigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
    Bell,
    LayoutDashboard,
    LogOut
} from "lucide-react";

const SidebarEnhanced = () => {
    const { logout } = useAuth();

    return (
        <div className="hidden border-r bg-muted/40 md:block">
            <div className="flex h-full max-h-screen flex-col gap-2">
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <LayoutDashboard className="h-6 w-6" />
                        <span className="">Admin Dashboard</span>
                    </Link>
                    <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
                        <Bell className="h-4 w-4" />
                        <span className="sr-only">Toggle notifications</span>
                    </Button>
                </div>
                <div className="flex-1">
                    <EnhancedNavigation />
                </div>
                <div className="mt-auto p-4">
                    <Button size="sm" className="w-full" onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SidebarEnhanced;
