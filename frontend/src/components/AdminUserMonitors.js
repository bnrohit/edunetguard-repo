import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CirclePause, CirclePlay, RefreshCw, Server, Trash2, Users } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function AdminUserMonitors() {
  const [monitors, setMonitors] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await axios.get(API_BASE + '/user-monitors/admin/all', {
        withCredentials: true,
        timeout: 8000,
      });
      setMonitors(response.data.monitors || []);
      setPolicy(response.data.policy || null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load user-owned monitors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  const grouped = useMemo(() => {
    const map = {};
    monitors.forEach((monitor) => {
      const owner = monitor.ownerUsername || 'Unknown user';
      if (!map[owner]) map[owner] = [];
      map[owner].push(monitor);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [monitors]);

  const mutate = async (monitor, action) => {
    setWorkingId(monitor.id);
    try {
      if (action === 'toggle') {
        await axios.patch(
          API_BASE + '/user-monitors/admin/' + monitor.id,
          { enabled: monitor.enabled === false },
          { withCredentials: true, timeout: 8000 }
        );
      } else if (action === 'delete') {
        if (!window.confirm('Admin delete this user-owned monitor and its history?')) return;
        await axios.delete(API_BASE + '/user-monitors/admin/' + monitor.id, {
          withCredentials: true,
          timeout: 8000,
        });
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Admin monitor action failed.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-950">User-Owned Monitors</h3>
            <p className="text-xs text-slate-500 mt-0.5">Admin oversight for monitors created from personal dashboards.</p>
          </div>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {policy && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
          {monitors.length} total personal monitors · {policy.maxPerUser} max/user · minimum {policy.minIntervalSeconds}s
        </div>
      )}

      {error && <div className="px-6 py-3 text-sm text-red-700 bg-red-50">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading personal monitors…</div>
      ) : grouped.length ? (
        <div className="divide-y divide-slate-100">
          {grouped.map(([owner, ownerMonitors]) => (
            <div key={owner} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-slate-900">{owner}</h4>
                <span className="text-xs text-slate-400">{ownerMonitors.length} monitor{ownerMonitors.length === 1 ? '' : 's'}</span>
              </div>
              <div className="space-y-2">
                {ownerMonitors.map((monitor) => (
                  <div key={monitor.id} className="rounded-xl border border-slate-200 px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-3">
                      <Server className="w-4 h-4 text-slate-400 mt-1 flex-none" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900">{monitor.name}</span>
                          <span className={'px-2 py-0.5 rounded-full text-[11px] font-semibold border ' +
                            (monitor.enabled === false
                              ? 'bg-slate-50 text-slate-500 border-slate-200'
                              : monitor.status === 'up'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : monitor.status === 'down'
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200')}>
                            {monitor.enabled === false ? 'Paused' : monitor.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 break-all">
                          {monitor.type.toUpperCase()} · {monitor.target}{monitor.port ? ':' + monitor.port : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {monitor.lastResult?.responseTimeMs != null && (
                        <span className="text-xs text-slate-400">{monitor.lastResult.responseTimeMs} ms</span>
                      )}
                      <button
                        onClick={() => mutate(monitor, 'toggle')}
                        disabled={workingId === monitor.id}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                        title={monitor.enabled === false ? 'Resume monitor' : 'Pause monitor'}
                      >
                        {monitor.enabled === false ? <CirclePlay className="w-4 h-4" /> : <CirclePause className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => mutate(monitor, 'delete')}
                        disabled={workingId === monitor.id}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"
                        title="Delete monitor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-slate-500">No users have created personal monitors yet.</div>
      )}
    </section>
  );
}

export default AdminUserMonitors;
