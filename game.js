(() => {
    "use strict";

    const CONFIG = {
        easy: {
            name: "Easy",
            description: "One digit at a time",
            digits: 1,
            increment: 1,
            flash: 800
        },
        medium: {
            name: "Medium",
            description: "Short sequences, quicker flashes",
            digits: 5,
            increment: 3,
            flash: 600
        },
        hard: {
            name: "Hard",
            description: "Longer sequences, less time",
            digits: 11,
            increment: 4,
            flash: 400
        },
        impossible: {
            name: "Impossible",
            description: "A serious test of recall",
            digits: 36,
            increment: 20,
            flash: 150
        }
    };

    const LEVELS = ["easy", "medium", "hard", "impossible"];
    const BEST_KEY = "piBest";
    const INTRO_KEY = "pilabsIntroDismissed";
    const MODE_KEY = "pilabsRecallMode";

    if (typeof PI !== "string" || !PI.includes(".")) {
        console.error('PiLabs: pi.js must define PI as a decimal string.');
        return;
    }

    // Only the digits after the decimal point are playable.
    const PI_DECIMALS = PI.split(".")[1].replace(/\D/g, "").split("");

    if (PI_DECIMALS.length === 0) {
        console.error("PiLabs: no decimal digits found.");
        return;
    }

    const $ = id => document.getElementById(id);

    const ui = {
        start: $("start"),
        startLabel: $("startLabel"),
        restart: $("restart"),
        introStart: $("introStart"),
        reviewPi: $("reviewPi"),
        helpButton: $("helpButton"),

        slider: $("difficultySlider"),
        difficultyName: $("difficultyName"),
        difficultyDescription: $("difficultyDescription"),

        modeButtons: [...document.querySelectorAll("[data-mode]")],

        round: $("roundCounter"),
        digits: $("digitCounter"),
        best: $("bestCounter"),

        progress: $("progressFill"),
        progressBar: $("progressBar"),
        progressText: $("progressText"),

        keys: [...document.querySelectorAll(".key[data-value]")],

        pi: $("piDisplay"),
        caption: $("displayCaption"),
        countdown: $("countdown"),

        instructionHeading: $("instructionHeading"),
        instructionText: $("instructionText"),
        inputStatus: $("inputStatus"),

        instruction: $("instructionScreen"),
        closeInstructions: $("closeInstructions"),
        dontShowIntro: $("dontShowIntro"),

        gameOver: $("gameOver"),
        closeResults: $("closeResults"),
        finalScore: $("finalScore"),
        difficultyResult: $("difficultyResult"),
        roundsResult: $("roundsResult"),
        resultMessage: $("resultMessage"),
        newBestNote: $("newBestNote"),

        toast: $("toast")
    };

    for (const [name, element] of Object.entries(ui)) {
        if (element === null || element === undefined) {
            console.error(`PiLabs: missing required element "${name}".`);
            return;
        }
    }

    /* ---------- Safe browser storage ---------- */

    function storageGet(key, fallback = null) {
        try {
            return localStorage.getItem(key) ?? fallback;
        } catch {
            return fallback;
        }
    }

    function storageSet(key, value) {
        try {
            localStorage.setItem(key, String(value));
            return true;
        } catch {
            return false;
        }
    }

    function readBest() {
        const value = Number(storageGet(BEST_KEY, "0"));

        return Number.isFinite(value) && value > 0
            ? Math.floor(value)
            : 0;
    }

    /* ---------- State ---------- */

    const savedMode = storageGet(MODE_KEY, "digits");

    const game = {
        started: false,
        accepting: false,
        activeRound: false,

        round: 1,
        digits: 1,
        playerIndex: 0,

        difficulty: "easy",
        mode: savedMode === "keypad" ? "keypad" : "digits",

        completedDigits: 0,
        best: readBest(),

        token: 0,
        toastTimer: null,
        newBestThisRun: false
    };

    /* ---------- Helpers ---------- */

    const sleep = ms =>
        new Promise(resolve => setTimeout(resolve, ms));

    function isCurrent(token) {
        return token === game.token;
    }

    function currentConfig() {
        return CONFIG[game.difficulty];
    }

    function setStatus(message) {
        ui.inputStatus.textContent = message;
    }

    function setModal(modal, visible) {
        modal.classList.toggle("hidden", !visible);
    }

    function showToast(message) {
        ui.toast.textContent = message;
        ui.toast.classList.add("show");

        clearTimeout(game.toastTimer);

        game.toastTimer = setTimeout(() => {
            ui.toast.classList.remove("show");
        }, 2200);
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    /* ---------- Difficulty ---------- */

    function updateDifficulty() {
        const index = Math.max(
            0,
            Math.min(3, Number(ui.slider.value) || 0)
        );

        game.difficulty = LEVELS[index];

        const config = currentConfig();

        document.body.classList.remove(...LEVELS);
        document.body.classList.add(game.difficulty);

        ui.difficultyName.textContent = config.name;
        ui.difficultyDescription.textContent = config.description;
        ui.slider.setAttribute("aria-valuetext", config.name);
    }

    function onDifficultyChange() {
        const previous = game.difficulty;

        updateDifficulty();

        if (previous !== game.difficulty && game.started) {
            resetGameState();
            showToast("Difficulty changed. Start a new run.");
        } else {
            game.digits = Math.min(
                currentConfig().digits,
                PI_DECIMALS.length
            );
            updateHUD();
            updateProgress();
        }
    }

    /* ---------- Recall mode ---------- */

    function updateModeButtons() {
        ui.modeButtons.forEach(button => {
            const selected = button.dataset.mode === game.mode;

            button.classList.toggle("selected", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
    }

    function setMode(mode) {
        if (mode !== "digits" && mode !== "keypad") return;
        if (game.mode === mode) return;

        game.mode = mode;
        storageSet(MODE_KEY, mode);
        updateModeButtons();

        if (game.started) {
            resetGameState();
            showToast("Recall mode changed. Start a new run.");
        } else {
            updateIdleInstructions();
        }
    }

    function updateIdleInstructions() {
        if (game.mode === "digits") {
            ui.instructionHeading.textContent = "Read. Remember. Repeat.";
            ui.instructionText.textContent =
                "Study the digits displayed on the paper. The number pad will stay still.";
            ui.caption.textContent =
                "The digits after the decimal point are the sequence.";
        } else {
            ui.instructionHeading.textContent = "Watch. Remember. Repeat.";
            ui.instructionText.textContent =
                "Watch the number buttons blink in sequence. The digits will stay hidden on the paper.";
            ui.caption.textContent =
                "The sequence will be shown through the number pad.";
        }
    }

    /* ---------- HUD and progress ---------- */

    function updateHUD() {
        ui.round.textContent = game.round;
        ui.digits.textContent = game.digits;
        ui.best.textContent = game.best;
    }

    function updateProgress() {
        const target = Math.max(1, game.digits);
        const percent = Math.min(
            100,
            (game.playerIndex / target) * 100
        );

        ui.progress.style.width = `${percent}%`;
        ui.progressText.textContent =
            `${game.playerIndex} / ${game.digits}`;

        ui.progressBar.setAttribute("aria-valuemax", String(target));
        ui.progressBar.setAttribute(
            "aria-valuenow",
            String(game.playerIndex)
        );
    }

    function saveBest() {
        if (!storageSet(BEST_KEY, game.best)) {
            showToast("Browser storage is unavailable; this best may not persist.");
        }
    }

    function recordCompletedSequence(length) {
        game.completedDigits = Math.max(game.completedDigits, length);

        if (game.completedDigits > game.best) {
            game.best = game.completedDigits;
            game.newBestThisRun = true;
            saveBest();
        }

        updateHUD();
    }

    /* ---------- Specimen display ---------- */

    function renderPi(length, highlightedIndex = -1) {
        const safeLength = Math.max(
            0,
            Math.min(length, PI_DECIMALS.length)
        );

        const sequence = PI_DECIMALS
            .slice(0, safeLength)
            .map((digit, index) => {
                const escaped = escapeHTML(digit);

                return index === highlightedIndex
                    ? `<span class="pi-highlight">${escaped}</span>`
                    : escaped;
            })
            .join("");

        ui.pi.innerHTML =
            '<span class="pi-integer">3</span>' +
            '<span class="decimal-point">.</span>' +
            `<span class="pi-sequence">${sequence}</span>`;
    }

    function clearSpecimen() {
        ui.pi.innerHTML =
            '<span class="pi-integer">3</span>' +
            '<span class="decimal-point">.</span>';
    }

    /* ---------- Keypad ---------- */

    function getKey(value) {
        return ui.keys.find(
            button => button.dataset.value === String(value)
        ) || null;
    }

    function setKeysEnabled(enabled) {
        ui.keys.forEach(button => {
            button.disabled = !enabled;
        });
    }

    function clearKeyEffects() {
        ui.keys.forEach(button => {
            button.classList.remove("active", "correct", "wrong");
        });
    }

    function flashKey(value, token, duration) {
        if (!isCurrent(token)) return;

        const button = getKey(value);
        if (!button) return;

        button.classList.add("active");

        setTimeout(() => {
            if (isCurrent(token)) {
                button.classList.remove("active");
            }
        }, Math.max(70, duration - 60));
    }

    function showKeyResult(button, result) {
        if (!button) return;

        button.classList.remove("correct", "wrong");
        button.classList.add(result);

        setTimeout(() => {
            button.classList.remove(result);
        }, result === "wrong" ? 350 : 220);
    }

    /* ---------- Reset ---------- */

    function resetGameState() {
        // Invalidates pending animation sequences and countdowns.
        game.token++;

        game.started = false;
        game.accepting = false;
        game.activeRound = false;

        game.round = 1;
        game.digits = Math.min(
            currentConfig().digits,
            PI_DECIMALS.length
        );
        game.playerIndex = 0;
        game.completedDigits = 0;
        game.newBestThisRun = false;

        setKeysEnabled(false);
        clearKeyEffects();

        ui.start.disabled = false;
        ui.startLabel.textContent = "Begin experiment";

        ui.countdown.textContent = "";
        ui.progress.style.width = "0%";

        clearSpecimen();

        ui.newBestNote.classList.add("hidden");
        setStatus("Ready when you are.");

        updateHUD();
        updateProgress();
        updateIdleInstructions();

        setModal(ui.gameOver, false);
    }

    /* ---------- Start a run ---------- */

    function startGame() {
        if (game.started) return;

        resetGameState();

        game.started = true;
        game.digits = Math.min(
            currentConfig().digits,
            PI_DECIMALS.length
        );

        ui.start.disabled = true;
        ui.startLabel.textContent = "Experiment in progress";

        updateHUD();
        updateProgress();

        setModal(ui.gameOver, false);
        setModal(ui.instruction, false);

        const token = ++game.token;
        beginRound(token);
    }

    function restartGame() {
        resetGameState();
        startGame();
    }

    /* ---------- Round presentation ---------- */

    async function beginRound(token) {
        if (!isCurrent(token)) return;

        game.activeRound = true;
        game.accepting = false;
        game.playerIndex = 0;

        setKeysEnabled(false);
        clearKeyEffects();
        updateProgress();

        ui.instructionHeading.textContent =
            `Round ${game.round}: study the sequence`;

        ui.instructionText.textContent =
            game.mode === "digits"
                ? `Memorize the ${game.digits} decimal digit${game.digits === 1 ? "" : "s"} shown on the paper. The keypad will not flash.`
                : `Memorize the ${game.digits} digit${game.digits === 1 ? "" : "s"} shown by the blinking keypad. The digits will remain hidden.`;

        ui.caption.textContent =
            game.mode === "digits"
                ? `${game.digits} digit${game.digits === 1 ? "" : "s"} to remember`
                : "Follow the number pad. The digits are hidden.";

        ui.countdown.textContent = "";

        // Set up exactly one presentation mode before the round begins.
        clearSpecimen();
        clearKeyEffects();

        await sleep(350);
        if (!isCurrent(token)) return;

        await countdown(token);
        if (!isCurrent(token)) return;

        await playSequence(token);
    }

    /* ---------- Countdown ---------- */

    async function countdown(token) {
        const values = ["3", "2", "1", "Recall!"];

        for (const value of values) {
            if (!isCurrent(token)) return;

            ui.countdown.textContent = value;
            ui.countdown.classList.remove("pulse");

            void ui.countdown.offsetWidth;
            ui.countdown.classList.add("pulse");

            await sleep(value === "Recall!" ? 450 : 550);
        }

        if (isCurrent(token)) {
            ui.countdown.textContent = "";
        }
    }

    /* ---------- The single presentation mode ---------- */

    async function playSequence(token) {
        if (!isCurrent(token)) return;

        game.accepting = false;
        game.playerIndex = 0;

        setKeysEnabled(false);
        clearKeyEffects();
        updateProgress();

        const config = currentConfig();

        if (game.mode === "digits") {
            // MODE A: display the digits; keypad never blinks.
            clearKeyEffects();
            setStatus("Read the digits on the paper.");

            for (let i = 0; i < game.digits; i++) {
                if (!isCurrent(token)) return;

                renderPi(i + 1, i);

                await sleep(config.flash);

                if (!isCurrent(token)) return;
            }

            await sleep(250);
            if (!isCurrent(token)) return;

            clearSpecimen();
            ui.caption.textContent = "Your turn: enter the sequence.";
        } else {
            // MODE B: hide the digits; only the keypad blinks.
            clearSpecimen();
            clearKeyEffects();
            ui.caption.textContent = "Follow the number pad. The digits are hidden.";
            setStatus("Watch the number pad.");

            for (let i = 0; i < game.digits; i++) {
                if (!isCurrent(token)) return;

                flashKey(PI_DECIMALS[i], token, config.flash);

                await sleep(config.flash);

                if (!isCurrent(token)) return;
            }

            await sleep(180);
            if (!isCurrent(token)) return;

            clearKeyEffects();
            ui.caption.textContent = "Your turn: enter the sequence.";
        }

        if (!isCurrent(token)) return;

        // Both modes converge here, after their separate presentations.
        game.accepting = true;
        setKeysEnabled(true);

        ui.instructionHeading.textContent = "Now recall the sequence.";
        ui.instructionText.textContent =
            "Enter the digits in the order you saw them. The decimal point is not an input.";

        setStatus("Your turn. Enter the sequence.");
    }

    /* ---------- Input ---------- */

    function handleInput(value, button) {
        if (!game.started || !game.activeRound) return;

        if (!game.accepting) {
            showToast("Wait until the sequence finishes.");
            return;
        }

        if (!/^[0-9]$/.test(String(value))) return;

        const expected = PI_DECIMALS[game.playerIndex];

        if (String(value) !== expected) {
            showKeyResult(button, "wrong");
            gameOver();
            return;
        }

        showKeyResult(button, "correct");

        game.playerIndex++;
        updateProgress();

        setStatus(`Correct: ${game.playerIndex} of ${game.digits} digits.`);

        if (game.playerIndex >= game.digits) {
            roundComplete();
        }
    }

    /* ---------- Round completion ---------- */

    async function roundComplete() {
        if (!game.started || !game.activeRound) return;

        game.accepting = false;
        game.activeRound = false;
        setKeysEnabled(false);

        const completedLength = game.digits;
        recordCompletedSequence(completedLength);

        ui.caption.textContent =
            `You recalled ${completedLength} digit${completedLength === 1 ? "" : "s"} correctly.`;

        setStatus(`Round ${game.round} completed.`);
        showToast("Round completed.");

        const token = ++game.token;

        await sleep(650);
        if (!isCurrent(token) || !game.started) return;

        if (completedLength >= PI_DECIMALS.length) {
            finishExperiment();
            return;
        }

        game.round++;

        game.digits = Math.min(
            completedLength + currentConfig().increment,
            PI_DECIMALS.length
        );

        game.playerIndex = 0;

        updateHUD();
        updateProgress();

        await beginRound(token);
    }

    /* ---------- Game over ---------- */

    function gameOver() {
        if (!game.started) return;

        game.token++;
        game.started = false;
        game.accepting = false;
        game.activeRound = false;

        setKeysEnabled(false);

        ui.start.disabled = false;
        ui.startLabel.textContent = "Try again";

        ui.finalScore.textContent =
            `${game.completedDigits} ${game.completedDigits === 1 ? "digit" : "digits"}`;

        ui.difficultyResult.textContent = currentConfig().name;
        ui.roundsResult.textContent = String(game.round - 1);

        ui.resultMessage.textContent =
            game.completedDigits > 0
                ? "The next sequence was harder to hold. Build on the longest sequence you completed."
                : "The first sequence is a starting point. Try again and give your memory another attempt.";

        ui.newBestNote.classList.toggle("hidden", !game.newBestThisRun);

        setModal(ui.gameOver, true);
        ui.restart.focus();
    }

    function finishExperiment() {
        game.token++;
        game.started = false;
        game.accepting = false;
        game.activeRound = false;

        recordCompletedSequence(PI_DECIMALS.length);
        setKeysEnabled(false);

        ui.start.disabled = false;
        ui.startLabel.textContent = "Play again";

        ui.finalScore.textContent = `${PI_DECIMALS.length} digits`;
        ui.difficultyResult.textContent = currentConfig().name;
        ui.roundsResult.textContent = String(game.round);

        ui.resultMessage.textContent =
            "You recalled every decimal digit available in this version of the experiment.";

        ui.newBestNote.classList.toggle("hidden", !game.newBestThisRun);

        setModal(ui.gameOver, true);
    }

    /* ---------- Review all available digits ---------- */

    function reviewPi() {
        resetGameState();

        renderPi(PI_DECIMALS.length);
        ui.caption.textContent =
            `This version contains ${PI_DECIMALS.length} decimal digits.`;

        ui.instructionHeading.textContent = "The available digits of π";
        ui.instructionText.textContent =
            "This is a reference view, not a game round. Start a new experiment when you are ready.";

        setModal(ui.gameOver, false);
    }

    /* ---------- Onboarding ---------- */

    function openOnboarding() {
        setModal(ui.instruction, true);
        ui.closeInstructions.focus();
    }

    function closeOnboarding() {
        if (ui.dontShowIntro.checked) {
            storageSet(INTRO_KEY, "true");
        }

        setModal(ui.instruction, false);
    }

    /* ---------- Events ---------- */

    function bindEvents() {
        ui.start.addEventListener("click", startGame);
        ui.restart.addEventListener("click", restartGame);

        ui.introStart.addEventListener("click", closeOnboarding);
        ui.closeInstructions.addEventListener("click", closeOnboarding);
        ui.helpButton.addEventListener("click", openOnboarding);

        ui.closeResults.addEventListener("click", () => {
            setModal(ui.gameOver, false);
        });

        ui.reviewPi.addEventListener("click", reviewPi);
        ui.slider.addEventListener("input", onDifficultyChange);

        ui.modeButtons.forEach(button => {
            button.addEventListener("click", () => {
                setMode(button.dataset.mode);
            });
        });

        ui.keys.forEach(button => {
            button.addEventListener("click", () => {
                handleInput(button.dataset.value, button);
            });
        });

        document.addEventListener("keydown", event => {
            if (
                event.repeat ||
                event.ctrlKey ||
                event.altKey ||
                event.metaKey
            ) {
                return;
            }

            const target = event.target;

            if (
                target instanceof HTMLElement &&
                (
                    target.isContentEditable ||
                    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
                )
            ) {
                return;
            }

            if (/^[0-9]$/.test(event.key)) {
                event.preventDefault();
                handleInput(event.key, getKey(event.key));
            }

            if (event.key === "Escape") {
                if (!ui.instruction.classList.contains("hidden")) {
                    setModal(ui.instruction, false);
                } else if (!ui.gameOver.classList.contains("hidden")) {
                    setModal(ui.gameOver, false);
                }
            }
        });
    }

    /* ---------- Initialize ---------- */

    function init() {
        updateDifficulty();
        updateModeButtons();
        updateHUD();
        resetGameState();
        bindEvents();

        const introDismissed = storageGet(INTRO_KEY, "false") === "true";

        if (!introDismissed) {
            setModal(ui.instruction, true);
        }

        updateIdleInstructions();
    }

    init();
})();
