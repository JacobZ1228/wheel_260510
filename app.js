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
  { title: "中統一發票", desc: "運氣爆棚！本組幸運中獎，獲得 +200分。" },
  { title: "拾金不昧", desc: "路上撿到錢包送警局，獲得 +500分。" },
  { title: "普天同慶", desc: "財神爺駕到！現場三組全部 +150分。" },
  { title: "均富卡", desc: "發揮正義感！三組的分數立刻變得和第一名一樣多。" },
  { title: "互利共贏", desc: "找到好盟友！選一組，兩組一起加 150分。" },
  { title: "大開口獅子", desc: "獅子大開口！選一組，搶奪對方的 200分。" },
  { title: "資源共享", desc: "樂於分享！與隨機一組的分數相加後平均分配。" },
  { title: "指定大紅包", desc: "樂善好施！指定某一組 +200分（不可是自己）。" },
  { title: "命運PK賽", desc: "選一組進行剪刀石頭布，贏家 +200分。" },
  { title: "默契考驗", desc: "老師發問，整組同時回答正確，獲得 +300分。" },
  { title: "智慧結算", desc: "本組每人說一句今天學到的事，獲得 +300分。" },
  { title: "雙倍衝刺", desc: "氣勢正旺！下一題得分直接 × 2。" },
  { title: "熱血加碼", desc: "趁勝追擊！下一題答對額外 +150分。" },
  { title: "再來一次", desc: "運氣正旺，立刻再轉一次轉盤（可累積）。" },
  { title: "佛心分享", desc: "將本組分數的 10%（四捨五入到百位）平均分給另外兩組。" }
];

