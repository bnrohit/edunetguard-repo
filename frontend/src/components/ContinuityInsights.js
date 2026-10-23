import React from 'react';
import { Activity, Gauge, Radio, ShieldCheck } from 'lucide-react';

function Insight({ icon: Icon, label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-bold text-slate-950 truncate">{value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{helper}</p>
        </div>
      </div>
    </div>
  );
}

function ContinuityInsights({ summary = {}, timestamp, connected }) {
  const average = Number(summary.average_response_ms);
  const healthScore = Number(summary.availability_health_score);
  const latestCheck = summary.latest_check || timestamp;
  const freshness = latestCheck ? new Date(latestCheck).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const slowest = summary.slowest_service;

  return (
    <section>
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <p className="text-sm font-semibold text-primary uppercase tracking-[0.08em]">Continuity Insights</p>
          <h2 className="text-xl font-bold mt-1">Operational signal at a glance</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Insight
          icon={ShieldCheck}
          label="Health Score"
          value={connected && Number.isFinite(healthScore) ? healthScore + '%' : '—'}
          helper="Operational or planned-maintenance services"
        />
        <Insight
          icon={Gauge}
          label="Average Response"
          value={connected && Number.isFinite(average) ? average.toFixed(1) + ' ms' : '—'}
          helper="Across services reporting latency"
        />
        <Insight
          icon={Activity}
          label="Slowest Response"
          value={slowest ? slowest.name : '—'}
          helper={slowest ? slowest.response_time_ms + ' ms latest sample' : 'No response-time sample'}
        />
        <Insight
          icon={Radio}
          label="Latest Telemetry"
          value={connected ? freshness : 'Unavailable'}
          helper={connected ? 'Most recent monitor heartbeat' : 'Waiting for monitoring engine'}
        />
      </div>
    </section>
  );
}

export default ContinuityInsights;
