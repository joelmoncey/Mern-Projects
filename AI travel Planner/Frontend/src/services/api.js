// API Service Layer for MERN + LangGraph.js Backend with Intelligent Local Agent Fallback

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Preset rich destination profiles with real coordinates for Route Map visualization
const DESTINATION_DB = {
  kyoto: {
    city: 'Kyoto, Japan',
    country: 'Japan',
    center: { lat: 35.0116, lng: 135.7681 },
    flightEstimate: 820,
    dailyFoodCost: 65,
    dailyTransitCost: 22,
    hotels: [
      {
        id: 'htl-kyoto-1',
        name: 'Piece Hostel Sanjo (Budget Pod & Boutique)',
        tier: 'Budget',
        pricePerNight: 68,
        rating: 4.7,
        reviews: 1420,
        neighborhood: 'Nakagyo Ward',
        distanceToCenter: '0.6 km',
        coords: { lat: 35.0052, lng: 135.7645 },
        amenities: ['Free Wi-Fi', 'Rooftop Lounge', 'Subway 4 min', 'Breakfast Add-on'],
        aiReason: 'Ranked #1 value in central Kyoto; keeps accommodation under 22% of total budget.',
      },
      {
        id: 'htl-kyoto-2',
        name: 'The Thousand Kyoto (Smart Mid-Range)',
        tier: 'Moderate',
        pricePerNight: 165,
        rating: 4.8,
        reviews: 980,
        neighborhood: 'Shimogyo Ward (Kyoto Station)',
        distanceToCenter: '1.2 km',
        coords: { lat: 34.9866, lng: 135.7604 },
        amenities: ['Spa & Onsen', 'Direct Station Access', 'Concierge', 'Tea Bar'],
        aiReason: 'Zero transit friction from Shinkansen hub; ideal balance of comfort and route efficiency.',
      },
      {
        id: 'htl-kyoto-3',
        name: 'Hoshinoya Kyoto Ryokan (Luxury Heritage)',
        tier: 'Luxury',
        pricePerNight: 420,
        rating: 4.9,
        reviews: 610,
        neighborhood: 'Arashiyama Riverside',
        distanceToCenter: '6.8 km',
        coords: { lat: 35.0118, lng: 135.6667 },
        amenities: ['Private Boat Check-in', 'Kaiseki Dining', 'River View', 'Zen Gardens'],
        aiReason: 'Iconic riverside sanctuary in Arashiyama with private boat transfer.',
      },
    ],
    spots: [
      { title: 'Fushimi Inari Taisha Dawn Walk', category: 'Culture', cost: 0, duration: '2.5 hrs', lat: 34.9671, lng: 135.7727, neighborhood: 'Fushimi', transitLeg: '15 min via JR Nara Line · 4.2 km', notes: 'Arrive before 7:30 AM to beat crowds at the Senbon Torii gates.' },
      { title: 'Nishiki Market Street Food Safari', category: 'Food & Dining', cost: 38, duration: '2 hrs', lat: 35.0050, lng: 135.7649, neighborhood: 'Downtown Kyoto', transitLeg: '18 min via Keihan Main Line · 4.8 km', notes: 'Sample matcha warabimochi, grilled sea bream skewers, and soy milk donuts.' },
      { title: 'Kiyomizu-dera & Higashiyama Lanes', category: 'Sightseeing', cost: 15, duration: '3 hrs', lat: 34.9949, lng: 135.7850, neighborhood: 'Higashiyama', transitLeg: '12 min bus / 1.9 km walk', notes: 'Walk down Sannenzaka and Ninenzaka preserved wooden alleys.' },
      { title: 'Arashiyama Bamboo Grove & Tenryu-ji', category: 'Nature', cost: 18, duration: '3 hrs', lat: 35.0169, lng: 135.6713, neighborhood: 'Arashiyama', transitLeg: '28 min via JR Sagano Line · 9.4 km', notes: 'Includes Zen landscape garden entry and Katsura River viewpoint.' },
      { title: 'Kinkaku-ji (Golden Pavilion) & Matcha Tea', category: 'Culture', cost: 24, duration: '2 hrs', lat: 35.0394, lng: 135.7292, neighborhood: 'Kita Ward', transitLeg: '22 min via Randen Tram & Bus · 6.1 km', notes: 'Gold-leaf Zen temple overlooking the Mirror Pond.' },
      { title: 'Gion Geisha District Twilight Tour', category: 'Nightlife', cost: 45, duration: '2.5 hrs', lat: 35.0037, lng: 135.7755, neighborhood: 'Gion', transitLeg: '25 min via Subway Karasuma · 5.7 km', notes: 'Guided walk along Hanamikoji Street and Shirakawa Canal.' },
      { title: 'Nijo Castle Nightingale Floors', category: 'History', cost: 16, duration: '2 hrs', lat: 35.0142, lng: 135.7482, neighborhood: 'Nakagyo', transitLeg: '14 min via Tozai Line · 2.6 km', notes: 'Explore Tokugawa Shogunate palace interiors and moat gardens.' },
      { title: 'Philosopher’s Path & Nanzen-ji Aqueduct', category: 'Nature', cost: 10, duration: '2.5 hrs', lat: 35.0268, lng: 135.7955, neighborhood: 'Sakyo Ward', transitLeg: '20 min via City Bus · 4.5 km', notes: 'Scenic canal walk lined with cherry and maple trees.' },
      { title: 'Pontocho Alley Izakaya Dinner', category: 'Food & Dining', cost: 55, duration: '2 hrs', lat: 35.0063, lng: 135.7712, neighborhood: 'Pontocho', transitLeg: '15 min walk along Kamogawa · 2.8 km', notes: 'Riverside yakitori and craft sake tasting.' },
    ],
  },
  paris: {
    city: 'Paris, France',
    country: 'France',
    center: { lat: 48.8566, lng: 2.3522 },
    flightEstimate: 640,
    dailyFoodCost: 75,
    dailyTransitCost: 18,
    hotels: [
      {
        id: 'htl-paris-1',
        name: 'Generator Paris Canal Saint-Martin',
        tier: 'Budget',
        pricePerNight: 85,
        rating: 4.5,
        reviews: 2150,
        neighborhood: '10th Arr. (Canal St-Martin)',
        distanceToCenter: '2.4 km',
        coords: { lat: 48.8781, lng: 2.3698 },
        amenities: ['Rooftop Terrace', 'Metro Colonel Fabien 1 min', 'Cafe & Bar'],
        aiReason: 'Best budget-friendly private rooms with Eiffel Tower rooftop views.',
      },
      {
        id: 'htl-paris-2',
        name: 'Hôtel Jeanne d’Arc Le Marais',
        tier: 'Moderate',
        pricePerNight: 195,
        rating: 4.8,
        reviews: 1120,
        neighborhood: '4th Arr. (Le Marais)',
        distanceToCenter: '0.8 km',
        coords: { lat: 48.8555, lng: 2.3612 },
        amenities: ['Boutique Bakery Breakfast', 'Walk to Seine', 'Air Conditioning'],
        aiReason: 'Central Le Marais location saves ~40 mins daily on metro transfers.',
      },
      {
        id: 'htl-paris-3',
        name: 'Pullman Paris Tour Eiffel',
        tier: 'Luxury',
        pricePerNight: 390,
        rating: 4.7,
        reviews: 1840,
        neighborhood: '15th Arr. (Champ de Mars)',
        distanceToCenter: '3.1 km',
        coords: { lat: 48.8556, lng: 2.2928 },
        amenities: ['Direct Tower Views', '24/7 Fitness', 'Fine Brasserie', 'Concierge'],
        aiReason: 'Steps from the Eiffel Tower and Seine river cruise docks.',
      },
    ],
    spots: [
      { title: 'Louvre Museum Masterpieces & Pyramid', category: 'Culture', cost: 24, duration: '3 hrs', lat: 48.8606, lng: 2.3376, neighborhood: '1st Arr.', transitLeg: '10 min via Metro Line 1 · 1.8 km', notes: 'Timed morning entry via Carrousel du Louvre underground entrance.' },
      { title: 'Le Marais Artisanal Bistro & Pastry Walk', category: 'Food & Dining', cost: 42, duration: '2 hrs', lat: 48.8575, lng: 2.3598, neighborhood: 'Le Marais', transitLeg: '14 min walk · 1.6 km', notes: 'Stop by Place des Vosges and historic rue des Rosiers.' },
      { title: 'Eiffel Tower Summit & Seine Sunset Cruise', category: 'Sightseeing', cost: 48, duration: '3 hrs', lat: 48.8584, lng: 2.2945, neighborhood: '7th Arr.', transitLeg: '22 min via RER C · 4.9 km', notes: 'Golden hour illumination at the top of every hour.' },
      { title: 'Musée d’Orsay Impressionist Gallery', category: 'Culture', cost: 18, duration: '2.5 hrs', lat: 48.8600, lng: 2.3266, neighborhood: 'Left Bank', transitLeg: '12 min via RER C · 2.4 km', notes: 'Monet, Van Gogh, and Degas inside a Beaux-Arts railway station.' },
      { title: 'Luxembourg Gardens & Latin Quarter Stroll', category: 'Nature', cost: 0, duration: '2 hrs', lat: 48.8462, lng: 2.3372, neighborhood: '6th Arr.', transitLeg: '15 min walk · 1.5 km', notes: 'Visit Shakespeare and Company bookstore en route.' },
      { title: 'Montmartre & Sacré-Cœur Basilica Evening', category: 'Nightlife', cost: 35, duration: '3 hrs', lat: 48.8867, lng: 2.3431, neighborhood: '18th Arr.', transitLeg: '24 min via Metro Line 12 · 4.6 km', notes: 'Panoramic city views followed by a classic French onion soup dinner.' },
    ],
  },
  bali: {
    city: 'Bali (Ubud & Uluwatu), Indonesia',
    country: 'Indonesia',
    center: { lat: -8.5069, lng: 115.2625 },
    flightEstimate: 780,
    dailyFoodCost: 35,
    dailyTransitCost: 18,
    hotels: [
      {
        id: 'htl-bali-1',
        name: 'Puri Garden Hotel & Hostel Ubud',
        tier: 'Budget',
        pricePerNight: 42,
        rating: 4.8,
        reviews: 1650,
        neighborhood: 'Central Ubud',
        distanceToCenter: '0.5 km',
        coords: { lat: -8.5142, lng: 115.2638 },
        amenities: ['Tropical Pool', 'Daily Morning Yoga', 'Coworking Cafe'],
        aiReason: 'High-rated social sanctuary right on Jalan Pengosekan.',
      },
      {
        id: 'htl-bali-2',
        name: 'Alaya Resort Ubud (Eco Boutique)',
        tier: 'Moderate',
        pricePerNight: 125,
        rating: 4.9,
        reviews: 1320,
        neighborhood: 'Ubud Monkey Forest Rd',
        distanceToCenter: '0.4 km',
        coords: { lat: -8.5131, lng: 115.2614 },
        amenities: ['Rice Paddy Views', 'DaLa Spa', 'Infinity Pool', 'Breakfast Included'],
        aiReason: 'Luxury 5-star experience at mid-range pricing surrounded by rice terraces.',
      },
      {
        id: 'htl-bali-3',
        name: 'Six Senses Uluwatu Cliff Villa',
        tier: 'Luxury',
        pricePerNight: 360,
        rating: 4.9,
        reviews: 740,
        neighborhood: 'Pecatu, Uluwatu',
        distanceToCenter: '12.0 km',
        coords: { lat: -8.8456, lng: 115.1180 },
        amenities: ['Private Plunge Pool', 'Indian Ocean Cliff View', 'Holistic Spa'],
        aiReason: 'Unmatched oceanfront cliff suite with sunset infinity pools.',
      },
    ],
    spots: [
      { title: 'Tegallalang Rice Terrace Sunrise & Swing', category: 'Nature', cost: 18, duration: '2.5 hrs', lat: -8.4312, lng: 115.2792, neighborhood: 'North Ubud', transitLeg: '22 min scooter/driver · 9.5 km', notes: 'Explore Subak UNESCO irrigation paths in soft morning light.' },
      { title: 'Sacred Monkey Forest Sanctuary', category: 'Sightseeing', cost: 8, duration: '2 hrs', lat: -8.5188, lng: 115.2582, neighborhood: 'Ubud Center', transitLeg: '20 min drive · 10.2 km', notes: 'Ancient moss-covered nutmeg forest temples.' },
      { title: 'Campuhan Ridge Sunset Walk & Organic Dinner', category: 'Food & Dining', cost: 28, duration: '2.5 hrs', lat: -8.5036, lng: 115.2547, neighborhood: 'Ubud West', transitLeg: '8 min drive · 2.1 km', notes: 'Lush hilltop trail followed by Balinese bebek betutu dinner.' },
      { title: 'Tirta Empul Holy Water Purification', category: 'Culture', cost: 12, duration: '2 hrs', lat: -8.4157, lng: 115.3153, neighborhood: 'Tampak Siring', transitLeg: '30 min drive · 14.0 km', notes: '10th-century spring temple with traditional sarong rental.' },
      { title: 'Uluwatu Cliff Temple & Kecak Fire Dance', category: 'Nightlife', cost: 22, duration: '3 hrs', lat: -8.8291, lng: 115.0849, neighborhood: 'Uluwatu', transitLeg: '45 min coastal transfer · 24.5 km', notes: 'Dramatic cliffside amphitheater performance at sunset.' },
      { title: 'Jimbaran Bay Beachfront Seafood Grill', category: 'Food & Dining', cost: 36, duration: '2 hrs', lat: -8.7802, lng: 115.1636, neighborhood: 'Jimbaran', transitLeg: '25 min drive · 12.4 km', notes: 'Candlelit tables right on the sand with fresh grilled snapper.' },
    ],
  },
};

