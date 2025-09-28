import React from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { VisitorSidebar } from './VisitorSidebar';
import { VolunteerSidebar } from './VolunteerSidebar';
import { DonorSidebar } from './DonorSidebar';

interface MobileSidebarProps {
  user?: any;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ user }) => {
  const [open, setOpen] = React.useState(false);

  // Function to render the appropriate sidebar based on user role
  const renderSidebar = () => {
    if (!user) return null;

    switch (user.role) {
      case 'Admin':
        return <AdminSidebar user={user} open={open} setOpen={setOpen} />;
      case 'Visitor':
        return <VisitorSidebar user={user} open={open} setOpen={setOpen} />;
      case 'Volunteer':
        return <VolunteerSidebar user={user} open={open} setOpen={setOpen} />;
      case 'Donor':
        return <DonorSidebar user={user} open={open} setOpen={setOpen} />;
      default:
        return <AdminSidebar user={user} open={open} setOpen={setOpen} />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        {renderSidebar()}
      </SheetContent>
    </Sheet>
  );
};
