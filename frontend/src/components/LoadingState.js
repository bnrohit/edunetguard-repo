import React from 'react';
import { Shield, Loader2 } from 'lucide-react';

function LoadingState({ schoolName }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center animate-pulse">
            <Shield className="w-10 h-10 text-blue-600" />
          </div>
          <div className="absolute -bottom-1 -right-1">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {schoolName || 'EduNetGuard'}
        </h2>
        <p className="text-gray-500">Loading service status...</p>
      </div>
    </div>
  );
}

export default LoadingState;