function buildCustomDestinationProfile(destinationName) {
  const lower = destinationName.toLowerCase();
  if (lower.includes('kyoto') || lower.includes('japan') || lower.includes('tokyo') || lower.includes('osaka')) {
    return { ...DESTINATION_DB.kyoto, city: destinationName };
  }
  if (lower.includes('paris') || lower.includes('france') || lower.includes('europe') || lower.includes('rome') || lower.includes('italy')) {
    return { ...DESTINATION_DB.paris, city: destinationName };
  }
  if (lower.includes('bali') || lower.includes('indonesia') || lower.includes('thailand') || lower.includes('phuket')) {
    return { ...DESTINATION_DB.bali, city: destinationName };
  }

  // Dynamic coordinate generator for any custom city worldwide
  const baseLat = 40.7128;
  const baseLng = -74.006;
  return {
    city: destinationName,
    country: 'Global Destination',
    center: { lat: baseLat, lng: baseLng },
    flightEstimate: 580,
    dailyFoodCost: 60,
    dailyTransitCost: 20,
    hotels: [
      {
        id: 'htl-custom-1',
        name: `Nomad Hub & Boutique Stay ${destinationName}`,
        tier: 'Budget',
        pricePerNight: 75,
        rating: 4.6,
        reviews: 840,
        neighborhood: 'Arts & Transit District',
        distanceToCenter: '0.9 km',
        coords: { lat: baseLat + 0.008, lng: baseLng - 0.006 },
        amenities: ['Fast Wi-Fi', 'Metro 3 min', '24h Self Check-in', 'Coffee Bar'],
        aiReason: 'Optimizes budget room so 45% more funds go toward local experiences.',
      },
      {
        id: 'htl-custom-2',
        name: `The Meridian Grand ${destinationName}`,
        tier: 'Moderate',
        pricePerNight: 160,
        rating: 4.8,
        reviews: 1290,
        neighborhood: 'Historic Downtown',
        distanceToCenter: '0.3 km',
        coords: { lat: baseLat - 0.004, lng: baseLng + 0.005 },
        amenities: ['Breakfast Included', 'Rooftop Lounge', 'Fitness Studio', 'Concierge'],
        aiReason: 'Located at the centroid of all Day 1–3 attractions to minimize transit time.',
      },
      {
        id: 'htl-custom-3',
        name: `Four Seasons & Heritage Palace ${destinationName}`,
        tier: 'Luxury',
        pricePerNight: 380,
        rating: 4.9,
        reviews: 530,
        neighborhood: 'Waterfront Promenade',
        distanceToCenter: '1.1 km',
        coords: { lat: baseLat + 0.012, lng: baseLng + 0.011 },
        amenities: ['Full Spa & Thermal Pool', 'Michelin Dining', 'Private Chauffeur'],
        aiReason: 'Premier 5-star flagship property with panoramic skyline views.',
      },
    ],
    spots: [
      { title: `${destinationName} Historic Old Town Walking Tour`, category: 'Culture', cost: 20, duration: '2.5 hrs', lat: baseLat + 0.011, lng: baseLng - 0.008, neighborhood: 'Old Quarter', transitLeg: '12 min via Metro · 2.4 km', notes: 'Guided architectural walk through iconic landmarks and plazas.' },
      { title: `Central Market & Artisanal Street Food Tasting`, category: 'Food & Dining', cost: 38, duration: '2 hrs', lat: baseLat + 0.004, lng: baseLng + 0.009, neighborhood: 'Market District', transitLeg: '10 min walk · 1.2 km', notes: 'Curated tasting of 6 regional specialties with local culinary host.' },
      { title: `National Museum & Skyline Observation Deck`, category: 'Sightseeing', cost: 32, duration: '3 hrs', lat: baseLat - 0.009, lng: baseLng - 0.004, neighborhood: 'Cultural Mile', transitLeg: '16 min via Express Tram · 3.8 km', notes: 'Skip-the-line afternoon pass timed for sunset photography.' },
      { title: `Botanical Waterfront Park & River Cruise`, category: 'Nature', cost: 28, duration: '2.5 hrs', lat: baseLat - 0.015, lng: baseLng + 0.012, neighborhood: 'Harborfront', transitLeg: '14 min transit · 3.1 km', notes: 'Relaxed scenic cruise connecting the north and south piers.' },
      { title: `Contemporary Art District & Craft Cocktail Evening`, category: 'Nightlife', cost: 48, duration: '2.5 hrs', lat: baseLat + 0.016, lng: baseLng + 0.004, neighborhood: 'Design District', transitLeg: '18 min metro · 4.2 km', notes: 'Gallery hop followed by rooftop dinner overlooking the city.' },
      { title: `Hidden Gems & Local Neighborhood Cafe Trail`, category: 'Culture', cost: 22, duration: '2 hrs', lat: baseLat - 0.005, lng: baseLng - 0.014, neighborhood: 'West End', transitLeg: '11 min bus · 2.0 km', notes: 'Explore independent bookstores, roasteries, and courtyards.' },
    ],
  };
}

