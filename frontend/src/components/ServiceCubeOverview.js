import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock3, Server, X } from 'lucide-react';

function statusStyle(status) {
  return {
    up: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    down: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    maintenance: 'bg-blue-50 text-blue-700 border-blue-200',
  }[status] || 'bg-slate-50 text-slate-600 border-slate-200';
}

function ServiceCubeOverview({ groupedServices = {} }) {
  const [selectedGroup, setSelectedGroup] = useState(null);

  const groups = useMemo(() => Object.entries(groupedServices)
    .map(([name, services]) => {
      const down = services.filter((item) => item.status === 'down').length;
      const pending = services.filter((item) => item.status === 'pending').length;
      const maintenance = services.filter((item) => item.status === 'maintenance').length;
      const up = services.filter((item) => item.status === 'up').length;
      const state = down ? 'down' : pending ? 'attention' : maintenance ? 'maintenance' : 'healthy';
      return { name, services, down, pending, maintenance, up, state };
    })
    .sort((a, b) => {
      const rank = { down: 0, attention: 1, maintenance: 2, healthy: 3 };
      return rank[a.state] - rank[b.state] || a.name.localeCompare(b.name);
    }), [groupedServices]);

  const selected = groups.find((group) => group.name === selectedGroup);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((group) => (
          <button
            key={group.name}
            onClick={() => setSelectedGroup(group.name)}
            className={
              'text-left rounded-2xl border-2 p-5 transition-all hover:shadow-md ' +
              (group.state === 'down'
                ? 'border-red-300 bg-red-50 hover:bg-red-100/70'
                : group.state === 'attention'
                  ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-50'
                  : group.state === 'maintenance'
                    ? 'border-blue-200 bg-blue-50/70 hover:bg-blue-50'
                    : 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50')
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Operational Group</p>
                <h3 className="text-xl font-bold text-slate-950 mt-1">{group.name}</h3>
              </div>
              {group.state === 'down'
                ? <AlertTriangle className="w-6 h-6 text-red-600" />
                : group.state === 'healthy'
                  ? <CheckCircle className="w-6 h-6 text-emerald-600" />
                  : <Clock3 className="w-6 h-6 text-amber-600" />}
            </div>

            <div className="grid grid-cols-4 gap-2 mt-5 text-center">
              <div>
                <p className="text-lg font-bold text-slate-950">{group.services.length}</p>
                <p className="text-[10px] uppercase text-slate-400">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-700">{group.up}</p>
                <p className="text-[10px] uppercase text-slate-400">Up</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-700">{group.down}</p>
                <p className="text-[10px] uppercase text-slate-400">Down</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-700">{group.pending + group.maintenance}</p>
                <p className="text-[10px] uppercase text-slate-400">Other</p>
              </div>
            </div>

            <p className={
              'text-sm font-semibold mt-4 ' +
              (group.down ? 'text-red-800' : group.state === 'healthy' ? 'text-emerald-800' : 'text-slate-700')
            }>
              {group.down
                ? group.down + ' service' + (group.down === 1 ? '' : 's') + ' down — open details'
                : group.pending
                  ? 'Checks still in progress'
                  : group.maintenance
                    ? 'Planned maintenance is active'
                    : 'All monitored services are responding'}
            </p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[102] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[94vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 sticky top-0 bg-white z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Operational Group</p>
                <h3 className="text-2xl font-bold text-slate-950 mt-1">{selected.name}</h3>
                <p className="text-sm text-slate-500 mt-1">Failures and pending checks are shown first.</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...selected.services]
                .sort((a, b) => {
                  const rank = { down: 0, pending: 1, maintenance: 2, up: 3 };
                  return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || String(a.name).localeCompare(String(b.name));
                })
                .map((service) => (
                  <div
                    key={service.id || service.name}
                    className={
                      'rounded-2xl border p-4 ' +
                      (service.status === 'down'
                        ? 'border-red-200 bg-red-50'
                        : service.status === 'up'
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : service.status === 'maintenance'
                            ? 'border-blue-200 bg-blue-50/60'
                            : 'border-amber-200 bg-amber-50/60')
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex items-start gap-3">
                        <Server className="w-4 h-4 text-slate-400 mt-1 flex-none" />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950 truncate">{service.name}</p>
                          {service.message && <p className="text-xs text-slate-500 mt-1">{service.message}</p>}
                          {Number.isFinite(Number(service.response_time_ms)) && (
                            <p className="text-xs text-slate-400 mt-1">{Math.round(Number(service.response_time_ms))} ms</p>
                          )}
                        </div>
                      </div>
                      <span className={'px-2 py-1 rounded-full text-[11px] font-semibold border ' + statusStyle(service.status)}>
                        {service.status === 'up' ? 'Up' : service.status === 'down' ? 'Down' : service.status}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ServiceCubeOverview;
