import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  generateTripItinerary,
  recalculateTripCosts,
  sendAgentChatModification,
} from '../services/api';

const TripContext = createContext(null);

const STORAGE_KEY = 'voyagegraph_saved_trips_v1';

export function TripProvider({ children }) {
  const [trips, setTrips] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeTripId, setActiveTripId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStepIndex, setAgentStepIndex] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    } catch {
      // ignore storage quota errors
    }
  }, [trips]);

  const activeTrip = trips.find((t) => t.id === activeTripId) || trips[0] || null;

  // Simulated LangGraph.js multi-agent pipeline execution steps
  const AGENT_STEPS = [
    {
      node: 'SupervisorAgent',
      label: 'Parsing destination, travel dates & budget constraints...',
    },
    {
      node: 'GeoResearchNode',
      label: 'Querying top attractions, opening hours & neighborhood clusters...',
    },
    {
      node: 'MapsOptimizerNode',
      label: 'Computing shortest multi-stop daily routes via Maps API...',
    },
    {
      node: 'HotelMatcherNode',
      label: 'Filtering hotels by nightly budget tier & transit proximity...',
    },
    {
      node: 'CostCalculatorNode',
      label: 'Validating itemized expenses against total trip budget...',
    },
  ];

  async function createNewTrip(formData) {
    setIsGenerating(true);
    setAgentStepIndex(0);

    for (let i = 0; i < AGENT_STEPS.length; i++) {
      setAgentStepIndex(i);
      await new Promise((r) => setTimeout(r, 420));
    }

    const newTrip = await generateTripItinerary(formData);
    setTrips((prev) => [newTrip, ...prev]);
    setActiveTripId(newTrip.id);
    setIsGenerating(false);
    return newTrip;
  }

  function updateTripInState(updatedTrip) {
    setTrips((prev) =>
      prev.map((t) => (t.id === updatedTrip.id ? updatedTrip : t))
    );
  }

  function selectHotel(tripId, hotelId) {
    const target = trips.find((t) => t.id === tripId);
    if (!target) return;

    const chosenHotel = target.hotels.find((h) => h.id === hotelId);
    const updated = recalculateTripCosts({
      ...target,
      selectedHotelId: hotelId,
      chatHistory: [
        ...target.chatHistory,
        {
          id: `msg-hotel-${Date.now()}`,
          role: 'assistant',
          agentNode: 'HotelSelectorNode → CostCalculatorNode',
          actionBadges: [`Selected ${chosenHotel?.name}`],
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          content: `Updated your hotel to **${chosenHotel?.name}** ($${chosenHotel?.pricePerNight}/night). Total trip cost is now **$${recalculateTripCosts({ ...target, selectedHotelId: hotelId }).costBreakdown.total.toLocaleString()}**.`,
        },
      ],
    });
    updateTripInState(updated);
  }

  function deleteActivity(tripId, dayNumber, activityId) {
    const target = trips.find((t) => t.id === tripId);
    if (!target) return;

    const updatedDays = target.days.map((d) =>
      d.dayNumber === dayNumber
        ? {
            ...d,
            activities: d.activities.filter((a) => a.id !== activityId),
          }
        : d
    );
    const updated = recalculateTripCosts({ ...target, days: updatedDays });
    updateTripInState(updated);
  }

  function addCustomActivity(tripId, dayNumber, activityData) {
    const target = trips.find((t) => t.id === tripId);
    if (!target) return;

    const newAct = {
      id: `act-manual-${Date.now()}`,
      timeSlot: activityData.timeSlot || '03:30 PM · Afternoon',
      title: activityData.title,
      category: activityData.category || 'Sightseeing',
      cost: Number(activityData.cost) || 0,
      duration: activityData.duration || '2 hrs',
      lat: target.center.lat + (Math.random() - 0.5) * 0.018,
      lng: target.center.lng + (Math.random() - 0.5) * 0.018,
      neighborhood: activityData.neighborhood || 'City Center',
      transitLeg: '12 min via Maps route · 2.1 km',
      notes: activityData.notes || 'Added manually by user.',
    };

    const updatedDays = target.days.map((d) =>
      d.dayNumber === dayNumber
        ? { ...d, activities: [...d.activities, newAct] }
        : d
    );
    const updated = recalculateTripCosts({ ...target, days: updatedDays });
    updateTripInState(updated);
  }

  async function sendChatMessage(tripId, messageText) {
    const target = trips.find((t) => t.id === tripId);
    if (!target || !messageText.trim()) return;

    const userMsg = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      content: messageText,
    };

    const tripWithUserMsg = {
      ...target,
      chatHistory: [...target.chatHistory, userMsg],
    };
    updateTripInState(tripWithUserMsg);

    setIsChatLoading(true);
    await new Promise((r) => setTimeout(r, 650));
    const mutatedTrip = await sendAgentChatModification(
      tripWithUserMsg,
      messageText
    );
    updateTripInState(mutatedTrip);
    setIsChatLoading(false);
  }

  function deleteTrip(tripId) {
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
  }

  return (
    <TripContext.Provider
      value={{
        trips,
        activeTrip,
        setActiveTripId,
        isGenerating,
        agentStepIndex,
        AGENT_STEPS,
        isChatLoading,
        createNewTrip,
        selectHotel,
        deleteActivity,
        addCustomActivity,
        sendChatMessage,
        deleteTrip,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
}
