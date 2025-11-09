/* FINNANZI - final (desde cero)
   - Splash 2s
   - Diseño circular/modern
   - Tema claro/oscuro guardado
   - Transacciones (add/delete)
   - Metas (separadas) - BUG de reinicio corregido
   - Reportes (Día/Semana) con Chart.js (se generan al pedir)
   - Persistencia en localStorage
*/

const LS_TX = 'finnanzi_final_tx';
const LS_GOALS = 'finnanzi_final_goals';
const LS_THEME = 'finnanzi_final_theme';

let transactions = [];
let goals = [];
let chartOverview = null;
let chartCategories = null;

document.addEventListener('DOMContentLoaded', () => {
  // Splash
  const splash = document.getElementById('splash');
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(()=> splash.style.display = 'none', 300);
    document.getElementById('app').classList.remove('root-hidden');
  }, 2000); // 2s

  // Cargar datos
  loadState();

  // Setup UI
  setupTheme();
  setupTabs();
  setupCategoryOptions();
  setupForms();
  renderAll();

  // Fechas por defecto
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  if (document.getElementById('report-date')) document.getElementById('report-date').value = new Date().toISOString().split('T')[0];
});

/* ---------- Storage ---------- */
function loadState(){
  try {
    transactions = JSON.parse(localStorage.getItem(LS_TX)) || [];
    goals = JSON.parse(localStorage.getItem(LS_GOALS)) || [];
  } catch(e) {
    transactions = []; goals = [];
  }
}
function saveState(){
  localStorage.setItem(LS_TX, JSON.stringify(transactions));
  localStorage.setItem(LS_GOALS, JSON.stringify(goals));
}

/* ---------- Theme ---------- */
function setupTheme(){
  const saved = localStorage.getItem(LS_THEME) || 'light';
  if (saved === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = saved === 'dark' ? '🌙' : '🌓';
  btn.addEventListener('click', () => {
    const dark = document.body.classList.toggle('dark');
    localStorage.setItem(LS_THEME, dark ? 'dark' : 'light');
    btn.textContent = dark ? '🌙' : '🌓';
  });
}

/* ---------- Tabs ---------- */
function setupTabs(){
  document.querySelectorAll('.tab').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const sec = b.getAttribute('data-section');
      showSection(sec);
    });
  });
}
function showSection(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- Category options ---------- */
const DEFAULT_CATEGORIES = [
  'Alimentación','Transporte','Entretenimiento','Educación','Salud',
  'Vivienda','Salario','Inversiones','Regalos','Otros'
];
function setupCategoryOptions(){
  const sel = document.getElementById('tx-category');
  sel.innerHTML = '<option value="">Categoría</option>';
  DEFAULT_CATEGORIES.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o);
  });
}

/* ---------- Forms ---------- */
function setupForms(){
  // TX form
  const txForm = document.getElementById('tx-form');
  txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTransactionFromForm();
  });

  // Goal form
  const goalForm = document.getElementById('goal-form');
  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addGoalFromForm();
  });

  // Reports buttons
  const btnDay = document.getElementById('report-day');
  const btnWeek = document.getElementById('report-week');
  if (btnDay) btnDay.addEventListener('click', () => generateReport('day'));
  if (btnWeek) btnWeek.addEventListener('click', () => generateReport('week'));
}

/* ---------- Transactions ---------- */
function addTransactionFromForm(){
  const type = document.getElementById('tx-type').value;
  const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
  const category = document.getElementById('tx-category').value || 'Otros';
  const date = document.getElementById('tx-date').value || (new Date().toISOString().split('T')[0]);
  const desc = document.getElementById('tx-desc').value.trim() || (type === 'income' ? 'Ingreso' : 'Gasto');

  if (!type || amount <= 0) {
    toast('Completa tipo y monto (mayor a 0)', 'error'); return;
  }

  const tx = { id: Date.now()+Math.floor(Math.random()*999), type, amount: +amount, category, desc, date, ts: new Date().toISOString() };
  transactions.push(tx);
  saveState();
  renderAll();

  // limpiar form
  document.getElementById('tx-form').reset();
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];

  // actualizar reportes automáticos (hoy)
  updateReportsAuto();
  toast('Transacción agregada', 'success');
}

