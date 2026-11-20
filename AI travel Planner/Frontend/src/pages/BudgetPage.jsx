import React from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Plane,
  Hotel,
  Utensils,
  Ticket,
  Train,
  DollarSign,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
} from '../components/Icons';

export default function BudgetPage() {
  const { trip } = useOutletContext();
  const { costBreakdown } = trip;
  const total = Math.max(1, costBreakdown.total);

  const CATEGORIES = [
    {
      label: 'Flights & Long-Haul Transit',
      amount: costBreakdown.flights,
      icon: Plane,
      color: 'bg-indigo-500',
      note: `$${trip.flightEstimatePerPerson}/person roundtrip estimate × ${trip.travelers} travelers`,
    },
    {
      label: 'Hotel & Accommodation',
      amount: costBreakdown.accommodation,
      icon: Hotel,
      color: 'bg-violet-500',
      note: `${trip.days.length} nights at selected hotel tier`,
    },
    {
      label: 'Food & Local Dining',
      amount: costBreakdown.food,
      icon: Utensils,
      color: 'bg-emerald-500',
      note: `$${trip.dailyFoodPerPerson}/day per traveler × ${trip.days.length} days`,
    },
    {
      label: 'Activities & Attraction Tickets',
      amount: costBreakdown.activities,
      icon: Ticket,
      color: 'bg-cyan-500',
      note: `Sum of all scheduled itinerary stops for ${trip.travelers} travelers`,
    },
    {
      label: 'Local Metro, Bus & Transfers',
      amount: costBreakdown.transit,
      icon: Train,
      color: 'bg-amber-500',
      note: `$${trip.dailyTransitPerPerson}/day local Maps route transit pass`,
    },
  ];

  const isWithinBudget = costBreakdown.remainingBudget >= 0;

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Estimated Trip Cost</span>
            <DollarSign className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            ${costBreakdown.total.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Target Budget: ${Number(trip.budget).toLocaleString()}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Cost Per Traveler</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            ${costBreakdown.perPerson.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Split across {trip.travelers} traveler(s)
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Daily Burn Rate</span>
            <Calendar className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            ${costBreakdown.perDay.toLocaleString()}/day
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Across {trip.days.length} planned days
          </div>
        </div>
      </div>

      {/* Budget Health Banner */}
      <div
        className={`flex items-center justify-between rounded-2xl border p-4 ${
          isWithinBudget
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {isWithinBudget ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
          )}
          <div>
            <h4 className="text-sm font-bold text-white">
              {isWithinBudget
                ? `You are $${costBreakdown.remainingBudget.toLocaleString()} under your target budget!`
                : `You are $${Math.abs(costBreakdown.remainingBudget).toLocaleString()} over your target budget.`}
            </h4>
            <p className="text-xs opacity-90">
              {isWithinBudget
                ? 'You have buffer room to upgrade your hotel or add a culinary tour in the AI Chat.'
                : 'Tip: Ask the Trip Modification Agent in the right sidebar to "Make the trip cheaper" to auto-optimize.'}
            </p>
          </div>
        </div>
      </div>

      {/* Itemized Expense Breakdown */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
        <h3 className="text-base font-bold text-white">
          Itemized Cost Breakdown (Real-Time)
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Automatically recalculates when you swap hotels, delete stops, or modify via AI chat
        </p>

        <div className="mt-5 space-y-5">
          {CATEGORIES.map((cat) => {
            const pct = Math.round((cat.amount / total) * 100);
            return (
              <div key={cat.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-white">
                    <cat.icon className="h-4 w-4 text-indigo-400" />
                    {cat.label}
                  </span>
                  <span className="font-mono font-bold text-white">
                    ${cat.amount.toLocaleString()}{' '}
                    <span className="text-slate-400 font-normal">({pct}%)</span>
                  </span>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
                  <div
                    className={`h-full rounded-full ${cat.color} transition-all duration-500`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-400">{cat.note}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
