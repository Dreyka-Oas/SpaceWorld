export function findSafeSpawnPosition(mapLimit, planets, asteroids, blackHoles) {
  const MAX_ATTEMPTS = 1000;
  
  // Marge de sécurité par rapport à la barrière plasma (on spawn à max 85% du rayon)
  const SPAWN_RADIUS_LIMIT = mapLimit * 0.85;

  const SAFE_DIST_PLANET = 400000; 
  const SAFE_DIST_ASTEROID = 8000; 
  const SAFE_DIST_BH = 1000000;    

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // CORRECTION : Utilisation de coordonnées polaires pour rester dans le cercle
    const angle = Math.random() * Math.PI * 2;
    // Math.sqrt(random) pour une distribution uniforme dans un disque
    const r = Math.sqrt(Math.random()) * SPAWN_RADIUS_LIMIT; 

    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    let safe = true;

    // Vérif Planètes
    for (const p of planets) {
      const dist = Math.hypot(x - p.x, y - p.y);
      if (dist < p.size + SAFE_DIST_PLANET) {
        safe = false; 
        break;
      }
    }
    if (!safe) continue;

    // Vérif Trous Noirs
    for (const bh of blackHoles) {
      const dist = Math.hypot(x - bh.x, y - bh.y);
      if (dist < bh.size + SAFE_DIST_BH) {
        safe = false; 
        break;
      }
    }
    if (!safe) continue;

    // Vérif Astéroïdes
    for (const a of asteroids) {
      const dx = x - a.x;
      const dy = y - a.y;
      const distSq = dx*dx + dy*dy;
      const safeRad = a.size + SAFE_DIST_ASTEROID;
      
      if (distSq < safeRad * safeRad) {
        safe = false;
        break;
      }
    }

    if (safe) {
      console.log(`Spawn sécurisé trouvé (${i+1} essais) : Dist. Centre ${Math.round(r/1000)}k km`);
      return { x, y };
    }
  }

  // Fallback sûr : orbite terrestre approx
  return { x: 15000000 + 100000, y: 100000 };
}