// Crosswire - Interactive Crossword Prototype
// Progressive Reveal + Rebus Multi-Letter Support + Rainbow Motion UI

const PUZZLE_BANK = [
    {
        id: "puz_nature",
        theme: "Nature & Warmth",
        difficulty: "Easy",
        clues: {
            "1": { text: "Opposite of cold.", hint: "3 letters" },
            "2": { text: "The bright yellow star in our daytime sky.", hint: "3 letters" },
            "3": { text: "Solid water when frozen.", hint: "3 letters (Box 1 is a Rebus cell)" }
        },
        solutions: {
            1: "HOT",
            2: "SUN",
            3: ["ICE", "C", "E"]
        }
    },
    {
        id: "puz_animals",
        theme: "Friendly Creatures",
        difficulty: "Easy",
        clues: {
            "1": { text: "Loyal pet that wags its tail and barks.", hint: "3 letters" },
            "2": { text: "Independent feline that purrs and catches mice.", hint: "3 letters" },
            "3": { text: "Creature with fins that swims in rivers or oceans.", hint: "3 letters (Box 1 is a Rebus cell)" }
        },
        solutions: {
            1: "DOG",
            2: "CAT",
            3: ["FISH", "S", "H"]
        }
    },
    {
        id: "puz_sky",
        theme: "Sky & Horizons",
        difficulty: "Easy",
        clues: {
            "1": { text: "Hours between sunrise and sunset.", hint: "3 letters" },
            "2": { text: "Atmospheric expanse above us on a clear day.", hint: "3 letters" },
            "3": { text: "Twinkling celestial body seen at night.", hint: "3 letters (Box 1 is a Rebus cell)" }
        },
        solutions: {
            1: "DAY",
            2: "SKY",
            3: ["STAR", "R", "Y"]
        }
    },
    {
        id: "puz_colors",
        theme: "Vibrant Spectrum",
        difficulty: "Easy",
        clues: {
            "1": { text: "Primary color of rubies and stop signs.", hint: "3 letters" },
            "2": { text: "Tiny insect that lives in colonies and builds hills.", hint: "3 letters" },
            "3": { text: "Color of lush grass and emeralds.", hint: "3 letters (Box 1 is a Rebus cell)" }
        },
        solutions: {
            1: "RED",
            2: "ANT",
            3: ["GREEN", "E", "N"]
        }
    }
];

let currentPuzzleId = "puz_nature";
let currentPuzzle = PUZZLE_BANK[0];
let currentStage = 1;
let secondsElapsed = 0;
let timerInterval = null;
let puzzleFinished = false;

// Audio Synthesizer (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep(freq = 440, type = 'sine', duration = 0.05, gainVal = 0.06) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

function playUnlockChime() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
        setTimeout(() => playBeep(freq, 'sine', 0.25, 0.12), i * 90);
    });
}

function playVictoryChime() {
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    notes.forEach((freq, i) => {
        setTimeout(() => playBeep(freq, 'triangle', 0.45, 0.18), i * 110);
    });
}

// Timer
function startTimer() {
    clearInterval(timerInterval);
    secondsElapsed = 0;
    timerInterval = setInterval(() => {
        if (!puzzleFinished) {
            secondsElapsed++;
            const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
            const secs = String(secondsElapsed % 60).padStart(2, '0');
            document.getElementById('timerDisplay').innerText = `${mins}:${secs}`;
        }
    }, 1000);
}