function deleteTransaction(id){
  transactions = transactions.filter(t => t.id !== id);
  saveState();
  renderAll();
  updateReportsAuto();
}

/* ---------- Goals (CORREGIDO) ---------- */
function addGoalFromForm(){
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value) || 0;
  if (!name || target <= 0) { toast('Nombre y monto objetivo requerdios', 'error'); return; }

  const g = { id: Date.now()+Math.floor(Math.random()*999), name, target: +target, current: 0 };
  goals.push(g);
  saveState();
  renderAll();

  // mantener en la pestaña de Metas después de crear
  const goalTab = Array.from(document.querySelectorAll('.tab')).find(b => b.getAttribute('data-section') === 'goals');
  if (goalTab) {
    goalTab.click();
  }
  // limpiar form
  document.getElementById('goal-form').reset();
  toast('Meta creada', 'success');
}

function deleteGoal(id){
  goals = goals.filter(g => g.id !== id);
  saveState();
  renderAll();
}

/* ---------- Renderers ---------- */
function renderAll(){
  renderBalance();
  renderRecent();
  renderHistory();
  renderGoalsList();
  updateFloating();
}

function renderBalance(){
  const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const total = inc - exp;
  document.getElementById('balance-value').textContent = formatMoney(total);
  document.getElementById('home-income').textContent = formatMoney(inc);
  document.getElementById('home-expense').textContent = formatMoney(exp);
}

function renderRecent(){
  const zone = document.getElementById('recent-home');
  zone.innerHTML = '';
  const list = [...transactions].sort((a,b)=> new Date(b.ts) - new Date(a.ts)).slice(0,4);
  if (list.length === 0) { zone.innerHTML = '<p class="muted">No hay transacciones aún</p>'; return; }
  list.forEach(t => {
    const div = document.createElement('div'); div.className = 'tx-item';
    div.innerHTML = `<div class="tx-left"><div style="font-weight:700">${escapeHtml(t.desc)}</div><div class="tx-cat">${escapeHtml(t.category)} • ${formatDate(t.date)}</div></div><div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'} ${formatMoney(t.amount)}</div>`;
    zone.appendChild(div);
  });
}

