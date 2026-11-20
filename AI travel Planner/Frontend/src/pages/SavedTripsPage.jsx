import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Trash2,
  ArrowRight,
  PlusCircle,
  Users,
} from '../components/Icons';
import { useTrip } from '../context/TripContext';

export default function SavedTripsPage() {
  const { trips, setActiveTripId, deleteTrip } = useTrip();
  const navigate = useNavigate();

  function handleOpenTrip(tripId) {
    setActiveTripId(tripId);
    navigate(`/trip/${tripId}/itinerary`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white">
            Saved AI Itineraries
          </h1>
          <p className="text-xs text-slate-400">
            Reopen any trip to continue modifying routes, hotels, or budgets via Agent Chat
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Plan New Trip</span>
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <p className="text-sm text-slate-300">
            You haven't generated any trips yet.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500"
          >
            Generate Your First Itinerary
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-indigo-500/50"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-base font-bold text-white">
                      {trip.destination}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteTrip(trip.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                    title="Delete Trip"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {trip.startDate} → {trip.endDate} ({trip.days.length} days)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {trip.travelers} Traveler(s) · {trip.travelStyle}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
                <div>
                  <div className="text-[10px] text-slate-400">
                    Calculated Cost / Budget
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    ${trip.costBreakdown.total.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / ${Number(trip.budget).toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenTrip(trip.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 px-3.5 py-2 text-xs font-bold text-indigo-200 hover:bg-indigo-600 hover:text-white transition"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
