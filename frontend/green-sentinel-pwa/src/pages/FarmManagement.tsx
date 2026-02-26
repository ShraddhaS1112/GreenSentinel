import React from 'react';

export const FarmManagement: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Farm Management</h1>
      <div className="mb-6">
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Add New Farm
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-2">Farm 1</h2>
          <p className="text-gray-600 mb-4">Location: Coordinates</p>
          <div className="flex gap-2">
            <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              View
            </button>
            <button className="flex-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
