// ============================================
// KETRIKA MIKROTIK 301 - ADMIN PANEL
// ============================================

const ADMIN_PASSWORD = 'ketrika301admin';

// --- DB HELPERS ---
const DB = {
    get(key) {
        try { return JSON.parse(localStorage.getItem('ketrika_' + key)) || []; }
        catch { return []; }
    },
    set(key, data) {
        localStorage.setItem('ketrika_' + key, JSON.stringify(data));
    },
    getOrders() { return this.get('orders'); },
    saveOrders(orders) { this.set('orders', orders); },
    getKeys() { return this.get('keys'); },
    saveKeys(keys) { this.set('keys', keys); }
};

// --- LOGIN ---
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const pass = document.getElementById('adminPassword').value;
    if (pass === ADMIN_PASSWORD) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        sessionStorage.setItem('ketrika_admin', 'true');
        loadAdmin();
    } else {
        showNotification('Mot de passe incorrect', 'error');
    }
});

// Check session
if (sessionStorage.getItem('ketrika_admin') === 'true') {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadAdmin();
}

function adminLogout() {
    sessionStorage.removeItem('ketrika_admin');
    location.reload();
}

// --- TABS ---
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    event.target.closest('.admin-tab').classList.add('active');
}

// --- LOAD ADMIN ---
function loadAdmin() {
    loadStats();
    loadOrders();
    loadKeys();
}

function loadStats() {
    const orders = DB.getOrders();
    const keys = DB.getKeys();

    document.getElementById('statOrders').textContent = orders.length;
    document.getElementById('statPending').textContent = orders.filter(o => o.status === 'pending').length;
    document.getElementById('statActive').textContent = keys.filter(k => !k.used).length;
    document.getElementById('statUsed').textContent = keys.filter(k => k.used).length;

    const revenue = orders
        .filter(o => o.status === 'approved')
        .reduce((sum, o) => sum + o.price, 0);
    document.getElementById('statRevenue').textContent = revenue.toLocaleString() + ' Ar';
}

// --- LOAD ORDERS ---
function loadOrders() {
    const orders = DB.getOrders();
    const tbody = document.getElementById('ordersTableBody');

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="9">
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Aucune commande pour le moment</p>
                </div>
            </td></tr>
        `;
        return;
    }

    tbody.innerHTML = orders.reverse().map(order => `
        <tr>
            <td><strong>${order.id}</strong></td>
            <td>${new Date(order.date).toLocaleDateString('fr-FR')}</td>
            <td>
                <span class="badge ${order.plan === 'business' ? 'badge-active' : 'badge-pending'}">
                    ${order.plan.toUpperCase()}
                </span>
            </td>
            <td>${order.model}</td>
            <td>${order.clientPhone}</td>
            <td>${order.transactionRef}</td>
            <td>
                <span class="badge ${order.status === 'pending' ? 'badge-pending' : 'badge-active'}">
                    ${order.status === 'pending' ? '⏳ En attente' : '✅ Approuvé'}
                </span>
            </td>
            <td>${order.licenseKey ? `<span class="key-display">${order.licenseKey}</span>` : '-'}</td>
            <td>
                <div class="admin-actions">
                    ${order.status === 'pending' ? `
                        <button class="btn btn-success btn-sm" onclick="approveOrder('${order.id}')">
                            <i class="fas fa-check"></i> Valider
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteOrder('${order.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// --- APPROVE ORDER ---
function approveOrder(orderId) {
    const orders = DB.getOrders();
    const order = orders.find(o => o.id === orderId);

    if (!order) return;

    // Generate license key
    const key = generateLicenseKey();

    // Update order
    order.status = 'approved';
    order.licenseKey = key;
    DB.saveOrders(orders);

    // Save key
    const keys = DB.getKeys();
    keys.push({
        key: key,
        orderId: orderId,
        plan: order.plan,
        model: order.model,
        created: new Date().toISOString(),
        used: false,
        usedDate: null
    });
    DB.saveKeys(keys);

    showNotification(`Commande validée ! Clé générée: ${key}`, 'success');
    loadAdmin();
}

// --- GENERATE LICENSE KEY ---
function generateLicenseKey() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segments = [];
    for (let s = 0; s < 3; s++) {
        let segment = '';
        for (let i = 0; i < 4; i++) {
            segment += chars[Math.floor(Math.random() * chars.length)];
        }
        segments.push(segment);
    }
    return 'KETRIKA-' + segments.join('-');
}

// --- DELETE ORDER ---
function deleteOrder(orderId) {
    if (!confirm('Supprimer cette commande ?')) return;

    let orders = DB.getOrders();
    orders = orders.filter(o => o.id !== orderId);
    DB.saveOrders(orders);

    // Also remove associated key
    let keys = DB.getKeys();
    keys = keys.filter(k => k.orderId !== orderId);
    DB.saveKeys(keys);

    showNotification('Commande supprimée', 'info');
    loadAdmin();
}

// --- LOAD KEYS ---
function loadKeys() {
    const keys = DB.getKeys();
    const tbody = document.getElementById('keysTableBody');

    if (keys.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6">
                <div class="empty-state">
                    <i class="fas fa-key"></i>
                    <p>Aucune clé générée</p>
                </div>
            </td></tr>
        `;
        return;
    }

    tbody.innerHTML = keys.reverse().map(key => `
        <tr>
            <td><span class="key-display">${key.key}</span></td>
            <td>${key.orderId}</td>
            <td><span class="badge badge-pending">${key.plan.toUpperCase()}</span></td>
            <td>${new Date(key.created).toLocaleDateString('fr-FR')}</td>
            <td>
                <span class="badge ${key.used ? 'badge-used' : 'badge-active'}">
                    ${key.used ? '📦 Utilisée' : '🟢 Active'}
                </span>
            </td>
            <td>${key.usedDate ? new Date(key.usedDate).toLocaleDateString('fr-FR') : '-'}</td>
        </tr>
    `).join('');
}

// --- NOTIFICATION ---
function showNotification(message, type = 'info') {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = `notification ${type} show`;
    setTimeout(() => notif.classList.remove('show'), 4000);
}