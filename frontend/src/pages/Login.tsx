import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import { Loader2 } from 'lucide-react';

const AVATAR_URLS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuChLcpz1Eh1e7Fewufb3BVeZU9ddDH76VvzPZm9erjrRWvVkG741YhWB5mH5hOwPXml7zt6O3iZOxHpCYbNwOEWhgTF4BEjW5H7tbA7pxurcGhd9BlTLBDQcnKE5SSZNuiDVmCof8mBpv2XL4QtMbihaqCu5Pq9t9HJSdpGzG5JSWlCpf14NR6v61kus7qNVi493opD11VqI5Tn8k1biHKYkzvce_YtgC0PabNGWaF0iPUiqbF0bDjNlKO5TqnOM3eik1Yx5_53I08',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBnjw5v0pu1q7u85B2GhBl6wq9K4oAJWR8InBlh_g46XOXEYwP9tdnt0sxWuJIXnfTK2GSFQclg8-c9Po4MOp-KFUdLq0ZCcx7s_ptF7KPftACdApj3ZcVoWzFvL6tC30KpJcRFC5POx4N1sudGQwlSNkPXU4_S5OcRAR1bXBSFg7SUHF4-N_w6WHOezArsoDR_SZfDfjOHWC1RocL-JFRGMgRkjO5aY2h-Y8VpsPEF8XgHZsDlLA52h4sNFu9_f6zADLsGtheM-XY',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCXYCHTQOu-Z2313kEK1kOipZS-IWEK9zh2-R1_OYbDJXcui6OGRNLdW7PzQWpFLhnaKOa1zeP88zzbsuuobZJWMLzPf6FgqWEs-LjcH0poJl2-ET1gvuNwtYGauvsYEyuxSti_bCl7xVlFUmhOyRdhnIjjnhK0ynUSnn22foJrGM-qAY1VCBmQXYDAYcv_HY4Ng7-Oxm7UOdIOy7JA-65uGJwDTNp6nprbzb6SX5z1V75VlCeCu7TizBz-2Vj1pRCH6VV9ZSAwL8A',
];

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
    <div className="min-h-screen flex overflow-hidden bg-surface text-on-surface">

      {/* â”€â”€ Left Panel: Branding & Narrative â”€â”€ */}
      <section className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-16 bg-inverse-surface overflow-hidden">

        {/* Abstract architectural background */}
        <div className="absolute inset-0 z-0 opacity-40">
          <img
            alt="abstract architectural building with clean geometric lines"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB25EXELBSL7vu-iQIvsSLVQqJVHwtH4aA6tL5bE0AzQRTQQK0tKdgxkkBn6OLJ6dtC82xWyu-dZzcOVkAGyl--CLJziRhk1YOREiFQ0XOerLsSGCDVoMUpnhAihq4wx7RlNWRPdcdgImA5E8kkHQcAnDXcCe1602zYkCG3aPqg6dLthLq0Sn3N-qS4uJzey02MH6NFleGRkN7vsC6YTcXdh4LRk4AbNNuk1cqV1HZa3QXgR-Bykcc4hcY9Qo-QHZWoffDpXWeC9kU"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-inverse-surface via-inverse-surface/80 to-transparent" />
        </div>

        {/* Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded flex items-center justify-center">
              <span className="material-symbols-outlined ms-filled text-white">
                psychology
              </span>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight font-headline">BC-Analyzer</span>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-lg">
          <p className="text-primary-fixed-dim font-label text-sm tracking-[0.2em] uppercase mb-4">The Financial Architect</p>
          <h2 className="text-white text-5xl font-extrabold font-headline leading-tight mb-6">
            Precision Engineering for Wealth Analysis.
          </h2>
          <p className="text-secondary-fixed-dim text-lg leading-relaxed">
            Intelligence Hub for modern financial strategies. Leverage the power of architectural data modeling to secure your institutional future.
          </p>
        </div>

        {/* Footer Visual â€” Testimonial Glass Panel */}
        <div className="relative z-10">
          <div className="glass-panel p-6 rounded-lg inline-flex items-center gap-4">
            <div className="flex -space-x-2">
              {AVATAR_URLS.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`analyst ${i + 1}`}
                  className="w-10 h-10 rounded-full border-2 border-inverse-surface object-cover"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Trusted by 2,000+ Analysts</p>
              <p className="text-secondary-fixed-dim text-xs">Join the leading intelligence network.</p>
            </div>
          </div>
        </div>
      </section>

      {/* â”€â”€ Right Panel: Login Form â”€â”€ */}
      <main className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 bg-surface">
        <div className="w-full max-w-md">

          {/* Mobile-only brand */}
          <div className="lg:hidden flex items-center gap-2 mb-12">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="material-symbols-outlined ms-filled text-white text-lg">
                psychology
              </span>
            </div>
            <span className="text-xl font-bold text-on-surface tracking-tight font-headline">BC-Analyzer</span>
          </div>

          {/* Header */}
          <header className="mb-10">
            <p className="text-tertiary font-label text-xs font-bold tracking-widest uppercase mb-2">Welcome Back</p>
            <h1 className="text-3xl font-extrabold text-on-surface font-headline">Sign in to your account</h1>
          </header>

          {/* Error / Message banners */}
          {error && (
            <div className="mb-6 bg-error-container text-on-error-container p-4 rounded-lg text-sm border border-error/20">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-6 bg-surface-container text-on-surface p-4 rounded-lg text-sm border border-outline-variant/30">
              {message}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-outline tracking-wider uppercase font-label">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline group-focus-within:text-primary text-xl transition-colors">
                    alternate_email
                  </span>
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input-focus w-full pl-12 pr-4 py-4 bg-surface-container-low border-0 border-b-2 border-transparent transition-all duration-200 text-on-surface text-sm"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-xs font-semibold text-outline tracking-wider uppercase font-label">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-primary hover:text-primary-container uppercase tracking-tighter transition-colors font-label"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline group-focus-within:text-primary text-xl transition-colors">
                    lock
                  </span>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input-focus w-full pl-12 pr-4 py-4 bg-surface-container-low border-0 border-b-2 border-transparent transition-all duration-200 text-on-surface text-sm"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                />
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded btn-gradient text-on-primary font-bold text-sm tracking-wide uppercase shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-10">
            <div aria-hidden="true" className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant opacity-30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-label">
              <span className="bg-surface px-4 text-outline">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant font-semibold text-sm hover:bg-surface-container transition-colors duration-200 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>

          {/* Register Link */}
          <p className="mt-10 text-center text-sm text-outline font-body">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline ml-1">
              Create one
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
};
