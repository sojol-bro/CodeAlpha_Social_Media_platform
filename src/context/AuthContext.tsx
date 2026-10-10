import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, ensureProfileInDB, clearUserProfileCache } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; username?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string; username?: string }>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: { provider: 'email' },
  user_metadata: {
    full_name: 'Elena Rostova',
    username: 'elena_rostova',
    headline: 'VP of AI Systems & Architecture at MIO Labs',
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'elena@mio.ai',
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
};

const DEMO_SESSION: Session = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6ImVsZW5hQG1pby5haSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyNTI0NjA4MDAwfQ.mio-signature-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mio-demo-refresh-token',
  user: DEMO_USER,
};

const LOCAL_AUTH_KEY = 'mio_active_session_state';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. Initial check: real Supabase session or explicitly-activated demo session
    const initAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          // Restore/sync the user's profile from Supabase on every page load
          ensureProfileInDB(data.session.user).catch(() => {});
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase auth getSession check:', err);
      }

      // Only restore a demo session if the user explicitly clicked "Sign In as Demo"
      const stored = localStorage.getItem(LOCAL_AUTH_KEY);
      if (stored === 'demo') {
        setSession(DEMO_SESSION);
        setUser(DEMO_USER);
      }
      // Otherwise leave session null → ProtectedRoute will redirect to /login

      setLoading(false);
    };

    initAuth();

    // 2. Listen to Supabase auth events
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        localStorage.setItem(LOCAL_AUTH_KEY, 'active');
        // Ensure profile exists in DB whenever a session becomes active
        ensureProfileInDB(currentSession.user).catch(() => {});
      } else {
        // Real sign-out: clear session unconditionally
        // Demo sessions are identified by 'demo' key, not 'active'
        if (localStorage.getItem(LOCAL_AUTH_KEY) !== 'demo') {
          setSession(null);
          setUser(null);
          localStorage.removeItem(LOCAL_AUTH_KEY);
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string; username?: string }> => {
    try {
      // Clear any stale profile from a previous user before loading the new one
      clearUserProfileCache();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        localStorage.setItem(LOCAL_AUTH_KEY, 'active');
        // Ensure profile row exists in DB and sync real data to localStorage
        const { username } = await ensureProfileInDB(data.user);
        return { username };
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Authentication failed' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error?: string; username?: string }> => {
    try {
      const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
          localStorage.setItem(LOCAL_AUTH_KEY, 'active');
        }
        // Create the profile row in Supabase immediately — no trigger dependency
        const { username: resolvedUsername } = await ensureProfileInDB(data.user);
        return { username: resolvedUsername };
      }
      return {};
    } catch (err: any) {
      return { error: err.message || 'Sign up failed' };
    }
  };

  const signInDemo = async () => {
    setSession(DEMO_SESSION);
    setUser(DEMO_USER);
    // Use a distinct key so we can distinguish demo from a real Supabase session
    localStorage.setItem(LOCAL_AUTH_KEY, 'demo');
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem(LOCAL_AUTH_KEY);
    // Clear the current user's scoped profile cache so the next user starts fresh
    clearUserProfileCache();
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signInDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
