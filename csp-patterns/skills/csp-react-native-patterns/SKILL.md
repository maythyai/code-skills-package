---
name: csp-react-native-patterns
description: >
  React Native patterns covering navigation (React Navigation, Expo Router), state management
  (Zustand, Jotai, Redux Toolkit), native module bridging (TurboModules, JSI), performance
  (Hermes, FlashList, Reanimated), OTA updates, testing, new architecture (Fabric, TurboModules),
  and Expo vs bare workflow decisions. Use for React Native project architecture and implementation.
metadata:
  origin: CSP
---

# React Native Patterns

Comprehensive patterns and best practices for React Native development. Covers navigation, state management, native modules, performance optimization, OTA updates, testing, and the transition to the New Architecture (Fabric + TurboModules).

## When to Activate

- Starting a new React Native project or choosing between Expo and bare workflow
- Implementing navigation patterns in a React Native app
- Setting up state management for a React Native codebase
- Building or integrating native modules
- Optimizing React Native app performance
- Migrating to the New Architecture (Fabric + TurboModules)
- Setting up testing infrastructure for React Native
- Configuring OTA updates and deployment pipelines

**When NOT to activate:**
- Pure web React projects (use `csp-react-patterns` instead)
- Flutter projects (use Flutter-specific skills)
- Native-only iOS or Android development
- React Native projects under 100 lines with no complexity concerns

## Core Principles

### 1. Platform Awareness First

React Native is not "write once, run everywhere" — it is "learn once, write everywhere." Always consider platform differences.

```typescript
import { Platform, StyleSheet } from 'react-native';

// Use Platform.select for divergent behavior
const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.select({ ios: 44, android: 24 }),
    // Safe area on iOS, status bar on Android
  },
});

// Use platform-specific files for entirely different implementations
// DatePicker.ios.tsx — uses @react-native-community/datetimepicker
// DatePicker.android.tsx — uses native dialog
// DatePicker.tsx — web fallback
```

### 2. Prefer Expo Unless You Have a Specific Reason Not To

Expo's managed workflow handles native complexity so you can focus on your app. Go bare only when you need:
- Custom native modules not available as Expo packages
- Full control over native build configuration
- Integration with proprietary SDKs requiring native code

## Expo vs Bare Workflow

### Decision Matrix

| Factor | Expo (Managed) | Bare Workflow |
|--------|---------------|---------------|
| Setup time | Minutes | Hours to days |
| Native modules | Via config plugins + EAS | Full control |
| OTA updates | Expo Updates built-in | CodePush or custom |
| Build system | EAS Build (cloud) | Local Xcode/Gradle |
| App size | Slightly larger (Expo runtime) | Minimal |
| Custom native code | Via config plugins | Direct |
| Recommended for | Most apps, MVPs, startups | Enterprise, heavy native integration |

### Expo with Custom Native Code (Modern Approach)

```json
// app.json — use config plugins instead of ejecting
{
  "expo": {
    "name": "MyApp",
    "plugins": [
      ["expo-camera", { "cameraPermission": "Allow camera access" }],
      ["./plugins/with-custom-native-module", { "apiKey": "xxx" }]
    ]
  }
}
```

```javascript
// plugins/with-custom-native-module.js
const { withPlugins, withInfoPlist, withProjectBuildGradle } = require('expo/config-plugins');

function withCustomNativeModule(config, { apiKey }) {
  // Modify iOS Info.plist
  config = withInfoPlist(config, (config) => {
    config.modResults.NSMyAPIKey = apiKey;
    return config;
  });

  // Modify Android build.gradle
  config = withProjectBuildGradle(config, (config) => {
    config.modResults.contents += `\n// Custom native module config`;
    return config;
  });

  return config;
}

module.exports = (config, options) => withPlugins(config, [
  [withCustomNativeModule, options],
]);
```

## Navigation

### React Navigation (Most Common)

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Define types for type safety
type RootStackParamList = {
  MainTabs: undefined;
  ProductDetail: { productId: string };
  Settings: undefined;
};

type MainTabParamList = {
  Home: undefined;
  Search: { query?: string };
  Profile: { userId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetailScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Expo Router (File-Based Routing)

```typescript
// app/_layout.tsx — root layout
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

// app/(tabs)/_layout.tsx — tab layout
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

