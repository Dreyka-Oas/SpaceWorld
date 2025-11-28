import { parentPort } from 'worker_threads';
import { generateObstacles } from './obstacles.js';

const MAP_LIMIT = 110000000;
const TICK_RATE = 20; 

console.log("[WORKER] Génération physique...");
const { asteroids, blackHoles } = generateObstacles(MAP_LIMIT);

parentPort.postMessage({ type: 'init', asteroids, blackHoles });

setInterval(() => {
    const dt = 1 / TICK_RATE;

    for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        
        // Mouvement
        a.x += a.vx * dt;
        a.y += a.vy * dt;

        // ROTATION SERVEUR (Le client ne fait qu'afficher)
        a.rotation += a.rotSpeed * dt;

        // Rebond monde
        if (a.x > MAP_LIMIT || a.x < -MAP_LIMIT) a.vx *= -1;
        if (a.y > MAP_LIMIT || a.y < -MAP_LIMIT) a.vy *= -1;
    }

    parentPort.postMessage({ type: 'update', asteroids });

}, 1000 / TICK_RATE);