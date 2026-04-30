import React from 'react';
import { RefreshCw, Clock, Shield, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function StatusHeader({ schoolName, overallStatus, lastUpdated, onRefresh, refreshing, config }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{schoolName}</h1>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Service Status
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-sm text-gray-500 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</span>
              </div>
            )}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-all disabled:opacity-50"
              title="Refresh status"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default StatusHeader;
