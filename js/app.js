/* FINNANZI v2 - Desde CERO
   - Responsive total
   - Splash screen
   - Dark mode toggle (guardado)
   - Transacciones: agregar, eliminar inmediato, limpiar form
   - Metas con % y barra animada + aporte directo
   - Reportes automáticos (día/semana) con Chart.js
   - Guardado en localStorage
*/

/* ---------- Keys y estado ---------- */
const LS_TX = 'finnanzi_v2_tx';
const LS_GOALS = 'finnanzi_v2_goals';
const LS_THEME = 'finnanzi_v2_theme';

let transactions = []; // {id, type, amount, category, desc, date, ts}
let goals = [];        // {id, name, target, current}

/* Chart refs */
let chartOverview = null;
let chartCategories = null;

/* Categorías por defecto */
const DEFAULT_CATEGORIES = [
  'Alimentación','Transporte','Entretenimiento','Educación','Salud',
  'Vivienda','Salario','Inversiones','Regalos','Otros'
];

/* ---------- Helpers ---------- */
function $(sel){ return document.querySelector(sel) }
function $all(sel){ return Array.from(document.querySelectorAll(sel)) }
function formatMoney(n){ return `Bs. ${Number(n).toFixed(2)}` }
function nowYMD(){ return new Date().toISOString().split('T')[0] }
function uid(){ return Date.now() + Math.floor(Math.random()*1000) }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* ---------- Load / Save ---------- */
function loadState(){
  try {
    const t = localStorage.getItem(LS_TX);
    const g = localStorage.getItem(LS_GOALS);
    transactions = t ? JSON.parse(t) : [];
    goals = g ? JSON.parse(g) : [];
  } catch(e){
    transactions = []; goals = [];
    console.error('Error cargando localStorage', e);
  }
}
function saveState(){
  localStorage.setItem(LS_TX, JSON.stringify(transactions));
  localStorage.setItem(LS_GOALS, JSON.stringify(goals));
}

/* ---------- Splash + init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // splash
  const splash = $('#splash');
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(()=> splash.style.display = 'none', 400);
    // show app
    const app = $('#app');
    app.classList.remove('root-hidden');
  }, 900); // breve

  // load
  loadState();
  applyTheme();
  setupUI();
  renderAll();

  // default dates
  $('#tx-date').value = nowYMD();
  if ($('#report-date')) $('#report-date').value = nowYMD();

  // auto-update reports when tx change
  // (renderAll calls updateReportsAuto)
});

/* ---------- Theme ---------- */
function applyTheme(){
  const saved = localStorage.getItem(LS_THEME) || 'light';
  if (saved === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  const btn = $('#theme-toggle');
  if (btn) btn.textContent = saved === 'dark' ? '🌙' : '🌓';
}
function toggleTheme(){
  const dark = document.body.classList.toggle('dark');
  localStorage.setItem(LS_THEME, dark ? 'dark' : 'light');
  $('#theme-toggle').textContent = dark ? '🌙' : '🌓';
}

/* ---------- UI setup ---------- */
function setupUI(){
  // tabs
  $all('.tab').forEach(b => {
    b.addEventListener('click', () => {
      $all('.tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const sec = b.getAttribute('data-section');
      showSection(sec);
    });
  });

  // theme
  $('#theme-toggle').addEventListener('click', toggleTheme);

  // populate categories
  const catSel = $('#tx-category');
  catSel.innerHTML = '<option value="">Categoría</option>';
  DEFAULT_CATEGORIES.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c; catSel.appendChild(o);
  });

  // tx form
  $('#tx-form').addEventListener('submit', e => {
    e.preventDefault();
    addTransactionFromForm();
  });
  $('#tx-clear').addEventListener('click', () => {
    $('#tx-form').reset();
    $('#tx-date').value = nowYMD();
    $('#tx-type').focus();
  });
  $('#goto-goals').addEventListener('click', () => {
    activateTab('transactions');
    // scroll to goal form
    setTimeout(()=> $('#goal-name').focus(), 150);
  });

  // goal form
  $('#goal-form').addEventListener('submit', e => {
    e.preventDefault();
    addGoalFromForm();
  });
  $('#goal-clear').addEventListener('click', () => {
    $('#goal-form').reset();
    $('#goal-name').focus();
  });

  // fab quick add
  $('#fab').addEventListener('click', quickAddPrompt);

  // reports
  $('#report-day').addEventListener('click', () => generateReport('day'));
  $('#report-week').addEventListener('click', () => generateReport('week'));
}

