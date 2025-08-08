/*
  Nature's Roast — Core game logic
  - Records mic input
  - Picks a random animal and image
  - Generates a roast
  - Loops your recorded audio quietly in the background
  - Optional TTS for roast
  - Fun floating animals + sarcastic popups
*/

// ---------- State ----------
let mediaStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let recordedUrl = null;
let backgroundAudio = null;
const BACKGROUND_TRACK_URL = './audio/rick_roll.mp3';
// Rotation timers removed (images/audio are fixed per result)
let imageRotateTimer = null;
let audioRotateTimer = null;
let lastImageSrc = null;
let lastTrackSrc = null;

let audioContext = null;
let analyser = null;
let dataArray = null;
let rafId = null;

let startTs = 0;
let timerInterval = null;

// ---------- DOM ----------
const recordBtn = document.getElementById('recordBtn');
const timerEl = document.getElementById('timer');
const waveCanvas = document.getElementById('wave');
const lamp = document.getElementById('recordLamp');
const recDots = document.getElementById('recDots');

const resultSection = document.getElementById('result');
const animalImg = document.getElementById('animalImg');
const animalNameEl = document.getElementById('animalName');
const quipEl = document.getElementById('quip');

const againBtn = document.getElementById('againBtn');
const copyBtn = document.getElementById('copyBtn');
const ttsBtn = document.getElementById('ttsBtn');
const muteBtn = document.getElementById('muteBtn');
const downloadBtn = document.getElementById('downloadBtn');
const shareBtn = document.getElementById('shareBtn');

const sarcasticLayer = document.getElementById('sarcasticPopups');
const floatersLayer = document.getElementById('floaters');

const waveCtx = waveCanvas.getContext('2d');

// ---------- Data ----------
const firstNames = [
  'Gary','Jimmy','Linda','Terry','Sasha','Mo','Riley','Casey','Pip','Bubbles','Nugget','Pickles','Milo','Lola','Ziggy'
];

const animals = [
  { key: 'goat', display: 'Goat', emoji: '🐐' },
  { key: 'duck', display: 'Duck', emoji: '🦆' },
  { key: 'cat', display: 'Cat', emoji: '🐱' },
  { key: 'dog', display: 'Dog', emoji: '🐶' },
  { key: 'lion', display: 'Lion', emoji: '🦁' },
  { key: 'monkey', display: 'Monkey', emoji: '🐒' },
  { key: 'owl', display: 'Owl', emoji: '🦉' },
  { key: 'frog', display: 'Frog', emoji: '🐸' },
  { key: 'horse', display: 'Horse', emoji: '🐴' },
  { key: 'cow', display: 'Cow', emoji: '🐮' },
  { key: 'fox', display: 'Fox', emoji: '🦊' },
  { key: 'panda', display: 'Panda', emoji: '🐼' },
  { key: 'penguin', display: 'Penguin', emoji: '🐧' }
];

const roasts = [
  'Gary the {animal} is now rethinking his life choices after hearing that sound.',
  'Jimmy the {animal} passed out after hearing your diabolic voice.',
  'Somewhere a {animal} just filed a noise complaint.',
  'Scientists are adding your sound to the list of unexplained phenomena. Thanks?',
  'Even a bored {animal} at 3AM wouldn’t make that noise.',
  'Congrats! You just summoned three confused {animalPlural}.',
  'Legend says a {animal} learned silence after hearing you.',
  'My imaginary {animal} ran away. And it was imaginary.'
];

const sarcasticMessages = [
  'Oh no, not again... 🙄',
  'My ears are bleeding! 😵',
  'That was... interesting? 🤔',
  'Even the crickets are embarrassed! 🦗',
  'Is this a new form of torture? 😱',
  'My cat just resigned. 😿',
  'The neighbors are packing. 🚚',
  'Please stop, I beg you! 😭'
];

// Local assets provided by you
const LOCAL_IMAGES = [
  'images/_94686694_trump-getty.jpg',
  'images/a.jpg',
  'images/b.jpg',
  'images/c.jpg',
  'images/CAT.jpeg',
  'images/dfgdg.jpg',
  'images/download (1).jpeg',
  'images/download (2).jpeg',
  'images/download (3).jpeg',
  'images/download (4).jpeg',
  'images/download (5).jpeg',
  'images/download (6).jpeg',
  'images/download (7).jpeg',
  'images/download (8).jpeg',
  'images/download (9).jpeg',
  'images/download (10).jpeg',
  'images/download (11).jpeg',
  'images/download.jpeg',
  'images/dsfht.jpg',
  'images/fb.jpg',
  'images/fsf.jpg',
  'images/gdsg.jpg',
  'images/images.jpeg',
  'images/OIP.webp',
  'images/OIP (1).webp'
];

