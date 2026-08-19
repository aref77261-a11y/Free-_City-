// ========== Game State ==========
const GRID_SIZE = 5; // 5x5 grid
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

let gameState = {
    resources: {
        money: 1000,
        energy: 100,
        water: 100,
        food: 100,
        population: 0,
        happiness: 50,
        sustainability: 50
    },
    grid: [], // Array of building IDs or null
    selectedCell: null
};

// ========== Building Definitions ==========
const BUILDINGS = {
    house: {
        id: 'house',
        name: 'منزل سكني',
        icon: '🏠',
        desc: 'يزيد السكان',
        cost: { money: 200 },
        effect: { population: 5, happiness: 2 },
        upkeep: { energy: 2, water: 2, food: 1 }
    },
    factory: {
        id: 'factory',
        name: 'مصنع',
        icon: '🏭',
        desc: 'يزيد الدخل',
        cost: { money: 500, energy: 20 },
        effect: { money: 50 },
        upkeep: { energy: 5, water: 3, sustainability: -3 }
    },
    shop: {
        id: 'shop',
        name: 'متجر تجاري',
        icon: '🏪',
        desc: 'دخل إضافي',
        cost: { money: 300 },
        effect: { money: 20, happiness: 3 },
        upkeep: { energy: 2, water: 1 }
    },
    hospital: {
        id: 'hospital',
        name: 'مستشفى',
        icon: '🏥',
        desc: 'يزيد السعادة',
        cost: { money: 800, energy: 30 },
        effect: { happiness: 10, population: 2 },
        upkeep: { energy: 8, water: 5, money: -10 }
    },
    power: {
        id: 'power',
        name: 'محطة طاقة',
        icon: '⚡',
        desc: 'يزيد الطاقة',
        cost: { money: 600 },
        effect: { energy: 50 },
        upkeep: { money: -15, sustainability: -5 }
    },
    park: {
        id: 'park',
        name: 'حديقة عامة',
        icon: '🌳',
        desc: 'استدامة وسعادة',
        cost: { money: 150 },
        effect: { sustainability: 8, happiness: 5 },
        upkeep: { water: 2 }
    }
};

// ========== localStorage Helpers ==========
function saveGame() {
    try {
        const data = JSON.stringify(gameState);
        localStorage.setItem('freeCity_save', data);
    } catch (e) {
        showToast('⚠️ تعذر حفظ اللعبة', 'error');
    }
}

function loadGame() {
    try {
        const data = localStorage.getItem('freeCity_save');
        if (data) {
            const parsed = JSON.parse(data);
            // Validate structure
            if (parsed && parsed.resources && Array.isArray(parsed.grid)) {
                gameState = parsed;
                return true;
            }
        }
    } catch (e) {
        console.warn('Failed to load save:', e);
    }
    return false;
}

function resetGame() {
    gameState = {
        resources: { money: 1000, energy: 100, water: 100, food: 100, population: 0, happiness: 50, sustainability: 50 },
        grid: new Array(TOTAL_CELLS).fill(null),
        selectedCell: null
    };
    saveGame();
}

// ========== Toast Notifications ==========
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== Resource Management ==========
function updateResourceDisplay() {
    const res = gameState.resources;
    document.getElementById('res-money').textContent = Math.floor(res.money);
    document.getElementById('res-energy').textContent = Math.floor(res.energy);
    document.getElementById('res-water').textContent = Math.floor(res.water);
    document.getElementById('res-food').textContent = Math.floor(res.food);
    document.getElementById('res-population').textContent = Math.floor(res.population);
    document.getElementById('res-happiness').textContent = Math.floor(res.happiness);
    document.getElementById('res-sustainability').textContent = Math.floor(res.sustainability);
}

function canAfford(costs) {
    for (const [key, value] of Object.entries(costs)) {
        if (gameState.resources[key] < value) return false;
    }
    return true;
}

function deductResources(costs) {
    for (const [key, value] of Object.entries(costs)) {
        gameState.resources[key] -= value;
    }
}

function addResources(effects) {
    for (const [key, value] of Object.entries(effects)) {
        gameState.resources[key] += value;
    }
    // Clamp values
    gameState.resources.happiness = Math.max(0, Math.min(100, gameState.resources.happiness));
    gameState.resources.sustainability = Math.max(0, Math.min(100, gameState.resources.sustainability));
}

// ========== Grid Management ==========
function initGrid() {
    const gridEl = document.getElementById('city-grid');
    gridEl.innerHTML = '';
    for (let i = 0; i < TOTAL_CELLS; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell empty';
        cell.dataset.index = i;
        cell.addEventListener('click', () => onCellClick(i));
        gridEl.appendChild(cell);
    }
    renderGrid();
}

function renderGrid() {
    const cells = document.querySelectorAll('.grid-cell');
    gameState.grid.forEach((buildingId, index) => {
        const cell = cells[index];
        cell.className = 'grid-cell';
        cell.innerHTML = '';
        
        if (buildingId && BUILDINGS[buildingId]) {
            const b = BUILDINGS[buildingId];
            cell.classList.add(`building-${buildingId}`);
            cell.innerHTML = `
                <span class="building-icon">${b.icon}</span>
                <span class="building-name">${b.name}</span>
            `;
        } else {
            cell.classList.add('empty');
        }
    });
}

