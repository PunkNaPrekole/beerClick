const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 800,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
        antialias: true,
        roundPixels: true,
    },
    scene: {
        preload: preload,
        create: create,
        update: updateProgressBar,
    },
};

const achievements = [
    { id: 1, name: "заядлый игрок", description: "Достигните 2 уровня", condition: () => level >= 2, reward: 50, unlocked: false },
    { id: 2, name: "100 Beercoins", description: "Накопите 100 Beercoins", condition: () => beercoins >= 100, reward: 50, unlocked: false },
    { id: 2, name: "x2 множитель", description: "получите множитель x2", condition: () => multiplier >= 2, reward: 50, unlocked: false },
    { id: 1, name: "Общажный геймдев", description: "Начните писать игру про пиво", condition: () => beercoins >= 123, reward: 1, unlocked: false },
    // другие ачивки...
];

const game = new Phaser.Game(config);

let beercoins = 0;
let beercoinsPerTap = 1;
let dailyBeercoins = 0;
let nextLevelCost = 100;
let level = 1;
let multiplier = 1;
let lastTapTime = Date.now();
let totalTapTime = 0;
let shopContainer;
let currentBackgroundSkin = 'default';
let currentCanSkin = 'defaultCan';

// Скины
const skins = {
    backgrounds: [
        { id: 'default', image: 'stairs.png', price: 0 },
        { id: 'shit room', image: 'shitRoom.png', price: 100 },
        { id: 'stairs', image: 'stairs.png', price: 200 },
    ],
    cans: [
        { id: 'defaultCan', image: 'duB.png', price: 0 },
        { id: 'el papito', image: 'el papito.png', price: 150 },
        { id: 'dub 99', image: 'duB 99.png', price: 100 },
        { id: 'varona', image: 'Varona.png', price: 100 },
        { id: 'dub might', image: 'DUB MIGHT.png', price: 100 },
    ],
};

const collectibleCaps = [
    { id: 1, image: 'redCap.png', name: 'Rare Cap', rarity: 'rare' },
    { id: 2, image: 'blueCap.png', name: 'Epic Cap', rarity: 'epic' },
    { id: 3, image: 'greenCap.png', name: 'Legendary Cap', rarity: 'legendary' },
    // Добавьте другие крышки
];


function preload() {
    this.load.image('beercoinIcon', 'beerCoin.png');
    this.load.audio('clickSound', 'click-sound.mp3');
    this.load.audio('menuSound', 'menu-sound.mp3');
    this.load.audio('capSound', 'capSound.mp3');
    this.load.audio('lvlUpSound', 'lvlUp.mp3');

    // Загрузка всех скинов
    skins.backgrounds.concat(skins.cans).forEach((skin) => {
        this.load.image(skin.id, skin.image);
    });
    collectibleCaps.forEach(cap => {
            const imageKey = cap.image
            this.load.image(imageKey, `${cap.image}`);
        });
}