const LOCAL_TRACKS = [
  'audio/wake-up-its-the-first-of-da-month.mp3',
  'audio/wait-a-minute-who-are-you.mp3',
  'audio/rick_roll.mp3',
  'audio/wobbly-wiggly.mp3'
];

// ---------- Utils ----------
function pickRandom(list) { return list[Math.floor(Math.random() * list.length)]; }
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${mm}:${ss}`;
}

function buildImageUrl() {
  // Use only your local images instead of Unsplash; avoid immediate repeat
  if (!LOCAL_IMAGES.length) return '';
  let next = pickRandom(LOCAL_IMAGES);
  if (LOCAL_IMAGES.length > 1 && next === lastImageSrc) {
    // try a few times to avoid picking the same image twice in a row
    for (let i = 0; i < 3; i++) {
      const candidate = pickRandom(LOCAL_IMAGES);
      if (candidate !== lastImageSrc) { next = candidate; break; }
    }
  }
  lastImageSrc = next;
  return next;
}

function buildRoast(animal) {
  const tmpl = pickRandom(roasts);
  const animalPlural = animal.display.endsWith('s') ? animal.display : animal.display + 's';
  return tmpl
    .replace('{animal}', animal.display.toLowerCase())
    .replace('{animalPlural}', animalPlural.toLowerCase());
}

// ---------- Recording ----------
async function startRecording() {
  if (mediaStream) return;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    alert('Microphone access denied. Please allow microphone to play.');
    return;
  }

  mediaRecorder = new MediaRecorder(mediaStream);
  recordedChunks = [];
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = handleRecordingStop;
  mediaRecorder.start();

  // Visualizer
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(mediaStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  dataArray = new Uint8Array(analyser.fftSize);
  source.connect(analyser);
  drawWave();

  // UI
  lamp.classList.add('on');
  recDots.hidden = false;
  recordBtn.classList.add('recording');
  recordBtn.setAttribute('aria-pressed', 'true');
  recordBtn.querySelector('.label').textContent = 'Stop';

  startTs = performance.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerEl.textContent = formatTime(performance.now() - startTs);
  }, 200);
}

function stopTracks() {
  if (!mediaStream) return;
  mediaStream.getTracks().forEach(t => t.stop());
  mediaStream = null;
}

function stopRecording() {
  if (!mediaRecorder) return;
  mediaRecorder.stop();
  stopTracks();
  if (rafId) cancelAnimationFrame(rafId);
  if (audioContext) audioContext.close();
  audioContext = null;
  analyser = null;
  dataArray = null;

  lamp.classList.remove('on');
  recDots.hidden = true;
  recordBtn.classList.remove('recording');
  recordBtn.setAttribute('aria-pressed', 'false');
  recordBtn.querySelector('.label').textContent = 'Start recording';
  clearInterval(timerInterval);
}

function handleRecordingStop() {
  recordedBlob = new Blob(recordedChunks, { type: 'audio/webm' });
  if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  recordedUrl = URL.createObjectURL(recordedBlob);
  generateResult();
  playBackgroundTrack();
  createMultipleSarcasticPopups();
}

// ---------- Visualizer ----------
function drawWave() {
  if (!analyser) return;
  const width = waveCanvas.width = waveCanvas.clientWidth;
  const height = waveCanvas.height = waveCanvas.clientHeight;

  function draw() {
    rafId = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    waveCtx.clearRect(0, 0, width, height);
    waveCtx.lineWidth = 3;
    waveCtx.strokeStyle = 'rgba(180,160,255,0.9)';
    waveCtx.beginPath();
    const slice = width / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;
      if (i === 0) waveCtx.moveTo(x, y); else waveCtx.lineTo(x, y);
      x += slice;
    }
    waveCtx.lineTo(width, height / 2);
    waveCtx.stroke();
  }
  draw();
}

// ---------- Gameplay ----------
function generateResult() {
  const animal = pickRandom(animals);
  const first = pickRandom(firstNames);
  const title = `${first} the ${animal.display} ${animal.emoji}`;
  const roast = buildRoast(animal);

  animalNameEl.textContent = title;
  quipEl.textContent = roast;
  document.querySelector('.image-wrap').classList.add('skeleton');
  animalImg.src = buildImageUrl(animal.key);
  animalImg.onload = () => document.querySelector('.image-wrap').classList.remove('skeleton');
  resultSection.classList.remove('hidden');
  resultSection.style.animation = 'slideInUp 0.8s ease-out';

  // Optionally speak
  if (ttsBtn && ttsBtn.getAttribute('aria-pressed') === 'true') {
    speak(roast);
  }

  // Celebrate
  confettiLite();

  // Images and audio remain fixed per result (no auto-rotation)
}

function playBackgroundTrack() {
  if (backgroundAudio) { backgroundAudio.pause(); backgroundAudio = null; }
  // Use only your local audio tracks
  let chosenTrack = pickRandom(LOCAL_TRACKS);
  if (LOCAL_TRACKS.length > 1 && chosenTrack === lastTrackSrc) {
    for (let i = 0; i < 3; i++) {
      const candidate = pickRandom(LOCAL_TRACKS);
      if (candidate !== lastTrackSrc) { chosenTrack = candidate; break; }
    }
  }
  lastTrackSrc = chosenTrack;
  backgroundAudio = new Audio(chosenTrack);
  backgroundAudio.loop = true;
  backgroundAudio.volume = 0.25;
  backgroundAudio.play().catch(() => {/* ignore */});
  if (muteBtn) {
    muteBtn.textContent = '🔇 Mute music';
    muteBtn.setAttribute('aria-pressed', 'false');
  }
}

function stopAllAudio() {
  if (backgroundAudio) {
    backgroundAudio.pause();
    backgroundAudio.currentTime = 0;
  }
  // no auto-rotation anymore
}

// ---------- TTS ----------
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 0.9;
  utter.volume = 1.0;
  window.speechSynthesis.speak(utter);
}

// ---------- UI Actions ----------
function initApp() {
  recordBtn?.addEventListener('click', () => {
    if (recordBtn.classList.contains('recording')) {
      stopRecording();
    } else {
      // reset previous result
      resultSection.classList.add('hidden');
      startRecording();
    }
  });

  againBtn?.addEventListener('click', () => {
    stopAllAudio();
    resultSection.classList.add('hidden');
    timerEl.textContent = '00:00';
  });

  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(quipEl.textContent || '');
      toast('Roast copied!');
    } catch {}
  });

  ttsBtn?.addEventListener('click', () => {
    const active = ttsBtn.getAttribute('aria-pressed') === 'true';
    const next = !active;
    ttsBtn.setAttribute('aria-pressed', String(next));
    ttsBtn.textContent = next ? '🔊 Read roast' : '🔈 Read roast';
    if (next && quipEl.textContent) speak(quipEl.textContent);
    if (!next) window.speechSynthesis?.cancel();
  });

  muteBtn?.addEventListener('click', () => {
    if (!backgroundAudio) return;
    const active = muteBtn.getAttribute('aria-pressed') === 'true';
    const next = !active;
    muteBtn.setAttribute('aria-pressed', String(next));
    backgroundAudio.muted = next;
    muteBtn.textContent = next ? '🔊 Unmute you' : '🔇 Mute you';
  });

  downloadBtn?.addEventListener('click', () => {
    if (!recordedBlob) return;
    const a = document.createElement('a');
    const url = URL.createObjectURL(recordedBlob);
    a.href = url;
    a.download = 'nature-roast.webm';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  shareBtn?.addEventListener('click', async () => {
    if (!recordedBlob) return;
    if (navigator.canShare && navigator.canShare({ files: [new File([recordedBlob], 'nature-roast.webm', { type: 'audio/webm' })] })) {
      try {
        await navigator.share({
          files: [new File([recordedBlob], 'nature-roast.webm', { type: 'audio/webm' })],
          title: "Nature's Roast",
          text: 'Listen to this chaotic masterpiece.'
        });
      } catch {}
    } else {
      toast('Sharing not supported here');
    }
  });

  setupFloatingAnimals();
}

// ---------- Fun Layers ----------
function createSarcasticPopup() {
  const popup = document.createElement('div');
  popup.className = 'sarcastic-popup';
  popup.textContent = pickRandom(sarcasticMessages);
  const x = Math.random() * (window.innerWidth - 220);
  const y = Math.random() * (window.innerHeight - 120);
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
  sarcasticLayer.appendChild(popup);
  setTimeout(() => popup.remove(), 3200);
}

function createMultipleSarcasticPopups() {
  const n = Math.floor(Math.random() * 3) + 3; // 3-5
  for (let i = 0; i < n; i++) setTimeout(createSarcasticPopup, i * 280);
}

function setupFloatingAnimals() {
  setInterval(() => spawnFloatingAnimal(), 900);
}

function spawnFloatingAnimal() {
  const it = pickRandom(animals);
  const el = document.createElement('div');
  el.className = 'floater';
  el.textContent = it.emoji;
  const startX = Math.random() * window.innerWidth;
  const duration = 6000 + Math.random() * 4000;
  el.style.left = `${startX}px`;
  el.style.animationDuration = `${duration}ms`;
  floatersLayer.appendChild(el);
  setTimeout(() => el.remove(), duration + 100);
}

function confettiLite() {
  for (let i = 0; i < 18; i++) setTimeout(createConfettiPiece, i * 40);
}

function createConfettiPiece() {
  const c = document.createElement('div');
  c.className = 'confetti';
  c.style.left = Math.random() * 100 + 'vw';
  c.style.background = `hsl(${Math.floor(Math.random()*360)}, 80%, 60%)`;
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 1800);
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); t.remove(); }, 1800);
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', initApp);