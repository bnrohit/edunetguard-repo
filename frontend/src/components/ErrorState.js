import React from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';

function ErrorState({ error, onRetry, schoolName }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <WifiOff className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Unable to Connect
        </h2>
        <p className="text-gray-500 mb-2">
          We can't reach the monitoring service right now.
        </p>
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2 mb-6 inline-block">
          {error}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
        >
          <RefreshCw className="w-5 h-5" />
          Try Again
        </button>
        <p className="text-xs text-gray-400 mt-6">
          If this persists, please contact your IT department.
        </p>
      </div>
    </div>
  );
}

export default ErrorState;
