'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { BarMember, UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { StaffTable } from '@/components/staff/staff-table';

export default function StaffPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  const [staffWithProfiles, setStaffWithProfiles] = React.useState<BarMember[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = React.useState(true);

  const membersQuery = useMemoFirebase(() => 
    firestore && barId ? collection(firestore, 'bars', barId, 'members') : null,
    [firestore, barId]
  );
  
  const { data: members, isLoading: isLoadingMembers } = useCollection<BarMember>(membersQuery);

  React.useEffect(() => {
    if (isLoadingMembers || !members || !firestore) {
      if (!isLoadingMembers) setIsLoadingProfiles(false);
      return;
    }

    if (members.length === 0) {
        setStaffWithProfiles([]);
        setIsLoadingProfiles(false);
        return;
    }
    
    const fetchMemberProfiles = async () => {
        setIsLoadingProfiles(true);
        try {
            const userIds = members.map(m => m.userId);
            if (userIds.length === 0) {
                setStaffWithProfiles([]);
                setIsLoadingProfiles(false);
                return;
            }

            // Firestore 'in' query is limited to 30 items per query.
            // We chunk the userIds to handle more than 30 staff members.
            const chunks = [];
            for (let i = 0; i < userIds.length; i += 30) {
                chunks.push(userIds.slice(i, i + 30));
            }

            const profilePromises = chunks.map(chunk => 
                getDocs(query(collection(firestore, 'users'), where('id', 'in', chunk)))
            );

            const snapshotResults = await Promise.all(profilePromises);
            const profilesMap = new Map<string, UserProfile>();
            snapshotResults.forEach(snapshot => {
                snapshot.docs.forEach(doc => {
                    profilesMap.set(doc.id, doc.data() as UserProfile);
                });
            });

            const membersWithProfiles = members.map(member => {
                const userProfile = profilesMap.get(member.userId);
                return { 
                    ...member, 
                    userProfile: userProfile || { email: 'Не найден', displayName: 'Пользователь не найден' } as UserProfile
                };
            });

            setStaffWithProfiles(membersWithProfiles);
        } catch (error) {
          console.error("Error fetching member profiles:", error);
          setStaffWithProfiles(members); // Fallback to members without profiles
        } finally {
          setIsLoadingProfiles(false);
        }
    };
    
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
    <StaffTable staff={staffWithProfiles} barId={barId} />
  );
}
