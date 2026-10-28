document.addEventListener('contextmenu', e => {
    if (!e.target.closest('a')) e.preventDefault();
});

document.addEventListener('dragstart', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
});

const translations = {
    en: { 
        nickname: "Kruger", 
        last_track: "Favorite track", 
        listened: "Listened", 
        projects_title: "> My Projects <", 
        project1_name: "Zeed", 
        project1_desc: "A lightweight and fast asynchronous framework for Telegram bots.", 
        abandoned: "Abandoned", 
        stack_title: "> My Tech Stack <",
        quotes: [
            "La-la-la, I'm Semyon Lobanov, my head is made of potatoes...",
            "Vibe coder",
            "I wish you good health, your documents, little ones",
            "Did you know Google Play Protect is useless?",
            "TG: @Krugeru",
            "SOS",
            "Dox, swat, sportiki",
            "Programming, programming, programming!",
            "Blah-blah-blah...",
            "Wubba Lubba Dub Dub!"
        ]
    },
    uk: { 
        nickname: "Kruger", 
        last_track: "Улюблений трек", 
        listened: "Прослухано", 
        projects_title: "> Мої Проєкти <", 
        project1_name: "Zeed", 
        project1_desc: "Легкий та швидкий асинхронний фреймворк для Telegram-ботів.", 
        abandoned: "Закинутий", 
        stack_title: "> Мій Тех. Стек <",
        quotes: [
            "Ля-ля-ля, я Семен Лобанов, у мене голова з картоплі...",
            "Вайбкодер",
            "Бажаю здоров'я, ваші документи, маленькі",
            "Ви знали що Google Play захист марний?",
            "TG: @Krugeru",
            "SOS",
            "Докс, сват, спортики",
            "Програмування, програмування, програмування!",
            "Бла-бла-бла...",
            "Вабба, лабба, даб, даб!"
        ]
    },
    ru: { 
        nickname: "Kruger", 
        last_track: "Любимый трек", 
        listened: "Прослушано", 
        projects_title: "> Мои Проекты <", 
        project1_name: "Zeed", 
        project1_desc: "Легкий и быстрый асинхронный фреймворк для Telegram-ботов.", 
        abandoned: "Заброшен", 
        stack_title: "> Мой Тех. Стек <",
        quotes: [
            "Ля-ля-ля, я Семён Лобанов, у меня башка из картошки...",
            "Вайбкодер",
            "Желаю здоровья, ваши документы, маленькие",
            "Вы знали что Google Play защита бесполезная?",
            "TG: @Krugeru",
            "SOS",
            "Докс, сват, спортики",
            "Программирование, программирование, программирование!",
            "Бла-бла-бла...",
            "Вабба, лабба, даб, даб!"
        ]
    }
};

const bioText = document.getElementById('bioText');
let currentLangDict = translations.en;
let typingSession = 0;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startTerminal(sessionId) {
    while (true) {
        if (sessionId !== typingSession) return;
        if (!currentLangDict || !currentLangDict.quotes) {
            await sleep(500);
            continue;
        }
        
        const quotes = currentLangDict.quotes;
        const text = quotes[Math.floor(Math.random() * quotes.length)];
        
        for (let i = 0; i < text.length; i++) {
            if (sessionId !== typingSession) return;
            bioText.textContent += text[i];
            await sleep(65);
        }
        
        for (let i = 0; i < 40; i++) {
            if (sessionId !== typingSession) return;
            await sleep(50);
        }
        
        for (let i = bioText.textContent.length; i > 0; i--) {
            if (sessionId !== typingSession) return;
            bioText.textContent = bioText.textContent.slice(0, -1);
            await sleep(25);
        }
        
        for (let i = 0; i < 10; i++) {
            if (sessionId !== typingSession) return;
            await sleep(50);
        }
    }
}

const langBtn = document.getElementById('langBtn');
const langMenu = document.getElementById('langMenu');
const currentLangLabel = document.getElementById('currentLangLabel');
const langSwitch = document.getElementById('langSwitch');