function create() {
    // Фон
    this.background = this.add.image(200, 400, currentBackgroundSkin).setOrigin(0.5, 0.5).setDisplaySize(400, 600);
    this.background.setScale(0.15);

    this.clickSound = this.sound.add('clickSound');
    this.menuSound = this.sound.add('menuSound');
    this.capSound = this.sound.add('capSound');
    this.lvlUpSound = this.sound.add('lvlUpSound');

    // Блоки информации;
    this.perTapText = this.add.text(10, 20, `Прибыль за тап:\n${beercoinsPerTap}`, { font: '16px Pangolin', fill: '#FFF', align: 'center'
    });
    this.nextLevelCostText = this.add.text(150, 20, `Монет для апа:\n${nextLevelCost}`, { font: '16px Pangolin', fill: '#FFF', align: 'center' });
    this.dailyBeercoinsText = this.add.text(280, 20, `Монет за день:\n${dailyBeercoins}`, { font: '16px Pangolin', fill: '#FFF', align: 'center' });

    // Иконка beercoin
    this.beercoinIcon = this.add.image(30, 70, 'beercoinIcon').setOrigin(0.5, 0.5).setDisplaySize(35, 35);
    this.beercoinsCountText = this.add.text(70, 65, `Beercoins: ${beercoins}`, {
        font: '16px Pangolin',
        fill: '#FFF'
    });
    this.levelUpButtonBackground = this.add.graphics();
    this.levelUpButtonBackground.fillStyle(0xFFC700, 1);  // Цвет фона кнопки
    this.levelUpButtonBackground.fillRoundedRect(295, 60, 85, 30, 8);  // Позиция, размеры и радиус скругления
    this.levelUpButtonBackground.lineStyle(2, 0xFFAA5C);  // Цвет и толщина обводки
    this.levelUpButtonBackground.strokeRoundedRect(295, 60, 85, 30, 8);  // Применение обводки

    // Текст кнопки поверх фона
    this.levelUpButton = this.add.text(305, 66, 'Level up', {
        font: '16px Pangolin',
        fill: '#000',
        align: 'center'
    }).setInteractive()
    .on('pointerdown', () => levelUp.call(this));

    // Убедимся, что текст всегда поверх фона
    this.levelUpButton.setDepth(1);


    // Прогресс-бар
    this.progressBarBase = this.add.graphics();
    this.progressBar = this.add.graphics();
    this.progressBarBase.fillStyle(0xFFFFFF, 0.5);
    this.progressBarBase.fillRoundedRect(30, 100, 340, 20, 8);
    updateProgressBar.call(this);

    this.currentLevelText = this.add.text(10, 102, `${level}`, { font: '16px Pangolin', fill: '#000' });
    this.nextLevelText = this.add.text(380, 102, `${level + 1}`, { font: '16px Pangolin', fill: '#000' });
    this.multiplierText = this.add.text(10, 670, `Множитель: x${multiplier}`, { font: '18px Pangolin', fill: '#000' });
    this.time.addEvent({ delay: 1000, callback: checkMultiplierIncrease, callbackScope: this, loop: true });

    // Банка
    this.can = this.add.sprite(200, 400, currentCanSkin).setInteractive();
    this.can.setScale(0.15);
    this.can.on('pointerdown', (pointer) => {
        // Получаем локальные координаты нажатия относительно спрайта
        const localPoint = this.can.getLocalPoint(pointer.x, pointer.y);

        // Вызываем функцию collectBeercoin с координатами нажатия
        collectBeercoin.call(this, localPoint.x, localPoint.y);
        tryDropCollectibleCap.call(this);
        this.clickSound.play();
    });


    createBottomMenu.call(this);
}

function updateProgressBar() {
    const progress = Phaser.Math.Clamp(beercoins / nextLevelCost, 0, 1);
    this.progressBar.clear();
    this.progressBar.fillStyle(0xFFC700, 1);
    this.progressBar.fillRoundedRect(32, 102, (340 - 12) * progress + 12, 16, 8);
}

function collectBeercoin(x, y) {
    const currentTime = Date.now();
    if (currentTime - lastTapTime > 3000) {
        totalTapTime = 0;
        multiplier = 1;
        this.multiplierText.setText(`Множитель: x${multiplier}`);
    } else {
        totalTapTime += currentTime - lastTapTime;
    }
    lastTapTime = currentTime;
    const gainedCoins = beercoinsPerTap * multiplier;
    beercoins += gainedCoins;
    dailyBeercoins += gainedCoins;
    this.dailyBeercoinsText.setText(`Монет за день:\n${dailyBeercoins}`);
    this.beercoinsCountText.setText(`Beercoins: ${beercoins}`);
    createParticle.call(this, x* 0.3, y * 0.18, gainedCoins);
    updateProgressBar.call(this);
    checkAchievements.call(this);

}

