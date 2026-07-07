// --- CONFIGURAÇÃO DO CANVAS ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- ELEMENTOS DA INTERFACE (HUD) ---
const barPlastic = document.getElementById("bar-plastic");
const numPlastic = document.getElementById("num-plastic");
const barMetal = document.getElementById("bar-metal");
const numMetal = document.getElementById("num-metal");
const barOrganic = document.getElementById("bar-organic");
const numOrganic = document.getElementById("num-organic");

const envBarFill = document.getElementById("env-bar-fill");
const envPct = document.getElementById("env-pct");
const scoreDisplay = document.getElementById("score");
const healthBarFill = document.getElementById("health-bar-fill");
const activePu = document.getElementById("active-pu");

// Boss HUD
const bossHud = document.getElementById("boss-hud");
const bossBarFill = document.getElementById("boss-bar-fill");
const phaseDisplay = document.getElementById("phase-display");

// Overlay e Sistema
const overlay = document.getElementById("overlay");
const overlayBtn = document.getElementById("overlay-btn");
const toast = document.getElementById("toast");

// --- ESTADO DO JOGO ---
let gameActive = false;
let score = 0;
let envRestoration = 15; 
let health = 100;
let bossActive = false;
let bossHealth = 100;

let inventory = { plastic: 0, metal: 0, organic: 0 };
const MAX_INV = 5;

// --- CONFIGURAÇÃO DO JOGADOR ---
const player = {
    x: 100,
    y: 345,
    width: 30,
    height: 40,
    speed: 5,
    velY: 0,
    jumping: false,
    grounded: true,
    color: "#4caf50"
};
const gravity = 0.5;

// --- INIMIGOS E ITENS ---
let items = [];
let enemies = [];
const itemTypes = ["plastic", "metal", "organic"];
const itemColors = { plastic: "#5bc8f5", metal: "#ffd600", organic: "#a5d6a7" };

// --- CONTROLES ---
const keys = {};
window.addEventListener("keydown", (e) => { keys[e.code] = true; });
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

// --- GERAÇÃO DE LIXO ---
function spawnItem() {
    if (!gameActive || bossActive) return;
    const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    items.push({
        x: Math.random() * (canvas.width - 25) + 10,
        y: Math.random() * 150 + 150,
        width: 16,
        height: 16,
        type: type,
        color: itemColors[type]
    });
}

// --- GERAÇÃO DE POLUIÇÃO (INIMIGOS) ---
function spawnEnemy() {
    if (!gameActive) return;
    enemies.push({
        x: canvas.width,
        y: 350,
        width: 25,
        height: 35,
        speed: bossActive ? 5 : 2,
        color: "#e53935"
    });
}

// --- ATUALIZAÇÃO DA LÓGICA ---
function update() {
    if (!gameActive) return;

    // Movimentação Lateral
    if (keys["ArrowLeft"] || keys["KeyA"]) player.x -= player.speed;
    if (keys["ArrowRight"] || keys["KeyD"]) player.x += player.speed;

    // Pulo
    if ((keys["Space"] || keys["ArrowUp"] || keys["KeyW"]) && !player.jumping && player.grounded) {
        player.velY = -11;
        player.jumping = true;
        player.grounded = false;
    }

    // Gravidade
    player.velY += gravity;
    player.y += player.velY;

    // Limites das Paredes
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Chão Fixo 
    if (player.y >= 345) {
        player.y = 345;
        player.velY = 0;
        player.jumping = false;
        player.grounded = true;
    }

    // Ação: Usar Adubo Organico [E]
    if (keys["KeyE"]) {
        if (inventory.organic > 0) {
            inventory.organic--;
            score += 25;
            envRestoration = Math.min(100, envRestoration + 5);
            showToast("Usou adubo! Natureza restaurada +5%!");
            keys["KeyE"] = false; 
            updateHUD();
            checkBossTrigger();
        } else if (bossActive && (inventory.plastic > 0 || inventory.metal > 0)) {
            // No boss, gastar plastico/metal para atacar
            if (inventory.plastic > 0) inventory.plastic--;
            else if (inventory.metal > 0) inventory.metal--;
            
            bossHealth -= 10;
            score += 50;
            showToast("Você arremessou lixo reciclável no Barão!");
            keys["KeyE"] = false;
            updateHUD();
            if (bossHealth <= 0) gameOver(true);
        }
    }

    // Coleta de Itens
    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i];
        if (checkCollision(player, it)) {
            if (inventory[it.type] < MAX_INV) {
                inventory[it.type]++;
                score += 10;
                items.splice(i, 1);
                updateHUD();
            } else {
                showToast(`Inventário de ${it.type} cheio!`);
            }
        }
    }

    // Movimentação de Inimigos e Dano
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].x -= enemies[i].speed;
        
        if (checkCollision(player, enemies[i])) {
            health -= 15;
            enemies.splice(i, 1);
            showToast("Dano por poluição!");
            updateHUD();
            if (health <= 0) gameOver(false);
            continue;
        }

        if (enemies[i].x + enemies[i].width < 0) {
            enemies.splice(i, 1);
        }
    }
}

