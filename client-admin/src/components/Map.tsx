import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { Report } from '../types';
import { getStatusLabel, getCriticalityLabel } from '../utils';

// We need to disable default markers correctly, but here we provide custom divIcons anyway.

interface MapViewProps {
  reports: Report[];
}

const catColors: Record<string, string> = {
  yol: '#E8651A',
  su: '#0288D1',
  elektrik: '#E8A317',
  bina: '#7B1FA2',
  park: '#0D9E4F',
  cop: '#5D4037',
  gaz: '#D32F2F',
  diger: '#8E95A8',
};

const critColors: Record<string, string> = {
  kritik: '#D32F2F',
  yuksek: '#E8651A',
  orta: '#E8A317',
  dusuk: '#0D9E4F',
};

export const MapView: React.FC<MapViewProps> = ({ reports }) => {
  return (
    <div className="map-wrapper">
      <MapContainer 
        center={[39.9334, 32.8597]} 
        zoom={12} 
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup>
          {reports.map((r) => {
            if (!r.latitude && !r.longitude) return null;
            const color = catColors[r.category] || '#8E95A8';
            const critColor = critColors[r.criticality] || '#8E95A8';
            
            const icon = L.divIcon({
              html: `<div style="width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
              className: '',
            });

            return (
              <Marker key={r.id} position={[r.latitude, r.longitude]} icon={icon}>
                <Popup>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", minWidth: '200px' }}>
                    {r.image && (
                      <img 
                        src={r.image} 
                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} 
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} 
                      />
                    )}
                    <div style={{ fontWeight: 700, color: '#005BAA', fontSize: '12px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      {r.categoryLabel}
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                      {r.description.substring(0, 80)}...
                    </div>
                    <div style={{ fontSize: '11px', color: '#8E95A8' }}>📍 {r.address}</div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
                      <span style={{
                        background: r.status === 'beklemede' ? '#FFF8E6' : r.status === 'inceleniyor' ? '#E3F2FD' : r.status === 'reddedildi' ? '#FDEDED' : '#E6F7ED',
                        color: r.status === 'beklemede' ? '#E8A317' : r.status === 'inceleniyor' ? '#0288D1' : r.status === 'reddedildi' ? '#D32F2F' : '#0D9E4F',
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700
                      }}>
                        {getStatusLabel(r.status)}
                      </span>
                      <span style={{
                        background: `${critColor}20`,
                        color: critColor,
                        padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700
                      }}>
                        {getCriticalityLabel(r.criticality)}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};
