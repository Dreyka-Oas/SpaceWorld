export default function createStarfield(count = 1500) {
  const stars = [];
  const rng = (a, b) => a + Math.random() * (b - a);
  const WIDTH = 4000;
  const HEIGHT = 4000;

  for (let i = 0; i < count; i++) {
    const depth = rng(0.1, 2.0);
    stars.push({
      x: rng(-WIDTH/2, WIDTH/2),
      y: rng(-HEIGHT/2, HEIGHT/2),
      size: Math.random() * 1.5 + 0.5,
      brightness: rng(0.3, 1.0),
      z: depth
    });
  }

  function update(dt, speed, vx, vy) {
    for (let s of stars) {
      const parallax = 0.02 * s.z; 

      s.x += vx * dt * parallax;
      s.y += vy * dt * parallax;

      if (s.x < -WIDTH/2) s.x += WIDTH;
      if (s.x > WIDTH/2) s.x -= WIDTH;
      if (s.y < -HEIGHT/2) s.y += HEIGHT;
      if (s.y > HEIGHT/2) s.y -= HEIGHT;
    }
  }

  function draw(ctx, w, h, cx, cy) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    const left = -w/2;
    const right = w/2;
    const top = -h/2;
    const bottom = h/2;
    const halfW = w/2;
    const halfH = h/2;

    // Grouper les étoiles par niveau de luminosité pour réduire les changements de fillStyle
    const brightStars = [];
    const mediumStars = [];
    const dimStars = [];

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const renderX = s.x;
      const renderY = s.y;

      if (renderX < left || renderX > right || renderY < top || renderY > bottom) continue;

      if (s.brightness > 0.7) brightStars.push(s);
      else if (s.brightness > 0.5) mediumStars.push(s);
      else dimStars.push(s);
    }

    // Dessiner par batch pour minimiser les changements de fillStyle
    const drawBatch = (starList, alpha) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      for (let i = 0; i < starList.length; i++) {
        const s = starList[i];
        ctx.beginPath();
        ctx.arc(halfW + s.x, halfH + s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    drawBatch(dimStars, 0.4);
    drawBatch(mediumStars, 0.7);
    drawBatch(brightStars, 1.0);
  }

  return { update, draw };
}