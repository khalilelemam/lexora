import React, { useState, useEffect, useRef } from 'react';

// --- ADVANCED AUDIO SYNTHESIS ENGINE ---
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null;

const playTone = (freq, type, duration, vol, slideFreq = null) => {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  if (slideFreq) osc.frequency.exponentialRampToValueAtTime(slideFreq, audioCtx.currentTime + duration);

  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

const playNoise = (duration, vol, type = 'explosion', freq = 1000) => {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = type === 'explosion' ? 'lowpass' : 'highpass';
  filter.frequency.setValueAtTime(freq, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + duration);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  noise.start();
};

const sounds = {
  spawn: () => playTone(800, 'square', 0.1, 0.03, 1400),
  bossSpawn: () => playNoise(0.5, 0.2, 'explosion', 300), // Sky drop sound
  laser: () => playTone(1500, 'sawtooth', 0.15, 0.05, 300), // Pew pew!
  hit: () => playTone(1200, 'square', 0.05, 0.05, 200),
  dash: () => playNoise(0.1, 0.05, 'skid', 4000), // Fast whoosh
  skid: () => playNoise(0.2, 0.1, 'skid', 2000), // Brake sound
  teleport: () => playNoise(0.15, 0.1, 'lowpass', 600), // Smoke bomb poof
  land: () => playNoise(0.1, 0.05, 'explosion', 400),
  step: () => playNoise(0.05, 0.02, 'highpass', 5000), // Soft footstep
  bossLand: () => playNoise(0.6, 0.3, 'explosion', 300),
  scanTick: (progress) => playTone(400 + progress * 600, 'sine', 0.05, 0.02),
  shatter: () => {
    playNoise(0.5, 0.4, 'explosion', 800);
    playTone(100, 'sawtooth', 0.4, 0.2, 20);
  }
};

// --- CONFIGURATION ---
const POINTS = [
  { id: 1, x: 0.1, y: 0.1 }, { id: 2, x: 0.9, y: 0.1 }, { id: 3, x: 0.9, y: 0.9 },
  { id: 4, x: 0.1, y: 0.9 }, { id: 5, x: 0.1, y: 0.5 }, { id: 6, x: 0.9, y: 0.5 },
  { id: 7, x: 0.5, y: 0.1 }, { id: 8, x: 0.5, y: 0.9 }, { id: 9, x: 0.5, y: 0.5, isBoss: true }
];

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// --- ENGINE ---
const CanvasGame = ({ pointData, onPointComplete }) => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const clickRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      if (canvas) { canvas.width = width; canvas.height = height; }
    };
    window.addEventListener('resize', handleResize);

    const handleMouseClick = () => { clickRef.current = true; };
    window.addEventListener('mousedown', handleMouseClick);

    const isBoss = pointData.isBoss;

    // Engine State
    let phase = 'init'; // exploring, bossDrop, bossWait, sequence, collecting, shattered, waiting
    let screenShake = 0;

    // Core Logic
    let waypoints = [];
    let currentWpIndex = 0;
    let wpStartTime = performance.now();
    let startX = 0, startY = 0;
    let stickX = 0, stickY = 0;
    let stickAngle = 0;
    let pose = 'idle';
    let facingRight = true;

    // Exploration State
    let exploreTarget = { x: 0, y: 0, wait: 0 };
    let laserBeam = { life: 0, x1: 0, y1: 0, x2: 0, y2: 0, maxLife: 300 };

    // Visuals
    let scanProgress = 0;
    let particles = [];
    let bones = [];
    let speedLines = [];

    const scale = isBoss ? 0.9 : 0.4;
    const hitRadius = isBoss ? 70 : 35;

    // --- INITIALIZATION ---
    const initLevel = () => {
      if (isBoss) {
        startX = width / 2; startY = -200;
        stickX = startX; stickY = startY;
        waypoints = [{ x: width/2, y: height/2, duration: 400 }]; // Initial sky drop
        phase = 'bossDrop';
        wpStartTime = performance.now();
        sounds.bossSpawn();
      } else {
        // Spawn randomly for exploration
        const edge = Math.floor(Math.random() * 4);
        stickX = edge === 0 ? Math.random()*width : edge === 1 ? width+50 : edge === 2 ? Math.random()*width : -50;
        stickY = edge === 0 ? -50 : edge === 1 ? Math.random()*height : edge === 2 ? height+50 : Math.random()*height;
        phase = 'exploring';
        exploreTarget = { x: width/2, y: height/2, wait: performance.now() }; // Walk to middle initially
        sounds.spawn();
      }
    };

    // --- TELEPORT & SPRINT GENERATOR (Triggered by Laser) ---
    const triggerNinjaSequence = () => {
      const finalX = width * pointData.x;
      const finalY = height * pointData.y;

      waypoints = [];

      if (isBoss) {
        // Boss gets shot -> teleports to edge -> dashes around -> crashes center
        startX = width * 0.2; startY = height * 0.2; // New location after teleport
        waypoints.push({ x: width*0.8, y: height*0.2, duration: 250, pause: 200, type: 'dash', pose: 'skid' });
        waypoints.push({ x: width*0.2, y: height*0.8, duration: 250, pause: 200, type: 'dash', pose: 'skid' });
        waypoints.push({ x: finalX, y: finalY, duration: 400, pause: 0, type: 'dash', pose: 'proud', impact: true });
      } else {
        // Minion gets shot -> teleports far away -> sprints to target
        startX = width * 0.1 + Math.random() * 0.8 * width;
        startY = height * 0.1 + Math.random() * 0.8 * height;

        // 1 random intermediate dash
        waypoints.push({
          x: width * 0.2 + Math.random() * 0.6 * width,
          y: height * 0.2 + Math.random() * 0.6 * height,
          duration: 200, pause: 150, type: 'dash', pose: 'skid'
        });

        // Pre-Final approach
        const approachDir = finalX > waypoints[0].x ? -1 : 1;
        waypoints.push({ x: finalX + approachDir * 100, y: finalY, duration: 250, pause: 0, type: 'dash', pose: 'skid' });

        // Final walk
        waypoints.push({ x: finalX, y: finalY, duration: 800, type: 'walk', pose: 'idle' });
      }

      // Drop smoke at old location
      for(let i=0; i<15; i++) particles.push({ type:'smoke', x:stickX, y:stickY, vx:(Math.random()-0.5)*15, vy:(Math.random()-0.5)*15, life:300, maxLife:300 });

      // Instantly move to new teleport location
      stickX = startX; stickY = startY;

      // Drop smoke at new location
      for(let i=0; i<15; i++) particles.push({ type:'smoke', x:stickX, y:stickY, vx:(Math.random()-0.5)*15, vy:(Math.random()-0.5)*15, life:300, maxLife:300 });

      phase = 'sequence';
      currentWpIndex = 0;
      wpStartTime = performance.now();
      sounds.teleport();
    };

    initLevel();

    // --- DRAWING: STICKMAN POSES ---
    const drawStickman = (x, y, time) => {
      ctx.save();
      ctx.translate(x, y);
      if (!facingRight) ctx.scale(-1, 1);
      ctx.scale(scale, scale);

      ctx.strokeStyle = isBoss ? '#dc2626' : '#0f172a';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      if (isBoss) { ctx.shadowColor = 'rgba(220,38,38,0.8)'; ctx.shadowBlur = 15; }

      const t = time * 0.05;
      let hipY = 0, spineAngle = 0, headY = -35;
      let arm1 = [], arm2 = [], leg1 = [], leg2 = [];

      if (pose === 'sprint') {
        spineAngle = 0.6; hipY = Math.sin(t * 2) * 4;
        arm1 = [0, -25, 3.4, 3.5]; arm2 = [0, -25, 3.7, 3.8];
        const legSwing = Math.cos(t * 1.5);
        leg1 = [0, hipY, Math.PI/2 + legSwing*1.2, Math.PI/2 + legSwing*1.2 + 0.5];
        leg2 = [0, hipY, Math.PI/2 - legSwing*1.2, Math.PI/2 - legSwing*1.2 + 0.5];
      }
      else if (pose === 'skid') {
        spineAngle = -0.3; hipY = 5;
        arm1 = [0, -25, 3.5, 3.0]; arm2 = [0, -25, -0.5, 0.0];
        leg1 = [0, hipY, 2.0, 1.5]; leg2 = [0, hipY, 0.5, 0.5];
      }
      else if (pose === 'walk') {
        spineAngle = 0.05; hipY = Math.sin(t * 0.5) * 3;
        const swing = Math.sin(t * 0.4);
        arm1 = [0, -25, Math.PI/2 + swing*0.5, Math.PI/2 + swing*0.5];
        arm2 = [0, -25, Math.PI/2 - swing*0.5, Math.PI/2 - swing*0.5];
        leg1 = [0, hipY, Math.PI/2 + swing*0.6, Math.PI/2 + swing*0.6 + 0.2];
        leg2 = [0, hipY, Math.PI/2 - swing*0.6, Math.PI/2 - swing*0.6 + 0.2];
      }
      else if (pose === 'fall') {
        spineAngle = -0.1; hipY = -5;
        const flail = Math.sin(t);
        arm1 = [0, -25, -0.5 + flail*0.5, -1.0]; arm2 = [0, -25, 3.5 - flail*0.5, 4.0];
        leg1 = [0, hipY, 2.0, 1.5]; leg2 = [0, hipY, 1.0, 1.5];
      }
      else if (pose === 'idle') {
        spineAngle = 0; hipY = Math.sin(time * 0.005) * 2;
        arm1 = [0, -25, 1.4, 1.5]; arm2 = [0, -25, 1.7, 1.6];
        leg1 = [0, hipY, 1.5, 1.5]; leg2 = [0, hipY, 1.6, 1.5];
      }
      else if (pose === 'proud') {
        spineAngle = 0; hipY = 0;
        arm1 = [0, -25, 0.5, 2.5]; arm2 = [0, -25, 2.6, 0.6];
        leg1 = [0, hipY, 1.2, 1.5]; leg2 = [0, hipY, 1.9, 1.5];
      }

      ctx.rotate(spineAngle);
      ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(0, hipY - 30); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, hipY + headY, 12, 0, Math.PI * 2);
      if (isBoss) ctx.fill(); else { ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); }

      const drawLimb = (arr) => {
        if(!arr.length) return;
        const [sx, sy, a1, a2] = arr; const len = 16;
        const mx = sx + Math.cos(a1)*len, my = sy + Math.sin(a1)*len;
        const ex = mx + Math.cos(a2)*len, ey = my + Math.sin(a2)*len;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
      };

      drawLimb(arm1); drawLimb(arm2); drawLimb(leg1); drawLimb(leg2);
      ctx.restore();
    };

    const explodeStickman = () => {
      const burst = 25;
      for(let i=0; i<6; i++) bones.push({ type: i===0?'head':i===1?'spine':'limb', x:stickX, y:stickY, vx:(Math.random()-0.5)*burst, vy:-Math.random()*burst-5, angle:0, angVel:(Math.random()-0.5)*1.2, life:2000 });
      for(let i=0; i<20; i++) particles.push({ type:'slash', x:stickX, y:stickY, angle:Math.random()*Math.PI*2, length:Math.random()*100+40, life:300, maxLife:300 });
    };

    // --- MAIN RENDER LOOP ---
    const render = (time) => {
      ctx.clearRect(0, 0, width, height);

      // Background Sketch Grid
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      ctx.beginPath();
      for(let x=0; x<width; x+=40) { ctx.moveTo(x,0); ctx.lineTo(x,height); }
      for(let y=0; y<height; y+=40) { ctx.moveTo(0,y); ctx.lineTo(width,y); }
      ctx.stroke();

      ctx.save();
      if (screenShake > 0) {
        ctx.translate((Math.random()-0.5)*screenShake, (Math.random()-0.5)*screenShake);
        screenShake *= 0.85; if (screenShake < 0.5) screenShake = 0;
      }

      const mouseDist = Math.hypot(stickX - mouseRef.current.x, stickY - mouseRef.current.y);
      let isVisible = true;

      // --- LASER HIT DETECTION ---
      if (clickRef.current) {
        clickRef.current = false;
        if ((phase === 'exploring' || phase === 'bossWait') && mouseDist < hitRadius * 2.5) {
          sounds.laser();
          laserBeam = { life: 200, maxLife: 200, x1: mouseRef.current.x, y1: mouseRef.current.y, x2: stickX, y2: stickY };
          triggerNinjaSequence();
        }
      }

      // --- PHASE LOGIC ---

      // 1. BOSS SKY DROP
      if (phase === 'bossDrop') {
        const wp = waypoints[0];
        const elapsed = time - wpStartTime;
        let t = Math.min(elapsed / wp.duration, 1);
        pose = 'fall';
        stickY = startY + (wp.y - startY) * (t * t);
        if (t >= 1) {
          screenShake = 40; sounds.bossLand();
          for(let i=0; i<15; i++) particles.push({ type:'dust', x:stickX, y:stickY+20, vx:(Math.random()-0.5)*20, vy:-Math.random()*10, life:400, maxLife:400 });
          phase = 'bossWait';
          pose = 'proud';
        }
      }
      // 2. BOSS WAITING TO BE SHOT
      else if (phase === 'bossWait') {
        pose = 'proud'; // Stands waiting for laser
      }
      // 3. MINION EXPLORING
      else if (phase === 'exploring') {
        const dx = exploreTarget.x - stickX;
        const dy = exploreTarget.y - stickY;
        const dist = Math.hypot(dx, dy);

        if (time < exploreTarget.wait) {
          pose = 'idle'; // Looking around
        } else if (dist > 5) {
          pose = 'walk';
          stickAngle = Math.atan2(dy, dx);
          if (exploreTarget.x > stickX) facingRight = true; else facingRight = false;
          stickX += Math.cos(stickAngle) * 2; // Casual walk speed
          stickY += Math.sin(stickAngle) * 2;
          if (Math.floor(time) % 400 < 16) sounds.step();
        } else {
          // Reached spot, pick new one
          exploreTarget.x = Math.max(50, Math.min(width-50, stickX + (Math.random()-0.5)*400));
          exploreTarget.y = Math.max(50, Math.min(height-50, stickY + (Math.random()-0.5)*400));
          exploreTarget.wait = time + 500 + Math.random() * 1500;
        }
      }
      // 4. HIGH-SPEED SPRINT SEQUENCE
      else if (phase === 'sequence') {
        const wp = waypoints[currentWpIndex];
        const elapsed = time - wpStartTime;

        if (!wp.startTriggered) {
          wp.startTriggered = true;
          if (wp.type === 'dash') sounds.dash();
        }

        if (elapsed < wp.duration) {
          let t = elapsed / wp.duration;

          if (wp.x > startX) facingRight = true; else if (wp.x < startX) facingRight = false;
          stickAngle = Math.atan2(wp.y - startY, wp.x - startX);

          if (wp.type === 'walk') {
            pose = 'walk';
            stickX = startX + (wp.x - startX) * t;
            stickY = startY + (wp.y - startY) * t;
            if (!wp.lastStep) wp.lastStep = 0;
            if (elapsed - wp.lastStep > 300) { sounds.step(); wp.lastStep = elapsed; }
          }
          else {
            // NINJA DASH
            pose = 'sprint';
            const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            stickX = startX + (wp.x - startX) * easeT;
            stickY = startY + (wp.y - startY) * easeT;

            if (Math.random() > 0.4) {
              speedLines.push({
                x: stickX + (Math.random()-0.5)*60, y: stickY + (Math.random()-0.5)*60,
                angle: stickAngle, length: 30 + Math.random()*50, life: 100
              });
            }
          }
        } else {
          // WAYPOINT REACHED
          stickX = wp.x; stickY = wp.y;
          pose = wp.pose || 'skid';

          if (!wp.endTriggered) {
            wp.endTriggered = true;
            if (wp.type === 'dash') sounds.skid();
            if (wp.impact) {
              screenShake = isBoss ? 30 : 8;
              if (isBoss) sounds.bossLand(); else sounds.land();
              for(let i=0; i<8; i++) particles.push({ type:'dust', x:stickX, y:stickY+20, vx:(Math.random()-0.5)*15, vy:-Math.random()*5, life:300, maxLife:300 });
            }
          }

          if (elapsed > wp.duration + (wp.pause || 0)) {
            if (currentWpIndex === waypoints.length - 1) {
              phase = 'collecting';
            } else {
              startX = wp.x; startY = wp.y;
              currentWpIndex++;
              wpStartTime = time;
            }
          }
        }
      }
      // 5. FIXATION
      else if (phase === 'collecting') {
        if (mouseDist < hitRadius) {
          scanProgress += 16 / 1500;
          if (Math.floor(scanProgress * 100) % 10 === 0 && scanProgress < 1) sounds.scanTick(scanProgress);
          if (scanProgress >= 1) {
            phase = 'shattered'; wpStartTime = time; sounds.shatter(); screenShake = 40; explodeStickman();
          }
        } else { scanProgress = 0; }
      }
      else if (phase === 'shattered') {
        if (time - wpStartTime > 1500) { phase = 'waiting'; onPointComplete(); }
      }


      // --- RENDER CALLS ---

      // Render Laser Beam
      if (laserBeam.life > 0) {
        laserBeam.life -= 16;
        ctx.save();
        ctx.globalAlpha = Math.max(0, laserBeam.life / laserBeam.maxLife);
        ctx.beginPath(); ctx.moveTo(laserBeam.x1, laserBeam.y1); ctx.lineTo(laserBeam.x2, laserBeam.y2);
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 8; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.restore();
      }

      // Render Speed Lines
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 2;
      for (let i = speedLines.length - 1; i >= 0; i--) {
        let sl = speedLines[i]; sl.life -= 16;
        ctx.globalAlpha = Math.max(0, sl.life / 100);
        ctx.beginPath(); ctx.moveTo(sl.x, sl.y);
        ctx.lineTo(sl.x - Math.cos(sl.angle)*sl.length, sl.y - Math.sin(sl.angle)*sl.length);
        ctx.stroke();
        if (sl.life <= 0) speedLines.splice(i, 1);
      }
      ctx.globalAlpha = 1.0;

      // Render Stickman & Scan Rings
      if (phase !== 'shattered' && phase !== 'waiting' && isVisible) {
        drawStickman(stickX, stickY, time);

        // Help text above stickman during exploration
        if (phase === 'exploring' || phase === 'bossWait') {
          ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#ef4444';
          ctx.globalAlpha = 0.5 + Math.sin(time*0.01)*0.5;
          ctx.fillText('CLICK TO SHOOT!', stickX, stickY - 60);
          ctx.globalAlpha = 1.0;
        }

        if (phase === 'collecting') {
          ctx.save(); ctx.translate(stickX, stickY);
          if (isBoss) {
            ctx.rotate(time * 0.002); ctx.beginPath();
            for (let i=0; i<=6; i++) { const a=i*Math.PI/3; const r=hitRadius+Math.random()*4; if(i===0) ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r); else ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); }
            ctx.closePath();
            const r=255, g=Math.floor(scanProgress*255), b=Math.floor(scanProgress*255);
            ctx.strokeStyle=`rgba(${r},${g},${b},0.8)`; ctx.lineWidth=4+scanProgress*8; ctx.stroke();
            ctx.fillStyle=`rgba(${r},${g},${b},${0.1+scanProgress*0.3})`; ctx.fill();
          } else {
            ctx.rotate(-Math.PI/2); ctx.beginPath(); ctx.arc(0,0, hitRadius, 0, Math.PI*2); ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=3; ctx.stroke();
            if (scanProgress > 0) { ctx.beginPath(); ctx.arc(0,0, hitRadius, 0, Math.PI*2*scanProgress); ctx.strokeStyle='#3b82f6'; ctx.lineCap='round'; ctx.lineWidth=6; ctx.stroke(); }
          }
          ctx.restore();
          ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = isBoss ? '#ef4444' : '#2563eb';
          ctx.globalAlpha = 0.5 + Math.sin(time*0.01)*0.5; ctx.fillText(isBoss ? 'OVERLOAD!' : 'FIXATE', stickX, stickY + hitRadius + 20); ctx.globalAlpha = 1.0;
        }
      }

      // Render Particles & Bones
      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i]; p.life -= 16; ctx.globalAlpha = Math.max(0, p.life / p.maxLife);

        if (p.type === 'smoke') {
          p.x += p.vx; p.y += p.vy;
          p.vx *= 0.9; p.vy *= 0.9;
          const size = (1 - p.life / p.maxLife) * 30 + 10;
          ctx.fillStyle = `rgba(148, 163, 184, ${(p.life / p.maxLife) * 0.6})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, size), 0, Math.PI*2); ctx.fill();
        }
        else if (p.type === 'spark') { p.x+=p.vx; p.y+=p.vy; ctx.fillStyle='#eab308'; ctx.fillRect(p.x,p.y,4,4); }
        else if (p.type === 'dust') { p.x+=p.vx; p.y+=p.vy; p.vx*=0.9; ctx.fillStyle='#cbd5e1'; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, p.life/60), 0, Math.PI*2); ctx.fill(); }
        else if (p.type === 'slash') { ctx.strokeStyle='#ef4444'; ctx.lineWidth=2; const prog=1-(p.life/p.maxLife); ctx.beginPath(); ctx.moveTo(p.x+Math.cos(p.angle)*p.length*prog, p.y+Math.sin(p.angle)*p.length*prog); ctx.lineTo(p.x+Math.cos(p.angle)*p.length, p.y+Math.sin(p.angle)*p.length); ctx.stroke(); }

        ctx.globalAlpha = 1.0; if (p.life <= 0) particles.splice(i,1);
      }

      ctx.strokeStyle = isBoss ? '#dc2626' : '#000000'; ctx.lineWidth = 8 * scale; ctx.lineCap = 'round';
      for (let i = bones.length - 1; i >= 0; i--) {
        let b = bones[i]; b.x+=b.vx; b.y+=b.vy; b.vy+=0.8; b.angle+=b.angVel; b.life-=16;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle); ctx.globalAlpha = Math.max(0, b.life/1000);
        if(b.type==='head') { ctx.beginPath(); ctx.arc(0,0,12*scale,0,Math.PI*2); if(isBoss) ctx.fill(); else { ctx.fillStyle='#fff'; ctx.fill(); ctx.stroke(); } }
        else if(b.type==='spine') { ctx.beginPath(); ctx.moveTo(0,-15*scale); ctx.lineTo(0,15*scale); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(-12*scale,-12*scale); ctx.lineTo(0,0); ctx.lineTo(12*scale,-6*scale); ctx.stroke(); }
        ctx.restore(); if (b.life <= 0) bones.splice(i,1);
      }

      ctx.restore();

      // Laser Reticle cursor
      ctx.beginPath(); ctx.arc(mouseRef.current.x, mouseRef.current.y, 3, 0, Math.PI*2); ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; ctx.fill();
      ctx.beginPath(); ctx.arc(mouseRef.current.x, mouseRef.current.y, 10, 0, Math.PI*2); ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mouseRef.current.x - 15, mouseRef.current.y); ctx.lineTo(mouseRef.current.x + 15, mouseRef.current.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mouseRef.current.x, mouseRef.current.y - 15); ctx.lineTo(mouseRef.current.x, mouseRef.current.y + 15); ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousedown', handleMouseClick);
    };
  }, [pointData, onPointComplete]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 bg-[#f8fafc] cursor-none" onMouseMove={(e) => mouseRef.current = {x: e.clientX, y: e.clientY}} />;
};

export default function App() {
  const [gameState, setGameState] = useState('intro');
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [shuffledPoints, setShuffledPoints] = useState([]);

  const startGame = () => {
    if (audioCtx?.state === 'suspended') audioCtx.resume();

    // Shuffle points 0-7, keep 8 (Boss) at the end
    const minions = POINTS.slice(0, 8);
    const randomized = shuffleArray(minions);
    randomized.push(POINTS[8]);

    setShuffledPoints(randomized);
    setGameState('playing');
    setCurrentPointIndex(0);
  };

  return (
      <div className="w-full h-screen relative font-sans text-slate-800 overflow-hidden bg-[#f8fafc] select-none">
        {gameState === 'intro' && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <div className="text-center max-w-lg p-10 bg-white rounded-xl shadow-2xl border-4 border-slate-900">
                <h1 className="text-4xl font-black mb-2 uppercase tracking-tight text-slate-900">Animator Lock-On</h1>
                <p className="text-lg text-slate-600 mb-6 font-medium">
                  1. <strong>Click</strong> the exploring stickmen to shoot them with your laser.<br/><br/>
                  2. They will teleport and dash. When they stop, <strong className="text-red-600">stare them down</strong> to calibrate your eye-tracker.
                </p>
                <button onClick={startGame} className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xl w-full uppercase tracking-widest transition-transform active:scale-95">
                  Initiate Tracker
                </button>
              </div>
            </div>
        )}

        {gameState === 'playing' && shuffledPoints.length > 0 && (
            <>
              <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-3 z-10 pointer-events-none">
                {shuffledPoints.map((_, idx) => (
                    <div key={idx} className={`w-3 h-3 transform rotate-45 border-2 border-slate-900 transition-colors ${
                        idx < currentPointIndex ? 'bg-slate-900' : idx === currentPointIndex ? 'bg-red-500 scale-150' : 'bg-white'
                    }`} />
                ))}
              </div>
              <CanvasGame
                  pointData={shuffledPoints[currentPointIndex]}
                  onPointComplete={() => currentPointIndex < shuffledPoints.length - 1 ? setCurrentPointIndex(p => p + 1) : setGameState('complete')}
              />
            </>
        )}

        {gameState === 'complete' && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <div className="text-center max-w-lg p-10 bg-white rounded-xl shadow-2xl border-4 border-slate-900">
                <h1 className="text-4xl font-black mb-4 text-slate-900 uppercase">System Calibrated</h1>
                <p className="text-xl text-slate-600 mb-8 font-medium">Eye tracking matrices locked. Ready for reading analysis.</p>
                <button onClick={() => setGameState('intro')} className="px-8 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold rounded-lg uppercase tracking-widest transition-colors">
                  Recalibrate
                </button>
              </div>
            </div>
        )}
      </div>
  );
}