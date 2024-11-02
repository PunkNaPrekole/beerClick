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
    { id: 3, name: "x2 множитель", description: "получите множитель x2", condition: () => multiplier >= 2, reward: 50, unlocked: false },
    { id: 4, name: "Общажный геймдев", description: "Начните писать игру про пиво", condition: () => beercoins >= 123, reward: 1, unlocked: false },
];
 let purchasedSkins = {
    backgrounds: ['default'],
    cans: ['defaultCan']
};

const game = new Phaser.Game(config);

let beercoins = 1;
let beercoinsPerTap = 1;
let nextLevelCost = 100;
let level = 1;
let multiplier = 1;
let lastTapTime = Date.now();
let totalTapTime = 0;
let shopContainer;
let capsContainer;
let currentBackgroundSkin = 'default';
let currentCanSkin = 'defaultCan';
let countValer = 0;

const levelCosts = [
    1500,    // 1
    6000,    // 2
    20000,   // 3
    40000,   // 4
    100000,  // 5
    200000,  // 6
    500000,  // 7
    750000,  // 8
    1000000, // 9
    1500000, // 10
    2500000, // 11
    5000000, // 12
    7000000, // 13
    10000000,// 14
    15000000,// 15
    25000000,// 16
    40000000,// 17
    60000000,// 18
    90000000,// 19
    130000000// 20
];
const skins = {
    backgrounds: [
        { id: 'default', image: 'sprites/stairs.png', price: 0 },
        { id: 'shit room', image: 'sprites/shitRoom.png', price: 100 },
        { id: 'stairs', image: 'sprites/stairs.png', price: 200 },
        { id: 'shop', image: 'sprites/shop.png', price: 200 },
        { id: 'station', image: 'sprites/station.png', price: 200 },
        { id: 'tubes', image: 'sprites/tubes.png', price: 200 },
        { id: 'stall', image: 'sprites/stall.png', price: 200 },
    ],
    cans: [
        { id: 'defaultCan', image: 'sprites/beer.png', price: 0 },
        { id: 'el papito', image: 'sprites/el papito.png', price: 150 },
        { id: 'dub 99', image: 'sprites/duB 99.png', price: 100 },
        { id: 'varona', image: 'sprites/Varona.png', price: 100 },
        { id: 'dub might', image: 'sprites/DUB MIGHT.png', price: 100 },
    ],
};

const collectibleCaps = [
    { id: 1, image: 'sprites/redCap.png', name: 'Rare Cap', rarity: 'rare' },
    { id: 2, image: 'sprites/blueCap.png', name: 'Epic Cap', rarity: 'epic' },
    { id: 3, image: 'sprites/greenCap.png', name: 'Legendary Cap', rarity: 'legendary' },
];

const collectedCaps = {};


function preload() {
    this.load.image('beercoinIcon', 'sprites/beerCoin.png');
    this.load.audio('clickSound', 'sounds/click-sound.mp3');
    this.load.audio('menuSound', 'sounds/menu-sound.mp3');
    this.load.audio('capSound', 'sounds/capSound.mp3');
    this.load.audio('lvlUpSound', 'sounds/lvlUp.mp3');
    this.load.image('boostButton', 'sprites/button.png');
    this.load.image('can', 'sprites/beer.png');
    this.load.image('background', 'sprites/background.png');
    this.load.image('shop', 'sprites/shop.png');
    this.load.image('beer', 'sprites/beerTexture.jpg');
    this.load.image('cup', 'sprites/cup.png');

    skins.backgrounds.concat(skins.cans).forEach((skin) => {
        this.load.image(skin.id, skin.image);
    });
    collectibleCaps.forEach(cap => {
            const imageKey = cap.image
            this.load.image(imageKey, `${cap.image}`);
        });
}

