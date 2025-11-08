/* app.js - FINNANZI (corregido)
   - Limpia inputs al agregar
   - Botón eliminar funciona (borra en localStorage)
   - Reportes día y semana
   - Quitar "+" junto al texto del balance
   - Guarda/lee usando localStorage
*/

let transactions = [];
let goals = [];
let reminders = [];
const categories = [
    { id: 1, name: "Alimentación", type: "expense" },
    { id: 2, name: "Transporte", type: "expense" },
    { id: 3, name: "Entretenimiento", type: "expense" },
    { id: 4, name: "Educación", type: "expense" },
    { id: 5, name: "Salud", type: "expense" },
    { id: 6, name: "Vivienda", type: "expense" },
    { id: 7, name: "Salario", type: "income" },
    { id: 8, name: "Inversiones", type: "income" },
    { id: 9, name: "Regalos", type: "income" },
    { id: 10, name: "Otros", type: "both" }
];

let appConfig = {
    theme: 'claro',
    currency: 'BOB',
    remindersEnabled: false,
    reminderTime: '20:00'
};

/* ---------- Inicialización ---------- */
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupThemes();
    setupNavigation();
    setupForms();
    setupReminders();
    setupWidgets();
    setupReports();
    updateUI();

    // fecha por defecto en inputs
    const today = new Date().toISOString().split('T')[0];
    const txDate = document.getElementById('transaction-date');
    if (txDate) txDate.value = today;
    const reportDate = document.getElementById('report-date');
    if (reportDate) reportDate.value = today;
    const goalDeadline = document.getElementById('goal-deadline');
    if (goalDeadline) goalDeadline.valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    document.getElementById('year').textContent = new Date().getFullYear();
});

/* ---------- LocalStorage ---------- */
function loadData(){
    const sT = localStorage.getItem('finnanzi-transactions');
    const sG = localStorage.getItem('finnanzi-goals');
    const sC = localStorage.getItem('finnanzi-config');
    const sR = localStorage.getItem('finnanzi-reminders');
    if (sT) transactions = JSON.parse(sT);
    if (sG) goals = JSON.parse(sG);
    if (sC) appConfig = {...appConfig, ...JSON.parse(sC)};
    if (sR) reminders = JSON.parse(sR);
}

function saveData(){
    localStorage.setItem('finnanzi-transactions', JSON.stringify(transactions));
    localStorage.setItem('finnanzi-goals', JSON.stringify(goals));
    localStorage.setItem('finnanzi-config', JSON.stringify(appConfig));
    localStorage.setItem('finnanzi-reminders', JSON.stringify(reminders));
}

/* ---------- Temas ---------- */
function setupThemes(){
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;
    themeSelect.value = appConfig.theme || 'claro';
    applyTheme(appConfig.theme || 'claro');
    themeSelect.addEventListener('change', function(){
        appConfig.theme = this.value;
        applyTheme(appConfig.theme);
        saveData();
    });
}

function applyTheme(name){
    if (name === 'oscuro') {
        document.documentElement.setAttribute('data-theme', 'oscuro');
        document.documentElement.style.setProperty('--bg','#0b1220');
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.style.removeProperty('--bg');
    }
}

/* ---------- Navegación ---------- */
function setupNavigation(){
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e){
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const id = this.getAttribute('data-section');
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const target = document.getElementById(id);
            if (target) target.classList.add('active');
            window.scrollTo(0,0);
        });
    });
}

