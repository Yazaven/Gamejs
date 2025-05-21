window.addEventListener('load', function() {
    const config = {
        width: 800,
        height: 450,
        gravity: 0.5,
        playerSpeed: 5,
        jumpForce: 12,
        maxFallSpeed: 10
    };
    let score = 0;
    let lives = 3;
    let currentLevel = 1;
    let isGameOver = false;
    let particles = [];
    let isMuted = false;    
    let audioCtx;
    const JUMP_FREQ = 395; 
    const COIN_FREQ = 783; 
    let bgMusic = {
        osc: null,
        gainNode: null,
        melodyTimeout: null,
        isPlaying: false
    };
    const MASTER_VOL = 0.2;
    function setupAudio() {
        if (audioCtx) return true; 
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            return true;
        } catch(e) {
            console.log("Looks like this browser doesn't support Web Audio :(");
            return false;
        }
    }
    function playSound(soundName, vol) {
        if (isMuted || !audioCtx) return;
        vol = vol || {
            jump: 0.3,
            coin: 0.3,
            defeat: 0.35,
            death: 0.4,
            levelComplete: 0.5,
            gameOver: 0.35
        }[soundName] || 0.3;
        vol *= MASTER_VOL; 
        try {
            let osc = audioCtx.createOscillator();
            let gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            let duration = 0.2;
            gainNode.gain.value = vol;
            if (soundName === "jump") {
                osc.type = "square";
                osc.frequency.setValueAtTime(JUMP_FREQ, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(JUMP_FREQ/2, audioCtx.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
                
            } else if (soundName === "coin") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(COIN_FREQ, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(COIN_FREQ*1.5, audioCtx.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
                
            } else if (soundName === "defeat") {
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
                
            } else if (soundName === "death") {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(380, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.5);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
                duration = 0.8; 
                
            } else if (soundName === "levelComplete") {
                let notes = [
                    {freq: 523.25, time: 0.0},    
                    {freq: 659.26, time: 0.2},    
                    {freq: 783.99, time: 0.4},     
                    {freq: 1046.5, time: 0.6}     
                ];
                
                notes.forEach(note => {
                    let noteOsc = audioCtx.createOscillator();
                    let noteGain = audioCtx.createGain();

                    noteOsc.connect(noteGain);
                    noteGain.connect(audioCtx.destination);
                    noteOsc.type = "sine";
                    noteOsc.frequency.value = note.freq;
                    noteGain.gain.value = 0;
                    noteGain.gain.setValueAtTime(0, audioCtx.currentTime + note.time);
                    noteGain.gain.linearRampToValueAtTime(vol, audioCtx.currentTime + note.time + 0.05);
                    noteGain.gain.setValueAtTime(vol, audioCtx.currentTime + note.time + 0.2);
                    noteGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + note.time + 0.3);
                    noteOsc.start(audioCtx.currentTime + note.time);
                    noteOsc.stop(audioCtx.currentTime + note.time + 0.3);
                });
                
                return; 
            } else if (soundName === "gameOver") {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(200, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
                osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 1);      
                gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
                gainNode.gain.linearRampToValueAtTime(vol * 0.8, audioCtx.currentTime + 0.6);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
                duration = 1;
            }
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch(e) {
            console.log("Sound failed to play: " + soundName);
        }
    }
        function startBgMusic() {
        if (isMuted || !audioCtx || bgMusic.isPlaying) return;
        
        try {
            stopBgMusic();
            let osc = audioCtx.createOscillator();
            let gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            gainNode.gain.value = 0.04 * MASTER_VOL;
            osc.type = "triangle";
            osc.frequency.value = 262; 
            osc.start();
            bgMusic.osc = osc;
            bgMusic.gainNode = gainNode;
            bgMusic.isPlaying = true;
            
            let melody = [
                262,
                294,
                330,
                349,
                392,
                349,
                330,
                294
            ];            
            let noteIndex = 0;
            function playNextNote() {
                if (!bgMusic.osc || isMuted) {
                    return; 
                }
                bgMusic.osc.frequency.setValueAtTime(melody[noteIndex], audioCtx.currentTime);
                noteIndex = (noteIndex + 1) % melody.length;
                bgMusic.melodyTimeout = setTimeout(playNextNote, 1000);
            }
            playNextNote();
            
        } catch(e) {
            console.log("Couldn't start music: " + e);
            bgMusic.isPlaying = false;
        }
    }
    function stopBgMusic() {
        if (bgMusic.melodyTimeout) {
            clearTimeout(bgMusic.melodyTimeout);
            bgMusic.melodyTimeout = null;
        }
        if (bgMusic.osc) {
            try {
                bgMusic.osc.stop();
            } catch(e) {
            }
            bgMusic.osc = null;
        }
        
        bgMusic.gainNode = null;
        bgMusic.isPlaying = false;
    }
    function toggleMute() {
        isMuted = !isMuted;
        
        if (isMuted) {
            stopBgMusic();
        } else {
            if (audioCtx) {
                startBgMusic();
            }
        }
    }
    window.addEventListener('keydown', function(e) {
        if (e.key.toLowerCase() === 'm') {
            toggleMute();
        }
    });
    const app = new PIXI.Application({
        width: config.width,
        height: config.height,
        backgroundColor: 0x87CEEB,
        antialias: false,
        resolution: 1,
        autoStart: true,
        sharedTicker: true
    });
    document.getElementById('game-container').appendChild(app.view);
    let player;
    let platforms = [];
    let coins = [];
    let enemies = [];
    const gameContainer = new PIXI.Container();
    const effectsContainer = new PIXI.Container();
    app.stage.addChild(gameContainer);
    app.stage.addChild(effectsContainer);
    const playerVelocity = { x: 0, y: 0 };
    let isJumping = false;
    let onGround = false;
    let playerInvincible = false;
    const keys = {};
    window.addEventListener('keydown', function(e) {
        keys[e.key] = true;
    });
    
    window.addEventListener('keyup', function(e) {
        keys[e.key] = false;
    });
    
    function showMessage(text, duration = 2000) {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.style.display = 'block';
        
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, duration);
    }
        function checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
        function createPlayer() {
        player = new PIXI.Graphics();
        player.beginFill(0xFF0000);
        player.drawRect(0, 0, 30, 50);
        player.endFill();
        player.x = 100;
        player.y = config.height - 100;
        gameContainer.addChild(player);
    }
    
    function createPlatform(x, y, width, height, color = 0x8B4513) {
        const platform = new PIXI.Graphics();
        platform.beginFill(color);
        platform.drawRect(0, 0, width, height);
        platform.endFill();
        platform.x = x;
        platform.y = y;
        gameContainer.addChild(platform);
        platforms.push(platform);
        return platform;
    }
    
    function createCoin(x, y) {
        const coin = new PIXI.Graphics();
        coin.beginFill(0xFFD700);
        coin.drawCircle(0, 0, 10);
        coin.endFill();
        coin.x = x;
        coin.y = y;
        gameContainer.addChild(coin);
        coins.push(coin);
        return coin;
    }
    function createEnemy(x, y, platformIndex, speed = 1) {
        if (platformIndex >= platforms.length) {
            console.error("Invalid platform index:", platformIndex);
            return null;
        }       
        const platform = platforms[platformIndex];       
        const enemy = new PIXI.Graphics();
        enemy.beginFill(0x00AA00);
        enemy.drawRect(0, 0, 30, 30);
        enemy.endFill();
        enemy.x = x;
        enemy.y = platform.y - enemy.height;
        enemy.platformIndex = platformIndex;
        enemy.direction = 1;
        enemy.speed = speed;
        enemy.platform = platform; 
        
        gameContainer.addChild(enemy);
        enemies.push(enemy);
        return enemy;
    }
    function updateUI() {
        document.getElementById('ui-container').textContent = `Score: ${score} | Lives: ${lives}`;
        document.getElementById('level-indicator').textContent = `Level: ${currentLevel}`;
    }
    function createParticle(x, y, color, size, lifetime, velocityX, velocityY) {
        const particle = new PIXI.Graphics();
        particle.beginFill(color);
        particle.drawCircle(0, 0, size);
        particle.endFill();
        particle.x = x;
        particle.y = y;
        particle.alpha = 1;
        particle.velocityX = velocityX;
        particle.velocityY = velocityY;
        particle.lifetime = lifetime;
        particle.maxLifetime = lifetime;
        effectsContainer.addChild(particle);
        particles.push(particle);
        return particle;
    }
    function createExplosion(x, y, color, count, size, spread) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * spread;
            const velocityX = Math.cos(angle) * speed;
            const velocityY = Math.sin(angle) * speed;
            const particleSize = Math.random() * size + 2;
            const lifetime = Math.random() * 30 + 20;
            createParticle(x, y, color, particleSize, lifetime, velocityX, velocityY);
        }
    }
    function deathEffect() {
        createExplosion(player.x + player.width/2, player.y + player.height/2, 0xFF0000, 50, 5, 5);
        player.alpha = 0;
        playerInvincible = true;
        setTimeout(() => {
            player.alpha = 1; 
            setTimeout(() => {
                playerInvincible = false;
            }, 1000);
        }, 1000);
    }
    function coinEffect(x, y) {
        createExplosion(x, y, 0xFFD700, 20, 3, 3);
        showFloatingText('+10', x, y, 0xFFD700);
    }
    function enemyDefeatEffect(x, y) {
        createExplosion(x, y, 0x00AA00, 30, 4, 4);
        showFloatingText('+20', x, y, 0x00FF00);
    }
    function winEffect() {
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const x = Math.random() * config.width;
                const y = Math.random() * config.height;
                createExplosion(x, y, 0xFFD700, 30, 5, 5);
            }, i * 200);
        }
    }
    function showFloatingText(text, x, y, color) {
        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 20,
            fontWeight: 'bold',
            fill: color,
            stroke: '#000000',
            strokeThickness: 4
        });
        
        const floatingText = new PIXI.Text(text, style);
        floatingText.x = x;
        floatingText.y = y;
        floatingText.anchor.set(0.5);
        floatingText.lifetime = 40;
        effectsContainer.addChild(floatingText);
        particles.push(floatingText);
        floatingText.velocityY = -2;
        floatingText.velocityX = 0;
        floatingText.maxLifetime = floatingText.lifetime;
    }
    
    function resetPlayerPosition() {
        let spawnX, spawnY;
        
        if (currentLevel === 1) {
            spawnX = 100;
            spawnY = 300; 
        } else {
            spawnX = 150; 
            spawnY = 300; 
        }
        
        player.x = spawnX;
        player.y = spawnY;
        playerVelocity.x = 0;
        playerVelocity.y = 0;
        isJumping = false;
    }
    
