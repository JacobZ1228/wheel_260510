// Audio Synthesizer
class AudioSynth {
  constructor() {
    this.audioCtx = null;
  }

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // 預先啟動以減少點擊時的延遲
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTick() {
    if (!this.audioCtx) return;
    try {
      const t = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch(e) { /* ignore */ }
  }

  playWin() {
    if (!this.audioCtx) return;
    try {
      const t = this.audioCtx.currentTime;

      // Simple major chord arpeggio
      const freqs = [440, 554.37, 659.25, 880];
      freqs.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        const startTime = t + i * 0.1;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch (e) { /* ignore */ }
  }
}

const defaultChanceCards = [
  { id: 'c1', category: 'chance', name: "中統一發票", description: "發票幸運中獎！本組獲得 +500 分。", type: "addScore", value: 500 },
  { id: 'c2', category: 'chance', name: "拾金不昧", description: "路上撿到錢包送到警局，獲得好心回報！本組 +600 分。", type: "addScore", value: 600 },
  { id: 'c3', category: 'chance', name: "普天同慶", description: "今天大家運氣都不錯！三組全部 +600 分。", type: "allTeamsAdd", value: 600 },
  { id: 'c4', category: 'chance', name: "互利共贏", description: "找到合作夥伴！指定一組，兩組一起 +300 分。", type: "chooseTargetBothAdd", value: 300 },
  { id: 'c5', category: 'chance', name: "大開口獅子", description: "談判大成功！本組 +400 分，指定一組 -400 分。", type: "stealScore", value: 400 },
  { id: 'c6', category: 'chance', name: "指定大紅包", description: "發送幸運紅包！指定一組 +600 分（不可指定自己）。", type: "chooseTargetAdd", value: 600 },
  { id: 'c7', category: 'chance', name: "默契考驗", description: "團隊合作成功！本組獲得 +800 分。", type: "addScore", value: 800 },
  { id: 'c8', category: 'chance', name: "智慧結算", description: "分享今天學到的知識，本組獲得 +900 分。", type: "addScore", value: 900 },
  { id: 'c9', category: 'chance', name: "幸運加碼", description: "今天運氣特別好！本組額外獲得 +1000 分。", type: "addScore", value: 1000 },
  { id: 'c10', category: 'chance', name: "再來一次", description: "好運延續！本組獲得 +700 分，並立刻再轉一次轉盤。", type: "addScoreAndSpinAgain", value: 700 }
];

const defaultFateCards = [
  { id: 'f1', category: 'fate', name: "違規停車", description: "收到停車罰單，本組扣除 -100 分。", type: "subtractScore", value: 100 },
  { id: 'f2', category: 'fate', name: "錢包掉在計程車上", description: "不小心遺失錢包，本組扣除 -200 分。", type: "subtractScore", value: 200 },
  { id: 'f3', category: 'fate', name: "繳納綜合所得稅", description: "該繳稅了！本組扣除 -300 分。", type: "subtractScore", value: 300 },
  { id: 'f4', category: 'fate', name: "強風大暴雨", description: "天氣狀況不佳，本組扣除 -100 分。", type: "subtractScore", value: 100 },
  { id: 'f5', category: 'fate', name: "踩到香蕉皮", description: "一時失誤差點跌倒，這次沒有扣分。", type: "noEffect", value: 0 },
  { id: 'f6', category: 'fate', name: "電腦當機", description: "作業忘記存檔，本組扣除 -200 分。", type: "subtractScore", value: 200 },
  { id: 'f7', category: 'fate', name: "請客吃飯", description: "本組請大家喝飲料，扣除 150 分，另外兩組各獲得 +75 分。", type: "shareToOthers", value: 150, shareValue: 75 },
  { id: 'f8', category: 'fate', name: "小偷出沒", description: "分數被偷偷拿走！本組扣除 -100 分。", type: "subtractScore", value: 100 },
  { id: 'f9', category: 'fate', name: "倒楣連連", description: "今天狀況不太順，本組額外扣除 -200 分。", type: "subtractScore", value: 200 },
  { id: 'f10', category: 'fate', name: "逆轉命運", description: "意外獲得補助！本組直接獲得 +800 分。", type: "addScore", value: 800 }
];

/**
 * 輔助函式：統一更新分數
 */
function updateTeamScore(spinWheel, team, amount, reason) {
  if (!team) return;
  const change = Math.round(Number(amount));
  team.score = (team.score || 0) + change;
  spinWheel.saveState();
  spinWheel.renderScoreboard();
  spinWheel.renderRanking();
  if (reason) {
    const sign = change >= 0 ? '+' : '';
    window.showToast(`${reason}: ${team.name} ${sign}${change} 分`);
  }
}

/**
 * 彈出「選擇目標組別」彈窗
 */
function showTargetPicker({ title, desc, allTeams, currentId, canPickSelf = false, onSelect }) {
  const modal = document.getElementById('targetPickerModal');
  const titleEl = document.getElementById('targetPickerTitle');
  const descEl = document.getElementById('targetPickerDesc');
  const btnsEl = document.getElementById('targetPickerBtns');

  titleEl.textContent = title;
  descEl.textContent = desc;
  btnsEl.innerHTML = '';

  allTeams.forEach(team => {
    const isSelf = team.id === currentId;

    const btn = document.createElement('button');
    btn.textContent = team.name + (isSelf ? ' (自己)' : '');
    btn.className = 'spin-btn';
    btn.style.margin = '0';
    
    if (!canPickSelf && isSelf) {
      btn.disabled = true;
      btn.style.opacity = '0.5';
    }

    btn.addEventListener('click', () => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      onSelect(team);
    });
    btnsEl.appendChild(btn);
  });

  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
}

/**
 * 核心功能：執行卡牌效果
 */
function applyCardEffect(card, currentTeam) {
  const spinWheel = window.app;
  const allTeams = spinWheel ? spinWheel.state.teams : [];
  const cardName = card.name || card.title || '卡片';
  const type = card.type || 'noEffect'; // 預設為無效果以防報錯

  if (!currentTeam && type !== 'allTeamsAdd') {
    window.showToast("⚠️ 請先選擇組別再執行卡片效果！");
    return;
  }

  switch (type) {
    case 'addScore':
      updateTeamScore(spinWheel, currentTeam, card.value, cardName);
      break;
    case 'subtractScore':
      updateTeamScore(spinWheel, currentTeam, -card.value, cardName);
      break;
    case 'allTeamsAdd':
      allTeams.forEach(t => updateTeamScore(spinWheel, t, card.value, null));
      window.showToast(`✨ ${cardName}: 所有組別各 +${card.value}！`);
      break;
    case 'noEffect':
      window.showToast(`🍃 ${cardName}: 什麼事都沒發生。`);
      break;
    case 'shareToOthers':
      updateTeamScore(spinWheel, currentTeam, -card.value, null);
      allTeams.filter(t => t.id !== currentTeam.id).forEach(t => {
        updateTeamScore(spinWheel, t, card.shareValue || 0, null);
      });
      window.showToast(`🎁 ${cardName}: 分享給其他組別！`);
      break;
    case 'chooseTargetBothAdd':
      showTargetPicker({
        title: cardName, desc: card.description || card.desc, allTeams, currentId: currentTeam.id, canPickSelf: false,
        onSelect(target) {
          updateTeamScore(spinWheel, currentTeam, card.value, null);
          updateTeamScore(spinWheel, target, card.value, null);
          window.showToast(`🤝 ${cardName}: 兩組各 +${card.value}`);
        }
      });
      break;
    case 'stealScore':
      showTargetPicker({
        title: cardName, desc: card.description || card.desc, allTeams, currentId: currentTeam.id, canPickSelf: false,
        onSelect(target) {
          updateTeamScore(spinWheel, currentTeam, card.value, null);
          updateTeamScore(spinWheel, target, -card.value, null);
          window.showToast(`🦁 ${cardName}: 奪取 ${target.name} 的 ${card.value} 分！`);
        }
      });
      break;
    case 'chooseTargetAdd':
      showTargetPicker({
        title: cardName, desc: card.description || card.desc, allTeams, currentId: currentTeam.id, canPickSelf: false,
        onSelect(target) {
          updateTeamScore(spinWheel, target, card.value, cardName);
        }
      });
      break;
    case 'addScoreAndSpinAgain':
      updateTeamScore(spinWheel, currentTeam, card.value, null);
      window.showConfirm("🎡 " + cardName, "請再轉一次轉盤！", () => {
        document.getElementById('cardsModal').classList.remove('show');
      });
      break;
    default:
      window.showToast(`ℹ️ 此效果下一步處理 (${type})`);
      console.log("No automation for type:", type);
      break;
  }
}

class CardsGame {
  constructor(synth) {
    this.synth = synth;
    this.modal = document.getElementById('cardsModal');
    this.grid = document.getElementById('cardsGrid');
    this.titleEl = document.getElementById('cardsModalTitle');
    this.closeBtn = document.getElementById('closeCardsModal');

    this.closeBtn.addEventListener('click', () => {
      this.modal.classList.remove('show');
      this.modal.setAttribute('aria-hidden', 'true');
    });
  }

  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  open(type, cardsDataRaw, currentTeam, allTeams, spinWheel) { // type: 'chance' | 'fate'
    const isFate = type === 'fate';
    this.titleEl.textContent = isFate ? "請選擇一張命運卡！" : "請選擇一張機會卡！";
    this.grid.innerHTML = '';
    this.closeBtn.style.display = 'none';

    const cardsData = this.shuffle(cardsDataRaw);
    let picked = false;

    cardsData.forEach(data => {
      const card = document.createElement('div');
      card.className = `card ${isFate ? 'fate' : ''}`;
      
      const inner = document.createElement('div');
      inner.className = 'card-inner';
      
      const front = document.createElement('div');
      front.className = 'card-front';
      
      const back = document.createElement('div');
      back.className = 'card-back';
      
      const title = document.createElement('div');
      title.className = 'card-back-title';
      title.textContent = data.name || data.title || "無標題";
      
      const desc = document.createElement('div');
      desc.className = 'card-back-desc';
      desc.textContent = data.description || data.desc || "無描述";

      back.appendChild(title);
      back.appendChild(desc);
      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      card.addEventListener('click', () => {
        if (picked || card.classList.contains('flipped') || card.classList.contains('disabled')) return;
        picked = true;
        
        card.classList.add('flipped');
        this.synth.playWin();
        
        document.querySelectorAll('.card').forEach(c => {
          if (c !== card) {
            c.classList.add('disabled');
            c.style.opacity = '0.4';
          }
        });

        setTimeout(() => {
          applyCardEffect(data, currentTeam);
          if (data.type !== 'addScoreAndSpinAgain') {
            this.closeBtn.style.display = 'inline-block';
            this.closeBtn.textContent = '確定，回轉盤';
          }
        }, 800);
      });

      this.grid.appendChild(card);
    });

    this.modal.classList.add('show');
    this.modal.setAttribute('aria-hidden', 'false');
  }
}

class ScoreCalc {
  constructor(spinWheel) {
    this.spinWheel = spinWheel;
    this.modal = document.getElementById('calcModal');
    this.teamNameEl = document.getElementById('calcTeamName');
    this.currentEl = document.getElementById('calcCurrent');
    this.inputEl = document.getElementById('calcInput');
    
    this.targetTeam = null;
    this.buffer = "";
    this.operator = null;

    this.init();
  }

