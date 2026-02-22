'use client';

import { useUser, useAuth } from '@/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '@/components/icons';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { LogOut, User, LayoutDashboard } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/');
  };

  const renderAuthButtons = () => {
    if (isUserLoading) {
      return <div className="flex items-center gap-2"><Skeleton className="h-9 w-24 rounded-full" /><Skeleton className="h-9 w-9 rounded-full" /></div>;
    }

    if (user) {
      return (
        <div className='flex items-center gap-2'>
          <Link href="/admin/documents">
            <Button variant="outline" className="rounded-full font-semibold transition-all duration-300 hover:bg-secondary">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary transition-all duration-300">
                  <AvatarFallback className='bg-secondary text-secondary-foreground'>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.displayName ?? 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className='cursor-pointer'>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" className="rounded-full font-semibold transition-all duration-300 hover:bg-secondary">Login</Button>
        </Link>
        <Link href="/signup">
          <Button className="rounded-full font-bold btn-primary-gradient transition-transform duration-300 hover:scale-105">Sign Up</Button>
        </Link>
      </div>
    );
  };

  return (
    <header className="flex w-full items-center justify-between gap-2 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon className="h-8 w-8 text-foreground" />
          <h1 className="text-xl font-bold tracking-tighter text-foreground">
            InfoWise
          </h1>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {renderAuthButtons()}
      </div>
    </header>
  );
}
