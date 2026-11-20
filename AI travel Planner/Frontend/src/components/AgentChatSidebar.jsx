import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  Loader2,
  Wand2,
} from './Icons';
import { useTrip } from '../context/TripContext';

const QUICK_PROMPTS = [
  'Make the trip cheaper & switch to budget hotel',
  'Add a local street food tour on Day 2 evening',
  'Upgrade to a 5-star luxury hotel & VIP dinner',
  'Extend trip by 1 extra day with hidden gems',
];

export default function AgentChatSidebar({ trip }) {
  const { sendChatMessage, isChatLoading } = useTrip();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [trip?.chatHistory, isChatLoading]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;
    const text = input;
    setInput('');
    await sendChatMessage(trip.id, text);
  }

  async function handleQuickPrompt(promptText) {
    if (isChatLoading) return;
    await sendChatMessage(trip.id, promptText);
  }

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              Trip Modification Agent
            </h3>
            <p className="text-[11px] text-slate-400">
              Mutates itinerary, map & budget live
            </p>
          </div>
        </div>
        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
          State Synced
        </span>
      </div>

      {/* Quick Prompts */}
      <div className="border-b border-slate-800/80 bg-slate-950/40 px-3.5 py-2.5">
        <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-400">
          <Wand2 className="h-3 w-3 text-indigo-400" />
          <span>One-Click Agent Modifications:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isChatLoading}
              onClick={() => handleQuickPrompt(prompt)}
              className="rounded-lg border border-slate-700/80 bg-slate-900 px-2.5 py-1 text-left text-[11px] text-slate-300 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-200 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[460px] lg:max-h-[540px]">
        {trip.chatHistory.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isUser ? 'items-end' : 'items-start'
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                {isUser ? (
                  <>
                    <span>You</span>
                    <User className="h-3 w-3 text-slate-400" />
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    <span className="font-mono text-indigo-300">
                      {msg.agentNode || 'LangGraph Agent'}
                    </span>
                  </>
                )}
                <span>· {msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-xs'
                    : 'border border-slate-800 bg-slate-950/90 text-slate-200 rounded-bl-xs'
                }`}
              >
                <p>{msg.content}</p>

                {/* State Mutation Badges */}
                {msg.actionBadges && msg.actionBadges.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-slate-800 pt-2">
                    {msg.actionBadges.map((badge, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {badge}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isChatLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            <span>LangGraph nodes recalculating itinerary & route map...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-800 bg-slate-950/60 p-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Add a museum on Day 1 or lower hotel cost..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isChatLoading}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </aside>
  );
}
