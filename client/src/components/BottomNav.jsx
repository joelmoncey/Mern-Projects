import { Bell, Flame, PlusSquare, Trophy, User } from 'lucide-react';

export default function BottomNav({
  activeTab,
  onChangeTab,
  unreadCount = 0,
}) {
  const items = [
    { id: 'feed', label: 'Feed', icon: Flame },
    { id: 'create', label: 'Create', icon: PlusSquare },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: unreadCount },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-slate-200 bg-white/95 shadow-[0_-2px_10px_rgba(15,23,42,0.04)] backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-1.5 py-1.5">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChangeTab(id)}
              className={`relative flex min-w-[62px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium tracking-tight transition active:scale-95 ${
                isActive
                  ? 'bg-slate-900/5 font-bold text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? 'stroke-[2.35] text-slate-900' : 'stroke-[1.8]'
                  }`}
                />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0.5 h-1 w-4 rounded-full bg-slate-900" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