function buildLevel1() {
    createPlatform(100, 350, 120, 20);
    createPlatform(300, 320, 150, 20);
    createPlatform(500, 300, 100, 20);
    createPlatform(650, 250, 150, 20);
    createPlatform(400, 220, 120, 20);
    createPlatform(200, 180, 150, 20);
    createPlatform(0, 200, 80, 20);
    createPlatform(550, 150, 90, 20);

    createCoin(150, 330);
    createCoin(350, 300);
    createCoin(550, 280);
    createCoin(700, 230);
    createCoin(450, 200);
    createCoin(250, 160);
    createCoin(30, 180);
    createCoin(580, 130);

    createEnemy(150, 0, 1, 1.0);
    createEnemy(350, 0, 2, 0.8);
    createEnemy(700, 0, 4, 0.9);
}

function buildLevel2() {
    createPlatform(50, 370, 100, 20);
    createPlatform(200, 340, 120, 20);
    createPlatform(370, 310, 90, 20);
    createPlatform(500, 280, 110, 20);
    createPlatform(650, 310, 140, 20);
    createPlatform(730, 220, 70, 20);
    createPlatform(550, 180, 130, 20);
    createPlatform(380, 180, 120, 20);
    createPlatform(230, 180, 100, 20);
    createPlatform(50, 220, 150, 20);
    createPlatform(0, 300, 70, 20);
    createPlatform(100, 150, 80, 20);

    createCoin(80, 350);
    createCoin(230, 320);
    createCoin(400, 290);
    createCoin(530, 260);
    createCoin(700, 290);
    createCoin(750, 200);
    createCoin(600, 160);
    createCoin(420, 160);
    createCoin(260, 160);
    createCoin(100, 200);
    createCoin(30, 280);
    createCoin(130, 130);

    createEnemy(120, 0, 1, 1.2);
    createEnemy(230, 0, 2, 1.0);
    createEnemy(700, 0, 5, 0.8);
    createEnemy(600, 0, 7, 1.1);
    createEnemy(120, 0, 10, 0.9);
}