  init() {
    document.querySelectorAll('.calc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-val');
        if (btn.classList.contains('num')) this.appendNum(val);
        else if (btn.classList.contains('op')) this.handleOp(val);
      });
    });

    document.getElementById('confirmCalc').addEventListener('click', () => this.confirm());
    document.getElementById('closeCalc').addEventListener('click', () => this.close());
  }

  open(team) {
    this.targetTeam = team;
    this.teamNameEl.textContent = `${team.name} 分數結算`;
    this.currentEl.textContent = `目前分數: ${team.score}`;
    this.buffer = "";
    this.operator = null;
    this.updateDisplay();
    this.modal.classList.add('show');
    this.modal.setAttribute('aria-hidden', 'false');
  }

  close() {
    this.modal.classList.remove('show');
    this.modal.setAttribute('aria-hidden', 'true');
  }

  appendNum(num) {
    this.buffer += num;
    this.updateDisplay();
  }

  handleOp(op) {
    if (op === 'AC') {
      this.buffer = "";
      this.operator = null;
    } else {
      this.operator = op;
    }
    this.updateDisplay();
  }

  updateDisplay() {
    let text = this.buffer || "0";
    if (this.operator) {
      text = `${this.operator} ${text}`;
    }
    this.inputEl.textContent = text;
  }

  confirm() {
    if (!this.targetTeam) return;
    const val = parseInt(this.buffer, 10);
    if (isNaN(val) && this.operator) {
      this.close();
      return;
    }

    let finalScore = this.targetTeam.score;
    const inputVal = isNaN(val) ? 0 : val;

    if (!this.operator) {
      finalScore = inputVal;
    } else {
      switch (this.operator) {
        case '+': finalScore += inputVal; break;
        case '-': finalScore -= inputVal; break;
        case '×': finalScore *= inputVal; break;
        case '÷': finalScore = Math.round(finalScore / (inputVal || 1)); break;
      }
    }

    this.targetTeam.score = finalScore;
    this.spinWheel.saveState();
    this.spinWheel.renderScoreboard();
    this.spinWheel.renderRanking();
    this.close();
  }
}

