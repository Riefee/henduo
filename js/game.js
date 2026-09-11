// 德州扑克主游戏逻辑 - Main Game Logic
const PHASES = {
  WAITING: 'waiting',
  PRE_FLOP: 'pre_flop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  HAND_OVER: 'hand_over'
};

const PHASE_NAMES = {
  pre_flop: '翻牌前',
  flop: '翻牌',
  turn: '转牌',
  river: '河牌',
  showdown: '摊牌',
  hand_over: '本手结束'
};

class Player {
  constructor(id, name, chips, isHuman, personality) {
    this.id = id;
    this.name = name;
    this.chips = chips;
    this.isHuman = isHuman;
    this.personality = personality || 'balanced';
    this.hand = [];
    this.currentBet = 0;
    this.totalBet = 0;
    this.folded = false;
    this.allIn = false;
    this.hasActed = false;
    this.lastAction = '';
    this.handResult = null;
  }

  resetForHand() {
    this.hand = [];
    this.currentBet = 0;
    this.totalBet = 0;
    this.folded = false;
    this.allIn = false;
    this.hasActed = false;
    this.lastAction = '';
    this.handResult = null;
  }
}

class PokerGame {
  constructor(ui) {
    this.ui = ui;
    this.deck = new Deck();
    this.communityCards = [];
    this.pot = 0;
    this.players = [];
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.dealerIndex = 0;
    this.currentPlayerIndex = 0;
    this.phase = PHASES.WAITING;
    this.handNumber = 0;
    this.startingChips = 1000;
    this.log = [];
  }

  init() {
    const aiNames = ['老比尔', '独眼杰克', '红头发汤姆', '疤面山姆'];
    const personalities = ['conservative', 'balanced', 'aggressive', 'balanced'];
    this.players = [
      new Player(0, '你', this.startingChips, true, null)
    ];
    for (let i = 0; i < 3; i++) {
      this.players.push(new Player(i + 1, aiNames[i], this.startingChips, false, personalities[i]));
    }
    this.ui.init(this);
    this.ui.updateAll();
    this.startHand();
  }

  startHand() {
    // 移除筹码为0的玩家
    this.players = this.players.filter(p => p.chips > 0);
    if (this.players.length < 2) {
      this.ui.showMessage('游戏结束！');
      return;
    }

    this.handNumber++;
    this.deck.reset();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.minRaise = this.bigBlind;

    for (const p of this.players) p.resetForHand();

    // 发牌
    for (let i = 0; i < 2; i++) {
      for (const p of this.players) {
        p.hand.push(this.deck.draw());
      }
    }

    // 设置盲注
    const sbIndex = (this.dealerIndex + 1) % this.players.length;
    const bbIndex = (this.dealerIndex + 2) % this.players.length;

    const sbAmount = Math.min(this.smallBlind, this.players[sbIndex].chips);
    this.players[sbIndex].chips -= sbAmount;
    this.players[sbIndex].currentBet = sbAmount;
    this.players[sbIndex].totalBet = sbAmount;

    const bbAmount = Math.min(this.bigBlind, this.players[bbIndex].chips);
    this.players[bbIndex].chips -= bbAmount;
    this.players[bbIndex].currentBet = bbAmount;
    this.players[bbIndex].totalBet = bbAmount;

    this.pot = sbAmount + bbAmount;
    this.currentBet = this.bigBlind;

    this.addLog(`第 ${this.handNumber} 手开始`);
    this.addLog(`${this.players[sbIndex].name} 下小盲 $${sbAmount}, ${this.players[bbIndex].name} 下大盲 $${bbAmount}`);

    this.phase = PHASES.PRE_FLOP;
    // UTG: 大盲之后第一个玩家
    this.currentPlayerIndex = (bbIndex + 1) % this.players.length;

    this.ui.updateAll();
    this.ui.showPhase(PHASE_NAMES[this.phase]);
    this.nextAction();
  }

  nextAction() {
    if (this.isBettingRoundComplete()) {
      this.advancePhase();
      return;
    }

    const player = this.players[this.currentPlayerIndex];
    if (player.folded || player.allIn) {
      this.advanceTurn();
      return;
    }

    if (player.isHuman) {
      this.ui.enableActions(player);
    } else {
      this.ui.disableActions();
      setTimeout(() => this.aiAct(player), 800 + Math.random() * 700);
    }
  }

  isBettingRoundComplete() {
    const activePlayers = this.players.filter(p => !p.folded && !p.allIn);
    if (activePlayers.length <= 1) return true;

    const allMatched = activePlayers.every(p => p.currentBet === this.currentBet);
    const allActed = activePlayers.every(p => p.hasActed);
    return allMatched && allActed;
  }

  advanceTurn() {
    const activePlayers = this.players.filter(p => !p.folded && !p.allIn);
    if (activePlayers.length <= 1) {
      this.advancePhase();
      return;
    }
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.nextAction();
  }

