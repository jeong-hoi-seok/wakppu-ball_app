import { useGLTF } from '@react-three/drei';
import { type ThreeEvent, useFrame } from '@react-three/fiber/native';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { GLTF } from 'three-stdlib';

import wakppuGlb from '@/assets/3d/wakppu.glb';

type WakppuModelProps = {
  scale?: number;
};

const REST_SCALE = new THREE.Vector3(1, 1, 1);
const PRESSED_SCALE = new THREE.Vector3(1.2, 0.75, 1.2);
const SCALE_LERP = 10;
const STRENGTH_LERP = 14;
const PRESS_RADIUS = 0.9;
const PRESS_STRENGTH_MAX = 0.45;
const SHATTER_HOLD = 1.0;
const RESET_DELAY_MS = 1800;
const FRAG_COUNT = 48;
const GRAVITY = -5;
const FRAG_BURST_SPEED = 3.5;

const VERTEX_REPLACE = /* glsl */ `
  vec3 transformed = vec3(position);
  vec4 wakWorldP = modelMatrix * vec4(position, 1.0);
  float wakD = distance(wakWorldP.xyz, uPressPoint);
  float wakF = exp(-pow(wakD / max(uPressRadius, 0.0001), 2.0)) * uPressStrength;
  transformed -= normal * wakF;
`;

type Fragment = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  angVel: THREE.Vector3;
};

const makeFragments = (origin: THREE.Vector3): Fragment[] =>
  Array.from({ length: FRAG_COUNT }, () => {
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5,
    )
      .normalize()
      .multiplyScalar(FRAG_BURST_SPEED * (0.6 + Math.random() * 0.8));
    dir.y += 1.5;
    return {
      pos: origin
        .clone()
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
          ),
        ),
      vel: dir,
      rot: new THREE.Euler(),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
      ),
    };
  });

export const WakppuModel = ({ scale = 1 }: WakppuModelProps) => {
  const { scene } = useGLTF(wakppuGlb as unknown as string) as GLTF;
  const groupRef = useRef<THREE.Group>(null);
  const squashRef = useRef<THREE.Group>(null);
  const fragMeshRef = useRef<THREE.InstancedMesh>(null);
  const [pressed, setPressed] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'shattered'>('idle');
  const pressTimeRef = useRef(0);
  const fragsRef = useRef<Fragment[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const uniformsRef = useRef({
    uPressPoint: { value: new THREE.Vector3(0, 0, 0) },
    uPressRadius: { value: PRESS_RADIUS },
    uPressStrength: { value: 0 },
  });

  const { centeredScene, fitScale, fragColor } = useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    cloned.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const normalizedScale = maxDim > 0 ? 2 / maxDim : 1;

    let pickedColor = new THREE.Color('#ffb86b');
    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat: THREE.Material) => {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.color) pickedColor = std.color.clone();
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uPressPoint = uniformsRef.current.uPressPoint;
          shader.uniforms.uPressRadius = uniformsRef.current.uPressRadius;
          shader.uniforms.uPressStrength = uniformsRef.current.uPressStrength;
          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
uniform vec3 uPressPoint;
uniform float uPressRadius;
uniform float uPressStrength;`,
          );
          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            VERTEX_REPLACE,
          );
        };
        mat.needsUpdate = true;
      });
    });

    return {
      centeredScene: cloned,
      fitScale: normalizedScale * scale,
      fragColor: pickedColor,
    };
  }, [scene, scale]);

  const triggerShatter = () => {
    const worldOrigin = uniformsRef.current.uPressPoint.value.clone();
    fragsRef.current = makeFragments(worldOrigin);
    setPhase('shattered');
    pressTimeRef.current = 0;
    setTimeout(() => {
      uniformsRef.current.uPressStrength.value = 0;
      setPressed(false);
      setPhase('idle');
    }, RESET_DELAY_MS);
  };

  useFrame((_, delta) => {
    if (phase === 'idle') {
      const sq = squashRef.current;
      if (sq) {
        const target = pressed ? PRESSED_SCALE : REST_SCALE;
        const t = 1 - Math.exp(-SCALE_LERP * delta);
        sq.scale.lerp(target, t);
      }
      const strength = uniformsRef.current.uPressStrength;
      const targetStrength = pressed ? PRESS_STRENGTH_MAX : 0;
      const tt = 1 - Math.exp(-STRENGTH_LERP * delta);
      strength.value += (targetStrength - strength.value) * tt;

      if (pressed) {
        pressTimeRef.current += delta;
        if (pressTimeRef.current >= SHATTER_HOLD) {
          triggerShatter();
        }
      } else if (pressTimeRef.current > 0) {
        pressTimeRef.current = Math.max(0, pressTimeRef.current - delta * 2);
      }
      return;
    }

    const inst = fragMeshRef.current;
    if (!inst) return;
    const frags = fragsRef.current;
    for (let i = 0; i < frags.length; i++) {
      const f = frags[i];
      f.vel.y += GRAVITY * delta;
      f.pos.addScaledVector(f.vel, delta);
      f.rot.x += f.angVel.x * delta;
      f.rot.y += f.angVel.y * delta;
      f.rot.z += f.angVel.z * delta;
      dummy.position.copy(f.pos);
      dummy.rotation.copy(f.rot);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  const handlePressIn = (e: ThreeEvent<PointerEvent>) => {
    if (phase !== 'idle') return;
    e.stopPropagation();
    uniformsRef.current.uPressPoint.value.copy(e.point);
    setPressed(true);
  };

  const handlePressOut = () => {
    setPressed(false);
  };

  return (
    <>
      <group ref={groupRef} scale={fitScale}>
        {phase === 'idle' && (
          <group
            ref={squashRef}
            onPointerDown={handlePressIn}
            onPointerUp={handlePressOut}
            onPointerLeave={handlePressOut}
            onPointerCancel={handlePressOut}
          >
            <primitive object={centeredScene} />
          </group>
        )}
      </group>
      {phase === 'shattered' && (
        <instancedMesh
          ref={fragMeshRef}
          args={[undefined, undefined, FRAG_COUNT]}
        >
          <tetrahedronGeometry args={[0.12]} />
          <meshStandardMaterial color={fragColor} roughness={0.6} />
        </instancedMesh>
      )}
    </>
  );
};

useGLTF.preload(wakppuGlb as unknown as string);
