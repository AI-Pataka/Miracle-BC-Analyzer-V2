import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import { UserProfile } from '../types.ts';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  getIdToken: async () => null,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
      } else {
        // Update last login
        try {
          await updateDoc(doc(db, 'users', firebaseUser.uid), {
            last_login_at: serverTimestamp(),
          });
        } catch (e) {
          console.error("Error updating last login:", e);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const getIdToken = async () => {
    if (!user) return null;
    try {
      // Add timeout to prevent hanging indefinitely
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Token fetch timeout (10s)')), 10000)
      );
      return await Promise.race([user.getIdToken(), timeoutPromise]);
    } catch (err) {
      console.error('❌ getIdToken failed:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (!user) return;

    const unsubscribeProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching profile:", error);
        setLoading(false);
      }
    );

    return () => unsubscribeProfile();
  }, [user]);

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
