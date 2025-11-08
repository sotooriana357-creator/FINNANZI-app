// Datos de ejemplo
let transactions = [];
let goals = [];
let reminders = [];
let categories = [
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

// Configuración de la aplicación
let appConfig = {
    theme: 'claro',
    currency: 'BOB',
    remindersEnabled: false,
    reminderTime: '20:00'
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos del localStorage
    loadData();
    
    // Configurar temas
    setupThemes();
    
    // Configurar navegación
    setupNavigation();
    
    // Configurar formularios
    setupForms();
    
    // Configurar recordatorios
    setupReminders();
    
    // Configurar widgets
    setupWidgets();
    
    // Configurar reportes
    setupReports();
    
    // Actualizar la interfaz
    updateUI();
    
    // Configurar fecha actual en los formularios
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('transaction-date').value = today;
    document.getElementById('report-date').value = today;
    document.getElementById('goal-deadline').valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días después
});

// Cargar datos del localStorage
function loadData() {
    const savedTransactions = localStorage.getItem('finnanzi-transactions');
    const savedGoals = localStorage.getItem('finnanzi-goals');
    const savedConfig = localStorage.getItem('finnanzi-config');
    const savedReminders = localStorage.getItem('finnanzi-reminders');
    
    if (savedTransactions) {
        transactions = JSON.parse(savedTransactions);
    }
    
    if (savedGoals) {
        goals = JSON.parse(savedGoals);
    }
    
    if (savedConfig) {
        appConfig = { ...appConfig, ...JSON.parse(savedConfig) };
    }
    
    if (savedReminders) {
        reminders = JSON.parse(savedReminders);
    }
}

// Guardar datos en localStorage
function saveData() {
    localStorage.setItem('finnanzi-transactions', JSON.stringify(transactions));
    localStorage.setItem('finnanzi-goals', JSON.stringify(goals));
    localStorage.setItem('finnanzi-config', JSON.stringify(appConfig));
    localStorage.setItem('finnanzi-reminders', JSON.stringify(reminders));
}

// Configurar temas
function setupThemes() {
    const themeSelect = document.getElementById('theme-select');
    
    // Establecer tema actual
    themeSelect.value = appConfig.theme;
    document.documentElement.setAttribute('data-theme', appConfig.theme);
    
    // Escuchar cambios de tema
    themeSelect.addEventListener('change', function() {
        appConfig.theme = this.value;
        document.documentElement.setAttribute('data-theme', appConfig.theme);
        saveData();
    });
}

// Configurar navegación
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover clase activa de todos los enlaces
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Agregar clase activa al enlace clickeado
            this.classList.add('active');
            
            // Ocultar todas las secciones
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });
            
            // Mostrar la sección correspondiente
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
        });
    });
}

// Configurar formularios
function setupForms() {
    // Formulario de transacciones
    const transactionForm = document.getElementById('transaction-form');
    const categorySelect = document.getElementById('transaction-category');
    
    // Llenar categorías en el formulario
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
    
    transactionForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const type = document.getElementById('transaction-type').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const categoryId = parseInt(document.getElementById('transaction-category').value);
        const description = document.getElementById('transaction-description').value;
        const date = document.getElementById('transaction-date').value;
        
        const category = categories.find(c => c.id === categoryId);
        
        const transaction = {
            id: Date.now(),
            type: type,
            amount: amount,
            category: category.name,
            description: description,
            date: date,
            timestamp: new Date().toISOString()
        };
        
        transactions.push(transaction);
        saveData();
        updateUI();
        
        // Resetear formulario
        transactionForm.reset();
        document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
        
        // Mostrar mensaje de éxito
        showNotification('Transacción agregada correctamente', 'success');
    });
    
    // Formulario de metas
    const goalForm = document.getElementById('goal-form');
    
    goalForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('goal-name').value;
        const target = parseFloat(document.getElementById('goal-target').value);
        const deadline = document.getElementById('goal-deadline').value;
        const description = document.getElementById('goal-description').value;
        
        const goal = {
            id: Date.now(),
            name: name,
            target: target,
            current: 0,
            deadline: deadline,
            description: description,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        goals.push(goal);
        saveData();
        updateUI();
        
        // Resetear formulario
        goalForm.reset();
        document.getElementById('goal-deadline').valueAsDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        // Mostrar mensaje de éxito
        showNotification('Meta de ahorro creada correctamente', 'success');
    });
}

