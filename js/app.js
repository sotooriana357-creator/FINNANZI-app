/* FINNANZI - Minimalista (desde cero)
   - Navegación por secciones (no todo en una pantalla)
   - Transacciones: agregar, borrar (sin confirmación), limpiar formulario
   - Metas con % y barra de progreso
   - Reportes día/semana con donuts (Chart.js)
   - Persistencia en localStorage
*/

/* ---------- Keys y estado ---------- */
const LS_TX = 'finnanzi_tx_v1';
const LS_GOALS = 'finnanzi_goals_v1';

let transactions = []; // {id, type, amount, category, desc, date, ts}
let goals = [];        // {id, name, target, current}

/* Categorías predeterminadas */
const CATEGORIES = [
  'Alimentación','Transporte','Entretenimiento','Educación','Salud','Vivienda','Salario','Inversiones','Regalos','Otros'
];

/* Chart refs (para destruir antes de rehacer) */
let chartOverview = null;
let chartCategories = null;

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Cargar
  loadState();

  // Setup UI
  setupNavigation();
  setupCategoryOptions();
  setupForms();
  setupQuickAdd();
  setupReports();
  renderAll();

  // Fechas por defecto
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('tx-date').value = today;
  const rp = document.getElementById('report-date');
  if (rp) rp.value = today;
});

/* ---------- Storage ---------- */
function loadState(){
  try {
    const s = localStorage.getItem(LS_TX);
    const g = localStorage.getItem(LS_GOALS);
    transactions = s ? JSON.parse(s) : [];
    goals = g ? JSON.parse(g) : [];
  } catch(e){
    transactions = []; goals = [];
    console.error('Error parseando localStorage', e);
  }
}
function saveState(){
  localStorage.setItem(LS_TX, JSON.stringify(transactions));
  localStorage.setItem(LS_GOALS, JSON.stringify(goals));
}

/* ---------- Navigation ---------- */
function setupNavigation(){
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sec = btn.getAttribute('data-section');
      showSection(sec);
    });
  });

  // botones internos para facilitar flujo
  document.getElementById('goto-transactions').addEventListener('click', () => {
    activateTab('transactions');
  });
  document.getElementById('goto-goals').addEventListener('click', () => {
    activateTab('transactions');
    // focus on goal form
    setTimeout(()=> document.getElementById('goal-name').focus(), 150);
  });
}

function activateTab(sectionId){
  const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('data-section') === sectionId);
  if (btn) btn.click();
}

function showSection(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ---------- Category options ---------- */
function setupCategoryOptions(){
  const sel = document.getElementById('tx-category');
  sel.innerHTML = '<option value="">Categoría</option>';
  CATEGORIES.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c;
    sel.appendChild(o);
  });
}

/* ---------- Forms: tx and goals ---------- */
function setupForms(){
  const txForm = document.getElementById('tx-form');
  txForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTransactionFromForm();
  });

  document.getElementById('tx-clear').addEventListener('click', () => {
    txForm.reset();
    document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('tx-type').focus();
  });

  const goalForm = document.getElementById('goal-form');
  goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addGoalFromForm();
  });
  document.getElementById('goal-clear').addEventListener('click', () => {
    goalForm.reset();
    document.getElementById('goal-name').focus();
  });
}

function addTransactionFromForm(){
  const type = document.getElementById('tx-type').value;
  const amount = parseFloat(document.getElementById('tx-amount').value) || 0;
  const category = document.getElementById('tx-category').value || 'Otros';
  const date = document.getElementById('tx-date').value || new Date().toISOString().split('T')[0];
  const desc = document.getElementById('tx-desc').value.trim();

  if (!type || amount <= 0) {
    toast('Completa tipo y monto (mayor a 0)', 'error'); return;
  }

  const tx = {
    id: Date.now() + Math.floor(Math.random()*999),
    type, amount: parseFloat(amount), category, desc: desc || (type === 'income' ? 'Ingreso' : 'Gasto'), date, ts: new Date().toISOString()
  };

  transactions.push(tx);
  saveState();
  renderAll();

  // limpiar formulario (sin perder la fecha actual)
  document.getElementById('tx-form').reset();
  document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('tx-type').focus();
  // si una meta existe y es income -> sumar a la meta más reciente? (opcional) — por ahora no se asigna
  toast('Transacción agregada', 'success');
}

function addGoalFromForm(){
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value) || 0;
  if (!name || target <= 0) { toast('Nombre y monto objetivo requeridos', 'error'); return; }
  const g = { id: Date.now()+Math.floor(Math.random()*999), name, target: parseFloat(target), current: 0 };
  goals.push(g);
  saveState();
  renderAll();
  document.getElementById('goal-form').reset();
  toast('Meta creada', 'success');
}