/**
 * Recalculates all cost metrics for a trip whenever hotel, days, or activities change
 */
export function recalculateTripCosts(trip) {
  const nights = Math.max(1, trip.days.length);
  const travelers = Number(trip.travelers) || 2;
  const selectedHotel =
    trip.hotels.find((h) => h.id === trip.selectedHotelId) || trip.hotels[0];

  const hotelTotal = selectedHotel.pricePerNight * nights;
  const flightsTotal = trip.flightEstimatePerPerson * travelers;
  const activitiesTotal = trip.days.reduce((sum, day) => {
    return (
      sum +
      day.activities.reduce((daySum, act) => daySum + Number(act.cost || 0) * travelers, 0)
    );
  }, 0);
  const foodTotal = trip.dailyFoodPerPerson * nights * travelers;
  const transitTotal = trip.dailyTransitPerPerson * nights * travelers;
  const totalEstimated =
    hotelTotal + flightsTotal + activitiesTotal + foodTotal + transitTotal;

  return {
    ...trip,
    costBreakdown: {
      flights: flightsTotal,
      accommodation: hotelTotal,
      activities: activitiesTotal,
      food: foodTotal,
      transit: transitTotal,
      total: totalEstimated,
      perPerson: Math.round(totalEstimated / travelers),
      perDay: Math.round(totalEstimated / nights),
      remainingBudget: Number(trip.budget) - totalEstimated,
    },
  };
}

