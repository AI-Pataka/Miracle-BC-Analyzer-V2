import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, BarChart3, ShieldCheck,
  Layers, Route, SlidersHorizontal, Zap, PanelLeftClose, PanelLeft,
  Building2, Briefcase, Globe, Menu, X, ChevronRight, Settings,
} from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export const Layout: React.FC<{
  children: React.ReactNode;
  noPadding?: boolean;
  forceCollapsed?: boolean;
  contextIndustry?: string;
  contextClient?: string;
  contextCompany?: string;
}> = ({ children, noPadding, forceCollapsed, contextIndustry, contextClient, contextCompany }) => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Use passed context props (active analysis values) with profile as fallback
  const displayIndustry = contextIndustry || profile?.industry;
  const displayClient = contextClient || profile?.client_company;
  const displayCompany = contextCompany || profile?.consultant_name;
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-collapse on small screens
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setCollapsed(true);
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Force-collapse sidebar when parent requests it (e.g. result phase needs max width)
  useEffect(() => {
    if (forceCollapsed) setCollapsed(true);
  }, [forceCollapsed]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const topNavItems = [
    { label: 'Idea Entry', path: '/idea-entry', icon: Zap, show: true },
  ];

  const configNavItems = [
    { label: 'Capabilities', path: '/capabilities', icon: Layers, show: true },
    { label: 'Journeys', path: '/journeys', icon: Route, show: true },
    { label: 'Strategy & Rules', path: '/strategy', icon: SlidersHorizontal, show: true },
    { label: 'Admin Controls', path: '/admin/dashboard', icon: ShieldCheck, show: isAdmin },
  ];

  const configPaths = ['/dashboard', '/capabilities', '/journeys', '/strategy', '/admin/dashboard'];
  const isOnConfigPath = configPaths.includes(location.pathname);
  const [configOpen, setConfigOpen] = React.useState(isOnConfigPath);

  // Auto-open config group when navigating to a config page
  React.useEffect(() => {
    if (isOnConfigPath) setConfigOpen(true);
  }, [isOnConfigPath]);

  const hasProfileSetup = displayIndustry || displayClient || displayCompany;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'bg-slate-900 text-white flex flex-col fixed inset-y-0 transition-all duration-200 z-50',
        collapsed ? 'w-16' : 'w-64',
        // Mobile: hidden by default, shown as overlay when mobileOpen
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        {/* Brand + Toggle */}
        <div className={cn('flex items-center gap-3 border-b border-slate-800', collapsed ? 'p-3 justify-center' : 'p-6')}>
          {!collapsed && (
            <>
              <div className="bg-accent-500 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-display font-bold tracking-tight flex-1">BC-Analyzer</span>
            </>
          )}
          <button
            onClick={() => { setCollapsed(c => !c); setMobileOpen(false); }}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {/* Top nav items — Dashboard, Idea Entry */}
          {topNavItems.filter(item => item.show).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg transition-colors font-medium',
                collapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3',
                location.pathname === item.path
                  ? 'bg-accent-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && item.label}
            </Link>
          ))}

          {/* Config group — collapsible when expanded, flat icons when collapsed */}
          {collapsed ? (
            // Collapsed sidebar: render Config icon + config item icons as flat icon buttons
            <>
              <Link
                to="/dashboard"
                title="Config"
                className={cn(
                  'flex items-center justify-center rounded-lg transition-colors font-medium px-3 py-3',
                  location.pathname === '/dashboard'
                    ? 'bg-accent-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                )}
              >
                <Settings className="w-5 h-5 flex-shrink-0" />
              </Link>
              {configNavItems.filter(item => item.show).map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  className={cn(
                    'flex items-center justify-center rounded-lg transition-colors font-medium px-3 py-3',
                    location.pathname === item.path
                      ? 'bg-accent-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                </Link>
              ))}
            </>
          ) : (
            // Expanded sidebar: collapsible "Config" group
            <div className="mt-1">
              {/* Config group header — links to /dashboard, with expand/collapse for sub-items */}
              <div className="flex items-center rounded-lg overflow-hidden">
                <Link
                  to="/dashboard"
                  className={cn(
                    'flex-1 flex items-center gap-3 px-4 py-2.5 transition-colors font-medium text-sm',
                    location.pathname === '/dashboard'
                      ? 'bg-accent-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                  )}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span>Config</span>
                </Link>
                <button
                  title={configOpen ? 'Collapse config menu' : 'Expand config menu'}
                  onClick={() => setConfigOpen(o => !o)}
                  className="px-2 py-2.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                >
                  <ChevronRight className={cn('w-4 h-4 transition-transform duration-150', configOpen && 'rotate-90')} />
                </button>
              </div>
              {configOpen && (
                <div className="mt-0.5 ml-3 pl-3 border-l border-slate-700 space-y-0.5">
                  {configNavItems.filter(item => item.show).map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium text-sm',
                        location.pathname === item.path
                          ? 'bg-accent-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                      )}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Context info (collapsed: hidden) */}
        {!collapsed && hasProfileSetup && (
          <div className="px-4 pb-2">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2.5 space-y-1 text-xs">
              {displayCompany && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{displayCompany}</span>
                </div>
              )}
              {displayClient && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{displayClient}</span>
                </div>
              )}
              {displayIndustry && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate">{displayIndustry}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User profile + logout */}
        <div className="p-4 border-t border-slate-800">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-sm font-bold">
                  {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.display_name}</p>
                  <p className="text-xs text-slate-400 truncate capitalize">{profile?.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full mt-2 flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-sm font-bold">
                {profile?.display_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        'flex-1 flex flex-col transition-all duration-200 h-screen',
        // Mobile: no margin (sidebar is overlay). Desktop: margin based on collapsed state
        'ml-0 md:ml-16',
        !collapsed && 'md:ml-64',
      )}>
        {/* Global Header / Grounding Bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-3 md:px-6 py-2.5 flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {hasProfileSetup ? (
            <div className="flex items-center gap-2 flex-wrap overflow-hidden">
              {profile?.consultant_name && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[100px] md:max-w-none">{profile.consultant_name}</span>
                </span>
              )}
              {profile?.client_company && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 text-xs font-medium rounded-full">
                  <Building2 className="w-3.5 h-3.5 text-sky-400" />
                  <span className="truncate max-w-[100px] md:max-w-none">{profile.client_company}</span>
                </span>
              )}
              {profile?.industry && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full hidden sm:inline-flex">
                  <Globe className="w-3.5 h-3.5 text-violet-400" />
                  {profile.industry}
                </span>
              )}
            </div>
          ) : (
            <Link
              to="/dashboard"
              className="text-xs text-accent-600 hover:text-accent-700 font-medium hover:underline"
            >
              Set up your profile to display context here
            </Link>
          )}
        </div>

        {/* Page content — scrollable area */}
        <div className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden',
          noPadding ? '' : 'p-4 md:p-6 lg:p-8',
        )}>
          {children}
        </div>
      </main>
    </div>
  );
};
