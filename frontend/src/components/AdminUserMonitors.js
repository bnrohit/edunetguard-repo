import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, PauseCircle, PlayCircle, RefreshCw, Server, Trash2, Users } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function AdminUserMonitors() {
  const [monitors, setMonitors] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState('');
  const [cidrDraft, setCidrDraft] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policyMessage, setPolicyMessage] = useState('');
  const cidrEditing = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await axios.get(API_BASE + '/user-monitors/admin/all', {
        withCredentials: true,
        timeout: 8000,
      });
      setMonitors(response.data.monitors || []);
      setPolicy(response.data.policy || null);
      if (!cidrEditing.current) {
        setCidrDraft((response.data.policy?.allowedPrivateCidrs || []).join('\n'));
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load user-owned monitors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    monitors.forEach((monitor) => {
      const owner = monitor.ownerUsername || 'Unknown user';
      if (!map[owner]) map[owner] = [];
      map[owner].push(monitor);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [monitors]);

  const savePolicy = async (event) => {
    event.preventDefault();
    const cidrs = cidrDraft.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
    if (!cidrs.length && !window.confirm('Remove ALL private network approvals? All private monitors will stop checking.')) return;
    setSavingPolicy(true);
    setPolicyMessage('');
    setError('');
    try {
      const result = await axios.patch(API_BASE + '/user-monitors/admin/policy', {
        allowedPrivateCidrs: cidrs,
        password: adminPassword,
      }, { withCredentials: true, timeout: 10000 });
      setPolicy(result.data.policy);
      setCidrDraft((result.data.policy?.allowedPrivateCidrs || []).join('\n'));
      cidrEditing.current = false;
      setAdminPassword('');
      setPolicyMessage('Network permissions saved. New checks and discovery now use these CIDRs.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update CIDR policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  const mutate = async (monitor, action) => {
    setWorkingId(monitor.id);
    try {
      if (action === 'toggle') {
        await axios.patch(
          API_BASE + '/user-monitors/admin/' + monitor.id,
          { enabled: monitor.enabled === false },
          { withCredentials: true, timeout: 8000 }
        );
      } else if (action === 'discover') {
        await axios.post(API_BASE + '/user-monitors/admin/' + monitor.id + '/discover', {}, {
          withCredentials: true,
          timeout: 30000,
        });
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

      {policy && (
        <form onSubmit={savePolicy} className="px-6 py-5 border-b border-slate-200 bg-indigo-50/40 space-y-3">
          <div>
            <h4 className="font-bold text-slate-900">Network Discovery Policy · Approved CIDRs</h4>
            <p className="text-xs text-slate-600 mt-1">
              Admin-controlled allowlist for private IP monitoring, ping, and single-host Nmap identification.
              One IPv4 CIDR per line. No network sweeps. Changes are persistent in the user-data volume.
            </p>
          </div>
          <label className="block text-sm font-medium text-slate-700">
            Allowed private ranges
            <textarea
              value={cidrDraft}
              onChange={(event) => {
                cidrEditing.current = true;
                setCidrDraft(event.target.value);
                setPolicyMessage('');
              }}
              rows={3}
              spellCheck={false}
              placeholder={"10.128.0.0/16\n10.250.0.0/16"}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm"
            />
          </label>
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <label className="flex-1 text-sm font-medium text-slate-700">
              Your administrator password (required to save)
              <input
                type="password" autoComplete="current-password" required
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 bg-white"
              />
            </label>
            <button type="submit" disabled={savingPolicy}
              className="rounded-xl bg-indigo-700 text-white px-5 py-2.5 text-sm font-bold disabled:opacity-50">
              {savingPolicy ? 'Saving…' : 'Save Approved CIDRs'}
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Source: {policy.cidrPolicySource === 'admin-dashboard' ? 'Saved by administrator' : '.env initial defaults'}.
            Only private IPv4 ranges are accepted. Choose the smallest subnet needed.
          </p>
          {policyMessage && <p role="status" className="text-sm font-medium text-emerald-700">{policyMessage}</p>}
        </form>
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
                          {(monitor.site || 'My Organization') + ' · ' + (monitor.deviceProfile?.label || monitor.type.toUpperCase()) + ' · ' + monitor.target + (monitor.port ? ':' + monitor.port : '')}
                        </p>
                        {monitor.deviceProfile && (
                          <p className="text-xs text-slate-400 mt-1">
                            {[monitor.deviceProfile.vendor, monitor.deviceProfile.model, monitor.discovery?.resolvedIp].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {monitor.status === 'down' && monitor.guidance?.suggestions?.[0] && (
                          <div className="mt-2 flex items-start gap-2 text-xs text-red-700">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-none" />
                            <span>First check: {monitor.guidance.suggestions[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {monitor.lastResult?.responseTimeMs != null && (
                        <span className="text-xs text-slate-400">{monitor.lastResult.responseTimeMs} ms</span>
                      )}
                      <button
                        onClick={() => mutate(monitor, 'discover')}
                        disabled={workingId === monitor.id}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                        title="Identify device again"
                      >
                        <RefreshCw className={'w-4 h-4 ' + (workingId === monitor.id ? 'animate-spin' : '')} />
                      </button>
                      <button
                        onClick={() => mutate(monitor, 'toggle')}
                        disabled={workingId === monitor.id}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                        title={monitor.enabled === false ? 'Resume monitor' : 'Pause monitor'}
                      >
                        {monitor.enabled === false ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
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
