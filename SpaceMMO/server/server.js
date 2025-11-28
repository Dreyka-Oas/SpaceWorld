import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import os from 'os';
import { Worker } from 'worker_threads'; 

import { findSafeSpawnPosition } from './spawner.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, '../public')));

const MAP_LIMIT = 110000000; 

// Planètes
const planets = [
    { name: "Soleil", x: 0, y: 0, size: 800000, type: "star", color: "#ffaa00" },
    { name: "Mercure", x: 0, y: 0, size: 25000, orbitalRadius: 5000000, type: "planet", color: "#9aa0a6" },
    { name: "Vénus", x: 0, y: 0, size: 55000, orbitalRadius: 9000000, type: "planet", color: "#e3b27a" },
    { name: "Terre", x: 0, y: 0, size: 60000, orbitalRadius: 15000000, type: "planet", color: "#4aa1ff" },
    { name: "Mars", x: 0, y: 0, size: 35000, orbitalRadius: 22000000, type: "planet", color: "#ff8a5a" },
    { name: "Jupiter", x: 0, y: 0, size: 350000, orbitalRadius: 40000000, type: "planet", color: "#d9c19b" },
    { name: "Saturne", x: 0, y: 0, size: 300000, orbitalRadius: 60000000, type: "planet", color: "#f1e1b8", hasRings: true, ringColor: "rgba(200, 180, 150, 0.4)" },
    { name: "Uranus", x: 0, y: 0, size: 140000, orbitalRadius: 80000000, type: "planet", color: "#9fe3e8", hasRings: true, ringColor: "rgba(150, 220, 255, 0.3)" },
    { name: "Neptune", x: 0, y: 0, size: 135000, orbitalRadius: 100000000, type: "planet", color: "#557ee6" },
];

planets.forEach(p => {
    if (p.orbitalRadius) {
        const angle = Math.random() * Math.PI * 2;
        p.x = Math.cos(angle) * p.orbitalRadius;
        p.y = Math.sin(angle) * p.orbitalRadius;
    }
});

// Worker
let activeAsteroids = [];
let activeBlackHoles = [];

console.log("[MAIN] Démarrage du Worker Physique...");
const worker = new Worker('./asteroid_worker.js');

worker.on('message', (msg) => {
    if (msg.type === 'init') {
        activeAsteroids = msg.asteroids;
        activeBlackHoles = msg.blackHoles;
    } else if (msg.type === 'update') {
        activeAsteroids = msg.asteroids;
    }
});

const players = {}; 

io.on('connection', (socket) => {
  const safeAsteroids = activeAsteroids.length > 0 ? activeAsteroids : [];
  const startPos = findSafeSpawnPosition(MAP_LIMIT, planets, safeAsteroids, activeBlackHoles);

  players[socket.id] = {
    id: socket.id,
    x: startPos.x,
    y: startPos.y,
    angle: -Math.PI / 2,
    speed: 0,
    inputs: { up: false, down: false, left: false, right: false },
    isDead: false
  };

  socket.emit('initGame', { 
    id: socket.id, 
    planets: planets,
    blackHoles: activeBlackHoles,
    mapLimit: MAP_LIMIT
  });

  socket.on('playerInput', (inputs) => {
    if (players[socket.id] && !players[socket.id].isDead) players[socket.id].inputs = inputs;
  });

  socket.on('disconnect', () => { delete players[socket.id]; });
});

// Loop
// OPTIMISATION : Tickrate réduit à 30Hz pour soulager le parsing réseau côté client
setInterval(() => {
  const dt = 1/30; 
  const ACCEL = 1200;
  const TURN_SPEED = 2.5;
  const MAX_SPEED = 100000;

  for (const id in players) {
    const p = players[id];
    if (p.isDead) continue;

    if (p.inputs.left) p.angle -= TURN_SPEED * dt;
    if (p.inputs.right) p.angle += TURN_SPEED * dt;
    if (p.inputs.up) p.speed = Math.min(MAX_SPEED, p.speed + ACCEL * dt);
    else if (p.inputs.down) p.speed = Math.max(0, p.speed - ACCEL * dt);
    
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;

    if (Math.hypot(p.x, p.y) > MAP_LIMIT) {
        p.isDead = true;
        io.to(id).emit('gameOver', { reason: "DÉSINTÉGRATION - BARRIÈRE PLASMA" });
    }
  }

  // Streaming
  const sockets = io.sockets.sockets;
  for (const [id, socket] of sockets) {
      if (!players[id]) continue;
      const me = players[id];
      // OPTIMISATION : View distance drastiquement réduite (70k au lieu de 800k)
      // Correspond à environ 1.5x la largeur de l'écran en 1080p avec scale 0.04
      const VIEW_DISTANCE = 70000; 
      
      const nearby = [];
      const len = activeAsteroids.length;
      for(let i=0; i<len; i++) {
          const a = activeAsteroids[i];
          // Vérification rapide par box avant distance
          const dx = Math.abs(a.x - me.x);
          const dy = Math.abs(a.y - me.y);
          
          if (dx < VIEW_DISTANCE && dy < VIEW_DISTANCE) {
              nearby.push(a);
          }
      }

      socket.emit('serverUpdate', {
          me: me,
          others: players,
          asteroids: nearby // Envoie seulement ~20-50 astéroïdes au lieu de ~2000
      });
  }
}, 1000/30);

setInterval(() => {
    const ram = Math.round(process.memoryUsage().rss / 1024 / 1024);
    console.log(`[PERF] RAM: ${ram} MB | Ast: ${activeAsteroids.length} | Joueurs: ${Object.keys(players).length}`);
}, 5000);

const PORT = 3000;
httpServer.listen(PORT, () => console.log(`🚀 SERVEUR: http://localhost:${PORT}`));