function resetLevel() {
    while(gameContainer.children.length > 0) {
        gameContainer.removeChildAt(0);
    }
    platforms = [];
    coins = [];
    enemies = [];
    while(effectsContainer.children.length > 0) {
        effectsContainer.removeChildAt(0);
    }
    particles = [];

    if (currentLevel === 1) {
        app.renderer.backgroundColor = 0x87CEEB;
    } else {
        app.renderer.backgroundColor = 0x6A0DAD;
    }

    createPlayer();
    createPlatform(0, config.height - 50, config.width, 50);

    if (currentLevel === 1) {
        buildLevel1();
    } else if (currentLevel === 2) {
        buildLevel2();
    }

    resetPlayerPosition();
    updateUI();
}

function nextLevel() {
    winEffect();
    playSound('levelComplete');
    currentLevel++;

    if (currentLevel > 2) {
        showMessage("YOU WIN!", 3000);
        setTimeout(() => {
            alert("Congratulations! You completed the game!\nFinal Score: " + score);
            currentLevel = 1;
            score = 0;
            resetLevel();
        }, 3000);
    } else {
        showMessage("LEVEL " + currentLevel, 2000);
        app.ticker.stop();
        setTimeout(function() {
            resetLevel();
            app.ticker.start();
        }, 2000);
    }
}

