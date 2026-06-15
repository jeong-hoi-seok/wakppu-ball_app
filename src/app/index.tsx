import { Canvas } from "@react-three/fiber/native";
import { Suspense } from "react";
import { View } from "react-native";

import { WakppuModel } from "@/components/wakppu-model";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-neutral-100">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        frameloop="always"
        gl={{ antialias: true }}
        style={{ flex: 1 }}
      >
        <color attach="background" args={["#f5f5f5"]} />
        <ambientLight intensity={0.7} />
        <directionalLight intensity={1.2} position={[4, 6, 3]} />
        <Suspense fallback={null}>
          <WakppuModel scale={0.6} />
        </Suspense>
      </Canvas>
    </View>
  );
}
