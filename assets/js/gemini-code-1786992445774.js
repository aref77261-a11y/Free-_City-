// 1. كائن إدارة الموارد الأساسية (GameState)
const gameState = {
    turn: 1,
    resources: {
        money: 5000,    // 💰 المال
        energy: 50,     // ⚡ الطاقة
        water: 50,      // 💧 المياه
        food: 50,       // 🍞 الغذاء
        population: 100,// 👥 السكان
        happiness: 80,  // 😊 السعادة
        sustainability: 50 // 🌱 الاستدامة
    },
    gridSize: 10, // شبكة 10×10 للهاتف
    grid: Array(10).fill(null).map(() => Array(10).fill(null)) // مصفوفة خلايا المدينة
};

// 2. هيكل البيانات للمباني المتاحة
const buildingsData = {
    residential: { name: "منزل سكنى", cost: 500, effect: { population: 10, water: -2, food: -2 } },
    industrial:  { name: "مصنع", cost: 1000, effect: { money: 200, energy: -10, sustainability: -5 } },
    commercial:  { name: "متجر تجاري", cost: 800, effect: { money: 300, energy: -5 } },
    service:     { name: "مستشفى", cost: 1500, effect: { happiness: 10, water: -5 } },
    energy:      { name: "محطة طاقة", cost: 2000, effect: { energy: 50, sustainability: -10 } },
    eco:         { name: "حديقة عامة", cost: 300, effect: { happiness: 5, sustainability: 10 } }
};

// 3. دالة بناء عنصر في الشبكة (منطق اللعبة)
function buildOnCell(row, col, buildingType) {
    const building = buildingsData[buildingType];
    
    if (!building) return { success: false, message: "نوع المبنى غير معروف" };
    
    // التحقق من توفر المال الكافي
    if (gameState.resources.money < building.cost) {
        return { success: false, message: "رصيد المال غير كافٍ للبناء!" };
    }
    
    // تنفيذ خصم التكلفة وتحديث الحالة
    gameState.resources.money -= building.cost;
    gameState.grid[row][col] = buildingType;
    
    // تطبيق التأثيرات المباشرة للمبنى
    for (let res in building.effect) {
        if (gameState.resources[res] !== undefined) {
            gameState.resources[res] += building.effect[res];
        }
    }
    
    saveGameProgress(); // حفظ تلقائي
    updateUIElements();
    return { success: true, message: `تم بنجاح بناء ${building.name}` };
}

// 4. نظام الدورات الزمنية (Turn Execution Engine)
function nextTurn() {
    gameState.turn++;
    
    // حساب الدخل التلقائي بناءً على المصانع والمتاجر والسكان
    let incomeFromIndustry = (gameState.grid.flat().filter(b => b === 'industrial').length) * 150;
    let foodConsump = gameState.resources.population * 0.5;
    
    gameState.resources.money += incomeFromIndustry;
    gameState.resources.food -= foodConsump;
    
    // فحص شروط البقاء
    if (gameState.resources.food < 0 || gameState.resources.water < 0) {
        gameState.resources.happiness -= 5;
        triggerAlert("تحذير: نقص حاد في الموارد الأساسية يهدد استقرار السكان!");
    }
    
    saveGameProgress();
    updateUIElements(); // تحديث الواجهة الرسومية
}

// تحديث واجهة المستخدم (DOM)
function updateUIElements() {
    document.getElementById('money-val').innerText = gameState.resources.money;
    document.getElementById('energy-val').innerText = gameState.resources.energy;
    document.getElementById('water-val').innerText = gameState.resources.water;
    document.getElementById('pop-val').innerText = gameState.resources.population;
    document.getElementById('turn-val').innerText = gameState.turn;
}

// 5. نظام الحفظ التلقائي المحلي (LocalStorage)
function saveGameProgress() {
    localStorage.setItem('FreeCityGameSave', JSON.stringify(gameState));
}

function loadGameProgress() {
    const saved = localStorage.getItem('FreeCityGameSave');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(gameState, parsed);
        updateUIElements();
        return true;
    }
    return false;
}

function triggerAlert(msg) {
    console.warn(`[سجل الأحداث]: ${msg}`);
}

// تحميل اللعبة عند فتح الصفحة
window.onload = function() {
    loadGameProgress();
    updateUIElements();
};
