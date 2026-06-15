import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCounterStore } from '@/store/use-counter-store';

export default function HomeScreen() {
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 items-center justify-center gap-6 px-6">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">왁뿌볼</Text>

        <Text className="text-5xl font-bold text-gray-900 dark:text-white">{count}</Text>

        <View className="flex-row gap-3">
          <Pressable
            accessibilityLabel="감소"
            accessibilityRole="button"
            className="rounded-lg bg-gray-200 px-5 py-3 active:opacity-70 dark:bg-gray-800"
            onPress={decrement}
          >
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">−</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="증가"
            accessibilityRole="button"
            className="rounded-lg bg-blue-500 px-5 py-3 active:opacity-70"
            onPress={increment}
          >
            <Text className="text-lg font-semibold text-white">+</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityLabel="초기화"
          accessibilityRole="button"
          className="rounded-lg border border-gray-300 px-4 py-2 active:opacity-70 dark:border-gray-600"
          onPress={reset}
        >
          <Text className="text-sm text-gray-600 dark:text-gray-300">초기화</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
