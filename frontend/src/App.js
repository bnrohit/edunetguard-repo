import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Wifi,
  Server,
  BookOpen,
  Building,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Monitor,
  Shield,
  Wrench,
  Radio,
} from 'lucide-react';
import StatusHeader from './components/StatusHeader';
import ServiceGroup from './components/ServiceGroup';
import IncidentHistory from './components/IncidentHistory';
import Footer from './components/Footer';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';

const API_BASE = process.env.REACT_APP_API_URL || '/api';
const REFRESH_INTERVAL = parseInt(process.env.REACT_APP_REFRESH_INTERVAL, 10) || 30000;

const iconMap = {
  wifi: Wifi,
  server: Server,
  book: BookOpen,
  building: Building,
};

function MetricCard({ label, value, helper, icon: Icon, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`p-2.5 rounded-xl border ${tones[tone] || tones.slate}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function App() {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [statusRes, configRes] = await Promise.all([
        axios.get(`${API_BASE}/status`, { timeout: 10000 }),
        axios.get(`${API_BASE}/config`, { timeout: 5000 }),
      ]);

      setStatus(statusRes.data);
      setConfig(configRes.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err.response?.data?.message || err.message || 'Unable to reach the EduNetGuard monitoring service');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingState schoolName={config?.school?.name} />;
  if (error) return <ErrorState error={error} onRetry={fetchData} schoolName={config?.school?.name} />;

  // Demo/sample payloads are never presented as production telemetry.
  const liveConnected = Boolean(status?.source?.connected) && !status?.demo_mode;
  const services = liveConnected ? (status?.services || []) : [];

  const groupedServices = {};
  services.forEach((service) => {
    const rawGroup = service.group || 'Infrastructure Services';
    const group = rawGroup.toLowerCase() === 'services' ? 'Infrastructure Services' : rawGroup;
    if (!groupedServices[group]) groupedServices[group] = [];
    groupedServices[group].push(service);
  });

  const schoolName = config?.school?.name || 'School District';
  const productName = config?.brand?.productName || 'EduNetGuard';
  const tagline = config?.brand?.tagline || 'Network Operations & Service Assurance';
  const repositoryUrl = config?.brand?.repositoryUrl || 'https://github.com/bnrohit/edunetguard-repo';
  const primaryColor = config?.theme?.primaryColor || '#2563eb';

  const operationalCount = services.filter((service) => service.status === 'up').length;
  const downCount = services.filter((service) => service.status === 'down').length;
  const maintenanceCount = services.filter((service) => service.status === 'maintenance').length;
  const attentionCount = services.filter((service) => ['down', 'pending'].includes(service.status)).length;
  const uptime = liveConnected ? Number(status?.overall?.uptime_percentage || 0).toFixed(2) : '—';

  const overallPresentation = {
    operational: {
      title: 'All monitored infrastructure operational',
      description: 'Critical district services are responding within expected operating thresholds.',
      icon: CheckCircle,
      badge: 'Operational',
      badgeClass: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
    },
    partial_outage: {
      title: 'Service degradation detected',
      description: 'One or more monitored services require operator attention.',
      icon: AlertCircle,
      badge: 'Degraded',
      badgeClass: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
    },
    major_outage: {
      title: 'Major infrastructure outage detected',
      description: 'Multiple monitored services are unavailable. Incident response is required.',
      icon: XCircle,
      badge: 'Major Outage',
      badgeClass: 'bg-red-400/15 text-red-200 border-red-400/30',
    },
    unknown: {
      title: 'Monitoring telemetry unavailable',
      description: 'EduNetGuard is waiting for a verified live monitoring source.',
      icon: Radio,
      badge: 'Telemetry Unavailable',
      badgeClass: 'bg-slate-400/15 text-slate-200 border-slate-400/30',
    },
  };

  const effectiveStatus = liveConnected ? status?.overall?.status : 'unknown';
  const overall = overallPresentation[effectiveStatus] || overallPresentation.unknown;
  const OverallIcon = overall.icon;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{`
        :root { --primary-color: ${primaryColor}; }
        .text-primary { color: ${primaryColor}; }
        .bg-primary { background-color: ${primaryColor}; }
        .border-primary { border-color: ${primaryColor}; }
        .hover\\:bg-primary:hover { background-color: ${primaryColor}; }
      `}</style>

      <StatusHeader
        productName={productName}
        tagline={tagline}
        schoolName={schoolName}
        lastUpdated={lastUpdated}
        onRefresh={fetchData}
        refreshing={refreshing}
        connected={liveConnected}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-7 space-y-7">
        <section className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 shadow-xl overflow-hidden relative">
          <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-primary opacity-20 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                <OverallIcon className="w-8 h-8" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-300">District Infrastructure Status</p>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${overall.badgeClass}`}>
                    {overall.badge}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mt-2">{overall.title}</h2>
                <p className="text-slate-300 mt-2 max-w-2xl">{overall.description}</p>
              </div>
            </div>

            <div className="lg:text-right min-w-[190px]">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Operations Telemetry</p>
              <p className="font-semibold mt-2 flex lg:justify-end items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${liveConnected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                {liveConnected ? 'Connected' : 'Unavailable'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {liveConnected ? (status?.source?.status_page_title || 'District monitoring fabric') : 'No verified live telemetry'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Active Monitors"
            value={services.length}
            helper="Across district infrastructure"
            icon={Monitor}
            tone="blue"
          />
          <MetricCard
            label="Healthy Services"
            value={operationalCount}
            helper={liveConnected ? `${services.length ? Math.round((operationalCount / services.length) * 100) : 0}% within normal thresholds` : 'Waiting for live telemetry'}
            icon={CheckCircle}
            tone={liveConnected ? 'green' : 'slate'}
          />
          <MetricCard
            label="Active Alerts"
            value={attentionCount}
            helper={maintenanceCount ? `${maintenanceCount} service${maintenanceCount === 1 ? '' : 's'} in maintenance` : attentionCount ? 'Operator attention required' : 'No active service alerts'}
            icon={attentionCount ? AlertCircle : Shield}
            tone={attentionCount ? 'red' : liveConnected ? 'green' : 'slate'}
          />
          <MetricCard
            label="24h Availability"
            value={liveConnected ? `${uptime}%` : '—'}
            helper={downCount ? `${downCount} service${downCount === 1 ? '' : 's'} currently unavailable` : 'Rolling service availability'}
            icon={Activity}
            tone={downCount ? 'amber' : liveConnected ? 'green' : 'slate'}
          />
        </section>

        {status?.incident && liveConnected && (
          <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Active Incident</p>
                <h3 className="font-bold text-slate-950 mt-1">{status.incident.title}</h3>
                {status.incident.content && <p className="text-sm text-slate-600 mt-2">{status.incident.content}</p>}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-[0.08em]">Infrastructure Health</p>
              <h2 className="text-2xl font-bold mt-1">Service assurance by operational group</h2>
              <p className="text-sm text-slate-500 mt-1">Current state, response time, and rolling 24-hour availability for monitored infrastructure.</p>
            </div>
          </div>

          <div className="space-y-5">
            {Object.entries(groupedServices).map(([groupName, groupServices]) => (
              <ServiceGroup
                key={groupName}
                name={groupName}
                services={groupServices}
                icon={iconMap[groupName.toLowerCase()] || Server}
              />
            ))}

            {services.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
                <Radio className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-semibold text-slate-900 mt-4">Live monitoring telemetry is unavailable</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
                  EduNetGuard will display infrastructure health when the configured monitoring source is connected and verified.
                </p>
              </div>
            )}
          </div>
        </section>

        {config?.display?.showIncidentHistory && liveConnected && <IncidentHistory />}
      </main>

      <Footer
        schoolName={schoolName}
        productName={productName}
        contactEmail={config?.school?.contactEmail}
        repositoryUrl={repositoryUrl}
      />
    </div>
  );
}

export default App;
