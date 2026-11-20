import React, { useEffect } from 'react';
import {
  Outlet,
  NavLink,
  useParams,
  Link,
} from 'react-router-dom';
import {
  Calendar,
  Users,
  DollarSign,
  Map,
  ListChecks,
  Hotel,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
} from '../components/Icons';
import { useTrip } from '../context/TripContext';
import AgentChatSidebar from '../components/AgentChatSidebar';

export default function TripLayout() {
  const { tripId } = useParams();
  const { trips, activeTrip, setActiveTripId } = useTrip();

  const trip = trips.find((t) => t.id === tripId) || activeTrip;

  useEffect(() => {
    if (trip && trip.id !== activeTrip?.id) {
      setActiveTripId(trip.id);
    }
  }, [trip, activeTrip, setActiveTripId]);

  if (!trip) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white">No Active Trip Found</h2>
        <p className="mt-2 text-sm text-slate-400">
          Start by entering your destination, dates, and budget on the Trip Builder page.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create a New Trip</span>
        </Link>
      </div>
    );
  }

  const selectedHotel =
    trip.hotels.find((h) => h.id === trip.selectedHotelId) || trip.hotels[0];
  const isWithinBudget = trip.costBreakdown.remainingBudget >= 0;

  const TABS = [
    {
      to: `/trip/${trip.id}/itinerary`,
      label: 'Itinerary Timeline',
      icon: ListChecks,
      badge: `${trip.days.length} Days`,
    },
    {
      to: `/trip/${trip.id}/map`,
      label: 'Route Map',
      icon: Map,
      badge: 'Waypoints',
    },
    {
      to: `/trip/${trip.id}/hotels`,
      label: 'Hotel Suggestions',
      icon: Hotel,
      badge: selectedHotel.tier,
    },
    {
      to: `/trip/${trip.id}/budget`,
      label: 'Cost Calculator',
      icon: PieChart,
      badge: `$${trip.costBreakdown.total.toLocaleString()}`,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Top Trip Summary Header */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-white">
                {trip.destination}
              </h1>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-0.5 text-xs font-medium text-indigo-300">
                {trip.travelStyle}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                {trip.startDate} → {trip.endDate} ({trip.days.length} days)
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-cyan-400" />
                {trip.travelers} Traveler(s)
              </span>
              <span className="flex items-center gap-1.5">
                <Hotel className="h-3.5 w-3.5 text-violet-400" />
                Stay: <strong className="text-white">{selectedHotel.name}</strong> (${selectedHotel.pricePerNight}/nt)
              </span>
            </div>
          </div>

          {/* Live Budget Status Pill */}
          <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-3">
            <div>
              <div className="text-[11px] text-slate-400">
                Estimated Total / Target Budget
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-white">
                  ${trip.costBreakdown.total.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">
                  / ${Number(trip.budget).toLocaleString()}
                </span>
              </div>
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                isWithinBudget
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {isWithinBudget ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>
                    ${trip.costBreakdown.remainingBudget.toLocaleString()} Under
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span>
                    ${Math.abs(trip.costBreakdown.remainingBudget).toLocaleString()} Over
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sub-Route Navigation Tabs (React Router DOM) */}
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-800 pt-4">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'bg-slate-950/70 text-slate-300 border border-slate-800 hover:border-slate-700 hover:text-white'
                }`
              }
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
              <span className="rounded-md bg-black/25 px-1.5 py-0.5 text-[10px]">
                {tab.badge}
              </span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Main Workspace Grid: Left 8 Cols = Active Route Outlet, Right 4 Cols = AI Chat */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Outlet context={{ trip }} />
        </div>
        <div className="lg:col-span-4">
          <AgentChatSidebar trip={trip} />
        </div>
      </div>
    </div>
  );
}
