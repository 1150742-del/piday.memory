/* ==========================================================
   π Memory v2.0
   Game Engine
========================================================== */

const CONFIG = {

    easy:{
        name:"Easy",
        icon:"🟢",
        colour:"#22c55e",
        digits:1,
        increment:1,
        flash:800
    },

    medium:{
        name:"Medium",
        icon:"🔵",
        colour:"#3b82f6",
        digits:5,
        increment:3,
        flash:600
    },

    hard:{
        name:"Hard",
        icon:"🟣",
        colour:"#a855f7",
        digits:11,
        increment:4,
        flash:400
    },

    impossible:{
        name:"Impossible",
        icon:"🔴",
        colour:"#ef4444",
        digits:36,
        increment:20,
        flash:150
    }

};

const LEVELS=[
    "easy",
    "medium",
    "hard",
    "impossible"
];

const PI_DIGITS=
PI.replace(".","").split("");

const game={

    started:false,

    accepting:false,

    hasSeenIntro:false,

    round:1,

    digits:1,

    playerIndex:0,

    difficulty:"easy",

    token:0,

    best:Number(
        localStorage.getItem("piBest")||0
    )

};

/* ==========================================================
   DOM
========================================================== */

const ui={

    start:
        document.getElementById("start"),

    restart:
        document.getElementById("restart"),

    slider:
        document.getElementById("difficultySlider"),

    difficultyName:
        document.getElementById("difficultyName"),

    round:
        document.getElementById("roundCounter"),

    digits:
        document.getElementById("digitCounter"),

    best:
        document.getElementById("bestCounter"),

    progress:
        document.getElementById("progressFill"),

    toast:
        document.getElementById("toast"),

    keypad:
        document.getElementById("keypad"),

    keys:[
        ...document.querySelectorAll(".key")
    ],

    instruction:
        document.getElementById("instructionScreen"),

    instructionText:
        document.getElementById("instructionText"),

    pi:
        document.getElementById("piDisplay"),

    countdown:
        document.getElementById("countdown"),

    gameOver:
        document.getElementById("gameOver"),

    finalScore:
        document.getElementById("finalScore"),

    difficultyResult:
        document.getElementById("difficultyResult"),

    closeInstructions:
        document.getElementById("closeInstructions")

};

/* ==========================================================
   INIT
========================================================== */

init();

function init(){

    updateTheme();

    updateHUD();

    bindEvents();

}

/* ==========================================================
   EVENTS
========================================================== */

function bindEvents(){

    ui.start.onclick=startGame;

    ui.restart.onclick=restartGame;

    ui.slider.oninput=sliderChanged;

    ui.closeInstructions.onclick=()=>{

        ui.instruction.classList.add(
            "hidden"
        );

    };

    ui.keys.forEach(button=>{

        button.onclick=()=>{

            handleInput(

                button.dataset.value,

                button

            );

        };

    });

    document.addEventListener(

        "keydown",

        keyboardInput

    );

}

/* ==========================================================
   UI
========================================================== */

function updateHUD(){

    ui.round.textContent=
        game.round;

    ui.digits.textContent=
        game.digits;

    ui.best.textContent=
        game.best;

}

function updateTheme(){

    const level=
        LEVELS[
            Number(ui.slider.value)
        ];

    game.difficulty=level;

    const config=
        CONFIG[level];

    document.body.className=
        level;

    document.documentElement
    .style
    .setProperty(

        "--accent",

        config.colour

    );

    ui.difficultyName.textContent=

        config.icon+

        " "+

        config.name;

}

function showToast(message){

    ui.toast.textContent=
        message;

    ui.toast.classList.add(
        "show"
    );

    clearTimeout(
        ui.toast.timer
    );

    ui.toast.timer=
    setTimeout(()=>{

        ui.toast.classList.remove(
            "show"
        );

    },2200);

}

/* ==========================================================
   PART A2
========================================================== */

function sliderChanged(){

    updateTheme();

    if(!game.started)
        return;

    restartGame();

}

