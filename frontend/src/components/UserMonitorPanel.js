import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clipboard,
  Clock3,
  Globe2,
  PauseCircle,
  Pencil,
  PlayCircle,
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
    paused: 'bg-slate-50 text-slate-600 border-slate-200',
  }[status] || 'bg-slate-50 text-slate-600 border-slate-200';
}

function cubeClasses(state) {
  return {
    healthy: 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50',
    down: 'border-red-300 bg-red-50 hover:bg-red-100/70',
    attention: 'border-amber-200 bg-amber-50/70 hover:bg-amber-50',
    empty: 'border-slate-200 bg-white hover:bg-slate-50',
  }[state] || 'border-slate-200 bg-white hover:bg-slate-50';
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
    site: initial?.site || 'My Organization',
    type: initial?.type || 'http',
    target: initial?.target || '',
    port: initial?.port || '',
    intervalSeconds: initial?.intervalSeconds || 60,
    timeoutSeconds: initial?.timeoutSeconds || policy?.defaultTimeoutSeconds || 10,
    notes: initial?.notes || '',
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
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Smart Monitoring</p>
            <h3 className="text-2xl font-bold text-slate-950 mt-2">{editing ? 'Edit monitor' : 'Add a device or service'}</h3>
            <p className="text-sm text-slate-500 mt-1">
              Keep setup simple. EduNetGuard will identify the device after it is added.
            </p>
          </div>
          <button onClick={onClose} disabled={saving} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Friendly name</span>
              <input
                value={form.name}
                onChange={(event) => update('name', event.target.value)}
                required
                maxLength={80}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="SSC Core Switch"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">Site / organization</span>
              <input
                value={form.site}
                onChange={(event) => update('site', event.target.value)}
                required
                maxLength={60}
                className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="SSC"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">What should EduNetGuard check?</span>
            <select
              value={form.type}
              onChange={(event) => update('type', event.target.value)}
              className="mt-1.5 w-full h-11 rounded-xl border border-slate-200 px-3 bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            >
              <option value="http">Website / HTTP(S)</option>
              <option value="ping">Device / IP availability</option>
              <option value="tcp">TCP service / port</option>
              <option value="dns">DNS resolution</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">IP, hostname, or URL</span>
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
              <span className="text-sm font-semibold text-slate-700">Check every</span>
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
              <span className="text-sm font-semibold text-slate-700">Give up after</span>
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

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Notes <span className="font-normal text-slate-400">(optional)</span></span>
            <textarea
              value={form.notes}
              onChange={(event) => update('notes', event.target.value)}
              maxLength={300}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              placeholder="Example: MDF rack 2, uplink to core..."
            />
          </label>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
            After save, EduNetGuard automatically checks DNS and service hints. For approved private targets it also runs a small single-host service fingerprint to identify the likely device type. It does not sweep the network.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving & checking…' : editing ? 'Save Changes' : 'Add & Identify'}
          </button>
        </form>
      </div>
    </div>
  );
}