class SpinWheel {
  constructor(initialState, roomCode, apiUrl) {
    this.canvas = document.getElementById('wheel');
    this.ctx = this.canvas.getContext('2d');
    this.spinBtn = document.getElementById('spinBtn');
    this.resultToast = document.getElementById('resultToast');
    this.pointer = document.getElementById('pointer');
    this.roomDisplay = document.getElementById('roomDisplay');

    this.state = initialState;
    this.migrateCards();

    this.themes = {
      candy: ['#b5ebd1', '#fcd581', '#f5b493', '#a7def0', '#bfe854', '#79cf9f'],
      toy: ['#FF6B6B', '#4D96FF', '#FFD93D', '#6BCB77', '#A66CFF', '#FF8FAB', '#4ECDC4', '#FFB703'],
      forest: ['#A7D129', '#74C69D', '#B7E4C7', '#FFD166', '#F4A261', '#90E0EF', '#CDB4DB', '#FFE5B4']
    };
    this.icons = ['⭐', '🎁', '🍀', '💎', '🌙', '🔮', '✨', '🎀', '🌟', '🧸'];

    this.roomCode = roomCode;
    this.apiUrl = apiUrl;
    
    this.spinning = false;
    this.currentRotation = 0;
    this.lastTickSegment = -1;

    this.synth = new AudioSynth();
    this.cardsGame = new CardsGame(this.synth);
    this.scoreCalc = new ScoreCalc(this);
    this.size = 900; 
    
    this.saveTimeout = null;

    this.initCanvas();
    this.initUI();
    this.bindEvents();
    this.draw();
  }

  migrateCards() {
    // 自動偵測舊版卡片並強制更新為新版 10+10 組合
    const isOldFormat = (cards) => {
      if (!Array.isArray(cards) || cards.length === 0) return true;
      // 如果任何一張卡片沒有 id 或沒有 name (舊版是 title)，就視為舊版
      return cards.some(card => !card.id || !card.name);
    };

    if (isOldFormat(this.state.chanceCards)) {
      console.log("Detecting old chance cards, performing force migration...");
      this.state.chanceCards = JSON.parse(JSON.stringify(defaultChanceCards));
    }

    if (isOldFormat(this.state.fateCards)) {
      console.log("Detecting old fate cards, performing force migration...");
      this.state.fateCards = JSON.parse(JSON.stringify(defaultFateCards));
    }

    // 確保每張卡片都有基本欄位 (Double Check)
    const ensureFields = (cards) => {
      if (!Array.isArray(cards)) return;
      cards.forEach(card => {
        if (!card.name && card.title) card.name = card.title;
        if (!card.description && card.desc) card.description = card.desc;
        if (!card.type) card.type = 'noEffect';
      });
    };
    ensureFields(this.state.chanceCards);
    ensureFields(this.state.fateCards);
    
    this.saveState(); // 立即儲存遷移後的結果
  }