function create() {
    let userId, username, firstName, lastName;
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe.user) {
            userId = Telegram.WebApp.initDataUnsafe.user.id;
            username = Telegram.WebApp.initDataUnsafe.user.username;
            firstName = Telegram.WebApp.initDataUnsafe.user.first_name;
            lastName = Telegram.WebApp.initDataUnsafe.user.last_name;

            loadPlayerData(userId, (isNewPlayer) => {
                if (isNewPlayer) {
                    savePlayerData(userId, username, firstName, lastName);
                }
            });
    }
    window.addEventListener('beforeunload', () => {
            savePlayerData(userId, username, firstName, lastName);
    });
    this.background = this.add.image(200, 400, currentBackgroundSkin).setOrigin(0.5, 0.5).setDisplaySize(400, 600);
    this.background.setScale(0.15);

    this.clickSound = this.sound.add('clickSound');
    this.menuSound = this.sound.add('menuSound');
    this.capSound = this.sound.add('capSound');
    this.lvlUpSound = this.sound.add('lvlUpSound');

    this.perTapText = this.add.text(10, 20, `Прибыль за тап:\n${beercoinsPerTap}`, { font: '16px Pangolin', fill: '#FFF', align: 'center'
    });
    this.passiveBeercoinsText = this.add.text(150, 20, `Пассивный доход:\n${countValer * (beercoinsPerTap/2)}`, { font: '16px Pangolin', fill: '#FFF', align: 'center' });

    this.beercoinIcon = this.add.image(30, 70, 'beercoinIcon').setOrigin(0.5, 0.5).setDisplaySize(35, 35);
    this.beercoinsCountText = this.add.text(70, 65, `Beercoins: ${beercoins}`, {
        font: '16px Pangolin',
        fill: '#FFF'
    });

    this.beerFill = this.add.image(320, 50, 'beer').setScale(0.04, 0.06);
    this.emptyMug = this.add.image(330, 50, 'cup').setScale(0.04)
        .setInteractive()
        .on('pointerdown', () => levelUp.call(this));
    this.beerFill.setCrop(0, this.beerFill.height, this.beerFill.width, 0);
    updateProgressBar.call(this);

    this.multiplierText = this.add.text(10, 670, `Множитель: x${multiplier}`, { font: '18px Pangolin', fill: '#000' });
    this.time.addEvent({ delay: 1000, callback: checkMultiplierIncrease, callbackScope: this, loop: true });

    this.can = this.add.sprite(200, 400, currentCanSkin).setInteractive();
    this.can.setScale(0.15);
    this.can.on('pointerdown', (pointer) => {
        this.can.scaleY = 0.145;
        this.can.scaleX = 0.155;
        this.time.delayedCall(50, () => {
                this.can.setScale(0.15);
            });
        const localPoint = this.can.getLocalPoint(pointer.x, pointer.y);
        collectBeercoin.call(this, localPoint.x, localPoint.y);
        tryDropCollectibleCap.call(this);
        this.clickSound.play();
    });


    createBottomMenu.call(this);
}

function updateProgressBar() {
    const progress = Phaser.Math.Clamp(beercoins / nextLevelCost, 0, 1);

    // Определяем уровень заполнения кружки
    const fillHeight = this.beerFill.height * progress;

    // Обновляем маску для "пива"
    this.beerFill.setCrop(0, this.beerFill.height - fillHeight, this.beerFill.width, fillHeight);
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
    this.beercoinsCountText.setText(`Beercoins: ${beercoins}`);
    createParticle.call(this, x* 0.3, y * 0.18, gainedCoins);
    updateProgressBar.call(this);
    checkAchievements.call(this);

}

function checkMultiplierIncrease() {
    if (totalTapTime >= multiplier * 600 * 1000) {
        multiplier++;
        totalTapTime = 0;
        this.multiplierText.setText(`Множитель: x${multiplier}`);
        checkAchievements.call(this);
    }
}

function getNextLevelCost(currentLevel) {
    if (currentLevel <= levelCosts.length) {
        return levelCosts[currentLevel - 1];
    }
    const previousCost = levelCosts[levelCosts.length - 1];
    return previousCost + (100000 * currentLevel);
}