// Configurar recordatorios
function setupReminders() {
    const enableRemindersBtn = document.getElementById('enable-reminders');
    const testReminderBtn = document.getElementById('test-reminder');
    
    // Configurar botón de activación
    enableRemindersBtn.addEventListener('click', function() {
        if (appConfig.remindersEnabled) {
            disableReminders();
        } else {
            enableReminders();
        }
    });
    
    // Botón de prueba
    testReminderBtn.addEventListener('click', function() {
        showTestReminder();
    });
    
    // Configurar recordatorios automáticos
    setupAutomaticReminders();
    
    // Actualizar estado del botón
    updateRemindersButton();
}

function enableReminders() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                appConfig.remindersEnabled = true;
                saveData();
                updateRemindersButton();
                showNotification('Recordatorios activados correctamente', 'success');
                scheduleReminders();
            } else {
                showNotification('Los recordatorios requieren permisos de notificación', 'error');
            }
        });
    } else {
        showNotification('Tu navegador no soporta notificaciones', 'error');
    }
}

function disableReminders() {
    appConfig.remindersEnabled = false;
    saveData();
    updateRemindersButton();
    showNotification('Recordatorios desactivados', 'info');
}

function updateRemindersButton() {
    const button = document.getElementById('enable-reminders');
    if (appConfig.remindersEnabled) {
        button.textContent = 'Desactivar Recordatorios';
        button.classList.remove('btn-success');
        button.classList.add('btn-danger');
    } else {
        button.textContent = 'Activar Recordatorios';
        button.classList.remove('btn-danger');
        button.classList.add('btn-success');
    }
}

function setupAutomaticReminders() {
    // Verificar si hay transacciones hoy
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.date === today);
    
    if (todayTransactions.length === 0) {
        createReminder('Registra tus gastos de hoy', 'No has registrado transacciones hoy. ¡Mantén tu control financiero al día!', 'daily');
    }
    
    // Verificar metas próximas a vencer
    goals.forEach(goal => {
        if (!goal.completed) {
            const daysUntilDeadline = Math.ceil((new Date(goal.deadline) - new Date()) / (1000 * 60 * 60 * 24));
            if (daysUntilDeadline <= 7) {
                createReminder(
                    `Meta "${goal.name}" próxima a vencer`,
                    `Te quedan ${daysUntilDeadline} días para alcanzar tu meta de Bs. ${goal.target.toFixed(2)}`,
                    'goal'
                );
            }
        }
    });
    
    updateRemindersUI();
}

function createReminder(title, message, type) {
    const reminder = {
        id: Date.now(),
        title: title,
        message: message,
        type: type,
        createdAt: new Date().toISOString(),
        read: false
    };
    
    reminders.push(reminder);
    saveData();
    
    // Mostrar notificación si están activadas
    if (appConfig.remindersEnabled && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: message,
            icon: '/icon.png'
        });
    }
}

function showTestReminder() {
    createReminder(
        'Prueba de Recordatorio',
        '¡Funciona! Los recordatorios están configurados correctamente.',
        'test'
    );
}

function updateRemindersUI() {
    const activeReminders = document.getElementById('active-reminders');
    const financialTips = document.getElementById('financial-tips');
    
    // Limpiar contenedores
    activeReminders.innerHTML = '';
    financialTips.innerHTML = '';
    
    // Mostrar recordatorios activos
    const unreadReminders = reminders.filter(r => !r.read).slice(0, 5);
    
    if (unreadReminders.length === 0) {
        activeReminders.innerHTML = '<p>No hay recordatorios activos</p>';
    } else {
        unreadReminders.forEach(reminder => {
            const reminderElement = document.createElement('div');
            reminderElement.className = 'reminder-item';
            reminderElement.innerHTML = `
                <h4>${reminder.title}</h4>
                <p>${reminder.message}</p>
                <small>${formatDate(reminder.createdAt)}</small>
            `;
            activeReminders.appendChild(reminderElement);
        });
    }
    
    // Mostrar consejos financieros
    const tips = [
        {
            title: "Ahorra primero, gasta después",
            content: "Destina al menos el 10% de tus ingresos al ahorro antes de cubrir otros gastos."
        },
        {
            title: "Sigue la regla 50-30-20",
            content: "50% para necesidades, 30% para deseos y 20% para ahorros e inversiones."
        },
        {
            title: "Revisa tus gastos semanalmente",
            content: "Mantén un control regular para identificar patrones y oportunidades de ahorro."
        }
    ];
    
    tips.forEach(tip => {
        const tipElement = document.createElement('div');
        tipElement.className = 'tip-item';
        tipElement.innerHTML = `
            <h4>${tip.title}</h4>
            <p>${tip.content}</p>
        `;
        financialTips.appendChild(tipElement);
    });
}

