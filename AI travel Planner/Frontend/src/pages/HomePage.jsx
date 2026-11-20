import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Sparkles,
  Compass,
  Route,
  Hotel,
  Calculator,
  MessageSquareCode,
  ArrowRight,
} from '../components/Icons';
import { useTrip } from '../context/TripContext';

const PRESET_TRIPS = [
  {
    destination: 'Kyoto, Japan',
    budget: 2800,
    startDate: '2026-11-18',
    endDate: '2026-11-21',
    travelers: 2,
    travelStyle: 'Cultural & Foodie',
    tag: '3 Days · Temples & Night Markets',
  },
  {
    destination: 'Paris, France',
    budget: 3400,
    startDate: '2026-12-04',
    endDate: '2026-12-07',
    travelers: 2,
    travelStyle: 'Art & Romance',
    tag: '3 Days · Louvre, Marais & Seine',
  },
  {
    destination: 'Bali, Indonesia',
    budget: 2100,
    startDate: '2026-12-10',
    endDate: '2026-12-14',
    travelers: 2,
    travelStyle: 'Nature & Tropical',
    tag: '4 Days · Ubud Terraces & Uluwatu',
  },
];

const TRAVEL_STYLES = [
  'Balanced Explorer',
  'Cultural & Foodie',
  'Budget Backpacker',
  'Luxury & Relaxation',
  'Adventure & Outdoors',
];

export default function HomePage() {
  const navigate = useNavigate();
  const { createNewTrip } = useTrip();

  const [formData, setFormData] = useState({
    destination: 'Kyoto, Japan',
    budget: 2800,
    startDate: '2026-11-18',
    endDate: '2026-11-21',
    travelers: 2,
    travelStyle: 'Cultural & Foodie',
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const trip = await createNewTrip(formData);
    navigate(`/trip/${trip.id}/itinerary`);
  }

  async function handlePresetClick(preset) {
    setFormData(preset);
    const trip = await createNewTrip(preset);
    navigate(`/trip/${trip.id}/itinerary`);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Hero Section */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
        {/* Left Column: Pitch & Preset Trips */}
        <div className="lg:col-span-6 space-y-6">
          

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
            Plan complete trips with{' '}
            
              Autonomous Travel Agents
          
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Enter your destination,budget and location.We will <mark>plan</mark> for <mark>you</mark>.
          </p>

          {/* Quick-Launch Presets */}
          
          <div className="space-y-2.5 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Instant 1-Click Demo Destinations:
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {PRESET_TRIPS.map((preset) => (
                <button
                  key={preset.destination}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 text-left transition hover:border-indigo-500/60 hover:bg-slate-900"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white group-hover:text-indigo-300">
                        {preset.destination}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400" />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {preset.tag}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px]">
                    <span className="font-semibold text-emerald-400">
                      ${preset.budget.toLocaleString()} budget
                    </span>
                    <span className="text-slate-400">
                      {preset.travelers} pax
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4 Core Agent Capabilities */}
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
            {[
              {
                icon: Route,
                title: 'Route Maps',
                desc: 'Multi-stop daily coordinates & leg distances',
              },
              {
                icon: Hotel,
                title: 'Smart Hotels',
                desc: 'Budget, Mid & Luxury stays with 1-click swap',
              },
              {
                icon: Calculator,
                title: 'Cost Engine',
                desc: 'Live itemized budget vs. spend validation',
              },
              {
                icon: MessageSquareCode,
                title: 'Agent Chat',
                desc: 'Modify days, prices & stops via conversation',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3"
              >
                <item.icon className="h-4 w-4 text-indigo-400" />
                <div className="mt-1.5 text-xs font-semibold text-white">
                  {item.title}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Interactive Trip Builder Form */}
        <div className="lg:col-span-6">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl shadow-indigo-950/30"
          >
            <div className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Configure Your Trip Parameters
                </h2>
                <p className="text-xs text-slate-400">
                  Dispatches state to SupervisorAgent → Maps & Budget Graph
                </p>
              </div>
              <Compass className="h-6 w-6 text-indigo-400" />
            </div>

            <div className="space-y-4">
              {/* Destination */}
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Destination City or Country</span>
                </label>
                <input
                  type="text"
                  name="destination"
                  required
                  value={formData.destination}
                  onChange={handleChange}
                  placeholder="e.g., Kyoto, Japan or Paris, France or Reykjavik"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Check-in / Start Date</span>
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    value={formData.startDate}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Check-out / End Date</span>
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    value={formData.endDate}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Total Budget & Travelers */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                      Total Budget (USD)
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      ${Number(formData.budget).toLocaleString()}
                    </span>
                  </label>
                  <input
                    type="number"
                    name="budget"
                    min="400"
                    max="50000"
                    step="100"
                    required
                    value={formData.budget}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <Users className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Number of Travelers</span>
                  </label>
                  <input
                    type="number"
                    name="travelers"
                    min="1"
                    max="12"
                    required
                    value={formData.travelers}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Travel Style Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Preferred Travel Style
                </label>
                <div className="flex flex-wrap gap-2">
                  {TRAVEL_STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, travelStyle: style }))
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        formData.travelStyle === style
                          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-200'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:brightness-110"
              >
                <Sparkles className="h-4 w-4" />
                <span>Generate AI Itinerary, Route Map & Cost Plan</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
