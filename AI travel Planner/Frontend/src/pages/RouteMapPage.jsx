import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  MapPin,
  Navigation,
  Hotel,
  Compass,
  Route,
} from '../components/Icons';

export default function RouteMapPage() {
  const { trip } = useOutletContext();
  const [selectedDay, setSelectedDay] = useState(1);
  const [activeStopId, setActiveStopId] = useState(null);

  const currentDayObj =
    trip.days.find((d) => d.dayNumber === selectedDay) || trip.days[0];
  const selectedHotel =
    trip.hotels.find((h) => h.id === trip.selectedHotelId) || trip.hotels[0];

  // Normalize lat/lng coordinates onto an interactive SVG viewport (800 x 440)
  const points = [
    {
      id: 'hotel-base',
      label: `Hotel: ${selectedHotel.name}`,
      lat: selectedHotel.coords.lat,
      lng: selectedHotel.coords.lng,
      isHotel: true,
      cost: `${selectedHotel.pricePerNight}/nt`,
      transitLeg: 'Start & End Hub',
    },
    ...currentDayObj.activities.map((act, idx) => ({
      id: act.id,
      stepNumber: idx + 1,
      label: act.title,
      timeSlot: act.timeSlot,
      neighborhood: act.neighborhood,
      lat: act.lat,
      lng: act.lng,
      isHotel: false,
      cost: act.cost === 0 ? 'Free' : `$${act.cost}`,
      transitLeg: act.transitLeg,
    })),
  ];

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const plottedPoints = points.map((pt, i) => {
    const normX =
      maxLng - minLng < 0.0001
        ? 0.2 + i * 0.2
        : (pt.lng - minLng) / (maxLng - minLng);
    const normY =
      maxLat - minLat < 0.0001
        ? 0.25 + i * 0.18
        : 1 - (pt.lat - minLat) / (maxLat - minLat);

    return {
      ...pt,
      x: Math.round(110 + normX * 580),
      y: Math.round(75 + normY * 290),
    };
  });

  const polylinePoints = plottedPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="space-y-5">
      {/* Day Selector & Route Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {trip.days.map((d) => (
            <button
              key={d.dayNumber}
              type="button"
              onClick={() => setSelectedDay(d.dayNumber)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                selectedDay === d.dayNumber
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'border border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Day {d.dayNumber} Route
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5">
            <Route className="h-3.5 w-3.5 text-cyan-400" />
            Total Distance: <strong>{currentDayObj.totalDistanceKm} km</strong>
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            Stops: <strong>{currentDayObj.activities.length} Waypoints</strong>
          </span>
        </div>
      </div>

      {/* Interactive Vector Route Map Canvas */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Top Overlay Info */}
        <div className="absolute left-4 top-4 z-10 rounded-xl border border-slate-800/90 bg-slate-900/90 px-3.5 py-2 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Compass className="h-4 w-4 text-indigo-400" />
            <span>
              {trip.destination} — Day {currentDayObj.dayNumber} Multi-Stop Graph
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Click any waypoint pin to inspect coordinates & transit leg
          </p>
        </div>

        <svg
          viewBox="0 0 800 440"
          className="h-[380px] w-full select-none bg-[#070d19]"
        >
          <defs>
            <pattern
              id="map-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#1e293b"
                strokeWidth="0.7"
              />
            </pattern>
          </defs>

          {/* Grid Background */}
          <rect width="800" height="440" fill="url(#map-grid)" />

          {/* Decorative Topographic Rings */}
          <circle
            cx="400"
            cy="220"
            r="165"
            fill="none"
            stroke="#1e293b"
            strokeDasharray="6 6"
          />
          <circle
            cx="400"
            cy="220"
            r="260"
            fill="none"
            stroke="#0f172a"
            strokeWidth="2"
          />

          {/* glowing route polyline */}
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="6"
            strokeOpacity="0.25"
            points={polylinePoints}
          />
          <polyline
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            points={polylinePoints}
          />

          {/* Waypoint Nodes */}
          {plottedPoints.map((pt) => {
            const isSelected = activeStopId === pt.id;
            return (
              <g
                key={pt.id}
                onClick={() => setActiveStopId(pt.id)}
                className="cursor-pointer"
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 22 : 16}
                  fill={pt.isHotel ? '#ec4899' : '#4f46e5'}
                  fillOpacity="0.2"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.isHotel ? 11 : 10}
                  fill={pt.isHotel ? '#db2777' : '#6366f1'}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={pt.x}
                  y={pt.y + 4}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {pt.isHotel ? 'H' : pt.stepNumber}
                </text>

                {/* Waypoint Label Tag */}
                <rect
                  x={pt.x - 75}
                  y={pt.y + 16}
                  width="150"
                  height="22"
                  rx="6"
                  fill="#0f172a"
                  stroke={pt.isHotel ? '#ec4899' : '#475569'}
                  strokeWidth="1"
                />
                <text
                  x={pt.x}
                  y={pt.y + 30}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="9.5"
                >
                  {pt.label.length > 22
                    ? `${pt.label.slice(0, 22)}...`
                    : pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Step-by-Step Route Legs Below Map */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5">
        <h3 className="text-sm font-bold text-white">
          Day {currentDayObj.dayNumber} Turn-by-Turn Transit Sequence
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plottedPoints.map((pt) => (
            <div
              key={pt.id}
              onClick={() => setActiveStopId(pt.id)}
              className={`cursor-pointer rounded-xl border p-3.5 transition ${
                activeStopId === pt.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                  {pt.isHotel ? (
                    <Hotel className="h-3.5 w-3.5 text-pink-400" />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">
                      {pt.stepNumber}
                    </span>
                  )}
                  <span className="truncate max-w-[200px]">{pt.label}</span>
                </span>
                <span className="text-xs font-semibold text-emerald-400">
                  {pt.cost}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  GPS: {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                </span>
                <span className="flex items-center gap-1 text-indigo-300">
                  <Navigation className="h-3 w-3" />
                  {pt.transitLeg}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