function scheduleReminders() {
    // Programar recordatorios diarios
    if (appConfig.remindersEnabled) {
        const [hours, minutes] = appConfig.reminderTime.split(':').map(Number);
        const now = new Date();
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);
        
        if (now > reminderTime) {
            reminderTime.setDate(reminderTime.getDate() + 1);
        }
        
        const timeUntilReminder = reminderTime - now;
        
        setTimeout(() => {
            createReminder(
                'Recordatorio Diario',
                '¡Es hora de registrar tus transacciones del día!',
                'daily'
            );
            // Programar el próximo recordatorio
            scheduleReminders();
        }, timeUntilReminder);
    }
}

// Configurar widgets
function setupWidgets() {
    // Widget flotante
    const floatingWidget = document.getElementById('floating-widget');
    const addQuickTransactionBtn = document.getElementById('add-quick-transaction');
    
    addQuickTransactionBtn.addEventListener('click', function() {
        // Mostrar formulario rápido de transacción
        showQuickTransactionForm();
    });
    
    // Hacer el widget arrastrable en móviles
    makeWidgetDraggable(floatingWidget);
}

function makeWidgetDraggable(widget) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    widget.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        widget.style.top = (widget.offsetTop - pos2) + "px";
        widget.style.left = (widget.offsetLeft - pos1) + "px";
    }
    
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function showQuickTransactionForm() {
    const amount = prompt('Ingresa el monto en Bs.:');
    if (amount && !isNaN(amount)) {
        const description = prompt('Descripción:');
        const type = confirm('¿Es un ingreso? (Aceptar = Ingreso, Cancelar = Gasto)') ? 'income' : 'expense';
        
        const transaction = {
            id: Date.now(),
            type: type,
            amount: parseFloat(amount),
            category: 'Otros',
            description: description || 'Transacción rápida',
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
        };
        
        transactions.push(transaction);
        saveData();
        updateUI();
        showNotification('Transacción rápida agregada', 'success');
    }
}

// Configurar reportes
function setupReports() {
    const generateReportBtn = document.getElementById('generate-report');
    
    generateReportBtn.addEventListener('click', function() {
        updateReports();
    });
}

// Actualizar la interfaz de usuario
function updateUI() {
    updateBalance();
    updateTransactionHistory();
    updateGoals();
    updateCategorySummary();
    updateWidgets();
    updateRemindersUI();
}

// Actualizar balance
function updateBalance() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const totalBalance = totalIncome - totalExpense;
    
    document.getElementById('total-balance').textContent = `Bs. ${totalBalance.toFixed(2)}`;
    document.getElementById('total-income').textContent = `Bs. ${totalIncome.toFixed(2)}`;
    document.getElementById('total-expense').textContent = `Bs. ${totalExpense.toFixed(2)}`;
    
    // Cambiar color según el balance
    const balanceElement = document.getElementById('total-balance');
    if (totalBalance >= 0) {
        balanceElement.className = 'balance-amount positive';
    } else {
        balanceElement.className = 'balance-amount negative';
    }
}