// app/(tabs)/index.tsx — home screen
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <View>
      <Link href="/product/123">View Product</Link>
    </View>
  );
}
```

## State Management

### Zustand (Recommended for Most Apps)

Lightweight, no boilerplate, works great with React Native.

```typescript
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => set((state) => ({
        items: [...state.items, item],
      })),
      removeItem: (itemId) => set((state) => ({
        items: state.items.filter((i) => i.id !== itemId),
      })),
      clearCart: () => set({ items: [] }),
      total: () => get().items.reduce((sum, item) => sum + item.price * item.qty, 0),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

### Jotai (Atomic State)

```typescript
import { atom, useAtom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Persisted atom
const userAtom = atomWithStorage<User | null>(
  'user',
  null,
  createJSONStorage(() => AsyncStorage),
);

// Derived atom
const isLoggedInAtom = atom((get) => get(userAtom) !== null);

// Async atom for data fetching
const productsAtom = atom(async () => {
  const response = await fetch('/api/products');
  return response.json() as Promise<Product[]>;
});

function ProductList() {
  const [products] = useAtom(productsAtom);
  // Re-renders only when products change
}
```

### Redux Toolkit (Large Apps with Complex State)

```typescript
import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk with error handling
export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.getProducts();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [] as Product[],
    status: 'idle' as 'idle' | 'loading' | 'succeeded' | 'failed',
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      });
  },
});

export const store = configureStore({
  reducer: {
    products: productsSlice.reducer,
  },
});
```

## Native Module Bridging

### TurboModules (New Architecture)

```typescript
// src/specs/NativeBiometric.ts — TypeScript spec
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  authenticate(reason: string): Promise<boolean>;
  isAvailable(): boolean;
  // Use codegen-compatible types only
  getEnrolledBiometrics(): Array<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Biometric');
```

```java
// android/app/src/.../BiometricModule.java
package com.myapp.modules;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;
import com.myapp.modules.NativeBiometricSpec;

@ReactModule(name = BiometricModule.NAME)
public class BiometricModule extends NativeBiometricSpec {
  public static final String NAME = "Biometric";

  public BiometricModule(ReactApplicationContext context) {
    super(context);
  }

  @Override
  public String getName() { return NAME; }

  @Override
  public boolean isAvailable() {
    BiometricManager manager = BiometricManager.from(getReactApplicationContext());
    return manager.canAuthenticate(BIOMETRIC_STRONG) == BIOMETRIC_SUCCESS;
  }

  @Override
  public void authenticate(String reason, Promise promise) {
    // Implementation using AndroidX Biometric
  }
}
```

```swift
// ios/BiometricModule.swift
import Foundation
import LocalAuthentication

@objc(BiometricModule)
class BiometricModule: NSObject {
  @objc
  func authenticate(_ reason: String, resolve: @escaping RCTPromiseResolveBlock,
                    reject: @escaping RCTPromiseRejectBlock) {
    let context = LAContext()
    context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                          localizedReason: reason) { success, error in
      if success {
        resolve(true)
      } else {
        reject("AUTH_FAILED", error?.localizedDescription, error)
      }
    }
  }
}
```

### JSI (JavaScript Interface) — Direct C++ Access

For maximum performance when the bridge is a bottleneck:

```cpp
// cpp/MyJsiModule.h
#pragma once
#include <jsi/jsi.h>

namespace myapp {
  void install(facebook::jsi::Runtime& runtime) {
    auto heavyCompute = facebook::jsi::Function::createFromHostFunction(
      runtime,
      facebook::jsi::PropNameID::forAscii(runtime, "heavyCompute"),
      1, // argCount
      [](facebook::jsi::Runtime& rt,
         const facebook::jsi::Value& thisVal,
         const facebook::jsi::Value* args,
         size_t count) -> facebook::jsi::Value {
        // Direct C++ execution — no bridge serialization
        double input = args[0].asNumber();
        double result = performHeavyComputation(input);
        return facebook::jsi::Value(result);
      }
    );
    runtime.global().setProperty(runtime, "heavyCompute", std::move(heavyCompute));
  }
}
```

## Performance Optimization

### Hermes Engine

Enable Hermes for faster startup and lower memory usage:

```json
// android/app/build.gradle
project.ext.react = [
    enableHermes: true
]

// ios/Podfile
:hermes_enabled => true
```

### FlashList (Replaces FlatList)

```typescript
import { FlashList } from '@shopify/flash-list';

function ProductList({ products }: { products: Product[] }) {
  // estimatedItemSize is REQUIRED — measure one item and use its height
  return (
    <FlashList
      data={products}
      renderItem={({ item }) => <ProductCard product={item} />}
      estimatedItemSize={120}
      keyExtractor={(item) => item.id}
      // Override item layout for custom spacing
      overrideItemLayout={(layout, item) => {
        layout.size = item.isFeatured ? 200 : 120;
      }}
    />
  );
}
```