function HistoryStrip({ history = [] }) {
  const points = history.slice(-20);
  if (!points.length) return <span className="text-xs text-slate-400">No history yet</span>;

  return (
    <div className="flex items-center gap-1" title="Recent checks">
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

function DeviceDetail({ monitor, workingId, onAction, onEdit, onClose }) {
  const profile = monitor.deviceProfile;
  const discovery = monitor.discovery;
  const guidance = monitor.guidance;
  const [copied, setCopied] = useState(false);

  const copyAdminMessage = async () => {
    if (!guidance?.adminMessage) return;
    try {
      await navigator.clipboard.writeText(guidance.adminMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[104] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[94vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={'px-2.5 py-1 rounded-full text-xs font-semibold border ' + statusClasses(monitor.enabled === false ? 'paused' : monitor.status)}>
                {monitor.enabled === false ? 'Paused' : monitor.status === 'up' ? 'Up' : monitor.status === 'down' ? 'Down' : 'Checking'}
              </span>
              <span className="text-xs text-slate-500">{monitor.site}</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-950 mt-2">{monitor.name}</h3>
            <p className="text-sm text-slate-500 mt-1 break-all">{monitor.target}{monitor.port ? ':' + monitor.port : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">Identified as</p>
              <p className="font-bold text-slate-950 mt-2">{profile?.label || 'Discovering device…'}</p>
              <p className="text-xs text-slate-500 mt-1">
                {[profile?.vendor, profile?.model].filter(Boolean).join(' · ') || (profile ? profile.confidence + ' confidence' : 'Automatic discovery pending')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">Resolved IP</p>
              <p className="font-bold text-slate-950 mt-2">{discovery?.resolvedIp || '—'}</p>
              <p className="text-xs text-slate-500 mt-1">{discovery?.reverseDns?.[0] || 'No reverse DNS name found'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">Last response</p>
              <p className="font-bold text-slate-950 mt-2">
                {monitor.lastResult?.responseTimeMs != null ? monitor.lastResult.responseTimeMs + ' ms' : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">{monitor.lastResult?.message || 'No result yet'}</p>
            </div>
          </section>

          {monitor.status === 'down' && guidance && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-none" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-red-900">{guidance.headline}</h4>
                  <p className="text-sm text-red-800 mt-1">Do these checks in order. Stop when you find the problem.</p>
                  <ol className="mt-4 space-y-2">
                    {(guidance.suggestions || []).map((item, index) => (
                      <li key={item} className="flex gap-3 text-sm text-slate-800">
                        <span className="w-6 h-6 rounded-full bg-white border border-red-200 text-red-700 font-bold flex items-center justify-center flex-none">
                          {index + 1}
                        </span>
                        <span className="pt-0.5">{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          )}

          {guidance?.adminMessage && (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">What to tell the admin / team</p>
                  <p className="text-sm text-slate-700 mt-2">{guidance.adminMessage}</p>
                </div>
                <button
                  onClick={copyAdminMessage}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 flex-none"
                >
                  <Clipboard className="w-4 h-4" />
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-400 font-bold">Discovery facts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(discovery?.openPorts || []).length ? discovery.openPorts.map((item) => (
                <span key={item.port} className="px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-600">
                  {item.port}/{item.protocol} {item.service}{item.product ? ' · ' + item.product : ''}
                </span>
              )) : (
                <span className="text-sm text-slate-500">{discovery ? 'No common management/service ports identified.' : 'Discovery is still pending.'}</span>
              )}
            </div>
            {discovery?.web?.map((item) => (
              <div key={item.port} className="mt-3 text-xs text-slate-500">
                Port {item.port}: {[item.title, item.server, item.certificate?.subject].filter(Boolean).join(' · ') || 'Web service responded'}
              </div>
            ))}
          </section>

          <section className="rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <HistoryStrip history={monitor.history} />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onAction(monitor.id, 'discover')}
                  disabled={workingId === monitor.id}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <RefreshCw className={'w-4 h-4 ' + (workingId === monitor.id ? 'animate-spin' : '')} />
                  Identify Again
                </button>
                <button
                  onClick={() => onAction(monitor.id, 'check')}
                  disabled={workingId === monitor.id || monitor.enabled === false}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Activity className="w-4 h-4" />
                  Check Now
                </button>
                <button onClick={() => onEdit(monitor)} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onAction(monitor.id, 'toggle')}
                  disabled={workingId === monitor.id}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  title={monitor.enabled === false ? 'Resume' : 'Pause'}
                >
                  {monitor.enabled === false ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => onAction(monitor.id, 'delete')}
                  disabled={workingId === monitor.id}
                  className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {monitor.notes && (
            <section className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">Notes:</span> {monitor.notes}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SiteDetail({ site, monitors, onClose, onSelect }) {
  const ordered = [...monitors].sort((a, b) => {
    const rank = { down: 0, pending: 1, up: 2 };
    const aRank = a.enabled === false ? 3 : (rank[a.status] ?? 4);
    const bRank = b.enabled === false ? 3 : (rank[b.status] ?? 4);
    return aRank - bRank || a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 z-[103] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-4xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[94vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Site / Organization</p>
            <h3 className="text-2xl font-bold text-slate-950 mt-1">{site}</h3>
            <p className="text-sm text-slate-500 mt-1">{monitors.length} monitored device{monitors.length === 1 ? '' : 's'} · failures shown first</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {ordered.map((monitor) => (
            <button
              key={monitor.id}
              onClick={() => onSelect(monitor)}
              className={'text-left rounded-2xl border p-4 transition-all hover:shadow-md ' +
                (monitor.enabled === false
                  ? 'border-slate-200 bg-slate-50'
                  : monitor.status === 'down'
                    ? 'border-red-200 bg-red-50'
                    : monitor.status === 'up'
                      ? 'border-emerald-200 bg-emerald-50/60'
                      : 'border-amber-200 bg-amber-50/60')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-950 truncate">{monitor.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{monitor.deviceProfile?.label || typeLabel(monitor.type)}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{monitor.discovery?.resolvedIp || monitor.target}</p>
                </div>
                <span className={'px-2 py-1 rounded-full text-[11px] font-semibold border ' + statusClasses(monitor.enabled === false ? 'paused' : monitor.status)}>
                  {monitor.enabled === false ? 'Paused' : monitor.status === 'up' ? 'Up' : monitor.status === 'down' ? 'Down' : 'Checking'}
                </span>
              </div>
              {monitor.status === 'down' && monitor.guidance?.suggestions?.[0] && (
                <p className="text-xs text-red-700 mt-3 line-clamp-2">First check: {monitor.guidance.suggestions[0]}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserMonitorPanel() {
  const [monitors, setMonitors] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [formMonitor, setFormMonitor] = useState(undefined);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedMonitor, setSelectedMonitor] = useState(null);
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
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedMonitor) {
      const fresh = monitors.find((item) => item.id === selectedMonitor.id);
      if (fresh) setSelectedMonitor(fresh);
    }
  }, [monitors]);

  const sites = useMemo(() => {
    const map = {};
    monitors.forEach((monitor) => {
      const site = monitor.site || 'My Organization';
      if (!map[site]) map[site] = [];
      map[site].push(monitor);
    });

    return Object.entries(map)
      .map(([name, items]) => {
        const active = items.filter((item) => item.enabled !== false);
        const down = active.filter((item) => item.status === 'down').length;
        const pending = active.filter((item) => item.status === 'pending').length;
        const up = active.filter((item) => item.status === 'up').length;
        const paused = items.length - active.length;
        const state = down ? 'down' : pending || paused ? 'attention' : active.length ? 'healthy' : 'empty';
        return { name, items, total: items.length, down, pending, up, paused, state };
      })
      .sort((a, b) => {
        const rank = { down: 0, attention: 1, healthy: 2, empty: 3 };
        return rank[a.state] - rank[b.state] || a.name.localeCompare(b.name);
      });
  }, [monitors]);

  const totalDown = monitors.filter((item) => item.enabled !== false && item.status === 'down').length;
  const totalUp = monitors.filter((item) => item.enabled !== false && item.status === 'up').length;
  const unidentified = monitors.filter((item) => !item.deviceProfile).length;

  const mutate = async (id, action) => {
    setWorkingId(id);
    try {
      if (action === 'check') {
        await axios.post(API_BASE + '/user-monitors/' + id + '/check', {}, { withCredentials: true, timeout: 15000 });
      } else if (action === 'discover') {
        await axios.post(API_BASE + '/user-monitors/' + id + '/discover', {}, { withCredentials: true, timeout: 30000 });
      } else if (action === 'toggle') {
        const current = monitors.find((item) => item.id === id);
        await axios.patch(API_BASE + '/user-monitors/' + id, { enabled: current?.enabled === false }, { withCredentials: true, timeout: 10000 });
      } else if (action === 'delete') {
        if (!window.confirm('Delete this personal monitor and its history?')) return;
        await axios.delete(API_BASE + '/user-monitors/' + id, { withCredentials: true, timeout: 10000 });
        if (selectedMonitor?.id === id) setSelectedMonitor(null);
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
      <div className="p-5 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-blue-700">Smart Operations</p>
          <h3 className="font-bold text-slate-950 mt-1">My network overview</h3>
          <p className="text-sm text-slate-500 mt-1">Start with the red cube. Click once to see what is down and what to do next.</p>
        </div>
        <button
          onClick={() => setFormMonitor(null)}
          disabled={Boolean(policy && monitors.length >= policy.maxPerUser)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
          Add Device / Service
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-slate-100">
        <div className="p-4 border-r border-slate-100">
          <p className="text-xs text-slate-400 font-semibold">Sites / Groups</p>
          <p className="text-2xl font-bold text-slate-950 mt-1">{sites.length}</p>
        </div>
        <div className="p-4 border-r border-slate-100">
          <p className="text-xs text-slate-400 font-semibold">Devices Up</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{totalUp}</p>
        </div>
        <div className="p-4 border-r border-slate-100">
          <p className="text-xs text-slate-400 font-semibold">Needs Attention</p>
          <p className={'text-2xl font-bold mt-1 ' + (totalDown ? 'text-red-700' : 'text-slate-950')}>{totalDown}</p>
        </div>
        <div className="p-4">
          <p className="text-xs text-slate-400 font-semibold">Identifying</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{unidentified}</p>
        </div>
      </div>

      {policy && (
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500 flex flex-wrap gap-x-5 gap-y-1">
          <span>{monitors.length}/{policy.maxPerUser} monitors used</span>
          <span>Minimum interval {policy.minIntervalSeconds}s</span>
          <span>Auto-identification {policy.autoDiscoveryEnabled ? 'on' : 'off'}</span>
        </div>
      )}

      {error && <div className="px-5 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading network overview…</div>
      ) : sites.length ? (
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((site) => (
            <button
              key={site.name}
              onClick={() => setSelectedSite(site.name)}
              className={'text-left rounded-2xl border-2 p-5 transition-all hover:shadow-md ' + cubeClasses(site.state)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Site / Organization</p>
                  <h4 className="text-xl font-bold text-slate-950 mt-1">{site.name}</h4>
                </div>
                {site.state === 'down'
                  ? <AlertTriangle className="w-6 h-6 text-red-600" />
                  : site.state === 'healthy'
                    ? <CheckCircle className="w-6 h-6 text-emerald-600" />
                    : <Clock3 className="w-6 h-6 text-amber-600" />}
              </div>

              <div className="grid grid-cols-4 gap-2 mt-5 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-950">{site.total}</p>
                  <p className="text-[10px] uppercase text-slate-400">Total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-700">{site.up}</p>
                  <p className="text-[10px] uppercase text-slate-400">Up</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-700">{site.down}</p>
                  <p className="text-[10px] uppercase text-slate-400">Down</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-700">{site.pending + site.paused}</p>
                  <p className="text-[10px] uppercase text-slate-400">Other</p>
                </div>
              </div>

              <p className={'text-sm font-semibold mt-4 ' + (site.down ? 'text-red-800' : site.state === 'healthy' ? 'text-emerald-800' : 'text-amber-800')}>
                {site.down
                  ? site.down + ' device' + (site.down === 1 ? '' : 's') + ' need attention — open now'
                  : site.state === 'healthy'
                    ? 'Everything monitored here is responding'
                    : 'Some checks are pending or paused'}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-10 text-center">
          <Server className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="font-semibold text-slate-900 mt-4">No personal monitors yet</p>
          <p className="text-sm text-slate-500 mt-1">Add one device or service; EduNetGuard will organize and identify it for you.</p>
        </div>
      )}

      {selectedSite && (
        <SiteDetail
          site={selectedSite}
          monitors={monitors.filter((item) => (item.site || 'My Organization') === selectedSite)}
          onClose={() => setSelectedSite(null)}
          onSelect={(monitor) => setSelectedMonitor(monitor)}
        />
      )}

      {selectedMonitor && (
        <DeviceDetail
          monitor={selectedMonitor}
          workingId={workingId}
          onAction={mutate}
          onEdit={(monitor) => {
            setFormMonitor(monitor);
            setSelectedMonitor(null);
          }}
          onClose={() => setSelectedMonitor(null)}
        />
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