function levelUp() {
    if (beercoins >= nextLevelCost){
        this.lvlUpSound.play();
        beercoins -= nextLevelCost;
        level++;
        beercoinsPerTap++;
        const nextLevelCost = getNextLevelCost(level);
        updateProgressBar.call(this);
        this.perTapText.setText(`Прибыль за тап:\n${beercoinsPerTap}`);
        savePlayerData(Telegram.WebApp.initDataUnsafe.user.id, Telegram.WebApp.initDataUnsafe.user.username,
                               Telegram.WebApp.initDataUnsafe.user.first_name, Telegram.WebApp.initDataUnsafe.user.last_name);
    } else {
        createParticle.call(this, 175, 125, "no coins");
    }
    this.beercoinsCountText.setText(`Beercoins: ${beercoins}`);
    checkAchievements.call(this);
}

function hideMainUI() {
    this.perTapText.visible = false;
    this.passiveBeercoinsText.visible = false;
    this.beercoinIcon.visible = false;
    this.beercoinsCountText.visible = false;
    this.emptyMug.visible = false;
    this.beerFill.visible = false;
    this.multiplierText.visible = false;
    this.can.visible = false;
}

function showMainUI() {
    this.background.setTexture(currentBackgroundSkin);
    this.perTapText.visible = true;
    this.passiveBeercoinsText.visible = true;
    this.beercoinIcon.visible = true;
    this.beercoinsCountText.visible = true;
    this.emptyMug.visible = true;
    this.beerFill.visible = true;
    this.multiplierText.visible = true;
    this.can.visible = true;
}

function openShop() {
    hideMainUI.call(this);
    if (shopContainer) shopContainer.destroy(true);
    shopContainer = this.add.container(0, 0);

    const shopBackground = this.add.graphics();
    shopBackground.fillStyle(0x000000, 0.7);
    shopBackground.fillRect(0, 0, 400, 700);
    shopContainer.add(shopBackground);



    skins.backgrounds.forEach((background, index) => {
        const col = Math.floor(index / 5);
        const row = index % 5;

        const buttonX = 55 + col * 100;
        const buttonY = 70 + row * 120;

        const isPurchased = purchasedSkins.backgrounds.includes(background.id);
        const spriteKey = isPurchased ? background.id : 'background';

        const buttonSprite = this.add.image(buttonX, buttonY, spriteKey)
            .setOrigin(0.5)
            .setScale(0.03)
            .setInteractive()
            .on('pointerdown', () => purchaseSkin.call(this, 'backgrounds', background.id));
        shopContainer.add(buttonSprite);

        if (!isPurchased) {
            const priceText = this.add.text(buttonX, buttonY + 55, `${background.price}`, { fontSize: '14px', fill: '#FFFFFF' })
                .setOrigin(0.5);
            shopContainer.add(priceText);
        }
    });

    skins.cans.forEach((can, index) => {
        const col = Math.floor(index / 5);
        const row = index % 5;
        const buttonX = 250 + col * 100;
        const buttonY = 70 + row * 130;

        const isPurchased = purchasedSkins.cans.includes(can.id);
        const spriteKey = isPurchased ? can.id : 'can';

        const buttonSprite = this.add.image(buttonX, buttonY, spriteKey)
            .setOrigin(0.5)
            .setScale(0.035)
            .setInteractive()
            .on('pointerdown', () => purchaseSkin.call(this, 'cans', can.id));
        shopContainer.add(buttonSprite);
        if (!isPurchased) {
                    const priceText = this.add.text(buttonX, buttonY + 55, `${can.price}`, { fontSize: '14px', fill: '#FFFFFF' })
                        .setOrigin(0.5);
                    shopContainer.add(priceText);
                }
    });
}

function purchaseSkin(type, skinId) {
    if (!skins[type]) {
        console.error(`Invalid type: ${type}`);
        return;
    }

    const selectedSkin = skins[type].find((skin) => skin.id === skinId);

    if (!selectedSkin) {
        console.error(`Skin with ID ${skinId} not found for type ${type}`);
        return;
    }
    if (purchasedSkins[type].includes(skinId)) {
            applySkin.call(this, type, skinId);
            showMainUI.call(this);
            if (shopContainer) shopContainer.destroy(true);
            return;
        }

    if (beercoins >= selectedSkin.price) {
        beercoins -= selectedSkin.price;
        this.beercoinsCountText.setText(`Beercoins: ${beercoins}`);
        purchasedSkins[type].push(skinId);
        openShop.call(this)
        applySkin(type, skinId);
        navigateToSection.call(this, 'Кликер')
    } else {
        console.log('Недостаточно средств!');
        createParticle.call(this, 175, 125, "no coins");
    }
}

