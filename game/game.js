(() => {
  'use strict';
  const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const W = 960, H = 540, STEP = 1 / 120;
  const levels = [
    { name: 'Sunny steps', sky: ['#82bfc9','#e5edce'], land: '#669b78', rock: '#447c70', width: 2600,
      platforms: [[0,450,360],[440,420,260],[780,370,240],[1110,420,300],[1500,350,250],[1840,400,240],[2180,340,360]],
      spikes: [[1240,420,45],[1960,400,40]], checkpoint: [1150,420], goal: [2410,340],
      stars: [[260,390],[550,350],[880,295],[1390,340],[1610,275],[2250,260]] },
    { name: 'Golden hour', sky: ['#bb899d','#f6d6ac'], land: '#d2aa74', rock: '#936d76', width: 2900,
      platforms: [[0,450,300],[410,390,210],[730,320,200],[1050,395,270],[1430,330,200],[1750,260,220],[2070,360,240],[2430,300,370]],
      spikes: [[1160,395,50],[2170,360,50]], checkpoint: [1090,395], goal: [2650,300],
      stars: [[230,375],[500,310],[820,240],[1300,300],[1840,180],[2520,220]] },
    { name: 'Midnight summit', sky: ['#263858','#637a98'], land: '#95b7bf', rock: '#4c647e', width: 3100,
      platforms: [[0,450,290],[410,390,180],[710,315,190],[1020,390,240],[1390,300,210],[1730,365,210],[2070,275,210],[2420,340,210],[2750,260,280]],
      spikes: [[1120,390,45],[1830,365,40],[2505,340,45]], checkpoint: [1060,390], goal: [2900,260],
      stars: [[220,375],[490,310],[800,230],[1510,215],[2160,190],[2790,180]] }
  ];
  let levelIndex = 0, state = 'loading', elapsed = 0, deaths = 0, camera = 0, accumulator = 0;
  let collected = new Set(), totals = [0,0,0], checkpoint = false, particles = [], player;
  let jumpQueued = false, sound = false, audio, last = 0, animTime = 0;
  const held = new Set(), photo = new Image();
  const level = () => levels[levelIndex];
  function beep(freq, duration = .09) {
    if (!sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(.06, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    } catch { /* Sound is optional on browsers without Web Audio. */ }
  }
  function spawn() {
    const [x,y] = checkpoint ? level().checkpoint : [70,450];
    player = { x, y: y-58, w:46, h:58, vx:0, vy:0, grounded:true, jumps:0, coyote:.1, facing:1 };
    held.clear(); jumpQueued = false;
  }
  function loadLevel() {
    checkpoint = false; collected = new Set(); camera = 0; particles = [];
    spawn(); hud(); $('status').textContent = 'Double jump to cross the gaps.';
  }
  function hud() {
    $('level').textContent = `0${levelIndex+1} / ${level().name.toUpperCase()}`;
    $('stars').textContent = `★ ${collected.size} / ${level().stars.length}`;
    $('time').textContent = `${Math.floor(elapsed/60)}:${String(Math.floor(elapsed%60)).padStart(2,'0')}`;
  }
  function overlay(tag, title, copy, button) {
    $('panel-tag').textContent = tag; $('panel-title').textContent = title;
    $('panel-copy').textContent = copy; $('start').textContent = button;
    $('overlay').hidden = false; $('start').disabled = false; $('start').focus();
  }
  function play() {
    if (state === 'loading') return;
    if (state === 'won' || state === 'ready') { levelIndex = 0; elapsed = 0; deaths = 0; totals = [0,0,0]; loadLevel(); }
    else if (state === 'complete') { levelIndex++; loadLevel(); }
    state = 'playing'; $('overlay').hidden = true; $('pause').textContent = 'Pause';
    $('pause').disabled = false; $('restart').disabled = false; canvas.focus(); beep(440);
  }
  function pause() {
    if (state === 'paused') { play(); return; }
    if (state !== 'playing') return;
    state = 'paused'; held.clear(); jumpQueued = false; $('pause').textContent = 'Resume';
    overlay('TAKE A BREATHER', 'Clouds can wait.', 'Your run is paused. Pick up right where you left off.', 'Resume');
  }
  function burst(x,y,color,n=12) { for(let i=0;i<n;i++) particles.push({x,y,vx:(Math.random()-.5)*230,vy:-Math.random()*210,life:.65,color}); }
  function fail() { deaths++; burst(player.x,player.y,'#fff0cd'); spawn(); beep(130,.18); $('status').textContent = `Try again! ${checkpoint ? 'Back at your checkpoint.' : 'You’ve got this.'}`; }
  function finish() {
    totals[levelIndex] = collected.size; beep(880,.3);
    if (levelIndex < levels.length-1) {
      state='complete'; overlay('LEVEL COMPLETE', 'Nicely hopped.', `${collected.size} of 6 stars collected. Next up: ${levels[levelIndex+1].name}.`, 'Next level →');
    } else {
      state='won'; const stars = totals.reduce((a,b)=>a+b,0);
      const result = `${stars}/18 stars · ${$('time').textContent} · ${deaths} falls`;
      overlay('ALL THREE WORLDS COMPLETE', 'Head in the clouds.', `You made it home! ${result}. Play again to collect every star or beat your time.`, 'Play again');
      try { const old=JSON.parse(localStorage.getItem('cloud-hop-best') || 'null');
        if(!old || stars>old.stars || (stars===old.stars && elapsed<old.time)) { localStorage.setItem('cloud-hop-best',JSON.stringify({stars,time:elapsed,result})); $('best').textContent=`Personal best: ${result}`; }
      } catch { /* Gameplay works with storage disabled. */ }
    }
    held.clear(); jumpQueued=false; $('pause').disabled=true; $('restart').disabled=true;
  }
  function update(dt) {
    elapsed += dt; const p=player, l=level();
    const dir = Number(held.has('right'))-Number(held.has('left'));
    p.vx = dir*300; if(dir) p.facing=dir;
    p.coyote = p.grounded ? .1 : Math.max(0,p.coyote-dt);
    if(jumpQueued) {
      if(p.jumps<2) {
        if(!p.grounded && p.coyote===0 && p.jumps===0) p.jumps=1;
        p.vy=-530; p.jumps++; p.grounded=false; p.coyote=0;
        burst(p.x+23,p.y+58,'#fff3c0',6); beep(p.jumps===1?440:590);
      }
      jumpQueued=false;
    }
    p.x = Math.max(0,Math.min(l.width-p.w,p.x+p.vx*dt));
    const bottom = p.y+p.h; p.vy=Math.min(p.vy+1350*dt,900); p.y+=p.vy*dt; p.grounded=false;
    // One-way island tops allow forgiving jumps from beneath ledges.
    for(const [x,y,w] of l.platforms) {
      if(p.vy>=0 && bottom<=y+1 && p.y+p.h>=y && p.x+p.w>x+3 && p.x<x+w-3) {
        p.y=y-p.h; p.vy=0; p.grounded=true; p.jumps=0; break;
      }
    }
    for(const [x,y,w] of l.spikes) {
      if(p.x+p.w-9>x && p.x+9<x+w && p.y+p.h>y-19 && p.y<y) { fail(); return; }
    }
    if(p.y>H+150) { fail(); return; }
    l.stars.forEach(([x,y],i)=>{if(!collected.has(i) && Math.hypot(p.x+23-x,p.y+28-y)<42){ collected.add(i); burst(x,y,'#ffe1a0'); beep(740); hud(); }});
    const [cx,cy]=l.checkpoint;
    if(!checkpoint && Math.abs(p.x-cx)<55 && p.grounded && Math.abs(p.y+p.h-cy)<4) {
      checkpoint=true; burst(cx,cy-50,'#b8f2b5'); beep(660,.18); $('status').textContent='Checkpoint saved!';
    }
    const [gx,gy]=l.goal;
    if(Math.abs(p.x+23-gx)<38 && Math.abs(p.y+p.h-gy)<60) { finish(); return; }
    camera += (Math.max(0,Math.min(l.width-W,p.x-W*.32))-camera)*Math.min(1,dt*7);
    for(const q of particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=450*dt;q.life-=dt;} particles=particles.filter(q=>q.life>0);
    hud();
  }
  function rounded(x,y,w,h,r,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
  function star(x,y,r=11) {
    ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5, radius=i%2?r*.46:r;const px=x+Math.cos(a)*radius,py=y+Math.sin(a)*radius;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();
  }
  function draw() {
    const l=level(), gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,l.sky[0]);gradient.addColorStop(1,l.sky[1]);ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
    ctx.fillStyle=levelIndex===2?'#e7ead8':'#fff0cb';ctx.beginPath();ctx.arc(770-camera*.08,105,43,0,Math.PI*2);ctx.fill();
    if(levelIndex===2){ctx.fillStyle='#dae4f1';for(let i=0;i<40;i++){const x=(i*173+31)%960,y=(i*79)%270;ctx.fillRect(x,y,2,2);}}
    for(let i=0;i<8;i++) {
      const x=((i*257-camera*.2)%(W+300)+W+300)%(W+300)-150, y=120+(i%3)*75;
      ctx.fillStyle='#ffffff45';ctx.beginPath();ctx.ellipse(x,y,90,17,0,0,Math.PI*2);ctx.ellipse(x-20,y-12,35,25,0,0,Math.PI*2);ctx.ellipse(x+20,y-8,42,23,0,0,Math.PI*2);ctx.fill();
    }
    for(let row=0;row<2;row++){ctx.fillStyle=row?'#315e6d25':'#36536718';ctx.beginPath();ctx.moveTo(0,H);for(let x=0;x<=W+40;x+=40)ctx.lineTo(x,390+row*65+Math.sin((x+camera*(.12+row*.1))/130)*38);ctx.lineTo(W,H);ctx.fill();}
    ctx.save();ctx.translate(-camera,0);
    for(const [x,y,w] of l.platforms) {
      rounded(x,y,w,85,13,l.rock);ctx.fillStyle=l.rock;ctx.beginPath();ctx.moveTo(x+15,y+60);ctx.lineTo(x+w*.35,y+123);ctx.lineTo(x+w*.63,y+90);ctx.lineTo(x+w-10,y+63);ctx.fill();
      rounded(x-3,y,w+6,15,6,l.land);ctx.fillStyle='#ffffff25';for(let i=18;i<w-12;i+=30)ctx.fillRect(x+i,y+26+(i%3)*9,9,5);
    }
    for(const [x,y,w] of l.spikes){ctx.fillStyle='#f4c7bd';for(let n=0;n<w;n+=15){ctx.beginPath();ctx.moveTo(x+n,y);ctx.lineTo(x+n+7.5,y-22);ctx.lineTo(x+n+15,y);ctx.fill();}}
    l.stars.forEach(([x,y],i)=>{if(!collected.has(i)){ctx.fillStyle='#ffe3a0';ctx.shadowColor='#ffe09c';ctx.shadowBlur=16;star(x,y+Math.sin(animTime*3+i)*4);ctx.shadowBlur=0;}});
    const [cx,cy]=l.checkpoint;rounded(cx,cy-69,4,69,2,'#edf1db');ctx.fillStyle=checkpoint?'#b3eea7':'#f0dbab';ctx.beginPath();ctx.moveTo(cx+4,cy-69);ctx.lineTo(cx+38,cy-57);ctx.lineTo(cx+4,cy-43);ctx.fill();
    const [gx,gy]=l.goal;ctx.strokeStyle='#f9e5ae';ctx.lineWidth=7;ctx.shadowColor='#ffe8ad';ctx.shadowBlur=23;ctx.beginPath();ctx.ellipse(gx,gy-39,29,43,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#fff1c530';ctx.fill();
    ctx.fillStyle='#fff7dc';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('HOME',gx,gy-100);
    for(const q of particles){ctx.globalAlpha=Math.max(0,q.life/.65);ctx.fillStyle=q.color;ctx.fillRect(q.x,q.y,5,5);}ctx.globalAlpha=1;
    if(player){const p=player, bob=p.grounded?Math.sin(animTime*17)*Math.min(1,Math.abs(p.vx)/300)*2:0;
      ctx.fillStyle='#1c3c4b25';ctx.beginPath();ctx.ellipse(p.x+23,p.y+60,24,5,0,0,Math.PI*2);ctx.fill();
      const stride=p.grounded?Math.sin(animTime*17)*Math.min(1,Math.abs(p.vx)/300)*5:4;
      rounded(p.x+6,p.y+47,12,11+stride,4,'#263c51');rounded(p.x+28,p.y+47,12,11-stride,4,'#263c51');
      ctx.save();ctx.translate(p.x+23,p.y+25+bob);ctx.rotate(p.vx*.00015);rounded(-27,-29,54,55,10,'#fff2d2');ctx.beginPath();ctx.roundRect(-24,-26,48,49,8);ctx.clip();
      if(photo.complete && photo.naturalWidth)ctx.drawImage(photo,175,340,840,1110,-24,-26,48,49);
      ctx.restore();
    }
    ctx.restore();
  }
  function frame(now){const delta=Math.min((now-last)/1000||0,.05);last=now;animTime+=delta;
    if(state==='playing'){accumulator+=delta;while(accumulator>=STEP){update(STEP);accumulator-=STEP;if(state!=='playing'){accumulator=0;break;}}}else accumulator=0;
    draw();requestAnimationFrame(frame);
  }
  const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump'};
  document.addEventListener('keydown',e=>{
    if(e.target instanceof HTMLButtonElement && (e.code==='Space'||e.code==='Enter'))return;
    if(keyMap[e.code] && state==='playing'){e.preventDefault();if(keyMap[e.code]==='jump'){if(!e.repeat)jumpQueued=true;}else held.add(keyMap[e.code]);}
    if(!e.repeat && e.code==='KeyP')pause();
    if(!e.repeat && e.code==='Escape' && state==='playing')pause();
    if(!e.repeat && e.code==='KeyR' && (state==='playing'||state==='paused'))restart();
  });
  document.addEventListener('keyup',e=>held.delete(keyMap[e.code]));
  window.addEventListener('blur',()=>{held.clear();jumpQueued=false;if(state==='playing')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden && state==='playing')pause();});
  const pointers=new Map();
  document.querySelectorAll('[data-control]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='playing')return;button.setPointerCapture(e.pointerId);const action=button.dataset.control;pointers.set(e.pointerId,action);if(action==='jump')jumpQueued=true;else held.add(action);});
    const release=e=>{const action=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(![...pointers.values()].includes(action))held.delete(action);};
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  function restart(){if(state!=='playing'&&state!=='paused')return;loadLevel();state='playing';$('overlay').hidden=true;$('pause').textContent='Pause';canvas.focus();}
  $('start').addEventListener('click',play);$('pause').addEventListener('click',pause);$('restart').addEventListener('click',restart);
  $('sound').addEventListener('click',()=>{sound=!sound;$('sound').textContent=sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(sound));beep(520);});
  try{const best=JSON.parse(localStorage.getItem('cloud-hop-best')||'null');if(best?.result)$('best').textContent=`Personal best: ${best.result}`;}catch{}
  loadLevel();
  photo.onload=()=>{state='ready';$('start').disabled=false;$('start').textContent='Let’s play →';};
  photo.onerror=()=>{$('panel-copy').textContent='The character photo could not load. Reload the page to try again.';$('start').textContent='Photo unavailable';};
  photo.src='/game/character.jpeg';requestAnimationFrame(frame);
})();