// --- DESENHAR NA TELA ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fundo dinâmico (Fica avermelhado no Boss)
    ctx.fillStyle = bossActive ? "#2a0a0a" : "#5bc8f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Chão
    ctx.fillStyle = "#5c4033";
    ctx.fillRect(0, 385, canvas.width, 35);
    ctx.fillStyle = bossActive ? "#8b0000" : "#2d6a2d";
    ctx.fillRect(0, 380, canvas.width, 5);

    // Jogador
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Itens
    items.forEach(it => {
        ctx.fillStyle = it.color;
        ctx.fillRect(it.x, it.y, it.width, it.height);
    });

    // Inimigos
    enemies.forEach(en => {
        ctx.fillStyle = en.color;
        ctx.fillRect(en.x, en.y, en.width, en.height);
    });

    // Render do Boss
    if (bossActive) {
        ctx.fillStyle = "#4a0e4e";
        ctx.fillRect(600, 260, 80, 120);
        ctx.fillStyle = "#ffffff";
        ctx.font = "8px 'Press Start 2P'";
        ctx.fillText("BARÃO", 615, 240);
    }
}

// --- AUXILIARES ---
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkBossTrigger() {
    if (envRestoration >= 100 && !bossActive) {
        bossActive = true;
        bossHud.classList.remove("hidden");
        phaseDisplay.innerText = "Confronto Final!";
        showToast("O Barão do Desperdício apareceu! Aperte [E] com plástico/metal para atacar!");
    }
}

function updateHUD() {
    // Barras de Inventário
    numPlastic.innerText = `${inventory.plastic}/${MAX_INV}`;
    barPlastic.style.width = `${(inventory.plastic / MAX_INV) * 100}%`;
    numMetal.innerText = `${inventory.metal}/${MAX_INV}`;
    barMetal.style.width = `${(inventory.metal / MAX_INV) * 100}%`;
    numOrganic.innerText = `${inventory.organic}/${MAX_INV}`;
    barOrganic.style.width = `${(inventory.organic / MAX_INV) * 100}%`;

    // Status Gerais
    scoreDisplay.innerText = score;
    envPct.innerText = `${envRestoration}%`;
    envBarFill.style.width = `${envRestoration}%`;
    healthBarFill.style.width = `${Math.max(0, health)}%`;

    if (bossActive) {
        bossBarFill.style.width = `${Math.max(0, bossHealth)}%`;
    }
}

function showToast(msg) {
    toast.innerText = msg;
    toast.classList.remove("hidden");
    toast.style.animation = 'none';
    toast.offsetHeight; 
    toast.style.animation = null;
}

function gameOver(victory) {
    gameActive = false;
    overlay.style.display = "flex";
    document.getElementById("overlay-title").innerText = victory ? "VITÓRIA!" : "GAME OVER";
    document.getElementById("overlay-msg").innerText = victory ? `Você derrotou o Barão e salvou o planeta!\nPontuação: ${score}` : "A poluição tomou conta de tudo.";
    overlayBtn.innerText = "REJOGAR";
}

// --- LOOP DO MOTOR ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- EVENTO START ---
overlayBtn.addEventListener("click", () => {
    overlay.style.display = "none";
    gameActive = true;
    bossActive = false;
    score = 0;
    envRestoration = 15;
    health = 100;
    bossHealth = 100;
    inventory = { plastic: 0, metal: 0, organic: 0 };
    items = [];
    enemies = [];
    
    bossHud.classList.add("hidden");
    updateHUD();
});

// Configuração de intervalos repetidores
setInterval(spawnItem, 2000);
setInterval(spawnEnemy, 3500);

// Inicia o ciclo do jogo
gameLoop();