function applyLanguage(lang) {
    const dict = translations[lang] || translations.en;
    document.documentElement.lang = lang;
    
    document.querySelectorAll('[data-i18n]').forEach(el => { 
        if (dict[el.dataset.i18n]) el.textContent = dict[el.dataset.i18n]; 
    });
    
    currentLangLabel.textContent = lang.toUpperCase();
    document.querySelectorAll('.lang-item').forEach(item => item.classList.toggle('active', item.dataset.value === lang));
    try { localStorage.setItem('preferred_lang', lang); } catch (e) {}

    currentLangDict = dict;
    bioText.textContent = '';
    typingSession++;
    startTerminal(typingSession);
}

let savedLang = null; 
try { savedLang = localStorage.getItem('preferred_lang'); } catch (e) {}
const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
applyLanguage((savedLang && translations[savedLang]) ? savedLang : (translations[browserLang] ? browserLang : 'en'));

langBtn.addEventListener('click', (e) => { 
    e.stopPropagation(); 
    langMenu.classList.toggle('open'); 
});

document.querySelectorAll('.lang-item').forEach(item => { 
    item.addEventListener('click', () => { 
        applyLanguage(item.dataset.value); 
        langMenu.classList.remove('open'); 
    }); 
});

document.addEventListener('click', (e) => { 
    if (!langSwitch.contains(e.target)) langMenu.classList.remove('open'); 
});

const confettiLayer = document.getElementById('confettiLayer');
const avatarTrigger = document.getElementById('avatarTrigger');
const nicknameTrigger = document.getElementById('nicknameTrigger');
const icons = ['star', 'favorite', 'thumb_up', 'bolt', 'rocket_launch', 'auto_awesome', 'flutter_dash', 'celebration'];

let isBursting = false;

