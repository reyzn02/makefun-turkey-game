// Everything the player sees: the autumn sky, the three zones, the turkey, the
// farmer, all fourteen obstacles, the HUD and the title and end screens. The
// renderer only reads world state; it never changes it.
import { GROUND_Y, MISSIONS, TURKEY, VIEW, ZONES } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

export const BUTTONS = {
  start: { x: 490, y: 520, w: 300, h: 64, label: 'START THE ESCAPE' },
  restart: { x: 490, y: 560, w: 300, h: 64, label: 'RUN AGAIN  (R)' },
  mute: { x: 1216, y: 16, w: 48, h: 40, label: '♪' },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSky(ctx, zone, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  gradient.addColorStop(0, zone.sky[0]);
  gradient.addColorStop(0.55, zone.sky[1]);
  gradient.addColorStop(1, zone.sky[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (zone.light === 'night') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i += 1) {
      const sx = (i * 173) % VIEW.width;
      const sy = (i * 97) % 300;
      ctx.globalAlpha = 0.35 + ((i * 7) % 10) / 16;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  // Sun by day and dusk, moon by night.
  ctx.fillStyle = zone.sun;
  ctx.beginPath();
  ctx.arc(1080, zone.light === 'night' ? 90 : 110, zone.light === 'night' ? 34 : 46, 0, Math.PI * 2);
  ctx.fill();
  if (zone.light === 'night') {
    ctx.fillStyle = zone.sky[2];
    ctx.beginPath(); ctx.arc(1066, 82, 30, 0, Math.PI * 2); ctx.fill();
  }
  // Slow clouds.
  ctx.fillStyle = zone.light === 'night' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 4; i += 1) {
    const cx = ((i * 340 + time * 12) % (VIEW.width + 240)) - 120;
    const cy = 70 + i * 46;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 44, cy + 8, 52, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackdrop(ctx, zone, distanceM) {
  const offset = (distanceM * 8) % 260;
  ctx.fillStyle = zone.light === 'night' ? '#16233f' : zone.light === 'dusk' ? '#7a4a63' : '#c98a4b';
  for (let i = -1; i < 7; i += 1) {
    const x = i * 260 - offset;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.quadraticCurveTo(x + 130, GROUND_Y - 190, x + 260, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
  // Parallax silhouettes: barns in the farmyard, corn rows in the cornfield,
  // pine trees in the forest.
  const near = (distanceM * 22) % 320;
  ctx.fillStyle = zone.light === 'night' ? '#0d1830' : zone.light === 'dusk' ? '#5e3650' : '#a06a35';
  for (let i = -1; i < 6; i += 1) {
    const x = i * 320 - near;
    if (zone.id === 'farmyard') {
      ctx.fillRect(x + 40, GROUND_Y - 110, 130, 110);
      ctx.beginPath(); ctx.moveTo(x + 30, GROUND_Y - 110); ctx.lineTo(x + 105, GROUND_Y - 165); ctx.lineTo(x + 180, GROUND_Y - 110); ctx.closePath(); ctx.fill();
    } else if (zone.id === 'cornfield') {
      for (let s = 0; s < 5; s += 1) {
        ctx.fillRect(x + 30 + s * 26, GROUND_Y - 150, 8, 150);
        ctx.beginPath(); ctx.ellipse(x + 34 + s * 26, GROUND_Y - 150, 12, 26, 0.3, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.beginPath(); ctx.moveTo(x + 60, GROUND_Y - 210); ctx.lineTo(x + 10, GROUND_Y); ctx.lineTo(x + 110, GROUND_Y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 60, GROUND_Y - 160); ctx.lineTo(x + 26, GROUND_Y - 60); ctx.lineTo(x + 94, GROUND_Y - 60); ctx.closePath(); ctx.fill();
    }
  }
}

function drawGround(ctx, zone, distanceM) {
  ctx.fillStyle = zone.ground;
  ctx.fillRect(0, GROUND_Y, VIEW.width, VIEW.height - GROUND_Y);
  ctx.fillStyle = zone.grass;
  ctx.fillRect(0, GROUND_Y, VIEW.width, 14);
  const dash = (distanceM * 50) % 60;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = -dash; x < VIEW.width; x += 60) ctx.fillRect(x, GROUND_Y + 46, 30, 6);
}

// The turkey, drawn from circles and ellipses: tail fan, brown body, red wattle,
// orange beak, and legs that run, tuck for a jump, or fold for a duck.
function drawTurkey(ctx, state, time) {
  const t = state.turkey;
  const x = TURKEY.x + TURKEY.width / 2;
  const y = t.y + TURKEY.height;
  const legSwing = t.onGround ? Math.sin(t.runCycle) * 14 : 0;
  const blink = state.time < state.invulnerableUntil && Math.floor(time * 14) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  ctx.translate(x, y);
  if (t.ducking) ctx.scale(1.25, 0.62);
  // Tail feathers.
  ctx.fillStyle = '#7a4a21';
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.rotate(i * 0.42 - 0.5);
    ctx.beginPath(); ctx.ellipse(-26, -34, 9, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // Legs.
  ctx.strokeStyle = '#e8862e';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6 + legSwing, 0); ctx.moveTo(8, -8); ctx.lineTo(8 - legSwing, 0); ctx.stroke();
  // Body.
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath(); ctx.ellipse(0, -30, 32, 26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a06a35';
  ctx.beginPath(); ctx.ellipse(2, -26, 24, 18, 0, 0, Math.PI * 2); ctx.fill();
  // Wing.
  ctx.fillStyle = '#6e451f';
  ctx.beginPath(); ctx.ellipse(-4, -28, 16, 10, t.onGround ? Math.sin(t.runCycle) * 0.25 - 0.3 : -0.9, 0, Math.PI * 2); ctx.fill();
  // Head, beak, wattle, eye.
  ctx.fillStyle = '#8b5a2b';
  ctx.beginPath(); ctx.arc(26, -52, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f59b23';
  ctx.beginPath(); ctx.moveTo(36, -54); ctx.lineTo(50, -49); ctx.lineTo(36, -44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d9382b';
  ctx.beginPath(); ctx.ellipse(38, -42, 4, 8, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1d1d1d';
  ctx.beginPath(); ctx.arc(29, -55, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Farmer Gus: straw hat, red shirt, blue overalls, and a mood — chasing,
// searching (hand over eyes) or cornering (leaning in, net in hand).
function drawFarmer(ctx, state) {
  const farmer = state.farmer;
  const gap = farmer.gap;
  const x = TURKEY.x - gap;
  if (x < -160) return;
  const y = GROUND_Y;
  const run = Math.sin(state.time * 14) * 10;
  const lean = farmer.mode === 'corner' ? 0.22 : 0.08;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  // Legs.
  ctx.strokeStyle = '#2b4a7a';
  ctx.lineWidth = 9;
  ctx.beginPath(); ctx.moveTo(-8, -52); ctx.lineTo(-8 + run, 0); ctx.moveTo(10, -52); ctx.lineTo(10 - run, 0); ctx.stroke();
  // Overalls and shirt.
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-20, -96, 44, 48);
  ctx.fillStyle = '#2b4a7a';
  ctx.fillRect(-18, -72, 40, 26);
  ctx.fillRect(-18, -72, 10, 30);
  ctx.fillRect(8, -72, 10, 30);
  // Arms: reaching forward while chasing, shading eyes while searching.
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 8;
  ctx.beginPath();
  if (farmer.mode === 'search') { ctx.moveTo(16, -88); ctx.lineTo(30, -108); }
  else { ctx.moveTo(16, -88); ctx.lineTo(38, -72 + run * 0.4); }
  ctx.stroke();
  if (farmer.mode === 'corner') {
    ctx.strokeStyle = '#d8c49a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(44, -66, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(30, -80); ctx.lineTo(58, -52); ctx.moveTo(58, -80); ctx.lineTo(30, -52); ctx.stroke();
  }
  // Head, beard, hat.
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath(); ctx.arc(6, -108, 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8e0d0';
  ctx.beginPath(); ctx.ellipse(8, -96, 12, 8, 0, 0, Math.PI); ctx.fill();
  ctx.fillStyle = '#e8c33c';
  ctx.beginPath(); ctx.ellipse(6, -120, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-10, -140, 32, 22);
  ctx.fillStyle = '#1d1d1d';
  ctx.beginPath(); ctx.arc(12, -110, 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // "!" when he spots the turkey, "?" while searching.
  if (farmer.mode === 'search' || farmer.mode === 'corner') {
    ctx.fillStyle = farmer.mode === 'search' ? '#ffffff' : '#ffdf3d';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(farmer.mode === 'search' ? '?' : '!', x + 10, y - 158);
  }
}

function drawObstacle(ctx, obstacle, time) {
  const { x, y, w, h } = obstacle;
  const id = obstacle.id;
  ctx.save();
  if (id === 'fence') {
    ctx.fillStyle = '#e8dcc3';
    for (let i = 0; i < 4; i += 1) {
      const px = x + i * 18;
      ctx.beginPath(); ctx.moveTo(px, y + h); ctx.lineTo(px, y + 8); ctx.lineTo(px + 8, y); ctx.lineTo(px + 16, y + 8); ctx.lineTo(px + 16, y + h); ctx.closePath(); ctx.fill();
    }
    ctx.fillRect(x, y + 16, w, 7);
    ctx.fillRect(x, y + 36, w, 7);
  } else if (id === 'hayBale') {
    ctx.fillStyle = '#d9a441';
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b07f24';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2 - 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 4, 0, Math.PI * 2); ctx.stroke();
  } else if (id === 'mudPuddle') {
    ctx.fillStyle = '#5b3a1e';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2 + 4, w / 2, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a5230';
    ctx.beginPath(); ctx.ellipse(x + w / 2 - 14, y + h / 2 + 2, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'pumpkinPatch') {
    ctx.fillStyle = '#e8722a';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath(); ctx.ellipse(x + 18 + i * 30, y + h - 16, 15, 14, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#3f7a2e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 48, y + h - 28); ctx.lineTo(x + 48, y + h - 40); ctx.stroke();
  } else if (id === 'rollingBarrel') {
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2 - 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5e3a17';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2 - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 8, y + 12); ctx.lineTo(x + w - 8, y + 12); ctx.moveTo(x + 8, y + h - 12); ctx.lineTo(x + w - 8, y + h - 12); ctx.stroke();
  } else if (id === 'rake') {
    ctx.strokeStyle = '#7a4a21';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + 6, y + h); ctx.lineTo(x + w - 8, y + 6); ctx.stroke();
    ctx.strokeStyle = '#9aa0a6';
    ctx.lineWidth = 4;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath(); ctx.moveTo(x + w - 26 + i * 5, y + 2); ctx.lineTo(x + w - 22 + i * 5, y + 14); ctx.stroke();
    }
  } else if (id === 'scarecrow') {
    ctx.strokeStyle = '#7a4a21';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 20); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x + 4, y + 34); ctx.lineTo(x + w - 4, y + 34); ctx.stroke();
    ctx.fillStyle = '#4a7a3a';
    ctx.beginPath(); ctx.moveTo(x + 4, y + 34); ctx.lineTo(x + w - 4, y + 34); ctx.lineTo(x + w / 2, y + 66); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8c33c';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + 12, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c79b';
    ctx.beginPath(); ctx.arc(x + w / 2, y + 22, 11, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'farmDog') {
    ctx.fillStyle = '#6b4423';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + 26, 34, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 12, y + 12, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w - 20, y + 2); ctx.lineTo(x + w - 16, y - 10); ctx.lineTo(x + w - 10, y + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1d1d1d';
    ctx.beginPath(); ctx.arc(x + w - 8, y + 10, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 5;
    const wag = Math.sin(time * 18) * 6;
    ctx.beginPath(); ctx.moveTo(x + 14, y + 30); ctx.lineTo(x + 22 + wag, y + 42); ctx.moveTo(x + w - 16, y + 30); ctx.lineTo(x + w - 8 + wag, y + 42); ctx.stroke();
  } else if (id === 'netTrap') {
    ctx.strokeStyle = '#d8c49a';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 6, w / 2, 12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 10, y + h - 6); ctx.lineTo(x + w - 10, y + h - 6); ctx.moveTo(x + w / 2, y + h - 18); ctx.lineTo(x + w / 2, y + h + 6); ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NET!', x + w / 2, y - 6);
  } else if (id === 'fallingKnife') {
    if (obstacle.state === 'active') {
      ctx.fillStyle = 'rgba(255,60,40,0.85)';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', x + w / 2, y + 130);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x + w / 2, GROUND_Y - 2, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(-5, -34, 10, 46);
    ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(0, 34); ctx.lineTo(5, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(-6, -44, 12, 12);
    ctx.restore();
    if (obstacle.state === 'stuck') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 8, y + h - 4); ctx.lineTo(x + w + 8, y + h - 4); ctx.stroke();
    }
  } else if (id === 'hotOven') {
    ctx.fillStyle = '#3a3a42';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = '#ff7a1a';
    roundRect(ctx, x + 14, y + 18, w - 28, 44, 6);
    ctx.fill();
    ctx.fillStyle = '#ffd23d';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y + 40, 26, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d1d1d';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OVEN', x + w / 2, y + 86);
    ctx.fillStyle = 'rgba(255,122,26,0.5)';
    ctx.beginPath(); ctx.ellipse(x + w / 2, y - 6 - Math.sin(time * 6) * 3, 10, 16, 0, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'axeChop') {
    ctx.strokeStyle = '#7a4a21';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h - 30); ctx.stroke();
    const chopping = obstacle.state === 'chop';
    ctx.save();
    ctx.translate(x + w / 2, y + h - 30);
    ctx.rotate(chopping ? 0.9 : -0.5);
    ctx.fillStyle = '#9aa0a6';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(34, -12); ctx.lineTo(34, 12); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (obstacle.state === 'telegraph') {
      ctx.fillStyle = 'rgba(255,60,40,0.85)';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', x + w / 2, y - 8);
    }
    ctx.fillStyle = '#5b3a1e';
    ctx.fillRect(x + w / 2 - 20, GROUND_Y - 8, 40, 8);
  } else if (id === 'chickenWire') {
    ctx.strokeStyle = '#b8bec6';
    ctx.lineWidth = 2;
    for (let r = 0; r < 3; r += 1) {
      for (let c = 0; c < 5; c += 1) {
        ctx.beginPath(); ctx.arc(x + 10 + c * 16, y + 10 + r * 14, 7, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.strokeStyle = '#7a4a21';
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + 4, y + h); ctx.moveTo(x + w - 4, y); ctx.lineTo(x + w - 4, y + h); ctx.stroke();
  } else if (id === 'cornWall') {
    ctx.fillStyle = '#3f7a2e';
    for (let i = 0; i < 4; i += 1) {
      const sx = x + 10 + i * 22;
      ctx.fillRect(sx, y, 8, h);
      ctx.beginPath(); ctx.ellipse(sx + 4, y + 12, 10, 22, 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c33c';
      ctx.beginPath(); ctx.ellipse(sx + 4, y + 44, 6, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3f7a2e';
    }
  }
  ctx.restore();
}

function drawPickup(ctx, pickup) {
  const bob = Math.sin(pickup.bob) * 4;
  ctx.save();
  ctx.translate(pickup.x + 20, pickup.y + 20 + bob);
  if (pickup.id === 'corn') {
    ctx.fillStyle = '#f2c230';
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 18, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3f7a2e';
    ctx.beginPath(); ctx.ellipse(0, 14, 12, 6, 0, 0, Math.PI); ctx.fill();
  } else if (pickup.id === 'pumpkin') {
    ctx.fillStyle = '#e8722a';
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b3501a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 14, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.ellipse(-3, -4, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPowerup(ctx, powerup) {
  const bob = Math.sin(powerup.bob) * 5;
  ctx.save();
  ctx.translate(powerup.x + 22, powerup.y + 22 + bob);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e8a33d';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
  ctx.font = '22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = { feather: '🪶', speedCorn: '🌽', haystack: '🌾', goldenEgg: '🥚', pumpkinPie: '🥧' }[powerup.id] || '★';
  ctx.fillText(glyph, 0, 1);
  ctx.restore();
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    if (p.kind === 'firefly') {
      ctx.fillStyle = `rgba(255,240,150,${alpha})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'leaf') {
      ctx.fillStyle = `rgba(214,120,40,${alpha})`;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size / 2, p.life, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'feather') {
      ctx.fillStyle = `rgba(240,230,210,${alpha})`;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.size, p.size / 2, p.life * 2, 0, Math.PI * 2); ctx.fill();
    } else if (p.kind === 'sparkle') {
      ctx.fillStyle = `rgba(255,220,80,${alpha})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = `rgba(190,160,120,${alpha * 0.7})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawHud(ctx, state, muted) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Top bar.
  ctx.fillStyle = 'rgba(20,16,10,0.55)';
  roundRect(ctx, 12, 12, 560, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${Math.floor(state.score)}`, 28, 40);
  ctx.font = '20px sans-serif';
  ctx.fillText(`${Math.floor(state.distanceM)} m  ·  ${state.zone.name}`, 28, 64);
  // Lives as hearts.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < state.lives ? '#ff4d6d' : 'rgba(255,255,255,0.25)';
    const hx = 600 + i * 36;
    ctx.beginPath();
    ctx.arc(hx, 36, 11, 0, Math.PI * 2);
    ctx.arc(hx + 16, 36, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 8, 40); ctx.lineTo(hx + 26, 40); ctx.lineTo(hx + 9, 60); ctx.closePath(); ctx.fill();
  }
  // Best score, farmer gap meter and active effects.
  ctx.fillStyle = 'rgba(20,16,10,0.55)';
  roundRect(ctx, 700, 12, 300, 64, 12);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`BEST ${state.best}`, 716, 38);
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText('FARMER', 716, 62);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(800, 50, 180, 12);
  const gapRatio = Math.max(0, Math.min(1, state.farmer.gap / 420));
  ctx.fillStyle = gapRatio > 0.5 ? '#7ddc7d' : gapRatio > 0.25 ? '#ffcf4d' : '#ff4d4d';
  ctx.fillRect(800, 50, 180 * gapRatio, 12);
  const effectNames = [];
  if (state.time < state.effects.featherUntil) effectNames.push('🪶 Wings');
  if (state.time < state.effects.speedUntil) effectNames.push('🌽 Dash');
  if (state.time < state.effects.hideUntil) effectNames.push('🌾 Hidden');
  if (state.effects.shield) effectNames.push('🥚 Shield');
  if (effectNames.length) {
    ctx.fillStyle = 'rgba(20,16,10,0.55)';
    roundRect(ctx, 1012, 12, 190, 64, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    effectNames.forEach((name, i) => ctx.fillText(name, 1024, 38 + i * 20));
  }
  // Mute button.
  ctx.fillStyle = 'rgba(20,16,10,0.55)';
  roundRect(ctx, BUTTONS.mute.x, BUTTONS.mute.y, BUTTONS.mute.w, BUTTONS.mute.h, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(muted ? '✕' : '♪', BUTTONS.mute.x + 24, BUTTONS.mute.y + 28);
  // Zone banner.
  if (state.banner && state.time < state.bannerUntil) {
    ctx.fillStyle = 'rgba(20,16,10,0.7)';
    roundRect(ctx, 340, 110, 600, 46, 10);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(state.banner, 640, 140);
  }
  // Toasts (missions, power-ups, warnings) — only while running, so they never
  // cover the CAUGHT / ESCAPED title on the end screen.
  if (state.screen === SCREEN_PLAY) {
    ctx.textAlign = 'left';
    state.toasts.forEach((toastItem, i) => {
      ctx.fillStyle = 'rgba(20,16,10,0.65)';
      const tw = ctx.measureText(toastItem.text).width + 28;
      roundRect(ctx, 640 - tw / 2, 170 + i * 40, tw, 32, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(toastItem.text, 640 - tw / 2 + 14, 192 + i * 40);
    });
  }
  // Next mission, bottom left, is drawn by drawMissionLine below.
  ctx.restore();
}

function drawMissionLine(ctx, state) {
  const next = MISSIONS.find((m) => !state.missionsDone.has(m.id));
  ctx.save();
  ctx.fillStyle = 'rgba(20,16,10,0.55)';
  roundRect(ctx, 12, 668, 560, 40, 10);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  if (next) {
    const progress = missionProgress(state, next);
    ctx.fillText(`MISSION ${state.missionsDone.size + 1}/12: ${next.text} — ${progress}`, 26, 694);
  } else {
    ctx.fillText('ALL 12 MISSIONS DONE — you are a legend, gobble gobble!', 26, 694);
  }
  ctx.restore();
}

function missionProgress(state, mission) {
  const c = state.counts;
  const current =
    mission.kind === 'distance' ? Math.floor(state.distanceM)
      : mission.kind === 'corn' ? c.corn
        : mission.kind === 'pumpkins' ? c.pumpkins
          : mission.kind === 'dodges' ? c.dodges
            : mission.kind === 'knives' ? c.knives
              : c.seconds;
  return `${Math.min(current, mission.goal)}/${mission.goal}`;
}

function drawButton(ctx, button, hover) {
  ctx.save();
  ctx.fillStyle = hover ? '#ffb13d' : '#ff8c1a';
  roundRect(ctx, button.x, button.y, button.w, button.h, 14);
  ctx.fill();
  ctx.strokeStyle = '#7a3c00';
  ctx.lineWidth = 3;
  roundRect(ctx, button.x, button.y, button.w, button.h, 14);
  ctx.stroke();
  ctx.fillStyle = '#2b1500';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(button.label, button.x + button.w / 2, button.y + 41);
  ctx.restore();
}

function drawTitle(ctx, state, time) {
  ctx.fillStyle = 'rgba(20,12,6,0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('GOBBLE DASH', 640, 150);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('The Great Turkey Escape', 640, 196);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText('3 zones  ·  14 obstacles  ·  5 power-ups  ·  3 farmer moods  ·  12 missions  ·  12 sounds', 640, 232);
  ctx.fillStyle = '#ffffff';
  ctx.font = '19px sans-serif';
  ctx.fillText('Thanksgiving is coming. Farmer Gus has the oven hot and the carving knife sharp.', 640, 300);
  ctx.fillText('Run 2,000 m — farmyard, cornfield, dark forest — and live to gobble another day.', 640, 328);
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText('SPACE / ↑ / CLICK — jump      ↓ / S — duck      P — pause      M — mute', 640, 386);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('Jump the fences, dodge the falling knives, duck the scarecrows, grab corn & power-ups.', 640, 420);
  ctx.fillText('Every hit brings Gus closer. If he catches you… dinner is served.', 640, 446);
  drawButton(ctx, BUTTONS.start, Math.sin(time * 3) > 0);
  if (state.best > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`BEST SCORE: ${state.best}`, 640, 620);
  }
  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('An original game — hand-drawn art, synthesized sounds, no files fetched from the net.', 640, 650);
}

function drawEnd(ctx, state) {
  const escaped = state.overReason === 'escaped';
  ctx.fillStyle = escaped ? 'rgba(10,40,20,0.55)' : 'rgba(40,8,4,0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = escaped ? '#a8f0a8' : '#ffb3a3';
  ctx.font = 'bold 76px sans-serif';
  ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', 640, 190);
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px sans-serif';
  if (escaped) {
    ctx.fillText('You outran Farmer Gus, the oven and the carving knife.', 640, 240);
    ctx.fillText('Thanksgiving is saved — for this turkey, anyway. Gobble gobble!', 640, 274);
  } else {
    ctx.fillText('Farmer Gus caught you… and the oven was already hot.', 640, 240);
    ctx.fillText('The carving knife never stood a chance. Better luck next run!', 640, 274);
  }
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#ffd94d';
  ctx.fillText(`SCORE ${Math.floor(state.score)}   ·   DISTANCE ${Math.floor(state.distanceM)} m   ·   BEST ${state.best}`, 640, 340);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Missions completed: ${state.missionsDone.size} / 12      Corn: ${state.counts.corn}      Pumpkins: ${state.counts.pumpkins}      Dodges: ${state.counts.dodges}`, 640, 380);
  ctx.fillText(`Knives dodged: ${state.counts.knives}      Time: ${Math.floor(state.time)} s`, 640, 410);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(escaped ? 'You escaped the farm — now try beating your best score!' : 'Tip: duck under scarecrows, jump the nets, and hide in the hay when Gus searches.', 640, 470);
  drawButton(ctx, BUTTONS.restart, true);
}

export function render(ctx, state, time, muted) {
  const zone = state.zone;
  drawSky(ctx, zone, time);
  drawBackdrop(ctx, zone, state.distanceM);
  drawGround(ctx, zone, state.distanceM);
  for (const obstacle of state.obstacles) drawObstacle(ctx, obstacle, time);
  for (const pickup of state.pickups) drawPickup(ctx, pickup);
  for (const powerup of state.powerups) drawPowerup(ctx, powerup);
  drawFarmer(ctx, state);
  drawTurkey(ctx, state, time);
  drawParticles(ctx, state.particles);
  if (state.screen === SCREEN_PLAY) {
    drawHud(ctx, state, muted);
    drawMissionLine(ctx, state);
  } else if (state.screen === SCREEN_TITLE) {
    drawTitle(ctx, state, time);
  } else if (state.screen === SCREEN_OVER) {
    drawHud(ctx, state, muted);
    drawEnd(ctx, state);
  }
}

export { ZONES };
