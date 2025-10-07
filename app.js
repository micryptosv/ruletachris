
// PWA registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  });
}

// ---- PWA Install banner (Android/Chrome) ----
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');

// Si ya está instalada, oculta el botón
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (isStandalone && installBtn) installBtn.classList.add('hidden');

// Captura el evento y muestra tu CTA
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();                 // evita el mini-infobar de Chrome
  deferredPrompt = e;                 // guarda el evento para usarlo luego
  if (installBtn) installBtn.classList.remove('hidden');
});

// Al hacer clic, dispara el prompt nativo
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  installBtn.disabled = true;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice; // 'accepted' o 'dismissed'
  // Opcional: analytics según outcome
  deferredPrompt = null;
  installBtn.classList.add('hidden');
});

// Cuando se instala, lo ocultamos y puedes mostrar un toast
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  installBtn?.classList.add('hidden');
  // console.log('PWA instalada 🎉');
});


// Global state
let SEGMENTS = [];         // Filled after prizes.json
let QUESTIONS = [];        // Loaded from questions.json
let rotation = 0;
let spinning = false;
let cssSize = 520;

const STORAGE_PRIZES = 'ruleta_premios_override';
const STORAGE_QUESTS = 'ruleta_preguntas_override';

// DOM
const app = document.getElementById('app');
const wheel = document.getElementById('wheel');
const ctx = wheel.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const hint = document.getElementById('hint');

const qModal = document.getElementById('qModal');
const qTitle = document.getElementById('qTitle');
const qOptions = document.getElementById('qOptions');
const closeQuestionBtn = document.getElementById('closeQuestion');

const rModal = document.getElementById('rModal');
const rTitle = document.getElementById('rTitle');
const rMsg   = document.getElementById('rMsg');
const rPrize = document.getElementById('rPrize');
const rOk    = document.getElementById('rOk');

const openConfig = document.getElementById('openConfig');
const cModal = document.getElementById('cModal');
const formGrid = document.getElementById('formGrid');
const saveCfg = document.getElementById('saveCfg');
const cancelCfg = document.getElementById('cancelCfg');
const resetCfg = document.getElementById('resetCfg');

// Intro
const intro = document.getElementById('intro');
const introVideo = document.getElementById('introVideo');
const skipIntro = document.getElementById('skipIntro');

// Build default palette
function defaultSegmentsFromPrizes(prizes){
  const colors = ['#FF3B3B','#FF8C00','#FFD700','#2ECC71','#1ABC9C','#3498DB','#9B59B6','#FF00AA','#8D5524','#95A5A6','#F39C12','#111111'];
  return prizes.map((p,i)=>({ color: colors[i % colors.length], prize: p }));
}

// Fetch helpers with override
async function loadJSON(path){
  const resp = await fetch(path);
  if(!resp.ok) throw new Error('No se pudo cargar '+path);
  return resp.json();
}
async function bootData(){
  // prizes
  const overrideP = localStorage.getItem(STORAGE_PRIZES);
  let prizes = null;
  if(overrideP){
    try { prizes = JSON.parse(overrideP); } catch {}
  }
  if(!prizes){
    try { prizes = await loadJSON('./data/prizes.json'); }
    catch { prizes = ["10","25","50","100","Giro extra","150","200","Sorpresa","300","Nada... 😅","500","Jackpot 🎉"]; }
  }
  SEGMENTS = defaultSegmentsFromPrizes(prizes);

  // questions
  const overrideQ = localStorage.getItem(STORAGE_QUESTS);
  if(overrideQ){
    try { QUESTIONS = JSON.parse(overrideQ); } catch {}
  }
  if(!QUESTIONS || !Array.isArray(QUESTIONS) || !QUESTIONS.length){
    try { QUESTIONS = await loadJSON('./data/questions.json'); }
    catch { QUESTIONS = []; }
  }
}

