import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase.ts';
import { Layout } from '../components/Layout.tsx';
import { UserProfile, UserRole } from '../types.ts';
import {
  UserPlus,
  Search,
  Mail,
  Trash2,
  Key,
  X,
  Loader2,
  Filter,
  User as UserIcon,
  Lock,
  AlertCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

const ITEMS_PER_PAGE = 10;

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function isActive(user: UserProfile): boolean {
  if (!user.last_login_at) return false;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return user.last_login_at.toDate() > thirtyDaysAgo;
}

export const AdminDashboard: React.FC = () => {
  const { getIdToken } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add User Form state
  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    password: '',
    role: 'user' as UserRole
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    setActionLoading(uid);
    setError(null);
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole
      });
      setSuccess(`Role updated for user`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (email: string) => {
    setActionLoading(email);
    setError(null);
    try {
      // We can use client SDK to send reset email if we have the email
      await sendPasswordResetEmail(auth, email);
      setSuccess(`Password reset email sent to ${email}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    setActionLoading(uid);
    setError(null);
    try {
      const token = await getIdToken();
      const response = await fetch(`/api/admin/delete-user/${uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      setSuccess('User deleted successfully');
      setShowDeleteModal(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('add-user');
    setError(null);
    try {
      const token = await getIdToken();
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccess('User created successfully');
      setShowAddModal(false);
      setNewUser({ email: '', displayName: '', password: '', role: 'user' });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to first page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter]);

  const neverLoggedIn = users.filter(u => !u.last_login_at).length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">

        {/* Notification Banner */}
        {neverLoggedIn > 0 && (
          <div className="mb-8 flex items-center justify-between p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <p className="text-sm text-slate-700 font-medium">
                You have <span className="font-bold">{neverLoggedIn}</span> user{neverLoggedIn > 1 ? 's' : ''} who {neverLoggedIn > 1 ? 'have' : 'has'} never logged in and may require attention.
              </p>
            </div>
            <button className="text-xs font-bold text-indigo-600 uppercase tracking-wider hover:underline whitespace-nowrap ml-4">
              Review
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1 block">Governance Engine</span>
            <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">User Management</h1>
            <p className="text-slate-500 mt-1">Audit, control, and provision access across the Intelligence Engine.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search accounts or emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 outline-none transition-all"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <select
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-accent-500 outline-none transition-all"
              >
                <option value="all">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Administrator</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Add User */}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-br from-accent-600 to-accent-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-sky-900/10 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Add New User
            </button>
          </div>
        </div>

        {/* Error / Success toasts */}
        {error && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg text-sm border-l-4 border-red-500 flex items-center justify-between">
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-lg text-sm border-l-4 border-emerald-500 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span>{success}</span>
            <button aria-label="Dismiss success" onClick={() => setSuccess(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">User Identity</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Permission Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Onboarding Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Last Active</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <Loader2 className="animate-spin h-8 w-8 text-accent-600 mx-auto" />
                    </td>
                  </tr>
                ) : pagedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-sm">
                      No users found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((user) => {
                    const active = isActive(user);
                    return (
                      <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors group">

                        {/* User Identity */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative flex-shrink-0">
                              <div className="w-10 h-10 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-sm border border-accent-200">
                                {getInitials(user.display_name)}
                              </div>
                              <span className={cn(
                                "absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full",
                                active ? "bg-emerald-500" : "bg-slate-300"
                              )} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold text-slate-900 truncate">{user.display_name}</span>
                              <span className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" /> {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Permission Role */}
                        <td className="px-6 py-5">
                          <select
                            aria-label={`Change role for ${user.display_name}`}
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                            disabled={actionLoading === user.uid}
                            className={cn(
                              "inline-flex items-center px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border-none outline-none cursor-pointer transition-all",
                              user.role === 'admin'
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            <option value="user">User</option>
                            <option value="admin">Administrator</option>
                          </select>
                        </td>

                        {/* Onboarding Date */}
                        <td className="px-6 py-5">
                          <span className="text-sm text-slate-500 font-medium">
                            {user.created_at?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>

                        {/* Last Active */}
                        <td className="px-6 py-5">
                          <span className="text-sm text-slate-500 font-medium">
                            {user.last_login_at
                              ? user.last_login_at.toDate().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : 'Never'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-5">
                          {active ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Inactive
                            </span>
                          )}
                        </td>

                        {/* Administrative Actions */}
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleResetPassword(user.email)}
                              disabled={actionLoading === user.email}
                              title="Reset Password"
                              className="p-2 text-slate-400 hover:text-accent-600 hover:bg-accent-50 rounded transition-all"
                            >
                              {actionLoading === user.email
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Key className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(user.uid)}
                              title="Delete User"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredUsers.length > 0 && (
            <div className="px-6 py-4 flex items-center justify-between bg-slate-50/40 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-medium">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredUsers.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <button
                  aria-label="Previous page"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center text-xs font-bold rounded transition-all",
                      page === currentPage
                        ? "bg-accent-600 text-white"
                        : "hover:bg-slate-100 text-slate-600"
                    )}
                  >
                    {page}
                  </button>
                ))}
                <button
                  aria-label="Next page"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal — Provision New Access */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100">
              <div>
                <h2 className="text-xl font-display font-bold text-slate-900 tracking-tight">Provision New Access</h2>
                <p className="text-xs text-slate-500">Enter account details and assign roles.</p>
              </div>
              <button
                aria-label="Close modal"
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-accent-500 outline-none transition-all"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Work Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-accent-500 outline-none transition-all"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Temporary Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-accent-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Role</label>
                <select
                  aria-label="Account role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                  className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-accent-500 outline-none transition-all"
                >
                  <option value="user">User (Standard Access)</option>
                  <option value="admin">Administrator (System Governance)</option>
                </select>
              </div>

              <div className="p-4 bg-indigo-50 rounded-lg flex gap-3">
                <AlertCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-700 leading-relaxed">
                  By provisioning this account, the user will be able to sign in immediately with the temporary password provided. Ensure security protocols are met.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'add-user'}
                  className="flex-1 px-6 py-2.5 bg-gradient-to-br from-accent-600 to-accent-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-sky-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === 'add-user' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">Delete User Account?</h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              This action is irreversible. The user will be permanently removed from both Authentication and the Database.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDeleteUser(showDeleteModal)}
                disabled={actionLoading === showDeleteModal}
                className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading === showDeleteModal ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Deletion'}
              </button>
              <button
                onClick={() => setShowDeleteModal(null)}
                className="w-full py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
