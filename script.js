/* ═══════════════════════════════════════════════════════════════
   EcoHerói – Produção Sustentável  v2  (sprites reconhecíveis)
   ═══════════════════════════════════════════════════════════════ */

/* ── GLOBAL ─────────────────────────────────────────────────── */
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
canvas.width  = 800;
canvas.height = 450;

const TILE    = 32;
const GRAVITY = 0.45;

const Keys = {};
window.addEventListener('keydown', e => { Keys[e.code] = true;  e.preventDefault && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code) && e.preventDefault(); });
window.addEventListener('keyup',   e => { Keys[e.code] = false; });

const Game = { running:false, phase:1, score:0, envProgress:15, camera:{x:0}, particles:[] };
const Inventory = { plastic:0, metal:0, organic:0, THRESHOLD:5 };
const ActivePowerup = { type:null, duration:0, maxDur:300 };

/* ══════════════════════════════════════════════════════════════
   SPRITE LIBRARY  – todas as funções draw* recebem (ctx, x, y)
   e desenham com coordenadas locais (origem = canto sup-esq)
   ══════════════════════════════════════════════════════════════ */

/* ── Utilidade: pixel rect ── */
function px(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }

/* ────────────────────────────────────────────────────────────
   HERÓI  (32×40)  – coletor de lixo com uniforme verde,
   capacete amarelo, símbolo reciclagem no peito, saco de lixo
   ──────────────────────────────────────────────────────────── */
function drawHero(x, y, frame, state, shielded) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));

  // sombra suave
  ctx.fillStyle='rgba(0,0,0,0.18)';
  ctx.fillRect(2,38,28,4);

  // pernas (animadas)
  const legSwing = state==='run' ? (frame%2===0?3:-3) : 0;
  px(5,  28+legSwing, 8, 12, '#1b5e20');  // perna esq
  px(19, 28-legSwing, 8, 12, '#1b5e20');  // perna dir
  px(3,  38+Math.max(0,legSwing), 10, 4, '#212121'); // bota esq
  px(19, 38-Math.max(0,-legSwing),10, 4, '#212121'); // bota dir

  // corpo / colete laranja reflexivo
  px(4, 12, 24, 20, '#2e7d32');           // uniforme verde
  px(9, 13, 14,  4, '#ff8f00');           // faixa reflexiva
  px(9, 22, 14,  4, '#ff8f00');           // faixa reflexiva baixo

  // símbolo reciclagem (3 setas em ♻)
  ctx.fillStyle='#a5d6a7';
  ctx.font='bold 11px monospace';
  ctx.fillText('♻',10,24);

  // braços
  const armSwing = state==='run' ? (frame%2===0?-4:4) : 0;
  px(0,  14+armSwing, 6, 8, '#2e7d32');   // braço esq
  px(26, 14-armSwing, 6, 8, '#2e7d32');   // braço dir
  // luvas
  px(0,  20+armSwing, 6, 4, '#ffee58');
  px(26, 20-armSwing, 6, 4, '#ffee58');

  // saco de lixo (mão direita)
  if(state!=='jump'){
    px(28, 16, 10, 14, '#78909c');
    px(29, 17,  8, 12, '#90a4ae');
    px(30, 15,  6,  3, '#546e7a'); // amarração
  }

  // pescoço
  px(13,  8, 6, 5, '#ffccbc');

  // cabeça
  px(6, -6, 20, 16, '#ffccbc');

  // capacete de segurança (amarelo)
  px(5,-10, 22, 8, '#f9a825');
  px(3, -5, 26, 4, '#f9a825');
  px(5,-13, 22, 5, '#ffd54f'); // topo arredondado simulado
  // aba frontal
  px(2, -2, 8, 3, '#f9a825');
  px(22,-2, 8, 3, '#f9a825');

  // rosto
  px(10, -3, 3, 3, '#212121'); // olho esq
  px(19, -3, 3, 3, '#212121'); // olho dir
  if(state==='hurt'){
    px(11,-1,1,1,'#fff'); px(20,-1,1,1,'#fff'); // olhos X
    px(12, 4, 8, 2,'#c62828'); // boca triste
  } else {
    px(11,-2,1,2,'#fff'); px(20,-2,1,2,'#fff'); // brilho olhos
    px(11, 3, 10,2,'#795548'); // boca
  }
  // sobrancelhas
  px(9,-6,5,2,'#5d4037');
  px(18,-6,5,2,'#5d4037');

  // escudo ativo
  if(shielded){
    ctx.strokeStyle='rgba(33,150,243,0.8)';
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(16,16,20,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle='rgba(33,150,243,0.3)';
    ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(16,16,20,0,Math.PI*2); ctx.stroke();
  }

  ctx.restore();
}

/* ────────────────────────────────────────────────────────────
   GARRAFOSSAURO  (26×32)
   Garrafa plástica azul com pernas, braços espinhosos e cara raivosa
   ──────────────────────────────────────────────────────────── */
function drawGarrafo(x, y, frame, hp, maxHp) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));

  // sombra
  ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(1,30,24,3);

  // pernas
  const lg = frame%2===0?2:-2;
  px(4, 24+lg, 6,  8, '#0d47a1');
  px(16,24-lg, 6,  8, '#0d47a1');
  px(3, 30+Math.max(0,lg), 8, 3, '#1a237e');
  px(15,30-Math.max(0,-lg),8, 3, '#1a237e');

  // corpo garrafa (azul translúcido simulado)
  px(3,  8, 20, 20, '#1565c0');
  px(5, 10, 16, 16, '#1e88e5'); // highlight
  px(6, 11,  6,  6, '#64b5f6'); // reflexo diagonal

  // texto "PLÁSTICO" no rótulo
  px(4,17,18, 7,'#e3f2fd'); // rótulo branco
  ctx.fillStyle='#0d47a1'; ctx.font='bold 5px monospace';
  ctx.fillText('LIXO',6,23);

  // gargalo da garrafa
  px(8, 2, 10,  7, '#0d47a1');
  px(9, 0,  8,  3, '#1565c0'); // tampa

  // tampa vermelha (enferrujada)
  px(8, -1, 10, 4, '#b71c1c');
  px(9,  0,  8, 2, '#ef5350');

  // braços espinhosos
  px(-4,12, 8, 5, '#0d47a1');  // braço esq
  px(22, 12, 8, 5, '#0d47a1'); // braço dir
  // garras
  px(-6,10, 3, 3, '#e53935'); px(-6,14, 3, 3, '#e53935'); px(-6,18, 3, 3, '#e53935');
  px(25, 10, 3, 3, '#e53935'); px(25,14, 3, 3, '#e53935'); px(25,18, 3, 3, '#e53935');

  // olhos raivosos
  px(5, 12, 6, 5, '#fff');   px(15,12, 6, 5, '#fff');
  px(7, 13, 3, 3, '#e53935'); px(17,13, 3, 3, '#e53935'); // iris
  px(8, 13, 1, 1, '#000');   px(18,13, 1, 1, '#000');     // pupila
  // sobrancelha raiva (inclinada)
  px(5,10,6,2,'#0d47a1'); px(16,10,6,2,'#0d47a1');

  // boca dentada
  px(6,19,14,4,'#212121');
  for(let t=0;t<4;t++){ px(7+t*3,19,2,2,'#fff'); } // dentes

  // bolhas de poluição saindo
  ctx.fillStyle='rgba(100,200,255,0.5)';
  ctx.beginPath(); ctx.arc(20,-3+Math.sin(Date.now()*0.005)*2,3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(24, 1+Math.sin(Date.now()*0.007)*2,2,0,Math.PI*2); ctx.fill();

  // barra de HP
  ctx.fillStyle='#333'; ctx.fillRect(0,-8,26,4);
  ctx.fillStyle= hp/maxHp>0.5?'#4caf50':'#e53935';
  ctx.fillRect(0,-8,26*(hp/maxHp),4);

  ctx.restore();
}

