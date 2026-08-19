// Simple audio context based feedback to avoid external dependencies or large files

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const playTone = (freq, type, duration, delay = 0) => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + delay + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + duration);
};

export const playSuccessBeep = () => {
    try {
        // High pitch success chime
        playTone(880, 'sine', 0.1);
        playTone(1760, 'sine', 0.2, 0.1);
        triggerVibration([50, 50, 50]);
    } catch (e) { console.error("Audio error", e); }
};

export const playErrorBeep = () => {
    try {
        // Low pitch error buzz
        playTone(150, 'sawtooth', 0.3);
        playTone(100, 'sawtooth', 0.3, 0.2);
        triggerVibration([200]);
    } catch (e) { console.error("Audio error", e); }
};

export const triggerVibration = (pattern) => {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

export const triggerFlashAnimation = () => {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100vw';
    flash.style.height = '100vh';
    flash.style.backgroundColor = 'white';
    flash.style.opacity = '0.8';
    flash.style.zIndex = '9999';
    flash.style.pointerEvents = 'none';
    flash.style.transition = 'opacity 0.2s ease-out';
    
    document.body.appendChild(flash);
    
    requestAnimationFrame(() => {
        flash.style.opacity = '0';
        setTimeout(() => document.body.removeChild(flash), 200);
    });
};