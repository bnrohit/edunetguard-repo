import React, { useEffect, useState } from 'react';
import axios from 'axios';
import JoinCodePanel from './JoinCodePanel';
import {
  Activity,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Gauge,
  Monitor,
  Radio,
  Server,
  ShieldCheck,
  AlertTriangle,
  Users,
  Wrench,
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function AdminMetric({ icon: Icon, label, value, helper, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={'p-2.5 rounded-xl ' + (tones[tone] || tones.slate)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function AdminConsole({
  productName = 'EduNetGuard',
  status,
  health,
  config,
  adminUrl,
  onBack,
}) {
  const [users, setUsers] = useState([]);
  const [usersError, setUsersError] = useState('');

  useEffect(() => {
    let cancelled = false;

    axios.get(API_BASE + '/auth/users', { withCredentials: true, timeout: 5000 })
      .then((response) => {
        if (!cancelled) {
          setUsers(response.data.users || []);
          setUsersError('');
        }
      })
      .catch((error) => {
        if (!cancelled) setUsersError(error.response?.data?.error || 'Unable to load user accounts.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const services = status?.services || [];
  const summary = status?.summary || {};
  const connected = health?.monitoring_engine === 'connected' && Boolean(status?.source?.connected);
  const alerts = Number(summary.attention ?? services.filter((s) => ['down', 'pending'].includes(s.status)).length);
  const maintenance = Number(summary.maintenance ?? services.filter((s) => s.status === 'maintenance').length);
  const average = Number(summary.average_response_ms);
  const adminEnabled = config?.admin?.enabled !== false;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-6">
      <section className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to dashboard
            </button>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-blue-300">{productName} Administration</p>
            <h2 className="mt-2 text-3xl font-bold">Operations Admin Console</h2>
            <p className="mt-2 text-slate-300 max-w-2xl">
              Review monitoring health, user accounts, service state and operational readiness from the branded console.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 min-w-[260px]">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Monitoring engine</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={'w-2.5 h-2.5 rounded-full ' + (connected ? 'bg-emerald-400' : 'bg-red-400')} />
              <span className="font-semibold">{connected ? 'Connected' : 'Needs attention'}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              API {health?.status === 'healthy' ? 'healthy' : 'status unavailable'} · EduNetGuard {health?.version || 'v0.4.0'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <AdminMetric icon={Monitor} label="Monitors" value={services.length} helper="Checks visible to the continuity console" tone="blue" />
        <AdminMetric
          icon={alerts ? AlertTriangle : CheckCircle}
          label="Needs Attention"
          value={alerts}
          helper={alerts ? 'Down or checking services' : 'No active service alerts'}
          tone={alerts ? 'red' : 'green'}
        />
        <AdminMetric icon={Wrench} label="Maintenance" value={maintenance} helper="Services in planned maintenance" tone={maintenance ? 'amber' : 'slate'} />
        <AdminMetric
          icon={Gauge}
          label="Average Response"
          value={Number.isFinite(average) ? average.toFixed(1) + ' ms' : '—'}
          helper="Latest response-time samples"
          tone="green"
        />
        <AdminMetric icon={Users} label="User Accounts" value={users.length} helper="EduNetGuard dashboard accounts" tone="blue" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-950">Monitor Management</h3>
              <p className="text-sm text-slate-500">Add monitors, edit checks, maintenance windows and notification settings.</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              The monitor editor keeps its own administrator login. EduNetGuard does not store that password.
              Current engine builds support newer monitor types such as SFTP and NTP plus expanded notification providers.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {adminEnabled ? (
              <a
                href={adminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                <ExternalLink className="w-4 h-4" />
                Open Monitor Management
              </a>
            ) : (
              <span className="text-sm text-slate-500">Monitor Management is disabled in configuration.</span>
            )}
            <span className="text-xs text-slate-400">{adminUrl}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-950">Platform Status</h3>
          </div>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">EduNetGuard API</span>
              <span className={health?.status === 'healthy' ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>
                {health?.status === 'healthy' ? 'Healthy' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Monitoring Engine</span>
              <span className={connected ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Live Telemetry</span>
              <span className={status?.source?.connected ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                {status?.source?.connected ? 'Active' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Account Store</span>
              <span className={usersError ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-700'}>
                {usersError ? 'Check required' : 'Available'}
              </span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-400">
            <Radio className="w-4 h-4 mt-0.5 flex-none" />
            <span>Users receive personal dashboards. Only accounts created with the administrator join code can access this console.</span>
          </div>
        </div>
      </section>

      <JoinCodePanel />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-slate-500" />
          <div>
            <h3 className="font-bold text-slate-950">EduNetGuard Accounts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Normal-user join codes are revealed only after admin password verification. Administrator-registration codes remain hidden.</p>
          </div>
        </div>

        {usersError ? (
          <div className="p-6 text-sm text-amber-700 bg-amber-50">{usersError}</div>
        ) : users.length ? (
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <div key={user.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{user.username}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Created {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'unknown'}
                  </p>
                </div>
                <span className={user.role === 'admin'
                  ? 'px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200'
                  : 'px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-50 text-slate-600 border-slate-200'}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">No EduNetGuard accounts have been created yet.</div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold text-slate-950">Account security</h3>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          User passwords are stored as salted scrypt hashes. Login sessions use signed HttpOnly cookies.
          Rotate the shared user join code if it is disclosed, and keep the administrator join code separate.
        </p>
      </section>
    </main>
  );
}

export default AdminConsole;