/* ────────────────────────────────────────────────────────────
   BARÃO DO DESPERDÍCIO  (64×72)
   Rei lixo com coroa de entulho, capa poluída, cetro com caveira
   ──────────────────────────────────────────────────────────── */
function drawBaron(x, y, frame, phase, telegr, telTimer) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));

  // Glow de telégrafo de ataque
  if(telegr && telTimer>0){
    ctx.globalAlpha = 0.25 + 0.25*Math.sin(telTimer*0.4);
    ctx.fillStyle='#ff1744';
    ctx.fillRect(-8,-8,80,88);
    ctx.globalAlpha=1;
  }

  // sombra
  ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(4,68,56,6);

  const phaseColors = ['#6a1b9a','#7b1fa2','#8e24aa','#9c27b0','#ab47bc','#ba68c8','#b71c1c','#424242'];
  const c = phaseColors[Math.min(phase, 7)];
  const cLight = ['#9c4dcc','#ae52d4','#bf5fcb','#ce93d8','#ce93d8','#d1c4e9','#e57373','#757575'][Math.min(phase,7)];

  // capa / manto esvoaçante
  const capeWave = Math.sin(frame*0.8)*3;
  px( 2, 20, 60, 45, c);
  px( 0, 22+capeWave, 8, 38, c);   // aba esq
  px(56, 22-capeWave, 8, 38, c);   // aba dir
  px(10,22,44,40, cLight);         // interior
  // ondulações da capa (poluição)
  for(let r=0;r<4;r++){
    ctx.fillStyle=`rgba(0,0,0,${0.07+r*0.04})`;
    ctx.fillRect(2,30+r*8,60,3);
  }

  // faixas reflexivas (resíduos presos na capa)
  ['#ff8f00','#43a047','#1e88e5'].forEach((fc,i)=>{
    px(8+i*16, 25+i*5, 12, 3, fc);
  });

  // corpo principal
  px(10, 15, 44, 30, c);
  px(13, 17, 38, 26, cLight);

  // ombros reforçados (armadura lata)
  px(-4, 18,16,10,'#78909c'); px(52,18,16,10,'#78909c');
  px(-2, 19,12, 7,'#90a4ae'); px(54,19,12, 7,'#90a4ae');

  // braços
  const armWave = Math.sin(frame*1.2)*4;
  px(-8, 22+armWave, 14, 8, c);    // braço esq
  px(58, 22-armWave, 14, 8, c);    // braço dir
  // mãos
  px(-10,28+armWave, 10,10,'#ffccbc'); // mão esq
  px( 64, 28-armWave,10,10,'#ffccbc'); // mão dir

  // cetro (mão esquerda) com caveira
  px(-14, 10+armWave, 4, 30, '#795548');
  px(-18,  4+armWave,12, 12,'#f5f5f5'); // caveira
  px(-16,  5+armWave, 8,  7,'#f5f5f5');
  px(-17,  9+armWave, 2,  2,'#212121'); // olho esq
  px(-13,  9+armWave, 2,  2,'#212121'); // olho dir
  px(-17, 12+armWave,10,  2,'#616161'); // sorriso caveira
  // brilho roxo no cetro
  ctx.fillStyle='rgba(156,39,176,0.6)';
  ctx.beginPath(); ctx.arc(-12,4+armWave,5,0,Math.PI*2); ctx.fill();

  // pernas robustas
  const lg = frame%2===0?2:-2;
  px(12,44+lg,  14,20, c);  // perna esq
  px(38,44-lg,  14,20, c);  // perna dir
  px(10,60+Math.max(0,lg),  16,8,'#4a148c');  // bota esq
  px(38,60-Math.max(0,-lg), 16,8,'#4a148c');  // bota dir
  // espinhos nas botas
  for(let s=0;s<4;s++){
    px(10+s*4, 63+Math.max(0,lg), 2,4,'#e53935');
    px(38+s*4, 63-Math.max(0,-lg),2,4,'#e53935');
  }

  // pescoço
  px(24, 10, 16, 8, '#ffccbc');

  // cabeça grande e intimidadora
  px(8, -18, 48, 32, '#ffccbc');
  px(10,-16, 44, 28, '#ffe0b2'); // bochecha

  // COROA DE ENTULHO (material variado)
  const crownH = 14;
  // base da coroa
  px(6,-28,52,crownH,'#795548');
  // pontas da coroa (diferentes alturas = entulho)
  px(6, -38, 8, 12,'#8d6e63');   // ponta 1 (madeira)
  px(18,-42,10, 16,'#546e7a');   // ponta 2 (metal) - mais alta
  px(30,-40, 9, 14,'#4caf50');   // ponta 3 (vidro verde)
  px(42,-36, 8, 10,'#1565c0');   // ponta 4 (plástico)
  px(52,-34, 6,  8,'#78909c');   // ponta 5 (lata)
  // joias na coroa = tampinhas coloridas
  px(9, -30, 5,5,'#e53935'); px(21,-30,5,5,'#ffd600');
  px(33,-30, 5,5,'#4caf50'); px(45,-30,5,5,'#00bcd4');

  // rosto ameaçador
  // olhos brilhantes (cor muda por fase)
  const eyeC = phase>=4 ? '#ff1744' : phase>=2 ? '#ff6f00' : '#ffd600';
  px(14,-10,10, 8,'#212121'); px(40,-10,10, 8,'#212121'); // órbitas
  px(15, -9, 8, 6, eyeC);    px(41, -9, 8, 6, eyeC);    // iris
  px(18, -7, 3, 3,'#fff');   px(44, -7, 3, 3,'#fff');   // brilho pupila
  // sobrancelhas grossas e furiosas
  ctx.fillStyle='#4a148c';
  ctx.save(); ctx.translate(14,-13); ctx.rotate(-0.25); ctx.fillRect(0,0,12,4); ctx.restore();
  ctx.save(); ctx.translate(50,-13); ctx.rotate(0.25);  ctx.fillRect(-12,0,12,4); ctx.restore();

  // nariz
  px(28,-4,8,5,'#ffab91');

  // boca (ameaça ou raiva por fase)
  if(phase>=5){
    // boca aberta furiosa
    px(14,2,36,8,'#212121');
    for(let t=0;t<5;t++) px(15+t*7,2,5,4,'#fff'); // dentes
    px(14,6,36,2,'#b71c1c'); // língua vermelha
  } else {
    px(16,3,32,5,'#212121');
    for(let t=0;t<4;t++) px(17+t*8,3,6,3,'#fff');
  }

  // fumaça / poluição saindo da cabeça (animada)
  for(let s=0;s<3;s++){
    const sz = 4+s*2;
    const sy = -26 - s*8 + Math.sin(Date.now()*0.003+s)*3;
    const sx = 20 + s*10 + Math.cos(Date.now()*0.002+s)*3;
    ctx.fillStyle=`rgba(100,100,100,${0.4-s*0.1})`;
    ctx.beginPath(); ctx.arc(sx,sy,sz,0,Math.PI*2); ctx.fill();
  }

  ctx.restore();
}