function onCellClick(index) {
    if (gameState.grid[index]) {
        showToast('📍 هذه الخلية تحتوي على مبنى بالفعل', 'info');
        return;
    }
    gameState.selectedCell = index;
    openBuildingModal();
}

// ========== Building Modal ==========
function openBuildingModal() {
    const modal = document.getElementById('building-modal');
    const list = document.getElementById('building-list');
    list.innerHTML = '';
    
    Object.values(BUILDINGS).forEach(b => {
        const canBuild = canAfford(b.cost);
        const card = document.createElement('div');
        card.className = `building-card ${canBuild ? '' : 'disabled'}`;
        
        const costText = Object.entries(b.cost)
            .map(([k, v]) => `${getResourceIcon(k)} ${v}`)
            .join(' ');
        
        card.innerHTML = `
            <div class="card-icon">${b.icon}</div>
            <div class="card-info">
                <div class="card-name">${b.name}</div>
                <div class="card-desc">${b.desc}</div>
            </div>
            <div class="card-cost">${costText}</div>
        `;
        
        if (canBuild) {
            card.addEventListener('click', () => buildBuilding(b.id));
        }
        
        list.appendChild(card);
    });
    
    modal.classList.remove('hidden');
}

function closeBuildingModal() {
    document.getElementById('building-modal').classList.add('hidden');
    gameState.selectedCell = null;
}

function getResourceIcon(type) {
    const icons = { money: '💰', energy: '⚡', water: '💧', food: '🍞', population: '👥', happiness: '😊', sustainability: '🌱' };
    return icons[type] || type;
}

// ========== Build Logic ==========
function buildBuilding(buildingId) {
    const cellIndex = gameState.selectedCell;
    if (cellIndex === null || cellIndex === undefined) return;
    
    const building = BUILDINGS[buildingId];
    if (!building) return;
    
    if (!canAfford(building.cost)) {
        showToast('❌ الموارد غير كافية!', 'error');
        return;
    }
    
    deductResources(building.cost);
    gameState.grid[cellIndex] = buildingId;
    addResources(building.effect);
    
    renderGrid();
    updateResourceDisplay();
    saveGame();
    closeBuildingModal();
    
    showToast(`✅ تم بناء ${building.name} بنجاح!`, 'success');
}

// ========== Game Loop (Upkeep & Income) ==========
let tickCount = 0;
function gameTick() {
    tickCount++;
    let income = 0;
    let energyUse = 0;
    let waterUse = 0;
    let foodUse = 0;
    
    gameState.grid.forEach(bId => {
        if (!bId || !BUILDINGS[bId]) return;
        const b = BUILDINGS[bId];
        
        // Income
        if (b.effect.money) income += b.effect.money;
        if (b.upkeep.money) income += b.upkeep.money; // negative = cost
        
        // Upkeep costs
        if (b.upkeep.energy) energyUse += b.upkeep.energy;
        if (b.upkeep.water) waterUse += b.upkeep.water;
        if (b.upkeep.food) foodUse += b.upkeep.food;
    });
    
    // Population consumes food
    const popFood = Math.ceil(gameState.resources.population * 0.2);
    foodUse += popFood;
    
    // Apply
    gameState.resources.money += income;
    gameState.resources.energy -= energyUse;
    gameState.resources.water -= waterUse;
    gameState.resources.food -= foodUse;
    
    // Clamp minimums
    if (gameState.resources.energy < 0) gameState.resources.energy = 0;
    if (gameState.resources.water < 0) gameState.resources.water = 0;
    if (gameState.resources.food < 0) gameState.resources.food = 0;
    
    // Happiness effects
    if (gameState.resources.food < 10) gameState.resources.happiness -= 2;
    if (gameState.resources.energy < 10) gameState.resources.happiness -= 1;
    if (gameState.resources.water < 10) gameState.resources.happiness -= 1;
    if (income > 0) gameState.resources.happiness += 0.5;
    
    gameState.resources.happiness = Math.max(0, Math.min(100, gameState.resources.happiness));
    gameState.resources.sustainability = Math.max(0, Math.min(100, gameState.resources.sustainability));
    
    updateResourceDisplay();
    
    // Warnings every 5 ticks
    if (tickCount % 5 === 0) {
        if (gameState.resources.food < 20) showToast('⚠️ الطعام ينفذ!', 'error');
        if (gameState.resources.energy < 20) showToast('⚠️ الطاقة منخفضة!', 'error');
        if (gameState.resources.water < 20) showToast('⚠️ الماء ينفد!', 'error');
    }
    
    saveGame();
}

// ========== Modal Close on Overlay Click ==========
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeBuildingModal();
    }
});

// ========== Keyboard Support ==========
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBuildingModal();
});

// ========== Initialization ==========
function initGame() {
    if (!loadGame()) {
        resetGame();
    }
    initGrid();
    updateResourceDisplay();
    
    // Game tick every 3 seconds
    setInterval(gameTick, 3000);
    
    showToast('🎮 مرحباً بك في المدينة الحرة!', 'success');
}

// Start when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
