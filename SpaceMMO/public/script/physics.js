export class SpatialGrid {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }
  clear() { this.cells.clear(); }
  getKey(x, y) { return `${Math.floor(x / this.cellSize)}:${Math.floor(y / this.cellSize)}`; }
  add(obj) {
    const key = this.getKey(obj.x, obj.y);
    if (!this.cells.has(key)) this.cells.set(key, []);
    this.cells.get(key).push(obj);
  }
  getNearby(x, y) {
    const nearby = [];
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const cell = this.cells.get(`${cx + i}:${cy + j}`);
        if (cell) for (let k = 0; k < cell.length; k++) nearby.push(cell[k]);
      }
    }
    return nearby;
  }
}

export function applyGravity(shipX, shipY, massObjects, dt) {
  let accX = 0; let accY = 0; let maxForceRatio = 0; 
  const len = massObjects.length;
  for (let i = 0; i < len; i++) {
    const obj = massObjects[i];
    if (!obj.gravity) continue; 
    const dx = obj.x - shipX; const dy = obj.y - shipY;
    const distSq = dx * dx + dy * dy;
    const pullRad = obj.gravityRadius || obj.size * 20;
    const pullRadSq = pullRad * pullRad;
    if (distSq < pullRadSq) {
      const dist = Math.sqrt(distSq);
      const G = 50000; 
      const mass = obj.size * (obj.type === 'blackhole' ? 80 : 10); 
      const force = (G * mass) / Math.max(distSq, 5000); 
      accX += (dx / dist) * force; accY += (dy / dist) * force;
      const ratio = 1 - (dist / pullRad);
      if(ratio > maxForceRatio) maxForceRatio = ratio;
    }
  }
  return { accX, accY, maxForceRatio };
}

export function checkCollisions(shipX, shipY, grid, largeObjects) {
  const shipRad = 50;
  // Large objects (including moons if passed)
  for (let i = 0; i < largeObjects.length; i++) {
    const obj = largeObjects[i];
    const dx = shipX - obj.x; const dy = shipY - obj.y;
    const safeZone = obj.size + shipRad + 200;
    if (Math.abs(dx) > safeZone || Math.abs(dy) > safeZone) continue;
    const distSq = dx * dx + dy * dy;
    const hitDist = obj.size; 
    if (distSq < hitDist * hitDist) {
      if (obj.type === 'blackhole') return "Déchiqueté par les forces de marée.";
      if (obj.type === 'star') return "Vaporisé par la chaleur stellaire.";
      if (obj.type === 'planet') return "Collision planétaire.";
      if (obj.type === 'moon') return "Impact lunaire.";
    }
  }
  // Asteroids
  const nearby = grid.getNearby(shipX, shipY);
  const len = nearby.length;
  for (let i = 0; i < len; i++) {
    const obj = nearby[i];
    const dx = shipX - obj.x; const dy = shipY - obj.y;
    if (Math.abs(dx) > obj.size + shipRad) continue;
    if (Math.abs(dy) > obj.size + shipRad) continue;
    const distSq = dx * dx + dy * dy;
    if (distSq < obj.size * obj.size) return "Impact critique avec un astéroïde.";
  }
  return null;
}

export function getNavigationVector(shipX, shipY, targetX, targetY, grid, largeObjects, headingX, headingY, currentGravity, targetObj) {
  const dx = targetX - shipX; const dy = targetY - shipY;
  const distToTarget = Math.hypot(dx, dy);
  let navX = dx / distToTarget; let navY = dy / distToTarget;
  let threatDetected = false; let urgency = 0;

  const localObstacles = grid.getNearby(shipX, shipY);
  
  const processObstacles = (list) => {
    let closestDist = Infinity; let threat = null;
    for (let i = 0; i < list.length; i++) {
      const obs = list[i];
      if (targetObj && obs === targetObj) continue; // Ignore target
      const ox = obs.x - shipX; const oy = obs.y - shipY;
      const distSq = ox*ox + oy*oy;
      const detectRad = 60000 + (obs.size * 8); 
      if (distSq > detectRad * detectRad) continue;
      const dist = Math.sqrt(distSq);
      const dot = (ox * headingX + oy * headingY) / dist;
      const safeDistance = obs.size * 3.5 + 3000;
      if (dist < safeDistance || dot > 0.5) {
        if (dist < closestDist) { closestDist = dist; threat = obs; }
      }
    }
    return threat;
  };

  let mostThreatening = processObstacles(largeObjects);
  if (!mostThreatening) mostThreatening = processObstacles(localObstacles);

  if (mostThreatening) {
    threatDetected = true;
    const obs = mostThreatening;
    const ox = obs.x - shipX; const oy = obs.y - shipY;
    const dist = Math.hypot(ox, oy);
    const orthoX = -oy / dist; const orthoY = ox / dist;
    const dotOrtho = orthoX * navX + orthoY * navY;
    const side = dotOrtho > 0 ? 1 : -1;
    const safeDist = obs.size * 3.5 + 3000;
    const dangerFactor = Math.max(0, 1 - (dist / (safeDist * 1.5))); 
    const evasionStrength = 2 + (dangerFactor * 30); 
    navX = (orthoX * side * evasionStrength) + (navX * 0.3);
    navY = (orthoY * side * evasionStrength) + (navY * 0.3);
    if (dist < safeDist) {
      urgency = 1;
      const pushX = -(ox / dist); const pushY = -(oy / dist);
      navX += pushX * 10; navY += pushY * 10;
    }
  }

  if (currentGravity && (Math.abs(currentGravity.accX) > 0 || Math.abs(currentGravity.accY) > 0)) {
    const antiGravScale = 6.0; 
    navX -= currentGravity.accX * antiGravScale;
    navY -= currentGravity.accY * antiGravScale;
  }

  const len = Math.hypot(navX, navY) || 1;
  return { x: navX / len, y: navY / len, threatDetected, urgency };
}