function checkMultiplierIncrease() {
    if (totalTapTime >= multiplier * 10 * 1000) {
        multiplier++;
        totalTapTime = 0;
        this.multiplierText.setText(`Множитель: x${multiplier}`);
        checkAchievements.call(this);
    }
}

function levelUp() {
    if (beercoins >= nextLevelCost){
        this.lvlUpSound.play();
        beercoins -= nextLevelCost;
        level++;
        beercoinsPerTap++;
        nextLevelCost = Math.floor(nextLevelCost * 1.5);
        updateProgressBar.call(this);
        this.currentLevelText.setText(`${level}`);
        this.nextLevelText.setText(`${level + 1}`);
        this.perTapText.setText(`Прибыль за тап:\n${beercoinsPerTap}`);
        this.nextLevelCostText.setText(`Монет для апа:\n${nextLevelCost}`);
    } else {
        createParticle.call(this, 175, 125, "no coins");
    }
    this.beercoinsCountText.setText(`Beercoins: ${beercoins}`);
    checkAchievements.call(this);
}

function hideMainUI() {
    this.perTapText.visible = false;
    this.nextLevelCostText.visible = false;
    this.dailyBeercoinsText.visible = false;
    this.beercoinIcon.visible = false;
    this.beercoinsCountText.visible = false;
    this.progressBarBase.visible = false;
    this.progressBar.visible = false;
    this.currentLevelText.visible = false;
    this.nextLevelText.visible = false;
    this.multiplierText.visible = false;
    this.can.visible = false;
    this.levelUpButton.visible = false;
    this.levelUpButtonBackground.visible = false;
}

function showMainUI() {
    this.perTapText.visible = true;
    this.nextLevelCostText.visible = true;
    this.dailyBeercoinsText.visible = true;
    this.beercoinIcon.visible = true;
    this.beercoinsCountText.visible = true;
    this.progressBarBase.visible = true;
    this.progressBar.visible = true;
    this.currentLevelText.visible = true;
    this.nextLevelText.visible = true;
    this.multiplierText.visible = true;
    this.can.visible = true;
    this.levelUpButton.visible = true;
    this.levelUpButtonBackground.visible = true;

}

function openShop() {
    hideMainUI.call(this);
    if (shopContainer) shopContainer.destroy(true);
    shopContainer = this.add.container(0, 0);

    const shopBackground = this.add.graphics();
    shopBackground.fillStyle(0x000000, 0.7);
    shopBackground.fillRect(0, 0, 400, 600);

    shopContainer.add(shopBackground);
    shopContainer.add(this.add.text(10, 150, 'Скины фона:', { fontSize: '16px', fill: '#FFFFFF' }));

    // Кнопки для смены скинов фона с границами
    skins.backgrounds.forEach((background, index) => {
        const buttonY = 180 + index * 50;

        // Создание фона кнопки
        const buttonBackground = this.add.graphics();
        buttonBackground.fillStyle(0xAAAAAA, 1);
        buttonBackground.fillRoundedRect(10, buttonY, 180, 40, 10);

        // Создание текста кнопки
        const backgroundText = this.add.text(20, buttonY + 10, `${background.id} - Цена: ${background.price}`,
                                             { fontSize: '14px', fill: '#000' });

        // Группируем фон и текст кнопки в контейнер
        const buttonContainer = this.add.container(0, 0, [buttonBackground, backgroundText]);
        buttonContainer.setSize(180, 40);
        buttonContainer.setInteractive(new Phaser.Geom.Rectangle(10, buttonY, 180, 40), Phaser.Geom.Rectangle.Contains);

        // Событие при нажатии на кнопку
        buttonContainer.on('pointerdown', () => purchaseSkin.call(this, 'backgrounds', background.id));

        // Добавляем кнопку в контейнер магазина
        shopContainer.add(buttonContainer);
    });

    shopContainer.add(this.add.text(200, 150, 'Скины банки:', { fontSize: '16px', fill: '#FFFFFF' }));

    skins.cans.forEach((can, index) => {
        const buttonY = 180 + index * 50;

        // Создание фона кнопки
        const buttonBackground = this.add.graphics();
        buttonBackground.fillStyle(0xAAAAAA, 1);
        buttonBackground.fillRoundedRect(200, buttonY, 180, 40, 10);

        // Создание текста кнопки
        const canText = this.add.text(210, buttonY + 10, `${can.id} - Цена: ${can.price}`,
                                      { fontSize: '14px', fill: '#000' });

        // Группируем фон и текст кнопки в контейнер
        const buttonContainer = this.add.container(0, 0, [buttonBackground, canText]);
        buttonContainer.setSize(180, 40);
        buttonContainer.setInteractive(new Phaser.Geom.Rectangle(200, buttonY, 180, 40), Phaser.Geom.Rectangle.Contains);

        // Событие при нажатии на кнопку
        buttonContainer.on('pointerdown', () => purchaseSkin.call(this, 'cans', can.id));

        // Добавляем кнопку в контейнер магазина
        shopContainer.add(buttonContainer);
    });
}


