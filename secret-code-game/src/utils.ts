import { GameConfig, GuessAttempt } from './types';

export function generateSecretCode(config: GameConfig): string[] {
  const code: string[] = [];
  const availableColors = [...config.colors];
  
  for (let i = 0; i < config.slots; i++) {
    if (config.allowDuplicates) {
      const randomIndex = Math.floor(Math.random() * availableColors.length);
      code.push(availableColors[randomIndex]);
    } else {
      const randomIndex = Math.floor(Math.random() * availableColors.length);
      code.push(availableColors[randomIndex]);
      availableColors.splice(randomIndex, 1);
    }
  }
  
  return code;
}

export function checkGuess(secretCode: string[], guess: string[]): GuessAttempt {
  let blackDots = 0;
  let whiteDots = 0;
  
  const secretCopy = [...secretCode];
  const guessCopy = [...guess];
  
  // Бірінші өткізілім: қара нүктелерді тексеру (тұрыс орында және түсі)
  for (let i = 0; i < secretCopy.length; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      blackDots++;
      secretCopy[i] = null;
      guessCopy[i] = null;
    }
  }
  
  // Екінші өткізілім: ақ нүктелерді тексеру (тұрыс түсі бар, бірақ орны қате)
  for (let i = 0; i < guessCopy.length; i++) {
    if (guessCopy[i] !== null) {
      const secretIndex = secretCopy.indexOf(guessCopy[i]);
      if (secretIndex !== -1) {
        whiteDots++;
        secretCopy[secretIndex] = null;
      }
    }
  }
  
  return { guess, blackDots, whiteDots };
}

export function calculateScore(attemptNumber: number, maxAttempts: number, timeRemaining?: number): number {
  let score = 0;
  
  // Негізгі ұпай: неғұрлым аз қадаммен тапса, соғұрлым көп ұпай
  const baseScore = Math.max(100, 1000 - (attemptNumber - 1) * 90);
  score += baseScore;
  
  // Қалған мүмкіндіктер үшін бонус
  const remainingAttempts = maxAttempts - attemptNumber;
  score += remainingAttempts * 50;
  
  // Қалған уақыт үшін бонус (егер уақыт шектеулі болса)
  if (timeRemaining !== undefined) {
    score += timeRemaining * 2;
  }
  
  return Math.round(score);
}

export function generateRestriction(config: GameConfig): string | null {
  if (config.level === 'easy') return null;
  
  const restrictions = [
    `Бұл қадамда ${config.colors[Math.floor(Math.random() * config.colors.length)]} түсті қолдануға тыйым салынады`,
    'Ортаңғы ұяшықта қайталанған түсті қолдануға болмайды',
    'Бірінші және соңғы ұяшықтағы түстер әр түрлі болуы тиіс'
  ];
  
  if (Math.random() < 0.3) { // 30% ықтималдылықпен шектеу қосу
    return restrictions[Math.floor(Math.random() * restrictions.length)];
  }
  
  return null;
}

export function isValidGuess(guess: string[], restriction: string | null, config: GameConfig): boolean {
  if (!restriction) return true;
  
  if (restriction.includes('тыйым салынады')) {
    const forbiddenColor = restriction.match(/(ольо|көкина|жасыл|сары|көкшілт|көкина|пинк|сын)/);
    if (forbiddenColor && guess.includes(forbiddenColor[0])) {
      return false;
    }
  }
  
  if (restriction.includes('ортанғы')) {
    const middleIndex = Math.floor(guess.length / 2);
    const middleColor = guess[middleIndex];
    const colorCounts = guess.filter(color => color === middleColor).length;
    if (colorCounts > 1) {
      return false;
    }
  }
  
  if (restriction.includes('бірінші және соқоны')) {
    if (guess[0] === guess[guess.length - 1]) {
      return false;
    }
  }
  
  return true;
}