"use client";

import { useEffect, useRef, useState } from "react";

interface GuestLocation {
  name: string;
  address: string;
  city: string;
  state: string;
}

interface Pin {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

interface Props {
  guests: GuestLocation[];
}

export default function GuestMap({ guests }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Geocode addresses using Nominatim
  useEffect(() => {
    if (guests.length === 0) {
      setLoading(false);
      return;
    }

    async function geocode() {
      const results: Pin[] = [];
      const cache: Record<string, { lat: number; lng: number }> = {};

      // Try to load cache from sessionStorage
      try {
        const cached = sessionStorage.getItem("geocode-cache");
        if (cached) Object.assign(cache, JSON.parse(cached));
      } catch {}

      for (const g of guests) {
        const key = `${g.city}, ${g.state}`;
        
        if (cache[key]) {
          results.push({ ...cache[key], name: g.name, address: `${g.address}, ${g.city}, ${g.state}` });
          continue;
        }

        try {
          // Rate limit: 1 req/sec for Nominatim
          await new Promise((r) => setTimeout(r, 1100));
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(key)}&limit=1`,
            { headers: { "User-Agent": "NathanAndLaurenWedding/1.0" } }
          );
          const data = await res.json();
          if (data.length > 0) {
            const loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            cache[key] = loc;
            results.push({ ...loc, name: g.name, address: `${g.address}, ${g.city}, ${g.state}` });
          }
        } catch {}
      }

      // Save cache
      try {
        sessionStorage.setItem("geocode-cache", JSON.stringify(cache));
      } catch {}

      setPins(results);
      setLoading(false);
    }

    geocode();
  }, [guests]);

  // Initialize Leaflet map
  useEffect(() => {
    if (loading || pins.length === 0 || !mapRef.current || mapLoaded) return;

    // Dynamically load Leaflet
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current) return;

      const map = L.map(mapRef.current).setView([39.8, -98.5], 4);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      const goldIcon = L.divIcon({
        className: "",
        html: `<div style="width:24px;height:24px;background:#C4956A;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const bounds: [number, number][] = [];
      for (const pin of pins) {
        L.marker([pin.lat, pin.lng], { icon: goldIcon })
          .addTo(map)
          .bindPopup(`<b>${pin.name}</b><br/>${pin.address}`);
        bounds.push([pin.lat, pin.lng]);
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 10);
      }

      setMapLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup handled by component unmount
    };
  }, [loading, pins, mapLoaded]);

  if (guests.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#FFFDF9] border border-gold-pale/40 overflow-hidden">
      {loading && (
        <div className="h-[400px] flex items-center justify-center">
          <p className="font-body text-xs text-ink-faint tracking-widest uppercase">
            Geocoding addresses... ({pins.length}/{guests.length})
          </p>
        </div>
      )}
      <div
        ref={mapRef}
        style={{ height: loading ? 0 : 400, width: "100%" }}
      />
    </div>
  );
}
