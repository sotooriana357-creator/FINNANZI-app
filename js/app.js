// FINNANZI - versión limpia
// - Donuts (Chart.js) para reportes día/semana
// - Limpia formularios al agregar
// - Eliminar transacción borra en localStorage
// - Guarda todo en localStorage
// - Respetando paleta de colores (verde principal), sin opción "pastel"

// ---------------- constantes y datos ----------------
const LS_TX = 'finnanzi-transactions';
const LS_GOALS = 'finnanzi-goals';
const LS_REM = 'finnanzi-reminders';

let transactions = [];
let goals = [];
let reminders = [];

const categories = [
  { id:1, name:'Alimentación', type:'expense'},
  { id:2, name:'Transporte', type:'expense'},
  { id:3, name:'Entretenimiento', type:'expense'},
  { id:4, name:'Educación', type:'expense'},
  { id:5, name:'Salud', type:'expense'},
  { id:6, name:'Vivienda', type:'expense'},
  { id:7, name:'Salario', type:'income'},
  { id:8, name:'Inversiones', type:'income'},
  { id:9, name:'Regalos', type:'income'},
  { id:10, name:'Otros', type:'both'}
];

// Chart.js chart references (para destruir antes de crear nuevo)
let chartOverview = null;
let chartCategories = null;

// ---------------- init ----------------
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  initTheme();
  setupNavigation();
  setupForms();
  setupWidgets();
  setupReports();
  updateUI();

  // fechas por defecto
  const today = new Date().toISOString().split('T')[0];
  const txDate = document.getElementById('transaction-date');
  if (txDate) txDate.value = today;
  const rpDate = document.getElementById('report-date');
  if (rpDate) rpDate.value = today;
  const gd = document.getElementById('goal-deadline');
  if (gd) gd.valueAsDate = new Date(Date.now() + 30*24*60*60*1000);

  document.getElementById('year').textContent = new Date().getFullYear();
});

// ---------------- storage ----------------
function loadStorage(){
  const s = localStorage.getItem(LS_TX);
  const g = localStorage.getItem(LS_GOALS);
  const r = localStorage.getItem(LS_REM);
  transactions = s ? JSON.parse(s) : [];
  goals = g ? JSON.parse(g) : [];
  reminders = r ? JSON.parse(r) : [];
}

function saveStorage(){
  localStorage.setItem(LS_TX, JSON.stringify(transactions));
  localStorage.setItem(LS_GOALS, JSON.stringify(goals));
  localStorage.setItem(LS_REM, JSON.stringify(reminders));
}

// ---------------- theme ----------------
function initTheme(){
  const sel = document.getElementById('theme-select');
  if (!sel) return;
  sel.value = 'claro';
  sel.addEventListener('change', e => {
    if (e.target.value === 'oscuro') document.documentElement.style.setProperty('--bg','#0b1220');
    else document.documentElement.style.removeProperty('--bg');
  });
}

// ---------------- navigation ----------------
function setupNavigation(){
  const links = document.querySelectorAll('.nav-link');
  links.forEach(l => {
    l.addEventListener('click', e => {
      e.preventDefault();
      links.forEach(x => x.classList.remove('active'));
      l.classList.add('active');
      const id = l.getAttribute('data-section');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      const sec = document.getElementById(id);
      if (sec) sec.classList.add('active');
      window.scrollTo(0,0);
    });
  });
}

// ---------------- forms & tx ----------------
function setupForms(){
  fillCategorySelect();

  const form = document.getElementById('transaction-form');
  const clearBtn = document.getElementById('clear-transaction-form');

  if (form){
    form.addEventListener('submit', e => {
      e.preventDefault();
      addTransactionFromForm();
    });
  }

  if (clearBtn){
    clearBtn.addEventListener('click', () => {
      form.reset();
      document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
      document.getElementById('transaction-type').focus();
    });
  }

  const goalForm = document.getElementById('goal-form');
  if (goalForm){
    goalForm.addEventListener('submit', e => {
      e.preventDefault();
      addGoalFromForm();
    });
  }
}

