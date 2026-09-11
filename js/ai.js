// AI 对手逻辑 - AI Opponent Logic
// 基于手牌强度和位置做出决策

const AI_PERSONALITIES = {
  conservative: { name: '谨慎牛仔', aggression: 0.3, bluffRate: 0.05 },
  balanced: { name: '老练赌徒', aggression: 0.5, bluffRate: 0.12 },
  aggressive: { name: '狂野枪手', aggression: 0.75, bluffRate: 0.25 }
};

// 评估起手牌强度 (0-1)
function estimatePreflopStrength(holeCards) {
  const [c1, c2] = holeCards;
  const v1 = c1.value, v2 = c2.value;
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const isPair = v1 === v2;
  const isSuited = c1.suit === c2.suit;
  const gap = high - low;

  let strength = 0;

  if (isPair) {
    // 对子: 22=0.3, AA=1.0
    strength = 0.3 + (v1 - 2) * 0.055;
  } else {
    // 高牌点数基础
    strength = (high - 2) / 12 * 0.4 + (low - 2) / 12 * 0.2;
    // 同花加成
    if (isSuited) strength += 0.08;
    // 连牌加成 (小间隔)
    if (gap === 1) strength += 0.06;
    else if (gap === 2) strength += 0.03;
    // 高牌组合加成 (AK, AQ etc)
    if (high >= 12 && low >= 10) strength += 0.1;
  }

  return Math.min(1, Math.max(0, strength));
}

// 评估手牌+公共牌强度 (0-1)
function estimateHandStrength(holeCards, communityCards) {
  if (communityCards.length === 0) {
    return estimatePreflopStrength(holeCards);
  }

  const allCards = [...holeCards, ...communityCards];
  const evalResult = evaluateHand(allCards);

  // 基于牌型等级评分
  let base = evalResult.rank / 9; // 0 to 1
  // 牌型内强度微调
  const topKicker = evalResult.tiebreakers[0] || 0;
  base += (topKicker - 2) / 12 * 0.05;

  // 如果公共牌少，增加不确定性折扣
  const discount = communityCards.length / 5;
  base = base * (0.5 + 0.5 * discount);

  return Math.min(1, Math.max(0, base));
}

// AI 决策
function aiDecide(player, gameState) {
  const { currentBet, minRaise, pot, personality, communityCards } = gameState;
  const strength = estimateHandStrength(player.hand, communityCards);
  const aggro = AI_PERSONALITIES[personality].aggression;
  const bluffRate = AI_PERSONALITIES[personality].bluffRate;

  const toCall = currentBet - player.currentBet;
  const effectiveStrength = strength + (Math.random() - 0.5) * 0.15; // 随机因素

  // 诈唬
  if (Math.random() < bluffRate && toCall > 0) {
    const bluffAmount = Math.floor(player.chips * (0.3 + Math.random() * 0.4));
    if (bluffAmount > toCall + minRaise) {
      return { action: 'raise', amount: Math.min(bluffAmount, player.chips) };
    }
  }

  // 弃牌判断
  if (toCall > player.chips * 0.5 && effectiveStrength < 0.35) {
    return { action: 'fold' };
  }
  if (toCall > player.chips * 0.8 && effectiveStrength < 0.5) {
    return { action: 'fold' };
  }

  // 加注判断
  const raiseThreshold = 0.55 + (1 - aggro) * 0.2;
  if (effectiveStrength > raiseThreshold && player.chips > toCall + minRaise) {
    let raiseAmount;
    if (effectiveStrength > 0.85) {
      // 强牌：大注或全押
      raiseAmount = Math.floor(player.chips * (0.5 + Math.random() * 0.5));
    } else {
      raiseAmount = Math.floor(player.chips * (0.15 + Math.random() * 0.25));
    }
    raiseAmount = Math.max(raiseAmount, currentBet + minRaise);
    raiseAmount = Math.min(raiseAmount, player.chips);
    if (raiseAmount > currentBet) {
      return { action: 'raise', amount: raiseAmount };
    }
  }

  // 跟注或过牌
  if (toCall === 0) {
    return { action: 'check' };
  }
  if (effectiveStrength > 0.25 || toCall < player.chips * 0.15) {
    return { action: 'call' };
  }

  return { action: 'fold' };
}