/* ---------- Formularios y transacciones ---------- */
function setupForms(){
    fillCategoryOptions();

    const txForm = document.getElementById('transaction-form');
    const clearBtn = document.getElementById('clear-transaction-form');

    if (txForm) {
        txForm.addEventListener('submit', function(e){
            e.preventDefault();
            addTransactionFromForm();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            txForm.reset();
            document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('transaction-type').focus();
        });
    }

    // Goal form
    const goalForm = document.getElementById('goal-form');
    if (goalForm) {
        goalForm.addEventListener('submit', function(e){
            e.preventDefault();
            const name = document.getElementById('goal-name').value.trim();
            const target = parseFloat(document.getElementById('goal-target').value) || 0;
            const deadline = document.getElementById('goal-deadline').value;
            const description = document.getElementById('goal-description').value.trim();

            const goal = { id: Date.now(), name, target, current: 0, deadline, description, completed: false, createdAt: new Date().toISOString() };
            goals.push(goal);
            saveData();
            updateUI();
            goalForm.reset();
            document.getElementById('goal-deadline').valueAsDate = new Date(Date.now() + 30*24*60*60*1000);
            notify('Meta creada', 'success');
        });
    }
}

function fillCategoryOptions(){
    const catSelect = document.getElementById('transaction-category');
    if (!catSelect) return;
    catSelect.innerHTML = '<option value="">Selecciona una categoría</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        catSelect.appendChild(opt);
    });
}

function addTransactionFromForm(){
    const typeEl = document.getElementById('transaction-type');
    const amountEl = document.getElementById('transaction-amount');
    const catEl = document.getElementById('transaction-category');
    const descEl = document.getElementById('transaction-description');
    const dateEl = document.getElementById('transaction-date');

    const type = typeEl.value;
    const amount = parseFloat(amountEl.value) || 0;
    const catId = parseInt(catEl.value) || null;
    const description = descEl.value.trim() || (type === 'income' ? 'Ingreso' : 'Gasto');
    const date = dateEl.value || new Date().toISOString().split('T')[0];

    if (!type || amount <= 0 || !catId) {
        notify('Completa tipo, monto y categoría', 'error');
        return;
    }

    const category = categories.find(c => c.id === catId);
    const tx = {
        id: Date.now(),
        type,
        amount,
        category: category ? category.name : 'Otros',
        description,
        date,
        timestamp: new Date().toISOString()
    };

    transactions.push(tx);
    saveData();
    updateUI();

    // limpiar formulario y dejar fecha actual
    document.getElementById('transaction-form').reset();
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-type').focus();

    notify('Transacción agregada', 'success');
}

/* Quick add (floating button) */
function setupWidgets(){
    document.getElementById('add-quick-transaction').addEventListener('click', showQuickTransactionForm);
    updateWidgets();
}

function showQuickTransactionForm(){
    const amount = prompt('Ingresa el monto en Bs.:');
    if (!amount || isNaN(amount)) return;
    const description = prompt('Descripción (opcional):') || 'Transacción rápida';
    const isIncome = confirm('¿Es un ingreso? (Aceptar = Ingreso, Cancelar = Gasto)');
    const tx = {
        id: Date.now(),
        type: isIncome ? 'income' : 'expense',
        amount: parseFloat(amount),
        category: 'Otros',
        description,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
    };
    transactions.push(tx);
    saveData();
    updateUI();
    notify('Transacción rápida agregada', 'success');
}

/* ---------- Eliminar transacción ---------- */
function deleteTransaction(id){
    const idx = transactions.findIndex(t => t.id === id);
    if (idx === -1) return;
    // confirmar eliminación
    if (!confirm('¿Eliminar esta transacción?')) return;
    transactions.splice(idx, 1);
    saveData();
    updateUI();
    notify('Transacción eliminada', 'info');
}

/* ---------- Balance / UI ---------- */
function updateUI(){
    updateBalance();
    updateTransactionHistory();
    updateGoals();
    updateCategorySummary();
    updateWidgets();
    updateRemindersUI();
}

