import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Loader2 } from 'lucide-react';

export const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName });

      await setDoc(doc(db, 'users', user.uid), {
        email,
        display_name: displayName,
        role: 'user',
        created_at: serverTimestamp(),
      });

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex bg-surface font-body text-on-surface antialiased">
      {/* Left Side: Editorial Image & Brand Identity */}
      <section className="hidden lg:flex lg:w-1/2 h-full relative flex-col justify-end p-20 overflow-hidden bg-inverse-surface">
        <div className="absolute inset-0 opacity-40">
          <img
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC56Tk9qX9Q0V19e4B84XmLgCZ2sw6GwUR-Z6gdqh3sa_fLCkyFH8wTv9ydgdjxmqERjNdPcuYRmQFDdzkhNdV85g4ElAiTED8QXtW5J72YdMhxP-_Cbi-ZVvKLx61wgZML0IFGdRaVHHMzMPcKfr1qyoIGT-Ql6zRX7J2NdX2188fLnLiF4cFxcPsfV3LG6xzvcm1cEwcFuVbaCCnDsyA8UvjVI8K_WxZTNGPBLEurA8eFFV72cqJuCOTb_4S0fOpzKT4pNr3RKSA"
            alt="Modern architectural structure with clean lines and blue glass windows"
          />
        </div>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface via-transparent to-transparent" />
        <div className="relative z-10 max-w-lg">
          <div className="mb-8">
            <span className="font-label text-sm uppercase tracking-[0.2em] text-primary-fixed-dim">Intelligence Engine</span>
            <h1 className="font-headline text-5xl font-extrabold text-white leading-tight tracking-tighter mt-2">
              BC-Analyzer
            </h1>
          </div>
          <p className="text-surface-variant font-light text-lg leading-relaxed mb-12">
            The financial architect for high-precision business case analysis. Transform raw data into strategic institutional narratives.
          </p>
          <div className="flex gap-4">
            <div className="h-1 w-12 bg-primary" />
            <div className="h-1 w-4 bg-outline-variant opacity-30" />
            <div className="h-1 w-4 bg-outline-variant opacity-30" />
          </div>
        </div>
      </section>

      {/* Right Side: Register Form */}
      <main className="w-full lg:w-1/2 h-full flex items-center justify-center bg-surface relative">
        {/* Floating Abstract Geometry for Depth */}
        <div className="absolute top-[10%] right-[10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[10%] w-96 h-96 bg-tertiary/5 rounded-full blur-3xl" />

        <div className="w-full max-w-md px-8 relative z-10">
          {/* Header Group */}
          <div className="mb-12">
            <p className="font-label text-xs font-semibold uppercase tracking-widest text-on-secondary-container mb-1">Getting Started</p>
            <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight">Create your account</h2>
          </div>

          {error && (
            <div className="mb-6 bg-error-container text-on-error-container p-4 rounded-lg text-sm border border-error/20">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="full_name">
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-surface-container-low border-none focus:ring-0 focus:bg-surface-container-lowest border-b-2 border-transparent focus:border-b-primary transition-all duration-300 py-4 px-0 placeholder:text-outline/50 font-body outline-none"
                placeholder="Johnathan Archer"
              />
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-low border-none focus:ring-0 focus:bg-surface-container-lowest border-b-2 border-transparent focus:border-b-primary transition-all duration-300 py-4 px-0 placeholder:text-outline/50 font-body outline-none"
                placeholder="j.archer@enterprise.com"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-low border-none focus:ring-0 focus:bg-surface-container-lowest border-b-2 border-transparent focus:border-b-primary transition-all duration-300 py-4 px-0 placeholder:text-outline/50 font-body outline-none"
                placeholder="••••••••••••"
              />
            </div>

            {/* Terms & Privacy */}
            <div className="pt-2">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                By clicking Register, you agree to the{' '}
                <a className="text-primary font-semibold hover:underline" href="#">Terms of Service</a>
                {' '}and{' '}
                <a className="text-primary font-semibold hover:underline" href="#">Privacy Policy</a>.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-base rounded hover:shadow-lg transition-all duration-300 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register'}
              </button>
            </div>
          </form>

          {/* Sign In Link */}
          <div className="mt-12 text-center border-t border-outline-variant/10 pt-8">
            <p className="text-sm text-on-surface-variant font-body">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-bold ml-1 hover:underline">
                Sign In
              </Link>
            </p>
          </div>

          {/* Mobile Brand Anchor */}
          <div className="mt-16 lg:hidden flex justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">architecture</span>
              </div>
              <span className="font-headline font-extrabold text-on-surface tracking-tighter">BC-Analyzer</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
