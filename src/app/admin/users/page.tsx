'use client';

import { useCollection, useFirestore, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Terminal } from 'lucide-react';
import { useAdmin } from '@/hooks/use-admin';
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
    id: string;
    email: string;
    displayName?: string | null;
}

interface AdminRole {
    id: string; // This will be the userId
}

interface DisplayUser extends UserProfile {
    isAdmin: boolean;
}


function UsersPageSkeleton() {
    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Users</h1>
            </div>
             <p className="text-muted-foreground text-sm mt-1">Manage who has administrator privileges.</p>
            <div className="mt-4 rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead className="w-[100px]">Admin</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(3)].map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function AccessDenied() {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
                You do not have permission to view this page.
            </AlertDescription>
        </Alert>
    );
}

function AdminUsersTable() {
    const { user: currentUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const usersCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'users') : null),
        [firestore]
    );
    const rolesCollection = useMemoFirebase(
        () => (firestore ? collection(firestore, 'roles_admin') : null),
        [firestore]
    );

    const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollection);
    const { data: adminRoles, isLoading: rolesLoading } = useCollection<AdminRole>(rolesCollection);

    const displayUsers = useMemo((): DisplayUser[] | null => {
        if (!users || !adminRoles) return null;
        const adminIds = new Set(adminRoles.map(role => role.id));
        return users.map(user => ({
            ...user,
            isAdmin: adminIds.has(user.id),
        }));
    }, [users, adminRoles]);

    const handleAdminToggle = (user: DisplayUser, isChecked: boolean) => {
        if (!firestore || user.id === currentUser?.uid) {
            if (user.id === currentUser?.uid) {
                toast({
                    variant: 'destructive',
                    title: 'Action Forbidden',
                    description: "You cannot change your own admin status.",
                });
            }
            return;
        }

        const roleDocRef = doc(firestore, 'roles_admin', user.id);
        if (isChecked) {
            // Grant admin
            setDocumentNonBlocking(roleDocRef, { assignedAt: serverTimestamp() }, { merge: false });
            toast({
                title: 'Admin Granted',
                description: `${user.email} is now an admin.`,
            });
        } else {
            // Revoke admin
            deleteDocumentNonBlocking(roleDocRef);
            toast({
                title: 'Admin Revoked',
                description: `${user.email} is no longer an admin.`,
            });
        }
    };
    
    if (usersLoading || rolesLoading) {
        return <UsersPageSkeleton />;
    }

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Users</h1>
            </div>
             <p className="text-muted-foreground text-sm mt-1">Manage who has administrator privileges.</p>
            <div className="mt-4 rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead className="w-[100px]">Admin</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {displayUsers && displayUsers.length > 0 ? (
                            displayUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.email || 'No email'}</TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={user.isAdmin}
                                            onCheckedChange={(isChecked) => handleAdminToggle(user, isChecked)}
                                            disabled={user.id === currentUser?.uid}
                                            aria-label={`Toggle admin for ${user.email}`}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}


export default function UsersPage() {
    const { isAdmin, isAdminLoading } = useAdmin();

    if (isAdminLoading) {
        return <UsersPageSkeleton />;
    }

    if (!isAdmin) {
        return <AccessDenied />;
    }

    return <AdminUsersTable />;
}
