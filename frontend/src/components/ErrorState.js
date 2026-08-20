import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

function ErrorState({ error, onRetry }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-200">
          <WifiOff className="w-10 h-10 text-slate-500" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 mb-2">EduNetGuard</p>
        <h2 className="text-2xl font-bold text-slate-950 mb-2">Live telemetry unavailable</h2>
        <p className="text-slate-500 mb-3">
          The operations interface cannot reach its monitoring data source right now.
        </p>
        <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl px-4 py-3 mb-6 inline-block shadow-sm">
          {error}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
        >
          <RefreshCw className="w-5 h-5" />
          Retry Connection
        </button>
      </div>
    </div>
  );
}

export default ErrorState;
