import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Monitor,
  Shield,
  Wrench,
  Radio,
  Search,
  Filter,
  X,
  LockKeyhole,
} from 'lucide-react';
import StatusHeader from './components/StatusHeader';
import ServiceCubeOverview from './components/ServiceCubeOverview';
import IncidentHistory from './components/IncidentHistory';
import ContinuityInsights from './components/ContinuityInsights';
import Footer from './components/Footer';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import AdminConsole from './components/AdminConsole';
import AuthDialog from './components/AuthDialog';
import MyDashboard from './components/MyDashboard';

const API_BASE = process.env.REACT_APP_API_URL || '/api';
const REFRESH_INTERVAL = parseInt(process.env.REACT_APP_REFRESH_INTERVAL, 10) || 30000;

function pathView() {
  if (window.location.pathname.startsWith('/admin')) return 'admin';
  if (window.location.pathname.startsWith('/me')) return 'me';
  return 'dashboard';
}


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
        <div className={'p-2.5 rounded-xl border ' + (tones[tone] || tones.slate)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ProtectedView({ title, message, onSignIn }) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <div className="rounded-3xl bg-white border border-slate-200 p-10 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center">
          <LockKeyhole className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-950 mt-5">{title}</h2>
        <p className="text-slate-500 mt-2">{message}</p>
        {onSignIn && (
          <button
            onClick={onSignIn}
            className="mt-6 px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            Sign In
          </button>
        )}
      </div>
    </main>
  );
}

