const fs = require('fs');

function calibrateSvg(filename, landmarks) {
    console.log(`\n================= ${filename} =================`);
    const content = fs.readFileSync('map_pack/' + filename, 'utf8');
    const vb = content.match(/viewBox="([^"]+)"/)[1].split(' ').map(parseFloat);
    const vbWidth = vb[2];
    const vbHeight = vb[3];

    let sumWX = 0, sumSX = 0, sumWXSX = 0, sumWX2 = 0;
    let sumWZ = 0, sumSY = 0, sumWZSY = 0, sumWZ2 = 0;
    const N = landmarks.length;

    landmarks.forEach(([name, wx, wz, sx, sy]) => {
        sumWX += wx; sumSX += sx; sumWXSX += wx * sx; sumWX2 += wx * wx;
        sumWZ += wz; sumSY += sy; sumWZSY += wz * sy; sumWZ2 += wz * wz;
    });

    const a_x = (N * sumWXSX - sumWX * sumSX) / (N * sumWX2 - sumWX * sumWX);
    const b_x = (sumSX - a_x * sumWX) / N;

    const a_z = (N * sumWZSY - sumWZ * sumSY) / (N * sumWZ2 - sumWZ * sumWZ);
    const b_z = (sumSY - a_z * sumWZ) / N;

    const minX = (0 - b_x) / a_x;
    const maxX = (vbWidth - b_x) / a_x;
    const maxZ = (0 - b_z) / a_z;
    const minZ = (vbHeight - b_z) / a_z;

    console.log(`viewBox: 0 0 ${vbWidth} ${vbHeight}`);
    console.log(`Fit: svgX = ${a_x.toFixed(6)} * wx + ${b_x.toFixed(3)}, svgY = ${a_z.toFixed(6)} * wz + ${b_z.toFixed(3)}`);
    console.log(`Calibrated World Bounds:`);
    console.log(`  minX: ${Math.round(minX)}, maxX: ${Math.round(maxX)}`);
    console.log(`  minZ: ${Math.round(minZ)}, maxZ: ${Math.round(maxZ)}`);
    return { minX: Math.round(minX), maxX: Math.round(maxX), minZ: Math.round(minZ), maxZ: Math.round(maxZ) };
}

// Map 01
calibrateSvg('01_geographical_master_map.svg', [
    ['Gateway', -350, -2250, 114.9, 613.2],
    ['Colaba', -300, -2300, 123.2, 596.9],
    ['Marine Drive', -850, -1700, 91.8, 531.8],
    ['Bandra / Agnel', -1350, 520, 146.7, 344.8],
    ['Dharavi (Mahim/Sion mid)', 0, 0, 192.1, 357.0],
    ['Airoli / Academic', 1850, 1450, 316.4, 271.9],
    ['Thane', 1150, 2350, 359.1, 206.6],
    ['Borivali', -520, 2480, 206.6, 113.1]
]);

// Map 02 (Railway Schematic)
calibrateSvg('02_railway_network_schematic.svg', [
    ['Churchgate', -480, -1920, 52.6, 609.0],
    ['CSMT', -200, -1950, 144.3, 609.0],
    ['Dadar', -120, -320, 69.2, 527.6],
    ['Bandra', -680, 480, 65.9, 446.3],
    ['Kurla', 580, 480, 168.7, 487.0],
    ['Andheri', -650, 1550, 64.1, 405.7],
    ['Ghatkopar', 680, 1020, 180.9, 446.3],
    ['Borivali', -520, 2480, 64.9, 243.1],
    ['Thane', 1180, 2380, 225.6, 283.7],
    ['Airoli', 1700, 1420, 343.5, 230.9],
    ['Vashi', 1720, -120, 323.2, 454.5],
    ['Panvel', 2400, -2100, 380.1, 548.0]
]);

// Map 03 (Road & District Connectivity)
calibrateSvg('03_road_district_connectivity.svg', [
    ['Colaba / Fort', -300, -2100, 71.0, 580.5],
    ['Marine Drive', -850, -1700, 83.1, 495.1],
    ['Worli / Parel / Dadar', -150, -600, 70.8, 417.9],
    ['Bandra / Mahim', -650, 350, 78.2, 332.5],
    ['Andheri / Airport', -450, 1550, 92.6, 255.2],
    ['Goregaon / Borivali', -550, 2200, 121.1, 165.8],
    ['Kurla / Ghatkopar', 600, 800, 184.7, 271.5],
    ['Thane', 1150, 2350, 301.7, 141.4],
    ['Vashi / Nerul', 1800, 500, 306.9, 356.9],
    ['Belapur / Panvel', 2100, -1500, 325.2, 478.9]
]);
