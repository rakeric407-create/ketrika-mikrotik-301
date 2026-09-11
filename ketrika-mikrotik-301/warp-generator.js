// ============================================
// CLOUDFLARE WARP KEY GENERATOR
// ============================================

function generateWarpKeys() {
    // Generate WireGuard-compatible keys for WARP
    // In a real implementation, you would call Cloudflare's API
    // This generates placeholder keys that follow the correct format

    const privateKey = generateBase64Key(32);
    const publicKey = generateBase64Key(32);

    // Cloudflare WARP endpoints
    const endpoints = [
        '162.159.193.1',
        '162.159.193.2',
        '162.159.193.3',
        '162.159.193.4',
        '162.159.193.5',
        '162.159.192.1',
        '162.159.192.2',
        '162.159.192.3'
    ];

    // WARP public key (Cloudflare's actual public key for WARP)
    const warpPublicKey = 'bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=';

    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];

    // Generate client IP (WARP assigns from 100.96.0.0/12 range)
    const octet3 = Math.floor(Math.random() * 16) + 96;
    const octet4 = Math.floor(Math.random() * 254) + 1;
    const clientIPv4 = `100.${octet3}.${Math.floor(Math.random() * 256)}.${octet4}`;

    return {
        privateKey: privateKey,
        publicKey: warpPublicKey,
        clientPublicKey: publicKey,
        endpoint: endpoint,
        clientIPv4: clientIPv4,
        clientIPv6: `fd01:5ca1:ab1e:${randomHex(4)}::${randomHex(4)}`,
        listenPort: 13231,
        mtu: 1280
    };
}

function generateBase64Key(bytes) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr));
}

function randomHex(length) {
    const hex = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += hex[Math.floor(Math.random() * 16)];
    }
    return result;
}