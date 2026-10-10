


import { useSidebar } from "src/components/ui/sidebar";
import { Button } from "src/components/ui/button";
import { PanelLeft } from 'lucide-react';
import { Separator } from "src/components/ui/separator";

import { cn } from "src/lib/utils";
import FullLogo from "../../shared/logo/FullLogo";
import Search from "./Search";

import Profile from "./Profile";
import LightDark from "./Light-Dark";

import Notifications from "./Notifications";
import { useLocation } from 'react-router';
import { useCare } from '@/context/itcare';


const Header = () => {
 
  const { toggleSidebar } = useSidebar();
  const care = useLocation().pathname.startsWith('/it');
  const { user } = useCare();

  return (
    <>
      <header className={cn(`sticky top-0 z-2 bg-background border-b border-border`)}>
        <nav>
          <div className="mx-auto flex flex-wrap items-center justify-between p-2">
            <div className="flex gap-2 items-center">
              <div className="block lg:hidden">
                {care ? <span className="font-semibold">ITCare</span> : <FullLogo />}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="p-2 hover:bg-primary/5 rounded-full transition cursor-pointer"
                onClick={toggleSidebar}
                aria-label="Mở hoặc thu gọn menu"
              >
                <PanelLeft size={21}
                />
              </Button>




               {/* <Separator
                orientation="vertical"
                className="w-px h-5 mx-2 bg-border self-center max-lg:hidden"
              /> */}

 <Separator
                orientation="vertical"
                className="h-4 mr-4 w-px  ml-2   bg-border self-center max-lg:hidden"
              />


              <div className="sm:block hidden">
                {care ? <span className="text-sm text-muted-foreground">Hỗ trợ IT văn phòng</span> : <Search />}
              </div>
            </div>

            <div className="flex sm:gap-1 gap-0 items-center">
              {/* Theme Toggle */}
              <LightDark />
            

             

              {/* Notifications Dropdown */}
              {!care && <Notifications className="sm:block hidden" />}

           

              {/* Profile Dropdown */}
              {care ? <span className="text-sm px-2 hidden sm:block">{user?.name}</span> : <Profile />}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Header;