/* ────────────────────────────────────────────────────────────
   PROJÉTIL DE POLUIÇÃO  (12×12)
   Bolha de lixo tóxico verde-amarelado com símbolo ☠
   ──────────────────────────────────────────────────────────── */
function drawPollutionBall(x, y, color, phase) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(6,6,6,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.arc(4,4,2,0,Math.PI*2); ctx.fill(); // brilho
  ctx.fillStyle='#000';
  ctx.font='8px monospace'; ctx.fillText('☠',1,10);
  ctx.restore();
}

/* ────────────────────────────────────────────────────────────
   COLETÁVEIS  (20×20 cada)
   ──────────────────────────────────────────────────────────── */
function drawPlastic(x, y) {
  // garrafa PET deitada
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  px(2, 4,16,12,'#80d8ff');  // corpo
  px(4, 6,12, 8,'#b3e5fc');  // highlight
  px(0, 7, 3, 5,'#1565c0');  // fundo
  px(17,8, 3, 4,'#29b6f6');  // gargalo
  px(19,9, 2, 2,'#ef5350');  // tampa
  ctx.fillStyle='#0d47a1'; ctx.font='bold 5px monospace'; ctx.fillText('PET',3,14);
  ctx.restore();
}

function drawMetal(x, y) {
  // lata de alumínio
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  px(3, 2,14,16,'#b0bec5');  // corpo
  px(5, 4,10,12,'#cfd8dc');  // highlight
  px(3, 2,14, 2,'#90a4ae');  // tampa
  px(3,16,14, 2,'#90a4ae');  // base
  px(6, 1, 8, 2,'#bdbdbd');  // pestana superior
  // riscas horizontais
  for(let r=0;r<3;r++) px(4,6+r*4,12,1,'#90a4ae');
  ctx.fillStyle='#546e7a'; ctx.font='bold 5px monospace'; ctx.fillText('AL',5,13);
  ctx.restore();
}

function drawOrganic(x, y) {
  // folha + minhoca (orgânico)
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  // folha
  ctx.fillStyle='#66bb6a';
  ctx.beginPath(); ctx.ellipse(10,8,8,6,Math.PI/6,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#81c784';
  ctx.beginPath(); ctx.ellipse(9,7,5,3,Math.PI/6,0,Math.PI*2); ctx.fill();
  px(9,7,1,8,'#388e3c'); // nervura
  // minhoca
  ctx.fillStyle='#e64a19';
  ctx.beginPath(); ctx.arc(6,15,4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff7043';
  ctx.beginPath(); ctx.arc(11,14,3,0,Math.PI*2); ctx.fill();
  px(4,14,2,1,'#212121'); // olhinho minhoca
  ctx.restore();
}

/* ────────────────────────────────────────────────────────────
   POWER-UPS produzidos  (24×24)
   ──────────────────────────────────────────────────────────── */
function drawShieldItem(x, y) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  // escudo
  ctx.fillStyle='#1976d2';
  ctx.beginPath();
  ctx.moveTo(12,2); ctx.lineTo(22,6); ctx.lineTo(22,14);
  ctx.quadraticCurveTo(12,22,12,22);
  ctx.quadraticCurveTo(2,14,2,14); ctx.lineTo(2,6); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#42a5f5';
  ctx.beginPath();
  ctx.moveTo(12,5); ctx.lineTo(19,8); ctx.lineTo(19,14);
  ctx.quadraticCurveTo(12,19,12,19);
  ctx.quadraticCurveTo(5,14,5,14); ctx.lineTo(5,8); ctx.closePath(); ctx.fill();
  // símbolo
  ctx.fillStyle='#fff'; ctx.font='bold 9px monospace'; ctx.fillText('🛡',5,16);
  ctx.restore();
}

function drawCompostItem(x, y) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  // saco de adubo
  px(4,6,16,14,'#795548');
  px(6,8,12,10,'#8d6e63');
  px(8,4, 8, 4,'#5d4037');  // bico
  px(9,2, 6, 3,'#4e342e');  // lacre
  ctx.fillStyle='#a5d6a7'; ctx.font='10px monospace'; ctx.fillText('💩',5,18);
  ctx.restore();
}

function drawMagnetItem(x, y) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  // ferradura de ímã
  ctx.fillStyle='#e53935';
  ctx.beginPath(); ctx.arc(12,10,9,Math.PI,0); ctx.fill();
  ctx.fillStyle='#bdbdbd';
  ctx.beginPath(); ctx.arc(12,10,5,Math.PI,0); ctx.fill();
  px(3,10,6,8,'#e53935');  // perna esq
  px(15,10,6,8,'#e53935'); // perna dir
  px(3,16,6,3,'#c0ca33');  // ponta esq amarela
  px(15,16,6,3,'#c0ca33'); // ponta dir amarela
  ctx.restore();
}