// Load a New Dynamic Puzzle
async function loadNewPuzzle(specificId = null) {
    closeModal();
    let data = null;

    // Try fetching from API first if running with backend
    try {
        const url = specificId ? `/api/puzzle/init?id=${specificId}` : `/api/puzzle/init`;
        const res = await fetch(url);
        if (res.ok) {
            data = await res.json();
            currentPuzzleId = data.puzzleId;
        }
    } catch (e) {
        // Fallback to standalone client-side puzzle bank
    }

    if (!data) {
        // Standalone selection
        let pool = PUZZLE_BANK.filter(p => p.id !== currentPuzzleId);
        if (specificId) {
            const match = PUZZLE_BANK.find(p => p.id === specificId);
            if (match) currentPuzzle = match;
            else currentPuzzle = pool[Math.floor(Math.random() * pool.length)];
        } else {
            currentPuzzle = pool[Math.floor(Math.random() * pool.length)];
        }
        currentPuzzleId = currentPuzzle.id;
        data = {
            puzzleId: currentPuzzle.id,
            theme: currentPuzzle.theme,
            clues: currentPuzzle.clues
        };
    }

    document.getElementById('puzzleThemeTag').innerText = `Theme: ${data.theme}`;
    
    // Populate Clues
    document.getElementById('text-1').innerText = data.clues["1"].text;
    document.getElementById('hint-1').innerText = data.clues["1"].hint || "3 letters";
    
    document.getElementById('text-2').innerText = data.clues["2"].text;
    document.getElementById('hint-2').innerText = data.clues["2"].hint || "3 letters";

    document.getElementById('text-3').innerText = data.clues["3"].text;
    document.getElementById('hint-3').innerText = data.clues["3"].hint || "3 letters";

    resetBoard();
}

// Grid navigation & input handling
function initGrid() {
    const inputs = document.querySelectorAll('.cell-tile input');
    
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            input.value = input.value.toUpperCase();
            
            // Pop bounce animation on tile
            const tile = input.parentElement;
            tile.classList.add('pop');
            setTimeout(() => tile.classList.remove('pop'), 250);

            playBeep(520 + Math.random() * 40, 'triangle', 0.04, 0.06);
            
            const [_, row, col] = input.id.split('-').map(Number);
            
            // Auto advance
            if (input.value.length >= 1 && col < 2 && row === (currentStage - 1)) {
                const next = document.getElementById(`c-${row}-${col + 1}`);
                if (next && !next.disabled) next.focus();
            }

            // Check if current row is complete
            checkIfRowFilled(row);
        });

        input.addEventListener('keydown', (e) => {
            const [_, row, col] = input.id.split('-').map(Number);

            if (e.key === 'Backspace' && input.value === '' && col > 0) {
                const prev = document.getElementById(`c-${row}-${col - 1}`);
                if (prev && !prev.disabled) {
                    prev.focus();
                    prev.value = '';
                }
            } else if (e.key === 'ArrowRight' && col < 2) {
                const next = document.getElementById(`c-${row}-${col + 1}`);
                if (next && !next.disabled) next.focus();
            } else if (e.key === 'ArrowLeft' && col > 0) {
                const prev = document.getElementById(`c-${row}-${col - 1}`);
                if (prev && !prev.disabled) prev.focus();
            } else if (e.key === 'Enter') {
                checkCurrentStage(true);
            }
        });
    });
}

function checkIfRowFilled(row) {
    if (row !== (currentStage - 1)) return;

    const c0 = document.getElementById(`c-${row}-0`).value.trim();
    const c1 = document.getElementById(`c-${row}-1`).value.trim();
    const c2 = document.getElementById(`c-${row}-2`).value.trim();

    if (row === 0 || row === 1) {
        if (c0.length === 1 && c1.length === 1 && c2.length === 1) {
            checkCurrentStage(false);
        }
    } else if (row === 2) {
        // Stage 3 with Rebus
        if (c0.length >= 2 && c1.length === 1 && c2.length === 1) {
            checkCurrentStage(false);
        }
    }
}