function updateBalance(){
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s,t)=>s+t.amount,0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s,t)=>s+t.amount,0);
    const total = totalIncome - totalExpense;

    const elTotal = document.getElementById('total-balance');
    const elInc = document.getElementById('total-income');
    const elExp = document.getElementById('total-expense');

    if (elTotal) {
        elTotal.textContent = `Bs. ${total.toFixed(2)}`;
        elTotal.className = total >= 0 ? 'big-amount positive' : 'big-amount negative';
    }
    if (elInc) elInc.textContent = `Bs. ${totalIncome.toFixed(2)}`;
    if (elExp) elExp.textContent = `Bs. ${totalExpense.toFixed(2)}`;

    // floating
    const floating = document.getElementById('floating-balance-amount');
    if (floating) {
        floating.textContent = `Bs. ${total.toFixed(2)}`;
        floating.className = total >= 0 ? 'balance-small positive' : 'balance-small negative';
    }
}

function updateWidgets(){
    // Recent transactions
    const target = document.getElementById('widget-transactions');
    if (!target) return;
    const recent = [...transactions].sort((a,b)=> new Date(b.date) - new Date(a.date)).slice(0,4);
    if (recent.length === 0) {
        target.innerHTML = '<p>No hay transacciones recientes</p>';
    } else {
        target.innerHTML = recent.map(t => {
            const sign = t.type === 'income' ? '+' : '-';
            return `<div class="transaction-item">
                <div class="transaction-details">
                    <div style="font-weight:600">${escapeHtml(t.description)}</div>
                    <div class="transaction-category">${escapeHtml(t.category)} • ${formatDate(t.date)}</div>
                </div>
                <div class="transaction-amount ${t.type}">${sign}Bs. ${t.amount.toFixed(2)}</div>
            </div>`;
        }).join('');
    }
}

/* ---------- Historial ---------- */
function updateTransactionHistory(){
    const container = document.getElementById('transaction-history');
    if (!container) return;
    if (transactions.length === 0) {
        container.innerHTML = '<p>No hay transacciones registradas</p>';
        return;
    }

    const sorted = [...transactions].sort((a,b)=> new Date(b.date) - new Date(a.date));
    container.innerHTML = '';
    sorted.forEach(t => {
        const item = document.createElement('div');
        item.className = 'transaction-item';

        const details = document.createElement('div');
        details.className = 'transaction-details';
        const desc = document.createElement('div');
        desc.textContent = t.description;
        desc.style.fontWeight = '600';
        const cat = document.createElement('div');
        cat.className = 'transaction-category';
        cat.textContent = `${t.category} • ${formatDate(t.date)}`;

        details.appendChild(desc);
        details.appendChild(cat);

        const amount = document.createElement('div');
        amount.className = `transaction-amount ${t.type}`;
        amount.textContent = (t.type === 'income' ? `+Bs. ${t.amount.toFixed(2)}` : `-Bs. ${t.amount.toFixed(2)}`);

        const actions = document.createElement('div');
        actions.className = 'transaction-actions';
        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.innerHTML = '🗑️';
        del.title = 'Eliminar';
        del.addEventListener('click', () => deleteTransaction(t.id));
        actions.appendChild(del);

        item.appendChild(details);
        item.appendChild(amount);
        item.appendChild(actions);

        container.appendChild(item);
    });
}

/* ---------- Goals ---------- */
function updateGoals(){
    const container = document.getElementById('goals-list');
    const widget = document.getElementById('widget-goals');
    if (container) {
        container.innerHTML = '';
        if (goals.length === 0) container.innerHTML = '<p>No hay metas</p>';
        else {
            goals.forEach(g => {
                const el = document.createElement('div');
                el.className = 'goal-item';
                el.style.padding = '10px';
                el.innerHTML = `<div style="flex:1">
                    <strong>${escapeHtml(g.name)}</strong>
                    <div style="font-size:13px;color:var(--muted)">${formatDate(g.deadline)} • ${g.description || ''}</div>
                </div>
                <div style="min-width:120px;text-align:right">
                    <div style="font-weight:700">Bs. ${g.current.toFixed(2)} / ${g.target.toFixed(2)}</div>
                </div>`;
                container.appendChild(el);
            });
        }
    }

    if (widget) {
        const active = goals.filter(g => !g.completed).slice(0,3);
        if (active.length === 0) widget.innerHTML = '<p>No hay metas activas</p>';
        else {
            widget.innerHTML = active.map(g => {
                const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
                return `<div style="margin-bottom:10px">
                    <div style="display:flex;justify-content:space-between;font-size:13px">
                        <span>${escapeHtml(g.name)}</span><span>${pct.toFixed(0)}%</span>
                    </div>
                    <div style="height:8px;background:#eef2f6;border-radius:6px;overflow:hidden">
                        <div style="width:${Math.min(pct,100)}%;height:100%;background:var(--verde-osc)"></div>
                    </div>
                </div>`;
            }).join('');
        }
    }
}

