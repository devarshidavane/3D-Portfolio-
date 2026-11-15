import * as THREE from 'three';

// ==========================================
// 500M SPATIAL CHUNK STREAMING & LOD MANAGER
// ==========================================

export const CHUNK_SIZE = 500;
export const ACTIVE_RADIUS = 750; // Visible radius around camera
export const lodRegistry = [];

export class ChunkManager {
    constructor(scene, chunkSize = CHUNK_SIZE) {
        this.scene = scene;
        this.chunkSize = chunkSize;
        this.chunks = new Map(); // key "cx,cz" -> { cx, cz, group: THREE.Group, bounds, entities: [] }
        this.activeChunks = new Set();
        this.currentCamPos = new THREE.Vector3();
    }

    _key(cx, cz) {
        return `${cx},${cz}`;
    }

    getOrCreateChunk(cx, cz) {
        const k = this._key(cx, cz);
        if (!this.chunks.has(k)) {
            const group = new THREE.Group();
            group.name = `chunk_${cx}_${cz}`;
            this.scene.add(group);

            const minX = cx * this.chunkSize;
            const maxX = minX + this.chunkSize;
            const minZ = cz * this.chunkSize;
            const maxZ = minZ + this.chunkSize;

            this.chunks.set(k, {
                cx, cz,
                group,
                minX, maxX, minZ, maxZ,
                entities: [],
                visible: true
            });
        }
        return this.chunks.get(k);
    }

    addToChunk(obj, worldX, worldZ) {
        const cx = Math.floor(worldX / this.chunkSize);
        const cz = Math.floor(worldZ / this.chunkSize);
        const chunk = this.getOrCreateChunk(cx, cz);
        chunk.group.add(obj);
        chunk.entities.push(obj);
        return chunk;
    }

    update(camPos) {
        if (!camPos) return;
        this.currentCamPos.copy(camPos);

        const currentCX = Math.floor(camPos.x / this.chunkSize);
        const currentCZ = Math.floor(camPos.z / this.chunkSize);
        const chunkDist = Math.ceil(ACTIVE_RADIUS / this.chunkSize);

        // Determine visible chunks
        const newVisible = new Set();
        for (let dx = -chunkDist; dx <= chunkDist; dx++) {
            for (let dz = -chunkDist; dz <= chunkDist; dz++) {
                const cx = currentCX + dx;
                const cz = currentCZ + dz;
                const centerX = (cx + 0.5) * this.chunkSize;
                const centerZ = (cz + 0.5) * this.chunkSize;
                const dist = Math.hypot(camPos.x - centerX, camPos.z - centerZ);
                if (dist <= ACTIVE_RADIUS + this.chunkSize * 0.5) {
                    newVisible.add(this._key(cx, cz));
                }
            }
        }

        // Apply visibility
        for (const [key, chunk] of this.chunks.entries()) {
            const shouldBeVisible = newVisible.has(key);
            if (chunk.group.visible !== shouldBeVisible) {
                chunk.group.visible = shouldBeVisible;
            }
        }
    }
}

export function registerLODItem(meshOrGroup, nearDist = 0, farDist = 200) {
    if (!meshOrGroup) return;
    lodRegistry.push({
        target: meshOrGroup,
        nearDist,
        farDist,
        isVisible: true
    });
}

export function updateLevelOfDetail(camPos) {
    if (!camPos) return;
    for (let i = 0; i < lodRegistry.length; i++) {
        const item = lodRegistry[i];
        const obj = item.target;
        if (!obj) continue;
        const dist = camPos.distanceTo(obj.position);
        const shouldBeVisible = (dist >= item.nearDist && dist <= item.farDist);
        if (obj.visible !== shouldBeVisible) {
            obj.visible = shouldBeVisible;
        }
    }
}
