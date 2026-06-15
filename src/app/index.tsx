import { Canvas } from '@react-three/fiber/native';
import { Suspense } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WakppuModel } from '@/components/wakppu-model';
import { PAINT_COLORS, useClayStore } from '@/store/use-clay-store';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const reset = useClayStore((s) => s.reset);
  const toggleWireframe = useClayStore((s) => s.toggleWireframe);
  const toggleShapeKey = useClayStore((s) => s.toggleShapeKey);
  const setSelectedColor = useClayStore((s) => s.setSelectedColor);
  const wireframe = useClayStore((s) => s.wireframe);
  const shapeKeyActive = useClayStore((s) => s.shapeKeyActive);
  const selectedColor = useClayStore((s) => s.selectedColor);
  const meshInfo = useClayStore((s) => s.meshInfo);
  const hit = useClayStore((s) => s.hit);
  const status = useClayStore((s) => s.status);

  return (
    <View className="flex-1 bg-neutral-100">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        frameloop="always"
        gl={{ antialias: true }}
        style={{ flex: 1 }}
      >
        <color attach="background" args={['#f5f5f5']} />
        <ambientLight intensity={0.7} />
        <directionalLight intensity={1.2} position={[4, 6, 3]} />
        <Suspense fallback={null}>
          <WakppuModel scale={0.6} />
        </Suspense>
      </Canvas>

      <View
        style={{ top: insets.top + 8, left: 16 }}
        className="absolute bg-black/60 rounded-lg p-3"
      >
        <Text className="text-yellow-300 text-xs">Status: {status}</Text>
        <Text className="text-white text-xs">
          Vertex: {meshInfo?.vertexCount ?? '-'}
        </Text>
        <Text className="text-white text-xs">
          Triangles: {meshInfo?.triangleCount ?? '-'}
        </Text>
        <Text className="text-white text-xs">
          UV: {meshInfo?.hasUv ? 'true' : 'false'} | Color:{' '}
          {meshInfo?.hasColor ? 'true' : 'false'}
        </Text>
        <Text className="text-white text-xs">
          Morph: {meshInfo?.morphTargets.join(', ') || 'none'}
        </Text>
        <Text className="text-white text-xs">
          {hit
            ? `Hit: ${hit.x.toFixed(2)} / ${hit.y.toFixed(2)} / ${hit.z.toFixed(2)}`
            : 'Hit: -'}
        </Text>
      </View>

      <View
        style={{ top: insets.top + 8, right: 16 }}
        className="absolute flex-row gap-2"
      >
        {PAINT_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setSelectedColor(c)}
            style={{ backgroundColor: c }}
            className={`w-10 h-10 rounded-full border-2 ${
              selectedColor === c ? 'border-black' : 'border-white'
            }`}
          />
        ))}
      </View>

      <View
        style={{ bottom: insets.bottom + 16 }}
        className="absolute left-0 right-0 flex-row justify-center flex-wrap gap-2 px-4"
      >
        <Pressable
          onPress={reset}
          className="bg-neutral-800 rounded-lg px-4 py-3"
        >
          <Text className="text-white font-semibold">Reset</Text>
        </Pressable>
        <Pressable
          onPress={toggleWireframe}
          className="bg-neutral-800 rounded-lg px-4 py-3"
        >
          <Text className="text-white font-semibold">
            Wire: {wireframe ? 'ON' : 'OFF'}
          </Text>
        </Pressable>
        <Pressable
          onPress={toggleShapeKey}
          className={`rounded-lg px-4 py-3 ${
            shapeKeyActive ? 'bg-blue-600' : 'bg-neutral-800'
          }`}
        >
          <Text className="text-white font-semibold">
            ShapeKey: {shapeKeyActive ? 'ON' : 'OFF'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
