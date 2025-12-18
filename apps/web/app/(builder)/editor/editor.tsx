"use client";

import ChaiBuilder, { getSupabaseClient } from "@chaibuilder/nextjs";
import "@chaibuilder/nextjs/builder-styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useCallback, useEffect, useState } from "react";
import { LoginScreen } from "./login";

type LoggedInUser = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  metadata?: Record<string, any>;
};

const supabase = getSupabaseClient();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
    },
  },
});

export default function Editor() {
  const [isLoggedIn, setIsLoggedIn] = useState<null | boolean>(null);
  const [user, setUser] = useState<LoggedInUser | null>(null);

  useEffect(() => {
    // Check initial session
    const checkInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.name,
          role: session.user.user_metadata.role,
        } as LoggedInUser);
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    };

    checkInitialSession();

    // Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (user?.id && session?.user) {
        //already logged in
        return;
      }
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata.name,
          role: session.user.user_metadata.role,
        } as LoggedInUser);
        setIsLoggedIn(true);
      } else {
        setUser(null);
        setIsLoggedIn(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const getAccessToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token as string;
  }, []);

  const getPreviewUrl = useCallback((slug: string) => `/api/preview?slug=${slug}`, []);
  const getLiveUrl = useCallback((slug: string) => `/api/preview?disable=true&slug=${slug}`, []);

  if (isLoggedIn === null) {
    return null;
  }

  if (!isLoggedIn) {
    return <LoginScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ChaiBuilder
        currentUser={user}
        autoSave
        autoSaveActionsCount={5}
        getAccessToken={getAccessToken}
        hasReactQueryProvider
        apiUrl="api"
        getPreviewUrl={getPreviewUrl}
        getLiveUrl={getLiveUrl}
        websocket={supabase}
        onLogout={handleLogout}
      />
    </QueryClientProvider>
  );
}
