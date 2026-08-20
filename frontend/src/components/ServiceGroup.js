import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Activity,
  Wrench,
  Gauge,
} from 'lucide-react';

function ServiceGroup({ name, services, icon: Icon }) {
  const [expanded, setExpanded] = useState(true);

  const upCount = services.filter((service) => service.status === 'up').length;
  const downCount = services.filter((service) => service.status === 'down').length;
  const pendingCount = services.filter((service) => service.status === 'pending').length;
  const maintenanceCount = services.filter((service) => service.status === 'maintenance').length;
  const issueCount = downCount + pendingCount;
  const isHealthy = issueCount === 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      up: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      down: 'bg-red-50 text-red-700 border-red-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      maintenance: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    const labels = {
      up: 'Operational',
      down: 'Down',
      pending: 'Checking',
      maintenance: 'Maintenance',
    };

    return (
      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${styles[status] || styles.pending}`}>
        {labels[status] || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 sm:px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isHealthy ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <Icon className={`w-5 h-5 ${isHealthy ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-gray-950">{name}</h3>
            <p className="text-sm text-gray-500">
              {upCount} of {services.length} operational
              {maintenanceCount > 0 ? ` · ${maintenanceCount} maintenance` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {issueCount > 0 && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
              {issueCount} issue{issueCount !== 1 ? 's' : ''}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          {services.map((service) => {
            const uptime = Number(service.uptime);
            const responseTime = Number(service.response_time_ms);

            return (
              <div
                key={service.id}
                className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/70 transition-colors border-b border-gray-100 last:border-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex-none">{getStatusIcon(service.status)}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{service.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      {service.last_check && (
                        <p className="text-xs text-gray-400">
                          Checked {new Date(service.last_check).toLocaleString()}
                        </p>
                      )}
                      {Number.isFinite(responseTime) && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5" />
                          {Math.round(responseTime)} ms
                        </p>
                      )}
                    </div>
                    {service.status !== 'up' && service.message && (
                      <p className="text-xs text-gray-500 mt-1 max-w-2xl truncate" title={service.message}>
                        {service.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
                  {Number.isFinite(uptime) && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Activity className="w-3.5 h-3.5" />
                        <span>{uptime.toFixed(2)}%</span>
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">24h uptime</p>
                    </div>
                  )}
                  {getStatusBadge(service.status)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ServiceGroup;