/**
 * Generates a complete Trip Object using MERN backend or Local Agentic Engine
 */
export async function generateTripItinerary(formData) {
  // 1. Try real MERN + LangGraph backend first
  try {
    const response = await fetch(`${API_BASE_URL}/agent/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Fallback to local LangGraph simulation when running frontend standalone
  }

  const profile = buildCustomDestinationProfile(formData.destination);
  const start = new Date(formData.startDate);
  const end = new Date(formData.endDate);
  const diffDays = Math.max(
    1,
    Math.min(7, Math.round((end - start) / (1000 * 60 * 60 * 24)) || 3)
  );

  // Pick initial hotel based on budget per day
  const budgetPerDay = Number(formData.budget) / diffDays;
  let initialHotel = profile.hotels[1]; // Moderate default
  if (budgetPerDay < 350) initialHotel = profile.hotels[0]; // Budget
  if (budgetPerDay > 800) initialHotel = profile.hotels[2]; // Luxury

  const slots = ['09:00 AM · Morning', '01:30 PM · Afternoon', '07:00 PM · Evening'];
  const days = Array.from({ length: diffDays }, (_, dayIdx) => {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + dayIdx);
    const dateStr = dayDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const dayActivities = [0, 1, 2].map((slotIdx) => {
      const spot =
        profile.spots[(dayIdx * 3 + slotIdx) % profile.spots.length];
      return {
        id: `act-${dayIdx + 1}-${slotIdx + 1}-${Date.now()}`,
        timeSlot: slots[slotIdx],
        title: spot.title,
        category: spot.category,
        cost: spot.cost,
        duration: spot.duration,
        lat: spot.lat + dayIdx * 0.0015,
        lng: spot.lng - dayIdx * 0.0012,
        neighborhood: spot.neighborhood,
        transitLeg: spot.transitLeg,
        notes: spot.notes,
      };
    });

    return {
      dayNumber: dayIdx + 1,
      dateLabel: dateStr,
      theme:
        dayIdx === 0
          ? 'Iconic Landmarks & Arrival Orientation'
          : dayIdx === 1
          ? 'Cultural Immersion & Culinary Trail'
          : `Scenic Routes & Neighborhood Discovery (Day ${dayIdx + 1})`,
      totalDistanceKm: Number((8.4 + dayIdx * 2.3).toFixed(1)),
      activities: dayActivities,
    };
  });

  const baseTrip = {
    id: `trip-${Date.now()}`,
    destination: profile.city,
    startDate: formData.startDate,
    endDate: formData.endDate,
    budget: Number(formData.budget) || 2500,
    travelers: Number(formData.travelers) || 2,
    travelStyle: formData.travelStyle || 'Balanced',
    center: profile.center,
    flightEstimatePerPerson: profile.flightEstimate,
    dailyFoodPerPerson: profile.dailyFoodCost,
    dailyTransitPerPerson: profile.dailyTransitCost,
    hotels: profile.hotels,
    selectedHotelId: initialHotel.id,
    days,
    chatHistory: [
      {
        id: 'msg-init-1',
        role: 'assistant',
        agentNode: 'Supervisor → Route & Budget Graph',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        content: `I've generated your ${diffDays}-day itinerary for **${profile.city}** with a target budget of **$${Number(formData.budget).toLocaleString()}** for ${formData.travelers} traveler(s). Ask me to adjust costs, swap activities, add food stops, or change hotels!`,
      },
    ],
  };

  return recalculateTripCosts(baseTrip);
}

