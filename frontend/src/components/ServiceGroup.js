import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, Clock, Activity } from 'lucide-react';

function ServiceGroup({ name, services, icon: Icon }) {
  const [expanded, setExpanded] = useState(true);

  const upCount = services.filter(s => s.status === 'up').length;
  const downCount = services.filter(s => s.status === 'down').length;
  const isAllUp = downCount === 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'up': return <CheckCircle className="w-5 h-5 text-status-up" />;
      case 'down': return <XCircle className="w-5 h-5 text-status-down" />;
      case 'pending': return <AlertCircle className="w-5 h-5 text-status-pending" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      up: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      down: 'bg-red-50 text-red-700 border-red-200',
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return (
      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${styles[status] || styles.pending}`}>
        {status === 'up' ? 'Operational' : status === 'down' ? 'Down' : 'Checking'}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isAllUp ? 'bg-emerald-50' : 'bg-red-50'}`}>
            <Icon className={`w-5 h-5 ${isAllUp ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">
              {upCount} of {services.length} operational
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isAllUp && (
            <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
              {downCount} issue{downCount !== 1 ? 's' : ''}
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
          {services.map((service) => (
            <div
              key={service.id}
              className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(service.status)}
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  {service.last_check && (
                    <p className="text-xs text-gray-400">
                      Last checked {new Date(service.last_check).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {service.uptime !== undefined && (
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Activity className="w-3.5 h-3.5" />
                      <span>{service.uptime.toFixed(2)}% uptime</span>
                    </div>
                  </div>
                )}
                {getStatusBadge(service.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ServiceGroup;
