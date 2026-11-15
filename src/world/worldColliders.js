import * as THREE from 'three';
import { getElevationAt } from '../data/mumbaiGeography.js';

// ==========================================
// WORLD COLLISION & SPATIAL HASH GRID ENGINE
// ==========================================

export const worldColliders = [];
export let currentFloorElevation = 0;

// 50m Spatial Hash Grid for O(1) query time across 5km-10km footprint
export class SpatialHashGrid {
    constructor(cellSize = 50) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    _key(cx, cz) {
        return `${cx},${cz}`;
    }

    insert(collider) {
        let minCX, maxCX, minCZ, maxCZ;
        if (collider.type === 'box') {
            minCX = Math.floor(collider.minX / this.cellSize);
            maxCX = Math.floor(collider.maxX / this.cellSize);
            minCZ = Math.floor(collider.minZ / this.cellSize);
            maxCZ = Math.floor(collider.maxZ / this.cellSize);
        } else {
            minCX = Math.floor((collider.x - collider.radius) / this.cellSize);
            maxCX = Math.floor((collider.x + collider.radius) / this.cellSize);
            minCZ = Math.floor((collider.z - collider.radius) / this.cellSize);
            maxCZ = Math.floor((collider.z + collider.radius) / this.cellSize);
        }

        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cz = minCZ; cz <= maxCZ; cz++) {
                const k = this._key(cx, cz);
                if (!this.cells.has(k)) this.cells.set(k, []);
                this.cells.get(k).push(collider);
            }
        }
    }

    query(x, z, radius = 2.0) {
        const minCX = Math.floor((x - radius) / this.cellSize);
        const maxCX = Math.floor((x + radius) / this.cellSize);
        const minCZ = Math.floor((z - radius) / this.cellSize);
        const maxCZ = Math.floor((z + radius) / this.cellSize);

        const found = new Set();
        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cz = minCZ; cz <= maxCZ; cz++) {
                const list = this.cells.get(this._key(cx, cz));
                if (list) {
                    for (let i = 0; i < list.length; i++) {
                        found.add(list[i]);
                    }
                }
            }
        }
        return Array.from(found);
    }
}

export const spatialGrid = new SpatialHashGrid(50);

export function registerBoxCollider(minX, maxX, minZ, maxZ, label = 'obstacle', minY = -5, maxY = 4.5, roofY = undefined) {
    if (roofY === undefined && maxY > 4.5) {
        roofY = maxY;
    }
    const collider = { type: 'box', minX, maxX, minZ, maxZ, minY, maxY, roofY, label };
    worldColliders.push(collider);
    spatialGrid.insert(collider);
    return collider;
}

export function registerCylinderCollider(x, z, radius, label = 'pole', minY = -5, maxY = 7.5) {
    const collider = { type: 'cylinder', x, z, radius, minY, maxY, label };
    worldColliders.push(collider);
    spatialGrid.insert(collider);
    return collider;
}

