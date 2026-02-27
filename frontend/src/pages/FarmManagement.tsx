/**
 * Green Sentinel - Farm Management Page
 *
 * Manage multiple farms, add new farms, configure settings.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  MapPin,
  Camera,
  Leaf,
  Trash2,
  Edit,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function FarmManagement() {
  const { farms, currentFarmId, setCurrentFarm, deleteFarm } = useFarmStore();
  const [showAddModal, setShowAddModal] = useState(false);

  const handleDelete = (farmId: string, farmName: string) => {
    if (confirm(`Are you sure you want to delete "${farmName}"? This action cannot be undone.`)) {
      deleteFarm(farmId);
      toast.success('Farm deleted successfully');
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Farm Management</h1>
          <p className="text-slate-500 mt-1">
            {farms.length} farm{farms.length !== 1 ? 's' : ''} registered
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add Farm</span>
        </button>
      </div>

      {/* Farm list */}
      {farms.length === 0 ? (
        <div className="card text-center py-12">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            No farms registered
          </h3>
          <p className="text-slate-500 mb-4">
            Add your first farm to start monitoring
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            Add Your First Farm
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {farms.map((farm, index) => (
            <motion.div
              key={farm.farmId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`card ${
                farm.farmId === currentFarmId
                  ? 'ring-2 ring-primary-500'
                  : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Farm info */}
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setCurrentFarm(farm.farmId)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {farm.name}
                    </h3>
                    {farm.farmId === currentFarmId && (
                      <span className="badge-success">Active</span>
                    )}
                  </div>

                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {farm.location.address || `${farm.location.district}, ${farm.location.state}`}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Leaf className="w-4 h-4 text-green-500" />
                      <span>{farm.cropType || 'Mixed crops'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Camera className="w-4 h-4 text-blue-500" />
                      <span>{farm.cameras.length} cameras</span>
                    </div>
                    {farm.area && (
                      <div className="text-sm text-slate-600">
                        {farm.area} hectares
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    to={`/farms/${farm.farmId}/cameras`}
                    className="btn-secondary"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="hidden sm:inline">Cameras</span>
                  </Link>

                  <button className="btn-icon btn-ghost">
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(farm.farmId, farm.name)}
                    className="btn-icon btn-ghost text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Farm Modal */}
      {showAddModal && (
        <AddFarmModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

// =============================================================================
// Add Farm Modal
// =============================================================================

function AddFarmModal({ onClose }: { onClose: () => void }) {
  const { addFarm } = useFarmStore();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    address: '',
    district: '',
    state: 'Maharashtra',
    cropType: '',
    area: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newFarm = {
      farmId: `farm_${Date.now()}`,
      userId: user?.userId || 'demo-user',
      name: formData.name,
      location: {
        latitude: parseFloat(formData.latitude) || 18.5204,
        longitude: parseFloat(formData.longitude) || 73.8567,
        address: formData.address,
        district: formData.district,
        state: formData.state,
      },
      area: parseFloat(formData.area) || undefined,
      cropType: formData.cropType,
      cameras: [],
      alertThresholds: {
        fire: 80,
        human: 80,
        animal: 75,
      },
      language: 'en' as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addFarm(newFarm);
    toast.success('Farm added successfully!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Add New Farm</h2>
          <p className="text-slate-500 text-sm mt-1">
            Register a new farm for monitoring
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Farm Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., Sunrise Farm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Latitude</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="input"
                placeholder="18.5204"
              />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="input"
                placeholder="73.8567"
              />
            </div>
          </div>

          <div>
            <label className="label">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
              placeholder="Village, Taluka"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="input"
                placeholder="Pune"
              />
            </div>
            <div>
              <label className="label">State</label>
              <select
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="input"
              >
                <option value="Maharashtra">Maharashtra</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Telangana">Telangana</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Rajasthan">Rajasthan</option>
                <option value="Madhya Pradesh">Madhya Pradesh</option>
                <option value="West Bengal">West Bengal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Crop Type</label>
              <input
                type="text"
                value={formData.cropType}
                onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                className="input"
                placeholder="e.g., Sugarcane"
              />
            </div>
            <div>
              <label className="label">Area (hectares)</label>
              <input
                type="number"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="input"
                placeholder="25"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Add Farm
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
