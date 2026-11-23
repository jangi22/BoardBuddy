import React from 'react';
import { 
  TrendingUp, 
  Star, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight 
} from 'lucide-react';
import { DeckStudentState } from '../../types';
import { T, SUB, C, acc } from '../../data/boardContent';
import { Badge } from '../common/ThemeAssets';

interface DeckProgressProps {
  S: DeckStudentState;
  save: (fn: (prev: DeckStudentState) => DeckStudentState) => void;
  go: (tab: string) => void;
}

export const DeckProgress: React.FC<DeckProgressProps> = ({ S, go }) => {
  const d = T.filter((t) => S.done[t.id]).length;
  const p = Math.round((d / T.length) * 100);

  const weakTopics = T.filter(
    (t) => acc(S, t) !== null && (acc(S, t) as number) < 0.7
  );

  return (
    <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1">
          <h1 className="font-heading text-3xl md:text-4xl text-[#16335A] tracking-normal leading-tight">
            My Progress
          </h1>
          <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
            Scores, completed topics, weak areas.
          </p>
        </div>
        <Badge size={52} />
      </div>

      {/* Overall Completion Card */}
      <div className="bg-[#16335A] rounded-3xl p-6 shadow-xl shadow-[#16335A]/15 text-white space-y-3">
        <span className="font-semibold text-xs tracking-wider uppercase text-[#A8D8B0] block">
          Overall completion
        </span>
        <div className="font-heading text-5xl md:text-6xl text-white tracking-tight">
          {p}%
        </div>
        <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#3E9B52] rounded-full transition-all duration-700"
            style={{ width: `${p}%` }}
          />
        </div>
      </div>

      {/* Subject Progress Cards */}
      <div className="space-y-3">
        {Object.keys(SUB).map((k) => {
          const ts = T.filter((t) => t.s === k);
          const dn = ts.filter((t) => S.done[t.id]).length;
          const tested = ts.filter((t) => S.res[t.id]);
          const sc = tested.length
            ? Math.round(
                (tested.reduce((a, t) => a + (acc(S, t) || 0), 0) /
                  tested.length) *
                  100
              )
            : null;

          return (
            <div
              key={k}
              className="bg-white rounded-2xl p-4 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 space-y-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#16335A] text-sm md:text-base">
                  {SUB[k]}
                </h3>
                <span
                  className={`font-bold text-sm md:text-base ${
                    sc !== null && sc < 70 ? 'text-[#D9534F]' : 'text-[#3E9B52]'
                  }`}
                >
                  {sc === null ? '—' : `${sc}%`}
                </span>
              </div>

              <div className="w-full h-2 bg-[#D5E2F2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3E9B52] rounded-full transition-all duration-500"
                  style={{ width: `${(dn / ts.length) * 100}%` }}
                />
              </div>

              <span className="text-xs text-[#6B7C93] block">
                {dn} of {ts.length} topics done
              </span>
            </div>
          );
        })}
      </div>

      {/* Weak Areas Card */}
      <div className="bg-[#E6F4E9] rounded-2xl p-4 border border-[#3E9B52]/30 space-y-2">
        <h3 className="font-bold text-[#16335A] text-sm">Weak areas</h3>
        {weakTopics.length > 0 ? (
          <div className="space-y-1.5">
            {weakTopics.map((t) => (
              <p
                key={t.id}
                className="text-xs text-[#1B2A41] flex items-center gap-1.5"
              >
                <span className="text-[#D9534F] font-bold">•</span>
                <span className="font-medium">{t.title}</span>
                <span className="text-[#D9534F] font-semibold">
                  ({Math.round((acc(S, t) || 0) * 100)}%)
                </span>
              </p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#1B2A41]">
            None yet. Take a practice set to find them.
          </p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => go('up')}
        className="w-full py-3.5 px-4 bg-[#16335A] hover:bg-[#1F4478] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#16335A]/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Star className="w-4 h-4 text-[#E8C77A] fill-[#E8C77A]" />
        <span>{S.premium ? 'Premium active' : 'Upgrade to Premium'}</span>
      </button>
    </div>
  );
};
