'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<any>({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load profile when user changes
  useEffect(() => {
    if (user) {
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data));
    } else {
      setProfile(null);
    }
  }, [user]);

  // Sign Up — BingX UID is now optional
  const signUp = async (email: string, password: string, fullName: string, bingxUid?: string) => {
    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  };

  // Sign In
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  // Sign Out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('Supabase signOut error:', error);
      // Clear local state even if server-side sign out failed
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  // Update BingX UID from cabinet — validates via live BingX API referral check
  const updateBingxUid = async (bingxUid: string): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'Not authenticated.' };

    // If already linked to this user, no-op
    if (profile?.bingx_uid === bingxUid) {
      return { success: true, message: 'BingX UID already linked to your account.' };
    }

    // Check if UID is already used by another account
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('bingx_uid', bingxUid)
      .maybeSingle();

    if (existingProfile && existingProfile.id !== user.id) {
      return { success: false, message: 'This BingX UID is already linked to another account.' };
    }

    // Verify UID is a referral via live BingX API
    let apiResult: { success: boolean; message?: string };
    try {
      const res = await fetch('/api/bingx/check-referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: bingxUid }),
      });
      apiResult = await res.json();
    } catch {
      return { success: false, message: 'Failed to verify UID. Please try again.' };
    }

    if (!apiResult.success) {
      return {
        success: false,
        message: apiResult.message || 'Your UID is not in the list — try again later or text us.',
      };
    }

    // Save UID to user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ bingx_uid: bingxUid })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, message: 'Failed to link BingX UID. Please try again.' };
    }

    // Refresh profile
    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (updatedProfile) setProfile(updatedProfile);

    return { success: true, message: 'BingX UID linked successfully! Learning access unlocked.' };
  };

  // Check learning access
  const hasLearningAccess = () => {
    return !!profile?.bingx_uid;
  };

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    session,
    loading,
    profile,
    signUp,
    signIn,
    signOut,
    hasLearningAccess,
    updateBingxUid,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