### Reanimated 3 + Gesture Handler

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

function SwipeableCard() {
  const translateX = useSharedValue(0);

  const panGesture = useMemo(() => Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 100) {
        translateX.value = withSpring(event.translationX > 0 ? 500 : -500);
      } else {
        translateX.value = withSpring(0);
      }
    }), [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Card />
      </Animated.View>
    </GestureDetector>
  );
}
```

### Performance Checklist

| Area | Action | Impact |
|------|--------|--------|
| **Startup** | Enable Hermes, lazy-load screens | 30-50% faster cold start |
| **Lists** | Use FlashList instead of FlatList | 5-10x scroll performance |
| **Animations** | Use Reanimated (runs on UI thread) | 60fps guaranteed |
| **Images** | Use expo-image or react-native-fast-image | Memory-efficient caching |
| **Bundle** | Tree-shake, remove unused deps | Smaller download + parse |
| **Memory** | Avoid inline functions in render | Reduce GC pressure |
| **Network** | Batch requests, use react-query | Fewer round trips |

## OTA Updates

### Expo Updates

```json
// app.json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/YOUR_PROJECT_ID"
    }
  }
}
```

```typescript
import * as Updates from 'expo-updates';

async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      // Notify user and reload
      Alert.alert('Update available', 'Restart to apply', [
        { text: 'Later' },
        { text: 'Restart', onPress: () => Updates.reloadAsync() },
      ]);
    }
  } catch (error) {
    // Handle update check failure gracefully
    console.warn('Update check failed:', error);
  }
}
```

### CodePush (Bare Workflow)

```typescript
import codePush from 'react-native-code-push';

const codePushOptions: codePush.CodePushOptions = {
  checkFrequency: codePush.CheckFrequency.ON_APP_RESUME,
  installMode: codePush.InstallMode.ON_NEXT_RESUME,
  minimumBackgroundDuration: 300, // 5 minutes
};

function App() {
  return <MainApp />;
}

export default codePush(codePushOptions)(App);
```

## Testing

### React Native Testing Library

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProductList } from './ProductList';

describe('ProductList', () => {
  it('displays products when loaded', async () => {
    const mockProducts = [
      { id: '1', name: 'Widget', price: 9.99 },
    ];
    jest.spyOn(api, 'getProducts').mockResolvedValue(mockProducts);

    const { getByText, queryByText } = render(<ProductList />);

    // Loading state
    expect(queryByText('Widget')).toBeNull();

    // Loaded state
    await waitFor(() => {
      expect(getByText('Widget')).toBeTruthy();
      expect(getByText('$9.99')).toBeTruthy();
    });
  });

  it('handles error state', async () => {
    jest.spyOn(api, 'getProducts').mockRejectedValue(new Error('Network'));

    const { getByText } = render(<ProductList />);

    await waitFor(() => {
      expect(getByText(/something went wrong/i)).toBeTruthy();
    });
  });
});
```

### Detox (E2E Testing)

```typescript
// e2e/checkout.test.ts
describe('Checkout Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete checkout', async () => {
    await element(by.id('product-widget')).tap();
    await element(by.id('add-to-cart')).tap();
    await element(by.id('go-to-cart')).tap();
    await expect(element(by.id('cart-item-widget'))).toBeVisible();
    await element(by.id('checkout-button')).tap();
    await expect(element(by.text('Order confirmed'))).toBeVisible();
  });
});
```

## New Architecture Migration

### Migration Checklist

1. **Enable New Architecture flags** in `gradle.properties` and `Podfile`
2. **Update React Native** to 0.72+ (ideally latest stable)
3. **Migrate native modules** to TurboModule spec format
4. **Migrate view managers** to Fabric component spec
5. **Test with both architectures** during transition
6. **Update third-party dependencies** that have native code

```ruby
# ios/Podfile
install! 'cocoapods', :deterministic_uuids => false

target 'MyApp' do
  use_react_native!(
    :fabric_enabled => true,
    :hermes_enabled => true,
  )
end
```

```properties
# android/gradle.properties
newArchEnabled=true
hermesEnabled=true
```

## Related Skills

- `csp-mobile-performance` — Deep dive into mobile performance optimization
- `csp-cross-platform-strategy` — Choosing the right cross-platform approach
- `csp-react-patterns` — Web React patterns (shared concepts)
- `csp-flutter-patterns` — Flutter alternative patterns
- `csp-react-native-build-resolver` — Fix React Native build errors
