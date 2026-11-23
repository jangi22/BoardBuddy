import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Timer, 
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { DeckQuestionItem, DeckQuizResultLog } from '../../types';
import { T, C } from '../../data/boardContent';
import { Badge } from '../common/ThemeAssets';

interface DeckQuizProps {
  qs: DeckQuestionItem[];
  title: string;
  secs?: number;
  exitLabel?: string;
  onDone: (log: DeckQuizResultLog[]) => void;
  onExit: () => void;
}

export const DeckQuiz: React.FC<DeckQuizProps> = ({
  qs,
  title,
  secs,
  exitLabel,
  onDone,
  onExit,
}) => {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [log, setLog] = useState<DeckQuizResultLog[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(secs || 0);
  const [isFinished, setIsFinished] = useState(false);
  const hasSent = useRef(false);

  // Timer countdown
  useEffect(() => {
    if (!secs || isFinished) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secs, isFinished]);

  // Submit log when quiz ends
  useEffect(() => {
    if (isFinished && !hasSent.current) {
      hasSent.current = true;
      onDone(log);
    }
  }, [isFinished, log, onDone]);

  const currentQ = qs[index];

  const pickOption = (optIndex: number) => {
    if (picked !== null || !currentQ) return;
    setPicked(optIndex);
    const isCorrect = optIndex === currentQ.a;
    setLog((prev) => [
      ...prev,
      {
        t: currentQ.t,
        ok: isCorrect,
        q: currentQ.q,
        o: currentQ.o,
        a: currentQ.a,
        w: currentQ.w,
        pick: optIndex,
        at: Date.now(),
      },
    ]);
  };

  const nextQuestion = () => {
    if (index + 1 === qs.length) {
      setIsFinished(true);
    } else {
      setIndex((prev) => prev + 1);
      setPicked(null);
    }
  };

  // Results screen
  if (isFinished) {
    const correctCount = log.filter((x) => x.ok).length;
    const pct = Math.round((correctCount / qs.length) * 100);
    const weakTopicIds = Array.from(new Set(log.filter((x) => !x.ok).map((x) => x.t)));
    const weakTitles = weakTopicIds
      .map((id) => T.find((t) => t.id === id)?.title)
      .filter(Boolean) as string[];

    return (
      <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex-1">
            <h1 className="font-heading text-3xl md:text-4xl text-[#16335A] tracking-normal leading-tight">
              Results
            </h1>
            <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
              {title}
            </p>
          </div>
          <Badge size={52} />
        </div>

        {/* Big Score Card */}
        <div className="bg-[#16335A] rounded-3xl p-6 shadow-xl shadow-[#16335A]/15 text-white text-center">
          <span className="font-heading text-6xl md:text-7xl block tracking-tight">
            {correctCount}/{qs.length}
          </span>
          <span className="text-sm font-semibold text-[#A8D8B0] mt-1 block">
            {pct}% correct
            {log.length < qs.length
              ? ` · ${qs.length - log.length} unanswered`
              : ''}
          </span>
        </div>

        {/* Weak Topics Card */}
        <div className="bg-white rounded-2xl p-5 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60">
          <h3 className="font-bold text-[#16335A] text-base mb-2">
            {weakTitles.length
              ? 'Review these topics'
              : 'No weak topics here. Great job!'}
          </h3>
          {weakTitles.length > 0 ? (
            <ul className="space-y-1.5 mt-2">
              {weakTitles.map((w) => (
                <li
                  key={w}
                  className="flex items-center gap-2 text-xs md:text-sm text-[#1B2A41]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D9534F] shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#6B7C93]">
              You answered all topics accurately in this set.
            </p>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onExit}
          className="w-full py-3.5 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#3E9B52]/20 transition-all cursor-pointer"
        >
          {exitLabel || 'Back to practice'}
        </button>
      </div>
    );
  }

  // Active Quiz View
  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, '0');
  const timerDisplay = `${minutes}:${seconds}`;
  const progressPercent =
    ((index + (picked !== null ? 1 : 0)) / qs.length) * 100;

  return (
    <div className="space-y-6 pb-28 w-full px-4 sm:px-6 lg:px-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex-1">
          <h1 className="font-heading text-2xl md:text-3xl text-[#16335A] tracking-normal leading-tight">
            {title}
          </h1>
          <p className="text-xs md:text-sm text-[#6B7C93] font-medium mt-0.5">
            Question {index + 1} of {qs.length}
            {secs ? ` · ⏱ ${timerDisplay}` : ''}
          </p>
        </div>
        <Badge size={52} />
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-[#D5E2F2] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#3E9B52] rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-md shadow-[#16335A]/5 border border-[#D5E2F2]/60 space-y-4">
        <p className="font-bold text-[#16335A] text-base md:text-lg leading-snug">
          {currentQ.q}
        </p>

        {/* Options */}
        <div className="space-y-2.5 pt-1">
          {currentQ.o.map((option, optIdx) => {
            const isCorrect = picked !== null && optIdx === currentQ.a;
            const isWrong = picked === optIdx && optIdx !== currentQ.a;

            let borderAndBg =
              'border-[#D5E2F2] bg-white text-[#1B2A41] hover:border-[#16335A]/40';
            if (isCorrect) {
              borderAndBg =
                'border-[#3E9B52] bg-[#E6F4E9] text-[#1B2A41] font-semibold';
            } else if (isWrong) {
              borderAndBg =
                'border-[#D9534F] bg-[#FBE9E8] text-[#1B2A41] font-semibold';
            }

            return (
              <button
                key={optIdx}
                type="button"
                disabled={picked !== null}
                onClick={() => pickOption(optIdx)}
                className={`w-full p-3.5 rounded-2xl border-2 text-left text-xs md:text-sm transition-all flex items-center justify-between gap-3 cursor-pointer ${borderAndBg} ${
                  picked !== null ? 'cursor-default' : ''
                }`}
              >
                <span className="flex-1">{option}</span>
                {isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-[#3E9B52] shrink-0" />
                )}
                {isWrong && (
                  <XCircle className="w-5 h-5 text-[#D9534F] shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {picked !== null && (
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-[#D5E2F2]/80 text-xs md:text-sm text-[#6B7C93] leading-relaxed">
            <span className="font-semibold text-[#16335A] block mb-0.5">
              Explanation:
            </span>
            {currentQ.w}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="space-y-2.5">
        {picked !== null && (
          <button
            onClick={nextQuestion}
            className="w-full py-3.5 bg-[#3E9B52] hover:bg-[#348345] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#3E9B52]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {index + 1 === qs.length ? 'See results' : 'Next question'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onExit}
          className="w-full py-3 bg-white hover:bg-slate-50 border border-[#16335A] text-[#16335A] font-bold text-xs rounded-2xl transition-all cursor-pointer"
        >
          Quit practice
        </button>
      </div>
    </div>
  );
};
