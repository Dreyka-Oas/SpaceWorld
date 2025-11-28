export function generateObstacles(mapRadius) {
  const asteroids = [];
  const blackHoles = []; 

  const COUNT = 30000; 
  
  for (let i = 0; i < COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 1000000 + Math.random() * (mapRadius * 0.95 - 1000000); 
    
    // Taille variée
    let size = 200 + Math.random() * 600;
    if (Math.random() > 0.95) size = 1500 + Math.random() * 3000;

    // Vitesse
    const speedBase = Math.sqrt(50000000000 / dist); 
    const speed = speedBase + (Math.random() - 0.5) * 400;

    const orbitAngle = angle + Math.PI / 2; 
    const vx = Math.cos(orbitAngle) * speed;
    const vy = Math.sin(orbitAngle) * speed;

    // GÉNÉRATION DE LA FORME (Polygone)
    const points = [];
    const numPoints = 5 + Math.floor(Math.random() * 5); // 5 à 9 sommets
    for (let j = 0; j < numPoints; j++) {
        const a = (j / numPoints) * Math.PI * 2;
        // Variation du rayon pour faire "caillou" et pas "cercle parfait"
        const r = size * (0.6 + Math.random() * 0.4); 
        points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }

    asteroids.push({
      id: i,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: vx,
      vy: vy,
      size: size,
      points: points, // On stocke la forme
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.8, // Vitesse de rotation
      color: Math.random() > 0.9 ? "#bbb" : "#555"
    });
  }

  // Trous Noirs
  for(let j=0; j<12; j++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15000000 + Math.random() * (mapRadius * 0.8 - 15000000);
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