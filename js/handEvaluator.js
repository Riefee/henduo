// 德州扑克牌型评估器 - Hand Evaluator (7 cards -> best 5)
const HAND_RANKS = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9
};

const HAND_NAMES = [
  '高牌', '一对', '两对', '三条', '顺子',
  '同花', '葫芦', '四条', '同花顺', '皇家同花顺'
];

function evaluateHand(cards) {
  // cards: array of 7 Card objects, return {rank, name, tiebreakers, bestCards}
  const allCombos = combinations(cards, 5);
  let best = null;

  for (const combo of allCombos) {
    const result = evaluateFive(combo);
    if (!best || compareHands(result, best) > 0) {
      best = result;
    }
  }
  return best;
}

function evaluateFive(cards) {
  const values = cards.map(c => c.value).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = checkStraight(values);
  const counts = getCounts(values);
  const countValues = Object.values(counts).sort((a, b) => b - a);

  let rank, tiebreakers;

  if (isFlush && isStraight) {
    // Royal flush or straight flush
    rank = (values[0] === 14 && values[4] === 10) ? HAND_RANKS.ROYAL_FLUSH : HAND_RANKS.STRAIGHT_FLUSH;
    tiebreakers = [straightHigh(values)];
  } else if (countValues[0] === 4) {
    rank = HAND_RANKS.FOUR_OF_A_KIND;
    const quad = findCountValue(counts, 4);
    const kicker = values.find(v => v !== quad);
    tiebreakers = [quad, kicker];
  } else if (countValues[0] === 3 && countValues[1] === 2) {
    rank = HAND_RANKS.FULL_HOUSE;
    const trip = findCountValue(counts, 3);
    const pair = findCountValue(counts, 2);
    tiebreakers = [trip, pair];
  } else if (isFlush) {
    rank = HAND_RANKS.FLUSH;
    tiebreakers = [...values];
  } else if (isStraight) {
    rank = HAND_RANKS.STRAIGHT;
    tiebreakers = [straightHigh(values)];
  } else if (countValues[0] === 3) {
    rank = HAND_RANKS.THREE_OF_A_KIND;
    const trip = findCountValue(counts, 3);
    const kickers = values.filter(v => v !== trip);
    tiebreakers = [trip, ...kickers];
  } else if (countValues[0] === 2 && countValues[1] === 2) {
    rank = HAND_RANKS.TWO_PAIR;
    const pairs = Object.entries(counts).filter(([v, c]) => c === 2).map(([v]) => parseInt(v)).sort((a, b) => b - a);
    const kicker = values.find(v => !pairs.includes(v));
    tiebreakers = [...pairs, kicker];
  } else if (countValues[0] === 2) {
    rank = HAND_RANKS.ONE_PAIR;
    const pair = findCountValue(counts, 2);
    const kickers = values.filter(v => v !== pair);
    tiebreakers = [pair, ...kickers];
  } else {
    rank = HAND_RANKS.HIGH_CARD;
    tiebreakers = [...values];
  }

  return { rank, name: HAND_NAMES[rank], tiebreakers };
}

function getCounts(values) {
  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  return counts;
}

function findCountValue(counts, target) {
  return parseInt(Object.entries(counts).find(([v, c]) => c === target)[0]);
}

function checkStraight(values) {
  const sorted = [...new Set(values)].sort((a, b) => b - a);
  if (sorted.length < 5) return false;
  // Check wheel (A-2-3-4-5)
  if (sorted.includes(14) && sorted.includes(5) && sorted.includes(4) &&
      sorted.includes(3) && sorted.includes(2)) return true;
  for (let i = 0; i <= sorted.length - 5; i++) {
    if (sorted[i] - sorted[i + 4] === 4) return true;
  }
  return false;
}

function straightHigh(values) {
  const sorted = [...new Set(values)].sort((a, b) => b - a);
  // Wheel case: A-2-3-4-5, high is 5
  if (sorted.includes(14) && sorted.includes(5) && sorted.includes(4) &&
      sorted.includes(3) && sorted.includes(2) &&
      !(sorted.includes(13) && sorted.includes(12) && sorted.includes(11) && sorted.includes(10))) {
    return 5;
  }
  for (let i = 0; i <= sorted.length - 5; i++) {
    if (sorted[i] - sorted[i + 4] === 4) return sorted[i];
  }
  return sorted[0];
}

function compareHands(a, b) {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const av = a.tiebreakers[i] || 0;
    const bv = b.tiebreakers[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

function combinations(arr, k) {
  const result = [];
  function helper(start, combo) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}