/* ---------- Categorías resumen ---------- */
function updateCategorySummary(){
    const container = document.getElementById('category-summary');
    if (!container) return;
    if (transactions.length === 0) {
        container.innerHTML = '<p>No hay datos para el resumen</p>';
        return;
    }

    const map = {};
    transactions.forEach(t => {
        if (!map[t.category]) map[t.category] = { income:0, expense:0 };
        if (t.type === 'income') map[t.category].income += t.amount;
        else if (t.type === 'expense') map[t.category].expense += t.amount;
    });

    container.innerHTML = Object.keys(map).map(cat => {
        const data = map[cat];
        const total = data.income - data.expense;
        return `<div class="category-row">
            <div>${escapeHtml(cat)}</div>
            <div style="font-weight:700">${total >= 0 ? '+Bs. ' : '-Bs. '}${Math.abs(total).toFixed(2)}</div>
        </div>`;
    }).join('');
}

/* ---------- Reportes: día y semana ---------- */
function setupReports(){
    const btnDay = document.getElementById('generate-report-day');
    const btnWeek = document.getElementById('generate-report-week');
    if (btnDay) btnDay.addEventListener('click', (e)=> { e.preventDefault(); generateReport('day'); });
    if (btnWeek) btnWeek.addEventListener('click', (e)=> { e.preventDefault(); generateReport('week'); });
}

function generateReport(mode){
    const selectedDate = document.getElementById('report-date').value || new Date().toISOString().split('T')[0];
    const reportEl = document.getElementById('report-content');
    if (!reportEl) return;

    if (mode === 'day') {
        // filtrar por fecha exacta
        const dayTx = transactions.filter(t => t.date === selectedDate);
        renderReport(reportEl, dayTx, `Reporte del día: ${formatDate(selectedDate)}`);
    } else if (mode === 'week') {
        // obtener semana (Lunes - Domingo) de la fecha seleccionada
        const ref = new Date(selectedDate);
        const day = ref.getDay(); // 0 (dom) - 6
        // calcular lunes (día 1); si Sunday (0) => retroceder 6 días para lunes anterior
        const diffToMonday = (day === 0) ? -6 : (1 - day);
        const monday = new Date(ref);
        monday.setDate(ref.getDate() + diffToMonday);
        monday.setHours(0,0,0,0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23,59,59,999);

        const weekTx = transactions.filter(t => {
            const d = new Date(t.date + 'T00:00:00');
            return d >= monday && d <= sunday;
        });

        renderReport(reportEl, weekTx, `Reporte semanal: ${formatDate(monday.toISOString().split('T')[0])} — ${formatDate(sunday.toISOString().split('T')[0])}`);
    }
}