  saveState() {
    // 儲存到 LocalStorage (作為備份或單機使用)
    try {
      localStorage.setItem('spinWheelState', JSON.stringify(this.state));
      localStorage.setItem('spinWheelApiUrl', this.apiUrl || '');
    } catch (e) {
      console.warn("Could not save state to localStorage.");
    }

    // 防抖機制 (Debounce)：避免頻繁呼叫 API
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    
    this.saveTimeout = setTimeout(async () => {
      if (!this.apiUrl || !this.roomCode) return;
      try {
        // 強制將 room 參數綁在網址後面，徹底避開後端舊版程式讀不到的 Bug
        const targetUrl = `${this.apiUrl}?room=${encodeURIComponent(this.roomCode)}`;
        
        await fetch(targetUrl, {
          method: 'POST',
          mode: 'no-cors', 
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ room: this.roomCode, data: this.state })
        });
        console.log("Data synced to cloud.");
      } catch (err) {
        console.error("Failed to sync with GAS API:", err);
      }
    }, 1500); // 等待 1.5 秒後再一次性存檔
  }

  initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    // Set actual size in memory (scaled to account for extra pixel density)
    this.canvas.width = this.size * dpr;
    this.canvas.height = this.size * dpr;

    // Normalize coordinate system to use css pixels
    this.ctx.scale(dpr, dpr);
  }

  initUI() {
    document.getElementById('gameTitle').textContent = this.state.title;
    document.getElementById('titleInput').value = this.state.title;
    document.getElementById('themeSelect').value = this.state.theme;
    document.getElementById('durationInput').value = this.state.duration;
    document.getElementById('durationLabel').textContent = this.state.duration;
    document.getElementById('intensityInput').value = this.state.intensity;
    document.getElementById('intensityLabel').textContent = this.state.intensity;
    
    document.getElementById('rankingTitleInput').value = this.state.rankingTitle || '🏆 即時戰況';
    document.getElementById('rankingTitle').textContent = this.state.rankingTitle || '🏆 即時戰況';
    
    // API URL Input
    const apiUrlInput = document.getElementById('apiUrlInput');
    if (apiUrlInput) {
      apiUrlInput.value = this.apiUrl || '';
    }
    
    document.getElementById('rankingPositionSelect').value = this.state.rankingPosition || 'top-right';
    this.updateRankingPositionClass(this.state.rankingPosition || 'top-right');
    
    const rankingSize = this.state.rankingSize || 1.0;
    document.getElementById('rankingSizeInput').value = rankingSize;
    document.getElementById('rankingSizeLabel').textContent = rankingSize.toFixed(1);
    document.getElementById('rankingPanel').style.transform = `scale(${rankingSize})`;
    document.getElementById('rankingPanel').style.transformOrigin = 'top right';
    
    document.getElementById('rankingVisibleSelect').value = this.state.rankingVisible ? 'true' : 'false';
    
    const fontSizeRatio = this.state.fontSizeRatio || 1.0;
    document.getElementById('fontSizeRatioInput').value = fontSizeRatio;
    document.getElementById('fontSizeRatioLabel').textContent = fontSizeRatio.toFixed(1);
    
    if (!this.state.rankingVisible) {
      document.getElementById('rankingPanel').classList.add('hidden');
    } else {
      document.getElementById('rankingPanel').classList.remove('hidden');
    }

    if (this.roomDisplay) {
      this.roomDisplay.textContent = this.roomCode ? `🏠 房間：${this.roomCode}` : '💻 單機模式';
    }

    this.renderSegmentsUI();
    this.renderCardsUI('chance');
    this.renderCardsUI('fate');
    this.renderTeamsUI();
    this.renderScoreboard();
  }

  updateRankingPositionClass(position) {
    const panel = document.getElementById('rankingPanel');
    if (!panel) return;
    panel.classList.remove('pos-top-right', 'pos-top-left', 'pos-bottom-right', 'pos-bottom-left');
    panel.classList.add(`pos-${position}`);
  }

  renderScoreboard() {
    const board = document.getElementById('scoreboard');
    if (!board) return;
    board.innerHTML = '';
    
    this.state.teams.forEach(team => {
      const card = document.createElement('div');
      card.className = `team-card ${this.state.selectedTeamId === team.id ? 'active' : ''}`;
      card.addEventListener('click', () => {
        this.state.selectedTeamId = team.id;
        this.saveState();
        this.renderScoreboard();
      });

      const nameEl = document.createElement('div');
      nameEl.className = 'team-name';
      nameEl.textContent = team.name;

      const scoreEl = document.createElement('div');
      scoreEl.className = 'team-score';
      scoreEl.id = `team-score-${team.id}`;
      scoreEl.textContent = team.score;
      
      // 點擊分數開啟計算機
      scoreEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.scoreCalc.open(team);
      });

      card.appendChild(nameEl);
      card.appendChild(scoreEl);
      board.appendChild(card);
    });
    this.renderRanking();
  }

  openSettings() {
    this.renderSettingsUI();
    document.getElementById('settingsModal').classList.add('show');
  }

  closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
    // 延遲重繪轉盤以維持動畫流暢
    setTimeout(() => this.draw(), 300);
  }

  renderSettingsUI() {
    this.renderSegmentsUI();
    this.renderCardsUI('chance');
    this.renderCardsUI('fate');
    this.renderTeamsUI();
    
    // 更新一般設定欄位
    document.getElementById('titleInput').value = this.state.title;
    document.getElementById('rankingTitleInput').value = this.state.rankingTitle || '';
    document.getElementById('themeSelect').value = this.state.theme;
    document.getElementById('rankingVisibleSelect').value = this.state.rankingVisible ? 'true' : 'false';
    document.getElementById('rankingPositionSelect').value = this.state.rankingPosition;
    document.getElementById('rankingSizeInput').value = this.state.rankingSize;
    document.getElementById('rankingSizeLabel').textContent = this.state.rankingSize.toFixed(1);

    const fontSizeRatio = this.state.fontSizeRatio || 1.0;
    document.getElementById('fontSizeRatioInput').value = fontSizeRatio;
    document.getElementById('fontSizeRatioLabel').textContent = fontSizeRatio.toFixed(1);
    
    const apiUrlInput = document.getElementById('apiUrlInput');
    if (apiUrlInput) apiUrlInput.value = this.apiUrl || '';
  }

  renderRanking() {
    const list = document.getElementById('rankingList');
    if (!list) return;

    const sortedTeams = [...this.state.teams].sort((a, b) => b.score - a.score);
    
    // 檢查是否有實質變化，避免頻繁重繪
    const currentData = JSON.stringify(sortedTeams.map(t => ({ n: t.name, s: t.score })));
    if (this.lastRankingData === currentData) return;
    this.lastRankingData = currentData;

    list.innerHTML = '';
    const medals = ['🥇', '🥈', '🥉'];

    sortedTeams.forEach((team, index) => {
      const item = document.createElement('div');
      item.className = 'rank-item';
      
      const icon = document.createElement('div');
      icon.className = 'rank-icon';
      icon.textContent = medals[index] || '🏅';

      const info = document.createElement('div');
      info.className = 'rank-info';
      
      const nameEl = document.createElement('div');
      nameEl.className = 'rank-name';
      nameEl.textContent = team.name;

      const scoreEl = document.createElement('div');
      scoreEl.className = 'rank-score';
      scoreEl.textContent = team.score;

      info.appendChild(nameEl);
      info.appendChild(scoreEl);
      item.appendChild(icon);
      item.appendChild(info);

      list.appendChild(item);
    });
  }

  drawRoundedText(text, x, y, fontSize, fill = '#fffaf0', stroke = 'rgba(139,74,32,.38)') {
    this.ctx.font = `900 ${fontSize}px Nunito, Noto Sans TC, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = stroke;
    this.ctx.lineWidth = Math.max(5, fontSize * 0.14);
    this.ctx.strokeText(text, x, y);
    this.ctx.fillStyle = fill;
    this.ctx.fillText(text, x, y);
  }

  draw() {
    const cx = this.size / 2;
    const cy = this.size / 2;
    const outerR = 410;
    const r = 355;
    const innerR = 72;
    const segments = this.state.segments;
    const arc = (Math.PI * 2) / segments.length;
    const colors = this.themes[this.state.theme];

    this.ctx.clearRect(0, 0, this.size, this.size);

    // soft base shadow
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy + 16, outerR, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(91,46,20,.16)';
    this.ctx.fill();
    this.ctx.restore();

    // outer toy rim
    const rimGradient = this.ctx.createLinearGradient(cx, cy - outerR, cx, cy + outerR);
    rimGradient.addColorStop(0, '#ffe58a');
    rimGradient.addColorStop(.46, '#ffc857');
    rimGradient.addColorStop(1, '#e59c26');

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    this.ctx.fillStyle = rimGradient;
    this.ctx.fill();
    this.ctx.lineWidth = 12;
    this.ctx.strokeStyle = '#8b4a20';
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 383, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255,255,255,.72)';
    this.ctx.lineWidth = 10;
    this.ctx.stroke();

    // decorative bulbs
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12 - Math.PI / 2;
      const bx = cx + Math.cos(a) * 392;
      const by = cy + Math.sin(a) * 392;
      this.ctx.beginPath();
      this.ctx.arc(bx, by, 15, 0, Math.PI * 2);
      this.ctx.fillStyle = '#fff8d6';
      this.ctx.fill();
      this.ctx.lineWidth = 5;
      this.ctx.strokeStyle = '#d99022';
      this.ctx.stroke();
    }

    // wheel segments
    segments.forEach((seg, i) => {
      const start = i * arc - Math.PI / 2;
      const end = start + arc;

      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.arc(cx, cy, r, start, end);
      this.ctx.closePath();
      this.ctx.fillStyle = colors[i % colors.length];
      this.ctx.fill();
      this.ctx.lineWidth = 8;
      this.ctx.strokeStyle = 'rgba(255,255,255,.86)';
      this.ctx.stroke();

      // soft highlight inside each segment
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy);
      this.ctx.arc(cx, cy, r, start, end);
      this.ctx.closePath();
      this.ctx.clip();
      const glow = this.ctx.createRadialGradient(cx - 90, cy - 120, 10, cx, cy, r);
      glow.addColorStop(0, 'rgba(255,255,255,.34)');
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      this.ctx.fillStyle = glow;
      this.ctx.fillRect(0, 0, this.size, this.size);
      this.ctx.restore();

      // text and icon
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(start + arc / 2);

      const maxWidth = 190;
      let fontSize = Math.floor(44 * (this.state.fontSizeRatio || 1.0));
      this.ctx.font = `900 ${fontSize}px Nunito, Noto Sans TC, sans-serif`;
      const minFontSize = Math.floor(24 * (this.state.fontSizeRatio || 1.0));
      while (this.ctx.measureText(seg).width > maxWidth && fontSize > minFontSize) {
        fontSize -= 2;
        this.ctx.font = `900 ${fontSize}px Nunito, Noto Sans TC, sans-serif`;
      }

      this.drawRoundedText(seg, 230, 0, fontSize);
      this.ctx.restore();
    });

    // inner circle button
    // Outer brown stroke
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, innerR + 10, 0, Math.PI * 2);
    this.ctx.fillStyle = '#8b4a20';
    this.ctx.fill();

    // White gap
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, innerR + 4, 0, Math.PI * 2);
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();

    // Dark pink rim
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    this.ctx.fillStyle = '#f25b7a';
    this.ctx.fill();

    // Light pink center gradient
    const centerGradient = this.ctx.createLinearGradient(cx, cy - innerR, cx, cy + innerR);
    centerGradient.addColorStop(0, '#ff9aa2');
    centerGradient.addColorStop(1, '#ff7a92');

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, innerR - 6, 0, Math.PI * 2);
    this.ctx.fillStyle = centerGradient;
    this.ctx.fill();

    // glossy shine on center
    this.ctx.beginPath();
    this.ctx.ellipse(cx - 18, cy - 24, 24, 12, -0.5, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255,255,255,.42)';
    this.ctx.fill();
  }

  getResultIndex(rotation) {
    const segAngle = 360 / this.state.segments.length;
    const normalized = ((rotation % 360) + 360) % 360;
    // Top pointer is at 0 degrees for visual, but our drawing starts at -90
    const wheelAngleAtPointer = (360 - normalized) % 360;
    return Math.floor(wheelAngleAtPointer / segAngle) % this.state.segments.length;
  }

  spin() {
    if (this.spinning || this.state.segments.length < 2) return;
    this.synth.init(); // Must be triggered on user action
    this.spinning = true;
    this.spinBtn.disabled = true;
    this.spinBtn.textContent = '轉動中… ✨';

    const startRotation = this.currentRotation;
    // 增加基礎圈數，讓整體轉動時間更有感
    const extra = (this.state.intensity + 4 + Math.random() * 4) * 360 + Math.random() * 360;
    const endRotation = startRotation + extra;
    const totalTime = this.state.duration * 1000;
    const startTime = performance.now();
    
    this.lastTickSegment = this.getResultIndex(startRotation);

    // 準備 3D 浮現效果
    const wheelWrap = this.canvas.parentElement;
    wheelWrap.style.transition = 'transform 0.4s ease-out, filter 0.4s ease-out';
    wheelWrap.style.transform = 'scale(1.03)';
    wheelWrap.style.filter = 'drop-shadow(0 35px 40px rgba(91,46,20,.35))';

    const animate = (now) => {
      const p = Math.min((now - startTime) / totalTime, 1);
      // 升級為 Quintic 減速曲線：前段爆發強，後段滑行長
      const eased = 1 - Math.pow(1 - p, 5);
      
      const previousRotation = this.currentRotation;
      this.currentRotation = startRotation + (endRotation - startRotation) * eased;
      
      // 計算瞬時速度 (每影格旋轉角度)
      const velocity = this.currentRotation - previousRotation;
      
      // 動態模糊：減輕模糊程度，避免視覺過度誇張
      const blurAmount = Math.min(velocity * 0.15, 1.5);
      this.canvas.style.transform = `rotate(${this.currentRotation}deg)`;
      this.canvas.style.filter = `blur(${blurAmount}px)`;

      // 檢查是否經過選項交界
      const currentSegment = this.getResultIndex(this.currentRotation);
      if (currentSegment !== this.lastTickSegment) {
        this.synth.playTick();
        this.lastTickSegment = currentSegment;
        
        // 指針物理打擊回饋
        // 速度快時指針被緊壓 (角度大)，速度慢時回彈明顯
        const hitAngle = Math.min(12 + velocity * 1.5, 35);
        this.pointer.style.transition = 'none';
        this.pointer.style.transform = `translateX(-50%) rotate(-${hitAngle}deg)`;
        
        // 短暫延遲後釋放指針，模擬彈簧回彈
        requestAnimationFrame(() => {
          this.pointer.style.transition = 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          this.pointer.style.transform = 'translateX(-50%) rotate(0deg)';
        });
      }

      if (p < 1) {
        requestAnimationFrame(animate);
      } else {
        // 恢復正常狀態
        this.canvas.style.filter = 'blur(0px)';
        wheelWrap.style.transform = 'scale(1)';
        wheelWrap.style.filter = ''; // 會吃 CSS 的預設 drop-shadow
        
        const idx = this.getResultIndex(this.currentRotation);
        this.bounceWheel();
        
        setTimeout(() => {
          const resultText = this.state.segments[idx];
          const teamIdx = this.state.teams.findIndex(t => t.id === this.state.selectedTeamId);
          const currentTeam = teamIdx !== -1 ? this.state.teams[teamIdx] : null;

          if (resultText.includes('機會') || resultText.includes('命運')) {
            const type = resultText.includes('命運') ? 'fate' : 'chance';
            this.cardsGame.open(
              type, 
              type === 'fate' ? this.state.fateCards : this.state.chanceCards,
              currentTeam,
              this.state.teams,
              this
            );
          } else {
            const match = resultText.match(/-?\d+/);
            if (match && currentTeam) {
              let num = parseInt(match[0], 10);
              
              // 應用特殊加成/懲罰
              if (num > 0) {
                if (currentTeam.nextScoreMultiplier !== undefined) num *= currentTeam.nextScoreMultiplier;
                if (currentTeam.nextScoreBonus !== undefined) num += currentTeam.nextScoreBonus;
              } else if (num < 0) {
                if (currentTeam.nextPenaltyMultiplier !== undefined) num *= currentTeam.nextPenaltyMultiplier;
              }

              // 重置一次性效果
              delete currentTeam.nextScoreMultiplier;
              delete currentTeam.nextScoreBonus;
              delete currentTeam.nextPenaltyMultiplier;

              currentTeam.score += num;
              this.saveState();
              this.renderScoreboard();
              
              setTimeout(() => {
                const scoreEl = document.getElementById(`team-score-${this.state.selectedTeamId}`);
                if (scoreEl) {
                  scoreEl.classList.add('animating');
                  setTimeout(() => scoreEl.classList.remove('animating'), 400);
                }
              }, 50);
            }
            this.synth.playWin();
            this.showResult(resultText);
          }
        }, 400); // 延長等待時間讓 bounce 動畫跑完
        this.spinning = false;
        this.spinBtn.disabled = false;
        this.spinBtn.textContent = '🎡 轉動轉盤！';
      }
    };

    requestAnimationFrame(animate);
  }

  bounceWheel() {
    // 整體彈跳收放
    this.canvas.parentElement.animate([
      { transform: 'scale(1.02)' },
      { transform: 'scale(0.97)' },
      { transform: 'scale(1.01)' },
      { transform: 'scale(1)' }
    ], { duration: 550, easing: 'cubic-bezier(.18,.89,.32,1.28)' });

    // 旋轉角吸附與震盪
    this.canvas.animate([
      { transform: `rotate(${this.currentRotation}deg)` },
      { transform: `rotate(${this.currentRotation + 3}deg)` },
      { transform: `rotate(${this.currentRotation - 1.5}deg)` },
      { transform: `rotate(${this.currentRotation + 0.5}deg)` },
      { transform: `rotate(${this.currentRotation}deg)` }
    ], { duration: 550, easing: 'cubic-bezier(.18,.89,.32,1.28)' });
  }

  showResult(text) {
    this.resultToast.textContent = `🎉 ${text}！`;
    this.resultToast.classList.add('show');
    this.spawnConfetti();
    setTimeout(() => this.resultToast.classList.remove('show'), 2600);
  }

  spawnConfetti() {
    const colors = ['#FF9AA2', '#FFD93D', '#6BCB77', '#4D96FF', '#C7CEEA', '#FFB703'];
    const container = document.createDocumentFragment();
    for (let i = 0; i < 20; i++) { // 減少數量至 20
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.animationDelay = Math.random() * .2 + 's';
      el.style.transform = `rotate(${Math.random() * 180}deg)`;
      container.appendChild(el);
      setTimeout(() => el.remove(), 3000);
    }
    document.body.appendChild(container);
  }

  shuffleSegments() {
    const arr = this.state.segments;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    this.saveState();
    this.renderSegmentsUI();
    this.draw();
  }

  renderSegmentsUI() {
    const container = document.getElementById('segmentsContainer');
    container.innerHTML = '';
    this.state.segments.forEach((seg, index) => {
      const row = document.createElement('div');
      row.className = 'segment-row';

      const input = document.createElement('input');
      input.type = 'text';
      input.value = seg;
      input.placeholder = `選項 ${index + 1}`;
      input.addEventListener('input', e => {
        this.state.segments[index] = e.target.value || `選項 ${index + 1}`;
        this.saveState();
        this.draw();
      });

      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = '×';
      del.title = '刪除';
      del.addEventListener('click', () => {
        if (this.state.segments.length <= 2) return alert('至少需要 2 個選項喔！');
        this.state.segments.splice(index, 1);
        this.saveState();
        this.renderSegmentsUI();
        this.draw();
      });

      row.append(input, del);
      container.appendChild(row);
    });
  }

  renderCardsUI(type) {
    const isFate = type === 'fate';
    const container = document.getElementById(isFate ? 'fateContainer' : 'chanceContainer');
    const cardsArray = isFate ? this.state.fateCards : this.state.chanceCards;
    container.innerHTML = '';

    cardsArray.forEach((card, index) => {
      const row = document.createElement('div');
      row.className = 'card-row';

      const header = document.createElement('div');
      header.className = 'card-row-header';

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = card.name || card.title || "";
      titleInput.placeholder = `名稱 ${index + 1}`;
      titleInput.addEventListener('input', e => {
        card.name = e.target.value;
        this.saveState();
      });

      const del = document.createElement('button');
      del.className = 'delete-btn';
      del.textContent = '×';
      del.title = '刪除';
      del.addEventListener('click', () => {
        if (cardsArray.length <= 1) return alert('至少需要 1 張卡片喔！');
        cardsArray.splice(index, 1);
        this.saveState();
        this.renderCardsUI(type);
      });

      header.append(titleInput, del);

      const descInput = document.createElement('textarea');
      descInput.value = card.description || card.desc || "";
      descInput.placeholder = '卡片效果說明...';
      descInput.addEventListener('input', e => {
        card.description = e.target.value;
        this.saveState();
      });

      row.append(header, descInput);
      container.appendChild(row);
    });
  }

  renderTeamsUI() {
    const container = document.getElementById('teamsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    this.state.teams.forEach((team, index) => {
      const row = document.createElement('div');
      row.className = 'team-row';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = team.name;
      nameInput.placeholder = `組別名稱`;
      nameInput.addEventListener('input', e => {
        team.name = e.target.value || `組別 ${index + 1}`;
        this.saveState();
        this.renderScoreboard();
      });

      const scoreInput = document.createElement('input');
      scoreInput.type = 'number';
      scoreInput.value = team.score;
      scoreInput.placeholder = `分數`;
      scoreInput.addEventListener('input', e => {
        team.score = parseInt(e.target.value, 10) || 0;
        this.saveState();
        this.renderScoreboard();
      });

      row.append(nameInput, scoreInput);
      container.appendChild(row);
    });
  }

  bindEvents() {
    this.spinBtn.addEventListener('click', () => this.spin());

    document.getElementById('rankingToggleBtn').addEventListener('click', () => {
      this.state.rankingVisible = !this.state.rankingVisible;
      document.getElementById('rankingVisibleSelect').value = this.state.rankingVisible ? 'true' : 'false';
      document.getElementById('rankingPanel').classList.toggle('hidden', !this.state.rankingVisible);
      this.saveState();
    });

    const settingsModal = document.getElementById('settingsModal');
    
    document.getElementById('settingBtn').addEventListener('click', () => {
      this.openSettings();
    });

    const closeModal = () => {
      this.closeSettings();
    };

    document.getElementById('closeModal').addEventListener('click', closeModal);
    settingsModal.addEventListener('click', e => {
      if (e.target === settingsModal) closeModal();
    });

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`pane-${tab.dataset.tab}`).classList.add('active');
      });
    });

    document.getElementById('titleInput').addEventListener('input', e => {
      this.state.title = e.target.value || '轉轉樂';
      document.getElementById('gameTitle').textContent = this.state.title;
      this.saveState();
    });

    document.getElementById('rankingTitleInput').addEventListener('input', e => {
      this.state.rankingTitle = e.target.value;
      document.getElementById('rankingTitle').textContent = this.state.rankingTitle || '🏆 即時戰況';
      this.saveState();
    });

    const apiUrlInput = document.getElementById('apiUrlInput');
    if (apiUrlInput) {
      apiUrlInput.addEventListener('input', e => {
        this.apiUrl = e.target.value.trim();
        this.saveState(); // Will save to local storage immediately, and sync remote if room active
      });
    }

    document.getElementById('rankingSizeInput').addEventListener('input', e => {
      this.state.rankingSize = Number(e.target.value);
      document.getElementById('rankingSizeLabel').textContent = this.state.rankingSize.toFixed(1);
      document.getElementById('rankingPanel').style.transform = `scale(${this.state.rankingSize})`;
      document.getElementById('rankingPanel').style.transformOrigin = 'top right';
      this.saveState();
    });
    
    document.getElementById('fontSizeRatioInput').addEventListener('input', e => {
      this.state.fontSizeRatio = Number(e.target.value);
      document.getElementById('fontSizeRatioLabel').textContent = this.state.fontSizeRatio.toFixed(1);
      this.saveState();
      this.draw();
    });
    
    document.getElementById('rankingPositionSelect').addEventListener('change', e => {
      this.state.rankingPosition = e.target.value;
      this.updateRankingPositionClass(this.state.rankingPosition);
      this.saveState();
    });

    document.getElementById('rankingVisibleSelect').addEventListener('change', e => {
      this.state.rankingVisible = e.target.value === 'true';
      document.getElementById('rankingPanel').classList.toggle('hidden', !this.state.rankingVisible);
      this.saveState();
    });

    document.getElementById('themeSelect').addEventListener('change', e => {
      this.state.theme = e.target.value;
      this.saveState();
      this.draw();
    });

    document.getElementById('addSegment').addEventListener('click', () => {
      this.state.segments.push(`選項 ${this.state.segments.length + 1}`);
      this.saveState();
      this.renderSegmentsUI();
      this.draw();
    });

    document.getElementById('shuffleSegments').addEventListener('click', () => {
      this.shuffleSegments();
      window.showToast('🎲 已隨機洗牌選項位置！');
    });

    document.getElementById('addChance').addEventListener('click', () => {
      this.state.chanceCards.push({ 
        id: 'c' + Date.now(), 
        category: 'chance', 
        name: "新機會卡", 
        description: "請輸入效果說明",
        type: "addScore",
        value: 0
      });
      this.saveState();
      this.renderCardsUI('chance');
    });

    document.getElementById('addFate').addEventListener('click', () => {
      this.state.fateCards.push({ 
        id: 'f' + Date.now(), 
        category: 'fate', 
        name: "新命運卡", 
        description: "請輸入效果說明",
        type: "subtractScore",
        value: 0
      });
      this.saveState();
      this.renderCardsUI('fate');
    });

    document.getElementById('durationInput').addEventListener('input', e => {
      this.state.duration = Number(e.target.value);
      document.getElementById('durationLabel').textContent = this.state.duration;
      this.saveState();
    });

    document.getElementById('intensityInput').addEventListener('input', e => {
      this.state.intensity = Number(e.target.value);
      document.getElementById('intensityLabel').textContent = this.state.intensity;
      this.saveState();
    });

    const confirmModal = document.getElementById('customConfirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmDesc = document.getElementById('confirmDesc');
    const btnYes = document.getElementById('confirmYes');
    const btnNo = document.getElementById('confirmNo');
    let confirmCallback = null;

    window.showConfirm = (title, desc, callback) => {
      if (!confirmModal) return;
      confirmTitle.textContent = title;
      confirmDesc.textContent = desc;
      confirmCallback = callback;
      confirmModal.classList.add('show');
    };

    window.showToast = (msg) => {
      const toast = document.getElementById('resultToast');
      if (toast) {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      } else {
        console.log("Toast:", msg);
      }
    };

    if (btnNo) {
      btnNo.addEventListener('click', () => confirmModal.classList.remove('show'));
    }
    if (btnYes) {
      btnYes.addEventListener('click', () => {
        confirmModal.classList.remove('show');
        if (confirmCallback) confirmCallback();
      });
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
      window.showConfirm('🚪 確定要切換房間嗎？', '目前的進度已自動儲存。', () => {
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('room');
        window.location.href = newUrl.origin + newUrl.pathname + newUrl.search;
      });
    });

    document.getElementById('saveAsTemplate').addEventListener('click', () => {
      const template = JSON.parse(JSON.stringify(this.state));
      if (template.teams) template.teams.forEach(t => t.score = 0);
      localStorage.setItem('spinWheelTemplate', JSON.stringify(template));
      window.showToast('📌 已將目前設定存為新房間初始值！');
    });

    document.getElementById('resetApp').addEventListener('click', () => {
      window.showConfirm('🗑️ 確定要重設嗎？', '這將清除所有設定與分數，且無法復原。', () => {
        localStorage.removeItem('spinWheelState');
        location.reload();
      });
    });
  }
}

// Helper functions for bootstrap
const defaultState = {
  title: '轉轉樂',
  theme: 'candy',
  duration: 4,
  intensity: 6,
  segments: ['008', '600', '選項 5', '命運', '選項 1', '選項 2'],
  chanceCards: defaultChanceCards,
  fateCards: defaultFateCards,
  teams: [
    { id: 1, name: '第一組', score: 0 },
    { id: 2, name: '第二組', score: 0 },
    { id: 3, name: '第三組', score: 0 }
  ],
  selectedTeamId: 1,
  rankingTitle: '🏆 即時戰況',
  rankingSize: 1.0,
  rankingVisible: true,
  rankingPosition: 'top-right',
  fontSizeRatio: 1.0
};

function getLocalState() {
  try {
    // 優先檢查是否有自訂模板
    const template = localStorage.getItem('spinWheelTemplate');
    const saved = localStorage.getItem('spinWheelState');
    
    let baseState = template ? JSON.parse(template) : defaultState;
    
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...baseState, ...parsed, teams: parsed.teams || baseState.teams };
    }
    return { ...baseState };
  } catch (e) {}
  return { ...defaultState };
}

function getTemplateState() {
  try {
    const template = localStorage.getItem('spinWheelTemplate');
    if (template) return JSON.parse(template);
  } catch (e) {}
  return { ...defaultState };
}


// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // 定義全域提示視窗
  window.showToast = (msg) => {
    const toast = document.getElementById('resultToast');
    if (toast) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
  };

  // 定義全域確認視窗
  window.showConfirm = (title, desc, callback) => {
    const modal = document.getElementById('customConfirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const descEl = document.getElementById('confirmDesc');
    const btnYes = document.getElementById('confirmYes');
    const btnNo = document.getElementById('confirmNo');

    if (modal && titleEl && descEl && btnYes && btnNo) {
      titleEl.textContent = title;
      descEl.textContent = desc;
      modal.classList.add('show');

      // 移除舊的監聽器並重新綁定
      const newBtnYes = btnYes.cloneNode(true);
      const newBtnNo = btnNo.cloneNode(true);
      btnYes.parentNode.replaceChild(newBtnYes, btnYes);
      btnNo.parentNode.replaceChild(newBtnNo, btnNo);

      newBtnYes.addEventListener('click', () => {
        modal.classList.remove('show');
        if (callback) callback();
      });
      newBtnNo.addEventListener('click', () => {
        modal.classList.remove('show');
      });
    }
  };

  const loginOverlay = document.getElementById('roomLoginOverlay');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const joinBtn = document.getElementById('joinRoomBtn');
  const skipBtn = document.getElementById('skipRoomBtn');
  const roomInput = document.getElementById('roomCodeInput');
  const roomList = document.getElementById('roomList');
  const existingSection = document.getElementById('existingRoomsSection');

  let apiUrl = localStorage.getItem('spinWheelApiUrl') || 'https://script.google.com/macros/s/AKfycbzjbFm2jDGzgkkSWtSm0nrno2rWdVwJWblM6q32PbX5iIwEnY4iRAaaaD_xWeaY9OEabg/exec';
  
  let isEditingRoomList = false;
  const editBtn = document.getElementById('editRoomListBtn');
  
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      isEditingRoomList = !isEditingRoomList;
      editBtn.textContent = isEditingRoomList ? '✅ 完成' : '✏️ 管理';
      fetchRoomList();
    });
  }

  // 取得現有房間列表
  const fetchRoomList = async () => {
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl.trim()}?action=list&t=${Date.now()}`, { redirect: 'follow' });
      const result = await response.json();
      if (result.success && result.rooms && result.rooms.length > 0) {
        roomList.innerHTML = '';
        result.rooms.forEach(room => {
          const container = document.createElement('div');
          container.style.display = 'flex';
          container.style.alignItems = 'center';
          container.style.gap = '8px';
          container.style.marginBottom = '6px';

          if (!isEditingRoomList) {
            // 預覽模式：精美按鈕，全寬排列
            const btn = document.createElement('button');
            btn.className = 'add-btn';
            btn.style.width = '100%';
            btn.style.margin = '4px 0';
            btn.style.padding = '12px';
            btn.style.textAlign = 'center';
            btn.style.fontSize = '16px';
            btn.style.fontWeight = '800';
            btn.style.background = '#fff';
            btn.style.color = '#555';
            btn.style.border = '2px solid #e0e0e0';
            btn.style.borderRadius = '15px';
            btn.style.boxShadow = '0 4px 0 #e0e0e0'; // 3D 效果
            btn.style.cursor = 'pointer';
            btn.textContent = room;
            
            btn.addEventListener('click', () => {
              roomInput.value = room;
              window.showConfirm('📂 確定進入房間？', `即將載入「${room}」的紀錄。`, () => {
                joinBtn.click();
              });
            });
            container.appendChild(btn);
          } else {
            // 編輯模式：輸入框 + 刪除按鈕
            const input = document.createElement('input');
            input.type = 'text';
            input.value = room;
            input.style.flex = '1';
            input.style.padding = '6px 10px';
            input.style.borderRadius = '8px';
            input.style.border = '1px solid #4D96FF';
            input.style.fontSize = '14px';

            const saveNameBtn = document.createElement('button');
            saveNameBtn.textContent = '💾';
            saveNameBtn.title = '儲存名稱';
            saveNameBtn.style.cursor = 'pointer';
            saveNameBtn.style.background = 'none';
            saveNameBtn.style.border = 'none';
            saveNameBtn.style.fontSize = '20px';
            saveNameBtn.addEventListener('click', () => {
              const newName = input.value.trim();
              if (!newName || newName === room) {
                window.showToast("⚠️ 名稱未變更或為空");
                return;
              }
              
              window.showConfirm('📝 確定重新命名？', `將「${room}」改名為「${newName}」嗎？`, async () => {
                window.showToast("⏳ 正在處理中...");
                try {
                  const url = `${apiUrl.trim()}?action=rename&room=${encodeURIComponent(room)}&newName=${encodeURIComponent(newName)}`;
                  const renResp = await fetch(url, { redirect: 'follow' });
                  const renRes = await renResp.json();
                  if (renRes.success) {
                    window.showToast("✅ 已成功更名");
                    fetchRoomList(); // 刷新列表
                  } else {
                    window.showToast("❌ 更名失敗：" + (renRes.message || "未知原因"));
                  }
                } catch (e) { 
                  console.error(e);
                  window.showToast("❌ 連線錯誤，請檢查網路"); 
                }
              });
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = '🗑️';
            delBtn.title = '刪除房間';
            delBtn.style.cursor = 'pointer';
            delBtn.style.background = 'none';
            delBtn.style.border = 'none';
            delBtn.style.fontSize = '20px';
            delBtn.addEventListener('click', () => {
              window.showConfirm('⚠️ 確定刪除房間？', `將永久刪除「${room}」，此動作無法復原！`, async () => {
                window.showToast("⏳ 正在刪除中...");
                try {
                  const url = `${apiUrl.trim()}?action=delete&room=${encodeURIComponent(room)}`;
                  const delResp = await fetch(url, { redirect: 'follow' });
                  const delRes = await delResp.json();
                  if (delRes.success) {
                    window.showToast("✅ 房間已刪除");
                    fetchRoomList(); // 刷新列表
                  } else {
                    window.showToast("❌ 刪除失敗");
                  }
                } catch (e) { 
                  console.error(e);
                  window.showToast("❌ 刪除連線錯誤"); 
                }
              });
            });

            container.append(input, saveNameBtn, delBtn);
          }
          roomList.appendChild(container);
        });
        existingSection.style.display = 'block';
      }
    } catch (err) {
      console.warn("Failed to fetch room list", err);
    }
  };

  fetchRoomList();
  
  const initApp = (state, room, url) => {
    loginOverlay.style.display = 'none';
    loadingOverlay.style.display = 'none';
    window.app = new SpinWheel(state, room, url);
  };

  // URL 帶有 room 參數時自動載入
  const urlParams = new URLSearchParams(window.location.search);
  const urlRoom = urlParams.get('room');
  if (urlRoom) {
    roomInput.value = urlRoom;
  }

  joinBtn.addEventListener('click', async () => {
    const room = roomInput.value.trim();
    if (!room) {
      window.showToast("請輸入房間代碼！");
      return;
    }
    
    if (!apiUrl) {
       window.showToast("尚未設定 API，將以單機模式進入。");
       initApp(getLocalState(), room, '');
       return;
    }

    loadingOverlay.style.display = 'block';
    
    try {
      // 加入 t=Date.now() 防止 Google 快取舊資料
      const response = await fetch(`${apiUrl}?room=${encodeURIComponent(room)}&t=${Date.now()}`, { redirect: 'follow' });
      const result = await response.json();
      
      let state = { ...defaultState };
      if (result.success && result.data) {
        state = { ...defaultState, ...result.data };
      } else {
        // 如果失敗且有本地備份則使用備份，否則使用模板
        state = getTemplateState();
      }
      
      initApp(state, room, apiUrl);
      
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('room', room);
      window.history.pushState({}, '', newUrl);

    } catch (err) {
      console.error(err);
      window.showToast("無法連線資料庫，將退回單機模式。");
      initApp(getLocalState(), null, apiUrl);
    }
  });

  skipBtn.addEventListener('click', () => {
    initApp(getLocalState(), null, apiUrl);
  });
});