/* ---------- Quick add (FAB) ---------- */
function setupQuickAdd(){
  const fab = document.getElementById('quick-add');
  fab.addEventListener('click', () => {
    // quick modal-less add via prompts (simple para móvil)
    const amt = prompt('Monto (Bs.):');
    if (!amt || isNaN(amt)) return;
    const isInc = confirm('¿Es un ingreso? Aceptar = Ingreso, Cancelar = Gasto');
    const cat = prompt('Categoría (opcional):', 'Otros') || 'Otros';
    const desc = prompt('Descripción (opcional):', isInc ? 'Ingreso' : 'Gasto') || (isInc ? 'Ingreso' : 'Gasto');
    const tx = {
      id: Date.now()+Math.floor(Math.random()*999),
      type: isInc ? 'income' : 'expense',
      amount: parseFloat(amt),
      category: cat,
      desc, date: new Date().toISOString().split('T')[0], ts: new Date().toISOString()
    };
    transactions.push(tx);
    saveState(); renderAll(); toast('Transacción rápida agregada', 'success');
  });
}

/* ---------- Renderers ---------- */
function renderAll(){
  renderBalance();
  renderRecent();
  renderHistory();
  renderGoalsList();
  renderCategorySummary();
  // reports remain until user generates
  updateFloatingBalance();
}

function renderBalance(){
  const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const total = inc - exp;
  document.getElementById('balance-amount').textContent = `Bs. ${total.toFixed(2)}`;
  document.getElementById('home-income').textContent = `Ingreso: Bs. ${inc.toFixed(2)}`;
  document.getElementById('home-expense').textContent = `Gasto: Bs. ${exp.toFixed(2)}`;
  document.getElementById('floating-balance').textContent = `Bs. ${total.toFixed(2)}`;
}

function renderRecent(){
  const zone = document.getElementById('recent-list');
  zone.innerHTML = '';
  const list = [...transactions].sort((a,b)=> new Date(b.ts) - new Date(a.ts)).slice(0,4);
  if (list.length === 0) { zone.innerHTML = '<p class="muted">No hay transacciones aún</p>'; return; }
  list.forEach(t => {
    const div = document.createElement('div'); div.className = 'tx-item';
    div.innerHTML = `<div class="tx-left"><div style="font-weight:700">${escapeHtml(t.desc)}</div><div class="tx-cat">${escapeHtml(t.category)} • ${formatDate(t.date)}</div></div><div class="tx-amount ${t.type}">${t.type==='income'?'+':'-'} Bs. ${t.amount.toFixed(2)}</div>`;
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
    const dtitle = document.createElement('div'); dtitle.style.fontWeight = '700'; dtitle.textContent = t.desc;
    const dcat = document.createElement('div'); dcat.className = 'tx-cat'; dcat.textContent = `${t.category} • ${formatDate(t.date)}`;
    left.appendChild(dtitle); left.appendChild(dcat);
    const amount = document.createElement('div'); amount.className = `tx-amount ${t.type}`; amount.textContent = (t.type==='income'?'+':'-') + ' Bs. ' + t.amount.toFixed(2);
    const right = document.createElement('div'); right.style.display='flex'; right.style.alignItems='center';
    // delete button (no confirm, immediate)
    const del = document.createElement('button'); del.className='btn-ghost'; del.textContent='Eliminar'; del.style.marginLeft='8px';
    del.addEventListener('click', () => {
      // eliminar inmediatamente
      transactions = transactions.filter(x => x.id !== t.id);
      saveState();
      renderAll();
    });
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
    const progressText = document.createElement('div'); progressText.style.fontWeight='700'; progressText.textContent = `${Math.round((g.current / g.target || 0) * 100)}%`;
    head.appendChild(title); head.appendChild(progressText);
    const prog = document.createElement('div'); prog.className='progress';
    const fill = document.createElement('div'); fill.className='progress-fill'; fill.style.width = `${Math.min(100, (g.current / g.target)*100)}%`;
    prog.appendChild(fill);

    // controls: add amount to goal (quick)
    const controls = document.createElement('div'); controls.style.marginTop='8px'; controls.style.display='flex'; controls.style.gap='6px';
    const addInput = document.createElement('input'); addInput.type='number'; addInput.placeholder='Agregar Bs.'; addInput.style.flex='1'; addInput.style.padding='8px'; addInput.style.borderRadius='8px'; addInput.style.border='1px solid #eef3f6';
    const addBtn = document.createElement('button'); addBtn.className='btn-outline'; addBtn.textContent='Agregar';
    addBtn.addEventListener('click', () => {
      const val = parseFloat(addInput.value) || 0;
      if (val > 0) {
        g.current = +(g.current + val).toFixed(2);
        if (g.current > g.target) g.current = g.target;
        saveState(); renderAll(); addInput.value = '';
        toast('Aporte a meta actualizado','success');
      }
    });
    const delBtn = document.createElement('button'); delBtn.className='btn-ghost'; delBtn.textContent='Eliminar';
    delBtn.addEventListener('click', () => {
      goals = goals.filter(x => x.id !== g.id);
      saveState(); renderAll();
    });
    controls.appendChild(addInput); controls.appendChild(addBtn); controls.appendChild(delBtn);

    el.appendChild(head); el.appendChild(prog); el.appendChild(controls);
    zone.appendChild(el);
  });
}

