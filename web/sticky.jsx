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
  bossSpawn: () => playTone(150, 'sawtooth', 0.8, 0.2, 80),
  hit: () => playTone(1200, 'square', 0.05, 0.05, 200),
  dash: () => playNoise(0.1, 0.05, 'skid', 4000), // Fast whoosh
  skid: () => playNoise(0.2, 0.1, 'skid', 2000), // Brake sound
  jump: () => playTone(300, 'sine', 0.2, 0.05, 600),
  obstacleBreak: () => { 
    playNoise(0.2, 0.15, 'explosion', 2000); 
    playTone(200, 'square', 0.1, 0.1, 50); 
  },
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

    const isBoss = pointData.isBoss;
    
    // Engine State
    let phase = 'sequence'; // sequence, collecting, shattered, waiting
    let lastHitTime = 0;
    let screenShake = 0;
    
    // Core Logic
    let waypoints = [];
    let currentWpIndex = 0;
    let wpStartTime = performance.now();
    let startX = 0, startY = 0;
    let stickX = 0, stickY = 0;
    let stickAngle = 0;
    let pose = 'idle'; // sprint, jump, fall, walk, idle, proud
    let facingRight = true;
    
    // Visuals
    let scanProgress = 0;
    let particles = [];
    let bones = []; 
    let speedLines = [];
    
    const scale = isBoss ? 0.9 : 0.4;
    const hitRadius = isBoss ? 70 : 35;

    // --- PROCEDURAL PATH & OBSTACLE GENERATOR ---
    const generatePath = () => {
      const finalX = width * pointData.x;
      const finalY = height * pointData.y;

      if (isBoss) {
        startX = width / 2; startY = -200;
        waypoints = [
          { x: width/2, y: height/2, duration: 400, type: 'fall', impact: true },
          { x: width*0.2, y: height*0.8, duration: 250, pause: 200, type: 'dash' },
          { x: width*0.8, y: height*0.2, duration: 250, pause: 200, type: 'dash' },
          { x: finalX, y: finalY, duration: 450, type: 'jump', arc: 200, pose: 'proud', impact: true }
        ];
        return;
      }

      // Minion Spawning
      const edge = Math.floor(Math.random() * 4);
      startX = edge === 0 ? Math.random()*width : edge === 1 ? width+50 : edge === 2 ? Math.random()*width : -50;
      startY = edge === 0 ? -50 : edge === 1 ? Math.random()*height : edge === 2 ? height+50 : Math.random()*height;
      
      const pts = [{x: startX, y: startY}];
      // Generate 2 random intermediate path nodes
      for(let i=0; i<2; i++) {
        pts.push({ x: width * 0.15 + Math.random() * 0.7 * width, y: height * 0.15 + Math.random() * 0.7 * height });
      }
      // Pre-Final approach point (so he lands and walks the rest)
      const approachDir = finalX > pts[pts.length-1].x ? -1 : 1;
      pts.push({ x: finalX + approachDir * 100, y: finalY });
      // Final destination
      pts.push({ x: finalX, y: finalY });

      // Build waypoints with Obstacles
      for(let i=1; i<pts.length; i++) {
        const prev = pts[i-1];
        const curr = pts[i];
        
        if (i === pts.length - 1) {
            // The final stretch is always a realistic walk
            waypoints.push({ x: curr.x, y: curr.y, duration: 800, type: 'walk', pose: 'idle' });
        } else {
            // Randomly spawn an obstacle to jump over, or just do a ninja dash
            const isObstacleJump = Math.random() > 0.4; 
            if (isObstacleJump) {
                // Place the obstacle halfway through this segment
                const obsX = (prev.x + curr.x) / 2;
                const obsY = (prev.y + curr.y) / 2;
                waypoints.push({
                    x: curr.x, y: curr.y, duration: 400, pause: 100, type: 'jump', arc: 120,
                    obstacle: { x: obsX, y: obsY, active: true }, impact: true
                });
            } else {
                waypoints.push({
                    x: curr.x, y: curr.y, duration: 250, pause: 150, type: 'dash', impact: false
                });
            }
        }
      }
      stickX = startX; stickY = startY;
    };
    
    generatePath();
    if (isBoss) sounds.bossSpawn(); else sounds.spawn();

    // --- DRAWING: STICKMAN POSES (Ninja + Realistic) ---
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

      // 1. NINJA SPRINT (Deep lean, arms trailing back)
      if (pose === 'sprint') {
        spineAngle = 0.6; 
        hipY = Math.sin(t * 2) * 4; 
        // Arms flying back (Naruto run style)
        arm1 = [0, -25, 3.4, 3.5];
        arm2 = [0, -25, 3.7, 3.8];
        // Fast pumping legs
        const legSwing = Math.cos(t * 1.5);
        leg1 = [0, hipY, Math.PI/2 + legSwing*1.2, Math.PI/2 + legSwing*1.2 + 0.5];
        leg2 = [0, hipY, Math.PI/2 - legSwing*1.2, Math.PI/2 - legSwing*1.2 + 0.5];
      } 
      // 2. OBSTACLE JUMP (Tucked ninja leap)
      else if (pose === 'jump') {
        spineAngle = 0.4; hipY = -15;
        // Arms pulled tight back
        arm1 = [0, -25, 3.0, 3.2]; 
        arm2 = [0, -25, 3.4, 3.6];
        // Knees tucked tight to clear obstacle
        leg1 = [0, hipY, 2.8, 3.2]; 
        leg2 = [0, hipY, 2.2, 2.6];
      }
      // 3. FALL (Flailing)
      else if (pose === 'fall') {
        spineAngle = -0.1; hipY = -5;
        const flail = Math.sin(t);
        arm1 = [0, -25, -0.5 + flail*0.5, -1.0];
        arm2 = [0, -25, 3.5 - flail*0.5, 4.0];
        leg1 = [0, hipY, 2.0, 1.5];
        leg2 = [0, hipY, 1.0, 1.5];
      }
      // 4. REALISTIC WALK (Upright, calm)
      else if (pose === 'walk') {
        spineAngle = 0.05; 
        hipY = Math.sin(t * 0.5) * 3;
        const swing = Math.sin(t * 0.4);
        arm1 = [0, -25, Math.PI/2 + swing*0.5, Math.PI/2 + swing*0.5];
        arm2 = [0, -25, Math.PI/2 - swing*0.5, Math.PI/2 - swing*0.5];
        leg1 = [0, hipY, Math.PI/2 + swing*0.6, Math.PI/2 + swing*0.6 + 0.2];
        leg2 = [0, hipY, Math.PI/2 - swing*0.6, Math.PI/2 - swing*0.6 + 0.2];
      }
      // 5. IDLE (Standing perfectly still)
      else if (pose === 'idle') {
        spineAngle = 0;
        hipY = Math.sin(time * 0.005) * 2; 
        arm1 = [0, -25, 1.4, 1.5]; 
        arm2 = [0, -25, 1.7, 1.6];
        leg1 = [0, hipY, 1.5, 1.5]; 
        leg2 = [0, hipY, 1.6, 1.5];
      }
      // 6. PROUD (Boss)
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

      // Draw Obstacles (Spikes) before stickman
      if (phase === 'sequence') {
        const currentWp = waypoints[currentWpIndex];
        if (currentWp && currentWp.obstacle && currentWp.obstacle.active) {
            ctx.save();
            ctx.translate(currentWp.obstacle.x, currentWp.obstacle.y);
            // Black rocky base
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.moveTo(-15, 10); ctx.lineTo(0, -30); ctx.lineTo(15, 10); ctx.fill();
            // Red glowing tip
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(0, -30); ctx.lineTo(5, -10); ctx.stroke();
            ctx.restore();
        }
      }

      const mouseDist = Math.hypot(stickX - mouseRef.current.x, stickY - mouseRef.current.y);

      // --- PHASE 1: HIGH-SPEED PATHING ---
      if (phase === 'sequence') {
        const wp = waypoints[currentWpIndex];
        const elapsed = time - wpStartTime;

        if (elapsed < wp.duration) {
          let t = elapsed / wp.duration;
          
          if (wp.x > startX) facingRight = true; else if (wp.x < startX) facingRight = false;
          stickAngle = Math.atan2(wp.y - startY, wp.x - startX);
          
          if (wp.type === 'jump') {
            pose = 'jump';
            if (t === 0) sounds.jump();
            const easeT = t; 
            const arcY = Math.sin(t * Math.PI) * (wp.arc || 120);
            stickX = startX + (wp.x - startX) * easeT;
            stickY = startY + (wp.y - startY) * easeT - arcY;

            // Trigger Smash when passing over active obstacle
            if (wp.obstacle && wp.obstacle.active && t >= 0.5) {
                wp.obstacle.active = false;
                sounds.obstacleBreak();
                screenShake = 10;
                for(let i=0; i<15; i++) {
                   particles.push({ type:'slash', x:wp.obstacle.x, y:wp.obstacle.y-10, angle:Math.random()*Math.PI*2, length:Math.random()*40+10, life:200, maxLife:200 });
                   particles.push({ type:'dust', x:wp.obstacle.x, y:wp.obstacle.y, vx:(Math.random()-0.5)*15, vy:(Math.random()-0.5)*15, life:200, maxLife:200 });
                }
            }
          } 
          else if (wp.type === 'fall') {
            pose = 'fall';
            stickX = startX + (wp.x - startX) * t;
            stickY = startY + (wp.y - startY) * (t * t); 
          }
          else if (wp.type === 'walk') {
            pose = 'walk';
            stickX = startX + (wp.x - startX) * t;
            stickY = startY + (wp.y - startY) * t;
            if (Math.floor(elapsed) % 300 === 0) sounds.step();
          }
          else {
            // NINJA DASH
            pose = 'sprint';
            if (t === 0) sounds.dash();
            const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            stickX = startX + (wp.x - startX) * easeT;
            stickY = startY + (wp.y - startY) * easeT;

            // Generate Speed Lines
            if (Math.random() > 0.4) {
                speedLines.push({
                    x: stickX + (Math.random()-0.5)*60,
                    y: stickY + (Math.random()-0.5)*60,
                    angle: stickAngle, length: 30 + Math.random()*50, life: 100
                });
            }
          }

        } else {
          // WAYPOINT REACHED (Wait out the pause)
          stickX = wp.x; stickY = wp.y;
          pose = wp.pose || 'idle'; 
          
          if (elapsed === wp.duration || elapsed - wp.duration < 16) {
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

        // Fun Hit Sparks (Tracking feedback - No calibration)
        if (mouseDist < hitRadius * 2 && time - lastHitTime > 150) {
          sounds.hit(); lastHitTime = time;
          for(let i=0; i<2; i++) particles.push({ type:'spark', x:stickX+(Math.random()-0.5)*30, y:stickY+(Math.random()-0.5)*30, vx:(Math.random()-0.5)*15, vy:(Math.random()-0.5)*15, life:200, maxLife:200 });
        }
      } 
      // --- PHASE 2: FIXATION ---
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
      // Speed Lines layer
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

      if (phase !== 'shattered' && phase !== 'waiting') {
        drawStickman(stickX, stickY, time);
        
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

      // Particles & Bones Loop
      for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i]; p.life -= 16; ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        if (p.type === 'spark') { p.x+=p.vx; p.y+=p.vy; ctx.fillStyle='#eab308'; ctx.fillRect(p.x,p.y,4,4); }
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

      // Reticle
      ctx.beginPath(); ctx.arc(mouseRef.current.x, mouseRef.current.y, 3, 0, Math.PI*2); ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; ctx.fill();
      ctx.beginPath(); ctx.arc(mouseRef.current.x, mouseRef.current.y, 10, 0, Math.PI*2); ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; ctx.lineWidth = 2; ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(animationFrameId); window.removeEventListener('resize', handleResize); };
  }, [pointData, onPointComplete]);

  return <canvas ref={canvasRef} className="z-0 absolute inset-0 bg-[#f8fafc] cursor-none" onMouseMove={(e) => mouseRef.current = {x: e.clientX, y: e.clientY}} />;
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
    <div className="relative bg-[#f8fafc] w-full h-screen overflow-hidden font-sans text-slate-800 select-none">
      {gameState === 'intro' && (
        <div className="z-50 absolute inset-0 flex justify-center items-center">
          <div className="bg-white shadow-2xl p-10 border-4 border-slate-900 rounded-xl max-w-lg text-center">
            <h1 className="mb-2 font-black text-slate-900 text-4xl uppercase tracking-tight">Animator Lock-On</h1>
            <p className="mb-6 font-medium text-slate-600 text-lg">
              Track the stickmen as they parkour through the maze. When they stop, <strong className="text-red-600">stare them down</strong> to calibrate.
            </p>
            <button onClick={startGame} className="bg-slate-900 hover:bg-slate-800 px-8 py-4 rounded-lg w-full font-bold text-white text-xl uppercase tracking-widest active:scale-95 transition-transform">
              Initiate
            </button>
          </div>
        </div>
      )}

      {gameState === 'playing' && shuffledPoints.length > 0 && (
        <>
          <div className="top-6 left-1/2 z-10 absolute flex gap-3 -translate-x-1/2 pointer-events-none">
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
        <div className="z-50 absolute inset-0 flex justify-center items-center">
          <div className="bg-white shadow-2xl p-10 border-4 border-slate-900 rounded-xl max-w-lg text-center">
            <h1 className="mb-4 font-black text-slate-900 text-4xl uppercase">System Calibrated</h1>
            <p className="mb-8 font-medium text-slate-600 text-xl">Eye tracking matrices locked. Ready for reading analysis.</p>
            <button onClick={() => setGameState('intro')} className="bg-slate-200 hover:bg-slate-300 px-8 py-3 rounded-lg font-bold text-slate-900 uppercase tracking-widest transition-colors">
              Recalibrate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}