// ============================================
// MIKROTIK CONFIGURATION GENERATOR
// ============================================

function generateMikroTikConfig(order, warpConfig) {
    const {
        plan, model, ports, wifi, bands,
        ssid2g, ssid5g, wifiPassword,
        hotspotName, sleepStart, sleepEnd
    } = order;

    const numPorts = parseInt(ports);
    const hasWifi = wifi !== 'none';
    const has5G = bands && bands.includes('5');
    const isAX = wifi === 'ax';
    const isAC = wifi === 'ac';
    const needWarp = plan === 'pro' || plan === 'business';
    const isBusiness = plan === 'business';

    // Random identity
    const randomMAC = generateRandomMAC();
    const randomName = 'MikroTik-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    let config = `# ============================================
# KETRIKA MIKROTIK 301 - AUTO CONFIGURATION
# Plan: ${plan.toUpperCase()}
# Model: ${model}
# Generated: ${new Date().toISOString()}
# ============================================
# WARNING: This will reset your current configuration!
# ============================================

/system identity set name="${randomName}"

# --- RESET AND CLEAN ---
/ip firewall filter remove [find]
/ip firewall nat remove [find]
/ip firewall mangle remove [find]
/ip address remove [find]
/ip pool remove [find]
/ip dhcp-server remove [find]
/ip dhcp-server network remove [find]
/ip dns set servers=""

# --- BRIDGE ---
/interface bridge add name=bridge-lan protocol-mode=none

`;

    // Add ports to bridge
    // Port 1 = WAN (ether1), rest = LAN
    for (let i = 2; i <= numPorts; i++) {
        config += `/interface bridge port add bridge=bridge-lan interface=ether${i}\n`;
    }

    // --- WiFi Configuration ---
    if (hasWifi) {
        config += `\n# --- WIFI CONFIGURATION ---\n`;

        if (isAX) {
            // WiFi AX uses /interface/wifi (RouterOS 7.13+)
            config += `
# WiFi AX Configuration (RouterOS 7+)
/interface wifi channel
add name=ch-2g frequency=2412,2437,2462 width=20/40mhz-Ce
${has5G ? 'add name=ch-5g frequency=5180,5220,5745,5785 width=20/40/80mhz-Ceee' : ''}

/interface wifi security
add name=sec-main authentication-types=wpa2-psk,wpa3-psk passphrase="${wifiPassword || 'ketrika301'}" ft=yes ft-over-ds=yes

/interface wifi configuration
add name=cfg-2g mode=ap ssid="${ssid2g || 'KETRIKA-WiFi'}" channel=ch-2g security=sec-main country=madagascar
${has5G ? `add name=cfg-5g mode=ap ssid="${ssid5g || ssid2g + '-5G'}" channel=ch-5g security=sec-main country=madagascar` : ''}

/interface wifi set [find default-name=wifi1] configuration=cfg-2g disabled=no
${has5G ? `/interface wifi set [find default-name=wifi2] configuration=cfg-5g disabled=no` : ''}

/interface bridge port add bridge=bridge-lan interface=[/interface wifi find default-name=wifi1]
${has5G ? `/interface bridge port add bridge=bridge-lan interface=[/interface wifi find default-name=wifi2]` : ''}
`;
        } else if (isAC) {
            // WiFi AC uses /interface wireless (or /interface wifi on ROS7)
            config += `
# WiFi AC Configuration
/interface wireless set [find default-name=wlan1] \\
    mode=ap-bridge band=2ghz-b/g/n \\
    channel-width=20/40mhz-Ce frequency=auto \\
    ssid="${ssid2g || 'KETRIKA-WiFi'}" \\
    wireless-protocol=802.11 \\
    security-profile=default \\
    wps-mode=disabled \\
    disabled=no

/interface wireless security-profiles set [find default=yes] \\
    mode=dynamic-keys \\
    authentication-types=wpa2-psk \\
    wpa2-pre-shared-key="${wifiPassword || 'ketrika301'}" \\
    supplicant-identity=""

${has5G ? `
/interface wireless set [find default-name=wlan2] \\
    mode=ap-bridge band=5ghz-a/n/ac \\
    channel-width=20/40/80mhz-Ceee frequency=auto \\
    ssid="${ssid5g || ssid2g + '-5G'}" \\
    wireless-protocol=802.11 \\
    security-profile=default \\
    wps-mode=disabled \\
    disabled=no
` : ''}

/interface bridge port add bridge=bridge-lan interface=wlan1
${has5G ? `/interface bridge port add bridge=bridge-lan interface=wlan2` : ''}
`;
        } else {
            // WiFi N
            config += `
# WiFi N Configuration
/interface wireless set [find default-name=wlan1] \\
    mode=ap-bridge band=2ghz-b/g/n \\
    channel-width=20/40mhz-Ce frequency=auto \\
    ssid="${ssid2g || 'KETRIKA-WiFi'}" \\
    wireless-protocol=802.11 \\
    security-profile=default \\
    wps-mode=disabled \\
    disabled=no

/interface wireless security-profiles set [find default=yes] \\
    mode=dynamic-keys \\
    authentication-types=wpa2-psk \\
    wpa2-pre-shared-key="${wifiPassword || 'ketrika301'}" \\
    supplicant-identity=""

/interface bridge port add bridge=bridge-lan interface=wlan1
`;
        }
    }

    // --- IP Configuration ---
    config += `
# --- IP CONFIGURATION ---
/ip address add address=192.168.88.1/24 interface=bridge-lan network=192.168.88.0

# --- DHCP SERVER ---
/ip pool add name=dhcp-pool ranges=192.168.88.10-192.168.88.254
/ip dhcp-server add name=dhcp-lan address-pool=dhcp-pool interface=bridge-lan lease-time=1h disabled=no
/ip dhcp-server network add address=192.168.88.0/24 gateway=192.168.88.1 dns-server=192.168.88.1

# --- DHCP CLIENT (WAN) ---
/ip dhcp-client add interface=ether1 disabled=no add-default-route=yes use-peer-dns=no use-peer-ntp=no

# --- DNS OVER HTTPS ---
/ip dns set allow-remote-requests=yes \\
    use-doh-server=https://cloudflare-dns.com/dns-query \\
    verify-doh-cert=yes
/ip dns static add name=cloudflare-dns.com address=104.16.248.249
/ip dns static add name=cloudflare-dns.com address=104.16.249.249

`;

    // --- WARP VPN ---
    if (needWarp && warpConfig) {
        config += `
# --- CLOUDFLARE WARP VPN (WireGuard) ---
/interface wireguard add \\
    name=WARP \\
    listen-port=13231 \\
    mtu=1280 \\
    private-key="${warpConfig.privateKey}"

/interface wireguard peers add \\
    interface=WARP \\
    public-key="${warpConfig.publicKey}" \\
    endpoint-address=${warpConfig.endpoint} \\
    endpoint-port=2408 \\
    allowed-address=0.0.0.0/0,::/0 \\
    persistent-keepalive=25s

/ip address add address=${warpConfig.clientIPv4}/32 interface=WARP network=${warpConfig.clientIPv4}

# WARP Routing
/ip route add dst-address=0.0.0.0/0 gateway=WARP distance=1 routing-table=warp
/ip route add dst-address=${warpConfig.endpoint}/32 gateway=[/ip dhcp-client get [find interface=ether1] gateway]

# Route all LAN traffic through WARP
/ip firewall mangle add chain=prerouting src-address=192.168.88.0/24 \\
    action=mark-routing new-routing-mark=warp passthrough=yes
/ip firewall mangle add chain=output action=mark-routing \\
    new-routing-mark=warp passthrough=yes \\
    dst-address=!192.168.88.0/24

# WARP NAT
/ip firewall nat add chain=srcnat out-interface=WARP action=masquerade

`;
    }

    // --- Anti-Detection FAI ---
    config += `
# --- ANTI-DETECTION FAI ---

# Change TTL to 65 (mask device count)
/ip firewall mangle add chain=postrouting action=change-ttl new-ttl=set:65 passthrough=yes
/ip firewall mangle add chain=prerouting action=change-ttl new-ttl=set:65 passthrough=yes

# Block DNS leak (force all DNS through our DoH)
/ip firewall nat add chain=dstnat protocol=udp dst-port=53 \\
    src-address=192.168.88.0/24 action=redirect to-ports=53
/ip firewall nat add chain=dstnat protocol=tcp dst-port=53 \\
    src-address=192.168.88.0/24 action=redirect to-ports=53

# Block WebRTC leak indicators
/ip firewall filter add chain=forward protocol=udp dst-port=3478 action=drop comment="Block STUN"
/ip firewall filter add chain=forward protocol=udp dst-port=19302 action=drop comment="Block Google STUN"

`;

    if (plan === 'pro' || plan === 'business') {
        config += `
# ADVANCED Anti-Detection
# Clamp MSS to prevent MTU detection
/ip firewall mangle add chain=forward protocol=tcp tcp-flags=syn \\
    action=change-mss new-mss=clamp-to-pmtu passthrough=yes

# Hide router identity
/system identity set name="${randomName}"

# Change MAC on WAN interface
/interface ethernet set [find default-name=ether1] mac-address=${randomMAC}

# Disable neighbor discovery on WAN
/ip neighbor discovery-settings set discover-interface-list=!dynamic

# Disable UPnP
/ip upnp set enabled=no

# Disable bandwidth test server
/tool bandwidth-server set enabled=no

# Disable MAC telnet/winbox on WAN
/tool mac-server set allowed-interface-list=none
/tool mac-server mac-winbox set allowed-interface-list=none

# Block common detection ports
/ip firewall filter add chain=input in-interface=ether1 protocol=tcp \\
    dst-port=8291,8728,8729,80,443,22,23 action=drop comment="Block management from WAN"

`;
    }

    // --- Firewall ---
    config += `
# --- FIREWALL ---
/ip firewall filter add chain=input connection-state=established,related action=accept
/ip firewall filter add chain=input connection-state=invalid action=drop
/ip firewall filter add chain=input in-interface=bridge-lan action=accept
/ip firewall filter add chain=input action=drop

/ip firewall filter add chain=forward connection-state=established,related action=accept
/ip firewall filter add chain=forward connection-state=invalid action=drop
/ip firewall filter add chain=forward in-interface=bridge-lan action=accept
/ip firewall filter add chain=forward action=drop

# NAT Masquerade
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade

`;

    // --- Business Plan Extras ---
    if (isBusiness) {
        config += `
# ============================================
# BUSINESS PLAN - HOTSPOT & PPPoE
# ============================================

# --- HOTSPOT ---
/ip pool add name=hotspot-pool ranges=10.0.0.10-10.0.0.254
/ip address add address=10.0.0.1/24 interface=bridge-lan network=10.0.0.0

/ip hotspot profile add \\
    name="${hotspotName || 'KETRIKA-HOTSPOT'}" \\
    hotspot-address=10.0.0.1 \\
    dns-name="${(hotspotName || 'ketrika').toLowerCase()}.net" \\
    html-directory=hotspot \\
    login-by=http-chap,http-pap \\
    use-radius=no

/ip hotspot add \\
    name=hotspot1 \\
    interface=bridge-lan \\
    address-pool=hotspot-pool \\
    profile="${hotspotName || 'KETRIKA-HOTSPOT'}" \\
    disabled=no

# Default hotspot user
/ip hotspot user add name=admin password=admin profile=default

# --- PPPoE SERVER ---
/ip pool add name=pppoe-pool ranges=10.10.0.10-10.10.0.254

/ppp profile add \\
    name=pppoe-profile \\
    local-address=10.10.0.1 \\
    remote-address=pppoe-pool \\
    dns-server=192.168.88.1 \\
    change-tcp-mss=yes

/interface pppoe-server server add \\
    service-name=KETRIKA-PPPoE \\
    interface=bridge-lan \\
    default-profile=pppoe-profile \\
    disabled=no

# Default PPPoE user
/ppp secret add name=client1 password=client1 service=pppoe profile=pppoe-profile

# --- TORRENT BLOCKING ---
/ip firewall filter add chain=forward protocol=tcp dst-port=6881-6889 action=drop comment="Block BitTorrent"
/ip firewall filter add chain=forward protocol=udp dst-port=6881-6889 action=drop comment="Block BitTorrent UDP"
/ip firewall filter add chain=forward protocol=tcp dst-port=6969 action=drop comment="Block Torrent Tracker"
/ip firewall filter add chain=forward protocol=udp dst-port=6969 action=drop comment="Block Torrent Tracker UDP"

# Layer 7 torrent blocking
/ip firewall layer7-protocol add name=torrent-l7 \\
    regexp="^(\\x13BitTorrent protocol|azver\\x01\$|get /telecast|GET /announce\\?|GET /scrape\\?)"
/ip firewall filter add chain=forward layer7-protocol=torrent-l7 action=drop comment="L7 Torrent Block"

# --- SCHEDULED SLEEP/WAKE ---
/system scheduler add name=sleep-time \\
    start-time=${sleepStart}:00 \\
    interval=1d \\
    on-event="/interface wireless disable [find]\\r\\n/ip hotspot disable [find]" \\
    policy=ftp,reboot,read,write,policy,test,password,sniff,sensitive,romon \\
    comment="Auto sleep at ${sleepStart}"

/system scheduler add name=wake-time \\
    start-time=${sleepEnd}:00 \\
    interval=1d \\
    on-event="/interface wireless enable [find]\\r\\n/ip hotspot enable [find]" \\
    policy=ftp,reboot,read,write,policy,test,password,sniff,sensitive,romon \\
    comment="Auto wake at ${sleepEnd}"

`;
    }

    // --- Final ---
    config += `
# --- SYSTEM SETTINGS ---
/system clock set time-zone-name=Indian/Antananarivo
/system ntp client set enabled=yes
/system ntp client servers add address=time.cloudflare.com

# Set admin password
/user set [find name=admin] password="ketrika301"

# --- CONFIGURATION COMPLETE ---
# KETRIKA MIKROTIK 301
# Your router is now configured!
# WiFi SSID: ${ssid2g || 'KETRIKA-WiFi'}
# Admin password: ketrika301
# Router login: admin / ketrika301

/log info message="KETRIKA MIKROTIK 301 - Configuration imported successfully!"

# Auto reboot to apply all changes
/system reboot
`;

    return config;
}

// Generate random MAC address
function generateRandomMAC() {
    const hex = '0123456789ABCDEF';
    let mac = '';
    for (let i = 0; i < 6; i++) {
        if (i === 0) {
            // First byte: locally administered, unicast
            mac += hex[Math.floor(Math.random() * 4) * 4 + 2];
            mac += hex[Math.floor(Math.random() * 16)];
        } else {
            mac += hex[Math.floor(Math.random() * 16)];
            mac += hex[Math.floor(Math.random() * 16)];
        }
        if (i < 5) mac += ':';
    }
    return mac;
}