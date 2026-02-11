import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminCheck(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    const check = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!error && !!data);
      setIsLoading(false);
    };

    check();
  }, [userId]);

  return { isAdmin, isLoading };
}