function gameOver() {
    isGameOver = true;
    showMessage("GAME OVER", 3000);
    playSound('gameOver');

    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            createExplosion(
                player.x + player.width/2 + (Math.random() * 40 - 20),
                player.y + player.height/2 + (Math.random() * 40 - 20),
                0xFF0000,
                30,
                5,
                4
            );
        }, i * 200);
    }

    setTimeout(() => {
        lives = 3;
        score = 0;
        currentLevel = 1;
        isGameOver = false;
        resetLevel();
    }, 3000);
}

app.ticker.add(function(delta) {
    if (isGameOver) return;

    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;
        particle.lifetime -= 1;
        particle.alpha = particle.lifetime / particle.maxLifetime;
        if (particle.lifetime <= 0) {
            effectsContainer.removeChild(particle);
            particles.splice(i, 1);
            i--;
        }
    }

    if (playerInvincible && player.alpha === 0) return;

    playerVelocity.y += config.gravity;
    if (playerVelocity.y > config.maxFallSpeed) {
        playerVelocity.y = config.maxFallSpeed;
    }

    playerVelocity.x = 0;
    if (keys["ArrowLeft"]) {
        playerVelocity.x = -config.playerSpeed;
    }
    if (keys["ArrowRight"]) {
        playerVelocity.x = config.playerSpeed;
    }

    player.x += playerVelocity.x;
    player.y += playerVelocity.y;

    if (player.x < 0) {
        player.x = 0;
    } else if (player.x > config.width - player.width) {
        player.x = config.width - player.width;
    }

    onGround = false;

    for (let i = 0; i < platforms.length; i++) {
        const platform = platforms[i];
        if (playerVelocity.y > 0 &&
            player.y + player.height >= platform.y &&
            player.y + player.height <= platform.y + platform.height &&
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width) {
            player.y = platform.y - player.height;
            playerVelocity.y = 0;
            onGround = true;
            isJumping = false;
        }
    }

    if (keys["ArrowUp"] && !isJumping && onGround) {
        playerVelocity.y = -config.jumpForce;
        isJumping = true;
        playSound('jump');
    }

    if (player.y > config.height) {
        lives--;
        updateUI();
        if (lives <= 0) {
            gameOver();
        } else {
            deathEffect();
            resetPlayerPosition();
            playSound('death');
        }
    }

    if (playerInvincible) return;

    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (!enemy || !enemy.platform) continue;

        enemy.x += enemy.speed * enemy.direction;

        if (enemy.x <= enemy.platform.x) {
            enemy.x = enemy.platform.x;
            enemy.direction = 1;
        } else if (enemy.x + enemy.width >= enemy.platform.x + enemy.platform.width) {
            enemy.x = enemy.platform.x + enemy.platform.width - enemy.width;
            enemy.direction = -1;
        }

        enemy.y = enemy.platform.y - enemy.height;

        if (checkCollision(player, enemy)) {
            if (playerVelocity.y > 0 && player.y < enemy.y) {
                enemyDefeatEffect(enemy.x + enemy.width/2, enemy.y);
                gameContainer.removeChild(enemy);
                enemies.splice(i, 1);
                i--;
                playerVelocity.y = -config.jumpForce * 0.6;
                score += 20;
                updateUI();
                playSound('defeat');
            } else {
                lives--;
                updateUI();
                if (lives <= 0) {
                    gameOver();
                } else {
                    deathEffect();
                    resetPlayerPosition();
                    playSound('death');
                }
            }
        }
    }

    for (let i = 0; i < coins.length; i++) {
        if (checkCollision(player, coins[i])) {
            coinEffect(coins[i].x, coins[i].y);
            gameContainer.removeChild(coins[i]);
            coins.splice(i, 1);
            i--;
            score += 10;
            updateUI();
            playSound('coin');
            if (coins.length === 0) {
                nextLevel();
            }
        }
    }
});

resetLevel();
showMessage("LEVEL 1", 2000);

document.addEventListener('click', function resumeAudio() {
    if (setupAudio()) {
        if (audioCtx.state === 'suspended') {
                audioCtx.resume().then(() => {
                    if (!isMuted) {
                        startBgMusic();
                    }
                });
            } else if (!isMuted) {
                startBgMusic();
            }
        }
        document.removeEventListener('click', resumeAudio);
    }, { once: true });
});