/* ---------- Navigation helpers ---------- */
function showSection(id){
  $all('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}
function activateTab(id){
  const btn = $all('.tab').find(b => b.getAttribute('data-section') === id);
  if (btn) btn.click();
}

/* ---------- Transactions ---------- */
function addTransactionFromForm(){
  const type = $('#tx-type').value;
  const amount = parseFloat($('#tx-amount').value) || 0;
  const category = $('#tx-category').value || 'Otros';
  const date = $('#tx-date').value || nowYMD();
  const desc = $('#tx-desc').value.trim() || (type === 'income' ? 'Ingreso' : 'Gasto');

  if (!type || amount <= 0) {
    toast('Completa tipo y monto mayor a 0', 'error'); return;
  }

  const tx = { id: uid(), type, amount: +amount, category, desc, date, ts: new Date().toISOString() };
  transactions.push(tx);
  saveState();
  renderAll();

  // limpiar form
  $('#tx-form').reset();
  $('#tx-date').value = nowYMD();
  $('#tx-type').focus();

  // auto-update reports
  updateReportsAuto();
  toast('Transacción agregada', 'success');
}

function deleteTransaction(id){
  // eliminar inmediato (sin confirm)
  transactions = transactions.filter(t => t.id !== id);
  saveState();
  renderAll();
  updateReportsAuto();
}

/* ---------- Goals ---------- */
function addGoalFromForm(){
  const name = $('#goal-name').value.trim();
  const target = parseFloat($('#goal-target').value) || 0;
  if (!name || target <= 0) { toast('Nombre y monto objetivo son requeridos', 'error'); return; }
  const g = { id: uid(), name, target: +target, current: 0 };
  goals.push(g);
  saveState();
  renderAll();
  $('#goal-form').reset();
  toast('Meta creada', 'success');
}

/* ---------- Quick add (FAB) ---------- */
function quickAddPrompt(){
  const amt = prompt('Monto (Bs.):');
  if (!amt || isNaN(amt)) return;
  const isInc = confirm('¿Es un ingreso? (Aceptar = Ingreso)');
  const cat = prompt('Categoría (opcional):', 'Otros') || 'Otros';
  const desc = prompt('Descripción (opcional):', isInc ? 'Ingreso' : 'Gasto') || (isInc ? 'Ingreso' : 'Gasto');
  const tx = { id: uid(), type: isInc ? 'income' : 'expense', amount: +parseFloat(amt), category: cat, desc, date: nowYMD(), ts: new Date().toISOString() };
  transactions.push(tx);
  saveState();
  renderAll();
  updateReportsAuto();
  toast('Transacción rápida agregada', 'success');
}

/* ---------- Renderers ---------- */
function renderAll(){
  renderBalance();
  renderRecent();
  renderHistory();
  renderGoals();
  updateFloating();
  // No generar reportes por defecto; se generan cuando el usuario pide o cuando tx cambia (updateReportsAuto)
}

/* Balance */
function renderBalance(){
  const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const total = inc - exp;
  $('#balance-value').textContent = formatMoney(total);
  $('#home-income').textContent = formatMoney(inc);
  $('#home-expense').textContent = formatMoney(exp);
}

/* Recent */
function renderRecent(){
  const zone = $('#recent-home');
  zone.innerHTML = '';
  const list = [...transactions].sort((a,b)=> new Date(b.ts) - new Date(a.ts)).slice(0,4);
  if (list.length === 0) { zone.innerHTML = '<p class="muted">No hay transacciones aún</p>'; return; }
  list.forEach(t => {
    const d = document.createElement('div'); d.className = 'tx-item';
    d.innerHTML = `<div class="tx-left"><div style="font-weight:700">${escapeHtml(t.desc)}</div><div class="tx-cat">${escapeHtml(t.category)} • ${formatDate(t.date)}</div></div><div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'} ${formatMoney(t.amount)}</div>`;
    zone.appendChild(d);
  });
}

/* History */
function renderHistory(){
  const zone = $('#tx-history');
  zone.innerHTML = '';
  if (transactions.length === 0) { zone.innerHTML = '<p class="muted">No hay transacciones registradas</p>'; return; }
  const list = [...transactions].sort((a,b)=> new Date(b.date) - new Date(a.date));
  list.forEach(t => {
    const div = document.createElement('div'); div.className = 'tx-item';
    const left = document.createElement('div'); left.className = 'tx-left';
    const title = document.createElement('div'); title.style.fontWeight='700'; title.textContent = t.desc;
    const meta = document.createElement('div'); meta.className = 'tx-cat'; meta.textContent = `${t.category} • ${formatDate(t.date)}`;
    left.appendChild(title); left.appendChild(meta);

    const amount = document.createElement('div'); amount.className = `tx-amount ${t.type}`; amount.textContent = (t.type==='income'?'+':'-') + ' ' + formatMoney(t.amount);

    const right = document.createElement('div'); right.style.display='flex'; right.style.alignItems='center';
    const del = document.createElement('button'); del.className='btn-ghost'; del.textContent='Eliminar';
    del.addEventListener('click', () => deleteTransaction(t.id));
    right.appendChild(amount); right.appendChild(del);

    div.appendChild(left); div.appendChild(right);
    zone.appendChild(div);
  });
}

/* Goals */
function renderGoals(){
  const zone = $('#goals-home');
  zone.innerHTML = '';
  if (goals.length === 0) { zone.innerHTML = '<p class="muted">No tienes metas</p>'; return; }

  goals.forEach(g => {
    const el = document.createElement('div'); el.className = 'goal-item';
    const head = document.createElement('div'); head.className = 'goal-head';
    const title = document.createElement('div'); title.style.fontWeight='700'; title.textContent = g.name;
    const pct = Math.round((g.current / g.target || 0) * 100);
    const pctText = document.createElement('div'); pctText.style.fontWeight='700'; pctText.textContent = `${pct}%`;
    head.appendChild(title); head.appendChild(pctText);

    const prog = document.createElement('div'); prog.className = 'progress';
    const fill = document.createElement('div'); fill.className = 'progress-fill'; fill.style.width = `${Math.min(100, (g.current / g.target)*100)}%`;
    prog.appendChild(fill);

    // controls: quick contribution + delete
    const controls = document.createElement('div'); controls.style.marginTop='8px'; controls.style.display='flex'; controls.style.gap='8px';
    const inp = document.createElement('input'); inp.type='number'; inp.placeholder='Agregar Bs.'; inp.style.flex='1'; inp.style.padding='8px'; inp.style.borderRadius='8px'; inp.style.border='1px solid #eef3f6';
    const addBtn = document.createElement('button'); addBtn.className='btn-primary'; addBtn.textContent='Agregar';
    addBtn.addEventListener('click', () => {
      const v = parseFloat(inp.value) || 0;
      if (v > 0) {
        g.current = +(g.current + v).toFixed(2);
        if (g.current > g.target) g.current = g.target;
        saveState(); renderAll();
        toast('Aporte agregado a la meta', 'success');
        inp.value = '';
      }
    });
    const delBtn = document.createElement('button'); delBtn.className='btn-ghost'; delBtn.textContent='Eliminar';
    delBtn.addEventListener('click', () => {
      goals = goals.filter(x => x.id !== g.id);
      saveState(); renderAll();
    });
    controls.appendChild(inp); controls.appendChild(addBtn); controls.appendChild(delBtn);

    el.appendChild(head); el.appendChild(prog); el.appendChild(controls);
    zone.appendChild(el);
  });
}

/* Floating */
function updateFloating(){
  const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const total = inc - exp;
  $('#floating').textContent = formatMoney(total);
}

/* ---------- Reports (auto update) ---------- */
function updateReportsAuto(){
  // If reports screen visible, regenerate using the current selected mode (if any)
  // We'll generate both daily and weekly summary hidden canvases so reports are up-to-date when user opens them.
  // For performance, only rerender overview and categories for today's date.
  const today = nowYMD();
  generateReportInternal('day', today);
  generateReportInternal('week', today);
}

function setupReports(){
  // intentionally left empty; handlers assigned in setupUI
}

function generateReport(mode){
  const chosen = $('#report-date').value || nowYMD();
  generateReportInternal(mode, chosen);
}

function generateReportInternal(mode, chosenDate){
  const pc = $('#report-charts');
  const summary = $('#report-summary');
  pc.innerHTML = '';

  let list = [];
  let title = '';
  if (mode === 'day'){
    title = `Reporte del día: ${formatDate(chosenDate)}`;
    list = transactions.filter(t => t.date === chosenDate);
  } else {
    // week
    const ref = new Date(chosenDate);
    const day = ref.getDay();
    const diffToMonday = (day === 0) ? -6 : (1 - day);
    const monday = new Date(ref); monday.setDate(ref.getDate() + diffToMonday); monday.setHours(0,0,0,0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
    title = `Semana: ${formatDate(monday.toISOString().split('T')[0])} — ${formatDate(sunday.toISOString().split('T')[0])}`;
    list = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d >= monday && d <= sunday;
    });
  }

  if (!list || list.length === 0) {
    summary.textContent = `${title} — No hay transacciones para este periodo`;
    return;
  }

  const totalInc = list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExp = list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  summary.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${title}</div>
                       <div class="muted">Ingresos: ${formatMoney(totalInc)} · Gastos: ${formatMoney(totalExp)} · Balance: ${formatMoney(totalInc-totalExp)}</div>`;

  // overview donut
  const od = document.createElement('div'); od.className='donut';
  od.innerHTML = `<canvas id="chart-overview-${mode}" width="160" height="160"></canvas><div style="font-weight:700;margin-top:8px">Ingresos vs Gastos</div>`;
  pc.appendChild(od);

  // categories
  const catMap = {};
  list.forEach(t => { catMap[t.category] = (catMap[t.category]||0) + t.amount; });
  const entries = Object.keys(catMap).map(k=>({k,v:catMap[k]})).sort((a,b)=>b.v-a.v).slice(0,6);
  if (entries.length){
    const cd = document.createElement('div'); cd.className='donut';
    cd.innerHTML = `<canvas id="chart-cats-${mode}" width="160" height="160"></canvas><div style="font-weight:700;margin-top:8px">Top categorías</div>`;
    pc.appendChild(cd);
  }

  // destroy previous charts if exist
  try {
    if (chartOverview) { chartOverview.destroy(); chartOverview = null; }
    if (chartCategories) { chartCategories.destroy(); chartCategories = null; }
  } catch(e){ /* ignore */ }

  // create charts
  const ctxO = document.getElementById(`chart-overview-${mode}`).getContext('2d');
  chartOverview = new Chart(ctxO, {
    type: 'doughnut',
    data: { labels: ['Ingresos','Gastos'], datasets: [{ data: [totalInc, totalExp], backgroundColor: ['#27ae60','#e24b4b'] }] },
    options: { cutout: '70%', responsive:false, plugins:{legend:{position:'bottom'}} }
  });

  if (entries.length){
    const ctxC = document.getElementById(`chart-cats-${mode}`).getContext('2d');
    chartCategories = new Chart(ctxC, {
      type: 'doughnut',
      data: { labels: entries.map(e=>e.k), datasets: [{ data: entries.map(e=>e.v), backgroundColor: ['#27ae60','#3498db','#f1c40f','#9b59b6','#e67e22','#7f8c8d'] }] },
      options: { cutout: '65%', responsive:false, plugins:{legend:{position:'bottom'}} }
    });
  }

  // show list
  const listDiv = document.createElement('div'); listDiv.style.marginTop='12px';
  listDiv.innerHTML = list.sort((a,b)=> new Date(b.ts) - new Date(a.ts)).map(t => `
    <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #f2f6f9">
      <div style="flex:1"><div style="font-weight:700">${escapeHtml(t.desc)}</div><div class="muted">${escapeHtml(t.category)} • ${formatDate(t.date)}</div></div>
      <div style="min-width:110px;text-align:right;font-weight:700">${t.type==='income'?'+':'-'} ${formatMoney(t.amount)}</div>
    </div>`).join('');
  pc.appendChild(listDiv);
}

/* ---------- Utility: format date, toast ---------- */
function formatDate(ymd){
  if (!ymd) return '';
  const d = new Date(ymd);
  return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
}

function toast(msg, type='info'){
  const n = document.createElement('div');
  n.textContent = msg;
  n.style.position='fixed'; n.style.right='16px'; n.style.bottom='96px';
  n.style.background = type==='success'? '#27ae60' : type==='error'? '#e24b4b' : '#3498db';
  n.style.color='#fff'; n.style.padding='10px 14px'; n.style.borderRadius='8px'; n.style.boxShadow='0 10px 30px rgba(0,0,0,0.12)';
  document.body.appendChild(n);
  setTimeout(()=>{ n.style.transition='opacity .3s'; n.style.opacity='0'; setTimeout(()=> n.remove(),300); },2200);
}
