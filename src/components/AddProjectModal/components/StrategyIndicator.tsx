import React from 'react';
import { Check, Search, FolderOpen } from 'lucide-react';

export interface StrategyIndicatorProps {
  path: string;
  isPathInDiscovery: boolean;
  discoveryPaths: string[];
}

export const StrategyIndicator: React.FC<StrategyIndicatorProps> = ({
  path,
  isPathInDiscovery,
  discoveryPaths
}) => {
  if (!path) return null;

  return (
    <div className={`p-4 rounded-lg border ${
      isPathInDiscovery
        ? 'bg-green-50 border-green-200'
        : 'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center mb-2">
        {isPathInDiscovery ? (
          <>
            <Search className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="font-semibold text-green-800">Auto-Discovery</h4>
          </>
        ) : (
          <>
            <FolderOpen className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-semibold text-blue-800">Project-First</h4>
          </>
        )}
      </div>

      <p className={`text-sm mb-3 ${
        isPathInDiscovery ? 'text-green-700' : 'text-blue-700'
      }`}>
        {isPathInDiscovery
          ? 'This project will be automatically discovered and available in the project selector.'
          : 'This project will need to be manually added to the global registry to be available.'
        }
      </p>

      <div className={`text-xs ${
        isPathInDiscovery ? 'text-green-600' : 'text-blue-600'
      }`}>
        <strong>How it works:</strong>
        {isPathInDiscovery
          ? ' Auto-Discovery projects use local configuration only and are found automatically.'
          : ' Project-First projects create both local and global configurations for team sharing.'
        }
      </div>

      {discoveryPaths.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Discovery paths:</strong> {discoveryPaths.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
};