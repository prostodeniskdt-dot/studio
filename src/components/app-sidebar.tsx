'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, BarChart3, Settings, Calculator, LineChart, Truck, ShoppingCart, Shield, Bug } from 'lucide-react';
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
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={{ children: item.label }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {isAdmin && (
            <>
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive(adminMenuItem.href)}
                tooltip={{ children: adminMenuItem.label }}
              >
                <Link href={adminMenuItem.href}>
                  <adminMenuItem.icon />
                  <span>{adminMenuItem.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive(debugMenuItem.href)}
                tooltip={{ children: debugMenuItem.label }}
                className="text-yellow-400 hover:text-yellow-300 hover:bg-sidebar-accent"
              >
                <Link href={debugMenuItem.href}>
                  <debugMenuItem.icon />
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