function applySkin(type, skinId) {
    if (type === 'backgrounds') {
        this.background.setTexture(skinId);
        currentBackgroundSkin = skinId;
    } else if (type === 'cans') {
        this.can.setTexture(skinId);
        currentCanSkin = skinId;
    }
}

function createBottomMenu() {
    const menuY = 700;


    const menuBackground = this.add.graphics();
    menuBackground.fillStyle(0x333333, 1);
    menuBackground.fillRect(0, menuY, 400, 100);


    const menuOptions = [
        { option: 'Кликер', image: 'boostButton' },
        { option: 'Магазин', image: 'boostButton' },
        { option: 'Крышки', image: 'boostButton' },
        { option: 'Буст', image: 'boostButton' }
    ];

    menuOptions.forEach((item, index) => {
        const buttonX = 10 + index * 100;

        const buttonSprite = this.add.image(buttonX + 40, menuY + 50, item.image)
            .setOrigin(0.5, 0.5)
            .setInteractive()
            .on('pointerdown', () => navigateToSection.call(this, item.option));

        buttonSprite.setDisplaySize(80, 50);
    });
}

function navigateToSection(section) {
    this.menuSound.play();
    if (section === 'Кликер') {
        showMainUI.call(this);
        if (shopContainer) shopContainer.destroy(true);
        if (capsContainer) capsContainer.destroy(true);
    } else if (section === 'Магазин') {
        this.background.setTexture('shop');
        if (capsContainer) capsContainer.destroy(true);
        openShop.call(this);
    } else if (section === 'Крышки') {
        if (shopContainer) shopContainer.destroy(true);
        openCapsCollection.call(this);
    } else if (section === 'Буст') {
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
                    font: '32px Pangolin',
                    fill: color,
                    fontStyle: 'bold'
                });
    const velocityX = Phaser.Math.Between(-50, 50);
    const velocityY = Phaser.Math.Between(-100, -50);

    this.tweens.add({
        targets: particle,
        x: particle.x + velocityX,
        y: particle.y + velocityY,
        alpha: 0,
        duration: 1000,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
    });
}

function checkAchievements() {
    achievements.forEach((achievement) => {
        if (!achievement.unlocked && achievement.condition()) {
            unlockAchievement.call(this, achievement);
        }
    });
}


function unlockAchievement(achievement) {
    achievement.unlocked = true;
    beercoins += achievement.reward;
    this.beercoinsCountText.setText(`Beercoins: ${beercoins}`);
    showAchievementPopup.call(this, achievement.name, achievement.reward);
    savePlayerData(Telegram.WebApp.initDataUnsafe.user.id, Telegram.WebApp.initDataUnsafe.user.username,
                       Telegram.WebApp.initDataUnsafe.user.first_name, Telegram.WebApp.initDataUnsafe.user.last_name);
}

function showAchievementPopup(name, reward) {
    const popupBackground = this.add.graphics();
    popupBackground.fillStyle(0x333333, 0.8);
    const width = 250;
    const height = 60;
    popupBackground.fillRoundedRect(0, 0, width, height, 10);


    const padding = 20;
    const xPos = this.cameras.main.width - width - padding;
    const yPos = this.cameras.main.height - height - padding - 100;
    popupBackground.setPosition(xPos, yPos);


    const popupText = this.add.text(xPos + 10, yPos + 10, `Достижение: ${name}\nНаграда: ${reward} Beercoins`, {
        fontSize: '16px',
        fill: '#FFFFFF',
        wordWrap: { width: width - 20 }
    });


    popupBackground.alpha = 0;
    popupText.alpha = 0;

    this.tweens.add({
        targets: [popupBackground, popupText],
        alpha: 1,
        duration: 300,
        onComplete: () => {

            this.tweens.add({
                targets: [popupBackground, popupText],
                alpha: 0,
                duration: 300,
                delay: 2000,
                onComplete: () => {
                    popupBackground.destroy();
                    popupText.destroy();
                }
            });
        }
    });
}