function startGame(){

    game.token++;

    const config=
        CONFIG[
            game.difficulty
        ];

    game.started=true;

    game.accepting=false;

    game.round=1;

    game.digits=
        config.digits;

    game.playerIndex=0;

    ui.start.disabled=true;

    updateHUD();

    updateProgress();

    if(!game.hasSeenIntro){

    game.hasSeenIntro = true;

    intro(game.token);

}
else{

    playSequence(game.token);

}
}

function restartGame(){

    game.token++;

    game.started=false;

    game.accepting=false;

    ui.gameOver.classList.add(
        "hidden"
    );

    ui.instruction.classList.add(
        "hidden"
    );

    ui.start.disabled=false;

    startGame();

}

/* ==========================================================
   KEYBOARD
========================================================== */

function keyboardInput(event){

    if(event.repeat)
        return;

    if(
        !/^[0-9]$/.test(
            event.key
        )
    )
        return;

    const button=
        document.querySelector(
            `[data-value="${event.key}"]`
        );

    handleInput(
        event.key,
        button
    );

}

/* ==========================================================
   PROGRESS
========================================================== */

function updateProgress(){

    if(game.digits===0){

        ui.progress.style.width="0%";

        return;

    }

    const percent=

        (game.playerIndex/
        game.digits)

        *100;

    ui.progress.style.width=

        percent+"%";

}

/* ==========================================================
   BUTTON EFFECTS
========================================================== */

function flashKey(value){

    const button=
        document.querySelector(
            `[data-value="${value}"]`
        );

    if(!button)
        return;

    button.classList.add(
        "active"
    );

    setTimeout(()=>{

        button.classList.remove(
            "active"
        );

    },

    CONFIG[
        game.difficulty
    ].flash*.7);

}

function correctKey(button){

    if(!button)
        return;

    button.classList.add(
        "correct"
    );

    setTimeout(()=>{

        button.classList.remove(
            "correct"
        );

    },180);

}

function wrongKey(button){

    if(!button)
        return;

    button.classList.add(
        "wrong"
    );

    setTimeout(()=>{

        button.classList.remove(
            "wrong"
        );

    },350);

}

/* ==========================================================
   UTILITIES
========================================================== */

function sleep(ms){

    return new Promise(

        resolve=>

        setTimeout(

            resolve,

            ms

        )

    );

}

function currentToken(token){

    return token===game.token;

}

/* ==========================================================
   PART B
   Intro + Countdown + Sequence Playback
========================================================== */

async function intro(token){

    if(!currentToken(token))
        return;

    game.accepting=false;

    ui.instruction.classList.remove(
        "hidden"
    );

    ui.instructionText.textContent=
        "Watch carefully and memorize the sequence.";

    ui.pi.innerHTML="";
    ui.countdown.textContent="";

    await sleep(600);

    if(!currentToken(token))
        return;

    for(

        let i=0;

        i<game.digits;

        i++

    ){

        if(!currentToken(token))
            return;

        ui.pi.innerHTML=

            PI_DIGITS

            .slice(0,i+1)

            .map((digit,index)=>{

                if(index===i){

                    return `
                    <span class="pi-highlight">
                        ${digit}
                    </span>
                    `;

                }

                return digit;

            })

            .join("");

        await sleep(

            CONFIG[
                game.difficulty
            ].flash

        );

    }

    if(!currentToken(token))
        return;

    await countdown(token);

    if(!currentToken(token))
        return;

    ui.instruction.classList.add(
        "hidden"
    );

    await playSequence(token);

}

/* ==========================================================
   COUNTDOWN
========================================================== */

async function countdown(token){

    const values=[
        "3",
        "2",
        "1",
        "GO!"
    ];

    for(const value of values){

        if(!currentToken(token))
            return;

        ui.countdown.textContent=
            value;

        ui.countdown.classList.remove(
            "pulse"
        );

        void ui.countdown.offsetWidth;

        ui.countdown.classList.add(
            "pulse"
        );

        await sleep(

            value==="GO!"
            ?500
            :700

        );

    }

    ui.countdown.textContent="";

}

/* ==========================================================
   PLAY SEQUENCE
========================================================== */

