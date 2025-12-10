
'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, doc } from 'firebase/firestore';
import type { BarMember, UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { StaffTable } from '@/components/staff/staff-table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';


export default function StaffPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  const [staff, setStaff] = React.useState<BarMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const membersQuery = useMemoFirebase(() => 
    firestore && barId ? collection(firestore, 'bars', barId, 'members') : null,
    [firestore, barId]
  );
  
  const { data: members, isLoading: isLoadingMembers } = useCollection<BarMember>(membersQuery);

  React.useEffect(() => {
    if (!members || !firestore) {
      if (!isLoadingMembers) setIsLoading(false);
      return;
    };
    
    const fetchMemberProfiles = async () => {
        setIsLoading(true);
        const membersWithProfiles = await Promise.all(members.map(async (member) => {
            const userDocRef = doc(firestore, 'users', member.userId);
            const userDoc = await getDocs(query(collection(firestore, 'users'), where('id', '==', member.userId)));
            
            if (!userDoc.empty) {
                const userProfile = userDoc.docs[0].data() as UserProfile;
                return { ...member, userProfile };
            }
            // Return member even if profile not found, so they still appear in the list
            return member;
        }));
        setStaff(membersWithProfiles);
        setIsLoading(false);
    }
    fetchMemberProfiles();

  }, [members, firestore, isLoadingMembers]);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
        <div className="flex items-center justify-between py-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Персонал</h1>
                <p className="text-muted-foreground">Управляйте командой вашего бара и их ролями.</p>
            </div>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Пригласить сотрудника
            </Button>
        </div>
      <StaffTable staff={staff} />
    </div>
  );
}
