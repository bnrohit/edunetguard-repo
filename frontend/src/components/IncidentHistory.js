import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Clock, ChevronRight, History, CheckCircle } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

function IncidentHistory() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const res = await axios.get(`${API_BASE}/status`, { timeout: 10000 });
        const downServices = res.data.services?.filter(s => s.status === 'down') || [];

        const mockIncidents = downServices.map(service => ({
          id: service.id,
          title: `${service.name} - Service Disruption`,
          service: service.name,
          status: 'investigating',
          severity: 'major',
          created_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          updated_at: new Date().toISOString(),
          description: `We are currently investigating issues with ${service.name}.`,
        }));

        setIncidents(mockIncidents);
      } catch (err) {
        console.error('Failed to fetch incidents:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIncidents();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Recent Incidents</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-gray-500 font-medium">No recent incidents</p>
          <p className="text-sm text-gray-400 mt-1">All systems have been running smoothly</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Active Incidents</h3>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
          {incidents.length} active
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {incidents.map((incident) => (
          <div key={incident.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{incident.title}</h4>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700">
                    Investigating
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Started {new Date(incident.created_at).toLocaleString()}
                  </span>
                  <span>Affects: {incident.service}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default IncidentHistory;
