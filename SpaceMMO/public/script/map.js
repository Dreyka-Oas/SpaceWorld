export default function createMap(canvas, state) {
  const ctx = canvas.getContext("2d");
  let raf = null;
  
  const confTimeEl = document.getElementById("confTime");
  const confStartBtn = document.getElementById("confStartBtn");
  const mapOverlay = document.getElementById("mapOverlay");
  
  let offsetX = 0;
  let offsetY = 0;
  let scale = 0.5;
  
  let isPanning = false;
  let lastPointer = { x: 0, y: 0 };
  let selectedObj = null; 
  let selectedCoords = null;

  const MAP_SCALE = 0.00003; 
  const MAP_LIMIT_WORLD = 110000000;

  function centerOnShip() {
    if(state && state.me && state.me.x !== undefined) {
       offsetX = -(state.me.x * MAP_SCALE) * scale;
       offsetY = -(state.me.y * MAP_SCALE) * scale;
    }
  }

  function centerOnTarget(target) {
      offsetX = -(target.x * MAP_SCALE) * scale;
      offsetY = -(target.y * MAP_SCALE) * scale;
      selectedObj = target;
      selectedCoords = null;
      triggerSelectionEvent(target);
  }

  function drawSelectionReticle(ctx, x, y, radius, now) {
    ctx.save();
    ctx.translate(x, y);
    const time = now * 0.002;
    const pulse = 1 + Math.sin(now * 0.005) * 0.1;
    const r = Math.max(20/scale, radius * 1.5) * pulse;

    ctx.strokeStyle = "#4aff4a";
    ctx.lineWidth = 2 / scale;

    ctx.save();
    ctx.rotate(time);
    ctx.setLineDash([10/scale, 15/scale]);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  function drawShipTriangle(ctx, x, y, angle, color, sizeScale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2); 
    const s = 6 / sizeScale; 
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.5); 
    ctx.lineTo(s, s);        
    ctx.lineTo(0, s * 0.7);  
    ctx.lineTo(-s, s);       
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawRealisticBody(ctx, cx, cy, radius, p) {
    ctx.save();
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
    ctx.restore();
  }

  function draw(now) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, w, h);

    const gridSize = 100 * scale; 
    const startX = (w/2 + offsetX) % gridSize;
    const startY = (h/2 + offsetY) % gridSize;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)"; ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x = startX; x < w; x+=gridSize) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for(let y = startY; y < h; y+=gridSize) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();

    const cx = w / 2 + offsetX;
    const cy = h / 2 + offsetY;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    if (!state) { ctx.restore(); return; }

    const planets = state.planets || [];
    const blackHoles = state.blackHoles || [];

    // Limites
    ctx.strokeStyle = "rgba(255, 50, 50, 0.3)";
    ctx.lineWidth = 2 / scale;
    ctx.beginPath(); ctx.arc(0, 0, MAP_LIMIT_WORLD * MAP_SCALE, 0, Math.PI * 2); ctx.stroke();

    // Orbites
    for (let p of planets) {
      if (p.orbitalRadius > 0) {
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1/scale;
        ctx.beginPath(); ctx.arc(0, 0, p.orbitalRadius * MAP_SCALE, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Trous Noirs
    for(let bh of blackHoles) {
        const bx = bh.x * MAP_SCALE;
        const by = bh.y * MAP_SCALE;
        const bSize = Math.max(4/scale, bh.size * MAP_SCALE * 2.5);
        ctx.fillStyle = "#000"; ctx.strokeStyle = "#a0f"; ctx.lineWidth = 2/scale;
        ctx.beginPath(); ctx.arc(bx, by, bSize, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    }

    // Planètes
    for (let p of planets) {
      const px = p.x * MAP_SCALE;
      const py = p.y * MAP_SCALE;
      const size = Math.max(10 / scale, p.size * MAP_SCALE * 4);

      drawRealisticBody(ctx, px, py, size, p);

      if (selectedObj && selectedObj.name === p.name) {
        drawSelectionReticle(ctx, px, py, size, now);
      }

      if (scale > 0.05) {
        ctx.fillStyle = "#fff";
        ctx.font = `${14/scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(p.name, px, py - size - (5/scale));
      }
    }

    // Destination
    let destX, destY;
    if (selectedObj) { destX = selectedObj.x; destY = selectedObj.y; }
    else if (selectedCoords) { destX = selectedCoords.x; destY = selectedCoords.y; }

    if (destX !== undefined) {
      const tx = destX * MAP_SCALE;
      const ty = destY * MAP_SCALE;
      
      if (!selectedObj || (selectedObj && selectedObj.type !== 'planet')) {
          drawSelectionReticle(ctx, tx, ty, 5/scale, now);
      }

      if (state.me && state.me.x !== undefined) {
          const sx = state.me.x * MAP_SCALE;
          const sy = state.me.y * MAP_SCALE;
          ctx.strokeStyle = "rgba(74, 255, 74, 0.5)"; 
          ctx.lineWidth = 1 / scale;
          ctx.setLineDash([15/scale, 15/scale]);
          const offset = (now * 0.05) % (30/scale);
          ctx.lineDashOffset = -offset;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty); ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
      }
      
      updateUI(destX, destY, state);
    }

    // Joueurs
    if (state.me && state.me.x !== undefined) {
      const sx = state.me.x * MAP_SCALE;
      const sy = state.me.y * MAP_SCALE;
      drawShipTriangle(ctx, sx, sy, state.me.angle, "#4aff4a", scale);

      if (state.others) {
        const list = Array.isArray(state.others) ? state.others : Object.values(state.others);
        list.forEach(other => {
             if(other.id === state.myId) return;
             const ox = other.x * MAP_SCALE;
             const oy = other.y * MAP_SCALE;
             drawShipTriangle(ctx, ox, oy, other.angle, "#ffaa00", scale);
             
             if (selectedObj && selectedObj.id === other.id) {
                 drawSelectionReticle(ctx, ox, oy, 10/scale, now);
                 ctx.fillStyle = "#fff";
                 ctx.font = `${10/scale}px monospace`;
                 ctx.textAlign = "center";
                 ctx.fillText(`PILOTE ${other.id.substr(0,4)}`, ox, oy - 20/scale);
             }
        });
      }
    }

    ctx.restore();
  }

  function loop(now) { draw(now || performance.now()); raf = requestAnimationFrame(loop); }

  function updateUI(destX, destY, state) {
      if (confTimeEl && document.getElementById("mapConfirm").style.display !== 'none') {
          const dist = Math.hypot(destX - state.me.x, destY - state.me.y);
          let arrivalDist = dist;
          if (selectedObj && selectedObj.size) arrivalDist = Math.max(0, dist - (selectedObj.size * 2));

          const timeSec = arrivalDist / state.maxSpeed;
          const mins = Math.floor(timeSec / 60);
          const secs = Math.floor(timeSec % 60);
          confTimeEl.textContent = `Temps estimé : ${mins}m ${secs}s (Dist: ${Math.round(arrivalDist/1000)}k km)`;
      }
  }

  function getObjectAtPosition(worldX, worldY) {
    const planets = state.planets || [];
    const clickTol = 1000000 / scale; 
    for(let p of planets) {
        if(Math.hypot(worldX - p.x, worldY - p.y) < Math.max(p.size * 4, clickTol)) return p;
    }
    if (state.others) {
        const list = Array.isArray(state.others) ? state.others : Object.values(state.others);
        for(let other of list) {
            if (other.id === state.myId) continue;
            if (Math.hypot(worldX - other.x, worldY - other.y) < 2000000 / scale) return other;
        }
    }
    return null;
  }

  function getWorldPosFromScreen(sx, sy) {
    const w = canvas.clientWidth; const h = canvas.clientHeight;
    const cx = w/2 + offsetX; const cy = h/2 + offsetY;
    const wx = ((sx - cx) / scale) / MAP_SCALE;
    const wy = ((sy - cy) / scale) / MAP_SCALE;
    return { x: wx, y: wy };
  }

  function clampPan() {
      const limitPx = MAP_LIMIT_WORLD * MAP_SCALE;
      const centerWorldX = -offsetX / scale;
      const centerWorldY = -offsetY / scale;
      const dist = Math.hypot(centerWorldX, centerWorldY);
      if (dist > limitPx) {
          const angle = Math.atan2(centerWorldY, centerWorldX);
          const clampedX = Math.cos(angle) * limitPx;
          const clampedY = Math.sin(angle) * limitPx;
          offsetX = -clampedX * scale;
          offsetY = -clampedY * scale;
      }
  }

  function triggerSelectionEvent(hit) {
      const mapConfirm = document.getElementById("mapConfirm");
      const confName = document.getElementById("confName");
      if (hit) {
          selectedObj = hit; selectedCoords = null;
          let displayName = hit.name || (hit.id ? `PILOTE ${hit.id.substr(0,4)}` : "OBJET");
          if(confName) confName.textContent = "CIBLE : " + displayName.toUpperCase();
      }
      if(mapConfirm) mapConfirm.style.display = "flex";
  }

  function onPointerDown(e) { isPanning = true; lastPointer = { x: e.clientX, y: e.clientY }; }
  
  function onPointerMove(e) {
    if (isPanning) {
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      offsetX += dx; offsetY += dy;
      clampPan();
      lastPointer = { x: e.clientX, y: e.clientY };
    }
  }

  function onPointerUp(e) {
    if (!isPanning) return;
    isPanning = false;
    
    if (Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y) < 5) {
        const rect = canvas.getBoundingClientRect();
        const worldPos = getWorldPosFromScreen(e.clientX - rect.left, e.clientY - rect.top);
        const hit = getObjectAtPosition(worldPos.x, worldPos.y);
        
        if (hit) {
            triggerSelectionEvent(hit);
            canvas.dispatchEvent(new CustomEvent("map:select", { detail: { obj: hit } }));
        } else {
            selectedObj = null; selectedCoords = worldPos;
            const mapConfirm = document.getElementById("mapConfirm");
            const confName = document.getElementById("confName");
            if(confName) confName.textContent = "COORDONNÉES SPATIALES";
            if(mapConfirm) mapConfirm.style.display = "flex";
            canvas.dispatchEvent(new CustomEvent("map:select", { detail: { coords: worldPos } }));
        }
    }
  }

  function onWheel(e) {
    e.preventDefault();
    const zoom = Math.exp(-e.deltaY * 0.0015);
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const w = canvas.width / (window.devicePixelRatio || 1); 
    const h = canvas.height / (window.devicePixelRatio || 1);

    const worldMouseX = (mouseX - (w/2 + offsetX)) / scale;
    const worldMouseY = (mouseY - (h/2 + offsetY)) / scale;

    const newScale = Math.max(0.002, Math.min(200, scale * zoom));
    offsetX = mouseX - (w/2) - (worldMouseX * newScale);
    offsetY = mouseY - (h/2) - (worldMouseY * newScale);
    scale = newScale;
    clampPan();
  }

  function attach() {
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
  }
  
  function detach() {
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
  }

  return {
    start() { if (!raf) raf = requestAnimationFrame(loop); attach(); },
    stop() { cancelAnimationFrame(raf); raf = null; detach(); },
    centerOnShip,
    selectByName(name) {
        if(!state || !state.planets) return;
        const found = state.planets.find(p => p.name.toLowerCase().startsWith(name.toLowerCase()));
        if(found) centerOnTarget(found);
    }
  };
}