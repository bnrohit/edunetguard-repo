import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  PauseCircle,
  PlayCircle,
  Clock3,
  Globe2,
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Trash2,
  X,
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function statusClasses(status) {
  return {
    up: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    down: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  }[status] || 'bg-slate-50 text-slate-600 border-slate-200';
}

function typeLabel(type) {
  return {
    http: 'Website',
    ping: 'Ping / IP',
    tcp: 'TCP Port',
    dns: 'DNS',
  }[type] || type;
}

function MonitorForm({ initial, policy, onClose, onSaved }) {
  const editing = Boolean(initial?.id);
  const [form, setForm] = useState({
    name: initial?.name || '',
    type: initial?.type || 'http',
    target: initial?.target || '',
    port: initial?.port || '',
    intervalSeconds: initial?.intervalSeconds || 60,
    timeoutSeconds: initial?.timeoutSeconds || policy?.defaultTimeoutSeconds || 10,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        port: form.type === 'tcp' ? Number(form.port) : null,
        intervalSeconds: Number(form.intervalSeconds),
        timeoutSeconds: Number(form.timeoutSeconds),
      };
      const response = editing
        ? await axios.patch(API_BASE + '/user-monitors/' + initial.id, payload, { withCredentials: true, timeout: 15000 })
        : await axios.post(API_BASE + '/user-monitors', payload, { withCredentials: true, timeout: 15000 });

      onSaved?.(response.data.monitor);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save monitor.');
    } finally {
      setSaving(false);
    }
  };

  const example = form.type === 'http'
    ? 'https://example.org'
    : form.type === 'tcp'
      ? '10.128.10.10'
      : form.type === 'dns'
        ? 'example.org'
        : '10.128.10.10';

  return (
    <div className="fixed inset-0 z-[105] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Personal Monitoring</p>
            <h3 className="text-2xl font-bold text-slate-950 mt-2">{editing ? 'Edit monitor' : 'Add monitor'}</h3>
            <p className="text-sm text-slate-500 mt-1">Create a monitor that belongs only to your EduNetGuard account.</p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Monitor name</span>
            <input
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              required
              maxLength={80}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="My School Website"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Monitor type</span>
            <select
              value={form.type}
              onChange={(event) => update('type', event.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            >
              <option value="http">Website / HTTP(S)</option>
              <option value="ping">Ping / IP</option>
              <option value="tcp">TCP Port</option>
              <option value="dns">DNS Resolution</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Target</span>
            <input
              value={form.target}
              onChange={(event) => update('target', event.target.value)}
              required
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder={example}
            />
          </label>

          {form.type === 'tcp' && (
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">TCP port</span>
              <input
                type="number"
                min="1"
                max="65535"
                value={form.port}
                onChange={(event) => update('port', event.target.value)}
                required
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="443"
              />
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Interval</span>
              <select
                value={form.intervalSeconds}
                onChange={(event) => update('intervalSeconds', event.target.value)}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 bg-white"
              >
                {[30, 60, 120, 300, 600, 900, 1800, 3600].filter((value) =>
                  value >= (policy?.minIntervalSeconds || 30) && value <= (policy?.maxIntervalSeconds || 86400)
                ).map((value) => (
                  <option key={value} value={value}>
                    {value < 60 ? value + ' sec' : value < 3600 ? (value / 60) + ' min' : (value / 3600) + ' hr'}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Timeout</span>
              <select
                value={form.timeoutSeconds}
                onChange={(event) => update('timeoutSeconds', event.target.value)}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 bg-white"
              >
                {[5, 10, 15, 20, 30].filter((value) => value <= (policy?.maxTimeoutSeconds || 30)).map((value) => (
                  <option key={value} value={value}>{value} sec</option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            Private/internal targets work only when your administrator has approved the corresponding CIDR ranges.
            Loopback, link-local and multicast addresses remain blocked.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving & checking…' : editing ? 'Save Changes' : 'Create Monitor'}
          </button>
        </form>
      </div>
    </div>
  );
}

function HistoryStrip({ history = [] }) {
  const points = history.slice(-24);
  if (!points.length) return <span className="text-xs text-slate-400">No history yet</span>;

  return (
    <div className="flex items-center gap-1" title="Most recent checks">
      {points.map((point, index) => (
        <span
          key={point.checkedAt + '-' + index}
          className={'w-2 h-5 rounded-sm ' + (point.status === 'up' ? 'bg-emerald-400' : 'bg-red-400')}
          title={(point.checkedAt ? new Date(point.checkedAt).toLocaleString() : '') + ' · ' + point.status}
        />
      ))}
    </div>
  );
}

function UserMonitorPanel() {
  const [monitors, setMonitors] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [formMonitor, setFormMonitor] = useState(undefined);
  const [error, setError] = useState('');

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await axios.get(API_BASE + '/user-monitors', {
        withCredentials: true,
        timeout: 8000,
      });
      setMonitors(response.data.monitors || []);
      setPolicy(response.data.policy || null);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load personal monitors.');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 15000);
    return () => clearInterval(timer);
  }, []);

  const ordered = useMemo(() => [...monitors].sort((a, b) => {
    const rank = { down: 0, pending: 1, up: 2 };
    const enabledRank = Number(a.enabled === false) - Number(b.enabled === false);
    if (enabledRank !== 0) return enabledRank;
    return (rank[a.status] ?? 9) - (rank[b.status] ?? 9) || a.name.localeCompare(b.name);
  }), [monitors]);

  const mutate = async (id, action) => {
    setWorkingId(id);
    try {
      if (action === 'check') {
        await axios.post(API_BASE + '/user-monitors/' + id + '/check', {}, { withCredentials: true, timeout: 15000 });
      } else if (action === 'toggle') {
        const current = monitors.find((item) => item.id === id);
        await axios.patch(API_BASE + '/user-monitors/' + id, { enabled: current?.enabled === false }, { withCredentials: true, timeout: 10000 });
      } else if (action === 'delete') {
        if (!window.confirm('Delete this personal monitor and its history?')) return;
        await axios.delete(API_BASE + '/user-monitors/' + id, { withCredentials: true, timeout: 10000 });
      }
      await load(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Monitor action failed.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">User-Owned Monitoring</p>
          <h3 className="font-bold text-slate-950 mt-1">My own monitors</h3>
          <p className="text-sm text-slate-500 mt-1">
            Website, Ping/IP, TCP and DNS checks owned only by your account.
          </p>
        </div>
        <button
          onClick={() => setFormMonitor(null)}
          disabled={Boolean(policy && monitors.length >= policy.maxPerUser)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          Add Monitor
        </button>
      </div>

      {policy && (
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 flex flex-wrap gap-x-5 gap-y-1">
          <span>{monitors.length}/{policy.maxPerUser} monitors used</span>
          <span>Minimum interval {policy.minIntervalSeconds}s</span>
          <span>Public targets {policy.publicTargetsAllowed ? 'allowed' : 'blocked'}</span>
          <span>{policy.allowedPrivateCidrs?.length ? 'Approved private ranges: ' + policy.allowedPrivateCidrs.join(', ') : 'Private ranges require admin approval'}</span>
        </div>
      )}

      {error && <div className="px-5 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading personal monitors…</div>
      ) : ordered.length ? (
        <div className="divide-y divide-slate-100">
          {ordered.map((monitor) => (
            <div key={monitor.id} className="p-5">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="min-w-0 flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
                    {monitor.type === 'http' ? <Globe2 className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-950">{monitor.name}</h4>
                      <span className={'px-2 py-0.5 rounded-full text-xs font-semibold border ' + statusClasses(monitor.enabled === false ? 'paused' : monitor.status)}>
                        {monitor.enabled === false ? 'Paused' : monitor.status === 'up' ? 'Up' : monitor.status === 'down' ? 'Down' : 'Checking'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200">
                        {typeLabel(monitor.type)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 break-all">
                      {monitor.target}{monitor.port ? ':' + monitor.port : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                      <span>Every {monitor.intervalSeconds}s</span>
                      {monitor.lastCheckAt && (
                        <span className="flex items-center gap-1">
                          <Clock3 className="w-3.5 h-3.5" />
                          {new Date(monitor.lastCheckAt).toLocaleString()}
                        </span>
                      )}
                      {Number.isFinite(Number(monitor.lastResult?.responseTimeMs)) && (
                        <span className="flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" />
                          {monitor.lastResult.responseTimeMs} ms
                        </span>
                      )}
                    </div>
                    {monitor.lastResult?.message && (
                      <p className="text-xs text-slate-500 mt-2">{monitor.lastResult.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <HistoryStrip history={monitor.history} />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => mutate(monitor.id, 'check')}
                      disabled={workingId === monitor.id || monitor.enabled === false}
                      title="Check now"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <RefreshCw className={'w-4 h-4 ' + (workingId === monitor.id ? 'animate-spin' : '')} />
                    </button>
                    <button
                      onClick={() => setFormMonitor(monitor)}
                      title="Edit"
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => mutate(monitor.id, 'toggle')}
                      disabled={workingId === monitor.id}
                      title={monitor.enabled === false ? 'Resume' : 'Pause'}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                    >
                      {monitor.enabled === false ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => mutate(monitor.id, 'delete')}
                      disabled={workingId === monitor.id}
                      title="Delete"
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 text-center">
          <Server className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-900 mt-4">No personal monitors yet</p>
          <p className="text-sm text-slate-500 mt-1">Add a website, IP, TCP port, or DNS name to start monitoring it.</p>
        </div>
      )}

      {formMonitor !== undefined && (
        <MonitorForm
          initial={formMonitor}
          policy={policy}
          onClose={() => setFormMonitor(undefined)}
          onSaved={() => load(true)}
        />
      )}
    </section>
  );
}

export default UserMonitorPanel;