async function playSequence(token){

    if(!currentToken(token))
        return;

    game.accepting=false;

    game.playerIndex=0;

    updateProgress();

    const flashTime=

        CONFIG[
            game.difficulty
        ].flash;

    for(

        let i=0;

        i<game.digits;

        i++

    ){

        if(!currentToken(token))
            return;

        flashKey(

            PI_DIGITS[i]

        );

        await sleep(

            flashTime

        );

    }

    if(!currentToken(token))
        return;

    ui.keypad.style.pointerEvents=
        "auto";

    game.accepting=true;

    showToast(
        "Your turn!"
    );

}

/* ==========================================================
   PART C
   Input + Rounds + Game Over
========================================================== */

function handleInput(value, button){

    if(!game.started)
        return;

    if(!game.accepting){

        showToast(
            "Wait for the sequence!"
        );

        return;

    }

    const expected =
        PI_DIGITS[
            game.playerIndex
        ];

    if(value === expected){

        correctKey(button);

        game.playerIndex++;

        updateProgress();

        if(
            game.playerIndex >=
            game.digits
        ){

            roundComplete();

        }

    }
    else{

        wrongKey(button);

        gameOver();

    }

}

/* ==========================================================
   ROUND COMPLETE
========================================================== */

async function roundComplete(){

    game.accepting = false;

    showToast(
        "Round Complete!"
    );

    await sleep(700);

    const config =
        CONFIG[
            game.difficulty
        ];

    game.round++;

    game.digits +=
        config.increment;

    updateHUD();

    updateProgress();

    const token =
        ++game.token;

    intro(token);

}

/* ==========================================================
   GAME OVER
========================================================== */

function gameOver(){

    game.accepting = false;

    game.started = false;

    ui.keypad.style.pointerEvents =
        "none";

    ui.start.disabled = false;

    if(
        game.digits >
        game.best
    ){

        game.best =
            game.digits;

        localStorage.setItem(

            "piBest",

            game.best

        );

        showToast(
            "🎉 New Best!"
        );

    }

    updateHUD();

    ui.finalScore.textContent =

        game.digits +

        " Digits";

    const config =
        CONFIG[
            game.difficulty
        ];

    ui.difficultyResult.textContent =

        config.icon +

        " " +

        config.name;

    ui.gameOver.classList.remove(
        "hidden"
    );

}

/* ==========================================================
   RESTART BUTTON
========================================================== */

if(ui.restart){

    ui.restart.onclick = ()=>{

        ui.gameOver.classList.add(
            "hidden"
        );

        startGame();

    };

}

/* ==========================================================
   PART D
   Polish / Helpers / Reset
========================================================== */

/* ---------- Reset UI ---------- */

function resetUI(){

    ui.progress.style.width = "0%";

    ui.pi.innerHTML = "";

    ui.countdown.textContent = "";

    ui.keypad.style.pointerEvents = "auto";

    ui.keys.forEach(key=>{

        key.classList.remove(

            "active",

            "correct",

            "wrong"

        );

    });

}

/* ---------- Save ---------- */

function saveBest(){

    localStorage.setItem(

        "piBest",

        game.best

    );

}

/* ---------- Load ---------- */

function loadBest(){

    game.best = Number(

        localStorage.getItem(

            "piBest"

        ) || 0

    );

    updateHUD();

}

/* ---------- Disable Keyboard While Typing ---------- */

document.addEventListener(

    "keydown",

    e=>{

        const tag =
            document.activeElement.tagName;

        if(

            tag==="INPUT" ||

            tag==="TEXTAREA"

        ){

            return;

        }

    }

);

/* ---------- Window Focus ---------- */

window.addEventListener(

    "blur",

    ()=>{

        game.accepting = false;

    }

);

window.addEventListener(

    "focus",

    ()=>{

        if(

            game.started &&

            !ui.gameOver.classList.contains(
                "hidden"
            )

        ){

            return;

        }

    }

);

/* ---------- Initial Load ---------- */

loadBest();

updateTheme();

updateHUD();

resetUI();

/* ---------- Welcome ---------- */

setTimeout(()=>{

    showToast(

        "Welcome to π Memory!"

    );

},500);