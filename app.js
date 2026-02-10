// ===== Configuración y Estado Global =====
const CATEGORIES = {
    expense: [
        { value: 'comida', label: '🍔 Comida', icon: '🍔' },
        { value: 'transporte', label: '🚗 Transporte', icon: '🚗' },
        { value: 'entretenimiento', label: '🎮 Entretenimiento', icon: '🎮' },
        { value: 'servicios', label: '💡 Servicios', icon: '💡' },
        { value: 'salud', label: '⚕️ Salud', icon: '⚕️' },
        { value: 'compras', label: '🛍️ Compras', icon: '🛍️' },
        { value: 'educacion', label: '📚 Educación', icon: '📚' },
        { value: 'otros', label: '📦 Otros', icon: '📦' }
    ],
    income: [
        { value: 'salario', label: '💼 Salario', icon: '💼' },
        { value: 'freelance', label: '💻 Freelance', icon: '💻' },
        { value: 'inversiones', label: '📈 Inversiones', icon: '📈' },
        { value: 'regalo', label: '🎁 Regalo', icon: '🎁' },
        { value: 'otros', label: '💰 Otros', icon: '💰' }
    ]
};

let transactions = [];
let chart = null;

// ===== Elementos del DOM =====
const elements = {
    form: document.getElementById('transactionForm'),
    typeSelect: document.getElementById('type'),
    categorySelect: document.getElementById('category'),
    amountInput: document.getElementById('amount'),
    descriptionInput: document.getElementById('description'),
    dateInput: document.getElementById('date'),

    totalBalance: document.getElementById('totalBalance'),
    totalIncome: document.getElementById('totalIncome'),
    totalExpense: document.getElementById('totalExpense'),

    transactionsList: document.getElementById('transactionsList'),
    emptyState: document.getElementById('emptyState'),

    filterType: document.getElementById('filterType'),
    filterCategory: document.getElementById('filterCategory'),

    chartCanvas: document.getElementById('expenseChart')
};

// ===== Inicialización =====
function init() {
    loadTransactions();
    setupEventListeners();
    setTodayDate();
    updateCategoryOptions();
    updateUI();
    initChart();
}

function setupEventListeners() {
    elements.form.addEventListener('submit', handleFormSubmit);
    elements.typeSelect.addEventListener('change', updateCategoryOptions);
    elements.filterType.addEventListener('change', filterTransactions);
    elements.filterCategory.addEventListener('change', filterTransactions);
}

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    elements.dateInput.value = today;
}

// ===== Gestión de Categorías =====
function updateCategoryOptions() {
    const type = elements.typeSelect.value;
    const categories = CATEGORIES[type];

    elements.categorySelect.innerHTML = categories
        .map(cat => `<option value="${cat.value}">${cat.label}</option>`)
        .join('');

    updateFilterCategories();
}

function updateFilterCategories() {
    const allCategories = [...CATEGORIES.expense, ...CATEGORIES.income];
    const uniqueCategories = [...new Map(allCategories.map(cat => [cat.value, cat])).values()];

    elements.filterCategory.innerHTML = '<option value="all">Todas las categorías</option>' +
        uniqueCategories
            .map(cat => `<option value="${cat.value}">${cat.label}</option>`)
            .join('');
}

function getCategoryIcon(type, categoryValue) {
    const categories = CATEGORIES[type];
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? category.icon : '📦';
}

// ===== Gestión de Transacciones =====
function handleFormSubmit(e) {
    e.preventDefault();

    const transaction = {
        id: Date.now(),
        type: elements.typeSelect.value,
        category: elements.categorySelect.value,
        amount: parseFloat(elements.amountInput.value),
        description: elements.descriptionInput.value.trim(),
        date: elements.dateInput.value
    };

    addTransaction(transaction);
    elements.form.reset();
    setTodayDate();
    updateCategoryOptions(); // Restaurar las categorías después del reset

    // Pequeña animación de feedback
    const btn = elements.form.querySelector('.btn-primary');
    btn.textContent = '✓ Agregado!';
    setTimeout(() => {
        btn.innerHTML = '<span>Agregar Transacción</span>';
    }, 1500);
}

function addTransaction(transaction) {
    transactions.unshift(transaction);
    saveTransactions();
    updateUI();
}

