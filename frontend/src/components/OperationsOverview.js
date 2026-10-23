import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle,
  ChevronRight,
  Clipboard,
  Globe2,
  Monitor,
  Server,
  Shield,
  Wifi,
  X,
  XCircle,
} from 'lucide-react';

function toneForGroup(services) {
  const down = services.filter((service) => service.status === 'down').length;
  const pending = services.filter((service) => service.status === 'pending').length;
  const maintenance = services.filter((service) => service.status === 'maintenance').length;

  if (down > 0) {
    return {
      label: 'Needs attention',
      border: 'border-red-300',
      bg: 'bg-red-50',
      text: 'text-red-700',
      dot: 'bg-red-500',
    };
  }
  if (pending > 0) {
    return {
      label: 'Checking',
      border: 'border-amber-300',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
    };
  }
  if (maintenance > 0) {
    return {
      label: 'Maintenance',
      border: 'border-blue-300',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
    };
  }
  return {
    label: 'Healthy',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  };
}

function groupIcon(name) {
  const text = String(name || '').toLowerCase();
  if (text.includes('wireless') || text.includes('wifi')) return Wifi;
  if (text.includes('school') || text.includes('site') || text.includes('facility')) return Building;
  if (text.includes('web') || text.includes('internet')) return Globe2;
  if (text.includes('security')) return Shield;
  if (text.includes('server') || text.includes('virtual')) return Server;
  return Monitor;
}

function statusLabel(status) {
  return {
    up: 'Up',
    down: 'Down',
    pending: 'Checking',
    maintenance: 'Maintenance',
  }[status] || 'Unknown';
}

function statusClass(status) {
  return {
    up: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    down: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    maintenance: 'bg-blue-50 text-blue-700 border-blue-200',
  }[status] || 'bg-slate-50 text-slate-600 border-slate-200';
}

function DeviceIcon({ service }) {
  const category = String(service?.advisor?.device?.category || '').toLowerCase();
  if (category.includes('wireless')) return <Wifi className="w-5 h-5" />;
  if (category.includes('application')) return <Globe2 className="w-5 h-5" />;
  if (category.includes('network')) return <Activity className="w-5 h-5" />;
  return <Server className="w-5 h-5" />;
}

function CopyAdminNote({ note }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
    >
      <Clipboard className="w-3.5 h-3.5" />
      {copied ? 'Copied' : 'Copy admin note'}
    </button>
  );
}

