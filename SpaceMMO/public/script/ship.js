export default function createShip() {
  const metalColor = "#cbd5e1";
  const darkMetal = "#475569";
  const detailColor = "#94a3b8";

  function draw(ctx, cx, cy, scale = 1, angle = 0, time = 0, thrust = 0, speedRatio = 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    // 1. OMBRE
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.ellipse(0, 15, 12, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. FLAMMES DU MOTEUR (Plasma Style)
    if (thrust > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      
      const tVal = Math.max(0, Math.min(1, thrust));
      const flicker = Math.sin(time * 40) * 0.1 + 0.9;
      const length = 15 + tVal * 45 * flicker;
      const width = 6 + tVal * 4;

      // Glow externe (Cyan/Bleu électrique)
      const glow = ctx.createRadialGradient(0, 18, 2, 0, 18 + length, width * 2.5);
      glow.addColorStop(0, "rgba(0, 200, 255, 0.6)");
      glow.addColorStop(0.4, "rgba(0, 100, 255, 0.2)");
      glow.addColorStop(1, "rgba(0, 0, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(0, 18 + length * 0.4, width * 1.5, length * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Coeur énergétique (Blanc/Cyan intense)
      const coreLength = length * 0.7;
      const core = ctx.createLinearGradient(0, 18, 0, 18 + coreLength);
      core.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      core.addColorStop(0.3, "rgba(180, 240, 255, 0.8)");
      core.addColorStop(1, "rgba(0, 200, 255, 0)");
      
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.moveTo(-width * 0.4, 18);
      ctx.lineTo(width * 0.4, 18);
      ctx.lineTo(0, 18 + coreLength);
      ctx.fill();

      // Particules
      for(let i=0; i<3; i++) {
        const offset = (time * 10 + i * 2) % 5;
        const yPos = 18 + offset * (length/5);
        const alpha = (1 - offset/5) * tVal;
        ctx.fillStyle = `rgba(100, 220, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc((Math.random()-0.5)*width, yPos, 1.5, 0, Math.PI*2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 3. CARLINGUE
    // Corps principal
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.quadraticCurveTo(12, 5, 12, 15);
    ctx.lineTo(6, 18);
    ctx.lineTo(-6, 18);
    ctx.lineTo(-12, 15);
    ctx.quadraticCurveTo(-12, 5, 0, -25);
    ctx.fillStyle = metalColor;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = darkMetal;
    ctx.stroke();

    // Ailes
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(-22, 16);
    ctx.lineTo(-10, 14);
    ctx.fillStyle = detailColor;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10, 5);
    ctx.lineTo(22, 16);
    ctx.lineTo(10, 14);
    ctx.fillStyle = detailColor;
    ctx.fill();
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.ellipse(0, -5, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Reflet Cockpit
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(-1, -6, 1, 2, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Détails réacteurs
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.rect(-5, 16, 10, 3);
    ctx.fill();

    // Lumières de position
    const blink = Math.sin(time * 6) > 0;
    ctx.fillStyle = blink ? "#ef4444" : "#7f1d1d";
    ctx.beginPath();
    ctx.arc(-22, 16, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = blink ? "#22c55e" : "#14532d";
    ctx.beginPath();
    ctx.arc(22, 16, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  return { draw };
}