function purchaseSkin(type, skinId) {
    // Проверяем, что type - это либо 'background', либо 'can'
    if (!skins[type]) {
        console.error(`Invalid type: ${type}`);
        return;
    }

    const selectedSkin = skins[type].find((skin) => skin.id === skinId);

    if (!selectedSkin) {
        console.error(`Skin with ID ${skinId} not found for type ${type}`);
        return;
    }

    if (beercoins >= selectedSkin.price) {
        beercoins -= selectedSkin.price;
        this.beercoinsCountText.setText(`Beercoins: ${beercoins}`);

        // Обновляем скин
        if (type === 'backgrounds') {
            this.background.setTexture(skinId);
            currentBackgroundSkin = skinId
        } else if (type === 'cans') {
            this.can.setTexture(skinId);
            currentCanSkin = skinId
        }
    } else {
        console.log('Недостаточно средств!');
    }
}
function createBottomMenu() {
    const menuY = 700;

    // Создаем фон меню
    const menuBackground = this.add.graphics();
    menuBackground.fillStyle(0x333333, 1);
    menuBackground.fillRect(0, menuY, 400, 100);

    // Опции меню
    const menuOptions = ['Кликер', 'Магазин', 'Крышки', 'Буст'];
    menuOptions.forEach((option, index) => {
        const buttonX = 10 + index * 100;

        // Создаем фон кнопки
        const buttonBackground = this.add.graphics();
        buttonBackground.fillStyle(0x555555, 1); // Цвет кнопки
        buttonBackground.fillRoundedRect(buttonX, menuY + 25, 80, 50, 10); // Позиция, ширина, высота, радиус скругления

        // Создаем текст
        const menuButtonText = this.add.text(buttonX + 40, menuY + 50, option, { fontSize: '16px', fill: '#FFFFFF' })
            .setOrigin(0.5, 0.5);

        // Делаем кликабельным именно фоновую кнопку
        const buttonArea = this.add.rectangle(buttonX + 40, menuY + 50, 80, 50, 0xffffff, 0); // Прямоугольник для интерактивности
        buttonArea.setInteractive()
            .on('pointerdown', () => navigateToSection.call(this, option));

        // Помещаем графику на тот же уровень, что и текст
        buttonBackground.setDepth(0);
        menuButtonText.setDepth(1);
    });
}


// Обработчик переключения разделов
function navigateToSection(section) {
    this.menuSound.play();
    if (section === 'Кликер') {
        showMainUI.call(this);
        if (shopContainer) shopContainer.destroy(true); // Закрываем магазин
    } else if (section === 'Магазин') {
        openShop.call(this);
    } else if (section === 'Крышки') {
        // Здесь добавим функционал для "Коллекции" позже
        console.log('Коллекции еще не реализованы');
    } else if (section === 'Буст') {
        // Здесь добавим функционал для "Донат" позже
        console.log('Донат еще не реализован');
    }
}