function renderHistory(){
  const zone = document.getElementById('tx-history');
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

function renderGoalsList(){
  const zone = document.getElementById('goals-list');
  zone.innerHTML = '';
  if (goals.length === 0) { zone.innerHTML = '<p class="muted">No tienes metas</p>'; return; }

  goals.forEach(g => {
    const el = document.createElement('div'); el.className = 'goal-item';
    const head = document.createElement('div'); head.className = 'goal-head';
    const title = document.createElement('div'); title.style.fontWeight='700'; title.textContent = g.name;
    const pct = Math.round((g.current / g.target || 0) * 100);
    const pctText = document.createElement('div'); pctText.style.fontWeight='700'; pctText.textContent = `${pct}%`;
    head.appendChild(title); head.appendChild(pctText);

    const prog = document.createElement('div'); prog.className='progress';
    const fill = document.createElement('div'); fill.className='progress-fill'; fill.style.width = `${Math.min(100, (g.current / g.target)*100)}%`;
    prog.appendChild(fill);

    // controls (aporte rápido y eliminar)
    const controls = document.createElement('div'); controls.style.marginTop='8px'; controls.style.display='flex'; controls.style.gap='8px';
    const inp = document.createElement('input'); inp.type='number'; inp.placeholder='Agregar Bs.'; inp.style.flex='1'; inp.style.padding='8px'; inp.style.borderRadius='8px'; inp.style.border='1px solid #eef3f6';
    const addBtn = document.createElement('button'); addBtn.className='btn-primary'; addBtn.textContent='Agregar';
    addBtn.addEventListener('click', () => {
      const v = parseFloat(inp.value) || 0;
      if (v > 0) {
        g.current = +(g.current + v).toFixed(2);
        if (g.current > g.target) g.current = g.target;
        saveState(); renderAll(); toast('Aporte agregado a la meta', 'success'); inp.value = '';
      }
    });
    const delBtn = document.createElement('button'); delBtn.className='btn-ghost'; delBtn.textContent='Eliminar';
    delBtn.addEventListener('click', () => {
      deleteGoal(g.id);
    });
    controls.appendChild(inp); controls.appendChild(addBtn); controls.appendChild(delBtn);

    el.appendChild(head); el.appendChild(prog); el.appendChild(controls);
    zone.appendChild(el);
  });
}

/* ---------- Reports (Chart.js) ---------- */
function updateReportsAuto(){
  // opcional: pre-generar reportes para hoy (no obligatorio)
}
function generateReport(mode){
  const chosen = document.getElementById('report-date').value || new Date().toISOString().split('T')[0];
  generateReportInternal(mode, chosen);
}

function generateReportInternal(mode, chosenDate){
  const pc = document.getElementById('report-charts');
  const summary = document.getElementById('report-summary');
  pc.innerHTML = '';

  let list = [], title = '';
  if (mode === 'day'){
    title = `Reporte del día: ${formatDate(chosenDate)}`;
    list = transactions.filter(t => t.date === chosenDate);
  } else {
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

  // destruir charts previos
  try { if (chartOverview) { chartOverview.destroy(); chartOverview = null; } } catch(e){}
  try { if (chartCategories) { chartCategories.destroy(); chartCategories = null; } } catch(e){}

  // crear overview
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

  // lista de transacciones
  const listDiv = document.createElement('div'); listDiv.style.marginTop='12px';
  listDiv.innerHTML = list.sort((a,b)=> new Date(b.ts) - new Date(a.ts)).map(t => `
    <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #f2f6f9">
      <div style="flex:1"><div style="font-weight:700">${escapeHtml(t.desc)}</div><div class="muted">${escapeHtml(t.category)} • ${formatDate(t.date)}</div></div>
      <div style="min-width:110px;text-align:right;font-weight:700">${t.type==='income'?'+':'-'} ${formatMoney(t.amount)}</div>
    </div>`).join('');
  pc.appendChild(listDiv);
}

/* ---------- Utilities ---------- */
function renderAll(){
  renderBalance();
  renderRecent();
  renderHistory();
  renderGoalsList();
  updateFloating();
}
function formatMoney(n){ return `Bs. ${Number(n).toFixed(2)}` }
function escapeHtml(s){ return s? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) : '' }
function formatDate(ymd){ if(!ymd) return ''; const d = new Date(ymd); return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });}
function toast(msg, type='info'){ const n = document.createElement('div'); n.textContent = msg; n.style.position='fixed'; n.style.right='16px'; n.style.bottom='96px'; n.style.background = type==='success'? '#27ae60' : type==='error'? '#e24b4b' : '#3498db'; n.style.color='#fff'; n.style.padding='10px 14px'; n.style.borderRadius='8px'; n.style.boxShadow='0 10px 30px rgba(0,0,0,0.12)'; document.body.appendChild(n); setTimeout(()=>{ n.style.transition='opacity .3s'; n.style.opacity='0'; setTimeout(()=> n.remove(),300); },1800); }

function updateFloating(){
  const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const total = inc - exp;
  const el = document.getElementById('floating');
  if(el) el.textContent = formatMoney(total);
}

/* reportes auto (cuando cambian tx) */
function updateReportsAuto(){ /* ahora los reportes se generan cuando el usuario lo pide, pero aquí podríamos auto actualizar */ }