function tryDropCollectibleCap() {

    const dropChance = 1 / 3000;
    if (Math.random() < dropChance) {
        const randomCap = Phaser.Utils.Array.GetRandom(collectibleCaps);
        if (!collectedCaps[randomCap.id]) {
                    collectedCaps[randomCap.id] = 0;
                }
                collectedCaps[randomCap.id]++;
        showCollectibleCapPopup.call(this, randomCap);
    }
}

function showCollectibleCapPopup(cap) {
    const capImage = this.add.image(200, 300, cap.image).setScale(0.1);
    this.capSound.play();


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

function openCapsCollection() {
    hideMainUI.call(this);
    if (capsContainer) capsContainer.destroy(true);
    capsContainer = this.add.container(0, 0);

    const collectionBackground = this.add.graphics();
    collectionBackground.fillStyle(0x000000, 0.7);
    collectionBackground.fillRect(0, 0, 400, 600);


    capsContainer.add(collectionBackground);
    capsContainer.add(this.add.text(200, 50, 'Коллекция крышек', { fontSize: '24px', fill: '#FFFFFF' }).setOrigin(0.5));


    const cols = 5;
    const rowHeight = 70;
    const colWidth = 70;

    let currentRow = 0;
    let currentCol = 0;


    Object.keys(collectedCaps).forEach((capId) => {
        const cap = collectibleCaps.find(c => c.id == capId);
        const capCount = collectedCaps[capId];


        if (cap && capCount > 0) {
            for (let i = 0; i < capCount; i++) {

                const capSprite = this.add.image(60 + currentCol * colWidth, 100 + currentRow * rowHeight, cap.image)
                    .setOrigin(0.5)
                    .setScale(0.1);
                currentCol++;
                capsContainer.add(capSprite);
                if (currentCol >= cols) {
                    currentCol = 0;
                    currentRow++;
                }
            }
        }
    });
}

function startValera() {
    setInterval(() => {
        beercoins += countValer * (beercoinsPerTap/2);
    }, 1000);
}

function savePlayerData(userId, username, firstName, lastName) {
    achievements.forEach(a => {
        a.unlocked = a.condition();
    });
    const filteredAchievements = achievements.map(({ condition, ...rest }) => rest);
    const playerData = {
        platform: "telegram"
        userId: String(userId),
        username: username,
        firstName: firstName,
        lastName: lastName,
        level: level,
        beercoins: beercoins,
        purchasedSkins: purchasedSkins,
        achievements: filteredAchievements,
        currentBackgroundSkin: currentBackgroundSkin,
        currentCanSkin: currentCanSkin,
        multiplier: multiplier,
        countValer: countValer
    };
    db.collection("players").doc(String(userId)).set(playerData);
}

function loadPlayerData(userId, onDataLoaded) {
    const docRef = db.collection("players").doc(String(userId));

    docRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            level = data.level || 1;
            beercoins = data.beercoins || 0;
            purchasedSkins = data.purchasedSkins || { backgrounds: ['default'], cans: ['defaultCan'] };
            currentBackgroundSkin = data.currentBackgroundSkin || 'default';
            currentCanSkin = data.currentCanSkin || 'defaultCan';
            multiplier = data.multiplier || 1;
            countValer = data.countValer || 0;
            achievements.forEach(a => {
                const found = data.achievements.find(d => d.id === a.id);
                a.unlocked = !!found;
            });
            beercoinsPerTap = level;
            console.log("Данные игрока загружены:", data);
            onDataLoaded();
        } else {
            console.log("Данных игрока не найдено, будет создан новый игрок");
            onDataLoaded(true);
        }
    }).catch((error) => {
        console.error("Ошибка при загрузке данных игрока:", error);
    });
}
