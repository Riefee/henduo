// UI 渲染与交互 - UI Rendering & Interaction
class UI {
  constructor() {
    this.game = null;
  }

  init(game) {
    this.game = game;
    this.bindActions();
  }

  bindActions() {
    document.getElementById('fold-btn').addEventListener('click', () => this.playerAction('fold'));
    document.getElementById('check-btn').addEventListener('click', () => this.playerAction('check'));
    document.getElementById('call-btn').addEventListener('click', () => this.playerAction('call'));
    document.getElementById('raise-btn').addEventListener('click', () => this.playerAction('raise'));
    document.getElementById('allin-btn').addEventListener('click', () => this.playerAction('allin'));

    const slider = document.getElementById('raise-slider');
    const amountInput = document.getElementById('raise-amount');
    slider.addEventListener('input', () => {
      amountInput.value = slider.value;
    });
    amountInput.addEventListener('input', () => {
      const v = parseInt(amountInput.value) || 0;
      if (v >= parseInt(slider.min) && v <= parseInt(slider.max)) {
        slider.value = v;
      }
    });
  }

  playerAction(action) {
    const player = this.game.players.find(p => p.isHuman);
    if (!player || player.folded || player.allIn) return;

    const toCall = this.game.currentBet - player.currentBet;

    if (action === 'fold') {
      this.game.executeAction(player, 'fold');
    } else if (action === 'check') {
      if (toCall === 0) this.game.executeAction(player, 'check');
    } else if (action === 'call') {
      this.game.executeAction(player, 'call');
    } else if (action === 'raise') {
      const amount = parseInt(document.getElementById('raise-amount').value) || 0;
      if (amount > player.currentBet) {
        this.game.executeAction(player, 'raise', amount);
      }
    } else if (action === 'allin') {
      this.game.executeAction(player, 'raise', player.chips + player.currentBet);
    }
  }

  enableActions(player) {
    const toCall = this.game.currentBet - player.currentBet;
    const canCheck = toCall === 0;
    const canCall = toCall > 0 && toCall <= player.chips;
    const canRaise = player.chips > toCall;
    const minRaise = this.game.currentBet + this.game.minRaise;
    const maxRaise = player.chips + player.currentBet;

    document.getElementById('fold-btn').disabled = false;
    document.getElementById('check-btn').disabled = !canCheck;
    document.getElementById('call-btn').disabled = !canCall;
    const callText = document.querySelector('#call-btn .btn-text');
    if (callText) callText.textContent = canCall ? `跟注 $${Math.min(toCall, player.chips)}` : '跟注';
    document.getElementById('raise-btn').disabled = !canRaise;
    document.getElementById('allin-btn').disabled = player.chips === 0;

    const slider = document.getElementById('raise-slider');
    const amountInput = document.getElementById('raise-amount');
    slider.min = Math.min(minRaise, maxRaise);
    slider.max = maxRaise;
    const defaultRaise = Math.min(Math.max(minRaise, player.currentBet + this.game.bigBlind * 2), maxRaise);
    slider.value = defaultRaise;
    amountInput.value = defaultRaise;
    amountInput.min = slider.min;
    amountInput.max = slider.max;

    document.querySelector('.action-panel').classList.add('active');
    this.highlightPlayer(player);
  }

  disableActions() {
    ['fold-btn', 'check-btn', 'call-btn', 'raise-btn', 'allin-btn'].forEach(id => {
      document.getElementById(id).disabled = true;
    });
    document.querySelector('.action-panel').classList.remove('active');
    this.clearHighlight();
  }

