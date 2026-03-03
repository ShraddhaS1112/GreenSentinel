/**
 * Satellite Map Component
 *
 * Interactive map showing farm location with satellite imagery and NDVI overlay.
 * Uses plain Leaflet (not react-leaflet) for React 18 compatibility.
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Satellite, Map as MapIcon, ExternalLink, Layers, ChevronDown } from 'lucide-react';

interface SatelliteMapProps {
  latitude: number;
  longitude: number;
  farmName: string;
  bbox?: number[]; // [minLng, minLat, maxLng, maxLat]
  ndvi?: number;
  healthStatus?: string;
}

// Map layer options
const TILE_LAYERS = {
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  streets: {
    name: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  terrain: {
    name: 'Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
  hybrid: {
    name: 'Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
  },
};

export default function SatelliteMap({
  latitude,
  longitude,
  farmName,
  bbox,
  ndvi,
  healthStatus,
}: SatelliteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [activeLayer, setActiveLayer] = useState<keyof typeof TILE_LAYERS>('satellite');
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  // Get color based on health status
  const getHealthColor = () => {
    switch (healthStatus) {
      case 'excellent': return '#22c55e';
      case 'good': return '#84cc16';
      case 'moderate': return '#eab308';
      case 'stressed': return '#f97316';
      case 'poor': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 16,
      scrollWheelZoom: true,
    });

    mapRef.current = map;

    // Add initial tile layer
    const layer = TILE_LAYERS[activeLayer];
    tileLayerRef.current = L.tileLayer(layer.url, {
      attribution: layer.attribution,
    }).addTo(map);

    // Custom marker icon
    const farmIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    // Add marker
    const marker = L.marker([latitude, longitude], { icon: farmIcon }).addTo(map);
    marker.bindPopup(`
      <div style="text-align: center;">
        <div style="font-weight: bold; color: #1e293b;">${farmName}</div>
        <div style="font-size: 12px; color: #64748b;">
          ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E
        </div>
        ${ndvi !== undefined ? `
          <div style="margin-top: 4px;">
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 9999px; background-color: ${getHealthColor()}20; color: ${getHealthColor()};">
              NDVI: ${ndvi.toFixed(3)} (${healthStatus})
            </span>
          </div>
        ` : ''}
      </div>
    `);

    // Add farm boundary rectangle if bbox provided and all 4 values are finite numbers
    const bboxValid = Array.isArray(bbox) &&
      bbox.length >= 4 &&
      bbox.slice(0, 4).every((v) => typeof v === 'number' && isFinite(v));
    if (bboxValid) {
      const bounds: L.LatLngBoundsExpression = [
        [bbox![1], bbox![0]], // [minLat, minLng]
        [bbox![3], bbox![2]], // [maxLat, maxLng]
      ];
      L.rectangle(bounds, {
        color: getHealthColor(),
        weight: 3,
        fillColor: getHealthColor(),
        fillOpacity: 0.15,
        dashArray: '5, 5',
      }).addTo(map);
    }

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update tile layer when activeLayer changes
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;

    const layer = TILE_LAYERS[activeLayer];
    tileLayerRef.current.setUrl(layer.url);
  }, [activeLayer]);

  // External links
  const eoGravityLink = `https://apps.sentinel-hub.com/eo-browser/?zoom=15&lat=${latitude}&lng=${longitude}&themeId=DEFAULT-THEME&visualizationUrl=https://services.sentinel-hub.com/ogc/wms/bd86bcc0-f318-402b-a145-015f85b9427e&datasetId=S2L2A&fromTime=2024-01-01T00:00:00.000Z&toTime=${new Date().toISOString().split('T')[0]}T23:59:59.999Z&layerId=2_NDVI`;
  const googleMapsLink = `https://www.google.com/maps/@${latitude},${longitude},17z/data=!3m1!1e3`;

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-200">
      {/* Map Controls — desktop: always visible column; mobile: collapsible toggle */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">

        {/* Mobile toggle button (hidden on sm+) */}
        <div className="sm:hidden">
          <button
            onClick={() => setLayerMenuOpen(!layerMenuOpen)}
            className="bg-white rounded-lg shadow-lg px-3 py-2 flex items-center gap-1.5 text-xs font-medium text-slate-700"
          >
            <Layers className="w-3.5 h-3.5 text-green-600" />
            {TILE_LAYERS[activeLayer].name}
            <ChevronDown className={`w-3 h-3 transition-transform ${layerMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          {layerMenuOpen && (
            <div className="mt-1 bg-white rounded-lg shadow-lg p-1 flex flex-row gap-1">
              {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                <button
                  key={key}
                  onClick={() => { setActiveLayer(key as keyof typeof TILE_LAYERS); setLayerMenuOpen(false); }}
                  className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                    activeLayer === key
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {layer.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop layer selector (hidden on mobile) */}
        <div className="hidden sm:block bg-white rounded-lg shadow-lg p-1">
          <div className="flex flex-col gap-1">
            {Object.entries(TILE_LAYERS).map(([key, layer]) => (
              <button
                key={key}
                onClick={() => setActiveLayer(key as keyof typeof TILE_LAYERS)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  activeLayer === key
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {layer.name}
              </button>
            ))}
          </div>
        </div>

        {/* External Links — compact on mobile */}
        <div className="bg-white rounded-lg shadow-lg p-1.5 sm:p-2">
          <a
            href={eoGravityLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
          >
            <Satellite className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">NDVI View</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* NDVI Legend — bottom-right on mobile to avoid Leaflet attribution, bottom-left on desktop */}
      {ndvi !== undefined && (
        <div className="absolute bottom-3 right-3 sm:bottom-3 sm:left-3 sm:right-auto z-[1000] bg-white rounded-lg shadow-lg p-2 sm:p-3">
          <div className="text-xs font-medium text-slate-700 mb-2">NDVI Index</div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: getHealthColor() }}
            >
              {ndvi.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600">
              <div className="font-medium capitalize">{healthStatus}</div>
              <div>Vegetation Index</div>
            </div>
          </div>
          <div className="mt-2 flex gap-0.5">
            <div className="h-1.5 w-4 bg-red-500 rounded-l" title="Poor" />
            <div className="h-1.5 w-4 bg-orange-500" title="Stressed" />
            <div className="h-1.5 w-4 bg-yellow-500" title="Moderate" />
            <div className="h-1.5 w-4 bg-lime-500" title="Good" />
            <div className="h-1.5 w-4 bg-green-500 rounded-r" title="Excellent" />
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} style={{ height: '400px', width: '100%' }} />
    </div>
  );
}
