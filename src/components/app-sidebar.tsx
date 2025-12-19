'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, BarChart3, Settings, Calculator, LineChart, Truck, ShoppingCart, Shield, Bug, FlaskConical } from 'lucide-react';
import {
  SidebarHeader,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { AppLogo } from '@/components/app-logo';
import { useUser } from '@/firebase';

const menuItems = [
  { href: '/dashboard', label: 'Панель', icon: Home },
  { href: '/dashboard/products', label: 'Продукты', icon: Package },
  { href: '/dashboard/premixes', label: 'Примиксы', icon: FlaskConical },
  { href: '/dashboard/sessions', label: 'Инвентаризации', icon: BarChart3 },
  { href: '/dashboard/analytics', label: 'Аналитика', icon: LineChart },
  { href: '/dashboard/suppliers', label: 'Поставщики', icon: Truck },
  { href: '/dashboard/purchase-orders', label: 'Закупки', icon: ShoppingCart },
  { href: '/dashboard/calculator', label: 'Калькулятор', icon: Calculator },
];

const adminMenuItem = { href: '/dashboard/admin', label: 'Админка', icon: Shield };
const debugMenuItem = { href: '/dashboard/admin/debug', label: 'Debug', icon: Bug };


export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  const isAdmin = user?.email === 'prostodeniskdt@gmail.com';

  const isActive = (path: string) => {
    if (path === '/dashboard') {
        return pathname === path;
    }
    return pathname.startsWith(path);
  }

  return (
    <>
      <SidebarHeader>
        <AppLogo className="text-sidebar-foreground group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label} className="relative">
              {/* Active indicator */}
              {isActive(item.href) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full transition-all duration-200" />
              )}
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={{ children: item.label }}
                className="group relative transition-all duration-200"
              >
                <Link 
                  href={item.href}
                  aria-label={item.label}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <item.icon aria-hidden="true" className="transition-transform duration-200 group-hover:scale-110" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {isAdmin && (
            <>
             <SidebarMenuItem className="relative">
              {isActive(adminMenuItem.href) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-r-full transition-all duration-200" />
              )}
              <SidebarMenuButton
                asChild
                isActive={isActive(adminMenuItem.href)}
                tooltip={{ children: adminMenuItem.label }}
                className="group relative transition-all duration-200"
              >
                <Link 
                  href={adminMenuItem.href}
                  aria-label={adminMenuItem.label}
                  aria-current={isActive(adminMenuItem.href) ? 'page' : undefined}
                >
                  <adminMenuItem.icon aria-hidden="true" className="transition-transform duration-200 group-hover:scale-110" />
                  <span>{adminMenuItem.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem className="relative">
              {isActive(debugMenuItem.href) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-yellow-400 rounded-r-full transition-all duration-200" />
              )}
              <SidebarMenuButton
                asChild
                isActive={isActive(debugMenuItem.href)}
                tooltip={{ children: debugMenuItem.label }}
                className="group relative text-yellow-400 hover:text-yellow-300 hover:bg-sidebar-accent transition-all duration-200"
              >
                <Link 
                  href={debugMenuItem.href}
                  aria-label={debugMenuItem.label}
                  aria-current={isActive(debugMenuItem.href) ? 'page' : undefined}
                >
                  <debugMenuItem.icon aria-hidden="true" className="transition-transform duration-200 group-hover:scale-110" />
                  <span>{debugMenuItem.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {/* Settings button is removed for now */}
      </SidebarFooter>
    </>
  );
}