function createParticle(x, y, value) {
    let msg;
    let color;
    if (value == "no coins"){
        msg = value;
        color = '#FF0D0C';
    } else {
        msg = `+${value}`
        color = '#FFD700';
    }
    const particle = this.add.text(x, y, msg, {
                    fontSize: '18px',
                    fill: color,
                    fontStyle: 'bold'
                });
    // Задаем случайные направления движения частиц
    const velocityX = Phaser.Math.Between(-50, 50);
    const velocityY = Phaser.Math.Between(-100, -50);

    // Анимация частиц
    this.tweens.add({
        targets: particle,
        x: particle.x + velocityX,
        y: particle.y + velocityY,
        alpha: 0,
        duration: 1000,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy() // Удаляем частицу после анимации
    });
}

function checkAchievements() {
    achievements.forEach((achievement) => {
        if (!achievement.unlocked && achievement.condition()) {
            unlockAchievement.call(this, achievement);
        }
    });
}

// Функция разблокировки ачивки
function unlockAchievement(achievement) {
    achievement.unlocked = true;
    beercoins += achievement.reward; // Награда
    this.beercoinsCountText.setText(`Beercoins: ${beercoins}`);
    showAchievementPopup.call(this, achievement.name, achievement.reward); // Уведомление
    //saveAchievements(); // Сохранение прогресса
}

function showAchievementPopup(name, reward) {
    // Создаем графику для фона уведомления
    const popupBackground = this.add.graphics();
    popupBackground.fillStyle(0x333333, 0.8); // Цвет фона и его прозрачность
    const width = 250; // Ширина фона
    const height = 60; // Высота фона
    popupBackground.fillRoundedRect(0, 0, width, height, 10); // Прямоугольник с закругленными углами

    // Устанавливаем позицию фона в правом нижнем углу
    const padding = 20; // Отступ от края экрана
    const xPos = this.cameras.main.width - width - padding; // Позиция по оси X
    const yPos = this.cameras.main.height - height - padding - 100; // Позиция по оси Y
    popupBackground.setPosition(xPos, yPos); // Устанавливаем позицию фона

    // Создаем текст уведомления
    const popupText = this.add.text(xPos + 10, yPos + 10, `Достижение: ${name}\nНаграда: ${reward} Beercoins`, {
        fontSize: '16px',
        fill: '#FFFFFF',
        wordWrap: { width: width - 20 }
    });

    // Анимация появления
    popupBackground.alpha = 0; // Начальная прозрачность
    popupText.alpha = 0; // Начальная прозрачность

    this.tweens.add({
        targets: [popupBackground, popupText],
        alpha: 1,
        duration: 300, // Длительность появления
        onComplete: () => {
            // Анимация исчезновения
            this.tweens.add({
                targets: [popupBackground, popupText],
                alpha: 0,
                duration: 300, // Длительность исчезновения
                delay: 2000, // Задержка перед исчезновением
                onComplete: () => {
                    popupBackground.destroy(); // Удаляем фон
                    popupText.destroy(); // Удаляем текст
                }
            });
        }
    });
}

function tryDropCollectibleCap() {
    // Вероятность выпадения (например, один шанс из 3000 кликов)
    const dropChance = 1 / 5;
    if (Math.random() < dropChance) {
        const randomCap = Phaser.Utils.Array.GetRandom(collectibleCaps);
        showCollectibleCapPopup.call(this, randomCap);
    }
}

function showCollectibleCapPopup(cap) {
    const capImage = this.add.image(200, 300, cap.image).setScale(0.1);
    this.capSound.play();

    // Анимация для плавного исчезновения
    this.tweens.add({
        targets: capImage,
        alpha: 0,
        y: '-=50',
        duration: 2000,
        onComplete: () => {
            capImage.destroy();
        }
    });
}

