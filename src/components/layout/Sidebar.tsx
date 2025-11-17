'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LayoutDashboard,
  Factory,
  FlaskConical,
  FileCheck,
  GraduationCap,
  Wrench,
  ShoppingCart,
  Truck,
  Bell,
  Settings,
  Users,
  BarChart3,
  ClipboardList,
  Package,
} from 'lucide-react';
import { ExtendedSession } from '@/lib/auth';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  roles?: string[];
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['MILL_OPERATOR', 'MILL_MANAGER', 'FWGA_INSPECTOR', 'FWGA_PROGRAM_MANAGER', 'INSTITUTIONAL_BUYER', 'LOGISTICS_PLANNER', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Batch Logging',
    href: '/batches',
    icon: Package,
    roles: ['MILL_OPERATOR', 'MILL_MANAGER', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Quality Control',
    href: '/qc',
    icon: FlaskConical,
    roles: ['MILL_OPERATOR', 'MILL_MANAGER', 'FWGA_INSPECTOR', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Compliance',
    href: '/compliance',
    icon: FileCheck,
    roles: ['MILL_MANAGER', 'FWGA_INSPECTOR', 'FWGA_PROGRAM_MANAGER', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Diagnostics',
    href: '/diagnostics',
    icon: ClipboardList,
    roles: ['MILL_OPERATOR', 'MILL_MANAGER', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Training',
    href: '/training',
    icon: GraduationCap,
    roles: ['MILL_OPERATOR', 'MILL_MANAGER', 'FWGA_INSPECTOR', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Maintenance',
    href: '/maintenance',
    icon: Wrench,
    roles: ['MILL_OPERATOR', 'MILL_MANAGER', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Procurement',
    href: '/procurement',
    icon: ShoppingCart,
    roles: ['MILL_MANAGER', 'INSTITUTIONAL_BUYER', 'FWGA_PROGRAM_MANAGER', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Logistics',
    href: '/logistics',
    icon: Truck,
    roles: ['MILL_MANAGER', 'LOGISTICS_PLANNER', 'INSTITUTIONAL_BUYER', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Mills',
    href: '/mills',
    icon: Factory,
    roles: ['FWGA_INSPECTOR', 'FWGA_PROGRAM_MANAGER', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['MILL_MANAGER', 'FWGA_INSPECTOR', 'FWGA_PROGRAM_MANAGER', 'SYSTEM_ADMIN'],
  },
  {
    title: 'Users',
    href: '/users',
    icon: Users,
    roles: ['SYSTEM_ADMIN', 'FWGA_PROGRAM_MANAGER'],
  },
];

interface SidebarProps {
  session: ExtendedSession | null;
  isCollapsed?: boolean;
}

export function Sidebar({ session, isCollapsed = false }: SidebarProps) {
  const pathname = usePathname();

  if (!session) {
    return null;
  }

  const userRole = session.user.role;

  // Filter navigation items based on user role
  const filteredItems = navigationItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  });

  return (
    <div className="flex h-full flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">F</span>
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-foreground">
              FortifyMIS
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="default" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Link>
          );
        })}

        <Separator className="my-4" />

        {/* Settings */}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent',
            pathname === '/settings'
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span className="flex-1">Settings</span>}
        </Link>
      </nav>

      {/* User Info */}
      {!isCollapsed && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-semibold text-primary">
                {session.user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">
                {userRole.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
