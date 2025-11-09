document.addEventListener("DOMContentLoaded", () => {

    // Referencias
    const transactionForm = document.getElementById("transaction-form");
    const transactionHistory = document.getElementById("transaction-history");
    const goalForm = document.getElementById("goal-form");
    const goalList = document.getElementById("goal-list");

    const totalIncomeEl = document.getElementById("total-income");
    const totalExpenseEl = document.getElementById("total-expense");
    const totalBalanceEl = document.getElementById("total-balance");
    const generateReportBtn = document.getElementById("generate-report");

    // Datos en memoria
    let transactions = [];
    let goals = [];

    // --- FUNCIONES DE TRANSACCIONES ---

    transactionForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const type = document.getElementById("transaction-type").value;
        const amount = parseFloat(document.getElementById("transaction-amount").value);
        const description = document.getElementById("transaction-description").value.trim();
        const date = document.getElementById("transaction-date").value;

        if (!amount || !description || !date) return;

        const transaction = { type, amount, description, date, id: Date.now() };
        transactions.push(transaction);

        renderTransactions();
        updateReport();
        transactionForm.reset();
    });

    function renderTransactions() {
        transactionHistory.innerHTML = "";

        transactions.forEach((t) => {
            const div = document.createElement("div");
            div.classList.add("transaction-item");

            div.innerHTML = `
                <div>
                    <strong>${t.description}</strong><br>
                    <small>${t.date}</small>
                </div>
                <div class="transaction-amount ${t.type === "income" ? "income" : "expense"}">
                    ${t.type === "income" ? "+" : "-"} Bs. ${t.amount.toFixed(2)}
                </div>
                <button class="delete-btn" data-id="${t.id}">🗑️</button>
            `;

            div.querySelector(".delete-btn").addEventListener("click", () => {
                transactions = transactions.filter(item => item.id !== t.id);
                renderTransactions();
                updateReport();
            });

            transactionHistory.appendChild(div);
        });
    }

    // --- FUNCIONES DE METAS ---

    goalForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("goal-name").value.trim();
        const target = parseFloat(document.getElementById("goal-target").value);
        const deadline = document.getElementById("goal-deadline").value;
        const description = document.getElementById("goal-description").value.trim();

        if (!name || !target || !deadline) return;

        const goal = { name, target, deadline, description, progress: 0, id: Date.now() };
        goals.push(goal);
        renderGoals();
        goalForm.reset();
    });

    function renderGoals() {
        goalList.innerHTML = "";

        goals.forEach((g) => {
            const div = document.createElement("div");
            div.classList.add("goal-item");

            const percentage = ((g.progress / g.target) * 100).toFixed(1);

            div.innerHTML = `
                <div>
                    <strong>${g.name}</strong><br>
                    <small>Objetivo: Bs. ${g.target.toFixed(2)} | Avance: ${percentage}%</small>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%;"></div>
                    </div>
                </div>
                <button class="delete-btn" data-id="${g.id}">🗑️</button>
            `;

            div.querySelector(".delete-btn").addEventListener("click", () => {
                goals = goals.filter(item => item.id !== g.id);
                renderGoals();
            });

            goalList.appendChild(div);
        });
    }

    // --- FUNCIONES DE REPORTES ---

    function updateReport() {
        const totalIncome = transactions
            .filter(t => t.type === "income")
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.type === "expense")
            .reduce((sum, t) => sum + t.amount, 0);

        const balance = totalIncome - totalExpense;

        totalIncomeEl.textContent = `Bs. ${totalIncome.toFixed(2)}`;
        totalExpenseEl.textContent = `Bs. ${totalExpense.toFixed(2)}`;
        totalBalanceEl.textContent = `Bs. ${balance.toFixed(2)}`;
    }

    generateReportBtn.addEventListener("click", updateReport);

});
