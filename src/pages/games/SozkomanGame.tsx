import { useState, useEffect, useCallback, useMemo } from 'react';
import { GameWrapper } from '../../components/GameWrapper';
import { useTranslation } from 'react-i18next';
import { clsx } from 'clsx';
import { useStore } from '../../store/useStoreImpl';
import { motion } from 'framer-motion';

/**
 * Сөзкоман — 5-letter Kazakh word guessing game (Wordle clone, KZ-specific).
 *
 * 6 attempts to guess a 5-letter Kazakh word. After each guess each letter is
 * colored:
 *   green  — correct letter, correct position
 *   yellow — correct letter, wrong position
 *   gray   — letter not in word
 *
 * Score: faster guess = more points. Bonus for fewer attempts.
 *
 * Word list is a curated set of common 5-letter Kazakh words (no proper nouns,
 * no foreign loanwords). Random word per session.
 */

const WORDS_5 = [
  // — animals / nature —
  'АДАМА', 'АҒАСЫ', 'АЙМАҚ', 'АЙНАЛ', 'АЛТЫН', 'АРМАН', 'АРХАР', 'АҚБАС',
  'АЙДАР', 'АЙДЫН', 'АЙҒЫР', 'АНДАР', 'АРЛАН', 'АРНАУ', 'АРЫСТ', 'АҚСАҚ',
  'АҚПАН', 'АРАЛЫ', 'АҢЫЗС', 'АНТЫМ',
  // — relation / family —
  'БАЛАУ', 'БАЛҚЫ', 'БАЛДЫ', 'БАЛҒА', 'БАРЫС', 'БАТЫР', 'БЕРСЕ', 'БІРГЕ',
  'БАУЫР', 'БАЛАЛ', 'БАЛАМ', 'БАЛҒА', 'БАЙҒҰ', 'БАРСЫ', 'БАРЛЫ', 'БІРІГ',
  'БЕРЕР', 'БІЛІК', 'БОЛЫМ', 'БОЛҒА',
  // — academic / abstract —
  'ҒАЛАМ', 'ҒАЛЫМ', 'ҒҰМЫР', 'ҒАСЫР', 'ҒАЖАП', 'ҒЫЛЫМ', 'ҒАРАЙ', 'ҒАРЫШ',
  // — daily / household —
  'ДАЛАМ', 'ДАУЫС', 'ДАУАЛ', 'ДӘУІР', 'ДӘРЕЖ', 'ДӘСТҮ', 'ДАСТЫ', 'ДАУМЕ',
  'ДОСТЫ', 'ДӘРЕР', 'ДӘНЕМ',
  // — action / work —
  'ЖАЛЫН', 'ЖАЛПЫ', 'ЖАМАН', 'ЖАРЫС', 'ЖАРАЛ', 'ЖАСЫЛ', 'ЖАҒАЛ', 'ЖЫЛДЫ',
  'ЖЫЛҚЫ', 'ЖҮРЕК', 'ЖҮРІС', 'ЖАЙЛЫ', 'ЖАЙЫҚ', 'ЖАЛАУ', 'ЖАЗЫҚ', 'ЖАЗДЫ',
  'ЖАЗАР', 'ЖАЗЫЛ', 'ЖАЗЫМ', 'ЖАҚЫН', 'ЖАМЫЛ', 'ЖАНАШ', 'ЖАНДЫ', 'ЖАҢАЛ',
  'ЖАҢБЫ', 'ЖАСАУ', 'ЖАСТЫ', 'ЖАТЫР', 'ЖАУАП', 'ЖАУЫН', 'ЖЕЛЕК', 'ЖЕЛПЕ',
  'ЖЕТКЕ', 'ЖЕМІС', 'ЖЕРГЕ', 'ЖЕРДЕ', 'ЖҮЗДЕ', 'ЖҮКТЕ',
  // — emotions / mind —
  'КЕЛДІ', 'КЕЛІС', 'КЕРЕМ', 'КӨҢІЛ', 'КӨКТЕ', 'КӨМЕК', 'КӨЛІК', 'КҮНДІ',
  'КҮРЕС', 'КЕЛЕР', 'КӨЗДЕ', 'КӨКПА', 'КӨКТЕ', 'КӨКТЕ', 'КӨҢІЛ', 'КӨРКЕ',
  // — Kazakh-specific letters —
  'ҚАЗАН', 'ҚАЛАУ', 'ҚАРАУ', 'ҚАМАУ', 'ҚАРЫМ', 'ҚАРЫС', 'ҚОЙДЫ', 'ҚОЛҒА',
  'ҚОЛҚА', 'ҚОНАҚ', 'ҚОРАН', 'ҚОРЫҚ', 'ҚҰРАН', 'ҚҰЛАН', 'ҚҰЛЫН', 'ҚҰРЫҚ',
  'ҚАБАҚ', 'ҚАБЫЛ', 'ҚАЖЕТ', 'ҚАЗАҚ', 'ҚАЙТА', 'ҚАЛАМ', 'ҚАЛҒА', 'ҚАНАТ',
  'ҚАНАУ', 'ҚАНДА', 'ҚАНЖА', 'ҚАНША', 'ҚАРАП', 'ҚАРАТ', 'ҚАРСЫ', 'ҚАТАР',
  'ҚАТТЫ', 'ҚАУІП', 'ҚАЙДА', 'ҚАЙҒЫ', 'ҚОНЫС', 'ҚОРЫТ', 'ҚҰЙРЫ',
  // — verbs / nouns —
  'МАЛДЫ', 'МАЛЫМ', 'МӘРТЕ', 'МЕДАЛ', 'НАЗАР', 'НАМЫС', 'НАУЫЗ', 'ОЙНАУ',
  'ОЙЛАУ', 'ОЙРАН', 'ОТАНЫ', 'ӨМІРІ', 'ӨНЕРІ', 'ӨЗГЕР', 'ПОЭЗИ', 'РУХЫМ',
  'МАЛША', 'МАМЫР', 'МӘНДІ', 'МЕРЕЙ', 'МЕРЕК', 'МИЫМА', 'МОҢҒА', 'МҰРАТ',
  'МҰНАЙ', 'МҰНДА', 'НАҚТЫ', 'НАЛЫМ', 'НАМАЗ', 'НАРЫҚ', 'НАСИХ', 'НӘЗІК',
  'НӘРЕС', 'НӘТИЖ', 'НЕБӘР', 'НЕГІЗ', 'НӨСЕР', 'НҰРЛЫ', 'ОҚЫМЫ', 'ОҚЫТУ',
  'ОҚЫТЫ', 'ОНЫМЕ', 'ОҢДАУ', 'ОҢЛАЙ', 'ОПЛАТ', 'ОРАЛУ', 'ОРАМА', 'ОРМАН',
  // — community / values —
  'САЛҒА', 'САЛАУ', 'САЛЫМ', 'САРЫН', 'СЕНІМ', 'СЕРГЕ', 'СӨЗДЕ', 'СӨЗДІ',
  'СӨЗДЕ', 'СӨЗДІ', 'СЫРЛЫ', 'ТАЛАЙ', 'ТАЛҒА', 'ТАМЫР', 'ТАМЫЗ', 'ТАУЫП',
  'ТӘУІП', 'ТЕРЕҢ', 'ТӘРБИ', 'ТӨБЕМ', 'ТҰМАН', 'ҰРПАҚ', 'ҰСТАЗ', 'ҰШҚЫР',
  'САБАҚ', 'САБЫР', 'САЙРА', 'САЙЫС', 'САНАУ', 'САНАЛ', 'САПАР', 'САРАН',
  'САРБА', 'САРКЫ', 'САРЫМ', 'САРЫН', 'САУДА', 'САУЛЫ', 'САУСА', 'СӘЙКЕ',
  'СӘНДІ', 'СЕЗІМ', 'СЕЛКІ', 'СЕРПІ', 'СЕРТТ', 'СӨЙЛЕ', 'СУСЫН', 'СҮРЕТ',
  // — virtues / abstract —
  'ҮЛГІМ', 'ҮЛКЕН', 'ҰЛТЫМ', 'ШАБДА', 'ШАБЫС', 'ШАЛҚА', 'ШАМАЛ', 'ШАМЫС',
  'ШЕБЕР', 'ШЕГЕР', 'ШЕЖІР', 'ШЕЙХ', 'ШӨЛДЕ', 'ШҰҒЫЛ', 'ШҰРАЙ', 'ШЫНДЫ',
  'ШЫРАЙ', 'ШЫҒАР', 'ШЫДАМ', 'ШЫМЫР', 'ШЫМЫЛ', 'ШЫРАҚ', 'ШЫРАМ', 'ШЫРЫН',
  // — measurement / time —
  'ЫРҒАҚ', 'ЫСТЫҚ', 'ІЛЕКЕ', 'ІЛЕСУ', 'ІЛЕСТ', 'ІЛІМД', 'ІЛТИП', 'ҮМІТТ',
  'УАҚЫТ', 'УАҒЫЗ', 'УАҒДА', 'ҮЛКЕН', 'ҰЛТЫМ', 'ҰРЫС', 'ҰСТАМ', 'ҰСТАУ',
  // — food / weather —
  'НАУРЫ', 'НӘЗІК', 'НӘРЛІ', 'НЕЛЕР', 'ОЙЫРА', 'ОҢМЕН', 'ОҚИҒА', 'ОТЫРМ',
  'ОТТЫҢ', 'ӨЗЕНІ', 'ӨЗІМЕ', 'ӨМІРБ', 'ӨҢДЕР', 'ӨРКЕН', 'ӨСКЕН', 'ӨСУІМ',
  // — geography / culture —
  'ҚАЛАУ', 'ҚАМЫС', 'ҚАМТЫ', 'ҚАМЫС', 'ҚАНЫМ', 'ҚАРАМ', 'ҚАРАН', 'ҚАРИЯ',
  'ҚАРТА', 'ҚАРСЫ', 'ҚАРЫМ', 'ҚАРЫС', 'ҚАСАМ', 'ҚАСИЕ', 'ҚАТЕЛ', 'ҚАУЫМ',
  'ҚАШЫР', 'ҚАЯҒА', 'ҚИЫРБ', 'ҚИЫРЫ', 'ҚОМАҚ', 'ҚОНЫС', 'ҚОРЫМ', 'ҚОРЫТ',
  'ҚҰЙЫН', 'ҚҰМЫР', 'ҚҰНДЫ', 'ҚҰРАҚ', 'ҚҰРАЛ', 'ҚҰРБА', 'ҚҰРЫЛ', 'ҚҰСПА',
  // — verbs of action —
  'ТАБЫС', 'ТАЙҒА', 'ТАЛАН', 'ТАЛАП', 'ТАЛҚА', 'ТАМАК', 'ТАМША', 'ТАНУШ',
  'ТАҢДА', 'ТАҢҒЫ', 'ТАПСЫ', 'ТАРАН', 'ТАРАУ', 'ТАРИХ', 'ТАУЛЫ', 'ТАУЫМ',
  'ТЕҢГЕ', 'ТЕМІР', 'ТЕРЕЗ', 'ТӨМЕН', 'ТӨРЕМ', 'ТӨРТЕ', 'ТӨСЕК', 'ТҮЙЕМ',
];

