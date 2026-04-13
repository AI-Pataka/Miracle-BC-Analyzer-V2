import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase.ts';
import { Layout } from '../components/Layout.tsx';
import { UserProfile, UserRole } from '../types.ts';
import { 
  ShieldAlert, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Mail, 
  Trash2, 
  Key, 
  X, 
  Loader2, 
  Filter,
  User as UserIcon,
  Lock
} from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

export const AdminDashboard: React.FC = () => {
  const { getIdToken } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900">User Management</h1>
            <p className="text-slate-600 mt-2 text-sm md:text-base">Manage system users, roles, and access permissions.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 outline-none transition-all"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 outline-none transition-all appearance-none text-sm font-medium text-slate-700"
              >
                <option value="all">All Roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-bold transition-all shadow-sm"
            >
              <UserPlus className="w-5 h-5" />
              Add User
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 text-green-600 p-4 rounded-xl text-sm border border-green-100 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="flex justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-accent-600" />
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              No users found matching your criteria.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredUsers.map((user) => (
                <div key={user.uid} className="p-4 md:p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex flex-wrap items-start gap-4">
                    {/* User info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200 flex-shrink-0">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{user.display_name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" /> {user.email}
                        </p>
                      </div>
                    </div>

                    {/* Role + Dates + Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                        disabled={actionLoading === user.uid}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border outline-none transition-all cursor-pointer",
                          user.role === 'admin'
                            ? "bg-accent-50 text-accent-700 border-accent-100"
                            : "bg-slate-50 text-slate-600 border-slate-100"
                        )}
                      >
                        <option value="user">USER</option>
                        <option value="admin">ADMIN</option>
                      </select>
                      <span className="text-xs text-slate-400">
                        Joined {user.created_at?.toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-slate-400">
                        Last login: {user.last_login_at
                          ? user.last_login_at.toDate().toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Never'
                        }
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleResetPassword(user.email)}
                          disabled={actionLoading === user.email}
                          title="Reset Password"
                          className="p-2 text-slate-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-all"
                        >
                          {actionLoading === user.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(user.uid)}
                          title="Delete User"
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-display font-bold text-slate-900">Add New User</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({...newUser, displayName: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 outline-none transition-all"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 outline-none transition-all"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Initial Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent-500 outline-none transition-all text-sm font-medium"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'add-user'}
                  className="flex-1 px-4 py-2.5 bg-accent-600 text-white font-bold rounded-xl hover:bg-accent-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading === 'add-user' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center w-12 h-12 bg-red-50 text-red-600 rounded-xl mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 text-center">Delete User?</h3>
            <p className="text-slate-600 text-center mt-2 text-sm">
              This action is permanent. The user will be removed from both Authentication and the Database.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteModal)}
                disabled={actionLoading === showDeleteModal}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {actionLoading === showDeleteModal ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
