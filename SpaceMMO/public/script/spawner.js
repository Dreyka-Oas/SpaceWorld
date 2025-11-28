export function findSafeSpawnPosition(mapLimit, planets, asteroids, blackHoles) {
  const MAX_ATTEMPTS = 1000;
  // Distances de sécurité
  const SAFE_DIST_PLANET = 400000; // Loin des planètes
  const SAFE_DIST_ASTEROID = 8000; // Pas collé à un caillou
  const SAFE_DIST_BH = 1000000;    // Très loin des trous noirs

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    // 1. Générer une position aléatoire dans la map
    // On évite les bords extrêmes (90% de la map)
    const x = (Math.random() - 0.5) * 2 * (mapLimit * 0.9);
    const y = (Math.random() - 0.5) * 2 * (mapLimit * 0.9);

    let safe = true;

    // 2. Vérifier collision Planètes (et Soleil)
    for (const p of planets) {
      const dist = Math.hypot(x - p.x, y - p.y);
      // On ajoute la taille de la planète à la distance de sécurité
      if (dist < p.size + SAFE_DIST_PLANET) {
        safe = false; 
        break;
      }
    }
    if (!safe) continue;

    // 3. Vérifier collision Trous Noirs
    for (const bh of blackHoles) {
      const dist = Math.hypot(x - bh.x, y - bh.y);
      if (dist < bh.size + SAFE_DIST_BH) {
        safe = false; 
        break;
      }
    }
    if (!safe) continue;

    // 4. Vérifier collision Astéroïdes
    // On vérifie le carré de la distance pour éviter les racines carrées (plus rapide)
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

    // Si on a passé tous les tests, c'est bon !
    if (safe) {
      // Petit log pour le debug
      console.log(`Spawn sécurisé trouvé en ${i+1} tentatives : ${Math.round(x)}, ${Math.round(y)}`);
      return { x, y };
    }
  }

  // Fallback si vraiment on a pas de chance (très peu probable vu l'espace vide)
  console.warn("Aucun spawn sécurisé trouvé, retour au centre (dangereux)");
  return { x: 5000000, y: 5000000 };
}