// Stage Validation Logic (Supports both API & Standalone)
async function checkCurrentStage(manualCheck = false) {
    let payload = {
        puzzleId: currentPuzzleId,
        stage: currentStage,
        answers: {}
    };

    let userWord = "";
    if (currentStage === 1) {
        const c0 = document.getElementById('c-0-0').value.trim();
        const c1 = document.getElementById('c-0-1').value.trim();
        const c2 = document.getElementById('c-0-2').value.trim();
        if (c0.length === 1 && c1.length === 1 && c2.length === 1) {
            userWord = `${c0}${c1}${c2}`;
            payload.answers["1A"] = userWord;
        } else {
            if (manualCheck) alert("Please complete 1 Across first.");
            return;
        }
    } else if (currentStage === 2) {
        const c0 = document.getElementById('c-1-0').value.trim();
        const c1 = document.getElementById('c-1-1').value.trim();
        const c2 = document.getElementById('c-1-2').value.trim();
        if (c0.length === 1 && c1.length === 1 && c2.length === 1) {
            userWord = `${c0}${c1}${c2}`;
            payload.answers["2A"] = userWord;
        } else {
            if (manualCheck) alert("Please complete 2 Across first.");
            return;
        }
    } else if (currentStage === 3) {
        const c0 = document.getElementById('c-2-0').value.trim();
        const c1 = document.getElementById('c-2-1').value.trim();
        const c2 = document.getElementById('c-2-2').value.trim();
        if (c0.length >= 2 && c1.length === 1 && c2.length === 1) {
            payload.answers["3A"] = [c0, c1, c2];
        } else {
            if (manualCheck) alert("Please complete 3 Across (Remember: box 1 accepts a multi-letter Rebus word!).");
            return;
        }
    }

    let result = null;

    // Try API
    try {
        const res = await fetch('/api/puzzle/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            result = await res.json();
        }
    } catch (e) {
        // Fallback to local validation
    }

    // Local Validation fallback
    if (!result) {
        const activePuz = PUZZLE_BANK.find(p => p.id === currentPuzzleId) || PUZZLE_BANK[0];
        const expected = activePuz.solutions[currentStage];
        let isCorrect = false;

        if (currentStage === 1 || currentStage === 2) {
            isCorrect = (userWord === expected);
        } else if (currentStage === 3) {
            const userArr = payload.answers["3A"];
            isCorrect = (
                userArr[0].toUpperCase() === expected[0] &&
                userArr[1].toUpperCase() === expected[1] &&
                userArr[2].toUpperCase() === expected[2]
            );
        }

        result = {
            success: isCorrect,
            nextStage: currentStage + 1,
            puzzleFinished: (currentStage === 3 && isCorrect),
            message: isCorrect ? "Stage solved!" : "Incorrect word, try again!"
        };
    }

    if (result.success) {
        playUnlockChime();

        // Mark previous clue solved
        const prevCard = document.getElementById(`clueCard-${currentStage}`);
        prevCard.classList.remove('active');
        prevCard.classList.add('solved');
        document.getElementById(`badge-${currentStage}`).innerText = 'SOLVED ✓';
        document.getElementById(`badge-${currentStage}`).style.color = '#10b981';

        if (result.puzzleFinished) {
            puzzleFinished = true;
            finishPuzzle();
        } else {
            currentStage = result.nextStage;
            unlockStage(currentStage);
        }
    } else if (manualCheck) {
        alert(result.message || "Incorrect word, try again!");
    }
}

function unlockStage(stage) {
    document.getElementById('progressCounter').innerText = `Stage ${stage} of 3`;

    // Unlock Clue card with pulse animation
    const card = document.getElementById(`clueCard-${stage}`);
    card.classList.remove('locked');
    card.classList.add('active', 'just-unlocked');
    setTimeout(() => card.classList.remove('just-unlocked'), 1200);

    document.getElementById(`badge-${stage}`).innerText = 'IN PROGRESS';
    document.getElementById(`badge-${stage}`).style.color = '#06b6d4';

    const rowIdx = stage - 1;
    // Staggered 3D Flip Card Animation
    for (let col = 0; col < 3; col++) {
        const tile = document.getElementById(`tile-${rowIdx}-${col}`);
        const input = document.getElementById(`c-${rowIdx}-${col}`);

        setTimeout(() => {
            tile.classList.add('unlocking');
            tile.classList.remove('locked');
            input.disabled = false;
            
            const badge = tile.querySelector('.lock-badge');
            if (badge) badge.remove();

            if (stage === 3 && col === 0) {
                tile.classList.add('rebus');
                document.getElementById('rebus-tag-3').style.display = 'block';
            }
            if (col === 0) input.focus();
        }, col * 140);
    }
}

async function finishPuzzle() {
    playVictoryChime();
    launchRainbowCelebration();
    
    try {
        await fetch('/api/puzzle/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timeSeconds: secondsElapsed, puzzleId: currentPuzzleId })
        });
    } catch (e) {}

    const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById('finalTimeVal').innerText = `${mins}:${secs}`;
    document.getElementById('completionModal').classList.add('open');
}

function closeModal() {
    document.getElementById('completionModal').classList.remove('open');
}

