import React from 'react';
import { AlertTriangle, Clock, History, CheckCircle, Wrench } from 'lucide-react';

function IncidentHistory({ services = [] }) {
  const attention = services
    .filter((service) => service.status === 'down' || service.status === 'pending')
    .sort((a, b) => {
      const rank = { down: 0, pending: 1 };
      const byStatus = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
      if (byStatus !== 0) return byStatus;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  if (attention.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-900">Operations Queue</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-slate-700 font-semibold">No active service incidents</p>
          <p className="text-sm text-slate-400 mt-1">No monitored service currently requires operator attention.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div>
            <h3 className="font-semibold text-slate-900">Operations Queue</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live conditions only — no synthetic incident timestamps.</p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
          {attention.length} active
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {attention.map((service) => (
          <div key={service.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className={service.status === 'down' ? 'mt-1 p-2 rounded-lg bg-red-50' : 'mt-1 p-2 rounded-lg bg-amber-50'}>
                  {service.status === 'down'
                    ? <AlertTriangle className="w-4 h-4 text-red-600" />
                    : <Wrench className="w-4 h-4 text-amber-600" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-900">{service.name}</h4>
                    <span className={service.status === 'down'
                      ? 'px-2 py-0.5 text-xs font-semibold rounded-full bg-red-50 text-red-700 border border-red-100'
                      : 'px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-100'}>
                      {service.status === 'down' ? 'Unavailable' : 'Checking'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {service.message || 'The monitoring engine reports that this service requires attention.'}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                    <span>{service.group || 'Infrastructure Services'}</span>
                    {service.last_check && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Last observed {new Date(service.last_check).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default IncidentHistory;