export function getSurfaceElevationAt(x, z, currentY = 0) {
    // 1. Natural Geographic Gaussian Elevation from Mumbai Geography Data (Hill ridges like Bandra Mount Mary & SGNP)
    let naturalElevation = 0;
    try {
        naturalElevation = getElevationAt(x, z);
    } catch (e) {
        naturalElevation = 0;
    }

    let topY = naturalElevation;

    // 2. Stark Tower Home HQ in Dharavi Koliwada (origin X:0, Z:0 / historical Z:140)
    // 12-tier explorable floor elevations matching architectural concept
    const distToOriginHq = Math.hypot(x - 0, z - 0);
    const distToOldHq = Math.hypot(x - 0, z - 140);
    if (distToOriginHq < 28 || distToOldHq < 22) {
        // Explorable floor tiers (from highest to lowest)
        const towerFloors = [145.0, 140.0, 132.0, 118.0, 104.0, 90.0, 76.0, 62.0, 48.0, 34.0, 20.0];
        for (let i = 0; i < towerFloors.length; i++) {
            const flY = towerFloors[i];
            if (currentY >= flY - 2.5) {
                return flY;
            }
        }
        return naturalElevation > 0.15 ? naturalElevation : 0.15;
    }

    // 3. Fr. Agnel Technical High School Bandra West ridge (-1350, 32.0, 520)
    if (Math.hypot(x - (-1350), z - 520) < 65) {
        const terraceY = 32.0 + 8.5; // Academic block terrace
        if (currentY >= 32.0 + 7.0) return terraceY;
        return Math.max(32.0, naturalElevation);
    }

    // 4. DMCE College Campus in Airoli (1850, 12.0, 1450)
    if (Math.hypot(x - 1850, z - 1450) < 75) {
        const collegeTerraceY = 12.0 + 12.0; // 4-story college terrace
        if (currentY >= 12.0 + 10.0) return collegeTerraceY;
        return Math.max(12.0, naturalElevation);
    }

    // 5. Haji Ali Coastal Causeway Walkway & Sanctuary
    if (x >= -185 && x <= -175 && z >= -142 && z <= -20) {
        return 0.6;
    }
    if (x >= -206 && x <= -154 && z >= -186 && z <= -134) {
        if (x >= -193 && x <= -167 && z >= -173 && z <= -151) {
            if (currentY >= 6.0) return 8.7;
        }
        return 1.0;
    }

    // 6. Asiatic Library Grand Classical Steps & Terrace
    if (x >= 82 && x <= 118) {
        if (z >= 95.2 && z <= 105.8) {
            const stepIdx = Math.floor((z - 95.2) / 1.3);
            return Math.min(3.6, Math.max(0.45, (stepIdx + 1) * 0.45));
        }
        if (z > 105.8 && z <= 110) {
            return 3.9;
        }
    }

    // 7. Spatial hash lookup for nearby building and platform colliders
    const nearby = spatialGrid.query(x, z, 10);
    for (let i = 0; i < nearby.length; i++) {
        const c = nearby[i];
        if (c.type === 'box') {
            const rY = (c.roofY !== undefined) ? c.roofY : ((c.maxY !== undefined && c.maxY >= 2.0) ? c.maxY : 0);
            if (rY >= 0.5 && !c.label?.includes('Balustrade') && !c.label?.includes('Boundary') && !c.label?.includes('Pier')) {
                if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) {
                    if (currentY >= rY - 2.0) {
                        if (rY > topY) topY = rY;
                    }
                }
            }
        }
    }

    return topY;
}

export function resolveCollision(pos, radius = 0.5, playableLimits = { minX: -2500, maxX: 2500, minZ: -2500, maxZ: 2500 }) {
    // 1. World Boundaries Clamp (5km x 5km)
    pos.x = THREE.MathUtils.clamp(pos.x, playableLimits.minX, playableLimits.maxX);
    pos.z = THREE.MathUtils.clamp(pos.z, playableLimits.minZ, playableLimits.maxZ);

    // 2. Spatial Query for Nearby Obstacles
    const nearby = spatialGrid.query(pos.x, pos.z, radius + 5);
    for (let i = 0; i < nearby.length; i++) {
        const col = nearby[i];
        if (col.minY !== undefined && col.maxY !== undefined) {
            const topElevation = (col.roofY !== undefined) ? col.roofY : col.maxY;
            if (pos.y < col.minY || pos.y >= topElevation - 0.08) continue;
        }

        if (col.type === 'box') {
            if (pos.x >= col.minX - radius && pos.x <= col.maxX + radius &&
                pos.z >= col.minZ - radius && pos.z <= col.maxZ + radius) {
                const left = pos.x - (col.minX - radius);
                const right = (col.maxX + radius) - pos.x;
                const bottom = pos.z - (col.minZ - radius);
                const top = (col.maxZ + radius) - pos.z;
                const minOverlap = Math.min(left, right, bottom, top);

                if (minOverlap === left) pos.x = col.minX - radius;
                else if (minOverlap === right) pos.x = col.maxX + radius;
                else if (minOverlap === bottom) pos.z = col.minZ - radius;
                else pos.z = col.maxZ + radius;
            }
        } else if (col.type === 'cylinder') {
            const dx = pos.x - col.x;
            const dz = pos.z - col.z;
            const dist = Math.hypot(dx, dz);
            const minDist = col.radius + radius;
            if (dist < minDist && dist > 0.0001) {
                const overlap = minDist - dist;
                pos.x += (dx / dist) * overlap;
                pos.z += (dz / dist) * overlap;
            }
        }
    }
}
