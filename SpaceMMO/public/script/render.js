import createMap from "./map.js";

export function createRenderer({ canvas, ctx, state }) {
  let raf = null;
  let last = performance.now();
  let frameCount = 0;
  let lastFpsTime = 0;
  let radarUpdateTimer = 0;
  const RADAR_UPDATE_INTERVAL = 0.1; 

  // UI
  const mapCanvas = document.getElementById("mapCanvas");
  const mapBtn = document.getElementById("mapBtn");
  const mapOverlay = document.getElementById("mapOverlay");
  const mapClose = document.getElementById("mapClose");
  const mapPanel = document.getElementById("mapPanel");
  const mapSearch = document.getElementById("mapSearch");
  
  const mapConfirm = document.getElementById("mapConfirm");
  const confName = document.getElementById("confName");
  const confTime = document.getElementById("confTime");
  const confStartBtn = document.getElementById("confStartBtn");

  const fpsVal = document.getElementById("fpsVal");
  const radarCanvas = document.getElementById("radarCanvas");
  const radarCtx = radarCanvas ? radarCanvas.getContext("2d") : null;

  let mapInstance = null;
  let pendingTarget = null; 
  let isMapOpen = false;

  const VIEW_SCALE = 0.04; 

  function drawAsteroid(ctx, sx, sy, a) {
      const rot = a.rotation || 0;
      ctx.translate(sx, sy);
      ctx.rotate(rot);
      
      ctx.beginPath();
      if (a.points && a.points.length > 0) {
          const s = VIEW_SCALE;
          const p0 = a.points[0];
          ctx.moveTo(p0.x * s, p0.y * s);
          for(let i=1; i<a.points.length; i++) {
              const p = a.points[i];
              ctx.lineTo(p.x * s, p.y * s);
          }
      } else {
          ctx.arc(0, 0, a.size * VIEW_SCALE, 0, Math.PI*2);
      }
      ctx.closePath();
      ctx.fillStyle = a.color || "#666";
      ctx.fill();
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // --- NOUVELLE FONCTION DE BARRIÈRE PLASMA ---
  function drawPlasmaBarrier(ctx, cx, cy, radius, time) {
      const rPx = radius * VIEW_SCALE;
      const thickness = 200; // Épaisseur visuelle massive
      
      // Culling large pour éviter de dessiner si hors champ
      if (cx < -rPx - thickness || cx > canvas.width + rPx + thickness || 
          cy < -rPx - thickness || cy > canvas.height + rPx + thickness) return;

      // 1. Aura atmosphérique lointaine (Bleu foncé)
      ctx.save();
      const distStart = rPx * 0.94;
      const distEnd = rPx * 1.0;
      
      const grad = ctx.createRadialGradient(cx, cy, distStart, cx, cy, distEnd);
      grad.addColorStop(0, "rgba(0, 0, 0, 0)");
      grad.addColorStop(0.6, "rgba(0, 50, 255, 0.1)");
      grad.addColorStop(1, "rgba(0, 150, 255, 0.3)");
      
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx, cy, distEnd, 0, Math.PI * 2); ctx.fill();

      // 2. Mur d'énergie principal (Cyan/Blanc pulsant)
      ctx.beginPath();
      ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
      
      // Pulsation de l'épaisseur
      const pulse = Math.sin(time * 8) * 5;
      ctx.lineWidth = 40 + pulse;
      
      // Lueur intense
      ctx.shadowBlur = 30;
      ctx.shadowColor = "#00ffff";
      
      // Couleur électrique
      ctx.strokeStyle = `rgba(150, 255, 255, ${0.6 + Math.sin(time * 15) * 0.2})`;
      ctx.stroke();
      
      // Reset Shadow pour performance
      ctx.shadowBlur = 0;

      // 3. Arcs électriques aléatoires (Effet "Déchirure")
      const segments = 60;
      const angleStep = (Math.PI * 2) / segments;
      
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
          const angle = i * angleStep + (time * 0.2); // Rotation lente
          // Jitter sur le rayon
          const jitter = (Math.random() - 0.5) * 30;
          const rArc = rPx + jitter;
          const x = cx + Math.cos(angle) * rArc;
          const y = cy + Math.sin(angle) * rArc;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#fff";
      ctx.stroke();

      ctx.restore();
  }

  function drawRealisticBody(ctx, cx, cy, radius, p) {
    const margin = radius * 2;
    if (cx < -margin || cx > ctx.canvas.width + margin || 
        cy < -margin || cy > ctx.canvas.height + margin) return;
    if (p.hasRings) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.ellipse(0, 0, radius * 2.2, radius * 0.6, 0, 0, Math.PI*2);
      ctx.strokeStyle = p.ringColor || "rgba(200,200,200,0.3)"; ctx.lineWidth = radius * 0.4; ctx.stroke(); ctx.restore();
    }
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    if (p.type === 'star') { grad.addColorStop(0, "#fff"); grad.addColorStop(0.2, "#ffaa00"); grad.addColorStop(1, "#ff5500"); }
    else if (p.name === "Jupiter") { grad.addColorStop(0, "#d9c19b"); grad.addColorStop(0.5, "#a88"); grad.addColorStop(1, "#d9c19b"); }
    else if (p.name === "Terre") { grad.addColorStop(0, "#2255ff"); grad.addColorStop(1, "#001144"); }
    else { grad.addColorStop(0, p.color || "#888"); grad.addColorStop(1, "#000"); }
    ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
  }

  function drawBlackHole(ctx, cx, cy, radius, accretionSize) {
    const margin = accretionSize;
    if (cx < -margin || cx > ctx.canvas.width + margin || 
        cy < -margin || cy > ctx.canvas.height + margin) return;
    
    ctx.fillStyle="#000"; ctx.strokeStyle="#60a"; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle="#fff"; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(cx, cy, accretionSize, 0, Math.PI*2); ctx.stroke();
  }

  function drawRadar(ctx, w, h, time) {
    ctx.clearRect(0, 0, w, h);
    const cx = w/2; const cy = h/2;
    const maxR = w/2 - 10;
    const RADAR_RANGE = 200000; 

    ctx.strokeStyle = "rgba(0, 255, 100, 0.2)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, maxR, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, maxR*0.5, 0, Math.PI*2); ctx.stroke();

    const scanAngle = (time * 2.5) % (Math.PI * 2);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(scanAngle);
    ctx.fillStyle = "rgba(0, 255, 100, 0.1)"; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0, 0, maxR, -0.2, 0.2); ctx.fill();
    ctx.restore();

    if(state.planets) {
        state.planets.forEach(p => {
            const dx = p.x - state.me.x; const dy = p.y - state.me.y;
            if(Math.hypot(dx, dy) < RADAR_RANGE) {
                const r = (Math.hypot(dx, dy) / RADAR_RANGE) * maxR;
                const a = Math.atan2(dy, dx); 
                ctx.fillStyle = "#0cf";
                ctx.beginPath(); ctx.arc(cx + Math.cos(a)*r, cy + Math.sin(a)*r, 3, 0, Math.PI*2); ctx.fill();
            }
        });
    }
    
    ctx.save(); ctx.translate(cx, cy); 
    const shipA = Math.atan2(state.currentHeading.y, state.currentHeading.x) + Math.PI/2;
    ctx.rotate(shipA);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.fill();
    ctx.restore();
  }

  if (mapCanvas) {
    mapInstance = createMap(mapCanvas, state);
    mapCanvas.addEventListener("map:select", (e) => {
      const d = e.detail;
      let targetName = "";
      if (d.obj) {
          pendingTarget = { x: d.obj.x, y: d.obj.y, obj: d.obj };
          targetName = d.obj.name || (d.obj.id ? `PILOTE ${d.obj.id.substr(0,4)}` : "OBJET");
          pendingTarget.name = targetName;
      } else if (d.coords) {
          pendingTarget = { x: d.coords.x, y: d.coords.y, name: "COORDONNÉES" };
          targetName = "COORDONNÉES SPATIALES";
      }
      if (pendingTarget) {
          if(confName) confName.textContent = "DEST : " + targetName.toUpperCase();
          if(mapConfirm) mapConfirm.style.display = "flex";
      }
    });
    if (mapSearch) {
        mapSearch.addEventListener("input", (e) => {
            const val = e.target.value;
            if (val.length >= 2 && mapInstance) mapInstance.selectByName(val);
        });
    }
  }

  if (confStartBtn) {
      confStartBtn.onclick = () => {
          if (pendingTarget) {
              state.navigateTo(pendingTarget.x, pendingTarget.y, pendingTarget.name);
              closeMap();
          }
      };
  }

  function openMap() { if(mapOverlay) { mapOverlay.style.display = "flex"; isMapOpen = true; if(mapInstance) { mapInstance.start(); mapInstance.centerOnShip(); } } }
  function closeMap() { if(mapOverlay) { mapOverlay.style.display = "none"; isMapOpen = false; if(mapInstance) mapInstance.stop(); } }
  if(mapBtn) mapBtn.addEventListener("click", openMap);
  if(mapClose) mapClose.addEventListener("click", closeMap);

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    const time = now / 1000;
    
    frameCount++;
    if (now - lastFpsTime >= 1000) {
      if(fpsVal) fpsVal.textContent = frameCount;
      frameCount = 0;
      lastFpsTime = now;
    }
    last = now;

    const info = state.updateLogic(dt);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    state.starfield.draw(ctx, w, h, info.cx, info.cy);
    
    if(state.mapLimit) {
        // Le centre du monde en coordonnées écran
        const limitSx = info.cx + (0 - info.shipX) * VIEW_SCALE;
        const limitSy = info.cy + (0 - info.shipY) * VIEW_SCALE;
        drawPlasmaBarrier(ctx, limitSx, limitSy, state.mapLimit, time);
    }

    radarUpdateTimer += dt;
    if(radarCtx && radarUpdateTimer >= RADAR_UPDATE_INTERVAL) {
        drawRadar(radarCtx, 220, 220, time);
        radarUpdateTimer = 0;
    }

    if (info.blackHoles) {
        for(let bh of info.blackHoles) {
            const sx = info.cx + (bh.x - info.shipX) * VIEW_SCALE;
            const sy = info.cy + (bh.y - info.shipY) * VIEW_SCALE;
            drawBlackHole(ctx, sx, sy, bh.size * VIEW_SCALE, bh.accretionSize * VIEW_SCALE);
        }
    }

    if (info.asteroids) {
        const len = info.asteroids.length;
        const margin = 200;
        const cx = info.cx;
        const cy = info.cy;
        const shipX = info.shipX;
        const shipY = info.shipY;
        
        const leftBound = -margin;
        const rightBound = w + margin;
        const topBound = -margin;
        const bottomBound = h + margin;
        
        for(let i=0; i<len; i++) {
            const a = info.asteroids[i];
            const sx = (cx + (a.x - shipX) * VIEW_SCALE) | 0;
            const sy = (cy + (a.y - shipY) * VIEW_SCALE) | 0;
            
            if (sx < leftBound || sx > rightBound || sy < topBound || sy > bottomBound) continue;

            drawAsteroid(ctx, sx, sy, a);
        }
    }

    if (info.planets) {
        const halfW = w/2;
        const halfH = h/2;
        const maxDist = 3000;
        const cx = info.cx;
        const cy = info.cy;
        const shipX = info.shipX;
        const shipY = info.shipY;
        
        for (let i = 0; i < info.planets.length; i++) {
            const p = info.planets[i];
            const sx = cx + (p.x - shipX) * VIEW_SCALE;
            const sy = cy + (p.y - shipY) * VIEW_SCALE;
            
            const dx = sx - halfW;
            const dy = sy - halfH;
            const distSq = dx * dx + dy * dy;
            if (distSq > maxDist * maxDist) continue;
            
            const drawRadius = p.size * VIEW_SCALE;
            drawRealisticBody(ctx, sx, sy, drawRadius, p);
        }
    }

    state.ship.draw(ctx, info.cx, info.cy, 1.0, info.angle, time, info.thrustParams.thrust, info.thrustParams.speedRatio);

    if (info.others) {
        const list = Array.isArray(info.others) ? info.others : Object.values(info.others);
        const margin = 100;
        const cx = info.cx;
        const cy = info.cy;
        const shipX = info.shipX;
        const shipY = info.shipY;
        const myId = state.myId;
        
        for(let i = 0; i < list.length; i++) {
            const other = list[i];
            if (other.id === myId) continue;
            
            const sx = cx + (other.x - shipX) * VIEW_SCALE;
            const sy = cy + (other.y - shipY) * VIEW_SCALE;
            if (sx < -margin || sx > w + margin || sy < -margin || sy > h + margin) continue;
            
            const otherThrust = (other.inputs && other.inputs.up) ? 1 : 0;
            state.ship.draw(ctx, sx, sy, 1.0, other.angle + Math.PI/2, time, otherThrust, 0);
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = "10px monospace";
            ctx.textAlign = "center";
            ctx.fillText(`PILOTE ${other.id.substr(0,4)}`, sx, sy - 30);
        }
    }

    if (isMapOpen && pendingTarget && mapConfirm.style.display !== 'none') {
        if(state.me) {
            const dist = Math.hypot(pendingTarget.x - state.me.x, pendingTarget.y - state.me.y);
            let arrivalDist = dist;
            if (pendingTarget.obj && pendingTarget.obj.size) {
                arrivalDist = Math.max(0, dist - (pendingTarget.obj.size * 2));
            }
            const timeSec = arrivalDist / state.maxSpeed;
            const mins = Math.floor(timeSec / 60);
            const secs = Math.floor(timeSec % 60);
            if(confTime) confTime.textContent = `Temps estimé : ${mins}m ${secs}s`;
        }
    }

    raf = requestAnimationFrame(frame);
  }

  return {
    start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } },
    stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } mapInstance && mapInstance.stop(); }
  };
}