function triggerConfetti(targetElement) {
    if (isBursting) return; 
    isBursting = true;
    
    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for (let i = 0; i < (window.innerWidth <= 480 ? 15 : 20); i++) {
        const p = document.createElement('div'); 
        p.className = 'particle';
        p.innerHTML = `<span class="material-symbols-outlined">${icons[Math.floor(Math.random() * icons.length)]}</span>`;
        p.style.left = `${centerX}px`; 
        p.style.top = `${centerY}px`; 
        confettiLayer.appendChild(p);
        
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 180; 
        const rotation = (Math.random() - 0.5) * 360; 
        
        requestAnimationFrame(() => {
            p.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) rotate(${rotation}deg) scale(0.3)`;
            p.style.opacity = '0';
        });
        
        setTimeout(() => p.remove(), 2100);
    }
    
    setTimeout(() => { isBursting = false; }, 600);
}

avatarTrigger.addEventListener('click', () => triggerConfetti(avatarTrigger));
nicknameTrigger.addEventListener('click', () => triggerConfetti(nicknameTrigger));

// ЗАЩИТА ОТ ПАДЕНИЯ
if (typeof Matter !== 'undefined') {
    const { Engine, Runner, Bodies, Composite, Mouse, MouseConstraint, Events, Body } = Matter;
    const container = document.getElementById('techStackContainer');
    const tags = Array.from(document.querySelectorAll('.tech-tag'));
    
    let engine, runner, mouseConstraint;
    let wordBodies = [];
    let isPhysicsActive = false;

    function initPhysics() {
        if (isPhysicsActive) return;
        isPhysicsActive = true;

        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const containerRect = container.getBoundingClientRect();

        const initialPositions = tags.map(tag => {
            const rect = tag.getBoundingClientRect();
            return {
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top + rect.height / 2,
                w: rect.width,
                h: rect.height
            };
        });

        container.classList.add('active');

        engine = Engine.create();
        engine.world.gravity.y = 0.8;
        engine.world.gravity.x = 0;

        const wallThickness = 100;
        const walls = [
            Bodies.rectangle(cw / 2, -wallThickness / 2, cw + wallThickness * 2, wallThickness, { isStatic: true }),
            Bodies.rectangle(cw / 2, ch + wallThickness / 2, cw + wallThickness * 2, wallThickness, { isStatic: true }),
            Bodies.rectangle(-wallThickness / 2, ch / 2, wallThickness, ch + wallThickness * 2, { isStatic: true }),
            Bodies.rectangle(cw + wallThickness / 2, ch / 2, wallThickness, ch + wallThickness * 2, { isStatic: true })
        ];
        Composite.add(engine.world, walls);

        tags.forEach((tag, index) => {
            const pos = initialPositions[index];
            const body = Bodies.rectangle(pos.x, pos.y, pos.w, pos.h, {
                restitution: 0.6,
                friction: 0.1,
                frictionAir: 0.02,
                density: 0.001
            });
            wordBodies.push({ el: tag, body: body });
            Composite.add(engine.world, body);
        });

        const mouse = Mouse.create(container);
        if (mouse.element.removeEventListener) {
            mouse.element.removeEventListener("wheel", mouse.mousewheel);
            mouse.element.removeEventListener("DOMMouseScroll", mouse.mousewheel);
        }

        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                angularStiffness: 0.1,
                render: { visible: false }
            }
        });
        Composite.add(engine.world, mouseConstraint);

        Events.on(engine, 'beforeUpdate', function() {
            const currentCw = container.clientWidth;
            const currentCh = container.clientHeight;
            const m = mouseConstraint.mouse;
            
            if (m.position.x < 0) m.position.x = 0;
            if (m.position.x > currentCw) m.position.x = currentCw;
            if (m.position.y < 0) m.position.y = 0;
            if (m.position.y > currentCh) m.position.y = currentCh;

            if (mouseConstraint.body) {
                const body = mouseConstraint.body;
                const bounds = body.bounds;
                let adjustX = 0, adjustY = 0;
                
                if (bounds.min.x < 0) adjustX = -bounds.min.x;
                else if (bounds.max.x > currentCw) adjustX = currentCw - bounds.max.x;
                
                if (bounds.min.y < 0) adjustY = -bounds.min.y;
                else if (bounds.max.y > currentCh) adjustY = currentCh - bounds.max.y;
                
                if (adjustX !== 0 || adjustY !== 0) {
                    Body.setPosition(body, {
                        x: body.position.x + adjustX,
                        y: body.position.y + adjustY
                    });
                }
            }
        });

        runner = Runner.create();
        Runner.run(runner, engine);

        function syncDOM() {
            wordBodies.forEach(({ el, body }) => {
                el.style.transform = `translate(${body.position.x}px, ${body.position.y}px) translate(-50%, -50%) rotate(${body.angle}rad)`;
            });
            requestAnimationFrame(syncDOM);
        }
        syncDOM();
    }

    container.addEventListener('pointerdown', initPhysics, { once: true });

    window.addEventListener('resize', () => {
        if (!isPhysicsActive || !engine) return;
        
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const wallThickness = 100;
        
        const newWalls = [
            Bodies.rectangle(cw / 2, -wallThickness / 2, cw + wallThickness * 2, wallThickness, { isStatic: true }),
            Bodies.rectangle(cw / 2, ch + wallThickness / 2, cw + wallThickness * 2, wallThickness, { isStatic: true }),
            Bodies.rectangle(-wallThickness / 2, ch / 2, wallThickness, ch + wallThickness * 2, { isStatic: true }),
            Bodies.rectangle(cw + wallThickness / 2, ch / 2, wallThickness, ch + wallThickness * 2, { isStatic: true })
        ];

        const oldWalls = Composite.allBodies(engine.world).filter(b => b.isStatic);
        oldWalls.forEach(w => Composite.remove(engine.world, w));
        Composite.add(engine.world, newWalls);

        wordBodies.forEach(({ body }) => {
            const bounds = body.bounds;
            let dx = 0, dy = 0;
            
            if (bounds.min.x < 0) dx = -bounds.min.x;
            else if (bounds.max.x > cw) dx = cw - bounds.max.x;
            
            if (bounds.min.y < 0) dy = -bounds.min.y;
            else if (bounds.max.y > ch) dy = ch - bounds.max.y;
            
            if (dx !== 0 || dy !== 0) {
                Body.setPosition(body, { x: body.position.x + dx, y: body.position.y + dy });
                Body.setVelocity(body, { x: 0, y: 0 });
            }
        });
    });
} else {
    console.warn("Matter.js не загружен. Физика отключена.");
    const container = document.getElementById('techStackContainer');
    if (container) {
        container.style.touchAction = "auto";
    }
}