  highlightPlayer(player) {
    document.querySelectorAll('.player-seat').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`player-${player.id}`);
    if (el) el.classList.add('active');
  }

  clearHighlight() {
    document.querySelectorAll('.player-seat').forEach(el => el.classList.remove('active'));
  }

  updateAll() {
    this.renderCommunityCards();
    this.renderPlayers();
    this.renderPot();
    this.renderPhase();
  }

  renderCommunityCards() {
    const container = document.getElementById('community-cards');
    container.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      if (this.game.communityCards[i]) {
        container.appendChild(this.createCardElement(this.game.communityCards[i]));
      } else {
        const slot = document.createElement('div');
        slot.className = 'card card-slot';
        container.appendChild(slot);
      }
    }
  }

  createCardElement(card) {
    const el = document.createElement('div');
    el.className = `card ${card.isRed ? 'red' : 'black'}`;
    el.innerHTML = `
      <div class="card-corner top">
        <div class="rank">${card.rank}</div>
        <div class="suit">${card.suit}</div>
      </div>
      <div class="card-suit-large">${card.suit}</div>
      <div class="card-corner bottom">
        <div class="rank">${card.rank}</div>
        <div class="suit">${card.suit}</div>
      </div>
    `;
    return el;
  }

  createCardBack() {
    const el = document.createElement('div');
    el.className = 'card card-back';
    return el;
  }

  renderPlayers() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';

    const positions = this.getPlayerPositions();
    this.game.players.forEach((player, idx) => {
      const pos = positions[idx] || { top: '50%', left: '50%' };
      const seat = document.createElement('div');
      seat.className = `player-seat ${player.folded ? 'folded' : ''} ${player.isHuman ? 'human' : 'ai'}`;
      seat.id = `player-${player.id}`;
      seat.style.top = pos.top;
      seat.style.left = pos.left;

      const personalityLabel = player.isHuman ? '' :
        `<span class="personality">${AI_PERSONALITIES[player.personality].name}</span>`;

      const cardsHtml = player.hand.map(card => {
        if (player.isHuman || this.game.phase === PHASES.SHOWDOWN || this.game.phase === PHASES.HAND_OVER) {
          return this.createCardElement(card).outerHTML;
        }
        return this.createCardBack().outerHTML;
      }).join('');

      const resultBadge = player.handResult ?
        `<div class="result-badge">+$${player.handResult.won}</div>` : '';

      const handLabel = (player.handResult && player.handResult.hand && (this.game.phase === PHASES.SHOWDOWN || this.game.phase === PHASES.HAND_OVER)) ?
        `<div class="hand-label">${player.handResult.hand.name}</div>` : '';

      seat.innerHTML = `
        <div class="player-avatar">${this.getAvatar(player)}</div>
        <div class="player-info">
          <div class="player-name">${player.name}${personalityLabel}</div>
          <div class="player-chips">$${player.chips}</div>
          <div class="player-bet">下注: $${player.currentBet}</div>
          ${player.lastAction ? `<div class="last-action">${player.lastAction}</div>` : ''}
          ${resultBadge}
          ${handLabel}
        </div>
        <div class="player-cards">${cardsHtml}</div>
      `;
      container.appendChild(seat);
    });
  }

  getPlayerPositions() {
    const n = this.game.players.length;
    if (n <= 1) return [{ top: '70%', left: '50%' }];
    if (n === 2) {
      return [
        { top: '72%', left: '50%' },
        { top: '12%', left: '50%' }
      ];
    }
    if (n === 3) {
      return [
        { top: '72%', left: '50%' },
        { top: '15%', left: '18%' },
        { top: '15%', left: '82%' }
      ];
    }
    return [
      { top: '72%', left: '50%' },
      { top: '12%', left: '50%' },
      { top: '35%', left: '8%' },
      { top: '35%', left: '92%' }
    ];
  }

  getAvatar(player) {
    if (player.isHuman) return '🤠';
    const avatars = ['🧔', '👴', '🧑‍🦰', '💀'];
    return avatars[player.id - 1] || '🤠';
  }

  renderPot() {
    document.getElementById('pot-amount').textContent = `$${this.game.pot}`;
  }

  renderPhase() {
    const phase = this.game.phase;
    const name = PHASE_NAMES[phase] || '';
    document.getElementById('phase-label').textContent = name;
    document.getElementById('hand-number').textContent = `第 ${this.game.handNumber} 手`;
  }

  showPhase(name) {
    const banner = document.getElementById('phase-banner');
    banner.textContent = name;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 1500);
  }

  showWinner(winners, pot, showdown) {
    const banner = document.getElementById('phase-banner');
    const names = winners.map(w => w.name).join('、');
    const handInfo = showdown && winners[0].handResult && winners[0].handResult.hand ?
      `（${winners[0].handResult.hand.name}）` : '';
    banner.textContent = `${names} 赢得 $${pot} ${handInfo}`;
    banner.classList.add('show', 'winner');
    setTimeout(() => banner.classList.remove('show', 'winner'), 3000);
  }

  showMessage(msg) {
    const banner = document.getElementById('phase-banner');
    banner.textContent = msg;
    banner.classList.add('show');
  }

  updateLog() {
    const logEl = document.getElementById('game-log');
    logEl.innerHTML = this.game.log.slice(-8).map(l => `<div class="log-line">${l}</div>`).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }
}
