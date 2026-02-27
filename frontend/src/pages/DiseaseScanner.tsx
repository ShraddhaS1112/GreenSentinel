/**
 * Green Sentinel - Disease Scanner Page
 *
 * AI-powered plant disease detection using Amazon Bedrock.
 * Upload or capture images of crops for instant analysis.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Leaf,
  Bug,
  Pill,
  Shield,
  Clock,
  ChevronRight,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { useFarmStore } from '@/stores/farmStore';
import * as api from '@/services/apiService';
import toast from 'react-hot-toast';

export default function DiseaseScanner() {
  const { getCurrentFarm } = useFarmStore();
  const farm = getCurrentFarm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<api.DiseaseAnalysis | null>(null);
  const [scanHistory, setScanHistory] = useState<api.DiseaseScanResult[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Fetch scan history
  useEffect(() => {
    if (farm?.farmId) {
      fetchHistory();
    }
  }, [farm?.farmId]);

  const fetchHistory = async () => {
    if (!farm?.farmId) return;
    const response = await api.getDiseaseScanHistory(farm.farmId);
    if (response.data) {
      setScanHistory(response.data.scans);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setAnalysisResult(null);
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setCameraError('Could not access camera. Please check permissions.');
      setShowCamera(false);
    }
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
        setSelectedFile(file);
        setSelectedImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
        setAnalysisResult(null);
      }
    }, 'image/jpeg', 0.9);
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    setShowCamera(false);
  };

  // Analyze the image
  const analyzeImage = async () => {
    if (!selectedFile || !farm?.farmId) {
      toast.error('Please select an image first');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Step 1: Get upload URL
      const uploadUrlResponse = await api.getDiseaseScanUploadUrl(farm.farmId);
      if (uploadUrlResponse.error || !uploadUrlResponse.data) {
        throw new Error(uploadUrlResponse.error || 'Failed to get upload URL');
      }

      const { uploadUrl, scanId, key } = uploadUrlResponse.data;

      // Step 2: Upload image to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      // Step 3: Analyze with AI
      const cropType = farm.cropType || 'Unknown';
      const analysisResponse = await api.analyzeDiseaseScan(
        farm.farmId,
        scanId,
        key,
        cropType
      );

      if (analysisResponse.error || !analysisResponse.data) {
        throw new Error(analysisResponse.error || 'Analysis failed');
      }

      setAnalysisResult(analysisResponse.data.analysis);
      toast.success('Analysis complete!');
      fetchHistory(); // Refresh history
    } catch (err) {
      console.error('Analysis error:', err);
      toast.error(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setAnalysisResult(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  if (!farm) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <Camera className="empty-state-icon" />
          <h2 className="empty-state-title">No Farm Selected</h2>
          <p className="empty-state-description">
            Please select a farm to use the disease scanner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bug className="w-7 h-7 text-green-600" />
          Disease Scanner
        </h1>
        <p className="text-slate-500 mt-1">
          AI-powered plant disease detection for {farm.name}
        </p>
      </div>

      {/* Main Scanner Area */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Image Input */}
        <div className="card">
          <h2 className="section-header flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-slate-400" />
            Capture or Upload Image
          </h2>

          {!selectedImage && !showCamera && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <button
                onClick={() => startCamera()}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <Camera className="w-10 h-10 text-green-600" />
                <span className="font-medium text-slate-700">Take Photo</span>
                <span className="text-xs text-slate-500">Use device camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
              >
                <Upload className="w-10 h-10 text-green-600" />
                <span className="font-medium text-slate-700">Upload Image</span>
                <span className="text-xs text-slate-500">JPG, PNG up to 10MB</span>
              </button>
            </div>
          )}

          {/* Camera View */}
          {showCamera && (
            <div className="mt-4">
              {cameraError ? (
                <div className="p-4 bg-red-50 rounded-lg text-red-700 text-center">
                  {cameraError}
                </div>
              ) : (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg bg-black"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button
                      onClick={capturePhoto}
                      className="px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 flex items-center gap-2"
                    >
                      <Camera className="w-5 h-5" />
                      Capture
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-6 py-3 bg-slate-600 text-white rounded-full font-medium hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Image Preview */}
          {selectedImage && (
            <div className="mt-4">
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Selected plant"
                  className="w-full max-h-80 object-contain rounded-lg bg-slate-100"
                />
                <button
                  onClick={resetScanner}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-slate-100"
                >
                  <XCircle className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Bug className="w-5 h-5" />
                      Analyze for Diseases
                    </>
                  )}
                </button>
                <button onClick={resetScanner} className="btn-secondary">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Right: Analysis Results */}
        <div className="card">
          <h2 className="section-header flex items-center gap-2">
            <Leaf className="w-5 h-5 text-slate-400" />
            Analysis Results
          </h2>

          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
                <p className="text-slate-600 font-medium">Analyzing image with AI...</p>
                <p className="text-sm text-slate-500 mt-1">This may take a few seconds</p>
              </motion.div>
            ) : analysisResult ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 mt-4"
              >
                {/* Detection Status */}
                <div className={`p-4 rounded-lg ${analysisResult.detected ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <div className="flex items-center gap-3">
                    {analysisResult.detected ? (
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                    <div>
                      <h3 className={`font-semibold ${analysisResult.detected ? 'text-red-900' : 'text-green-900'}`}>
                        {analysisResult.detected ? analysisResult.disease || 'Disease Detected' : 'Healthy Plant'}
                      </h3>
                      {analysisResult.hindiName && (
                        <p className="text-sm text-slate-600">{analysisResult.hindiName}</p>
                      )}
                    </div>
                    {analysisResult.detected && (
                      <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(analysisResult.severity)}`}>
                        {analysisResult.severity.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {analysisResult.confidence > 0 && (
                    <p className="text-sm text-slate-600 mt-2">
                      Confidence: {analysisResult.confidence}%
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-700">{analysisResult.summary}</p>
                </div>

                {analysisResult.detected && (
                  <>
                    {/* Symptoms */}
                    {analysisResult.symptoms?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-900 flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          Symptoms
                        </h4>
                        <ul className="space-y-1">
                          {analysisResult.symptoms.map((s, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                              <span className="text-yellow-500 mt-1">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Treatment */}
                    {analysisResult.treatment?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-900 flex items-center gap-2 mb-2">
                          <Pill className="w-4 h-4 text-blue-600" />
                          Treatment
                        </h4>
                        <ul className="space-y-1">
                          {analysisResult.treatment.map((t, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Prevention */}
                    {analysisResult.prevention?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-slate-900 flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-green-600" />
                          Prevention
                        </h4>
                        <ul className="space-y-1">
                          {analysisResult.prevention.map((p, i) => (
                            <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <Bug className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500">
                  Take or upload a photo of your crop to detect diseases
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <div className="card mt-6">
          <h2 className="section-header flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            Recent Scans
          </h2>

          <div className="space-y-3 mt-4">
            {scanHistory.slice(0, 5).map((scan) => (
              <div
                key={scan.scanId}
                className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className={`p-2 rounded-full ${scan.analysis.detected ? 'bg-red-100' : 'bg-green-100'}`}>
                  {scan.analysis.detected ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{scan.title}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(scan.scanDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(scan.severity)}`}>
                  {scan.severity}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="card mt-6 bg-blue-50 border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">Tips for Better Results</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Take photos in good natural lighting</li>
          <li>• Focus on affected leaves or plant parts</li>
          <li>• Include multiple angles if possible</li>
          <li>• Avoid blurry or dark images</li>
        </ul>
      </div>
    </div>
  );
}
