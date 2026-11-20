import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TripProvider } from './context/TripContext';
import Navbar from './components/Navbar';
import AgentPipelineModal from './components/AgentPipelineModal';
import HomePage from './pages/HomePage';
import TripLayout from './pages/TripLayout';
import ItineraryPage from './pages/ItineraryPage';
import RouteMapPage from './pages/RouteMapPage';
import HotelsPage from './pages/HotelsPage';
import BudgetPage from './pages/BudgetPage';
import SavedTripsPage from './pages/SavedTripsPage';

export default function App() {
  return (
    <TripProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <Navbar />
        <AgentPipelineModal />
        <main className="flex-1">
          <Routes>
            {/* Landing / Trip Builder Form */}
            <Route path="/" element={<HomePage />} />

            {/* Nested Trip Workspace Routes */}
            <Route path="/trip/:tripId" element={<TripLayout />}>
              <Route index element={<Navigate to="itinerary" replace />} />
              <Route path="itinerary" element={<ItineraryPage />} />
              <Route path="map" element={<RouteMapPage />} />
              <Route path="hotels" element={<HotelsPage />} />
              <Route path="budget" element={<BudgetPage />} />
            </Route>

            {/* Saved Trips History */}
            <Route path="/saved" element={<SavedTripsPage />} />

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </TripProvider>
  );
}
