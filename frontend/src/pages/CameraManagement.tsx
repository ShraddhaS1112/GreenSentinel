/**
 * Green Sentinel - Camera Management Page
 *
 * Manage IP cameras for a specific farm.
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Camera,
  Plus,
  Trash2,
  Edit,
  Wifi,
  WifiOff,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Play,
  Pause,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import { CameraStatus } from '@green-sentinel/shared';
import type { Camera as CameraType } from '@green-sentinel/shared';
import toast from 'react-hot-toast';
import LiveCamera from '@/components/LiveCamera';
import { useTranslation } from '@/stores/preferencesStore';

const statusConfig: Record<
  CameraStatus,
  { labelKey: string; color: string; icon: typeof Wifi }
> = {
  connected: { labelKey: 'common.connected', color: 'text-green-600 bg-green-100', icon: Wifi },
  disconnected: { labelKey: 'common.disconnected', color: 'text-slate-600 bg-slate-100', icon: WifiOff },
  connecting: { labelKey: 'common.connecting', color: 'text-blue-600 bg-blue-100', icon: Wifi },
  error: { labelKey: 'common.error', color: 'text-red-600 bg-red-100', icon: AlertCircle },
};

export default function CameraManagement() {
  const { t } = useTranslation();
  const { farmId } = useParams<{ farmId: string }>();
  const { farms, addCamera, removeCamera, updateCameraStatus } = useFarmStore();
  const [showAddModal, setShowAddModal] = useState(false);

  const farm = farms.find((f) => f.farmId === farmId);

  if (!farm) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <AlertCircle className="empty-state-icon" />
          <h2 className="empty-state-title">{t('cameras.farmNotFound')}</h2>
          <p className="empty-state-description">
            {t('cameras.backToFarms')}
          </p>
          <Link to="/farms" className="btn-primary mt-4">
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  const handleDelete = (cameraId: string, cameraName: string) => {
    if (confirm(`Are you sure you want to remove "${cameraName}"?`)) {
      removeCamera(farm.farmId, cameraId);
      toast.success(t('cameras.cameraRemoved'));
    }
  };

  const toggleCameraStatus = (camera: CameraType) => {
    const newStatus: CameraStatus =
      camera.status === CameraStatus.CONNECTED ? CameraStatus.DISCONNECTED : CameraStatus.CONNECTED;
    updateCameraStatus(farm.farmId, camera.cameraId, newStatus);
    toast.success(
      newStatus === CameraStatus.CONNECTED ? 'Camera connected' : 'Camera disconnected'
    );
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/farms"
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            Cameras - {farm.name}
          </h1>
          <p className="text-slate-500 mt-1">
            {farm.cameras.length} camera{farm.cameras.length !== 1 ? 's' : ''}{' '}
            configured
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('cameras.addCamera')}</span>
        </button>
      </div>

      {/* Browser Camera - Works on any device */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Camera className="w-5 h-5 text-green-600" />
          {t('cameras.quickScan')}
        </h2>
        <LiveCamera
          farmId={farm.farmId}
          onThreatDetected={(threat) => {
            const threats = [
              threat.fire.detected ? 'Fire' : null,
              threat.human.detected && threat.human.suspicious ? 'Human intruder' : null,
              threat.animal.detected ? `Animal (${threat.animal.species[0] || 'unknown'})` : null,
            ].filter(Boolean);
            toast.error(`Threat detected: ${threats.join(', ') || threat.overallThreat}`, { duration: 5000 });
          }}
        />
        <p className="text-sm text-slate-500 mt-2">
          Use your phone or laptop camera for quick field inspections. No setup required.
        </p>
      </div>

      {/* IP Cameras Section */}
      <h2 className="text-lg font-semibold text-slate-900 mb-3">IP Cameras (RTSP)</h2>

      {/* Camera list */}
      {farm.cameras.length === 0 ? (
        <div className="card text-center py-12">
          <Camera className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            {t('cameras.noCameras')}
          </h3>
          <p className="text-slate-500 mb-4">
            {t('cameras.addFirstCamera')}
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-5 h-5" />
            {t('cameras.addFirstCameraBtn')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {farm.cameras.map((camera, index) => (
            <motion.div
              key={camera.cameraId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Camera preview placeholder */}
                <div className="w-full sm:w-40 h-24 bg-slate-900 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
                  <Camera className="w-8 h-8 text-slate-500 z-10" />
                  {camera.status === 'connected' && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>
                  )}
                </div>

                {/* Camera info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">
                      {camera.name}
                    </h3>
                    <StatusBadge status={camera.status} />
                  </div>

                  <p className="text-sm text-slate-500 mt-1 font-mono truncate">
                    {camera.rtspUrl}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                    <span>Interval: {camera.captureInterval}s</span>
                    {camera.lastFrameAt && (
                      <span>
                        Last frame:{' '}
                        {new Date(camera.lastFrameAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCameraStatus(camera)}
                    className={`btn-secondary ${
                      camera.status === 'connected'
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {camera.status === 'connected' ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('cameras.stop')}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('cameras.start')}</span>
                      </>
                    )}
                  </button>

                  <button className="btn-icon btn-ghost">
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(camera.cameraId, camera.name)}
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

      {/* Add Camera Modal */}
      {showAddModal && (
        <AddCameraModal
          farmId={farm.farmId}
          onClose={() => setShowAddModal(false)}
          onAdd={(camera) => {
            addCamera(farm.farmId, camera);
            setShowAddModal(false);
            toast.success(t('cameras.cameraAdded'));
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function StatusBadge({ status }: { status: CameraStatus }) {
  const { t } = useTranslation();
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {t(config.labelKey)}
    </span>
  );
}

function AddCameraModal({
  farmId,
  onClose,
  onAdd,
}: {
  farmId: string;
  onClose: () => void;
  onAdd: (camera: CameraType) => void;
}) {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    rtspUrl: '',
    username: '',
    password: '',
    captureInterval: '5',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Build RTSP URL with credentials
    let fullUrl = formData.rtspUrl;
    if (formData.username && formData.password) {
      try {
        const url = new URL(formData.rtspUrl);
        url.username = formData.username;
        url.password = formData.password;
        fullUrl = url.toString();
      } catch {
        // Keep original URL if parsing fails
      }
    }

    const newCamera: CameraType = {
      cameraId: `cam_${Date.now()}`,
      farmId,
      name: formData.name,
      rtspUrl: fullUrl,
      status: CameraStatus.DISCONNECTED,
      captureInterval: parseInt(formData.captureInterval) || 5,
      createdAt: new Date().toISOString(),
    };

    onAdd(newCamera);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full"
      >
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">{t('cameras.modalTitle')}</h2>
          <p className="text-slate-500 text-sm mt-1">
            {t('cameras.modalSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">{t('cameras.cameraName')} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="input"
              placeholder="e.g., North Gate Camera"
              required
            />
          </div>

          <div>
            <label className="label">{t('cameras.rtspUrl')} *</label>
            <input
              type="text"
              value={formData.rtspUrl}
              onChange={(e) =>
                setFormData({ ...formData, rtspUrl: e.target.value })
              }
              className="input font-mono text-sm"
              placeholder="rtsp://192.168.1.100:554/stream"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Format: rtsp://ip:port/stream
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{t('cameras.username')}</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className="input"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="label">{t('cameras.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="label">{t('cameras.captureInterval')}</label>
            <select
              value={formData.captureInterval}
              onChange={(e) =>
                setFormData({ ...formData, captureInterval: e.target.value })
              }
              className="input"
            >
              <option value="5">{t('cameras.5sec')}</option>
              <option value="10">{t('cameras.10sec')}</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              More frequent captures = faster detection but higher costs
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary flex-1">
              {t('cameras.addCamera')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
