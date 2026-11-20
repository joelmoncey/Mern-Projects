import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Hotel,
  Star,
  MapPin,
  CheckCircle2,
  Sparkles,
  Wifi,
} from '../components/Icons';
import { useTrip } from '../context/TripContext';

export default function HotelsPage() {
  const { trip } = useOutletContext();
  const { selectHotel } = useTrip();

  const nights = Math.max(1, trip.days.length);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h2 className="text-base font-bold text-white">
          AI-Matched Hotels for {trip.destination} ({nights} Nights)
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Ranked by <strong>HotelMatcherNode</strong> based on proximity to your itinerary waypoints and target budget (${Number(trip.budget).toLocaleString()}). Selecting a hotel updates your Cost Calculator immediately.
        </p>
      </div>

      <div className="space-y-4">
        {trip.hotels.map((hotel) => {
          const isSelected = hotel.id === trip.selectedHotelId;
          const totalStayCost = hotel.pricePerNight * nights;

          return (
            <div
              key={hotel.id}
              className={`rounded-2xl border p-5 transition ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/25 shadow-lg shadow-indigo-950/40'
                  : 'border-slate-800 bg-slate-900/75 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                        hotel.tier === 'Budget'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : hotel.tier === 'Moderate'
                          ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {hotel.tier} Tier
                    </span>

                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      {hotel.rating} ({hotel.reviews} reviews)
                    </span>

                    {isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        <CheckCircle2 className="h-3 w-3" />
                        Active Selection
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white">{hotel.name}</h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                      {hotel.neighborhood}
                    </span>
                    <span>·</span>
                    <span>{hotel.distanceToCenter} from route centroid</span>
                  </div>
                </div>

                {/* Pricing & Select Button */}
                <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-white">
                      ${hotel.pricePerNight}
                      <span className="text-xs font-normal text-slate-400">
                        {' '}
                        / night
                      </span>
                    </div>
                    <div className="text-xs font-medium text-emerald-400">
                      ${totalStayCost.toLocaleString()} total ({nights} nights)
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSelected}
                    onClick={() => selectHotel(trip.id, hotel.id)}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                      isSelected
                        ? 'cursor-default border border-indigo-500/40 bg-indigo-500/20 text-indigo-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {isSelected ? 'Selected for Trip' : 'Select This Hotel'}
                  </button>
                </div>
              </div>

              {/* Amenities */}
              <div className="mt-4 flex flex-wrap gap-2">
                {hotel.amenities.map((amenity) => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300"
                  >
                    <Wifi className="h-3 w-3 text-indigo-400" />
                    {amenity}
                  </span>
                ))}
              </div>

              {/* AI Agent Recommendation Rationale */}
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-200">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                <div>
                  <strong className="text-indigo-300">LangGraph HotelNode Note:</strong>{' '}
                  {hotel.aiReason}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