// Wheel drawing
const rad = d => (Math.PI/180)*d;
function arcDeg(fromDeg, toDeg, r){ ctx.arc(0,0, r, rad(fromDeg), rad(toDeg), false); }
function resizeCanvas(){
  const box = wheel.getBoundingClientRect();
  cssSize = Math.floor(Math.min(box.width, box.height));
  const dpr = window.devicePixelRatio || 1;
  wheel.width  = Math.round(cssSize * dpr);
  wheel.height = Math.round(cssSize * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  drawWheel();
}
function drawWheel(){
  const r = cssSize/2;
  ctx.clearRect(0,0,cssSize,cssSize);
  ctx.save(); ctx.translate(r,r);
  const N = SEGMENTS.length;
  const SEG_DEG = 360 / N;
  for(let i=0;i<N;i++){
    const startDeg = i*SEG_DEG - 90;
    const endDeg   = startDeg + SEG_DEG;
    ctx.beginPath(); ctx.moveTo(0,0); arcDeg(startDeg, endDeg, r); ctx.closePath();
    ctx.fillStyle = SEGMENTS[i].color; ctx.fill();
    ctx.lineWidth=2; ctx.strokeStyle="rgba(255,255,255,.9)";
    ctx.beginPath(); ctx.moveTo(0,0); arcDeg(endDeg, endDeg, r); ctx.stroke();
    const mid=(startDeg+endDeg)/2;
    const tx=Math.cos(rad(mid))*(r*0.62);
    const ty=Math.sin(rad(mid))*(r*0.62);
    ctx.fillStyle="#fff"; ctx.font="bold 16px system-ui";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.save(); ctx.translate(tx,ty); ctx.rotate(rad(mid+90)); ctx.fillText(String(i+1),0,0); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0,0, r*0.08, 0, Math.PI*2); ctx.fillStyle="#fff"; ctx.fill();
  ctx.restore();
}
function setRotation(deg){ wheel.style.transform = `rotate(${deg}deg)`; }
function easeOutCubic(t){ return 1 - Math.pow(1 - t, 3); }

function spin(){
  if(spinning) return;
  if(!SEGMENTS.length){ alert('Faltan premios o segmentos'); return; }
  spinning = true; spinBtn.disabled = true;
  hint.textContent = "Girando... 🎯";
  const extra = Math.random()*360;
  const target = rotation + (360*(5 + Math.floor(Math.random()*4))) + extra;
  const dur = 4300; const start = performance.now();
  (function anim(now){
    const t = Math.min(1, (now - start)/dur);
    const eased = easeOutCubic(t);
    const deg = rotation + (target - rotation) * eased;
    setRotation(deg);
    if(t < 1) requestAnimationFrame(anim);
    else {
      rotation = ((deg % 360) + 360) % 360;
      spinning = false; spinBtn.disabled = false;
      const SEG_DEG = 360 / SEGMENTS.length;
      const index = Math.floor(rotation / SEG_DEG) % SEGMENTS.length;
      const prize = SEGMENTS[index].prize;
      hint.textContent = `¡Cayó en el segmento ${index+1}! Premio: ${prize}`;
      askRandomQuestion(prize);
    }
  })(start);
}

// Questions/result
let currentAnswer = -1;
let currentPrize = '';
function askRandomQuestion(prizeText){
  if(!QUESTIONS.length){ alert('No hay preguntas cargadas'); return; }
  const q = QUESTIONS[Math.floor(Math.random()*QUESTIONS.length)];
  currentAnswer = q.c; currentPrize = prizeText;
  qTitle.textContent = q.q;
  qOptions.innerHTML = '';
  (q.a||[]).forEach((txt,i)=>{
    const btn = document.createElement('button');
    btn.className = 'option'; btn.textContent = txt;
    btn.onclick = ()=> handleAnswer(i);
    qOptions.appendChild(btn);
  });
  openModal(qModal);
}
function handleAnswer(i){
  closeModal(qModal);
  if(i === currentAnswer){
    rTitle.textContent = '¡Correcto!'; rTitle.classList.remove('fail'); rTitle.classList.add('ok');
    rMsg.textContent = '¡Le pegaste al caliche!';
    rPrize.style.display='block'; rPrize.textContent = `Premio: ${currentPrize}`;
  }else{
    rTitle.textContent = 'Incorrecto'; rTitle.classList.remove('ok'); rTitle.classList.add('fail');
    rMsg.textContent = 'Próximo participante a jugar…';
    rPrize.style.display='none';
  }
  openModal(rModal);
}

// Modals
function openModal(el){ el.classList.add('show'); el.setAttribute('aria-hidden','false'); }
function closeModal(el){ el.classList.remove('show'); el.setAttribute('aria-hidden','true'); }
closeQuestionBtn.addEventListener('click', () => closeModal(qModal));
rOk.addEventListener('click', () => closeModal(rModal));

// Config (prizes) + import/export JSON
let tempPrizes = [];
function buildForm(){
  formGrid.innerHTML = '';
  tempPrizes.forEach((val, i) => {
    const field = document.createElement('div'); field.className = 'field';
    const label = document.createElement('label'); label.textContent = `Premio ${i+1}`;
    const input = document.createElement('input');
    input.type = 'text'; input.value = val; input.placeholder = `Texto premio ${i+1}`;
    input.oninput = (e)=> tempPrizes[i] = e.target.value;
    field.appendChild(label); field.appendChild(input);
    formGrid.appendChild(field);
  });
  // Import/Export row
  const tools = document.createElement('div'); tools.style.display='flex'; tools.style.gap='10px'; tools.style.marginTop='6px';
  // Export prizes
  const exportP = document.createElement('button'); exportP.className='btn'; exportP.textContent='Exportar premios.json';
  exportP.onclick = ()=> downloadJSON('prizes.json', tempPrizes);
  // Import prizes
  const importP = document.createElement('button'); importP.className='btn-sec'; importP.textContent='Importar premios.json';
  const fileP = document.createElement('input'); fileP.type='file'; fileP.accept='application/json'; fileP.style.display='none';
  importP.onclick = ()=> fileP.click();
  fileP.onchange = async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const text = await file.text(); try{
      const arr = JSON.parse(text);
      if(Array.isArray(arr) && arr.length){ tempPrizes = arr.slice(0,12); buildForm(); }
    }catch{ alert('JSON inválido'); }
  };
  // Export questions
  const exportQ = document.createElement('button'); exportQ.className='btn'; exportQ.textContent='Exportar preguntas.json';
  exportQ.onclick = ()=> downloadJSON('questions.json', QUESTIONS);
  // Import questions
  const importQ = document.createElement('button'); importQ.className='btn-sec'; importQ.textContent='Importar preguntas.json';
  const fileQ = document.createElement('input'); fileQ.type='file'; fileQ.accept='application/json'; fileQ.style.display='none';
  importQ.onclick = ()=> fileQ.click();
  fileQ.onchange = async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const text = await file.text(); try{
      const arr = JSON.parse(text);
      if(Array.isArray(arr) && arr.length){ QUESTIONS = arr; alert('Preguntas cargadas 👍'); }
    }catch{ alert('JSON inválido'); }
  };
  tools.append(exportP, importP, exportQ, importQ, fileP, fileQ);
  formGrid.appendChild(tools);
}
function openConfigModal(){
  tempPrizes = SEGMENTS.map(s => s.prize);
  buildForm();
  openModal(cModal);
}
function saveConfig(){
  // Apply & persist (localStorage override)
  SEGMENTS.forEach((s,i)=> s.prize = tempPrizes[i] || '');
  localStorage.setItem(STORAGE_PRIZES, JSON.stringify(SEGMENTS.map(s=>s.prize)));
  hint.textContent = 'Premios guardados ✅';
  closeModal(cModal);
  drawWheel();
}
function cancelConfig(){ closeModal(cModal); }
function resetConfig(){
  try{
    tempPrizes = JSON.parse(localStorage.getItem(STORAGE_PRIZES)) || SEGMENTS.map(s=>s.prize);
  }catch{}
  tempPrizes = [...(JSON.parse(JSON.stringify(tempPrizes)))];
  buildForm();
}
// Simple downloader
function downloadJSON(filename, data){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

openConfig.addEventListener('click', openConfigModal);
saveCfg.addEventListener('click', saveConfig);
cancelCfg.addEventListener('click', cancelConfig);
resetCfg.addEventListener('click', ()=>{
  // Reset to file defaults
  fetch('./data/prizes.json').then(r=>r.json()).then(arr=>{
    tempPrizes = arr; buildForm();
  }).catch(()=> alert('No se pudo restaurar desde archivo.'));
});

// Intro show/hide & boot
function showApp(){
  document.getElementById('intro').classList.add('hide');
  app.classList.add('ready');
  // Boot wheel
  resizeCanvas();
  setRotation(rotation);
  spinBtn.addEventListener('click', spin);
  window.addEventListener('resize', resizeCanvas, { passive:true });
}
introVideo.addEventListener('ended', showApp);
skipIntro.addEventListener('click', showApp);
// Fallback (si autoplay falla)
document.addEventListener('click', function once(){
  if(!app.classList.contains('ready')) showApp();
  document.removeEventListener('click', once);
}, { once:true });

// Load data then continue
(async function init(){
  try{ await bootData(); }catch{}
  // If video loads, wait; if error, show app
  introVideo.addEventListener('error', showApp, { once:true });
})();
