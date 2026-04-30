import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Wifi, Server, BookOpen, Building, 
  CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import StatusHeader from './components/StatusHeader';
import ServiceGroup from './components/ServiceGroup';
import IncidentHistory from './components/IncidentHistory';
import Footer from './components/Footer';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';

const API_BASE = process.env.REACT_APP_API_URL || '/api';
const REFRESH_INTERVAL = parseInt(process.env.REACT_APP_REFRESH_INTERVAL) || 30000;

const iconMap = {
  wifi: Wifi,
  server: Server,
  book: BookOpen,
  building: Building,
};

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

  // Group services by category
  const groupedServices = {};
  if (status?.services) {
    status.services.forEach(service => {
      const group = service.group || 'General';
      if (!groupedServices[group]) {
        groupedServices[group] = [];
      }
      groupedServices[group].push(service);
    });
  }

  const schoolName = config?.school?.name || 'EduNetGuard';
  const primaryColor = config?.theme?.primaryColor || '#2563eb';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Custom primary color injection */}
      <style>{`
        :root { --primary-color: ${primaryColor}; }
        .text-primary { color: ${primaryColor}; }
        .bg-primary { background-color: ${primaryColor}; }
        .border-primary { border-color: ${primaryColor}; }
        .hover\:bg-primary:hover { background-color: ${primaryColor}; }
      `}</style>

      <StatusHeader
        schoolName={schoolName}
        lastUpdated={lastUpdated}
        onRefresh={fetchData}
        refreshing={refreshing}
      />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Overall Status Banner */}
        <div className={`rounded-2xl p-6 text-white shadow-lg animate-fade-in ${
          status?.overall?.status === 'operational' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
          status?.overall?.status === 'partial_outage' ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
          'bg-gradient-to-r from-red-500 to-red-600'
        }`}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              {status?.overall?.status === 'operational' ? (
                <CheckCircle className="w-8 h-8" />
              ) : status?.overall?.status === 'partial_outage' ? (
                <AlertCircle className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {status?.overall?.status === 'operational' ? 'All Systems Operational' :
                 status?.overall?.status === 'partial_outage' ? 'Partial Service Disruption' :
                 'Major Service Outage'}
              </h2>
              <p className="text-white/90 mt-1">
                {status?.services?.filter(s => s.status === 'up').length || 0} of {status?.services?.length || 0} services running normally
                {config?.display?.showUptimePercentage && status?.overall?.uptime_percentage && 
                  ` · ${status.overall.uptime_percentage}% uptime`}
              </p>
            </div>
          </div>
        </div>

        {/* Service Groups */}
        <div className="space-y-6">
          {Object.entries(groupedServices).map(([groupName, services]) => (
            <ServiceGroup 
              key={groupName} 
              name={groupName} 
              services={services}
              icon={iconMap[groupName.toLowerCase()] || Server}
            />
          ))}
        </div>

        {/* Incident History */}
        {config?.display?.showIncidentHistory && <IncidentHistory />}
      </main>

      <Footer 
        schoolName={schoolName}
        contactEmail={config?.school?.contactEmail}
      />
    </div>
  );
}

export default App;
