import React from 'react';
import NavCollapse from './nav-collapse';
import SimpleBar from 'simplebar-react';
import FullLogo from '../../shared/logo/FullLogo';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from 'src/components/ui/sidebar';
import { NavSecondary } from './NavSecondary';
import { NavUser } from './NavUser';
import { Badge } from 'src/components/ui/badge';
import sidebaritems from './sidebaritems';
import itcareitems from './itcareitems';
import { Link, useLocation } from 'react-router';
import { useCare } from '@/context/itcare';
import { Button } from '@/components/ui/button';
import { Ticket } from 'lucide-react';

const SidebarLayout = ({ ...props }: React.ComponentProps<typeof Sidebar>) => {
  const care = useLocation().pathname.startsWith('/it');
  const { user, logout, demo } = useCare();
  const [logoutError, setLogoutError] = React.useState('');



  return (
     <Sidebar
            variant="inset"
            collapsible="icon"
            {...props}
            className="sidebar-box **:data-[slot=sidebar-inner]:bg-background **:data-[slot=sidebar-inner]:border **:data-[slot=sidebar-inner]:border-border group-data-[state=collapsed]:hover:shadow-xl"
            side="left"
        >
            <SidebarHeader className="p-3 group-data-[state=collapsed]:px-2.5 flex flex-row items-center justify-between border-b border-border">
                {care ? <Link to="/it/inbox" aria-label="ITCare" className="font-semibold text-lg flex items-center gap-2 min-w-0"><Ticket className="size-6 shrink-0" /><span className="group-data-[state=collapsed]:hidden">ITCare</span></Link> : <FullLogo />}
                <Badge className="group-data-[state=collapsed]:hidden" variant={"secondary"}>V.1.0</Badge>
            </SidebarHeader>

            <SidebarContent>
                <SimpleBar style={{ height: "100%" }} >
                    <SidebarGroup className="flex items-center justify-center group-data-[state=collapsed]:px-2 px-3 py-4">
                        <div className="px-0 group-data-[state=collapsed]:px-0 w-full flex flex-col gap-4">
                            <NavCollapse menu={care ? itcareitems : sidebaritems} className="text-sm" />
                        </div>
                    </SidebarGroup>
                </SimpleBar>
            </SidebarContent>

            <SidebarFooter className="p-4">
                <div className="hide-menu flex flex-col gap-2">
                    {care ? <><p className="text-sm font-medium">{user?.name}</p><p className="text-xs text-muted-foreground">{demo ? 'Nhân viên IT · Bản mẫu' : 'Nhân viên IT'}</p><Button variant="outline" onClick={() => { void logout().catch(() => setLogoutError('Đăng xuất chưa thành công. Vui lòng thử lại.')); }}>Đăng xuất</Button>{logoutError && <p role="alert" className="text-destructive text-xs">{logoutError}</p>}</> : <><NavSecondary /><NavUser /></>}
                </div>
            </SidebarFooter>

        </Sidebar >

  );
};

export default SidebarLayout;
