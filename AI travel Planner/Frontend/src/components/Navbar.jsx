import { NavLink, Link } from 'react-router-dom';
import { Sparkles, FolderHeart, MapPin, Cpu } from './Icons';
import { useTrip } from '../context/TripContext';
import yathraLogo from '../assets/Yathra_ Explore, Discover, Travel.png';

export default function Navbar() {
  const { activeTrip, trips } = useTrip();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-amber-100 backdrop-blur-md ">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex shrink-0 items-center group">
          <img
            src={yathraLogo}
            alt="Yathra — Explore, Discover, Travel"
            className="h-12 w-32 object-fill transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`
            }
          >
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span>Trip Builder</span>
          </NavLink>

          {activeTrip && (
            <NavLink
              to={`/trip/${activeTrip.id}/itinerary`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition ${
                  isActive || window.location.pathname.startsWith('/trip/')
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`
              }
            >
              <MapPin className="h-4 w-4 text-emerald-400" />
              <span className="max-w-[130px] truncate">{activeTrip.destination}</span>
            </NavLink>
          )}

          <NavLink
            to="/saved"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`
            }
          >
            <FolderHeart className="h-4 w-4 text-pink-400" />
            <span>Saved Trips</span>
            {trips.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.2 text-[11px] text-slate-300">
                {trips.length}
              </span>
            )}
          </NavLink>
        </nav>

       
        
      </div>
    </header>
  );
}
