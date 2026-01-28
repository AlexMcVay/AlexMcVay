// Sequence Hunter - A Sequential Vigilance Task Game

class SequenceHunter {
    constructor() {
        // Game state
        this.isRunning = false;
        this.score = 0;
        this.level = 1;
        this.combo = 1;
        this.bestCombo = 1;
        this.timeRemaining = 60;
        this.hits = 0;
        this.misses = 0;
        this.falseAlarms = 0;

        // Game mechanics
        this.buffer = [];
        this.targetSequences = [];
        this.sequenceLength = 3;
        this.tickInterval = 800; // ms between numbers
        this.baseTickInterval = 800;
        this.minTickInterval = 300;
        this.targetProbability = 0.20; // 20% chance to start a target sequence

        // Sequence feeding state
        this.feedingSequence = null;
        this.feedingIndex = 0;

        // Active sequence tracking (for miss detection)
        this.activeSequenceMatch = null;
        this.hitWindowActive = false;

        // Timers
        this.tickTimer = null;
        this.gameTimer = null;
        this.feedbackTimer = null;

        // DOM Elements
        this.screens = {
            start: document.getElementById('start-screen'),
            game: document.getElementById('game-screen'),
            gameover: document.getElementById('gameover-screen')
        };

        this.elements = {
            score: document.getElementById('score'),
            level: document.getElementById('level'),
            combo: document.getElementById('combo'),
            timer: document.getElementById('timer'),
            currentNumber: document.getElementById('current-number'),
            streamDisplay: document.getElementById('stream-display'),
            feedback: document.getElementById('feedback'),
            hitBtn: document.getElementById('hit-btn'),
            startBtn: document.getElementById('start-btn'),
            restartBtn: document.getElementById('restart-btn'),
            bufferDisplay: [
                document.getElementById('buffer-0'),
                document.getElementById('buffer-1'),
                document.getElementById('buffer-2')
            ],
            targets: [
                document.getElementById('target-0'),
                document.getElementById('target-1'),
                document.getElementById('target-2')
            ],
            finalScore: document.getElementById('final-score'),
            finalLevel: document.getElementById('final-level'),
            finalHits: document.getElementById('final-hits'),
            finalMisses: document.getElementById('final-misses'),
            finalFalseAlarms: document.getElementById('final-false-alarms'),
            finalBestCombo: document.getElementById('final-best-combo')
        };

        this.bindEvents();
    }