function App() {
  const [status, setStatus] = useState(null);
  const [config, setConfig] = useState(null);
  const [health, setHealth] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [currentView, setCurrentView] = useState(pathView);
  const [authOpen, setAuthOpen] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [statusRes, configRes, healthRes] = await Promise.all([
        axios.get(API_BASE + '/status', { timeout: 10000 }),
        axios.get(API_BASE + '/config', { timeout: 5000 }),
        axios.get(API_BASE + '/health', { timeout: 5000 }),
      ]);

      setStatus(statusRes.data);
      setConfig(configRes.data);
      setHealth(healthRes.data);
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

  const fetchAuth = async () => {
    try {
      const response = await axios.get(API_BASE + '/auth/me', {
        timeout: 5000,
        withCredentials: true,
      });
      setAuthUser(response.data.user);
    } catch (err) {
      if (err.response?.status !== 401) console.warn('Unable to restore EduNetGuard session:', err.message);
      setAuthUser(null);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAuth();

    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    const onPopState = () => setCurrentView(pathView());
    window.addEventListener('popstate', onPopState);
    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const liveConnected = Boolean(status?.source?.connected) && !status?.demo_mode;
  const services = useMemo(
    () => (liveConnected ? (status?.services || []) : []),
    [liveConnected, status]
  );

  const groups = useMemo(
    () => Array.from(new Set(services.map((service) => service.group || 'Infrastructure Services'))).sort(),
    [services]
  );

  const filteredServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return services
      .filter((service) => {
        const group = service.group || 'Infrastructure Services';
        const matchesQuery = !normalizedQuery ||
          String(service.name || '').toLowerCase().includes(normalizedQuery) ||
          String(group).toLowerCase().includes(normalizedQuery) ||
          String(service.message || '').toLowerCase().includes(normalizedQuery);

        const matchesGroup = groupFilter === 'all' || group === groupFilter;

        let matchesStatus = true;
        if (statusFilter === 'attention') matchesStatus = service.status === 'down' || service.status === 'pending';
        else if (statusFilter !== 'all') matchesStatus = service.status === statusFilter;

        return matchesQuery && matchesGroup && matchesStatus;
      })
      .sort((a, b) => {
        const rank = { down: 0, pending: 1, maintenance: 2, up: 3 };
        const statusRank = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
        if (statusRank !== 0) return statusRank;
        const groupRank = String(a.group || '').localeCompare(String(b.group || ''));
        if (groupRank !== 0) return groupRank;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }, [services, query, statusFilter, groupFilter]);

  const groupedServices = useMemo(() => {
    const grouped = {};
    filteredServices.forEach((service) => {
      const rawGroup = service.group || 'Infrastructure Services';
      const group = rawGroup.toLowerCase() === 'services' ? 'Infrastructure Services' : rawGroup;
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(service);
    });
    return grouped;
  }, [filteredServices]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchData} />;

  const productName = config?.brand?.productName || 'EduNetGuard';
  const tagline = config?.brand?.tagline || 'Network Continuity & Service Assurance';
  const organizationName = config?.school?.name || 'Network Operations';
  const repositoryUrl = config?.brand?.repositoryUrl || 'https://github.com/bnrohit/edunetguard-repo';
  const primaryColor = config?.theme?.primaryColor || '#2563eb';

  const summary = status?.summary || {};
  const operationalCount = Number.isFinite(Number(summary.operational))
    ? Number(summary.operational)
    : services.filter((service) => service.status === 'up').length;
  const downCount = Number.isFinite(Number(summary.down))
    ? Number(summary.down)
    : services.filter((service) => service.status === 'down').length;
  const maintenanceCount = Number.isFinite(Number(summary.maintenance))
    ? Number(summary.maintenance)
    : services.filter((service) => service.status === 'maintenance').length;
  const attentionCount = Number.isFinite(Number(summary.attention))
    ? Number(summary.attention)
    : services.filter((service) => service.status === 'down' || service.status === 'pending').length;
  const uptime = liveConnected ? Number(status?.overall?.uptime_percentage || 0).toFixed(2) : '—';

  const overallPresentation = {
    operational: {
      title: 'All monitored infrastructure operational',
      description: 'Critical monitored services are responding within expected operating thresholds.',
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
      description: 'EduNetGuard is waiting for verified live monitoring telemetry.',
      icon: Radio,
      badge: 'Telemetry Unavailable',
      badgeClass: 'bg-slate-400/15 text-slate-200 border-slate-400/30',
    },
  };

  const effectiveStatus = liveConnected ? status?.overall?.status : 'unknown';
  const overall = overallPresentation[effectiveStatus] || overallPresentation.unknown;
  const OverallIcon = overall.icon;
  const filtersActive = query || statusFilter !== 'all' || groupFilter !== 'all';

  const resetFilters = () => {
    setQuery('');
    setStatusFilter('all');
    setGroupFilter('all');
  };

  const navigate = (view) => {
    if ((view === 'me' || view === 'admin') && !authUser) {
      setAuthOpen(true);
      return;
    }

    const path = view === 'admin' ? '/admin' : view === 'me' ? '/me' : '/';
    window.history.pushState({}, '', path);
    setCurrentView(view);
  };

  const logout = async () => {
    try {
      await axios.post(API_BASE + '/auth/logout', {}, { withCredentials: true, timeout: 5000 });
    } catch {
      // Clear the local session view even if the server is temporarily unavailable.
    }
    setAuthUser(null);
    navigate('dashboard');
  };

  const toggleFavorite = async (monitorId) => {
    if (!authUser) {
      setAuthOpen(true);
      return;
    }

    const current = new Set((authUser.preferences?.favoriteMonitorIds || []).map(String));
    const id = String(monitorId);
    if (current.has(id)) current.delete(id);
    else current.add(id);

    setSavingPreferences(true);
    try {
      const response = await axios.patch(
        API_BASE + '/auth/preferences',
        { favoriteMonitorIds: Array.from(current) },
        { withCredentials: true, timeout: 5000 }
      );
      setAuthUser(response.data.user);
    } catch (err) {
      console.error('Unable to save dashboard preferences:', err);
    } finally {
      setSavingPreferences(false);
    }
  };

  const adminScheme = config?.admin?.scheme || 'http';
  const adminHost = config?.admin?.host || window.location.hostname;
  const adminPort = config?.admin?.port || 3001;
  const monitoringAdminUrl = adminScheme + '://' + adminHost + ':' + adminPort;

  let view;

  if (currentView === 'admin') {
    if (!authUser) {
      view = <ProtectedView title="Administrator sign-in required" message="Sign in with an EduNetGuard administrator account." onSignIn={() => setAuthOpen(true)} />;
    } else if (authUser.role !== 'admin') {
      view = <ProtectedView title="Administrator access required" message="Your EduNetGuard account can use a personal dashboard but does not have administrator privileges." />;
    } else {
      view = (
        <AdminConsole
          productName={productName}
          status={status}
          health={health}
          config={config}
          adminUrl={monitoringAdminUrl}
          onBack={() => navigate('dashboard')}
        />
      );
    }
  } else if (currentView === 'me') {
    view = authUser ? (
      <MyDashboard
        user={authUser}
        services={services}
        onToggleFavorite={toggleFavorite}
        saving={savingPreferences}
      />
    ) : (
      <ProtectedView title="Sign in to your dashboard" message="Create an account with your administrator's secret join code, or sign in with an existing account." onSignIn={() => setAuthOpen(true)} />
    );
  } else {
    view = (
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
                  <p className="text-sm font-medium text-slate-300">Live Infrastructure Status</p>
                  <span className={'px-2.5 py-1 text-xs font-semibold rounded-full border ' + overall.badgeClass}>
                    {overall.badge}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mt-2">{overall.title}</h2>
                <p className="text-slate-300 mt-2 max-w-2xl">{overall.description}</p>
              </div>
            </div>

            <div className="lg:text-right min-w-[210px]">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Monitoring Fabric</p>
              <p className="font-semibold mt-2 flex lg:justify-end items-center gap-2">
                <span className={'w-2.5 h-2.5 rounded-full ' + (liveConnected ? 'bg-emerald-400' : 'bg-slate-500')} />
                {liveConnected ? 'Connected' : 'Unavailable'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {liveConnected ? 'EduNetGuard Monitoring Engine' : 'No verified live telemetry'}
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard label="Active Monitors" value={services.length} helper="Across connected infrastructure" icon={Monitor} tone="blue" />
          <MetricCard
            label="Healthy Services"
            value={operationalCount}
            helper={liveConnected ? (services.length ? Math.round((operationalCount / services.length) * 100) : 0) + '% within normal thresholds' : 'Waiting for live telemetry'}
            icon={CheckCircle}
            tone={liveConnected ? 'green' : 'slate'}
          />
          <MetricCard
            label="Active Alerts"
            value={attentionCount}
            helper={maintenanceCount ? maintenanceCount + ' service' + (maintenanceCount === 1 ? '' : 's') + ' in maintenance' : attentionCount ? 'Operator attention required' : 'No active service alerts'}
            icon={attentionCount ? AlertCircle : Shield}
            tone={attentionCount ? 'red' : liveConnected ? 'green' : 'slate'}
          />
          <MetricCard
            label="24h Availability"
            value={liveConnected ? uptime + '%' : '—'}
            helper={downCount ? downCount + ' service' + (downCount === 1 ? '' : 's') + ' currently unavailable' : 'Rolling service availability'}
            icon={Activity}
            tone={downCount ? 'amber' : liveConnected ? 'green' : 'slate'}
          />
        </section>

        <ContinuityInsights summary={summary} timestamp={status?.timestamp} connected={liveConnected} />

        {status?.incident && liveConnected && (
          <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Published Incident</p>
                <h3 className="font-bold text-slate-950 mt-1">{status.incident.title}</h3>
                {status.incident.content && <p className="text-sm text-slate-600 mt-2">{status.incident.content}</p>}
              </div>
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-primary uppercase tracking-[0.08em]">Infrastructure Health</p>
              <h2 className="text-2xl font-bold mt-1">Service assurance by operational group</h2>
              <p className="text-sm text-slate-500 mt-1">Search, filter, and prioritize current infrastructure conditions.</p>
            </div>
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-800">{filteredServices.length}</span> of {services.length} monitors
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-5">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_190px_240px_auto] gap-3">
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search service, group, or message..."
                  className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                />
              </label>

              <label className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 pl-10 pr-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                >
                  <option value="all">All states</option>
                  <option value="attention">Needs attention</option>
                  <option value="down">Down</option>
                  <option value="pending">Checking</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="up">Operational</option>
                </select>
              </label>

              <select
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              >
                <option value="all">All operational groups</option>
                {groups.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>

              <button
                onClick={resetFilters}
                disabled={!filtersActive}
                className="h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {filteredServices.length > 0 && <ServiceCubeOverview groupedServices={groupedServices} />}

            {liveConnected && filteredServices.length === 0 && services.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
                <Search className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-semibold text-slate-900 mt-4">No monitors match these filters</h3>
                <p className="text-sm text-slate-500 mt-2">Clear the filters or search for another service or group.</p>
              </div>
            )}

            {services.length === 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-sm">
                <Radio className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-semibold text-slate-900 mt-4">Live monitoring telemetry is unavailable</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
                  EduNetGuard will display infrastructure health when the monitoring engine is connected and verified.
                </p>
              </div>
            )}
          </div>
        </section>

        {config?.display?.showIncidentHistory && liveConnected && <IncidentHistory services={services} />}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{':root { --primary-color: ' + primaryColor + '; } .text-primary { color: ' + primaryColor + '; } .bg-primary { background-color: ' + primaryColor + '; } .border-primary { border-color: ' + primaryColor + '; } .hover\\:bg-primary:hover { background-color: ' + primaryColor + '; }'}</style>

      <StatusHeader
        productName={productName}
        tagline={tagline}
        organizationName={organizationName}
        lastUpdated={lastUpdated}
        onRefresh={fetchData}
        refreshing={refreshing}
        connected={liveConnected}
        currentView={currentView}
        onNavigate={navigate}
        user={authUser}
        onSignIn={() => setAuthOpen(true)}
        onLogout={logout}
      />

      {view}

      <Footer productName={productName} repositoryUrl={repositoryUrl} />

      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={(user) => {
          setAuthUser(user);
          setAuthOpen(false);
          const target = user.role === 'admin' && currentView === 'admin' ? 'admin' : 'me';
          const path = target === 'admin' ? '/admin' : '/me';
          window.history.pushState({}, '', path);
          setCurrentView(target);
        }}
      />
    </div>
  );
}

export default App;
