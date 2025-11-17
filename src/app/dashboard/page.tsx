import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions, ExtendedSession } from '@/lib/auth';

export default async function DashboardPage() {
  const session = (await getServerSession(authOptions)) as ExtendedSession | null;

  if (!session) {
    redirect('/login');
  }

  const role = session.user.role;

  // Redirect to role-specific dashboard
  switch (role) {
    case 'MILL_OPERATOR':
      redirect('/dashboard/operator');
    case 'MILL_MANAGER':
      redirect('/dashboard/manager');
    case 'FWGA_INSPECTOR':
      redirect('/dashboard/inspector');
    case 'FWGA_PROGRAM_MANAGER':
      redirect('/dashboard/program-manager');
    case 'INSTITUTIONAL_BUYER':
      redirect('/dashboard/buyer');
    case 'LOGISTICS_PLANNER':
      redirect('/dashboard/logistics');
    case 'SYSTEM_ADMIN':
      redirect('/dashboard/manager'); // Admin gets manager view
    default:
      redirect('/dashboard/operator'); // Fallback
  }
}
