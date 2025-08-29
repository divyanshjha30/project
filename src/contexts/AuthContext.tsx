import React, { createContext, useContext, useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { User } from "../types";
import toast from "react-hot-toast";

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearStorage: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      // First try to get existing profile
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (existingUser && !fetchError) {
        return existingUser;
      }

      // If user doesn't exist, create profile from auth user
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) return null;

      const newUser = {
        id: authUser.user.id,
        email: authUser.user.email!,
        username: authUser.user.email!.split("@")[0],
        display_name:
          authUser.user.user_metadata?.display_name ||
          authUser.user.email!.split("@")[0],
        avatar_url: authUser.user.user_metadata?.avatar_url || null,
        chip_balance: 10000,
        total_games: 0,
        games_won: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdUser, error: createError } = await supabase
        .from("users")
        .insert([newUser])
        .select()
        .single();

      if (createError) {
        console.error("Error creating user profile:", createError);
        return null;
      }

      return createdUser;
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      return null;
    }
  };

  const refreshUser = async () => {
    if (supabaseUser) {
      const userProfile = await fetchUserProfile(supabaseUser.id);
      setUser(userProfile);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;

      if (session?.user) {
        setSupabaseUser(session.user);
        const userProfile = await fetchUserProfile(session.user.id);
        if (isMounted) {
          setUser(userProfile);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        setSupabaseUser(session.user);
        // Only fetch profile if we don't already have one for this user
        if (!user || user.id !== session.user.id) {
          const userProfile = await fetchUserProfile(session.user.id);
          if (isMounted) {
            setUser(userProfile);
          }
        }
      } else if (event === "SIGNED_OUT") {
        setSupabaseUser(null);
        setUser(null);
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Keep empty dependency array - we only want this to run once

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return false;
      }

      if (data.user) {
        // Wait for the user profile to load
        const userProfile = await fetchUserProfile(data.user.id);
        if (userProfile) {
          setSupabaseUser(data.user);
          setUser(userProfile);
          toast.success("Signed in successfully!");
          setLoading(false);
          return true;
        } else {
          toast.error("Failed to load user profile");
          setLoading(false);
          return false;
        }
      }

      setLoading(false);
      return false;
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("An unexpected error occurred");
      setLoading(false);
      return false;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ): Promise<boolean> => {
    try {
      setLoading(true);

      // First, sign up with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email,
          password,
        }
      );

      if (signUpError) {
        toast.error(signUpError.message);
        setLoading(false);
        return false;
      }

      if (!authData.user) {
        toast.error("Failed to create account");
        setLoading(false);
        return false;
      }

      console.log(
        "User created in auth, creating profile for ID:",
        authData.user.id
      );

      // Wait a moment for auth to fully process
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create user profile
      const userProfile = {
        id: authData.user.id,
        email,
        username,
        display_name: displayName,
        chip_balance: 10000, // Starting chips
        role: "user" as const,
        total_games: 0,
        games_won: 0,
        games_lost: 0,
      };

      console.log("Attempting to create user profile:", userProfile);

      const { data: createdProfile, error: profileError } = await supabase
        .from("users")
        .insert(userProfile)
        .select()
        .single();

      if (profileError) {
        console.error("Error creating user profile:", profileError);
        console.error("Profile error details:", {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
        });
        toast.error(`Profile setup failed: ${profileError.message}`);
        setLoading(false);
        return false;
      }

      console.log("User profile created successfully:", createdProfile);

      // Set the user profile in state
      setSupabaseUser(authData.user);
      setUser(createdProfile);

      toast.success("Account created successfully!");
      setLoading(false);
      return true;
    } catch (error) {
      console.error("Unexpected error during sign up:", error);
      toast.error("An unexpected error occurred");
      setLoading(false);
      return false;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Signed out successfully!");
      setUser(null);
      setSupabaseUser(null);
    }
  };

  const clearStorage = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();

      // Clear local state
      setUser(null);
      setSupabaseUser(null);
      setLoading(false);

      // Clear all browser storage
      localStorage.clear();
      sessionStorage.clear();

      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie =
          name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });

      toast.success("Storage cleared successfully!");

      // Force reload the page
      window.location.reload();
    } catch (error) {
      console.error("Error clearing storage:", error);
      toast.error("Error clearing storage");
    }
  };

  const value = {
    user,
    supabaseUser,
    signIn,
    signUp,
    signOut,
    clearStorage,
    loading,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