function deleteTransaction(id) {
    if (confirm('¿Estás seguro de eliminar esta transacción?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        updateUI();
    }
}

// ===== Persistencia de Datos =====
function saveTransactions() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function loadTransactions() {
    const saved = localStorage.getItem('transactions');
    transactions = saved ? JSON.parse(saved) : [];
}

// ===== Cálculos =====
function calculateTotals() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    return { income, expense, balance };
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

// ===== Actualización de UI =====
function updateUI() {
    updateTotals();
    renderTransactions();
    updateChart();
}

function updateTotals() {
    const { income, expense, balance } = calculateTotals();

    elements.totalIncome.textContent = formatCurrency(income);
    elements.totalExpense.textContent = formatCurrency(expense);
    elements.totalBalance.textContent = formatCurrency(balance);

    // Cambiar color del balance según sea positivo o negativo
    if (balance >= 0) {
        elements.totalBalance.style.color = '#10b981';
    } else {
        elements.totalBalance.style.color = '#ef4444';
    }
}

function renderTransactions(filteredTransactions = null) {
    const toRender = filteredTransactions || transactions;

    if (toRender.length === 0) {
        elements.transactionsList.innerHTML = '';
        elements.emptyState.classList.remove('hidden');
        return;
    }

    elements.emptyState.classList.add('hidden');

    elements.transactionsList.innerHTML = toRender.map(transaction => {
        const icon = getCategoryIcon(transaction.type, transaction.category);
        const amountClass = transaction.type === 'income' ? 'income' : 'expense';
        const amountPrefix = transaction.type === 'income' ? '+' : '-';

        return `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-icon">${icon}</div>
                <div class="transaction-details">
                    <div class="transaction-description">${transaction.description}</div>
                    <div class="transaction-meta">
                        <span>${formatDate(transaction.date)}</span>
                        <span>•</span>
                        <span>${getCategoryLabel(transaction.type, transaction.category)}</span>
                    </div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountPrefix}${formatCurrency(transaction.amount)}
                </div>
                <div class="transaction-actions">
                    <button class="btn btn-danger" onclick="deleteTransaction(${transaction.id})">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryLabel(type, categoryValue) {
    const categories = CATEGORIES[type];
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? category.label : categoryValue;
}

// ===== Filtros =====
function filterTransactions() {
    const typeFilter = elements.filterType.value;
    const categoryFilter = elements.filterCategory.value;

    let filtered = transactions;

    if (typeFilter !== 'all') {
        filtered = filtered.filter(t => t.type === typeFilter);
    }

    if (categoryFilter !== 'all') {
        filtered = filtered.filter(t => t.category === categoryFilter);
    }

    renderTransactions(filtered);
}

// ===== Gráfico =====
function initChart() {
    const ctx = elements.chartCanvas.getContext('2d');

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#ef4444',
                    '#f97316',
                    '#f59e0b',
                    '#eab308',
                    '#84cc16',
                    '#22c55e',
                    '#10b981',
                    '#14b8a6',
                    '#06b6d4',
                    '#0ea5e9',
                    '#3b82f6',
                    '#6366f1',
                    '#8b5cf6',
                    '#a855f7',
                    '#d946ef',
                    '#ec4899'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e1',
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateChart() {
    const expenses = transactions.filter(t => t.type === 'expense');

    if (expenses.length === 0) {
        chart.data.labels = ['Sin gastos'];
        chart.data.datasets[0].data = [1];
        chart.data.datasets[0].backgroundColor = ['#334155'];
        chart.update();
        return;
    }

    // Agrupar gastos por categoría
    const expensesByCategory = {};
    expenses.forEach(transaction => {
        const category = transaction.category;
        if (!expensesByCategory[category]) {
            expensesByCategory[category] = 0;
        }
        expensesByCategory[category] += transaction.amount;
    });

    // Preparar datos para el gráfico
    const labels = Object.keys(expensesByCategory).map(cat =>
        getCategoryLabel('expense', cat)
    );
    const data = Object.values(expensesByCategory);

    // Colores específicos para categorías
    const backgroundColors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981', '#14b8a6',
        '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1'
    ];

    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.data.datasets[0].backgroundColor = backgroundColors; // Restaurar colores
    chart.update();
}

// ===== Iniciar la aplicación =====
document.addEventListener('DOMContentLoaded', init);

// ===== Service Worker para PWA (opcional) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Comentado por ahora, se puede activar después
        // navigator.serviceWorker.register('/sw.js');
    });
}