// Actualizar widgets
function updateWidgets() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const totalBalance = totalIncome - totalExpense;
    
    // Widget de balance rápido
    document.getElementById('widget-balance').textContent = `Bs. ${totalBalance.toFixed(2)}`;
    document.getElementById('widget-balance').className = `widget-balance ${totalBalance >= 0 ? 'positive' : 'negative'}`;
    
    const widgetDetails = document.querySelector('.widget-details');
    widgetDetails.innerHTML = `
        <span class="positive">Ing: Bs. ${totalIncome.toFixed(2)}</span>
        <span class="negative">Gas: Bs. ${totalExpense.toFixed(2)}</span>
    `;
    
    // Widget de transacciones recientes
    const widgetTransactions = document.getElementById('widget-transactions');
    const recentTransactions = [...transactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);
    
    if (recentTransactions.length === 0) {
        widgetTransactions.innerHTML = '<p>No hay transacciones recientes</p>';
    } else {
        widgetTransactions.innerHTML = recentTransactions.map(transaction => `
            <div class="transaction-item" style="padding: 5px 0; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; width: 100%;">
                    <span style="font-size: 12px;">${transaction.description}</span>
                    <span class="${transaction.type === 'income' ? 'positive' : 'negative'}" style="font-size: 12px;">
                        ${transaction.type === 'income' ? '+' : '-'}Bs. ${transaction.amount.toFixed(2)}
                    </span>
                </div>
            </div>
        `).join('');
    }
    
    // Widget de progreso de metas
    const widgetGoals = document.getElementById('widget-goals');
    const activeGoals = goals.filter(g => !g.completed).slice(0, 2);
    
    if (activeGoals.length === 0) {
        widgetGoals.innerHTML = '<p>No hay metas activas</p>';
    } else {
        widgetGoals.innerHTML = activeGoals.map(goal => {
            const progress = (goal.current / goal.target) * 100;
            return `
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span>${goal.name}</span>
                        <span>${progress.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Actualizar widget flotante
    document.getElementById('floating-balance-amount').textContent = `Bs. ${totalBalance.toFixed(2)}`;
    document.getElementById('floating-balance-amount').className = totalBalance >= 0 ? 'positive' : 'negative';
}

// ... (el resto de las funciones permanecen igual que en la versión anterior, pero actualizadas para usar Bs.)

// Función auxiliar para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Estilos básicos para la notificación
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        color: white;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1001;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Agregar estilos para animaciones de notificación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Las funciones updateTransactionHistory, deleteTransaction, updateGoals, deleteGoal, 
// updateCategorySummary, updateReports y formatDate permanecen igual que en la versión anterior
// pero actualizadas para mostrar montos en Bs. en lugar de $

// Por ejemplo, en updateTransactionHistory:
function updateTransactionHistory() {
    const historyContainer = document.getElementById('transaction-history');
    historyContainer.innerHTML = '';
    
    if (transactions.length === 0) {
        historyContainer.innerHTML = '<p>No hay transacciones registradas</p>';
        return;
    }
    
    // Ordenar transacciones por fecha (más recientes primero)
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedTransactions.forEach(transaction => {
        const transactionElement = document.createElement('div');
        transactionElement.className = 'transaction-item';
        
        const detailsElement = document.createElement('div');
        detailsElement.className = 'transaction-details';
        
        const descriptionElement = document.createElement('div');
        descriptionElement.textContent = transaction.description;
        
        const categoryElement = document.createElement('div');
        categoryElement.className = 'transaction-category';
        categoryElement.textContent = `${transaction.category} - ${formatDate(transaction.date)}`;
        
        detailsElement.appendChild(descriptionElement);
        detailsElement.appendChild(categoryElement);
        
        const amountElement = document.createElement('div');
        amountElement.className = `transaction-amount ${transaction.type}`;
        // Cambio aquí: Mostrar en Bs. en lugar de $
        amountElement.textContent = transaction.type === 'income' 
            ? `+Bs. ${transaction.amount.toFixed(2)}` 
            : `-Bs. ${transaction.amount.toFixed(2)}`;
        
        const actionsElement = document.createElement('div');
        actionsElement.className = 'transaction-actions';
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-btn';
        deleteButton.innerHTML = '🗑️';
        deleteButton.title = 'Eliminar transacción';
        deleteButton.addEventListener('click', function() {
            deleteTransaction(transaction.id);
        });
        
        actionsElement.appendChild(deleteButton);
        
        transactionElement.appendChild(detailsElement);
        transactionElement.appendChild(amountElement);
        transactionElement.appendChild(actionsElement);
        
        historyContainer.appendChild(transactionElement);
    });
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

// Las demás funciones (deleteTransaction, updateGoals, deleteGoal, updateCategorySummary, updateReports)
// se mantienen igual pero con los cambios para usar Bs.