function renderCategorySummary(){
  // optional: fills home category summary — minimal approach already shows in reports
}

/* ---------- Reports (donuts with Chart.js) ---------- */
function setupReports(){
  document.getElementById('report-day').addEventListener('click', () => generateReport('day'));
  document.getElementById('report-week').addEventListener('click', () => generateReport('week'));
}

function generateReport(mode){
  const chosen = document.getElementById('report-date').value || new Date().toISOString().split('T')[0];
  let list = [], title = '';
  if (mode === 'day') {
    title = `Reporte del día: ${formatDate(chosen)}`;
    list = transactions.filter(t => t.date === chosen);
  } else {
    const ref = new Date(chosen);
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

  const reportArea = document.getElementById('report-charts');
  const summary = document.getElementById('report-summary');
  reportArea.innerHTML = '';

  if (!list || list.length === 0) {
    summary.textContent = `${title} — No hay transacciones para este periodo`;
    return;
  }

  // Totales
  const totalInc = list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExp = list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  summary.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${title}</div>
                       <div class="muted">Ingresos: Bs. ${totalInc.toFixed(2)} · Gastos: Bs. ${totalExp.toFixed(2)} · Balance: Bs. ${(totalInc-totalExp).toFixed(2)}</div>`;

  // Overview donut
  const od = document.createElement('div'); od.className='donut-card';
  od.innerHTML = `<canvas id="chart-overview" width="160" height="160"></canvas><div style="font-weight:700;margin-top:6px">Ingresos vs Gastos</div>`;
  reportArea.appendChild(od);

  // Categories donut (top 5)
  const catMap = {};
  list.forEach(t => { catMap[t.category] = (catMap[t.category]||0) + t.amount; });
  const entries = Object.keys(catMap).map(k=>({k,v:catMap[k]})).sort((a,b)=>b.v-a.v).slice(0,5);

  if (entries.length) {
    const cd = document.createElement('div'); cd.className='donut-card';
    cd.innerHTML = `<canvas id="chart-cats" width="160" height="160"></canvas><div style="font-weight:700;margin-top:6px">Top categorías</div>`;
    reportArea.appendChild(cd);
  }

  // destroy existing charts
  if (chartOverview) { chartOverview.destroy(); chartOverview = null; }
  if (chartCategories) { chartCategories.destroy(); chartCategories = null; }

  // create overview chart
  const ctxO = document.getElementById('chart-overview').getContext('2d');
  chartOverview = new Chart(ctxO, {
    type: 'doughnut',
    data: {
      labels: ['Ingresos','Gastos'],
      datasets: [{
        data: [totalInc, totalExp],
        backgroundColor: ['#27ae60','#e24b4b']
      }]
    },
    options: {
      cutout: '70%',
      responsive: false,
      plugins: { legend: { position:'bottom' } }
    }
  });

  if (entries.length) {
    const ctxC = document.getElementById('chart-cats').getContext('2d');
    chartCategories = new Chart(ctxC, {
      type: 'doughnut',
      data: {
        labels: entries.map(e=>e.k),
        datasets: [{ data: entries.map(e=>e.v), backgroundColor: ['#27ae60','#3498db','#f1c40f','#9b59b6','#e67e22'] }]
      },
      options: { cutout: '65%', responsive:false, plugins:{ legend:{ position:'bottom' } } }
    });
  }

  // show list below charts
  const listDiv = document.createElement('div'); listDiv.style.marginTop='12px';
  listDiv.innerHTML = list.sort((a,b)=> new Date(b.ts) - new Date(a.ts)).map(t => `
    <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #f2f6f9">
      <div style="flex:1"><div style="font-weight:700">${escapeHtml(t.desc)}</div><div class="muted">${escapeHtml(t.category)} • ${formatDate(t.date)}</div></div>
      <div style="min-width:110px;text-align:right;font-weight:700">${t.type==='income'?'+':'-'} Bs. ${t.amount.toFixed(2)}</div>
    </div>`).join('');
  reportArea.appendChild(listDiv);
}

/* ---------- Utilities ---------- */
function formatDate(ymd){
  if (!ymd) return '';
  const d = new Date(ymd);
  return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
}

function toast(msg, type='info'){
  const n = document.createElement('div');
  n.textContent = msg;
  n.style.position='fixed'; n.style.right='16px'; n.style.bottom='80px';
  n.style.background = type==='success'? '#27ae60' : type==='error'? '#e24b4b' : '#3498db';
  n.style.color = '#fff'; n.style.padding = '10px 14px'; n.style.borderRadius='8px'; n.style.boxShadow='0 10px 30px rgba(15,23,42,0.08)';
  document.body.appendChild(n);
  setTimeout(()=> { n.style.transition='opacity .3s'; n.style.opacity='0'; setTimeout(()=> n.remove(),300); }, 2200);
}

function escapeHtml(str){
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
