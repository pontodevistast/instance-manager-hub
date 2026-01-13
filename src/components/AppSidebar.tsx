import { Smartphone, FileText, Settings, LayoutGrid, MessageSquare, Zap, ChevronDown } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from '@/contexts/LocationContext';
import { useSubaccounts } from '@/hooks/use-subaccounts';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function AppSidebar() {
  const { locationId } = useLocation();
  const { data: subaccounts } = useSubaccounts();
  const navigate = useNavigate();

  const menuItems = [
    { title: 'Instâncias', url: `/${locationId}/instances`, icon: Smartphone },
    { title: 'Integração GHL', url: `/${locationId}/ghl`, icon: Zap },
    { title: 'Logs', url: `/${locationId}/logs`, icon: FileText },
    { title: 'Configurações', url: `/${locationId}/settings`, icon: Settings },
  ];

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-12 border shadow-sm">
              <div className="flex items-center gap-3 w-full">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="font-semibold text-xs truncate w-full">Subconta Atual</span>
                  <span className="text-[10px] text-muted-foreground truncate w-full">
                    {locationId}
                  </span>
                </div>
                <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[240px]" align="start">
            <DropdownMenuItem onClick={() => navigate('/')}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Ver Todas (Gestor)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="max-h-[300px] overflow-y-auto">
              {subaccounts?.map(id => (
                <DropdownMenuItem 
                  key={id} 
                  onClick={() => navigate(`/${id}/instances`)}
                  className={id === locationId ? "bg-muted font-medium" : ""}
                >
                  {id}
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu da Subconta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-semibold">
          Manager v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}