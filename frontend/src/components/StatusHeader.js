import React from 'react';
import { RefreshCw, Clock, Shield, WifiOff, Radio } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function StatusHeader({
  productName = 'EduNetGuard',
  tagline = 'Network Continuity & Service Assurance',
  organizationName = 'Network Operations',
  lastUpdated,
  onRefresh,
  refreshing,
  connected,
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

          <div className="flex items-center gap-3 sm:gap-4">
            <div className={connected
              ? 'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold bg-slate-50 text-slate-600 border-slate-200'}>
              {connected ? <Radio className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {connected ? 'Live telemetry' : 'Telemetry unavailable'}
            </div>

            {lastUpdated && (
              <div className="hidden sm:flex text-xs text-slate-500 items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Synced {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
              </div>
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
