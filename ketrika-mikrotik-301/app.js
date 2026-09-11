// ============================================
// KETRIKA MIKROTIK 301 - MAIN APPLICATION
// ============================================

// --- DATABASE (localStorage simulation for Cloudflare Pages) ---
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

// --- LOADER ---
window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('loader').classList.add('hidden');
        initAnimations();
    }, 3500);
});

// --- NAVBAR ---
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
});

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// Active nav link on scroll
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-link[href="#${id}"]`);
        if (link) {
            link.classList.toggle('active', scrollY >= top && scrollY < top + height);
        }
    });
});

// --- FLOATING NODES ---
function createNodes() {
    const container = document.getElementById('floatingNodes');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
        const node = document.createElement('div');
        node.className = 'node';
        node.style.left = Math.random() * 100 + '%';
        node.style.top = Math.random() * 100 + '%';
        node.style.animationDelay = Math.random() * 6 + 's';
        node.style.animationDuration = (4 + Math.random() * 4) + 's';
        container.appendChild(node);
    }
}
createNodes();

// --- TERMINAL TYPING ---
const terminalCommands = [
    '/ip firewall mangle add chain=postrouting action=change-ttl new-ttl=set:65',
    '/ip dns set servers=1.1.1.1 use-doh-server=https://cloudflare-dns.com/dns-query',
    '/interface wireguard add name=WARP listen-port=13231',
    '/ip firewall filter add chain=forward action=accept',
    '/system identity set name=KETRIKA-MK301',
    '/export file=ketrika-config'
];

let cmdIndex = 0;
let charIndex = 0;
const typingEl = document.getElementById('terminalTyping');

function typeCommand() {
    if (!typingEl) return;
    const cmd = terminalCommands[cmdIndex];
    if (charIndex < cmd.length) {
        typingEl.textContent += cmd[charIndex];
        charIndex++;
        setTimeout(typeCommand, 30 + Math.random() * 40);
    } else {
        setTimeout(() => {
            typingEl.textContent = '';
            charIndex = 0;
            cmdIndex = (cmdIndex + 1) % terminalCommands.length;
            typeCommand();
        }, 2000);
    }
}
setTimeout(typeCommand, 4000);

// --- COUNTER ANIMATION ---
function initAnimations() {
    // Stat counters
    document.querySelectorAll('.stat-number').forEach(el => {
        const target = parseInt(el.dataset.count);
        let current = 0;
        const increment = target / 60;
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            el.textContent = Math.floor(current) + (target < 100 ? '%' : '+');
        }, 30);
    });

    // VPN meters
    setTimeout(() => {
        document.querySelectorAll('.meter-fill').forEach(el => {
            el.style.width = el.dataset.width + '%';
        });
    }, 500);

    // Feature cards animation on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s forwards';
                entry.target.style.opacity = '1';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.feature-card, .vpn-card, .plan-card').forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
}

// --- FAQ ---
function toggleFaq(item) {
    const wasActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
    if (!wasActive) item.classList.add('active');
}

// --- NOTIFICATION ---
function showNotification(message, type = 'info') {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = `notification ${type} show`;
    setTimeout(() => notif.classList.remove('show'), 4000);
}

// --- PLAN SELECTION ---
function selectPlan(plan, price) {
    document.getElementById('orderPlan').value = plan;
    document.getElementById('orderPrice').value = price;
    document.getElementById('selectedPlanName').textContent = plan.toUpperCase();
    document.getElementById('selectedPlanPrice').textContent = price.toLocaleString() + ' Ar';
    document.getElementById('paymentAmount').textContent = price.toLocaleString() + ' Ar';

    const orderSection = document.getElementById('order');
    orderSection.style.display = 'block';

    // Show/hide hotspot config
    document.getElementById('hotspotConfig').style.display = plan === 'business' ? 'block' : 'none';

    orderSection.scrollIntoView({ behavior: 'smooth' });
}

// --- DETECT PORTS ---
function detectPorts() {
    const select = document.getElementById('mikrotikModel');
    const option = select.options[select.selectedIndex];
    const info = document.getElementById('detectedInfo');
    const wifiConfig = document.getElementById('wifiConfig');

    if (!option.value) {
        info.style.display = 'none';
        wifiConfig.style.display = 'none';
        return;
    }

    const ports = option.dataset.ports;
    const wifi = option.dataset.wifi;
    const bands = option.dataset.bands;

    document.getElementById('detectedPorts').textContent = ports;
    document.getElementById('detectedWifi').textContent = wifi === 'none' ? 'Non' : wifi.toUpperCase();
    document.getElementById('detectedBands').textContent = bands || 'N/A';
    info.style.display = 'block';

    if (wifi !== 'none') {
        wifiConfig.style.display = 'block';
        document.getElementById('ssid5gGroup').style.display = bands.includes('5') ? 'block' : 'none';
    } else {
        wifiConfig.style.display = 'none';
    }
}

// --- ORDER FORM ---
document.getElementById('orderForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const plan = document.getElementById('orderPlan').value;
    const price = document.getElementById('orderPrice').value;
    const model = document.getElementById('mikrotikModel').value;
    const phone = document.getElementById('clientPhone').value;
    const txRef = document.getElementById('transactionRef').value;

    if (!model) {
        showNotification('Veuillez sélectionner un modèle MikroTik', 'error');
        return;
    }

    const select = document.getElementById('mikrotikModel');
    const option = select.options[select.selectedIndex];
    const wifi = option.dataset.wifi;

    // Validate WiFi fields if applicable
    if (wifi !== 'none') {
        const ssid2g = document.getElementById('ssid2g').value;
        const wifiPass = document.getElementById('wifiPassword').value;
        if (!ssid2g || !wifiPass) {
            showNotification('Veuillez remplir les paramètres WiFi', 'error');
            return;
        }
        if (wifiPass.length < 8) {
            showNotification('Le mot de passe WiFi doit avoir au moins 8 caractères', 'error');
            return;
        }
    }

    const order = {
        id: 'ORD-' + Date.now(),
        plan: plan,
        price: parseInt(price),
        model: model,
        modelName: option.textContent.trim(),
        ports: option.dataset.ports,
        wifi: option.dataset.wifi,
        bands: option.dataset.bands,
        ssid2g: document.getElementById('ssid2g')?.value || '',
        ssid5g: document.getElementById('ssid5g')?.value || '',
        wifiPassword: document.getElementById('wifiPassword')?.value || '',
        hotspotName: document.getElementById('hotspotName')?.value || '',
        sleepStart: document.getElementById('sleepStart')?.value || '23:00',
        sleepEnd: document.getElementById('sleepEnd')?.value || '06:00',
        clientPhone: phone,
        transactionRef: txRef,
        status: 'pending',
        date: new Date().toISOString(),
        licenseKey: null
    };

    const orders = DB.getOrders();
    orders.push(order);
    DB.saveOrders(orders);

    showNotification('Commande soumise avec succès ! ID: ' + order.id + '. Nous allons vérifier votre paiement et activer votre clé.', 'success');

    this.reset();
    document.getElementById('order').style.display = 'none';
    document.getElementById('detectedInfo').style.display = 'none';
    document.getElementById('wifiConfig').style.display = 'none';
});

// --- ACTIVATE KEY ---
document.getElementById('activateForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const keyInput = document.getElementById('licenseKey').value.trim().toUpperCase();
    const resultDiv = document.getElementById('activateResult');
    const keys = DB.getKeys();
    const keyData = keys.find(k => k.key === keyInput);

    if (!keyData) {
        resultDiv.innerHTML = `
            <div style="color: var(--danger);">
                <h3><i class="fas fa-times-circle"></i> Clé invalide</h3>
                <p>Cette clé n'existe pas ou n'a pas encore été activée. Vérifiez votre clé ou contactez-nous.</p>
            </div>
        `;
        resultDiv.className = 'activate-result error';
        resultDiv.style.display = 'block';
        return;
    }

    if (keyData.used) {
        resultDiv.innerHTML = `
            <div style="color: var(--warning);">
                <h3><i class="fas fa-exclamation-triangle"></i> Clé déjà utilisée</h3>
                <p>Cette clé a déjà été utilisée pour télécharger la configuration. Chaque clé ne peut être utilisée qu'une seule fois.</p>
            </div>
        `;
        resultDiv.className = 'activate-result error';
        resultDiv.style.display = 'block';
        return;
    }

    // Mark key as used
    keyData.used = true;
    keyData.usedDate = new Date().toISOString();
    DB.saveKeys(keys);

    // Generate config and download
    const order = DB.getOrders().find(o => o.id === keyData.orderId);
    if (order) {
        generateAndDownload(order, keyData);
        resultDiv.innerHTML = `
            <div style="color: var(--success);">
                <h3><i class="fas fa-check-circle"></i> Succès !</h3>
                <p>Votre configuration est en cours de téléchargement.</p>
                <p><strong>Plan:</strong> ${order.plan.toUpperCase()}</p>
                <p><strong>MikroTik:</strong> ${order.modelName}</p>
                <p>Suivez le tutoriel inclus dans le ZIP pour importer la configuration.</p>
            </div>
        `;
        resultDiv.className = 'activate-result success';
    } else {
        resultDiv.innerHTML = `
            <div style="color: var(--danger);">
                <h3><i class="fas fa-times-circle"></i> Erreur</h3>
                <p>Commande associée introuvable. Contactez le support.</p>
            </div>
        `;
        resultDiv.className = 'activate-result error';
    }

    resultDiv.style.display = 'block';
});

// --- GENERATE AND DOWNLOAD ZIP ---
async function generateAndDownload(order, keyData) {
    try {
        showNotification('Génération de la configuration en cours...', 'info');

        // Generate WARP keys if needed
        let warpConfig = null;
        if (order.plan === 'pro' || order.plan === 'business') {
            warpConfig = generateWarpKeys();
        }

        // Generate MikroTik RSC config
        const rscContent = generateMikroTikConfig(order, warpConfig);

        // Generate tutorial
        const tutorialContent = generateTutorial(order);

        // Create ZIP using JSZip-like manual approach
        const zipBlob = await createZipFile({
            'ketrika-config.rsc': rscContent,
            'TUTORIEL-INSTALLATION.txt': tutorialContent,
            'COMMANDES-TERMINAL.txt': generateTerminalCommands(order)
        });

        // Download
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `KETRIKA-${order.plan.toUpperCase()}-${order.model}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Configuration téléchargée avec succès !', 'success');
    } catch (error) {
        console.error(error);
        showNotification('Erreur lors de la génération. Réessayez.', 'error');
    }
}