    bindEvents() {
        this.elements.startBtn.addEventListener('click', () => this.startGame());
        this.elements.restartBtn.addEventListener('click', () => this.startGame());
        this.elements.hitBtn.addEventListener('click', () => this.handleHit());

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.isRunning) {
                e.preventDefault();
                this.handleHit();
            }
        });
    }

    showScreen(screenName) {
        Object.values(this.screens).forEach(screen => screen.classList.add('hidden'));
        this.screens[screenName].classList.remove('hidden');
    }

    startGame() {
        // Reset state
        this.isRunning = true;
        this.score = 0;
        this.level = 1;
        this.combo = 1;
        this.bestCombo = 1;
        this.timeRemaining = 60;
        this.hits = 0;
        this.misses = 0;
        this.falseAlarms = 0;
        this.buffer = [];
        this.sequenceLength = 3;
        this.tickInterval = this.baseTickInterval;
        this.feedingSequence = null;
        this.feedingIndex = 0;
        this.activeSequenceMatch = null;
        this.hitWindowActive = false;

        // Generate target sequences
        this.generateTargetSequences();

        // Update UI
        this.updateHUD();
        this.updateBufferDisplay();
        this.updateTargetDisplay();
        this.elements.currentNumber.textContent = '-';

        // Show game screen
        this.showScreen('game');

        // Start timers
        this.startTick();
        this.startGameTimer();
    }

    generateTargetSequences() {
        this.targetSequences = [];
        const usedSequences = new Set();

        while (this.targetSequences.length < 3) {
            const sequence = this.generateSingleSequence();
            const sequenceKey = sequence.join('-');

            // Check for uniqueness and avoid easy patterns
            if (!usedSequences.has(sequenceKey) && !this.isEasySequence(sequence)) {
                // Also check it doesn't overlap with existing sequences
                let overlaps = false;
                for (const existing of this.targetSequences) {
                    if (this.sequencesOverlap(sequence, existing)) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    this.targetSequences.push(sequence);
                    usedSequences.add(sequenceKey);
                }
            }
        }
    }

    generateSingleSequence() {
        const sequence = [];
        for (let i = 0; i < this.sequenceLength; i++) {
            sequence.push(Math.floor(Math.random() * 10));
        }
        return sequence;
    }

    isEasySequence(sequence) {
        // Check for ascending sequences like 1-2-3
        let ascending = true;
        let descending = true;
        let allSame = true;

        for (let i = 1; i < sequence.length; i++) {
            if (sequence[i] !== sequence[i-1] + 1) ascending = false;
            if (sequence[i] !== sequence[i-1] - 1) descending = false;
            if (sequence[i] !== sequence[i-1]) allSame = false;
        }

        return ascending || descending || allSame;
    }

    sequencesOverlap(seq1, seq2) {
        // Check if one sequence is a rotation or has significant overlap with another
        const str1 = seq1.join('-');
        const str2 = seq2.join('-');

        // Check if they share the same first two or last two digits
        if (seq1[0] === seq2[0] && seq1[1] === seq2[1]) return true;
        if (seq1[1] === seq2[1] && seq1[2] === seq2[2]) return true;

        return str1 === str2;
    }

    startTick() {
        this.tickTimer = setInterval(() => this.tick(), this.tickInterval);
    }

    stopTick() {
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }
    }

    startGameTimer() {
        this.gameTimer = setInterval(() => {
            this.timeRemaining--;
            this.elements.timer.textContent = this.timeRemaining;

            if (this.timeRemaining <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    stopGameTimer() {
        if (this.gameTimer) {
            clearInterval(this.gameTimer);
            this.gameTimer = null;
        }
    }

    tick() {
        // Check for miss from previous tick
        if (this.hitWindowActive && this.activeSequenceMatch !== null) {
            this.handleMiss();
        }

        // Generate next number
        const nextNumber = this.getNextNumber();

        // Update buffer
        this.buffer.push(nextNumber);
        if (this.buffer.length > this.sequenceLength) {
            this.buffer.shift();
        }

        // Display number with animation
        this.displayNumber(nextNumber);

        // Update buffer display
        this.updateBufferDisplay();

        // Check for sequence match
        this.checkForMatch();

        // Highlight partial matches
        this.highlightPartialMatches();
    }

    getNextNumber() {
        // If we're currently feeding a sequence, continue it
        if (this.feedingSequence !== null) {
            const num = this.feedingSequence[this.feedingIndex];
            this.feedingIndex++;

            if (this.feedingIndex >= this.feedingSequence.length) {
                this.feedingSequence = null;
                this.feedingIndex = 0;
            }

            return num;
        }

        // Check if we should start feeding a target sequence (20% chance)
        if (Math.random() < this.targetProbability) {
            // Pick a random target sequence
            const targetIndex = Math.floor(Math.random() * this.targetSequences.length);
            this.feedingSequence = [...this.targetSequences[targetIndex]];
            this.feedingIndex = 1; // We'll return the first number now
            return this.feedingSequence[0];
        }

        // Generate random number
        return Math.floor(Math.random() * 10);
    }

    displayNumber(number) {
        const display = this.elements.currentNumber;
        display.style.opacity = '0';

        setTimeout(() => {
            display.textContent = number;
            display.style.opacity = '1';
        }, 50);
    }

    updateBufferDisplay() {
        for (let i = 0; i < this.sequenceLength; i++) {
            const el = this.elements.bufferDisplay[i];
            if (i < this.buffer.length) {
                el.textContent = this.buffer[i];
                el.classList.add('active');
            } else {
                el.textContent = '-';
                el.classList.remove('active');
            }
        }
    }

    updateTargetDisplay() {
        this.targetSequences.forEach((sequence, index) => {
            const targetBox = this.elements.targets[index];
            const nums = targetBox.querySelectorAll('.target-num');

            sequence.forEach((num, i) => {
                nums[i].textContent = num;
            });
        });
    }

    checkForMatch() {
        if (this.buffer.length < this.sequenceLength) {
            this.hitWindowActive = false;
            this.activeSequenceMatch = null;
            return;
        }

        for (let i = 0; i < this.targetSequences.length; i++) {
            if (this.arraysEqual(this.buffer, this.targetSequences[i])) {
                this.hitWindowActive = true;
                this.activeSequenceMatch = i;
                return;
            }
        }

        this.hitWindowActive = false;
        this.activeSequenceMatch = null;
    }

    highlightPartialMatches() {
        // Reset all targets
        this.elements.targets.forEach(target => {
            target.classList.remove('matched', 'partial');
        });

        if (this.buffer.length < 2) return;

        // Check for partial matches (last 2 digits match first 2 of a target)
        const lastTwo = this.buffer.slice(-2);

        for (let i = 0; i < this.targetSequences.length; i++) {
            const target = this.targetSequences[i];

            // Full match
            if (this.hitWindowActive && this.activeSequenceMatch === i) {
                this.elements.targets[i].classList.add('matched');
            }
            // Partial match (first 2 digits)
            else if (lastTwo[0] === target[0] && lastTwo[1] === target[1]) {
                this.elements.targets[i].classList.add('partial');
            }
        }
    }

    handleHit() {
        if (!this.isRunning) return;

        if (this.hitWindowActive && this.activeSequenceMatch !== null) {
            // Correct hit!
            this.hits++;
            const points = 100 * this.combo;
            this.score += points;
            this.combo++;
            if (this.combo > this.bestCombo) {
                this.bestCombo = this.combo;
            }

            this.showFeedback(`+${points} points!`, 'correct');
            this.flashStream('correct');

            // Reset hit window
            this.hitWindowActive = false;
            this.activeSequenceMatch = null;

            // Check for level up
            this.checkLevelUp();
        } else {
            // False alarm!
            this.falseAlarms++;
            this.score = Math.max(0, this.score - 50);
            this.combo = 1;

            this.showFeedback('-50 points! False Alarm', 'incorrect');
            this.flashStream('incorrect');
        }

        this.updateHUD();
    }

    handleMiss() {
        this.misses++;
        this.combo = 1;

        this.showFeedback('MISS! Combo Reset', 'miss');
        this.flashStream('miss');

        this.hitWindowActive = false;
        this.activeSequenceMatch = null;

        this.updateHUD();
    }

    showFeedback(message, type) {
        const feedback = this.elements.feedback;
        feedback.textContent = message;
        feedback.className = `feedback ${type}`;
        feedback.classList.remove('hidden');

        // Clear any existing timer
        if (this.feedbackTimer) {
            clearTimeout(this.feedbackTimer);
        }

        this.feedbackTimer = setTimeout(() => {
            feedback.classList.add('hidden');
        }, 1000);
    }

    flashStream(type) {
        const stream = this.elements.streamDisplay;
        stream.classList.remove('correct', 'incorrect', 'miss');

        // Force reflow to restart animation
        void stream.offsetWidth;

        stream.classList.add(type);

        setTimeout(() => {
            stream.classList.remove(type);
        }, 500);
    }

    checkLevelUp() {
        const hitsForNextLevel = this.level * 5;

        if (this.hits >= hitsForNextLevel) {
            this.level++;

            // Increase difficulty
            this.tickInterval = Math.max(
                this.minTickInterval,
                this.baseTickInterval - (this.level - 1) * 50
            );

            // Restart tick with new interval
            this.stopTick();
            this.startTick();

            // Increase sequence length at level 5
            if (this.level === 5 && this.sequenceLength === 3) {
                this.sequenceLength = 4;
                this.generateTargetSequences();
                this.updateTargetDisplay();
                this.updateBufferDisplaySlots();
            }

            // Generate new target sequences every 3 levels
            if (this.level % 3 === 0) {
                this.generateTargetSequences();
                this.updateTargetDisplay();
            }

            // Show level up notification
            this.showLevelUp();

            // Add bonus time
            this.timeRemaining = Math.min(60, this.timeRemaining + 10);
        }

        this.updateHUD();
    }

    updateBufferDisplaySlots() {
        // For when sequence length increases, we'd need to add more buffer slots
        // This is a simplified version - in production you'd dynamically create elements
        const bufferContainer = document.querySelector('.buffer-display');

        // Clear existing buffer nums (except label)
        const existingNums = bufferContainer.querySelectorAll('.buffer-num');
        existingNums.forEach(el => el.remove());

        // Create new buffer display elements
        this.elements.bufferDisplay = [];
        for (let i = 0; i < this.sequenceLength; i++) {
            const span = document.createElement('span');
            span.id = `buffer-${i}`;
            span.className = 'buffer-num';
            span.textContent = '-';
            bufferContainer.appendChild(span);
            this.elements.bufferDisplay.push(span);
        }

        // Update target boxes for longer sequences
        this.elements.targets.forEach((target, idx) => {
            target.innerHTML = '';
            for (let i = 0; i < this.sequenceLength; i++) {
                const numSpan = document.createElement('span');
                numSpan.className = 'target-num';
                numSpan.textContent = this.targetSequences[idx] ? this.targetSequences[idx][i] : '-';
                target.appendChild(numSpan);

                if (i < this.sequenceLength - 1) {
                    const sepSpan = document.createElement('span');
                    sepSpan.className = 'target-sep';
                    sepSpan.textContent = '-';
                    target.appendChild(sepSpan);
                }
            }
        });
    }

    showLevelUp() {
        const notification = document.createElement('div');
        notification.className = 'level-up';
        notification.textContent = `Level ${this.level}!`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 1500);
    }

    updateHUD() {
        this.elements.score.textContent = this.score;
        this.elements.level.textContent = this.level;
        this.elements.combo.textContent = `x${this.combo}`;
        this.elements.timer.textContent = this.timeRemaining;
    }

    endGame() {
        this.isRunning = false;
        this.stopTick();
        this.stopGameTimer();

        // Update final stats
        this.elements.finalScore.textContent = this.score;
        this.elements.finalLevel.textContent = this.level;
        this.elements.finalHits.textContent = this.hits;
        this.elements.finalMisses.textContent = this.misses;
        this.elements.finalFalseAlarms.textContent = this.falseAlarms;
        this.elements.finalBestCombo.textContent = `x${this.bestCombo}`;

        // Show game over screen
        this.showScreen('gameover');
    }

    arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        for (let i = 0; i < arr1.length; i++) {
            if (arr1[i] !== arr2[i]) return false;
        }
        return true;
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SequenceHunter();
});
