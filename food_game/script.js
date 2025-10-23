document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const screens = {
        login: document.getElementById('login-screen'),
        game: document.getElementById('game-screen'),
        scoreboard: document.getElementById('scoreboard-screen'),
    };
    const loginButton = document.getElementById('login-button');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const player = document.getElementById('player');
    const gameMap = document.getElementById('game-map');
    const controls = {
        up: document.getElementById('btn-up'),
        down: document.getElementById('btn-down'),
        left: document.getElementById('btn-left'),
        right: document.getElementById('btn-right'),
    };
    const scoreDisplays = {
        playerName: document.getElementById('player-name'),
        health: document.getElementById('health-score'),
        fake: document.getElementById('fake-score'),
        final: document.getElementById('final-score'),
    };
    const storeModal = document.getElementById('store-modal');
    const storeNameEl = document.getElementById('store-name');
    const itemListEl = document.getElementById('item-list');
    const closeModalButton = document.getElementById('close-modal-button');
    
    const explanationModal = document.getElementById('explanation-modal');
    const explanationTitle = document.getElementById('explanation-title');
    const explanationImg = document.getElementById('explanation-img');
    const explanationText = document.getElementById('explanation-text');
    const closeExplanationButton = document.getElementById('close-explanation-button');

    const scoreboardList = document.getElementById('scoreboard-list');
    const playAgainButton = document.getElementById('play-again-button');

    // --- Game State ---
    let currentUser = null;
    let playerPos = { x: 277, y: 631 };
    let scores = { health: 0, fake: 0 };
    let gameData = {};
    let visitedStores = new Set();
    let totalStores = Object.keys(CONFIG.STORE_LOCATIONS).length;

    // --- Data Loading ---
    async function loadGameData() {
        const categories = Object.keys(CONFIG.STORE_LOCATIONS);
        // Also load the sieu_thi_mini data even if it's not on the map
        categories.push('sieu_thi_mini'); 
        
        for (const category of categories) {
            try {
                const response = await fetch(`assets/data/db_${category}.json`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                gameData[category] = await response.json();
            } catch (error) {
                console.error(`Could not load game data for ${category}:`, error);
                alert(`Lỗi: Không thể tải dữ liệu game cho danh mục ${category}. Vui lòng làm mới trang.`);
            }
        }
        console.log("Game data loaded:", gameData);
    }

    // --- Screen Management ---
    function showScreen(screenName) {
        Object.values(screens).forEach(screen => screen.classList.remove('active'));
        screens[screenName].classList.add('active');
    }

    // --- Login Logic ---
    function handleLogin() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            alert('Vui lòng nhập tên và mật khẩu.');
            return;
        }

        const users = JSON.parse(localStorage.getItem('game_users')) || {};
        if (users[username]) {
            // User exists, check password
            if (users[username].password !== password) {
                alert('Sai mật khẩu!');
                return;
            }
        } else {
            // New user, create account
            users[username] = { password: password, highScore: 0 };
            localStorage.setItem('game_users', JSON.stringify(users));
        }
        
        currentUser = username;
        startGame();
    }

    // --- Game Initialization ---
    function startGame() {
        // Reset state
        scores = { health: 0, fake: 0 };
        visitedStores.clear();
        updateScoreDisplay();
        scoreDisplays.playerName.textContent = currentUser;

        // Set initial player position from config
        const mapRect = gameMap.getBoundingClientRect();
        const scale = 1;
        playerPos = { 
            x: CONFIG.PLAYER_START.x * scale, 
            y: CONFIG.PLAYER_START.y * scale 
        };
        updatePlayerPosition();
        
        showScreen('game');
    }

    // --- Player Movement ---
    function updatePlayerPosition() {
        player.style.left = `${playerPos.x}px`;
        player.style.top = `${playerPos.y}px`;
    }

    function movePlayer(dx, dy) {
        const mapRect = gameMap.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();

        let newX = playerPos.x + dx;
        let newY = playerPos.y + dy;

        // Boundary checks
        if (newX < playerRect.width / 2) newX = playerRect.width / 2;
        if (newX > mapRect.width - playerRect.width / 2) newX = mapRect.width - playerRect.width / 2;
        if (newY < playerRect.height / 2) newY = playerRect.height / 2;
        if (newY > mapRect.height - playerRect.height / 2) newY = mapRect.height - playerRect.height / 2;

        playerPos.x = newX;
        playerPos.y = newY;

        updatePlayerPosition();
        checkCollision();
    }

    // --- Collision & Store Logic ---
    function checkCollision() {
        const mapRect = gameMap.getBoundingClientRect();
        const scale = mapRect.width / CONFIG.MAP_ORIGINAL_WIDTH;

        for (const storeKey in CONFIG.STORE_LOCATIONS) {
            if (visitedStores.has(storeKey)) continue;

            const store = CONFIG.STORE_LOCATIONS[storeKey];
            const storeRect = {
                left: store.x1 * scale,
                top: store.y1 * scale,
                right: store.x2 * scale,
                bottom: store.y2 * scale,
            };

            if (
                playerPos.x > storeRect.left &&
                playerPos.x < storeRect.right &&
                playerPos.y > storeRect.top &&
                playerPos.y < storeRect.bottom
            ) {
                openStoreModal(storeKey);
                break;
            }
        }
    }

    function openStoreModal(storeKey) {
        const store = CONFIG.STORE_LOCATIONS[storeKey];
        let items = [];

        if (storeKey === 'cua_hang_tien_loi') {
            items = (gameData['cua_hang_tien_loi'] || []).concat(gameData['sieu_thi_mini'] || []);
        } else {
            items = gameData[storeKey] || [];
        }
        
        storeNameEl.textContent = store.name;
        itemListEl.innerHTML = ''; // Clear previous items

        if (!items) {
            itemListEl.innerHTML = '<p>Không có vật phẩm nào ở đây.</p>';
            storeModal.classList.add('active');
            return;
        }

        items.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            itemCard.innerHTML = `
                <img src="${item.image_path}" alt="${item.generic_name}">
                <p>${item.generic_name}</p>
            `;
            itemCard.addEventListener('click', () => handleItemClick(item), { once: true });
            itemListEl.appendChild(itemCard);
        });

        storeModal.classList.add('active');
    }
    
    function handleItemClick(item) {
        // Calculate score
        const isFood = 'diem_suc_khoe' in item;
        const scoreValue = item.diem_suc_khoe || item.diem_hang_gia;

        if (isFood) {
            scores.health += scoreValue;
        } else {
            scores.fake += scoreValue;
        }
        updateScoreDisplay();

        // Show explanation
        explanationTitle.textContent = item.generic_name;
        explanationImg.src = item.image_path;
        explanationText.textContent = `${item.explanation} (${item.label === 1 ? 'An toàn' : 'Không an toàn'})`;
        explanationModal.classList.add('active');
    }

    function closeStoreModal() {
        const currentStoreKey = Object.keys(CONFIG.STORE_LOCATIONS).find(key => 
            CONFIG.STORE_LOCATIONS[key].name === storeNameEl.textContent
        );
        if (currentStoreKey) {
            visitedStores.add(currentStoreKey);
        }
        storeModal.classList.remove('active');

        if (visitedStores.size >= totalStores) {
            endGame();
        }
    }

    // --- Score & End Game ---
    function updateScoreDisplay() {
        scoreDisplays.health.textContent = scores.health.toFixed(2);
        scoreDisplays.fake.textContent = scores.fake.toFixed(2);
    }

    function endGame() {
        const finalScore = scores.health - scores.fake;
        scoreDisplays.final.textContent = finalScore.toFixed(2);

        // Update high score
        const users = JSON.parse(localStorage.getItem('game_users')) || {};
        if (users[currentUser] && finalScore > users[currentUser].highScore) {
            users[currentUser].highScore = finalScore;
            localStorage.setItem('game_users', JSON.stringify(users));
        }

        // Display scoreboard
        const allUsers = Object.entries(users).map(([name, data]) => ({ name, score: data.highScore }));
        allUsers.sort((a, b) => b.score - a.score);
        
        scoreboardList.innerHTML = '';
        allUsers.slice(0, 10).forEach(user => {
            const li = document.createElement('li');
            li.textContent = `${user.name}: ${user.score.toFixed(2)}`;
            scoreboardList.appendChild(li);
        });

        showScreen('scoreboard');
    }

    // --- Event Listeners ---
    loginButton.addEventListener('click', handleLogin);
    controls.up.addEventListener('click', () => movePlayer(0, -CONFIG.PLAYER_SPEED));
    controls.down.addEventListener('click', () => movePlayer(0, CONFIG.PLAYER_SPEED));
    controls.left.addEventListener('click', () => movePlayer(-CONFIG.PLAYER_SPEED, 0));
    controls.right.addEventListener('click', () => movePlayer(CONFIG.PLAYER_SPEED, 0));
    
    window.addEventListener('keydown', (e) => {
        if (screens.game.classList.contains('active')) {
            switch (e.key) {
                case 'ArrowUp':
                    movePlayer(0, -CONFIG.PLAYER_SPEED);
                    break;
                case 'ArrowDown':
                    movePlayer(0, CONFIG.PLAYER_SPEED);
                    break;
                case 'ArrowLeft':
                    movePlayer(-CONFIG.PLAYER_SPEED, 0);
                    break;
                case 'ArrowRight':
                    movePlayer(CONFIG.PLAYER_SPEED, 0);
                    break;
            }
        }
    });

    closeModalButton.addEventListener('click', closeStoreModal);
    closeExplanationButton.addEventListener('click', () => explanationModal.classList.remove('active'));
    playAgainButton.addEventListener('click', () => {
        usernameInput.value = '';
        passwordInput.value = '';
        showScreen('login');
    });

    // --- Initial Load ---
    loadGameData();
});
