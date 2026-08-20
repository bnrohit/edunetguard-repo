import React from 'react';
import { Shield, Loader2 } from 'lucide-react';

function LoadingState() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center animate-pulse border border-blue-100">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-950 mb-2">EduNetGuard</h2>
        <p className="text-slate-500">Connecting to live operations telemetry...</p>
      </div>
    </div>
  );
}

export default LoadingState;