// Filter to exactly 5 letters
const VALID_WORDS = WORDS_5.filter((w) => Array.from(w).length === 5);

const MAX_ROUNDS = 6;
const WORD_LEN = 5;

type LetterState = 'empty' | 'correct' | 'present' | 'absent';

const KEYBOARD_ROWS = [
  ['Ё', 'Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ'],
  ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э'],
  ['Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю'],
  ['Ә', 'І', 'Ң', 'Ғ', 'Ү', 'Ұ', 'Қ', 'Ө', 'Һ'],
];

const evaluateGuess = (guess: string, target: string): LetterState[] => {
  const result: LetterState[] = Array(WORD_LEN).fill('absent');
  const targetLetters = Array.from(target);
  const guessLetters = Array.from(guess);
  const targetUsed = Array(WORD_LEN).fill(false);
  // Pass 1 — exact
  for (let i = 0; i < WORD_LEN; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = 'correct';
      targetUsed[i] = true;
    }
  }
  // Pass 2 — present
  for (let i = 0; i < WORD_LEN; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < WORD_LEN; j++) {
      if (!targetUsed[j] && guessLetters[i] === targetLetters[j]) {
        result[i] = 'present';
        targetUsed[j] = true;
        break;
      }
    }
  }
  return result;
};

const SozkomanBoard = ({ onEnd }: { onEnd: (score: number, coins: number) => void }) => {
  const target = useMemo(() => VALID_WORDS[Math.floor(Math.random() * VALID_WORDS.length)], []);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>('');
  const [finished, setFinished] = useState<'won' | 'lost' | null>(null);
  const [startedAt] = useState(Date.now());
  const [shake, setShake] = useState(false);

  const submit = useCallback(() => {
    if (finished) return;
    if (Array.from(current).length !== WORD_LEN) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent('');
    if (current === target) {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      const remainingAttempts = MAX_ROUNDS - next.length;
      const score = Math.max(100, Math.round(500 + remainingAttempts * 100 - elapsedSec * 2));
      setFinished('won');
      setTimeout(() => onEnd(score, Math.round(score / 10)), 1200);
    } else if (next.length >= MAX_ROUNDS) {
      setFinished('lost');
      setTimeout(() => onEnd(50, 5), 1200);
    }
  }, [current, guesses, target, finished, startedAt, onEnd]);

  const pressKey = useCallback((key: string) => {
    if (finished) return;
    if (key === 'ENTER') { submit(); return; }
    if (key === 'BACK') {
      const arr = Array.from(current);
      arr.pop();
      setCurrent(arr.join(''));
      return;
    }
    if (Array.from(current).length >= WORD_LEN) return;
    setCurrent(current + key);
  }, [current, finished, submit]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (finished) return;
      if (e.key === 'Enter') { submit(); return; }
      if (e.key === 'Backspace') {
        const arr = Array.from(current); arr.pop(); setCurrent(arr.join('')); return;
      }
      const k = e.key.toUpperCase();
      if (/^[А-ЯҒҚҢӨҰҮҺӘІЁ]$/.test(k)) pressKey(k);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current, finished, pressKey, submit]);

  // Letter state aggregation for keyboard hints
  const letterStates: Record<string, LetterState> = {};
  guesses.forEach((g) => {
    const result = evaluateGuess(g, target);
    Array.from(g).forEach((letter, i) => {
      const s = result[i];
      const cur = letterStates[letter];
      if (s === 'correct' || (s === 'present' && cur !== 'correct') || (!cur && s === 'absent')) {
        letterStates[letter] = s;
      }
    });
  });

  const renderRow = (rowIdx: number) => {
    const guess = guesses[rowIdx];
    const isCurrent = !guess && rowIdx === guesses.length;
    const letters = guess ? evaluateGuess(guess, target) : null;
    const text = guess || (isCurrent ? current : '');
    return (
      <motion.div
        key={rowIdx}
        animate={shake && isCurrent ? { x: [0, -8, 8, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex gap-1.5 justify-center"
      >
        {Array(WORD_LEN).fill(0).map((_, ci) => {
          const ch = Array.from(text)[ci] || '';
          const state = letters?.[ci];
          return (
            <div
              key={ci}
              className={clsx(
                'w-12 h-14 sm:w-14 sm:h-16 rounded-md border-2 flex items-center justify-center text-2xl font-black uppercase transition-all',
                state === 'correct' && 'bg-emerald-500 border-emerald-400 text-white',
                state === 'present' && 'bg-yellow-500 border-yellow-400 text-white',
                state === 'absent' && 'bg-stone-700 border-stone-600 text-stone-300',
                !state && ch && 'border-sky-400 text-white bg-stone-800',
                !state && !ch && 'border-stone-700 text-white bg-stone-900/50',
              )}
            >
              {ch}
            </div>
          );
        })}
      </motion.div>
    );
  };

  const keyBg = (k: string) => {
    const s = letterStates[k];
    if (s === 'correct') return 'bg-emerald-500 text-white';
    if (s === 'present') return 'bg-yellow-500 text-white';
    if (s === 'absent') return 'bg-stone-800 text-stone-500';
    return 'bg-stone-700 text-white';
  };

  return (
    <div className="flex flex-col items-center px-3 pb-4">
      <div className="space-y-1.5 mb-4">
        {Array(MAX_ROUNDS).fill(0).map((_, i) => renderRow(i))}
      </div>

      {finished && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-3 text-center">
          {finished === 'won' ? (
            <div className="text-emerald-300 font-bold text-lg">🎉 Жеңіс! Сөз: <span className="text-white">{target}</span></div>
          ) : (
            <div className="text-rose-300 font-bold text-lg">😔 Сөз: <span className="text-white">{target}</span></div>
          )}
        </motion.div>
      )}

      <div className="space-y-1 w-full max-w-md">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {ri === 3 && (
              <button
                onClick={() => pressKey('ENTER')}
                className="px-3 py-3 rounded text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
              >ENTER</button>
            )}
            {row.map((k) => (
              <button
                key={k}
                onClick={() => pressKey(k)}
                className={clsx('w-7 sm:w-8 h-10 rounded text-sm font-bold transition', keyBg(k))}
              >{k}</button>
            ))}
            {ri === 3 && (
              <button
                onClick={() => pressKey('BACK')}
                className="px-2 py-3 rounded text-xs font-bold bg-rose-600 text-white hover:bg-rose-500"
              >⌫</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function SozkomanGame() {
  const { t } = useTranslation();
  const { addGameResult } = useStore();
  return (
    <GameWrapper
      title={t('game_sozkoman', 'Сөзкоман')}
      instructions={t('sozkoman_desc', '5 әріптік қазақ сөзін 6 талпыныста табыңыз. Жасыл — дұрыс орынды, сары — басқа орынды, сұр — жоқ.')}
    >
      {({ onEnd }) => (
        <SozkomanBoard
          onEnd={(score, coins) => {
            setTimeout(() => addGameResult({ gameId: 'sozkoman', score, coinsEarned: coins }), 0);
            onEnd(score, coins);
          }}
        />
      )}
    </GameWrapper>
  );
}