function TroubleshootingCard({ service, compact = false }) {
  const guidance = service.advisor || {};
  const device = guidance.device || {};
  const steps = Array.isArray(guidance.steps) ? guidance.steps : [];
  const response = Number(service.response_time_ms);

  return (
    <div className={'rounded-2xl border ' + (service.status === 'down' ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/40')}>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={'p-2.5 rounded-xl flex-none ' + (service.status === 'down' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
              <DeviceIcon service={service} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-950">{service.name}</h4>
                <span className={'px-2.5 py-1 text-xs font-semibold rounded-full border ' + statusClass(service.status)}>
                  {statusLabel(service.status)}
                </span>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full border border-slate-200 bg-white text-slate-600">
                  {device.confidence === 'unknown' ? 'Type unknown' : 'Likely ' + (device.label || 'Infrastructure')}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-2">{guidance.impact || service.message || 'This monitor needs verification.'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                <span>{service.group || 'Infrastructure Services'}</span>
                {Number.isFinite(response) && <span>{Math.round(response)} ms</span>}
                {service.last_check && <span>Checked {new Date(service.last_check).toLocaleString()}</span>}
              </div>
            </div>
          </div>

          {guidance.admin_note && <CopyAdminNote note={guidance.admin_note} />}
        </div>

        {!compact && steps.length > 0 && (
          <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">What to check next</p>
            <ol className="mt-3 space-y-2">
              {steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-none">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCube({ name, services, onClick }) {
  const tone = toneForGroup(services);
  const Icon = groupIcon(name);
  const up = services.filter((service) => service.status === 'up').length;
  const down = services.filter((service) => service.status === 'down').length;
  const pending = services.filter((service) => service.status === 'pending').length;
  const maintenance = services.filter((service) => service.status === 'maintenance').length;

  return (
    <button
      onClick={onClick}
      className={'text-left rounded-2xl border-2 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ' + tone.border + ' ' + tone.bg}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="p-2.5 rounded-xl bg-white/80 border border-white">
          <Icon className={'w-5 h-5 ' + tone.text} />
        </div>
        <ChevronRight className={'w-5 h-5 ' + tone.text} />
      </div>

      <h3 className="font-bold text-slate-950 mt-4 truncate">{name}</h3>
      <div className="flex items-center gap-2 mt-2">
        <span className={'w-2.5 h-2.5 rounded-full ' + tone.dot} />
        <span className={'text-sm font-semibold ' + tone.text}>{tone.label}</span>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4">
        <div>
          <p className="text-xl font-bold text-slate-950">{services.length}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
        </div>
        <div>
          <p className="text-xl font-bold text-emerald-700">{up}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Up</p>
        </div>
        <div>
          <p className={'text-xl font-bold ' + (down ? 'text-red-700' : 'text-slate-400')}>{down}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Down</p>
        </div>
        <div>
          <p className={'text-xl font-bold ' + (pending || maintenance ? 'text-amber-700' : 'text-slate-400')}>{pending + maintenance}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Other</p>
        </div>
      </div>
    </button>
  );
}

function GroupDrawer({ name, services, onClose }) {
  const issues = services.filter((service) => service.status === 'down' || service.status === 'pending');
  const healthy = services.filter((service) => service.status === 'up');
  const maintenance = services.filter((service) => service.status === 'maintenance');

  const categories = useMemo(() => {
    const map = {};
    services.forEach((service) => {
      const category = service.advisor?.device?.category || 'Infrastructure';
      if (!map[category]) map[category] = [];
      map[category].push(service);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [services]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-4xl h-full bg-slate-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-5 sm:p-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">Operational Group</p>
            <h2 className="text-2xl font-bold text-slate-950 mt-1">{name}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {services.length} monitors · {issues.length} need attention · {healthy.length} healthy
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map(([category, items]) => {
              const problems = items.filter((item) => item.status === 'down' || item.status === 'pending').length;
              return (
                <div key={category} className={'rounded-2xl border p-4 ' + (problems ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50')}>
                  <p className="text-sm font-bold text-slate-900">{category}</p>
                  <p className="text-2xl font-bold mt-2 text-slate-950">{items.length}</p>
                  <p className={'text-xs mt-1 font-semibold ' + (problems ? 'text-red-700' : 'text-emerald-700')}>
                    {problems ? problems + ' need attention' : 'All healthy'}
                  </p>
                </div>
              );
            })}
          </section>

          {issues.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-950">Start here</h3>
              </div>
              <div className="space-y-3">
                {issues
                  .sort((a, b) => Number(a.status !== 'down') - Number(b.status !== 'down'))
                  .map((service) => <TroubleshootingCard key={service.id} service={service} />)}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600 flex-none" />
              <div>
                <h3 className="font-bold text-emerald-900">Nothing needs action in this group</h3>
                <p className="text-sm text-emerald-700 mt-1">All active monitors are currently healthy.</p>
              </div>
            </section>
          )}

          {(healthy.length > 0 || maintenance.length > 0) && (
            <details className="rounded-2xl border border-slate-200 bg-white">
              <summary className="cursor-pointer px-5 py-4 font-semibold text-slate-800">
                Healthy / maintenance devices ({healthy.length + maintenance.length})
              </summary>
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {[...maintenance, ...healthy].map((service) => (
                  <div key={service.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 truncate">{service.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {service.advisor?.device?.label || 'Infrastructure'} · {service.advisor?.device?.category || 'General'}
                      </p>
                    </div>
                    <span className={'px-2.5 py-1 text-xs font-semibold rounded-full border ' + statusClass(service.status)}>
                      {statusLabel(service.status)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function OperationsOverview({ services = [] }) {
  const [selectedGroup, setSelectedGroup] = useState(null);

  const groups = useMemo(() => {
    const map = {};
    services.forEach((service) => {
      const name = service.group || 'Infrastructure Services';
      if (!map[name]) map[name] = [];
      map[name].push(service);
    });

    return Object.entries(map).sort(([, a], [, b]) => {
      const score = (items) => items.reduce((total, item) => total + (item.status === 'down' ? 3 : item.status === 'pending' ? 2 : item.status === 'maintenance' ? 1 : 0), 0);
      return score(b) - score(a);
    });
  }, [services]);

  const issues = useMemo(
    () => services
      .filter((service) => service.status === 'down' || service.status === 'pending')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'down' ? -1 : 1;
        const priority = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priority[a.advisor?.device?.priority] ?? 9) - (priority[b.advisor?.device?.priority] ?? 9);
      }),
    [services]
  );

  const healthyCount = services.filter((service) => service.status === 'up').length;

  return (
    <section className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700 uppercase tracking-[0.08em]">Network Admin Overview</p>
          <h2 className="text-2xl font-bold text-slate-950 mt-1">See the problem first. Drill down only when needed.</h2>
          <p className="text-sm text-slate-500 mt-1">
            {issues.length
              ? issues.length + ' monitor' + (issues.length === 1 ? '' : 's') + ' need attention. ' + healthyCount + ' healthy monitors stay quiet.'
              : 'Everything currently monitored is healthy. No outage work is required.'}
          </p>
        </div>
        <div className={'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ' +
          (issues.length ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700')}>
          {issues.length ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {issues.length ? issues.length + ' need attention' : 'All clear'}
        </div>
      </div>

      {issues.length > 0 && (
        <div className="rounded-3xl border border-red-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 bg-red-50 border-b border-red-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-bold text-red-950">Start with these</h3>
                <p className="text-xs text-red-700 mt-0.5">Highest-impact problems are shown first.</p>
              </div>
            </div>
          </div>
          <div className="p-4 sm:p-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
            {issues.slice(0, 4).map((service) => (
              <TroubleshootingCard key={service.id} service={service} compact />
            ))}
          </div>
          {issues.length > 4 && (
            <div className="px-5 pb-4 text-xs text-slate-500">
              {issues.length - 4} additional issue{issues.length - 4 === 1 ? '' : 's'} are inside the affected group cubes below.
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(([name, groupServices]) => (
          <GroupCube
            key={name}
            name={name}
            services={groupServices}
            onClick={() => setSelectedGroup({ name, services: groupServices })}
          />
        ))}
      </div>

      {services.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Monitor className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-900 mt-4">No live monitors available</h3>
          <p className="text-sm text-slate-500 mt-1">Add monitors to the published EduNetGuard status page to populate the overview.</p>
        </div>
      )}

      {selectedGroup && (
        <GroupDrawer
          name={selectedGroup.name}
          services={selectedGroup.services}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </section>
  );
}

export default OperationsOverview;
