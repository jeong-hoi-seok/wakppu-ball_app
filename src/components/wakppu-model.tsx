import { useGLTF } from '@react-three/drei';
import { type ThreeEvent, useFrame } from '@react-three/fiber/native';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';

import wakppuGlb from '@/assets/3d/clay_ball_sim_ready_01.glb';
import { useClayStore } from '@/store/use-clay-store';

type WakppuModelProps = {
  scale?: number;
};

const DEFORM_RADIUS = 0.25;
const DEFORM_STRENGTH = 0.04;
const MAX_DEPTH = 0.25;
const PAINT_MIX = 0.35;
const MORPH_LERP_SPEED = 8;

type MorphRef = { index: number; influence: number };

export const WakppuModel = ({ scale = 1 }: WakppuModelProps) => {
  const { scene } = useGLTF(wakppuGlb as unknown as string) as GLTF;
  const isPressingRef = useRef(false);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const originalColorsRef = useRef<Float32Array | null>(null);
  const paintColorRef = useRef(new THREE.Color('#4382DF'));
  const morphRef = useRef<MorphRef | null>(null);

  const resetTick = useClayStore((s) => s.resetTick);
  const wireframe = useClayStore((s) => s.wireframe);
  const shapeKeyActive = useClayStore((s) => s.shapeKeyActive);
  const selectedColor = useClayStore((s) => s.selectedColor);
  const setMeshInfo = useClayStore((s) => s.setMeshInfo);
  const setHit = useClayStore((s) => s.setHit);
  const setStatus = useClayStore((s) => s.setStatus);

  const { mesh, centeredScene, fitScale, debug } = useMemo(() => {
    const cloned = scene.clone(true);
    let found: THREE.Mesh | null = null;
    let meshCount = 0;
    cloned.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        meshCount += 1;
        if (!found) found = obj as THREE.Mesh;
      }
    });
    if (!found) {
      return {
        mesh: null as THREE.Mesh | null,
        centeredScene: cloned,
        fitScale: 1,
        debug: { meshCount, sceneChildren: cloned.children.length },
      };
    }
    const m = found as THREE.Mesh;
    m.geometry = m.geometry.clone();
    const posAttr = m.geometry.attributes.position as THREE.BufferAttribute;

    if (!m.geometry.attributes.color) {
      const base = new THREE.Color('#AACCD6');
      const arr = new Float32Array(posAttr.count * 3);
      for (let i = 0; i < posAttr.count; i++) {
        arr[i * 3] = base.r;
        arr[i * 3 + 1] = base.g;
        arr[i * 3 + 2] = base.b;
      }
      m.geometry.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }

    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mat) => {
      const std = mat as THREE.MeshStandardMaterial;
      std.vertexColors = true;
      std.needsUpdate = true;
    });

    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const normalizedScale = maxDim > 0 ? 2 / maxDim : 1;
    return {
      mesh: m,
      centeredScene: cloned,
      fitScale: normalizedScale * scale,
      debug: {
        meshCount,
        sceneChildren: cloned.children.length,
        bbox: [size.x, size.y, size.z] as [number, number, number],
        maxDim,
      },
    };
  }, [scene, scale]);

  useEffect(() => {
    if (!debug) {
      setStatus('debug=none');
      return;
    }
    const bbox = 'bbox' in debug ? debug.bbox : null;
    if (bbox) {
      setStatus(
        `mesh=${debug.meshCount} bbox=${bbox.map((n) => n.toFixed(2)).join(',')} fit=${fitScale.toFixed(3)}`,
      );
    } else {
      setStatus(
        `NO_MESH meshCount=${debug.meshCount} children=${debug.sceneChildren}`,
      );
    }
  }, [debug, fitScale, setStatus]);

  useEffect(() => {
    if (!mesh) return;
    const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = mesh.geometry.attributes.color as THREE.BufferAttribute;
    const idx = mesh.geometry.index;
    originalPositionsRef.current = new Float32Array(
      posAttr.array as Float32Array,
    );
    originalColorsRef.current = new Float32Array(
      colorAttr.array as Float32Array,
    );

    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      const keys = Object.keys(mesh.morphTargetDictionary);
      const preferred = keys.find((k) => /press|squash/i.test(k)) ?? keys[0];
      if (preferred !== undefined) {
        morphRef.current = {
          index: mesh.morphTargetDictionary[preferred],
          influence: 0,
        };
      }
    }

    const info = {
      vertexCount: posAttr.count,
      triangleCount: idx ? idx.count / 3 : posAttr.count / 3,
      hasUv: !!mesh.geometry.attributes.uv,
      hasColor: true,
      morphTargets: Object.keys(mesh.morphTargetDictionary ?? {}),
    };
    setMeshInfo(info);
    console.log('[clay] mesh loaded:', mesh.name, info);
  }, [mesh, setMeshInfo]);

  useEffect(() => {
    paintColorRef.current.set(selectedColor);
  }, [selectedColor]);

  useEffect(() => {
    if (
      resetTick === 0 ||
      !mesh ||
      !originalPositionsRef.current ||
      !originalColorsRef.current
    ) {
      return;
    }
    const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = mesh.geometry.attributes.color as THREE.BufferAttribute;
    (posAttr.array as Float32Array).set(originalPositionsRef.current);
    (colorAttr.array as Float32Array).set(originalColorsRef.current);
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    if (morphRef.current && mesh.morphTargetInfluences) {
      morphRef.current.influence = 0;
      mesh.morphTargetInfluences[morphRef.current.index] = 0;
    }
  }, [resetTick, mesh]);

  useEffect(() => {
    if (!mesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      const std = mat as THREE.MeshStandardMaterial;
      if ('wireframe' in std) std.wireframe = wireframe;
    });
  }, [mesh, wireframe]);

  useFrame((_, delta) => {
    if (!mesh || !mesh.morphTargetInfluences || !morphRef.current) return;
    const m = morphRef.current;
    const target = isPressingRef.current && shapeKeyActive ? 1 : 0;
    const t = 1 - Math.exp(-MORPH_LERP_SPEED * delta);
    m.influence += (target - m.influence) * t;
    mesh.morphTargetInfluences[m.index] = m.influence;
  });

  const applyStroke = (e: ThreeEvent<PointerEvent>) => {
    if (!mesh || !e.face || !originalPositionsRef.current) return;
    const localPoint = mesh.worldToLocal(e.point.clone());
    const localNormal = e.face.normal.clone().normalize();
    const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = mesh.geometry.attributes.color as THREE.BufferAttribute;
    const orig = originalPositionsRef.current;
    const paint = paintColorRef.current;
    const r = DEFORM_RADIUS;
    const r2 = r * r;
    const maxD2 = MAX_DEPTH * MAX_DEPTH;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const dx = vx - localPoint.x;
      const dy = vy - localPoint.y;
      const dz = vz - localPoint.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > r2) continue;
      const ratio = Math.sqrt(d2) / r;
      const falloff = (1 - ratio) * (1 - ratio);
      const push = DEFORM_STRENGTH * falloff;
      let nx = vx - localNormal.x * push;
      let ny = vy - localNormal.y * push;
      let nz = vz - localNormal.z * push;
      const ox = orig[i * 3];
      const oy = orig[i * 3 + 1];
      const oz = orig[i * 3 + 2];
      const ddx = nx - ox;
      const ddy = ny - oy;
      const ddz = nz - oz;
      const depth2 = ddx * ddx + ddy * ddy + ddz * ddz;
      if (depth2 > maxD2) {
        const k = MAX_DEPTH / Math.sqrt(depth2);
        nx = ox + ddx * k;
        ny = oy + ddy * k;
        nz = oz + ddz * k;
      }
      posAttr.setXYZ(i, nx, ny, nz);

      const cr = colorAttr.getX(i);
      const cg = colorAttr.getY(i);
      const cb = colorAttr.getZ(i);
      const mix = falloff * PAINT_MIX;
      colorAttr.setXYZ(
        i,
        cr + (paint.r - cr) * mix,
        cg + (paint.g - cg) * mix,
        cb + (paint.b - cb) * mix,
      );
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
    setHit({ x: e.point.x, y: e.point.y, z: e.point.z });
  };

  const handleDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    isPressingRef.current = true;
    applyStroke(e);
  };

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isPressingRef.current) return;
    applyStroke(e);
  };

  const handleUp = () => {
    isPressingRef.current = false;
  };

  return (
    <>
      <mesh position={[1.5, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="red" wireframe />
      </mesh>
      {mesh && (
        <group scale={fitScale}>
          <primitive
            object={centeredScene}
            onPointerDown={handleDown}
            onPointerMove={handleMove}
            onPointerUp={handleUp}
            onPointerCancel={handleUp}
            onPointerLeave={handleUp}
          />
        </group>
      )}
    </>
  );
};

useGLTF.preload(wakppuGlb as unknown as string);
