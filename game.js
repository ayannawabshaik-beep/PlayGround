(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('laneCanvas');
  const ctx = canvas.getContext('2d');
  const enemies = [
    { name: 'MOSSQUATCH', type: 'MOSS / BEAST', song: 'CANOPY GROOVE', bpm: 108, hue: '#76cfaa', phrase: 'ROOTED!' },
    { name: 'VOLTIGER', type: 'STORM / CAT', song: 'THUNDER RUN', bpm: 116, hue: '#f0d166', phrase: 'ZAP!' },
    { name: 'NOCTURNE', type: 'DUSK / OWL', song: 'MOONLIT FINALE', bpm: 124, hue: '#b3a5ed', phrase: 'ENCORE!' }
  ];
  const laneColors = ['#70d6ab', '#ff776e', '#efd66f', '#7bc6ec'];
  let duel = 0, phrase = 1, playerHp = 100, enemyHp = 100, totalScore = 0;
  let notes = [], active = false, started = false, soundOn = true, audio = null;
  let roundStart = 0, bpm = 108, combo = 0, counts = { perfect: 0, good: 0, miss: 0 }, phraseTotal = 12;
  let judgementTimer = 0, animationId = 0;
  const beatMs = () => 60000 / bpm;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);
  new ResizeObserver(resizeCanvas).observe(canvas);

  function audioContext() {
    if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }
  function tone(freq, duration = .08, type = 'sine', volume = .045) {
    if (!soundOn) return;
    try {
      const a = audioContext(), osc = a.createOscillator(), gain = a.createGain();
      osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(volume, a.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, a.currentTime + duration);
      osc.connect(gain); gain.connect(a.destination); osc.start(); osc.stop(a.currentTime + duration);
    } catch (_) {}
  }
  function setStatus(text) { $('statusText').textContent = text; }
  function showMessage(text) {
    const el = $('stageMessage');
    el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  function updateHud() {
    const enemy = enemies[duel];
    $('enemyName').textContent = enemy.name;
    $('enemyType').textContent = enemy.type;
    $('songTitle').textContent = enemy.song;
    $('tempoValue').textContent = bpm;
    $('duelNumber').textContent = String(duel + 1).padStart(2, '0');
    $('roundName').textContent = duel === 0 ? 'THE GROVE GUARDIAN' : duel === 1 ? 'THE STORM STALKER' : 'THE NOCTURNE OWL';
    $('enemyHealth').style.width = `${Math.max(0, enemyHp)}%`;
    $('playerHealth').style.width = `${Math.max(0, playerHp)}%`;
    $('enemyHpText').textContent = `${Math.ceil(enemyHp)} / 100`;
    $('playerHpText').textContent = `${Math.ceil(playerHp)} / 100`;
    $('measureText').innerHTML = `${String(phrase).padStart(2, '0')} <i>/</i> 03`;
    $('comboReadout').textContent = `COMBO × ${combo}`;
    $('scoreValue').textContent = String(totalScore).padStart(6, '0');
    $('perfectCount').textContent = counts.perfect;
    $('goodCount').textContent = counts.good;
    $('missCount').textContent = counts.miss;
  }
  function newPhrase() {
    bpm = enemies[duel].bpm;
    phraseTotal = 12;
    combo = 0;
    counts = { perfect: 0, good: 0, miss: 0 };
    notes = Array.from({ length: phraseTotal }, (_, i) => ({
      lane: Math.floor(Math.random() * 4),
      due: 0,
      index: i,
      hit: false,
      missed: false
    }));
    $('judgement').textContent = '—';
    $('judgement').style.color = '#68717a';
    updateHud();
    setStatus('GET READY');
    active = false;
    const beginAt = performance.now() + 1900;
    notes.forEach((note, i) => note.due = beginAt + i * beatMs());
    roundStart = beginAt;
    setTimeout(() => {
      if (!started) return;
      active = true;
      setStatus('LOCK IN · HIT THE NOTES');
      tone(660, .12, 'triangle', .035);
    }, 1900);
  }
  function startGame() {
    if (started) return;
    started = true;
    duel = 0; phrase = 1; playerHp = 100; enemyHp = 100; totalScore = 0;
    $('introOverlay').classList.add('hidden');
    $('resultOverlay').classList.add('hidden');
    updateHud();
    newPhrase();
  }
  function closestNote(lane, now) {
    return notes.filter(n => n.lane === lane && !n.hit && !n.missed)
      .sort((a, b) => Math.abs(a.due - now) - Math.abs(b.due - now))[0];
  }
  function pressLane(lane) {
    if (!active || !started) return;
    const now = performance.now();
    const note = closestNote(lane, now);
    if (!note) { tone([294, 330, 370, 440][lane], .045, 'triangle', .018); return; }
    const delta = Math.abs(note.due - now);
    if (delta > 155) {
      tone([294, 330, 370, 440][lane], .045, 'triangle', .018);
      $('judgement').textContent = 'TOO EARLY';
      $('judgement').style.color = '#a3a39a';
      return;
    }
    note.hit = true;
    const perfect = delta <= 72;
    if (perfect) {
      counts.perfect++; combo++;
      totalScore += 1000 + Math.min(combo, 50) * 12;
      $('judgement').textContent = 'PERFECT!'; $('judgement').style.color = '#319a77';
      tone([392, 494, 587, 784][lane], .1, 'triangle', .045);
    } else {
      counts.good++; combo++;
      totalScore += 500 + Math.min(combo, 50) * 6;
      $('judgement').textContent = 'GOOD'; $('judgement').style.color = '#bb9c35';
      tone([330, 392, 466, 587][lane], .08, 'sine', .035);
    }
    $('comboReadout').textContent = `COMBO × ${combo}`;
    $('laneCanvas').classList.remove('pulse'); void $('laneCanvas').offsetWidth; $('laneCanvas').classList.add('pulse');
    updateHud();
  }
  function handleMiss(note) {
    note.missed = true; combo = 0; counts.miss++;
    $('judgement').textContent = 'MISS'; $('judgement').style.color = '#dc6a57';
    $('comboReadout').textContent = 'COMBO × 0';
    tone(115, .12, 'sawtooth', .025);
    updateHud();
  }
  function resolvePhrase() {
    active = false;
    const hitCount = counts.perfect + counts.good;
    const damage = Math.min(42, 10 + counts.perfect * 2.45 + counts.good * 1.55);
    enemyHp = Math.max(0, enemyHp - damage);
    $('enemyArt').classList.remove('hit'); void $('enemyArt').offsetWidth; $('enemyArt').classList.add('hit');
    $('enemyArt').classList.add('attacking');
    showMessage(hitCount >= 10 ? 'SUPER GROOVE!' : hitCount >= 7 ? 'NICE RIFF!' : 'KEEP THE BEAT!');
    tone(hitCount >= 8 ? 220 : 160, .32, 'sawtooth', .04);
    updateHud();
    setStatus('PHRASE COMPLETE');
    setTimeout(() => {
      $('enemyArt').classList.remove('hit', 'attacking');
      if (enemyHp <= 0) {
        showMessage('DUEL WON!');
        setTimeout(() => duelWon(), 950);
        return;
      }
      if (phrase >= 3) {
        showResult(false, 'THE GROVE GOES QUIET', 'The wild beat got away. Ready for another run?');
        return;
      }
      const enemyDamage = Math.max(4, Math.round(9 + counts.miss * .8 - counts.perfect * .12));
      playerHp = Math.max(0, playerHp - enemyDamage);
      $('playerArt').classList.add('hit', 'attacking');
      showMessage(`-${enemyDamage} VITALITY`);
      updateHud();
      setTimeout(() => {
        $('playerArt').classList.remove('hit', 'attacking');
        if (playerHp <= 0) {
          showResult(false, 'OUT OF RHYTHM', 'Your Cinderfox needs a breather. Run it back?');
          return;
        }
        phrase++;
        setStatus('NEXT PHRASE');
        setTimeout(newPhrase, 900);
      }, 700);
    }, 1050);
  }
  function duelWon() {
    if (duel === enemies.length - 1) {
      showResult(true, 'YOU STOLE THE SHOW', 'Three wild duels. One unforgettable encore.');
      return;
    }
    playerHp = Math.min(100, playerHp + 20);
    showResult(true, 'DUEL CLEAR', `${enemies[duel].name} bows to your beat. A little vitality restored.`);
  }
  function showResult(won, title, copy) {
    active = false;
    $('resultEyebrow').textContent = won ? (duel === 2 ? 'CIRCUIT CHAMPION' : 'DUEL CLEAR') : 'ENCOUNTER OVER';
    $('resultTitle').innerHTML = title.split(' ').slice(0, -1).join(' ') + '<br><em>' + title.split(' ').slice(-1)[0] + '</em>';
    $('resultCopy').textContent = copy;
    $('finalScore').textContent = String(totalScore).padStart(6, '0');
    $('continueButton').textContent = duel === 2 && won ? 'PLAY AGAIN  ↗' : won ? 'NEXT DUEL  ↗' : 'TRY AGAIN  ↗';
    $('continueButton').dataset.won = won ? 'yes' : 'no';
    $('resultOverlay').classList.remove('hidden');
    setStatus(won ? 'VICTORY' : 'DEFEAT');
  }
  function continueGame() {
    const won = $('continueButton').dataset.won === 'yes';
    $('resultOverlay').classList.add('hidden');
    if (!won || duel === 2) {
      started = false;
      $('introOverlay').classList.remove('hidden');
      $('introOverlay').querySelector('.intro-card h1').innerHTML = 'THE WILD<br><em>BEAT</em> CALLS.';
      return;
    }
    duel++;
    phrase = 1;
    enemyHp = 100;
    updateHud();
    newPhrase();
  }
  $('startButton').addEventListener('click', startGame);
  $('continueButton').addEventListener('click', continueGame);
  $('replayButton').addEventListener('click', () => { $('resultOverlay').classList.add('hidden'); started = false; startGame(); });
  $('soundToggle').addEventListener('click', () => {
    soundOn = !soundOn;
    $('soundLabel').textContent = soundOn ? 'SOUND ON' : 'SOUND OFF';
    $('soundIcon').textContent = soundOn ? '♫' : '♪';
    $('soundToggle').setAttribute('aria-label', soundOn ? 'Mute sound' : 'Enable sound');
    if (soundOn) tone(523, .12, 'triangle', .035);
  });
  document.querySelectorAll('.lane-key').forEach(button => {
    const lane = Number(button.dataset.lane);
    button.addEventListener('pointerdown', e => { e.preventDefault(); button.classList.add('active'); pressLane(lane); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(event => button.addEventListener(event, () => button.classList.remove('active')));
  });
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const keyLanes = { a: 0, s: 1, d: 2, f: 3 };
    const key = e.key.toLowerCase();
    if (key in keyLanes) { e.preventDefault(); const btn = document.querySelector(`.lane-key[data-lane="${keyLanes[key]}"]`); btn.classList.add('active'); pressLane(keyLanes[key]); }
    if (e.code === 'Space') {
      e.preventDefault();
      if (!$('introOverlay').classList.contains('hidden')) startGame();
      else if (!$('resultOverlay').classList.contains('hidden')) continueGame();
    }
  });
  window.addEventListener('keyup', e => {
    const keyLanes = { a: 0, s: 1, d: 2, f: 3 };
    if (e.key.toLowerCase() in keyLanes) document.querySelector(`.lane-key[data-lane="${keyLanes[e.key.toLowerCase()]}"]`).classList.remove('active');
  });

  function draw(now) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w && h) {
      ctx.clearRect(0, 0, w, h);
      const laneW = w / 4, hitY = h - 48;
      const colors = laneColors;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff04' : '#00000008';
        ctx.fillRect(i * laneW, 0, laneW, h);
        if (i) { ctx.strokeStyle = '#ffffff10'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(i * laneW, 0); ctx.lineTo(i * laneW, h); ctx.stroke(); }
        ctx.strokeStyle = `${colors[i]}48`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(i * laneW + 7, hitY); ctx.lineTo((i + 1) * laneW - 7, hitY); ctx.stroke();
        ctx.fillStyle = `${colors[i]}24`; ctx.beginPath(); ctx.arc(i * laneW + laneW / 2, hitY, 17, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `${colors[i]}95`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(i * laneW + laneW / 2, hitY, 10, 0, Math.PI * 2); ctx.stroke();
      }
      if (started) {
        const travel = beatMs() * 2.45;
        for (const note of notes) {
          if (note.hit || note.missed) continue;
          const remaining = note.due - now;
          if (remaining > travel + 100 || remaining < -170) continue;
          const y = hitY - (remaining / travel) * (hitY - 34);
          const x = note.lane * laneW + laneW / 2;
          ctx.shadowColor = colors[note.lane]; ctx.shadowBlur = 12;
          ctx.fillStyle = colors[note.lane]; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        }
        if (active) {
          for (const note of notes) if (!note.hit && !note.missed && now > note.due + 155) handleMiss(note);
          if (notes.every(n => n.hit || n.missed)) resolvePhrase();
        }
      } else {
        for (let i = 0; i < 4; i++) {
          const pulse = (now / 750 + i * .8) % 1;
          const y = hitY - pulse * 90;
          ctx.globalAlpha = .45 * (1 - pulse);
          ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.arc(i * laneW + laneW / 2, y, 5 + pulse * 4, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    animationId = requestAnimationFrame(draw);
  }
  resizeCanvas();
  updateHud();
  animationId = requestAnimationFrame(draw);
})();
