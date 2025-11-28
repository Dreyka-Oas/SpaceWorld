export function generateObstacles(mapRadius) {
  const asteroids = [];
  const blackHoles = []; 

  // CONFIGURATION : 30 000 Astéroïdes (Limite stricte demandée)
  const COUNT = 30000; 
  
  for (let i = 0; i < COUNT; i++) {
    // 1. Positionnement
    const angle = Math.random() * Math.PI * 2;
    // Distribution : Ceinture dense entre 1M et la limite, moins dense au centre
    const dist = 1000000 + Math.random() * (mapRadius - 1000000); 
    
    // 2. Taille
    // 95% de petits/moyens, 5% de géants
    let size = 200 + Math.random() * 600;
    if (Math.random() > 0.95) size = 1500 + Math.random() * 3000;

    // 3. Vitesse Orbitale (Physique simplifiée)
    // Plus on est près du centre, plus on tourne vite
    const speedBase = Math.sqrt(50000000000 / dist); 
    const speedVar = (Math.random() - 0.5) * 400; // Variation aléatoire
    const speed = speedBase + speedVar;

    // Calcul du vecteur vitesse (Tangentiel à l'orbite)
    const orbitAngle = angle + Math.PI / 2; 
    const vx = Math.cos(orbitAngle) * speed;
    const vy = Math.sin(orbitAngle) * speed;

    asteroids.push({
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: vx,
      vy: vy,
      size: size,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.5
    });
  }

  // Quelques Trous Noirs dangereux pour le gameplay
  for(let j=0; j<12; j++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15000000 + Math.random() * (mapRadius - 15000000);
      blackHoles.push({
          id: `bh_${j}`,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: 3000 + Math.random() * 8000,
          type: 'blackhole'
      });
  }

  return { asteroids, blackHoles };
}