'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function useAdmin() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const adminRoleRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );

  const { data: adminDoc, isLoading: isAdminLoading } = useDoc(adminRoleRef);

  return {
    isAdmin: !!adminDoc,
    isAdminLoading: isUserLoading || isAdminLoading,
  };
}