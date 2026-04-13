import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import { BarChart3, Mail, Lock, Loader2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      const role = userDoc.data()?.role;
      navigate(role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (err: any) {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          display_name: user.displayName || 'Google User',
          role: 'user',
          created_at: serverTimestamp(),
          last_login_at: serverTimestamp(),
        });
      }
      const role = userDoc.exists() ? userDoc.data()?.role : 'user';
      navigate(role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto bg-accent-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <BarChart3 className="text-white w-8 h-8" />
          </div>
          <h2 className="text-3xl font-display font-bold text-slate-900">Welcome Back</h2>
          <p className="mt-2 text-slate-600">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 text-green-600 p-4 rounded-lg text-sm border border-green-100">
            {message}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent outline-none transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-accent-600 font-bold hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-600 hover:bg-accent-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebase/builtins/pixie/images/grey_google_logo.svg" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
            Sign in with Google
          </button>

          <p className="text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-600 font-bold hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
