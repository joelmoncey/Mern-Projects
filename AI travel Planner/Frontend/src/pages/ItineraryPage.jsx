import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Navigation,
  Trash2,
  Plus,
  Sparkles,
} from '../components/Icons';
import { useTrip } from '../context/TripContext';

export default function ItineraryPage() {
  const { trip } = useOutletContext();
  const { deleteActivity, addCustomActivity } = useTrip();

  const [addingToDay, setAddingToDay] = useState(null);
  const [newStopForm, setNewStopForm] = useState({
    title: '',
    timeSlot: '04:00 PM · Afternoon',
    category: 'Sightseeing',
    cost: 20,
    neighborhood: 'Central District',
    notes: '',
  });

  function handleAddSubmit(e, dayNumber) {
    e.preventDefault();
    if (!newStopForm.title.trim()) return;
    addCustomActivity(trip.id, dayNumber, newStopForm);
    setNewStopForm({
      title: '',
      timeSlot: '04:00 PM · Afternoon',
      category: 'Sightseeing',
      cost: 20,
      neighborhood: 'Central District',
      notes: '',
    });
    setAddingToDay(null);
  }

  return (
    <div className="space-y-6">
      {trip.days.map((day) => (
        <div
          key={day.dayNumber}
          className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 shadow-md"
        >
          {/* Day Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white">
                  Day {day.dayNumber}
                </span>
                <span className="text-sm font-semibold text-slate-300">
                  {day.dateLabel}
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs font-medium text-indigo-300">
                  {day.theme}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-300">
                Route: <strong>{day.totalDistanceKm} km</strong>
              </span>
              <button
                type="button"
                onClick={() =>
                  setAddingToDay(
                    addingToDay === day.dayNumber ? null : day.dayNumber
                  )
                }
                className="flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Stop</span>
              </button>
            </div>
          </div>

          {/* Add Custom Activity Form */}
          {addingToDay === day.dayNumber && (
            <form
              onSubmit={(e) => handleAddSubmit(e, day.dayNumber)}
              className="mt-4 rounded-xl border border-indigo-500/30 bg-slate-950 p-4 space-y-3"
            >
              <div className="text-xs font-semibold text-indigo-300">
                Add Custom Activity to Day {day.dayNumber}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  required
                  placeholder="Activity title (e.g. Sunset Observatory)"
                  value={newStopForm.title}
                  onChange={(e) =>
                    setNewStopForm((p) => ({ ...p, title: e.target.value }))
                  }
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white sm:col-span-2"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Cost per person ($)"
                  value={newStopForm.cost}
                  onChange={(e) =>
                    setNewStopForm((p) => ({ ...p, cost: e.target.value }))
                  }
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingToDay(null)}
                  className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Save & Recalculate Route
                </button>
              </div>
            </form>
          )}

          {/* Activities Timeline */}
          <div className="mt-4 space-y-4">
            {day.activities.map((act, idx) => (
              <div key={act.id} className="relative pl-6">
                {/* Vertical connector line */}
                {idx < day.activities.length - 1 && (
                  <div className="absolute left-2.5 top-6 bottom-[-16px] w-0.5 bg-slate-800" />
                )}
                <div className="absolute left-1 top-1.5 h-3 w-3 rounded-full border-2 border-indigo-400 bg-slate-950" />

                <div className="rounded-xl border border-slate-800/90 bg-slate-950/70 p-4 transition hover:border-slate-700">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-medium text-indigo-300">
                          <Clock className="h-3 w-3" />
                          {act.timeSlot}
                        </span>
                        <span>·</span>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                          {act.category}
                        </span>
                        <span>·</span>
                        <span>{act.duration}</span>
                      </div>

                      <h4 className="mt-1 text-sm font-bold text-white">
                        {act.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300">
                        {act.cost === 0 ? 'Free' : `$${act.cost}/pax`}
                      </span>
                      <button
                        type="button"
                        title="Remove activity"
                        onClick={() =>
                          deleteActivity(trip.id, day.dayNumber, act.id)
                        }
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {act.notes}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-cyan-400" />
                      {act.neighborhood} ({act.lat.toFixed(3)}, {act.lng.toFixed(3)})
                    </span>
                    <span className="flex items-center gap-1 text-indigo-300">
                      <Navigation className="h-3 w-3" />
                      {act.transitLeg}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