  advancePhase() {
    // 重置当前轮下注
    for (const p of this.players) {
      p.currentBet = 0;
      p.hasActed = false;
    }
    this.currentBet = 0;
    this.minRaise = this.bigBlind;

    if (this.players.filter(p => !p.folded).length <= 1) {
      this.endHand();
      return;
    }

    switch (this.phase) {
      case PHASES.PRE_FLOP:
        this.phase = PHASES.FLOP;
        for (let i = 0; i < 3; i++) this.communityCards.push(this.deck.draw());
        break;
      case PHASES.FLOP:
        this.phase = PHASES.TURN;
        this.communityCards.push(this.deck.draw());
        break;
      case PHASES.TURN:
        this.phase = PHASES.RIVER;
        this.communityCards.push(this.deck.draw());
        break;
      case PHASES.RIVER:
        this.endHand();
        return;
      default:
        return;
    }

    this.addLog(`--- ${PHASE_NAMES[this.phase]} ---`);
    this.ui.updateAll();
    this.ui.showPhase(PHASE_NAMES[this.phase]);

    // 翻牌后从小盲位置开始
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
    // 找到第一个未弃牌未全押的玩家
    let safety = 0;
    while ((this.players[this.currentPlayerIndex].folded || this.players[this.currentPlayerIndex].allIn) && safety < this.players.length) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
      safety++;
    }
    this.nextAction();
  }

  aiAct(player) {
    const decision = aiDecide(player, {
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      pot: this.pot,
      personality: player.personality,
      communityCards: this.communityCards
    });

    this.executeAction(player, decision.action, decision.amount);
  }

  executeAction(player, action, amount) {
    const toCall = this.currentBet - player.currentBet;

    switch (action) {
      case 'fold':
        player.folded = true;
        player.lastAction = '弃牌';
        this.addLog(`${player.name} 弃牌`);
        break;
      case 'check':
        player.hasActed = true;
        player.lastAction = '过牌';
        this.addLog(`${player.name} 过牌`);
        break;
      case 'call': {
        const callAmount = Math.min(toCall, player.chips);
        player.chips -= callAmount;
        player.currentBet += callAmount;
        player.totalBet += callAmount;
        this.pot += callAmount;
        player.hasActed = true;
        if (player.chips === 0) {
          player.allIn = true;
          player.lastAction = '全押';
          this.addLog(`${player.name} 全押 $${player.totalBet}`);
        } else {
          player.lastAction = `跟注 $${callAmount}`;
          this.addLog(`${player.name} 跟注 $${callAmount}`);
        }
        break;
      }
      case 'raise': {
        const previousBet = this.currentBet;
        const totalBet = Math.min(amount, player.chips + player.currentBet);
        const actualAdd = totalBet - player.currentBet;
        player.chips -= actualAdd;
        player.currentBet = totalBet;
        player.totalBet += actualAdd;
        this.pot += actualAdd;
        this.currentBet = totalBet;
        const raiseSize = totalBet - previousBet;
        this.minRaise = Math.max(this.minRaise, raiseSize);
        // 重置其他玩家的 acted 状态
        for (const p of this.players) {
          if (!p.folded && !p.allIn && p.id !== player.id) p.hasActed = false;
        }
        player.hasActed = true;
        if (player.chips === 0) {
          player.allIn = true;
          player.lastAction = '全押';
          this.addLog(`${player.name} 全押 $${player.totalBet}`);
        } else {
          player.lastAction = `加注到 $${totalBet}`;
          this.addLog(`${player.name} 加注到 $${totalBet}`);
        }
        break;
      }
    }

    this.ui.updateAll();
    this.advanceTurn();
  }

  endHand() {
    this.phase = PHASES.SHOWDOWN;
    const remaining = this.players.filter(p => !p.folded);

    if (remaining.length === 1) {
      const winner = remaining[0];
      winner.chips += this.pot;
      this.addLog(`${winner.name} 赢得 $${this.pot}（其他玩家弃牌）`);
      winner.handResult = { won: this.pot };
      this.ui.showWinner([winner], this.pot, false);
    } else {
      // 摊牌
      const results = remaining.map(p => ({
        player: p,
        hand: evaluateHand([...p.hand, ...this.communityCards])
      }));
      results.sort((a, b) => compareHands(b.hand, a.hand));
      const bestRank = results[0].hand;
      const winners = results.filter(r => compareHands(r.hand, bestRank) === 0);
      const share = Math.floor(this.pot / winners.length);
      const remainder = this.pot - share * winners.length;

      for (let i = 0; i < winners.length; i++) {
        const amt = share + (i === 0 ? remainder : 0);
        winners[i].player.chips += amt;
        winners[i].player.handResult = { won: amt, hand: winners[i].hand };
        this.addLog(`${winners[i].player.name} 以「${winners[i].hand.name}」赢得 $${amt}`);
      }
      this.ui.showWinner(winners.map(w => w.player), this.pot, true);
    }

    this.phase = PHASES.HAND_OVER;
    this.ui.updateAll();
    this.ui.disableActions();

    setTimeout(() => {
      // 移动庄家位
      if (this.players.length > 0) {
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
      }
      this.startHand();
    }, 3500);
  }

  addLog(msg) {
    this.log.push(msg);
    if (this.log.length > 50) this.log.shift();
    this.ui.updateLog();
  }
}
