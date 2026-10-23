import React from 'react';
import {
  RefreshCw,
  Clock,
  Shield,
  WifiOff,
  Radio,
  LayoutDashboard,
  Settings,
  Star,
  LogIn,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function NavButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={active
        ? 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white text-slate-900 shadow-sm'
        : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900'}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function StatusHeader({
  productName = 'EduNetGuard',
  tagline = 'Network Continuity & Service Assurance',
  organizationName = 'Network Operations',
  lastUpdated,
  onRefresh,
  refreshing,
  connected,
  currentView = 'dashboard',
  onNavigate,
  user,
  onSignIn,
  onLogout,
}) {
  return (
    <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-slate-950 rounded-2xl shadow-sm flex items-center justify-center flex-none border border-slate-800">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-950">{productName}</h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase tracking-[0.12em]">
                  Continuity Console
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 truncate">{organizationName} · {tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center p-1 rounded-xl border border-slate-200 bg-slate-50">
              <NavButton
                active={currentView === 'dashboard'}
                onClick={() => onNavigate?.('dashboard')}
                icon={LayoutDashboard}
                label="Dashboard"
              />
              {user && (
                <NavButton
                  active={currentView === 'me'}
                  onClick={() => onNavigate?.('me')}
                  icon={Star}
                  label="My Dashboard"
                />
              )}
              {user?.role === 'admin' && (
                <NavButton
                  active={currentView === 'admin'}
                  onClick={() => onNavigate?.('admin')}
                  icon={Settings}
                  label="Admin"
                />
              )}
            </div>

            <div className={connected
              ? 'hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-slate-50 text-slate-600 border-slate-200'}>
              {connected ? <Radio className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {connected ? 'Live telemetry' : 'Telemetry unavailable'}
            </div>

            {lastUpdated && (
              <div className="hidden 2xl:flex text-xs text-slate-500 items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Synced {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
              </div>
            )}

            {user ? (
              <div className="flex items-center gap-1">
                <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">
                  <UserCircle className="w-4 h-4" />
                  {user.username}
                </div>
                <button
                  onClick={onLogout}
                  className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-2.5 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50 border border-transparent hover:border-slate-200"
              title="Refresh infrastructure status"
              aria-label="Refresh infrastructure status"
            >
              <RefreshCw className={refreshing ? 'w-5 h-5 animate-spin' : 'w-5 h-5'} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default StatusHeader;
