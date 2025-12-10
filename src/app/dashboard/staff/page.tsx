'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { BarMember, UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { StaffTable } from '@/components/staff/staff-table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddStaffDialog } from '@/components/staff/add-staff-dialog';

export default function StaffPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [staffWithProfiles, setStaffWithProfiles] = React.useState<BarMember[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = React.useState(true);

  const membersQuery = useMemoFirebase(() => 
    firestore && barId ? collection(firestore, 'bars', barId, 'members') : null,
    [firestore, barId]
  );
  
  const { data: members, isLoading: isLoadingMembers } = useCollection<BarMember>(membersQuery);

  React.useEffect(() => {
    if (isLoadingMembers) {
        setIsLoadingProfiles(true);
        return;
    }
    if (!members || !firestore) {
      setIsLoadingProfiles(false);
      setStaffWithProfiles([]);
      return;
    };
    
    const fetchMemberProfiles = async () => {
        setIsLoadingProfiles(true);
        try {
          const membersWithProfiles = await Promise.all(members.map(async (member) => {
              const userDocRef = doc(firestore, 'users', member.userId);
              const userDocSnap = await getDoc(userDocRef);
              
              if (userDocSnap.exists()) {
                  const userProfile = userDocSnap.data() as UserProfile;
                  return { ...member, userProfile };
              }
              // Return member even if profile not found, so they still appear in the list
              return { ...member, userProfile: { email: 'Не найден', displayName: 'Пользователь не найден' } as UserProfile };
          }));
          setStaffWithProfiles(membersWithProfiles);
        } catch (error) {
          console.error("Error fetching member profiles:", error);
          setStaffWithProfiles(members); // Fallback to members without profiles
        } finally {
          setIsLoadingProfiles(false);
        }
    }
    fetchMemberProfiles();

  }, [members, firestore, isLoadingMembers]);
  
  const isLoading = isLoadingMembers || isLoadingProfiles;

  if (isLoading || !barId) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
        <div className="flex items-center justify-between py-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Персонал</h1>
                <p className="text-muted-foreground">Управляйте командой вашего бара и их ролями.</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Пригласить сотрудника
            </Button>
        </div>
      <StaffTable staff={staffWithProfiles} barId={barId} />
      <AddStaffDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} barId={barId} />
    </>
  );
}