const defaultFateCards = [
  { title: "違規停車", desc: "收到罰單！本組直接扣 200分。" },
  { title: "錢包掉在計程車上", desc: "太迷糊了！本組遺失財物，直接扣 300分。" },
  { title: "繳納綜合所得稅", desc: "該繳稅囉！本組直接扣除現有分數的 10%（四捨五入到百位）。" },
  { title: "強風大暴雨", desc: "突發天災！本組直接扣 150分，且下一題必須站著回答。" },
  { title: "踩到香蕉皮", desc: "當眾摔倒，醫藥費扣 100分，並暫停發言一輪。" },
  { title: "電腦當機", desc: "辛苦寫的作業沒存檔！本組直接扣 250分。" },
  { title: "劫富濟貧", desc: "本組分數如果是第一名，強制扣 200分 給最後一名的組別。" },
  { title: "大風吹", desc: "本組與目前分數最低的組別，強制交換分數。" },
  { title: "請客吃飯", desc: "本組請全班喝飲料，扣 150分 分給另外兩組（各得 75 分）。" },
  { title: "小偷出沒", desc: "被其他組別聯手針對，隨機一組從你們組裡偷走 150分。" },
  { title: "下一題得分歸零", desc: "運氣不佳，下一題就算答對，也無法獲得任何分數。" },
  { title: "雙倍懲罰卡", desc: "下一題如果答錯，扣分直接 × 2。" },
  { title: "沉默是金", desc: "禁言懲罰！本組下一回合不能討論與回答問題，扣 100分。" },
  { title: "重新洗牌", desc: "局勢大亂！全部組別的分數加總，重新平均分配。" },
  { title: "退回起點", desc: "本組分數直接倒扣 400分。" }
];

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

  open(type, cardsDataRaw) { // type: 'chance' | 'fate'
    const isFate = type === 'fate';
    this.titleEl.textContent = isFate ? "請選擇一張命運卡！" : "請選擇一張機會卡！";
    this.grid.innerHTML = '';
    this.closeBtn.style.display = 'none';

    const cardsData = this.shuffle(cardsDataRaw);

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
      title.textContent = data.title;
      
      const desc = document.createElement('div');
      desc.className = 'card-back-desc';
      desc.textContent = data.desc;

      back.appendChild(title);
      back.appendChild(desc);
      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      card.addEventListener('click', () => {
        if (card.classList.contains('flipped') || card.classList.contains('disabled')) return;
        
        card.classList.add('flipped');
        this.synth.playWin();
        
        document.querySelectorAll('.card').forEach(c => {
          if (c !== card) c.classList.add('disabled');
        });

        setTimeout(() => {
          this.closeBtn.style.display = 'inline-block';
        }, 1000);
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

    this.themes = {
      candy: ['#b5ebd1', '#fcd581', '#f5b493', '#a7def0', '#bfe854', '#79cf9f'],
      toy: ['#FF6B6B', '#4D96FF', '#FFD93D', '#6BCB77', '#A66CFF', '#FF8FAB', '#4ECDC4', '#FFB703'],
      forest: ['#A7D129', '#74C69D', '#B7E4C7', '#FFD166', '#F4A261', '#90E0EF', '#CDB4DB', '#FFE5B4']
    };
    this.icons = ['⭐', '🎁', '🍀', '💎', '🌙', '🔮', '✨', '🎀', '🌟', '🧸'];

    this.state = initialState;
    this.roomCode = roomCode;
    this.apiUrl = apiUrl;
    
    this.spinning = false;
    this.currentRotation = 0;
    this.lastTickSegment = -1;

    this.synth = new AudioSynth();
    this.cardsGame = new CardsGame(this.synth);
    this.scoreCalc = new ScoreCalc(this);
    this.size = 900; // Base size for drawing coordinate system
    
    this.saveTimeout = null;

    this.initCanvas();
    this.initUI();
    this.bindEvents();
    this.draw();
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
        // 使用 no-cors 模式來避開 GAS 的 CORS 限制
        await fetch(this.apiUrl, {
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
    
    if (!this.state.rankingVisible) {
      document.getElementById('rankingPanel').classList.add('hidden');
    } else {
      document.getElementById('rankingPanel').classList.remove('hidden');
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
      let fontSize = 44;
      this.ctx.font = `900 ${fontSize}px Nunito, Noto Sans TC, sans-serif`;
      while (this.ctx.measureText(seg).width > maxWidth && fontSize > 24) {
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
    const extra = (this.state.intensity + Math.random() * 4) * 360 + Math.random() * 360;
    const endRotation = startRotation + extra;
    const totalTime = this.state.duration * 1000;
    const startTime = performance.now();
    
    this.lastTickSegment = this.getResultIndex(startRotation);

    const animate = (now) => {
      const p = Math.min((now - startTime) / totalTime, 1);
      // Custom easing out
      const eased = 1 - Math.pow(1 - p, 4);
      this.currentRotation = startRotation + (endRotation - startRotation) * eased;
      this.canvas.style.transform = `rotate(${this.currentRotation}deg)`;

      // Tick sound logic
      const currentSegment = this.getResultIndex(this.currentRotation);
      if (currentSegment !== this.lastTickSegment) {
        this.synth.playTick();
        this.lastTickSegment = currentSegment;
        
        // Pointer tick animation - 改用更輕量的方式
        this.pointer.classList.remove('tick');
        void this.pointer.offsetWidth; // 觸發重繪以重啟動畫
        this.pointer.classList.add('tick');
      }

      if (p < 1) {
        requestAnimationFrame(animate);
      } else {
        const idx = this.getResultIndex(this.currentRotation);
        this.bounceWheel();
        setTimeout(() => {
          const resultText = this.state.segments[idx];
          if (resultText.includes('機會') || resultText.includes('命運')) {
            const type = resultText.includes('命運') ? 'fate' : 'chance';
            this.cardsGame.open(type, type === 'fate' ? this.state.fateCards : this.state.chanceCards);
          } else {
            const match = resultText.match(/-?\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              const teamIdx = this.state.teams.findIndex(t => t.id === this.state.selectedTeamId);
              if (teamIdx !== -1) {
                this.state.teams[teamIdx].score += num;
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
            }
            this.synth.playWin();
            this.showResult(resultText);
          }
        }, 260);
        this.spinning = false;
        this.spinBtn.disabled = false;
        this.spinBtn.textContent = '🎡 轉動轉盤！';
      }
    };

    requestAnimationFrame(animate);
  }

  bounceWheel() {
    this.canvas.animate([
      { transform: `rotate(${this.currentRotation}deg)` },
      { transform: `rotate(${this.currentRotation + 1.5}deg)` },
      { transform: `rotate(${this.currentRotation - 1.0}deg)` },
      { transform: `rotate(${this.currentRotation}deg)` }
    ], { duration: 400, easing: 'cubic-bezier(.18,.89,.32,1.28)' });
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
      titleInput.value = card.title;
      titleInput.placeholder = `標題 ${index + 1}`;
      titleInput.addEventListener('input', e => {
        card.title = e.target.value;
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
      descInput.value = card.desc;
      descInput.placeholder = '卡片效果說明...';
      descInput.addEventListener('input', e => {
        card.desc = e.target.value;
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

    document.getElementById('addChance').addEventListener('click', () => {
      this.state.chanceCards.push({ title: "新機會卡", desc: "請輸入效果說明" });
      this.saveState();
      this.renderCardsUI('chance');
    });

    document.getElementById('addFate').addEventListener('click', () => {
      this.state.fateCards.push({ title: "新命運卡", desc: "請輸入效果說明" });
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

    document.getElementById('logoutBtn').addEventListener('click', () => {
      const modal = document.getElementById('customConfirmModal');
      if (modal) modal.classList.add('show');
    });

    const confirmYes = document.getElementById('confirmLogoutYes');
    const confirmNo = document.getElementById('confirmLogoutNo');
    const customConfirm = document.getElementById('customConfirmModal');

    if (confirmNo && customConfirm) {
      confirmNo.addEventListener('click', () => {
        customConfirm.classList.remove('show');
      });
    }

    if (confirmYes) {
      confirmYes.addEventListener('click', () => {
        const newUrl = new URL(window.location);
        newUrl.searchParams.delete('room');
        window.location.href = newUrl.origin + newUrl.pathname + newUrl.search;
      });
    }

    document.getElementById('saveAsTemplate').addEventListener('click', () => {
      // 排除掉房間專屬的分數，只存設定
      const template = JSON.parse(JSON.stringify(this.state));
      // 將分數歸零作為初始值
      if (template.teams) {
        template.teams.forEach(t => t.score = 0);
      }
      localStorage.setItem('spinWheelTemplate', JSON.stringify(template));
      alert('📌 已成功將目前設定存為新房間的初始值！\n之後進入新房間時，會自動帶入這些選項與組別。');
    });

    document.getElementById('resetApp').addEventListener('click', () => {
      if (confirm('確定要清除所有設定與組別分數嗎？這動作無法復原喔！')) {
        localStorage.removeItem('spinWheelState');
        location.reload();
      }
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
  rankingPosition: 'top-right'
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
  const loginOverlay = document.getElementById('roomLoginOverlay');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const joinBtn = document.getElementById('joinRoomBtn');
  const skipBtn = document.getElementById('skipRoomBtn');
  const roomInput = document.getElementById('roomCodeInput');
  const roomList = document.getElementById('roomList');
  const existingSection = document.getElementById('existingRoomsSection');

  let apiUrl = localStorage.getItem('spinWheelApiUrl') || 'https://script.google.com/macros/s/AKfycbzjbFm2jDGzgkkSWtSm0nrno2rWdVwJWblM6q32PbX5iIwEnY4iRAaaaD_xWeaY9OEabg/exec';
  
  // 取得現有房間列表
  const fetchRoomList = async () => {
    if (!apiUrl) return;
    try {
      const response = await fetch(`${apiUrl}?action=list`);
      const result = await response.json();
      if (result.success && result.rooms && result.rooms.length > 0) {
        roomList.innerHTML = '';
        result.rooms.forEach(room => {
          const btn = document.createElement('button');
          btn.className = 'add-btn';
          btn.style.padding = '6px 12px';
          btn.style.fontSize = '14px';
          btn.style.background = '#f7f7f7';
          btn.style.color = '#555';
          btn.style.border = '1px solid #ddd';
          btn.style.boxShadow = 'none';
          btn.textContent = room;
          btn.addEventListener('click', () => {
            roomInput.value = room;
            joinBtn.click();
          });
          roomList.appendChild(btn);
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
      alert("請輸入房間代碼！");
      return;
    }
    
    // Check if API URL is set
    if (!apiUrl) {
       // 如果還沒有設定 API URL，先使用本地紀錄進入，讓他們稍後在設定輸入
       alert("注意：尚未設定雲端資料庫 API 網址，將以單機模式進入房間。\n您可以之後在右上角的「設定」中填寫。");
       initApp(getLocalState(), room, '');
       return;
    }

    loadingOverlay.style.display = 'block';
    
    try {
      const response = await fetch(`${apiUrl}?room=${encodeURIComponent(room)}`);
      const result = await response.json();
      
      let state = { ...defaultState };
      if (result.success && result.data) {
        state = { ...defaultState, ...result.data };
      } else {
        // 新房間，用模板初始化
        state = getTemplateState();
      }
      
      initApp(state, room, apiUrl);
      
      // 更新網址列加上 room
      const newUrl = new URL(window.location);
      newUrl.searchParams.set('room', room);
      window.history.pushState({}, '', newUrl);

    } catch (err) {
      console.error(err);
      alert("無法連接到資料庫，請確認 API 網址是否正確。將退回單機模式。");
      initApp(getLocalState(), null, apiUrl);
    }
  });

  skipBtn.addEventListener('click', () => {
    initApp(getLocalState(), null, apiUrl);
  });
});