// --- SIMPLE ZIP CREATOR (no external library needed) ---
async function createZipFile(files) {
    // Simple ZIP format builder
    const entries = [];
    const centralDir = [];
    let offset = 0;

    for (const [name, content] of Object.entries(files)) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const nameBytes = encoder.encode(name);

        // Local file header
        const header = new ArrayBuffer(30 + nameBytes.length);
        const view = new DataView(header);
        view.setUint32(0, 0x04034b50, true); // signature
        view.setUint16(4, 20, true); // version
        view.setUint16(6, 0, true); // flags
        view.setUint16(8, 0, true); // compression (none)
        view.setUint16(10, 0, true); // mod time
        view.setUint16(12, 0, true); // mod date
        view.setUint32(14, crc32(data), true); // crc32
        view.setUint32(18, data.length, true); // compressed size
        view.setUint32(22, data.length, true); // uncompressed size
        view.setUint16(26, nameBytes.length, true); // name length
        view.setUint16(28, 0, true); // extra length

        const headerArr = new Uint8Array(header);
        headerArr.set(nameBytes, 30);

        entries.push(headerArr, data);

        // Central directory
        const cdHeader = new ArrayBuffer(46 + nameBytes.length);
        const cdView = new DataView(cdHeader);
        cdView.setUint32(0, 0x02014b50, true);
        cdView.setUint16(4, 20, true);
        cdView.setUint16(6, 20, true);
        cdView.setUint16(8, 0, true);
        cdView.setUint16(10, 0, true);
        cdView.setUint16(12, 0, true);
        cdView.setUint16(14, 0, true);
        cdView.setUint32(16, crc32(data), true);
        cdView.setUint32(20, data.length, true);
        cdView.setUint32(24, data.length, true);
        cdView.setUint16(28, nameBytes.length, true);
        cdView.setUint16(30, 0, true);
        cdView.setUint16(32, 0, true);
        cdView.setUint16(34, 0, true);
        cdView.setUint16(36, 0, true);
        cdView.setUint32(38, 0, true);
        cdView.setUint32(42, offset, true);

        const cdArr = new Uint8Array(cdHeader);
        cdArr.set(nameBytes, 46);
        centralDir.push(cdArr);

        offset += 30 + nameBytes.length + data.length;
    }

    // End of central directory
    const cdOffset = offset;
    let cdSize = 0;
    centralDir.forEach(cd => cdSize += cd.length);

    const endRecord = new ArrayBuffer(22);
    const endView = new DataView(endRecord);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(4, 0, true);
    endView.setUint16(6, 0, true);
    endView.setUint16(8, centralDir.length, true);
    endView.setUint16(10, centralDir.length, true);
    endView.setUint32(12, cdSize, true);
    endView.setUint32(16, cdOffset, true);
    endView.setUint16(20, 0, true);

    const parts = [...entries, ...centralDir, new Uint8Array(endRecord)];
    return new Blob(parts, { type: 'application/zip' });
}

