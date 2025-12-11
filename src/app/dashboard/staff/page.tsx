'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { BarMember, UserProfile } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { StaffTable } from '@/components/staff/staff-table';

export type StaffWithProfile = BarMember & { userProfile?: UserProfile };

export default function StaffPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const barId = user ? `bar_${user.uid}` : null;
  
  const [staffWithProfiles, setStaffWithProfiles] = React.useState<StaffWithProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const membersQuery = useMemoFirebase(() => 
    firestore && barId ? collection(firestore, 'bars', barId, 'members') : null,
    [firestore, barId]
  );
  
  const { data: members, isLoading: isLoadingMembers } = useCollection<BarMember>(membersQuery);

  React.useEffect(() => {
    // Exit if core data isn't loaded yet.
    if (isLoadingMembers || !members || !firestore) {
      if (!isLoadingMembers) setIsLoading(false);
      return;
    }

    // If there are no members, we are done.
    if (members.length === 0) {
        setStaffWithProfiles([]);
        setIsLoading(false);
        return;
    }
    
    const fetchMemberProfiles = async () => {
        setIsLoading(true);
        try {
            const userIds = members.map(m => m.userId);
            if (userIds.length === 0) {
              setStaffWithProfiles([]);
              return;
            }
            
            // Firestore 'in' query is limited to 30 items.
            // We chunk the userIds to handle more than 30 staff members efficiently.
            const chunks: string[][] = [];
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

            // Combine member data with the fetched profiles.
            const membersWithProfiles = members.map(member => ({
                ...member, 
                userProfile: profilesMap.get(member.userId),
            }));

            setStaffWithProfiles(membersWithProfiles);
        } catch (error) {
          console.error("Error fetching member profiles:", error);
          setStaffWithProfiles(members); // Fallback to members without profiles on error
        } finally {
          setIsLoading(false);
        }
    };
    
    fetchMemberProfiles();

  }, [members, firestore, isLoadingMembers]);
  
  if (isLoading || !barId) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <StaffTable staff={staffWithProfiles} barId={barId} />
    </div>
  );
}
