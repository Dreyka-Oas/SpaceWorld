import createStarfield from "./starfield.js";
import createShip from "./ship.js";

function angleDifference(a, b) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
}

export function createState({ canvas, container, hud, stabBadge, coordsEl }) {
  const socket = io();
  const ctx = canvas.getContext("2d");

  if(stabBadge) stabBadge.style.display = "none";

  // UI
  const speedValEl = document.getElementById("speedVal");
  const coordsValEl = document.getElementById("coordsVal");
  const navDistValEl = document.getElementById("navDistVal");
  const navTimeValEl = document.getElementById("navTimeVal");
  const navProgressBar = document.getElementById("navProgressBar");
  const navTargetNameEl = document.getElementById("navTargetName");
  const hudNavEl = document.getElementById("hud-nav");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const gameOverMsg = document.getElementById("gameOverMsg");

  let pointerX = container.clientWidth / 2;
  let pointerY = container.clientHeight / 2;
  let pointerDown = false;

  const state = {
    canvas, container, ctx,
    // OPTIMISATION : Moins d'étoiles
    starfield: createStarfield(500), 
    ship: createShip(),
    
    myId: null,
    me: { x: 0, y: 0, angle: 0, speed: 0 },
    others: {},
    planets: [],
    blackHoles: [],
    asteroids: [], 
    mapLimit: 0, 
    
    inputs: { up: false, down: false, left: false, right: false },
    navigation: { active: false, targetX: 0, targetY: 0, totalDistance: 0 },
    isDead: false,

    get shipPosition() { return { x: this.me.x, y: this.me.y }; },
    get currentHeading() { return { x: Math.cos(this.me.angle), y: Math.sin(this.me.angle) }; },
    maxSpeed: 30000,
    get particles() { return []; },
    get orbit() { return { active: false }; },
    get isGameOver() { return this.isDead; },
    get spatialGrid() { return null; },

    // --- NAVIGATION ---
    navigateTo(x, y, name = "COORDONNÉES") {
        if(this.isDead) return;
        this.navigation.active = true;
        this.navigation.targetX = x;
        this.navigation.targetY = y;
        this.navigation.targetName = name;
        this.navigation.totalDistance = Math.hypot(x - this.me.x, y - this.me.y);
        
        if(hudNavEl) {
            hudNavEl.style.display = "flex";
            hudNavEl.classList.remove("hud-hidden");
            if(navTargetNameEl) navTargetNameEl.textContent = name;
        }
        if(stabBadge) {
            stabBadge.style.display = "block";
            stabBadge.textContent = "AUTOPILOTE ACTIVÉ";
            stabBadge.style.color = "#4aff4a";
        }
    },

    cancelNavigation() {
        this.navigation.active = false;
        if(hudNavEl) hudNavEl.style.display = "none";
        if(stabBadge) stabBadge.style.display = "none";
        this.inputs = { up: false, down: false, left: false, right: false };
        socket.emit('playerInput', this.inputs);
    },

    // --- INPUTS ---
    attachInput() {
      canvas.addEventListener("pointermove", (e) => {
          const r = canvas.getBoundingClientRect();
          pointerX = e.clientX - r.left;
          pointerY = e.clientY - r.top;
      });
      canvas.addEventListener("pointerdown", () => { 
          pointerDown = true;
          if(this.navigation.active) this.cancelNavigation();
      });
      window.addEventListener("pointerup", () => pointerDown = false);
      
      window.addEventListener("keydown", (e) => {
          if(e.key === "Escape") this.cancelNavigation();
          if(e.key === "ArrowDown" || e.key === "s") this.inputs.down = true;
      });
      window.addEventListener("keyup", (e) => {
          if(e.key === "ArrowDown" || e.key === "s") this.inputs.down = false;
      });
    },

    updateLogic(dt) {
      if(this.isDead) return {};

      if (this.navigation.active) this.handleAutopilot();
      else this.handleMouseControl();

      socket.emit('playerInput', this.inputs);

      if (speedValEl) speedValEl.textContent = Math.round(this.me.speed) + " KM/H";
      if (coordsValEl) coordsValEl.textContent = `${Math.round(this.me.x/1000)}k, ${Math.round(this.me.y/1000)}k`;

      const headX = Math.cos(this.me.angle);
      const headY = Math.sin(this.me.angle);
      this.starfield.update(dt, this.me.speed, -headX * this.me.speed * 0.2, -headY * this.me.speed * 0.2);

      const otherPlayersList = Object.values(this.others).filter(p => p.id !== this.myId);

      return {
        shipX: this.me.x,
        shipY: this.me.y,
        cx: canvas.clientWidth / 2,
        cy: canvas.clientHeight / 2,
        angle: this.me.angle + Math.PI / 2, 
        thrustParams: { thrust: this.inputs.up ? 1 : 0, speedRatio: this.me.speed / 30000 },
        planets: this.planets,
        blackHoles: this.blackHoles,
        asteroids: this.asteroids,
        mapLimit: this.mapLimit, 
        others: otherPlayersList,
        navigationActive: this.navigation.active
      };
    },

    handleMouseControl() {
        const cx = this.canvas.clientWidth / 2;
        const cy = this.canvas.clientHeight / 2;
        const dx = pointerX - cx;
        const dy = pointerY - cy;
        const targetAngle = Math.atan2(dy, dx);
        const diff = angleDifference(this.me.angle, targetAngle);
        const distMouse = Math.hypot(dx, dy);

        this.inputs.left = false;
        this.inputs.right = false;
        this.inputs.up = false;

        if (Math.abs(diff) > 0.1) {
            if (diff > 0) this.inputs.right = true;
            else this.inputs.left = true;
        }
        if (distMouse > 50 || pointerDown) {
            if (Math.abs(diff) < 1.0) this.inputs.up = true;
        }
    },

    handleAutopilot() {
        const dx = this.navigation.targetX - this.me.x;
        const dy = this.navigation.targetY - this.me.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < 10000) {
            this.cancelNavigation();
            return;
        }

        const targetAngle = Math.atan2(dy, dx);
        const diff = angleDifference(this.me.angle, targetAngle);

        this.inputs.left = false;
        this.inputs.right = false;
        this.inputs.up = false;

        if (Math.abs(diff) > 0.05) {
            if (diff > 0) this.inputs.right = true;
            else this.inputs.left = true;
        }
        if (Math.abs(diff) < 0.5) this.inputs.up = true;

        if(hudNavEl && navProgressBar) {
            navDistValEl.textContent = Math.round(dist/1000) + "k km";
            const pct = Math.max(0, Math.min(100, (1 - dist/this.navigation.totalDistance)*100));
            navProgressBar.style.width = pct + "%";
            
            const timeSec = dist / Math.max(1, this.me.speed);
            const mins = Math.floor(timeSec/60);
            const secs = Math.floor(timeSec%60);
            navTimeValEl.textContent = `${mins}:${secs.toString().padStart(2,'0')}`;
        }
    }
  };

  socket.on('initGame', (data) => {
    state.myId = data.id;
    state.planets = data.planets;
    state.blackHoles = data.blackHoles || [];
    state.mapLimit = data.mapLimit;
    console.log("Connecté.");
    // Cache l'overlay au cas où
    if(gameOverOverlay) gameOverOverlay.style.display = "none";
  });

  socket.on('serverUpdate', (data) => {
    if (data.me) state.me = data.me; 
    state.others = data.others;
    state.asteroids = data.asteroids;
  });

  socket.on('gameOver', (data) => {
      state.isDead = true;
      if(gameOverOverlay) {
          gameOverOverlay.style.display = "flex";
          if(gameOverMsg) gameOverMsg.textContent = data.reason || "VAISSEAU DÉTRUIT";
      }
  });

  // --- GESTION DE DÉCONNEXION ---
  const handleDisconnect = () => {
      // On affiche l'overlay avec un message spécifique
      if(gameOverOverlay) {
          gameOverOverlay.style.display = "flex";
          const title = gameOverOverlay.querySelector('.game-over-title');
          if(title) title.textContent = "CONNEXION PERDUE";
          if(gameOverMsg) gameOverMsg.textContent = "Le serveur ne répond pas. Veuillez réinitialiser le système.";
      }
  };

  socket.on('disconnect', handleDisconnect);
  socket.on('connect_error', handleDisconnect);

  state.attachInput();
  return state;
}