function fillCategorySelect(){
  const sel = document.getElementById('transaction-category');
  if (!sel) return;
  sel.innerHTML = '<option value="">Selecciona una categoría</option>';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

function addTransactionFromForm(){
  const type = document.getElementById('transaction-type').value;
  const amount = parseFloat(document.getElementById('transaction-amount').value) || 0;
  const catId = parseInt(document.getElementById('transaction-category').value) || null;
  const desc = (document.getElementById('transaction-description').value || '').trim();
  const date = document.getElementById('transaction-date').value || new Date().toISOString().split('T')[0];

  if (!type || amount <= 0 || !catId) {
    notify('Completa tipo, monto y categoría', 'error');
    return;
  }

  const catObj = categories.find(c => c.id === catId);
  const tx = {
    id: Date.now(),
    type,
    amount,
    category: catObj ? catObj.name : 'Otros',
    description: desc || (type === 'income' ? 'Ingreso' : 'Gasto'),
    date,
    timestamp: new Date().toISOString()
  };

  transactions.push(tx);
  saveStorage();
  updateUI();

  // limpiar formulario y mantener fecha actual
  const form = document.getElementById('transaction-form');
  form.reset();
  document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('transaction-type').focus();

  notify('Transacción agregada', 'success');
}

function addGoalFromForm(){
  const name = (document.getElementById('goal-name').value || '').trim();
  const target = parseFloat(document.getElementById('goal-target').value) || 0;
  const deadline = document.getElementById('goal-deadline').value;
  const desc = (document.getElementById('goal-description').value || '').trim();
  if (!name || target <= 0) { notify('Completa nombre y monto objetivo', 'error'); return; }
  const g = { id: Date.now(), name, target, current:0, deadline, description:desc, completed:false };
  goals.push(g);
  saveStorage();
  updateUI();
  document.getElementById('goal-form').reset();
  notify('Meta creada', 'success');
}

// quick add floating button
function setupWidgets(){
  const addBtn = document.getElementById('add-quick-transaction');
  if (addBtn) addBtn.addEventListener('click', quickAdd);
  const enableBtn = document.getElementById('enable-reminders');
  if (enableBtn) enableBtn.addEventListener('click', toggleReminders);
  const testBtn = document.getElementById('test-reminder');
  if (testBtn) testBtn.addEventListener('click', ()=> { createReminder('Prueba', 'Recordatorio de prueba'); notify('Recordatorio creado','success'); });
}

function quickAdd(){
  const amount = prompt('Monto (Bs.):');
  if (!amount || isNaN(amount)) return;
  const desc = prompt('Descripción (opcional):') || 'Transacción rápida';
  const isIncome = confirm('¿Es un ingreso? (Aceptar = Ingreso)');
  const tx = {
    id: Date.now(),
    type: isIncome ? 'income' : 'expense',
    amount: parseFloat(amount),
    category: 'Otros',
    description: desc,
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString()
  };
  transactions.push(tx);
  saveStorage();
  updateUI();
  notify('Transacción rápida agregada', 'success');
}

// ---------------- eliminar ----------------
function deleteTransaction(id){
  if (!confirm('¿Eliminar esta transacción?')) return;
  const idx = transactions.findIndex(t => t.id === id);
  if (idx === -1) return;
  transactions.splice(idx, 1);
  saveStorage();
  updateUI();
  notify('Transacción eliminada', 'info');
}

// ---------------- UI updates ----------------
function updateUI(){
  updateBalance();
  renderRecent();
  renderHistory();
  renderGoals();
  renderCategorySummary();
  renderReminders();
  // if currently in reports and a chart is visible, keep it (user triggers charts manually)
}

function updateBalance(){
  const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const total = inc - exp;
  const elTotal = document.getElementById('total-balance');
  if (elTotal) { elTotal.textContent = `Bs. ${total.toFixed(2)}`; elTotal.className = total>=0 ? 'big-amount positive' : 'big-amount negative'; }
  const elInc = document.getElementById('total-income'); if (elInc) elInc.textContent = `Bs. ${inc.toFixed(2)}`;
  const elExp = document.getElementById('total-expense'); if (elExp) elExp.textContent = `Bs. ${exp.toFixed(2)}`;
  const fl = document.getElementById('floating-balance-amount'); if (fl) { fl.textContent = `Bs. ${total.toFixed(2)}`; fl.className = total>=0 ? 'balance-small positive' : 'balance-small negative'; }
}

function renderRecent(){
  const target = document.getElementById('widget-transactions');
  if (!target) return;
  const recent = [...transactions].sort((a,b)=> new Date(b.date) - new Date(a.date)).slice(0,4);
  if (recent.length === 0) target.innerHTML = '<p>No hay transacciones recientes</p>';
  else {
    target.innerHTML = recent.map(t => {
      const s = t.type === 'income' ? '+' : '-';
      return `<div class="transaction-item"><div class="transaction-details"><div style="font-weight:600">${escapeHtml(t.description)}</div><div class="transaction-category">${escapeHtml(t.category)} • ${formatDate(t.date)}</div></div><div class="transaction-amount ${t.type}">${s}Bs. ${t.amount.toFixed(2)}</div></div>`;
    }).join('');
  }
}

function renderHistory(){
  const container = document.getElementById('transaction-history');
  if (!container) return;
  container.innerHTML = '';
  if (transactions.length === 0) { container.innerHTML = '<p>No hay transacciones registradas</p>'; return; }
  const sorted = [...transactions].sort((a,b)=> new Date(b.date) - new Date(a.date));
  sorted.forEach(t => {
    const row = document.createElement('div'); row.className = 'transaction-item';
    const details = document.createElement('div'); details.className = 'transaction-details';
    const d1 = document.createElement('div'); d1.textContent = t.description; d1.style.fontWeight='600';
    const d2 = document.createElement('div'); d2.className='transaction-category'; d2.textContent = `${t.category} • ${formatDate(t.date)}`;
    details.appendChild(d1); details.appendChild(d2);
    const amount = document.createElement('div'); amount.className = `transaction-amount ${t.type}`; amount.textContent = (t.type==='income'?'+':'-')+'Bs. '+t.amount.toFixed(2);
    const actions = document.createElement('div'); actions.className='transaction-actions';
    const btn = document.createElement('button'); btn.className='delete-btn'; btn.innerHTML='🗑️'; btn.title='Eliminar';
    btn.addEventListener('click', ()=> deleteTransaction(t.id));
    actions.appendChild(btn);
    row.appendChild(details); row.appendChild(amount); row.appendChild(actions);
    container.appendChild(row);
  });
}

function renderGoals(){
  const el = document.getElementById('goals-list');
  const widget = document.getElementById('widget-goals');
  if (el){
    el.innerHTML = '';
    if (goals.length === 0) el.innerHTML = '<p>No hay metas</p>';
    else {
      goals.forEach(g => {
        const item = document.createElement('div'); item.className='goal-item'; item.style.padding='10px';
        item.innerHTML = `<div style="flex:1"><strong>${escapeHtml(g.name)}</strong><div style="font-size:13px;color:var(--muted)">${formatDate(g.deadline)} • ${escapeHtml(g.description||'')}</div></div><div style="min-width:120px;text-align:right"><div style="font-weight:700">Bs. ${g.current.toFixed(2)} / ${g.target.toFixed(2)}</div></div>`;
        el.appendChild(item);
      });
    }
  }
  if (widget){
    const active = goals.filter(g=>!g.completed).slice(0,3);
    if (active.length === 0) widget.innerHTML = '<p>No hay metas activas</p>';
    else {
      widget.innerHTML = active.map(g => {
        const pct = g.target>0? (g.current/g.target)*100 : 0;
        return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:13px"><span>${escapeHtml(g.name)}</span><span>${pct.toFixed(0)}%</span></div><div style="height:8px;background:#eef2f6;border-radius:6px;overflow:hidden"><div style="width:${Math.min(pct,100)}%;height:100%;background:var(--verde-osc)"></div></div></div>`;
      }).join('');
    }
  }
}

function renderCategorySummary(){
  const container = document.getElementById('category-summary');
  if (!container) return;
  if (transactions.length === 0) { container.innerHTML = '<p>No hay datos para el resumen</p>'; return; }
  const map = {};
  transactions.forEach(t => {
    if (!map[t.category]) map[t.category] = { income:0, expense:0 };
    if (t.type === 'income') map[t.category].income += t.amount;
    else if (t.type === 'expense') map[t.category].expense += t.amount;
  });
  const html = Object.keys(map).map(cat => {
    const d = map[cat]; const total = d.income - d.expense;
    return `<div class="category-row"><div>${escapeHtml(cat)}</div><div style="font-weight:700">${total>=0?'+Bs. ':'-Bs. '}${Math.abs(total).toFixed(2)}</div></div>`;
  }).join('');
  container.innerHTML = html;
}

function renderReminders(){
  const el = document.getElementById('active-reminders');
  if (!el) return;
  el.innerHTML = '';
  const list = reminders.slice(-6).reverse();
  if (list.length === 0) el.innerHTML = '<p>No hay recordatorios activos</p>';
  else {
    list.forEach(r => {
      const d = document.createElement('div'); d.className='reminder-item'; d.style.padding='8px'; d.style.marginBottom='8px';
      d.innerHTML = `<strong>${escapeHtml(r.title)}</strong><div style="font-size:13px;color:var(--muted)">${escapeHtml(r.message)}</div><small style="color:var(--muted)">${formatDate(r.createdAt)}</small>`;
      el.appendChild(d);
    });
  }
}

// ---------------- reportes (Chart.js donuts) ----------------
function setupReports(){
  const btnDay = document.getElementById('generate-report-day');
  const btnWeek = document.getElementById('generate-report-week');
  if (btnDay) btnDay.addEventListener('click', e=>{ e.preventDefault(); generateReport('day'); });
  if (btnWeek) btnWeek.addEventListener('click', e=>{ e.preventDefault(); generateReport('week'); });
}

function generateReport(mode){
  const chosen = document.getElementById('report-date').value || new Date().toISOString().split('T')[0];
  const container = document.getElementById('report-charts');
  const reportContent = document.getElementById('report-content');
  if (!container || !reportContent) return;

  // seleccionar transacciones del periodo
  let list = [];
  let title = '';
  if (mode === 'day'){
    title = `Reporte del día: ${formatDate(chosen)}`;
    list = transactions.filter(t => t.date === chosen);
  } else {
    const ref = new Date(chosen);
    const day = ref.getDay();
    const diffToMonday = (day === 0) ? -6 : (1 - day);
    const monday = new Date(ref); monday.setDate(ref.getDate() + diffToMonday); monday.setHours(0,0,0,0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
    title = `Reporte semanal: ${formatDate(monday.toISOString().split('T')[0])} — ${formatDate(sunday.toISOString().split('T')[0])}`;
    list = transactions.filter(t => {
      const d = new Date(t.date + 'T00:00:00');
      return d >= monday && d <= sunday;
    });
  }

  if (!list || list.length === 0) {
    reportContent.querySelector('#report-charts').innerHTML = '';
    reportContent.querySelector('p')?.remove();
    container.innerHTML = `<p>No hay transacciones para este periodo (${title}).</p>`;
    return;
  }

  // Totales
  const totalInc = list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExp = list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);

  // breakdown por categoría (suma por categoria)
  const catMap = {};
  list.forEach(t => {
    if (!catMap[t.category]) catMap[t.category] = 0;
    catMap[t.category] += t.amount;
  });

  // limpiar contenedor y crear canvases para Chart.js
  container.innerHTML = '';
  const overviewCard = document.createElement('div'); overviewCard.className = 'donut-card';
  overviewCard.innerHTML = `<div style="font-weight:700;margin-bottom:6px">${escapeHtml(title)}</div><canvas id="chart-overview" width="160" height="160"></canvas><div style="margin-top:6px">Ingresos: Bs. ${totalInc.toFixed(2)} • Gastos: Bs. ${totalExp.toFixed(2)}</div>`;
  container.appendChild(overviewCard);

  // categories donut (top 5)
  const catEntries = Object.keys(catMap).map(k=>({k,v:catMap[k]})).sort((a,b)=>b.v-a.v).slice(0,5);
  if (catEntries.length) {
    const catCard = document.createElement('div'); catCard.className='donut-card';
    catCard.innerHTML = `<div style="font-weight:700;margin-bottom:6px">Top categorías</div><canvas id="chart-categories" width="160" height="160"></canvas>`;
    container.appendChild(catCard);
  }

  // crear datasets
  // overview: income vs expense (use absolute for plotting)
  const overviewLabels = ['Ingresos','Gastos'];
  const overviewData = [totalInc, totalExp];
  const overviewColors = ['#27ae60','#e74c3c'];

  // categories
  const catLabels = catEntries.map(c=>c.k);
  const catData = catEntries.map(c=>c.v);
  const palette = ['#27ae60','#3498db','#f1c40f','#9b59b6','#e67e22'];

  // destruir charts previos si existían
  if (chartOverview) { chartOverview.destroy(); chartOverview = null; }
  if (chartCategories) { chartCategories.destroy(); chartCategories = null; }

  // crear chart overview
  const ctxO = document.getElementById('chart-overview').getContext('2d');
  chartOverview = new Chart(ctxO, {
    type: 'doughnut',
    data: {
      labels: overviewLabels,
      datasets: [{ data: overviewData, backgroundColor: overviewColors }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: { legend: { position: 'bottom' } }
    }
  });

  // crear chart categories (si aplica)
  if (catEntries.length) {
    const ctxC = document.getElementById('chart-categories').getContext('2d');
    chartCategories = new Chart(ctxC, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{ data: catData, backgroundColor: palette.slice(0,catData.length) }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  // additionally show list of transactions under charts
  const detailsHtml = list.sort((a,b)=> new Date(b.date) - new Date(a.date)).map(t => `
    <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #f2f6fa">
      <div style="flex:1">
        <div style="font-weight:600">${escapeHtml(t.description)}</div>
        <div style="font-size:12px;color:var(--muted)">${escapeHtml(t.category)} • ${formatDate(t.date)}</div>
      </div>
      <div style="min-width:110px;text-align:right;font-weight:700">${t.type==='income'?'+':'-'}Bs. ${t.amount.toFixed(2)}</div>
    </div>`).join('');
  // append the list
  const detailsWrapper = document.createElement('div');
  detailsWrapper.style.marginTop = '12px';
  detailsWrapper.innerHTML = detailsHtml;
  container.appendChild(detailsWrapper);
}

// ---------------- reminders ----------------
function createReminder(title, message){
  reminders.push({ id: Date.now(), title, message, createdAt: new Date().toISOString(), read:false });
  saveStorage();
  renderReminders();
}

function toggleReminders(){
  const chk = document.getElementById('reminder-daily');
  if (chk && chk.checked) createReminder('Recordatorio diario','No olvides registrar tus gastos');
  else notify('Recordatorios desactivados','info');
}

// ---------------- util ----------------
function formatDate(dateStr){
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { year:'numeric', month:'short', day:'numeric' });
}

function notify(msg, type='info'){
  const n = document.createElement('div');
  n.textContent = msg;
  n.style.position='fixed'; n.style.right='18px'; n.style.top='18px';
  n.style.padding='10px 14px'; n.style.borderRadius='8px'; n.style.zIndex=2000; n.style.color='#fff'; n.style.fontWeight='700';
  n.style.boxShadow='0 8px 30px rgba(15,23,42,0.12)';
  n.style.opacity='1';
  if (type==='success') n.style.background='var(--verde-osc)';
  else if (type==='error') n.style.background='#e74c3c';
  else if (type==='warning') n.style.background='#f39c12';
  else n.style.background='#3498db';
  document.body.appendChild(n);
  setTimeout(()=>{ n.style.transition='opacity .3s'; n.style.opacity='0'; setTimeout(()=> n.remove(),300); },2200);
}

function escapeHtml(str){ if (!str) return ''; return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