// CRC32 for ZIP
function crc32(data) {
    let crc = 0xFFFFFFFF;
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

// --- TUTORIAL GENERATOR ---
function generateTutorial(order) {
    return `
====================================================
  KETRIKA MIKROTIK 301 - TUTORIEL D'INSTALLATION
====================================================

Plan: ${order.plan.toUpperCase()}
MikroTik: ${order.modelName}
Date: ${new Date().toLocaleDateString('fr-FR')}

----------------------------------------------------
  ÉTAPE 1: PRÉPARATION
----------------------------------------------------
1. Connectez votre PC au routeur MikroTik via câble Ethernet
2. Ouvrez Winbox (téléchargez sur mikrotik.com si besoin)
3. Connectez-vous à votre routeur (admin / pas de mot de passe par défaut)

----------------------------------------------------
  ÉTAPE 2: RESET DU ROUTEUR (RECOMMANDÉ)
----------------------------------------------------
Dans le Terminal de Winbox, tapez:
  /system reset-configuration no-defaults=yes skip-backup=yes

Le routeur va redémarrer. Reconnectez-vous après le redémarrage.

----------------------------------------------------
  ÉTAPE 3: UPLOAD DU FICHIER
----------------------------------------------------
1. Dans Winbox, allez dans "Files"
2. Glissez-déposez le fichier "ketrika-config.rsc" dans la fenêtre Files
3. Attendez que l'upload soit terminé

----------------------------------------------------
  ÉTAPE 4: IMPORT DE LA CONFIGURATION
----------------------------------------------------
Ouvrez le Terminal dans Winbox et tapez:

  /import file-name=ketrika-config.rsc

Attendez que toutes les lignes soient exécutées.
Le routeur va redémarrer automatiquement.

----------------------------------------------------
  ÉTAPE 5: VÉRIFICATION
----------------------------------------------------
Après le redémarrage:
${order.plan !== 'basic' ? `
- Vérifiez que le VPN WARP est connecté:
  /interface wireguard print
  /interface wireguard peers print
` : ''}
- Vérifiez le WiFi:
  /interface wireless print
  
- Vérifiez le DNS DoH:
  /ip dns print

- Vérifiez le TTL:
  /ip firewall mangle print

----------------------------------------------------
  INFORMATIONS DE CONNEXION WiFi
----------------------------------------------------
${order.ssid2g ? `SSID 2.4GHz: ${order.ssid2g}` : 'WiFi non configuré'}
${order.ssid5g ? `SSID 5GHz: ${order.ssid5g}` : ''}
${order.wifiPassword ? `Mot de passe: ${order.wifiPassword}` : ''}

----------------------------------------------------
  SUPPORT
----------------------------------------------------
Téléphone: 038 28 171 00
Nom: Jean Eric
Facebook: KETRIKA MIKROTIK 301

© 2024 KETRIKA MIKROTIK 301
====================================================
`;
}

// --- TERMINAL COMMANDS GENERATOR ---
function generateTerminalCommands(order) {
    return `
====================================================
  COMMANDES TERMINAL - KETRIKA MIKROTIK 301
====================================================

# COMMANDE PRINCIPALE D'IMPORT:
/import file-name=ketrika-config.rsc

# Si erreur, essayez d'abord un reset:
/system reset-configuration no-defaults=yes skip-backup=yes

# Après redémarrage, re-uploadez le fichier et importez.

# VÉRIFICATIONS APRÈS IMPORT:

# Vérifier les interfaces:
/interface print

# Vérifier le WiFi:
/interface wireless print

# Vérifier le DNS:
/ip dns print

# Vérifier le firewall:
/ip firewall filter print
/ip firewall mangle print
/ip firewall nat print

${order.plan !== 'basic' ? `
# Vérifier WARP VPN:
/interface wireguard print
/interface wireguard peers print
/ip address print where interface=WARP
/ping 1.1.1.1 count=3
` : ''}

${order.plan === 'business' ? `
# Vérifier Hotspot:
/ip hotspot print
/ip hotspot profile print

# Vérifier PPPoE:
/interface pppoe-server server print

# Vérifier le scheduler (mise en veille):
/system scheduler print
` : ''}

# Redémarrer si nécessaire:
/system reboot

====================================================
`;
}