function resetBoard() {
    currentStage = 1;
    puzzleFinished = false;
    startTimer();
    document.getElementById('progressCounter').innerText = `Stage 1 of 3`;

    const inputs = document.querySelectorAll('.cell-tile input');
    inputs.forEach(inp => {
        inp.value = '';
        inp.placeholder = '';
    });

    // Re-lock rows 1 and 2
    [1, 2].forEach(r => {
        for (let c = 0; c < 3; c++) {
            const tile = document.getElementById(`tile-${r}-${c}`);
            const input = document.getElementById(`c-${r}-${c}`);
            tile.className = 'cell-tile locked';
            tile.classList.remove('unlocking');
            input.disabled = true;

            if (!tile.querySelector('.lock-badge')) {
                const b = document.createElement('div');
                b.className = 'lock-badge';
                b.innerText = '🔒';
                tile.appendChild(b);
            }
        }
    });

    document.getElementById('rebus-tag-3').style.display = 'none';

    // Reset Clue Cards
    const card1 = document.getElementById('clueCard-1');
    card1.className = 'clue-item active';
    document.getElementById('badge-1').innerText = 'IN PROGRESS';
    document.getElementById('badge-1').style.color = '#94a3b8';

    const card2 = document.getElementById('clueCard-2');
    card2.className = 'clue-item locked';
    document.getElementById('badge-2').innerText = 'LOCKED';
    document.getElementById('badge-2').style.color = '#94a3b8';

    const card3 = document.getElementById('clueCard-3');
    card3.className = 'clue-item locked';
    document.getElementById('badge-3').innerText = 'LOCKED';
    document.getElementById('badge-3').style.color = '#94a3b8';

    const first = document.getElementById('c-0-0');
    if (first) first.focus();
}

// Auto-Demonstration for fast client review
function autoSolveDemonstration() {
    resetBoard();
    
    const puzzleAnswers = {
        "puz_nature": { r1: "HOT", r2: "SUN", r3: ["ICE", "C", "E"] },
        "puz_animals": { r1: "DOG", r2: "CAT", r3: ["FISH", "S", "H"] },
        "puz_sky": { r1: "DAY", r2: "SKY", r3: ["STAR", "R", "Y"] },
        "puz_colors": { r1: "RED", r2: "ANT", r3: ["GREEN", "E", "N"] }
    };

    const sol = puzzleAnswers[currentPuzzleId] || puzzleAnswers["puz_nature"];

    setTimeout(() => { document.getElementById('c-0-0').value = sol.r1[0]; playBeep(520); }, 200);
    setTimeout(() => { document.getElementById('c-0-1').value = sol.r1[1]; playBeep(560); }, 400);
    setTimeout(() => { 
        document.getElementById('c-0-2').value = sol.r1[2]; 
        checkCurrentStage(false);
    }, 600);

    setTimeout(() => { document.getElementById('c-1-0').value = sol.r2[0]; playBeep(520); }, 1300);
    setTimeout(() => { document.getElementById('c-1-1').value = sol.r2[1]; playBeep(560); }, 1500);
    setTimeout(() => { 
        document.getElementById('c-1-2').value = sol.r2[2]; 
        checkCurrentStage(false);
    }, 1700);

    setTimeout(() => { document.getElementById('c-2-0').value = sol.r3[0]; playBeep(600); }, 2400);
    setTimeout(() => { document.getElementById('c-2-1').value = sol.r3[1]; playBeep(640); }, 2600);
    setTimeout(() => { 
        document.getElementById('c-2-2').value = sol.r3[2]; 
        checkCurrentStage(false);
    }, 2800);
}

// Rainbow Canvas Particle Celebration
function launchRainbowCelebration() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#06b6d4', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#3b82f6', '#ffffff'];

    for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 16 + 4;
        particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            radius: Math.random() * 5 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 1,
            decay: Math.random() * 0.012 + 0.008,
            gravity: 0.25
        });
    }

    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let active = false;

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;

            if (p.alpha > 0) {
                active = true;
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.shadowBlur = 12;
                ctx.shadowColor = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        });

        if (active) requestAnimationFrame(render);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    render();
}

// Initialize on Load
window.addEventListener('DOMContentLoaded', () => {
    initGrid();
    loadNewPuzzle();
});
