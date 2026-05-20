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
  const mapInstanceRef = useRef<any>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Geocode addresses using Nominatim (by city/state to reduce API calls)
  useEffect(() => {
    if (guests.length === 0) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function geocode() {
      const results: Pin[] = [];
      const cache: Record<string, { lat: number; lng: number }> = {};

      try {
        const cached = sessionStorage.getItem("geocode-cache");
        if (cached) Object.assign(cache, JSON.parse(cached));
      } catch {}

      // Group by city/state to minimize API calls
      const unique = new Map<string, GuestLocation[]>();
      for (const g of guests) {
        const key = `${g.city}, ${g.state}`;
        if (!unique.has(key)) unique.set(key, []);
        unique.get(key)!.push(g);
      }

      for (const [key, groupGuests] of unique) {
        if (cancelled) return;

        let loc = cache[key];
        if (!loc) {
          try {
            await new Promise((r) => setTimeout(r, 1100));
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(key)}&limit=1`,
              { headers: { "User-Agent": "NathanAndLaurenWedding/1.0" } }
            );
            const data = await res.json();
            if (data.length > 0) {
              loc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
              cache[key] = loc;
            }
          } catch {}
        }

        if (loc) {
          for (const g of groupGuests) {
            // Slight offset for multiple pins in same city
            const jitter = (Math.random() - 0.5) * 0.02;
            results.push({
              lat: loc.lat + jitter,
              lng: loc.lng + jitter,
              name: g.name,
              address: `${g.address}, ${g.city}, ${g.state}`,
            });
          }
        }

        if (!cancelled) setPins([...results]);
      }

      try {
        sessionStorage.setItem("geocode-cache", JSON.stringify(cache));
      } catch {}

      if (!cancelled) setLoading(false);
    }

    geocode().catch(() => { if (!cancelled) { setError("Failed to load locations"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [guests]);

  // Load Leaflet on mount
  useEffect(() => {
    function initMap() {
      const L = (window as any).L;
      if (!L || !mapRef.current || mapInstanceRef.current) return;

      try {
        const map = L.map(mapRef.current).setView([39.8, -98.5], 4);
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 18,
        }).addTo(map);
      } catch (err) {
        setError("Failed to initialize map");
      }
    }

    if ((window as any).L) {
      initMap();
      return;
    }

    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    if (!document.querySelector('script[src*="leaflet"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      script.onerror = () => setError("Failed to load map library");
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => {
        if ((window as any).L) { clearInterval(check); initMap(); }
      }, 200);
      setTimeout(() => clearInterval(check), 10000);
    }

    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when pins change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L || pins.length === 0) return;

    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    const goldIcon = L.divIcon({
      className: "",
      html: '<div style="width:20px;height:20px;background:#C4956A;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const bounds: [number, number][] = [];
    for (const pin of pins) {
      L.marker([pin.lat, pin.lng], { icon: goldIcon })
        .addTo(map)
        .bindPopup(`<b>${pin.name}</b><br/><span style="font-size:11px;color:#666">${pin.address}</span>`);
      bounds.push([pin.lat, pin.lng]);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 10);
    }
  }, [pins]);

  if (guests.length === 0) return null;

  return (
    <div className="bg-[#FFFDF9] border border-gold-pale/40 overflow-hidden relative" style={{ height: 400 }}>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <p className="font-body text-xs text-red-500">{error}</p>
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 bg-[#FFFDF9]">
          <p className="font-body text-xs text-ink-faint tracking-widest uppercase">
            Loading map...
          </p>
          {pins.length > 0 && (
            <p className="font-body text-[10px] text-ink-faint">
              {pins.length} of {guests.length} located
            </p>
          )}
        </div>
      )}
      <div
        ref={mapRef}
        style={{ height: 400, width: "100%" }}
      />
    </div>
  );
}
