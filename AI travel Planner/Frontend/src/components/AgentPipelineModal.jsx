import React from 'react';
import { CheckCircle2, Loader2, Cpu, ArrowRight } from './Icons';
import { useTrip } from '../context/TripContext';

export default function AgentPipelineModal() {
  const { isGenerating, agentStepIndex, AGENT_STEPS } = useTrip();

  if (!isGenerating) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-2xl border border-indigo-500/30 bg-slate-900 p-6 shadow-2xl shadow-indigo-950/60">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
            <Cpu className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              LangGraph.js Orchestrator Running
            </h3>
            <p className="text-xs text-slate-400">
              Executing stateful travel planning nodes & Maps route optimization
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {AGENT_STEPS.map((step, idx) => {
            const isDone = idx < agentStepIndex;
            const isCurrent = idx === agentStepIndex;

            return (
              <div
                key={step.node}
                className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                  isCurrent
                    ? 'border-indigo-500/50 bg-indigo-500/10 text-white'
                    : isDone
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-slate-300'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500'
                }`}
              >
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-slate-700" />
                  )}
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-1.5 font-mono font-semibold text-indigo-300">
                    <span>[{step.node}]</span>
                    {isCurrent && (
                      <ArrowRight className="h-3 w-3 text-indigo-400 animate-bounce" />
                    )}
                  </div>
                  <p className="mt-0.5 text-slate-300">{step.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
