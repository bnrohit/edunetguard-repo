import React from 'react';
import { Activity, CheckCircle, Heart, Star, TriangleAlert } from 'lucide-react';

function StatusPill({ status }) {
  const style = {
    up: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    down: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    maintenance: 'bg-blue-50 text-blue-700 border-blue-200',
  }[status] || 'bg-slate-50 text-slate-600 border-slate-200';

  const label = {
    up: 'Operational',
    down: 'Down',
    pending: 'Checking',
    maintenance: 'Maintenance',
  }[status] || 'Unknown';

  return <span className={'px-2.5 py-1 text-xs font-semibold rounded-full border ' + style}>{label}</span>;
}

function MyDashboard({ user, services = [], onToggleFavorite, saving }) {
  const favorites = new Set((user?.preferences?.favoriteMonitorIds || []).map(String));
  const favoriteServices = services.filter((service) => favorites.has(String(service.id)));
  const problemServices = favoriteServices.filter((service) => service.status === 'down' || service.status === 'pending');
  const healthy = favoriteServices.filter((service) => service.status === 'up').length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-6">
      <section className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Personal Workspace</p>
            <h2 className="text-3xl font-bold mt-2">{user?.username}'s Dashboard</h2>
            <p className="text-slate-300 mt-2">
              Pin the services you care about and keep your operational view focused.
            </p>
          </div>
          <div className="text-sm text-slate-300">
            Signed in as <span className="font-semibold text-white">{user?.role}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <Heart className="w-5 h-5 text-blue-600" />
          <p className="text-3xl font-bold text-slate-950 mt-3">{favoriteServices.length}</p>
          <p className="text-sm text-slate-500">Pinned monitors</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <p className="text-3xl font-bold text-slate-950 mt-3">{healthy}</p>
          <p className="text-sm text-slate-500">Pinned services healthy</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <TriangleAlert className="w-5 h-5 text-amber-600" />
          <p className="text-3xl font-bold text-slate-950 mt-3">{problemServices.length}</p>
          <p className="text-sm text-slate-500">Pinned services needing attention</p>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-950">My monitored services</h3>
          <p className="text-sm text-slate-500 mt-1">
            {favoriteServices.length ? 'Your pinned services appear here.' : 'Use the stars below to build your personal dashboard.'}
          </p>
        </div>

        {favoriteServices.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {favoriteServices.map((service) => (
              <div key={service.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{service.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{service.group || 'Infrastructure Services'}</p>
                </div>
                <div className="flex items-center gap-3">
                  {Number.isFinite(Number(service.response_time_ms)) && (
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      {Math.round(Number(service.response_time_ms))} ms
                    </span>
                  )}
                  <StatusPill status={service.status} />
                  <button
                    onClick={() => onToggleFavorite(service.id)}
                    disabled={saving}
                    title="Remove from my dashboard"
                    className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50"
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-slate-500">No pinned services yet.</div>
        )}
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-950">Choose services</h3>
          <p className="text-sm text-slate-500 mt-1">Each account keeps its own favorite monitor list.</p>
        </div>
        <div className="divide-y divide-slate-100 max-h-[560px] overflow-auto">
          {services.map((service) => {
            const selected = favorites.has(String(service.id));
            return (
              <div key={service.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{service.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{service.group || 'Infrastructure Services'}</p>
                </div>
                <button
                  onClick={() => onToggleFavorite(service.id)}
                  disabled={saving}
                  className={selected
                    ? 'p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50'
                    : 'p-2.5 rounded-xl bg-slate-100 text-slate-400 hover:text-amber-600 disabled:opacity-50'}
                  title={selected ? 'Remove from my dashboard' : 'Add to my dashboard'}
                >
                  <Star className={selected ? 'w-4 h-4 fill-current' : 'w-4 h-4'} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default MyDashboard;