/**
 * Processes an AI Chat message via LangGraph backend OR local state-mutating agent nodes
 */
export async function sendAgentChatModification(trip, userMessage) {
  try {
    const response = await fetch(`${API_BASE_URL}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: trip.id, trip, message: userMessage }),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Fallback to local stateful LangGraph node simulator
  }

  const lower = userMessage.toLowerCase();
  let updatedTrip = structuredClone(trip);
  let agentNode = 'ItineraryPlannerNode';
  let replyText = '';
  const actionBadges = [];

  // 1. Cheaper / Reduce Budget Command
  if (
    lower.includes('cheap') ||
    lower.includes('budget') ||
    lower.includes('save') ||
    lower.includes('reduce cost') ||
    lower.includes('lower')
  ) {
    agentNode = 'BudgetOptimizerNode → HotelSelectorNode';
    const budgetHotel = updatedTrip.hotels[0];
    updatedTrip.selectedHotelId = budgetHotel.id;
    updatedTrip.dailyFoodPerPerson = Math.max(25, Math.round(updatedTrip.dailyFoodPerPerson * 0.78));
    updatedTrip.days = updatedTrip.days.map((d) => ({
      ...d,
      activities: d.activities.map((a) => ({
        ...a,
        cost: a.cost > 20 ? Math.round(a.cost * 0.6) : a.cost,
      })),
    }));
    updatedTrip = recalculateTripCosts(updatedTrip);
    actionBadges.push(`Switched hotel to ${budgetHotel.name}`, 'Reduced activity & dining spend by ~22%');
    replyText = `Done! I routed your request through **BudgetOptimizerNode**: switched accommodation to **${budgetHotel.name}** ($${budgetHotel.pricePerNight}/night) and replaced high-ticket stops with low-cost local alternatives. Your new total is **$${updatedTrip.costBreakdown.total.toLocaleString()}**.`;
  }
  // 2. Luxury / Upgrade Command
  else if (lower.includes('luxury') || lower.includes('upgrade') || lower.includes('5-star') || lower.includes('vip')) {
    agentNode = 'HotelSelectorNode → ConciergeNode';
    const luxuryHotel = updatedTrip.hotels[updatedTrip.hotels.length - 1];
    updatedTrip.selectedHotelId = luxuryHotel.id;
    updatedTrip.days[0].activities[2] = {
      ...updatedTrip.days[0].activities[2],
      title: `Private Chef Tasting & Rooftop Lounge (${updatedTrip.destination})`,
      category: 'Food & Dining',
      cost: 125,
      notes: 'VIP window table reservation added by ConciergeNode.',
    };
    updatedTrip = recalculateTripCosts(updatedTrip);
    actionBadges.push(`Upgraded to ${luxuryHotel.name}`, 'Added VIP Rooftop Tasting on Day 1');
    replyText = `Upgraded! **HotelSelectorNode** booked **${luxuryHotel.name}** ($${luxuryHotel.pricePerNight}/night) and added a private chef tasting dinner on Day 1 evening. New total trip cost: **$${updatedTrip.costBreakdown.total.toLocaleString()}**.`;
  }
  // 3. Add Food / Nightlife / Ramen / Cafe Stop
  else if (lower.includes('food') || lower.includes('dinner') || lower.includes('cafe') || lower.includes('eat') || lower.includes('night')) {
    agentNode = 'CulinaryDiscoveryNode → MapsRouteNode';
    const targetDayIndex = lower.includes('day 2') && updatedTrip.days[1] ? 1 : 0;
    const newStop = {
      id: `act-chat-${Date.now()}`,
      timeSlot: '08:30 PM · Late Evening',
      title: `Secret Local Food Alley & Night Market Tour`,
      category: 'Food & Dining',
      cost: 34,
      duration: '2 hrs',
      lat: updatedTrip.center.lat + 0.006,
      lng: updatedTrip.center.lng - 0.005,
      neighborhood: 'Culinary Quarter',
      transitLeg: '9 min walk from previous stop · 0.8 km',
      notes: 'Added via AI Chat: includes 5 artisan street-food tastings.',
    };
    updatedTrip.days[targetDayIndex].activities.push(newStop);
    updatedTrip.days[targetDayIndex].totalDistanceKm = Number(
      (updatedTrip.days[targetDayIndex].totalDistanceKm + 0.8).toFixed(1)
    );
    updatedTrip = recalculateTripCosts(updatedTrip);
    actionBadges.push(`Added Food Tour to Day ${targetDayIndex + 1}`, 'Updated Route Map waypoints');
    replyText = `I've added **Secret Local Food Alley & Night Market Tour** ($34/person) to **Day ${targetDayIndex + 1}** and recalculated the walking route (+0.8 km). Check the Itinerary or Route Map tab to see the new pin!`;
  }
  // 4. Add an extra day
  else if (lower.includes('add a day') || lower.includes('extra day') || lower.includes('extend')) {
    agentNode = 'ItineraryPlannerNode → BudgetValidatorNode';
    const nextDayNum = updatedTrip.days.length + 1;
    updatedTrip.days.push({
      dayNumber: nextDayNum,
      dateLabel: `Day ${nextDayNum} (Extended)`,
      theme: 'Hidden Gems & Leisure Exploration',
      totalDistanceKm: 7.2,
      activities: [
        {
          id: `act-ext-1-${Date.now()}`,
          timeSlot: '10:00 AM · Morning',
          title: 'Artisanal Coffee Roastery & Panoramic Viewpoint',
          category: 'Sightseeing',
          cost: 15,
          duration: '2 hrs',
          lat: updatedTrip.center.lat + 0.014,
          lng: updatedTrip.center.lng + 0.009,
          neighborhood: 'Hilltop District',
          transitLeg: '15 min transit · 3.1 km',
          notes: 'Relaxed morning pace with 360-degree city views.',
        },
        {
          id: `act-ext-2-${Date.now()}`,
          timeSlot: '03:00 PM · Afternoon',
          title: 'Local Craft Market & Souvenir Shopping',
          category: 'Culture',
          cost: 30,
          duration: '2.5 hrs',
          lat: updatedTrip.center.lat - 0.007,
          lng: updatedTrip.center.lng + 0.011,
          neighborhood: 'Old Bazaar',
          transitLeg: '12 min tram · 2.4 km',
          notes: 'Tax-free artisan ceramics, textiles, and gifts.',
        },
      ],
    });
    updatedTrip = recalculateTripCosts(updatedTrip);
    actionBadges.push(`Extended trip to ${nextDayNum} days`, 'Recalculated hotel nights & budget');
    replyText = `Added **Day ${nextDayNum}** with a relaxed hidden-gems schedule and updated your hotel stay and cost breakdown accordingly!`;
  }
  // 5. General custom request
  else {
    agentNode = 'ItineraryPlannerNode → MapsRouteNode';
    const targetDayIndex =
      lower.includes('day 2') && updatedTrip.days[1]
        ? 1
        : lower.includes('day 3') && updatedTrip.days[2]
        ? 2
        : 0;
    const customTitle =
      userMessage.length > 48 ? `${userMessage.slice(0, 48)}...` : userMessage;
    updatedTrip.days[targetDayIndex].activities.push({
      id: `act-custom-${Date.now()}`,
      timeSlot: '04:30 PM · Custom Stop',
      title: `AI Custom Stop: ${customTitle}`,
      category: 'Custom Activity',
      cost: 25,
      duration: '2 hrs',
      lat: updatedTrip.center.lat + (Math.random() - 0.5) * 0.02,
      lng: updatedTrip.center.lng + (Math.random() - 0.5) * 0.02,
      neighborhood: 'Central District',
      transitLeg: '12 min via optimized route · 2.1 km',
      notes: `Added from chat request: "${userMessage}"`,
    });
    updatedTrip = recalculateTripCosts(updatedTrip);
    actionBadges.push(`Updated Day ${targetDayIndex + 1} schedule`, 'Recalculated route & costs');
    replyText = `I've updated **Day ${targetDayIndex + 1}** to include **"${customTitle}"**, plotted its coordinates on the Route Map, and updated the cost calculator.`;
  }

  const newAssistantMsg = {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    agentNode,
    actionBadges,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    content: replyText,
  };

  updatedTrip.chatHistory = [...updatedTrip.chatHistory, newAssistantMsg];
  return updatedTrip;
}