/* ────────────────────────────────────────────────────────────
   ARMADILHA DE ADUBO  (28×18)
   ──────────────────────────────────────────────────────────── */
function drawCompostTrap(x, y, life) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.globalAlpha = Math.min(1, life/40);
  // poça de adubo
  ctx.fillStyle='#5d4037';
  ctx.beginPath(); ctx.ellipse(14,12,13,6,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#795548';
  ctx.beginPath(); ctx.ellipse(14,11,10,4,0,0,Math.PI*2); ctx.fill();
  // bolhas
  ctx.fillStyle='rgba(139,195,74,0.7)';
  ctx.beginPath(); ctx.arc(8, 10+Math.sin(Date.now()*0.01)*1,3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(20,10+Math.cos(Date.now()*0.01)*1,2,0,Math.PI*2); ctx.fill();
  // aviso
  ctx.fillStyle='#fff'; ctx.font='bold 9px monospace'; ctx.fillText('!',13,10);
  ctx.restore();
}

/* ────────────────────────────────────────────────────────────
   TILES  (32×32)
   ──────────────────────────────────────────────────────────── */
function drawGroundTile(x, y) {
  // terra
  px(x,   y+5, TILE, TILE-5, '#6d4c41');
  px(x,   y+8, TILE, TILE-8, '#5d4037');
  // linhas de terra
  ctx.fillStyle='#4e342e';
  for(let r=0;r<3;r++) px(x+2, y+10+r*7, TILE-4, 2, '#4e342e');
  // raízes
  for(let r=0;r<4;r++) {
    ctx.fillStyle='#8d6e63';
    ctx.fillRect(x+4+r*8, y+14, 2, 10+r%2*4);
  }
  // gramado
  px(x,    y,   TILE, 7, '#43a047');
  px(x,    y,   TILE, 3, '#66bb6a'); // borda clara
  // tufos de grama
  for(let g=0;g<5;g++){
    const gx=x+2+g*6;
    px(gx,  y-2, 2, 4, '#388e3c');
    px(gx+2,y-3, 2, 5, '#2e7d32');
    px(gx+4,y-1, 2, 3, '#43a047');
  }
}

function drawPlatformTile(x, y) {
  // madeira antiga
  px(x, y, TILE, 11, '#6d4c41');
  px(x+1,y+1,TILE-2,8,'#8d6e63');
  // veios da madeira
  for(let v=0;v<4;v++) px(x+1+v*8,y+2,6,1,'#795548');
  // musgo nas bordas
  px(x,y,4,4,'#43a047'); px(x+TILE-4,y,4,4,'#43a047');
  px(x,y,TILE,2,'#a5d6a7'); // borda verde
}

/* ────────────────────────────────────────────────────────────
   CENÁRIO  – fundo detalhado
   ──────────────────────────────────────────────────────────── */
function drawCloud(cx, cy, w) {
  ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.arc(cx,cy,w*0.4,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+w*0.35,cy+4,w*0.28,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx-w*0.35,cy+4,w*0.28,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx+w*0.6,cy+8,w*0.22,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx-w*0.6,cy+8,w*0.22,0,Math.PI*2); ctx.fill();
  ctx.fillRect(cx-w*0.6,cy+8,w*1.2,w*0.2);
  // sombra suave na nuvem
  ctx.fillStyle='rgba(200,230,255,0.4)';
  ctx.beginPath(); ctx.arc(cx,cy+6,w*0.3,0,Math.PI*2); ctx.fill();
}

function drawMountain(cx, cy, size) {
  ctx.fillStyle='#81c784';
  ctx.beginPath(); ctx.moveTo(cx,cy-size); ctx.lineTo(cx+size,cy); ctx.lineTo(cx-size,cy); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#a5d6a7';
  ctx.beginPath(); ctx.moveTo(cx,cy-size); ctx.lineTo(cx+size*0.5,cy-size*0.3); ctx.lineTo(cx-size*0.5,cy-size*0.3); ctx.closePath(); ctx.fill();
}

function drawTree(x, y) {
  // tronco
  px(x+8,y+20,8,18,'#795548');
  px(x+9,y+21,6,16,'#8d6e63');
  // copa
  ctx.fillStyle='#2e7d32';
  ctx.beginPath(); ctx.arc(x+12,y+14,14,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#43a047';
  ctx.beginPath(); ctx.arc(x+14,y+10,10,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#66bb6a';
  ctx.beginPath(); ctx.arc(x+10,y+12,6,0,Math.PI*2);  ctx.fill();
}

function drawBush(x, y) {
  ctx.fillStyle='#388e3c';
  ctx.beginPath(); ctx.arc(x+10,y+10,10,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+20,y+12,8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+2, y+12,7,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#66bb6a';
  ctx.beginPath(); ctx.arc(x+10,y+8,6,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x+18,y+9,5,0,Math.PI*2); ctx.fill();
}

// Pré-computa decorações fixas do cenário
const DECO = {
  clouds:    [{x:80,y:45,w:55},{x:260,y:30,w:70},{x:480,y:55,w:50},{x:650,y:38,w:65}],
  mountains: [{x:150,y:360,s:60},{x:380,y:355,s:50},{x:600,y:358,s:70}],
  trees:     [{x:30},{x:100},{x:220},{x:340},{x:500},{x:640},{x:730}],
  bushes:    [{x:60},{x:170},{x:290},{x:430},{x:560},{x:700}],
};

/* ══════════════════════════════════════════════════════════════
   MAPA / CENÁRIO
   ══════════════════════════════════════════════════════════════ */
const LEVEL_W = 25, LEVEL_H = 14;
const MAP = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,2,2,2,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,2,2,2,0,0,0,0,0,2,2,2,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];
function getTile(c,r){ if(r<0||r>=LEVEL_H||c<0||c>=LEVEL_W)return 0; return MAP[r][c]; }
function isSolid(c,r){ const t=getTile(c,r); return t===1||t===2; }
function rectsOverlap(a,b){ return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y; }

/* ══════════════════════════════════════════════════════════════
   COLETÁVEIS
   ══════════════════════════════════════════════════════════════ */
let collectibles=[];
function spawnCollectibles(){
  collectibles=[];
  const types=['plastic','metal','organic'];
  const groundY=(LEVEL_H-2)*TILE-22;
  for(let i=0;i<18;i++){
    const type=types[i%3];
    const col=2+Math.floor(i*1.1)%(LEVEL_W-4);
    collectibles.push({x:col*TILE+6,y:groundY,w:20,h:20,type,active:true,bob:Math.random()*6.28});
  }
  const platPos=[[5,4],[6,4],[13,4],[14,4],[10,5],[19,4]];
  platPos.forEach((p,i)=>{
    collectibles.push({x:p[0]*TILE+6,y:p[1]*TILE-24,w:20,h:20,type:types[i%3],active:true,bob:Math.random()*6.28});
  });
}

/* ══════════════════════════════════════════════════════════════
   PERSONAGEM JOGADOR
   ══════════════════════════════════════════════════════════════ */
const Player={
  x:48,y:300,w:28,h:40,vx:0,vy:0,
  onGround:false,facing:1,health:100,maxHealth:100,
  invincible:0,animFrame:0,animTick:0,state:'idle',
  reset(){ this.x=48;this.y=300;this.vx=0;this.vy=0;this.health=this.maxHealth;this.invincible=0;this.state='idle'; },
  update(){
    const spd=3.4; let mv=false;
    if(Keys['ArrowLeft'] ||Keys['KeyA']){this.vx-=1.3;this.facing=-1;mv=true;}
    if(Keys['ArrowRight']||Keys['KeyD']){this.vx+=1.3;this.facing= 1;mv=true;}
    if((Keys['ArrowUp']||Keys['KeyW']||Keys['Space'])&&this.onGround){this.vy=-11;this.onGround=false;}
    this.vx*=0.78; if(Math.abs(this.vx)>spd)this.vx=Math.sign(this.vx)*spd;
    this.vy+=GRAVITY; if(this.vy>14)this.vy=14;
    this.x+=this.vx; this._rx();
    this.y+=this.vy; this._ry();
    if(this.x<0)this.x=0;
    if(this.x+this.w>LEVEL_W*TILE)this.x=LEVEL_W*TILE-this.w;
    if(this.y>canvas.height+100){this.takeDamage(20);this.x=48;this.y=300;}
    if(this.invincible>0)this.invincible--;
    this.animTick++; if(this.animTick>=8){this.animTick=0;this.animFrame=(this.animFrame+1)%4;}
    if(!this.onGround)this.state='jump'; else if(mv)this.state='run'; else this.state='idle';
  },
  _rx(){
    const cs=[Math.floor(this.x/TILE),Math.floor((this.x+this.w-1)/TILE)];
    const rs=[Math.floor(this.y/TILE),Math.floor((this.y+this.h-1)/TILE)];
    for(const r of rs)for(const c of cs)if(isSolid(c,r)){if(this.vx>0)this.x=c*TILE-this.w;if(this.vx<0)this.x=(c+1)*TILE;this.vx=0;}
  },
  _ry(){
    this.onGround=false;
    const cs=[Math.floor(this.x/TILE),Math.floor((this.x+this.w-1)/TILE)];
    const rs=[Math.floor(this.y/TILE),Math.floor((this.y+this.h-1)/TILE)];
    for(const c of cs)for(const r of rs)if(isSolid(c,r)){if(this.vy>0){this.y=r*TILE-this.h;this.vy=0;this.onGround=true;}else if(this.vy<0){this.y=(r+1)*TILE;this.vy=0;}}
  },
  takeDamage(amt){
    if(this.invincible>0||ActivePowerup.type==='shield')return;
    this.health=Math.max(0,this.health-amt);this.invincible=80;this.state='hurt';
    spawnParticles(this.x+this.w/2,this.y+this.h/2,'#ef5350',8);
    showToast('😖 Dano! -'+amt);updateHUD();
    if(this.health<=0)gameOver(false);
  },
  draw(){
    if(this.invincible>0&&Math.floor(this.invincible/6)%2===0)return;
    ctx.save();
    if(this.facing===-1){ctx.translate(this.x-Game.camera.x+this.w,this.y);ctx.scale(-1,1);}
    else ctx.translate(this.x-Game.camera.x,this.y);
    drawHero(0,0,this.animFrame,this.state,ActivePowerup.type==='shield');
    ctx.restore();
  }
};

/* ══════════════════════════════════════════════════════════════
   INIMIGOS – Garrafossauros  (Behavior Tree)
   ══════════════════════════════════════════════════════════════ */
const npcPool=[];
function mkEnemy(col){
  let n=npcPool.find(x=>!x.active);
  if(!n){n={};npcPool.push(n);}
  Object.assign(n,{active:true,type:'garrafo',x:col*TILE,y:(LEVEL_H-2)*TILE-32,
    w:26,h:32,vx:1,vy:0,dir:1,startX:col*TILE,range:TILE*4,
    hp:30,maxHp:30,btState:'patrol',onGround:false,aF:0,aT:0,flash:0,
    dropType:['plastic','metal','organic'][Math.floor(Math.random()*3)],facing:1});
  return n;
}
let enemies=[];
function spawnEnemies(){ enemies=[]; [4,9,14,18].forEach(c=>enemies.push(mkEnemy(c))); }

function btUpdate(e){
  const dist=Math.abs((e.x+e.w/2)-(Player.x+Player.w/2));
  if(e.hp<e.maxHp*0.25){ e.btState='flee'; e.vx=-Math.sign((Player.x+Player.w/2)-(e.x+e.w/2))*2.5; return; }
  if(dist<130){ e.btState='chase'; e.vx=Math.sign((Player.x+Player.w/2)-(e.x+e.w/2))*2.2; return; }
  e.btState='patrol'; e.vx=e.dir*1.0;
  if(e.x<=e.startX||e.x>=e.startX+e.range)e.dir*=-1;
}

function updateEnemies(){
  for(const e of enemies){
    if(!e.active)continue;
    btUpdate(e);
    e.vy+=GRAVITY; e.x+=e.vx; e.y+=e.vy;
    const gy=(LEVEL_H-1)*TILE-e.h;
    if(e.y>=gy){e.y=gy;e.vy=0;e.onGround=true;}
    if(e.x<0){e.x=0;e.dir*=-1;} if(e.x+e.w>LEVEL_W*TILE){e.x=LEVEL_W*TILE-e.w;e.dir*=-1;}
    e.facing=e.vx<0?-1:1;
    e.aT++;if(e.aT>=10){e.aT=0;e.aF=(e.aF+1)%2;}
    if(e.flash>0)e.flash--;
    if(rectsOverlap(Player,e))Player.takeDamage(10);
  }
}

function drawEnemies(){
  for(const e of enemies){
    if(!e.active)continue;
    ctx.save();
    if(e.facing===-1){ctx.translate(e.x-Game.camera.x+e.w,e.y);ctx.scale(-1,1);}
    else ctx.translate(e.x-Game.camera.x,e.y);
    if(e.flash>0&&Math.floor(e.flash/3)%2===0)ctx.globalAlpha=0.3;
    drawGarrafo(0,0,e.aF,e.hp,e.maxHp);
    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════
   CHEFÃO – Barão do Desperdício  (FSM 8 fases)
   ══════════════════════════════════════════════════════════════ */
const BPNAMES=['Preparação…','Revelação!','Poluição Normal','Escalada!','Ponto Crítico','Ataque Total!','Sequência Final','DERROTADO!'];
const Boss={
  active:false,x:600,y:0,w:64,h:72,hp:200,maxHp:200,
  vx:0,vy:0,onGround:false,phase:0,phTick:0,
  phDur:[180,120,300,200,150,250,180,300],
  aCool:60,telegr:false,telTimer:0,projs:[],aF:0,aT:0,

  reset(){
    this.active=false;this.hp=this.maxHp;this.x=600;this.y=(LEVEL_H-1)*TILE-this.h;
    this.vx=0;this.vy=0;this.phase=0;this.phTick=0;this.aCool=60;
    this.telegr=false;this.projs=[];
    document.getElementById('boss-hud').classList.add('hidden');
  },
  spawn(){
    this.active=true;this.y=(LEVEL_H-1)*TILE-this.h;
    document.getElementById('boss-hud').classList.remove('hidden');
    showToast('⚠️ O Barão do Desperdício chegou!');
  },
  update(){
    if(!this.active)return;
    this.phTick++;
    const hpR=1-this.hp/this.maxHp;
    if(this.phTick>=this.phDur[this.phase]||hpR>(this.phase+1)/8){
      if(this.phase<7){this.phase++;this.phTick=0;showToast('👹 '+BPNAMES[this.phase]);updateHUD();}
    }
    if(this.phase===7){bossDefeated();return;}
    const spd=1.0+this.phase*0.32;
    const dx=(Player.x+Player.w/2)-(this.x+this.w/2);
    if(this.phase>=5)this.vx=Math.sign(dx)*spd*1.9;
    else if(this.phase<=1)this.vx=Math.sign(dx)*spd*0.5;
    else this.vx=Math.sign(dx)*spd;
    this.vy+=GRAVITY; this.x+=this.vx; this.y+=this.vy;
    if(this.onGround&&this.phase>=4&&Math.random()<0.012)this.vy=-11;
    const gy=(LEVEL_H-1)*TILE-this.h;
    if(this.y>=gy){this.y=gy;this.vy=0;this.onGround=true;}else this.onGround=false;
    if(this.x<380)this.x=380; if(this.x+this.w>LEVEL_W*TILE)this.x=LEVEL_W*TILE-this.w;
    this.aCool--;
    if(this.aCool<=45&&!this.telegr){this.telegr=true;this.telTimer=45;}
    if(this.telTimer>0)this.telTimer--;else this.telegr=false;
    if(this.aCool<=0){this.aCool=Math.max(32-this.phase*4,10);this._shoot();}
    for(const p of this.projs){p.x+=p.vx;p.y+=p.vy;p.vy+=0.2;p.life--;
      if(p.active&&rectsOverlap(Player,p)){Player.takeDamage(8);p.active=false;}}
    this.projs=this.projs.filter(p=>p.active&&p.life>0);
    if(rectsOverlap(Player,this))Player.takeDamage(14);
    this.aT++;if(this.aT>=8){this.aT=0;this.aF=(this.aF+1)%4;}
  },
  _shoot(){
    const cnt=1+Math.floor(this.phase/2);
    for(let i=0;i<cnt;i++){
      const ang=Math.PI+(i-(cnt-1)/2)*0.38;
      const sp=3.2+this.phase*0.38;
      const col=this.telegr?'#ff1744':(this.phase>=4?'#8bc34a':'#ce93d8');
      this.projs.push({x:this.x+this.w/2-6,y:this.y+this.h/2,w:12,h:12,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,life:110,active:true,color:col,phase:this.phase});
    }
  },
  takeDamage(a){
    this.hp=Math.max(0,this.hp-a);
    spawnParticles(this.x+this.w/2,this.y+this.h/2,'#ce93d8',6);
    if(this.hp<=0)this.phase=7;updateHUD();
  },
  draw(){
    if(!this.active)return;
    const bx=this.x-Game.camera.x;
    drawBaron(bx,this.y,this.aF,this.phase,this.telegr,this.telTimer);
    for(const p of this.projs) drawPollutionBall(p.x-Game.camera.x,p.y,p.color,p.phase);
    // barra de HP do chefão acima
    ctx.fillStyle='#222';ctx.fillRect(bx,this.y-14,this.w,7);
    ctx.fillStyle='#e53935';ctx.fillRect(bx,this.y-14,this.w*(this.hp/this.maxHp),7);
    ctx.fillStyle='#fff';ctx.font='5px monospace';ctx.fillText('HP',bx+2,this.y-8);
  }
};

/* ══════════════════════════════════════════════════════════════
   PARTÍCULAS
   ══════════════════════════════════════════════════════════════ */
let particles=[];
function spawnParticles(x,y,color,n){
  for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*5,vy:(Math.random()-.5)*5-1.5,life:35+Math.random()*15,maxLife:50,color});
}
function updateParticles(){
  for(const p of particles){p.x+=p.vx;p.y+=p.vy;p.vy+=0.12;p.life--;}
  particles=particles.filter(p=>p.life>0);
}
function drawParticles(){
  for(const p of particles){
    ctx.globalAlpha=p.life/p.maxLife;
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x-Game.camera.x,p.y,5,5);
  }
  ctx.globalAlpha=1;
}

/* ══════════════════════════════════════════════════════════════
   POWER-UPS produzidos
   ══════════════════════════════════════════════════════════════ */
let powerupItems=[];
function producePowerup(type){
  powerupItems.push({x:Player.x+Player.w/2-12,y:Player.y-36,w:24,h:24,type,active:true,bob:0,dur:type==='shield'?360:240});
  const names={shield:'Escudo de Plástico',compost:'Armadilha de Adubo',magnet:'Ímã de Metal'};
  showToast('🏭 Produzido: '+names[type]+' (Endowment: durabilidade+)');
}
function updatePowerupItems(){
  for(const p of powerupItems){if(!p.active)continue;p.bob+=0.09;
    if(rectsOverlap(Player,p)){p.active=false;ActivePowerup.type=p.type;ActivePowerup.duration=p.dur;ActivePowerup.maxDur=p.dur;showToast('✅ '+{shield:'Escudo ativado!',compost:'Adubo: use [E]',magnet:'Ímã ativado!'}[p.type]);updateHUD();}}
  powerupItems=powerupItems.filter(p=>p.active);
  if(ActivePowerup.type){ActivePowerup.duration--;if(ActivePowerup.duration<=0){ActivePowerup.type=null;updateHUD();showToast('⏱️ Power-up expirou');}}
}
function drawPowerupItems(){
  for(const p of powerupItems){if(!p.active)continue;
    const oy=Math.sin(p.bob)*5;
    ctx.save(); ctx.translate(p.x-Game.camera.x,p.y+oy);
    // brilho pulsante
    ctx.globalAlpha=0.3+0.2*Math.sin(p.bob*2);
    ctx.fillStyle='#ffd600';
    ctx.beginPath();ctx.arc(12,12,16,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    if(p.type==='shield')drawShieldItem(0,0);
    else if(p.type==='compost')drawCompostItem(0,0);
    else drawMagnetItem(0,0);
    ctx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════
   ARMADILHAS DE ADUBO  (Pedra-Papel-Tesoura: vence terrestres)
   ══════════════════════════════════════════════════════════════ */
let compostTraps=[];
window.addEventListener('keydown',e=>{
  if(e.code==='KeyE'&&Game.running&&ActivePowerup.type==='compost'){
    compostTraps.push({x:Player.x+(Player.facing>0?Player.w+4:-36),y:Player.y+Player.h-20,w:28,h:18,life:220,active:true});
    ActivePowerup.type=null;updateHUD();showToast('💩 Armadilha colocada!');
  }
});
function updateCompostTraps(){
  for(const t of compostTraps){if(!t.active)continue;t.life--;
    if(t.life<=0){t.active=false;continue;}
    for(const e of enemies)if(e.active&&rectsOverlap(t,e)){e.hp-=2;e.flash=6;if(e.hp<=0)killEnemy(e);}
  }
  compostTraps=compostTraps.filter(t=>t.active);
}
function drawCompostTraps(){
  for(const t of compostTraps)if(t.active) drawCompostTrap(t.x-Game.camera.x,t.y,t.life);
}

/* ══════════════════════════════════════════════════════════════
   COLETÁVEIS – update + draw
   ══════════════════════════════════════════════════════════════ */
function applyMagnet(){
  if(ActivePowerup.type!=='magnet')return;
  for(const c of collectibles){if(!c.active)continue;
    const dx=(Player.x+Player.w/2)-(c.x+c.w/2),dy=(Player.y+Player.h/2)-(c.y+c.h/2);
    if(Math.sqrt(dx*dx+dy*dy)<130){c.x+=Math.sign(dx)*2.2;c.y+=Math.sign(dy)*2.2;}}
}
function updateCollectibles(){
  applyMagnet();
  const t=Date.now()*0.003;
  for(const c of collectibles){if(!c.active)continue;
    const cy=c.y+Math.sin(t+c.bob)*4;
    if(rectsOverlap(Player,{x:c.x,y:cy,w:c.w,h:c.h})){collectWaste(c.type);c.active=false;spawnParticles(c.x+c.w/2,c.y+c.h/2,'#ffd600',8);}
  }
}
function drawCollectibles(){
  const t=Date.now()*0.003;
  for(const c of collectibles){if(!c.active)continue;
    const cy=c.y+Math.sin(t+c.bob)*4;
    ctx.save();
    // brilho de item
    ctx.globalAlpha=0.25+0.12*Math.sin(t*2+c.bob);
    ctx.fillStyle={plastic:'#29b6f6',metal:'#78909c',organic:'#66bb6a'}[c.type];
    ctx.beginPath();ctx.arc(c.x-Game.camera.x+10,cy+10,14,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
    ctx.translate(c.x-Game.camera.x,cy);
    if(c.type==='plastic')drawPlastic(0,0);
    else if(c.type==='metal')drawMetal(0,0);
    else drawOrganic(0,0);
    ctx.restore();
  }
}

function collectWaste(type){
  Inventory[type]++;Game.score+=10;Game.envProgress=Math.min(100,Game.envProgress+2);updateHUD();
  if(Inventory[type]>=Inventory.THRESHOLD){
    Inventory[type]=0;producePowerup({plastic:'shield',organic:'compost',metal:'magnet'}[type]);updateHUD();
  }
}
function killEnemy(e){
  e.active=false;spawnParticles(e.x+e.w/2,e.y+e.h/2,'#1e88e5',10);
  Game.score+=50;Game.envProgress=Math.min(100,Game.envProgress+5);
  collectibles.push({x:e.x,y:e.y-12,w:20,h:20,type:e.dropType,active:true,bob:0});
  updateHUD();
  if(enemies.every(x=>!x.active)&&!Boss.active)Boss.spawn();
}

/* ══════════════════════════════════════════════════════════════
   DESENHO DO MUNDO
   ══════════════════════════════════════════════════════════════ */
function drawBackground(){
  // céu
  const gr=ctx.createLinearGradient(0,0,0,canvas.height);
  gr.addColorStop(0,'#4fc3f7');gr.addColorStop(0.55,'#81d4fa');gr.addColorStop(1,'#b3e5fc');
  ctx.fillStyle=gr;ctx.fillRect(0,0,canvas.width,canvas.height);

  // sol
  ctx.fillStyle='#fff9c4';
  ctx.beginPath();ctx.arc(720,50,34,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff176';
  ctx.beginPath();ctx.arc(720,50,26,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffd600';
  ctx.beginPath();ctx.arc(720,50,18,0,Math.PI*2);ctx.fill();
  // raios
  ctx.strokeStyle='#fff59d';ctx.lineWidth=2;
  for(let r=0;r<8;r++){
    const a=r*Math.PI/4;
    ctx.beginPath();ctx.moveTo(720+Math.cos(a)*22,50+Math.sin(a)*22);
    ctx.lineTo(720+Math.cos(a)*42,50+Math.sin(a)*42);ctx.stroke();
  }

  // montanhas fundo (parallax 0.2x)
  DECO.mountains.forEach(m=>{
    const mx=m.x-Game.camera.x*0.2;
    drawMountain(((mx%(canvas.width+200))+canvas.width+200)%(canvas.width+200)-100,(LEVEL_H-1)*TILE-2,m.s);
  });

  // nuvens (parallax 0.3x)
  DECO.clouds.forEach(cl=>{
    const cx=cl.x-Game.camera.x*0.3;
    const wx=((cx%(canvas.width+160))+canvas.width+160)%(canvas.width+160)-80;
    drawCloud(wx,cl.y,cl.w);
  });

  // árvores (parallax 0.7x)
  DECO.trees.forEach(tr=>{
    const tx=tr.x*TILE-Game.camera.x*0.7;
    const wx=((tx%(LEVEL_W*TILE+200))+LEVEL_W*TILE+200)%(LEVEL_W*TILE+200)-60;
    if(wx>-60&&wx<canvas.width+60) drawTree(wx,(LEVEL_H-1)*TILE-34);
  });

  // arbustos (parallax 0.85x)
  DECO.bushes.forEach(b=>{
    const bx=b.x*TILE-Game.camera.x*0.85;
    if(bx>-40&&bx<canvas.width+40) drawBush(bx,(LEVEL_H-1)*TILE-18);
  });
}

function drawTiles(){
  const s=Math.max(0,Math.floor(Game.camera.x/TILE));
  const e=Math.min(LEVEL_W,s+Math.ceil(canvas.width/TILE)+1);
  for(let r=0;r<LEVEL_H;r++)for(let c=s;c<e;c++){
    const t=MAP[r][c]; if(!t)continue;
    const x=c*TILE-Game.camera.x, y=r*TILE;
    if(t===1)drawGroundTile(x,y);
    else if(t===2)drawPlatformTile(x,y);
  }
}

/* ══════════════════════════════════════════════════════════════
   HUD + TOAST
   ══════════════════════════════════════════════════════════════ */
function updateHUD(){
  ['plastic','metal','organic'].forEach(t=>{
    document.getElementById('bar-'+t).style.width=(Inventory[t]/Inventory.THRESHOLD*100)+'%';
    document.getElementById('num-'+t).textContent=Inventory[t]+'/'+Inventory.THRESHOLD;
  });
  document.getElementById('env-bar-fill').style.width=Game.envProgress+'%';
  document.getElementById('env-pct').textContent=Math.floor(Game.envProgress)+'%';
  document.getElementById('score').textContent=Game.score;
  document.getElementById('health-bar-fill').style.width=(Player.health/Player.maxHealth*100)+'%';
  document.getElementById('active-powerup').textContent={shield:'🛡️ Escudo',compost:'💩 Adubo',magnet:'🧲 Ímã',null:'Nenhum'}[ActivePowerup.type]||'Nenhum';
  document.getElementById('phase-num').textContent=Game.phase;
  if(Boss.active){
    document.getElementById('boss-bar-fill').style.width=(Boss.hp/Boss.maxHp*100)+'%';
    document.getElementById('boss-phase').textContent=BPNAMES[Boss.phase]||'';
  }
}
let _toastTO=null;
function showToast(msg){
  const el=document.getElementById('toast');el.textContent=msg;el.classList.remove('hidden');
  el.style.animation='none';void el.offsetWidth;el.style.animation='fadeToast 2.5s forwards';
  clearTimeout(_toastTO);_toastTO=setTimeout(()=>el.classList.add('hidden'),2600);
}

/* ══════════════════════════════════════════════════════════════
   GAME OVER / VITÓRIA
   ══════════════════════════════════════════════════════════════ */
function gameOver(win){
  Game.running=false;
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('overlay-title').textContent=win?'🌍 Vitória!':'💀 Fim de Jogo';
  document.getElementById('overlay-msg').innerHTML=win
    ?'Restauração: '+Math.floor(Game.envProgress)+'%<br>Pontos: '+Game.score+'<br><br>O Barão foi derrotado!<br>A cidade respira ar puro!'
    :'Energia esgotada!<br>Pontos: '+Game.score+'<br><br>A reciclagem precisa de você!';
  document.getElementById('overlay-btn').textContent='▶ Jogar Novamente';
}
function bossDefeated(){Boss.active=false;Game.envProgress=Math.min(100,Game.envProgress+20);updateHUD();setTimeout(()=>gameOver(true),900);}

/* ══════════════════════════════════════════════════════════════
   CÂMERA + LOOP
   ══════════════════════════════════════════════════════════════ */
function updateCamera(){
  const target=Player.x-canvas.width/3;
  Game.camera.x+=(target-Game.camera.x)*0.1;
  Game.camera.x=Math.max(0,Math.min(Game.camera.x,LEVEL_W*TILE-canvas.width));
}

let lastTime=0;
function gameLoop(ts){
  if(!Game.running)return;
  const dt=ts-lastTime;lastTime=ts;
  if(dt>200){requestAnimationFrame(gameLoop);return;}

  Player.update();updateCamera();
  updateEnemies();updateCollectibles();updatePowerupItems();updateCompostTraps();updateParticles();
  Boss.update();

  drawBackground();drawTiles();
  drawCompostTraps();drawCollectibles();drawPowerupItems();
  drawEnemies();Boss.draw();Player.draw();drawParticles();

  requestAnimationFrame(gameLoop);
}

/* ══════════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════════ */
function startGame(){
  Game.running=false;Game.score=0;Game.envProgress=15;Game.phase=1;Game.camera.x=0;
  particles=[];powerupItems=[];compostTraps=[];npcPool.forEach(n=>n.active=false);
  Inventory.plastic=0;Inventory.metal=0;Inventory.organic=0;
  ActivePowerup.type=null;ActivePowerup.duration=0;
  Player.reset();Boss.reset();spawnCollectibles();spawnEnemies();updateHUD();
  Game.running=true;
  document.getElementById('overlay').classList.add('hidden');
  lastTime=performance.now();requestAnimationFrame(gameLoop);
}

(function showIntro(){
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('overlay-title').textContent='♻ EcoHerói';
  document.getElementById('overlay-msg').innerHTML=
    'Tema: Produção Sustentável<br><br>'+
    '⬅➡ Mover &nbsp; ⬆/Espaço Pular<br>'+
    '[E] Usar Armadilha de Adubo<br><br>'+
    'Colete 5× de cada resíduo:<br>'+
    '🧴 Plástico → 🛡️ Escudo<br>'+
    '🔩 Metal → 🧲 Ímã de Atração<br>'+
    '🍂 Orgânico → 💩 Adubo [E]<br><br>'+
    'Derrote os Garrafossauros<br>e enfrente o Barão do Desperdício!';
  document.getElementById('overlay-btn').textContent='▶ Iniciar';
})();
document.getElementById('overlay-btn').addEventListener('click',startGame);