function renderReport(container, list, title){
    if (!container) return;
    if (!list || list.length === 0) {
        container.innerHTML = `<p>No hay transacciones para este periodo (${title}).</p>`;
        return;
    }

    const totalIncome = list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
    const totalExpense = list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
    const balance = totalIncome - totalExpense;

    const itemsHtml = list.sort((a,b)=> new Date(b.date) - new Date(a.date)).map(t => `
        <div style="display:flex;justify-content:space-between;padding:8px;border-bottom:1px solid #f2f6fa">
            <div style="flex:1">
                <div style="font-weight:600">${escapeHtml(t.description)}</div>
                <div style="font-size:12px;color:var(--muted)">${escapeHtml(t.category)} • ${formatDate(t.date)}</div>
            </div>
            <div style="min-width:110px;text-align:right;font-weight:700">${t.type==='income'?'+':'-'}Bs. ${t.amount.toFixed(2)}</div>
        </div>
    `).join('');

    container.innerHTML = `
        <div style="margin-bottom:8px;font-weight:700">${title}</div>
        <div style="margin-bottom:8px;display:flex;gap:12px">
            <div>Ingresos: <strong>Bs. ${totalIncome.toFixed(2)}</strong></div>
            <div>Gastos: <strong>Bs. ${totalExpense.toFixed(2)}</strong></div>
            <div>Balance: <strong>${balance >= 0 ? 'Bs. ' : '-Bs. '}${Math.abs(balance).toFixed(2)}</strong></div>
        </div>
        <div>${itemsHtml}</div>
    `;
}

/* ---------- Recordatorios (básico) ---------- */
function setupReminders(){
    document.getElementById('enable-reminders').addEventListener('click', toggleReminders);
    document.getElementById('test-reminder').addEventListener('click', ()=> {
        createReminder('Prueba', 'Este es un recordatorio de prueba', 'test');
        notify('Recordatorio creado', 'success');
    });
    updateRemindersUI();
}

function toggleReminders(){
    appConfig.remindersEnabled = !appConfig.remindersEnabled;
    saveData();
    notify(appConfig.remindersEnabled ? 'Recordatorios activados' : 'Recordatorios desactivados', 'info');
}

function createReminder(title, message, type){
    reminders.push({ id: Date.now(), title, message, type, createdAt: new Date().toISOString(), read: false });
    saveData();
    updateRemindersUI();
}

function updateRemindersUI(){
    const container = document.getElementById('active-reminders');
    if (!container) return;
    container.innerHTML = '';
    const list = reminders.slice(-6).reverse();
    if (list.length === 0) container.innerHTML = '<p>No hay recordatorios activos</p>';
    else list.forEach(r => {
        const el = document.createElement('div');
        el.className = 'reminder-item';
        el.style.padding = '8px';
        el.style.marginBottom = '8px';
        el.innerHTML = `<strong>${escapeHtml(r.title)}</strong><div style="font-size:13px;color:var(--muted)">${escapeHtml(r.message)}</div><small style="color:var(--muted)">${formatDate(r.createdAt)}</small>`;
        container.appendChild(el);
    });
}

/* ---------- Utilidades ---------- */
function formatDate(dateString){
    if (!dateString) return '';
    const d = new Date(dateString);
    const options = { year:'numeric', month:'short', day:'numeric' };
    return d.toLocaleDateString('es-ES', options);
}

function notify(message, type='info'){
    // simple notification visible en pantalla
    const n = document.createElement('div');
    n.textContent = message;
    n.style.position = 'fixed';
    n.style.right = '18px';
    n.style.top = '18px';
    n.style.padding = '10px 14px';
    n.style.borderRadius = '8px';
    n.style.zIndex = 2000;
    n.style.color = '#fff';
    n.style.fontWeight = 700;
    n.style.boxShadow = '0 8px 30px rgba(15,23,42,0.12)';
    if (type === 'success') n.style.background = '#2ecc71';
    else if (type === 'error') n.style.background = '#e74c3c';
    else if (type === 'warning') n.style.background = '#f39c12';
    else n.style.background = '#3498db';

    document.body.appendChild(n);
    setTimeout(()=> {
        n.style.opacity = '0';
        setTimeout(()=> n.remove(), 300);
    }, 2200);
}

/* escape simple para evitar inyección en los campos que mostramos */
function escapeHtml(str){
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function(m){
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);
    });
}
