import { createState } from "./state.js";
import { createRenderer } from "./render.js";

const container = document.getElementById("app");
const hud = document.getElementById("hud");
const stabBadge = document.getElementById("stabBadge");
const coordsEl = document.getElementById("coords");

const canvas = document.createElement("canvas");
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.display = "block";
container.appendChild(canvas);
const ctx = canvas.getContext("2d");

const state = createState({ canvas, container, hud, stabBadge, coordsEl });
const renderer = createRenderer({ canvas, ctx, state });

function resize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  // OPTIMISATION : Limiter le DPR à 1.5 au lieu de 2 pour de meilleures performances
  // Sur les écrans 4K, cela réduit considérablement la charge tout en gardant une bonne qualité
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  state.onResize && state.onResize();
}
window.addEventListener("resize", resize, { passive: true });
resize();

renderer.start();