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
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{helper}</p>
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
      setError(err.response?.data?.message || err.message || 'Failed to connect to monitoring service');
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

  const groupedServices = {};
  const services = status?.services || [];
  services.forEach((service) => {
    const group = service.group || 'General';
    if (!groupedServices[group]) groupedServices[group] = [];
    groupedServices[group].push(service);
  });

  const schoolName = config?.school?.name || 'School District';
  const productName = config?.brand?.productName || 'EduNetGuard';
  const tagline = config?.brand?.tagline || 'K-12 Network Continuity & Infrastructure Monitoring';
  const repositoryUrl = config?.brand?.repositoryUrl || 'https://github.com/bnrohit/edunetguard-repo';
  const primaryColor = config?.theme?.primaryColor || '#2563eb';

  const operationalCount = services.filter((service) => service.status === 'up').length;
  const downCount = services.filter((service) => service.status === 'down').length;
  const maintenanceCount = services.filter((service) => service.status === 'maintenance').length;
  const attentionCount = services.filter((service) => ['down', 'pending'].includes(service.status)).length;
  const uptime = Number(status?.overall?.uptime_percentage || 0).toFixed(2);

  const overallPresentation = {
    operational: {
      title: 'Network continuity is healthy',
      description: 'Published services are reporting normal operation.',
      icon: CheckCircle,
      badge: 'Operational',
      badgeClass: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
    },
    partial_outage: {
      title: 'Service degradation detected',
      description: 'One or more monitored services need attention.',
      icon: AlertCircle,
      badge: 'Degraded',
      badgeClass: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
    },
    major_outage: {
      title: 'Major service outage detected',
      description: 'Multiple critical services are unavailable.',
      icon: XCircle,
      badge: 'Major outage',
      badgeClass: 'bg-red-400/15 text-red-200 border-red-400/30',
    },
    unknown: {
      title: 'Monitoring data is not ready',
      description: 'Publish the configured Uptime Kuma status page and add monitors.',
      icon: AlertCircle,
      badge: 'Unknown',
      badgeClass: 'bg-slate-400/15 text-slate-200 border-slate-400/30',
    },
  };

  const overall = overallPresentation[status?.overall?.status] || overallPresentation.unknown;
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
        demoMode={Boolean(status?.demo_mode)}
        connected={Boolean(status?.source?.connected)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {status?.demo_mode && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 flex-none" />
            <div>
              <p className="font-semibold text-amber-900">Demo data is currently displayed</p>
              <p className="text-sm text-amber-800 mt-1">
                {status?.warning || 'Connect and publish the EduNetGuard Uptime Kuma status page to switch to live monitoring.'}
              </p>
            </div>
          </div>
        )}

        <section className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 shadow-xl overflow-hidden relative">
          <div className="absolute -right-20 -top-24 w-72 h-72 rounded-full bg-primary opacity-20 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                <OverallIcon className="w-8 h-8" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-300">District Operations Overview</p>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${overall.badgeClass}`}>
                    {overall.badge}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mt-2">{overall.title}</h2>
                <p className="text-slate-300 mt-2 max-w-2xl">{overall.description}</p>
              </div>
            </div>

            <div className="lg:text-right">
              <p className="text-sm text-slate-400">Monitoring source</p>
              <p className="font-semibold mt-1 flex lg:justify-end items-center gap-2">
                <Monitor className="w-4 h-4" />
                {status?.source?.engine || 'EduNetGuard'}
              </p>
              {status?.source?.status_page_title && (
                <p className="text-xs text-slate-400 mt-1">{status.source.status_page_title}</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Monitored Services"
            value={services.length}
            helper="Published to EduNetGuard"
            icon={Monitor}
            tone="blue"
          />
          <MetricCard
            label="Operational"
            value={operationalCount}
            helper={`${services.length ? Math.round((operationalCount / services.length) * 100) : 0}% currently healthy`}
            icon={CheckCircle}
            tone="green"
          />
          <MetricCard
            label="Needs Attention"
            value={attentionCount}
            helper={maintenanceCount ? `${maintenanceCount} in maintenance` : 'No maintenance active'}
            icon={attentionCount ? AlertCircle : Shield}
            tone={attentionCount ? 'red' : 'green'}
          />
          <MetricCard
            label="24h Continuity"
            value={`${uptime}%`}
            helper={downCount ? `${downCount} service${downCount === 1 ? '' : 's'} down` : 'Across published monitors'}
            icon={Activity}
            tone={downCount ? 'amber' : 'green'}
          />
        </section>

        {status?.incident && (
          <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Active Incident</p>
                <h3 className="font-bold text-gray-950 mt-1">{status.incident.title}</h3>
                {status.incident.content && <p className="text-sm text-gray-600 mt-2">{status.incident.content}</p>}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-primary">NETWORK & SERVICE HEALTH</p>
              <h2 className="text-2xl font-bold mt-1">Continuity by service group</h2>
              <p className="text-sm text-gray-500 mt-1">Live status, response time, and 24-hour availability from the monitoring engine.</p>
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
              <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center shadow-sm">
                <Monitor className="w-10 h-10 text-gray-300 mx-auto" />
                <h3 className="font-semibold text-gray-900 mt-4">No published monitors found</h3>
                <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">
                  Add monitors to the Uptime Kuma status page configured for EduNetGuard, then refresh this dashboard.
                </p>
              </div>
            )}
          </div>
        </section>

        {config?.display?.showIncidentHistory && <IncidentHistory />}
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
