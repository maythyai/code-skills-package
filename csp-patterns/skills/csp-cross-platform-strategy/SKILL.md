---
name: csp-cross-platform-strategy
description: >
  Cross-platform development strategy covering platform selection (React Native vs Flutter
  vs Native vs KMP vs MAUI), code sharing strategies, platform adaptation, testing across
  platforms, CI/CD for multi-platform, app store considerations, and when to go native.
  Use when making cross-platform architecture decisions or evaluating technology choices.
metadata:
  origin: CSP
layer: 4
category: patterns
-----------|----------|------------|---------|------------|
| **React Native** | JavaScript/TypeScript | Native components via bridge | Apps with web team, complex native integrations | Web/JS developers |
| **Flutter** | Dart | Custom rendering (Skia/Impeller) | Pixel-perfect cross-platform UI, animations | New to Dart OK |
| **KMP (Kotlin Multiplatform)** | Kotlin | Platform-native UI (Compose Multiplatform optional) | Shared business logic, native UI | Android/Kotlin developers |
| **Native (Swift/Kotlin)** | Swift, Kotlin | Platform-native | Maximum performance, platform-specific features | Platform specialists |
| **.NET MAUI** | C# | Native controls | Enterprise apps, .NET ecosystem | C#/.NET developers |
| **Ionic/Capacitor** | JavaScript/TypeScript | Web views | Content-heavy apps, rapid prototyping | Web developers |

### Decision Framework

```
Step 1: Do you NEED cross-platform?
├── One platform only → Go Native
├── iOS + Android → Continue
└── iOS + Android + Web + Desktop → Strong candidate for cross-platform

Step 2: What are your constraints?
├── Heavy AR/VR, GPU-intensive, custom hardware → Go Native
├── Web team, existing React codebase → React Native
├── Pixel-perfect design across platforms → Flutter
├── Want native UI, shared logic → KMP
├── Enterprise .NET shop → MAUI
└── Content-heavy, rapid MVP → Ionic/Capacitor

Step 3: What is your team composition?
├── Mostly web developers → React Native or Flutter
├── Mostly Android developers → KMP
├── Mostly iOS developers → Native or React Native (Swift → JS is easier)
├── Balanced native teams → KMP (share logic, keep native UI)
└── Mixed/native + web → React Native
```

### Detailed Comparison

**React Native**

| Strengths | Weaknesses |
|-----------|-----------|
| Large ecosystem, huge community | Bridge overhead for complex animations |
| Code sharing with React web | Native module maintenance burden |
| Hot reload, fast iteration | Version upgrade pain (especially native) |
| Existing JS/TS team can contribute | Platform-specific debugging required |
| Expo simplifies native complexity | Some native APIs lag behind |

**Flutter**

| Strengths | Weaknesses |
|-----------|-----------|
| Consistent UI across platforms | Larger app bundle size (~10-15MB base) |
| Excellent animation performance | Dart is less common (hiring difficulty) |
| Single codebase, single rendering | Platform-specific UI adaptation is manual |
| Strong testing framework | Limited web/desktop maturity vs mobile |
| Impeller improves iOS rendering | Native platform integration less mature |

**KMP (Kotlin Multiplatform)**

| Strengths | Weaknesses |
|-----------|-----------|
| 100% native UI on each platform | Smaller community than RN/Flutter |
| Share business logic only | iOS developers need Kotlin knowledge |
| Kotlin is a modern, loved language | Compose Multiplatform still maturing |
| Incremental adoption (start with shared module) | Tooling for iOS side less polished |
| JetBrains backing | Fewer third-party libraries |

**Native (Swift + Kotlin)**

| Strengths | Weaknesses |
|-----------|-----------|
| Best performance and platform integration | 2x development effort for shared features |
| First access to new platform APIs | 2x maintenance cost |
| Best developer tools per platform | Knowledge silos between teams |
| No abstraction overhead | Inconsistent business logic across platforms |
| Smallest app size | Difficult to keep parity |

## Code Sharing Strategies

### Strategy 1: Shared Everything (Flutter Model)

```
┌─────────────────────────────┐
│     Shared UI + Logic       │  ← 95%+ shared code
│     (Flutter widgets)       │
├─────────────────────────────┤
│   Platform channels         │  ← 5% platform-specific
│   (native integration)      │
└─────────────────────────────┘
```

**When to use:** You want identical UI on all platforms. Design system is app-specific (not following HIG/Material).

**Trade-off:** Fastest development but least native feel.

### Strategy 2: Shared Logic, Native UI (KMP Model)

```
┌─────────────┐ ┌─────────────┐
│  iOS UI     │ │ Android UI  │  ← Platform-native UI
│  (SwiftUI)  │ │ (Compose)   │
├─────────────┴─┴─────────────┤
│     Shared Business Logic   │  ← 40-60% shared
│     (Kotlin commonMain)     │
├─────────────────────────────┤
│     Shared Data Layer       │  ← 80-90% shared
│     (network, DB, models)   │
└─────────────────────────────┘
```

**When to use:** You want native UI feel but consistent business logic. Teams include platform specialists.

**Trade-off:** More development effort for UI but best user experience.

### Strategy 3: Shared Components (React Native Model)

```
┌─────────────────────────────┐
│     Shared Components       │  ← 70-85% shared
│     (React Native)          │
├─────────────┬───────────────┤
│ iOS-specific│ Android-spec  │  ← 15-30% platform code
│ (.ios.tsx)  │ (.android.tsx)│
├─────────────┴───────────────┤
│     Native Modules          │  ← Platform bridges
└─────────────────────────────┘
```

**When to use:** You have a web/JS team and want to share code with React web.

**Trade-off:** Good balance of code sharing and platform adaptation.

### Strategy 4: Shared Business Logic Only (Library Approach)

```
┌─────────────────────────────────────┐
│  App A (iOS)  │  App B (Android)   │  ← Fully native apps
├───────────────┴─────────────────────┤
│        Shared Library               │  ← Core logic as npm/pod/gradle dep
│   (TypeScript/Kotlin/Swift module)  │
└─────────────────────────────────────┘
```

**When to use:** Different apps need the same core logic (e.g., pricing engine, auth SDK).

**Trade-off:** Maximum platform freedom but requires maintaining a separate library.

## Platform Adaptation Patterns

### Adaptive Layouts

```typescript
// React Native — Platform-specific layouts
import { useWindowDimensions, Platform } from 'react-native';

function AppLayout({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  if (isTablet) {
    return <SplitView>{children}</SplitView>;
  }
  return <StackView>{children}</StackView>;
}

// Platform-specific navigation patterns
function AppNavigator() {
  return Platform.select({
    ios: <TabNavigator />,      // Bottom tabs on iOS
    android: <DrawerNavigator />, // Drawer on Android (for complex apps)
    default: <TabNavigator />,
  });
}
```

### Platform Convention Adapters

```typescript
// Abstract platform conventions behind adapters
interface PlatformAdapter {
  get backButtonBehavior(): 'pop' | 'dismiss' | 'none';
  get defaultAnimation(): 'slide' | 'fade' | 'none';
  get statusBarStyle(): 'light' | 'dark';
  get pullToRefreshEnabled(): boolean;
  get hapticFeedbackType(): 'impact' | 'notification' | 'selection';
}

const iOSAdapter: PlatformAdapter = {
  backButtonBehavior: 'pop',
  defaultAnimation: 'slide',
  statusBarStyle: 'dark',
  pullToRefreshEnabled: true,
  hapticFeedbackType: 'impact',
};

const androidAdapter: PlatformAdapter = {
  backButtonBehavior: 'dismiss',
  defaultAnimation: 'fade',
  statusBarStyle: 'light',
  pullToRefreshEnabled: true,
  hapticFeedbackType: 'notification',
};

export const platform = Platform.select({
  ios: iOSAdapter,
  android: androidAdapter,
  default: iOSAdapter,
})!;
```

### Design System Adaptation

```typescript
// Design tokens that adapt to platform
const designTokens = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    ios: 12,     // Rounded on iOS
    android: 4,  // Subtle on Android (Material Design)
  },
  typography: {
    ios: {
      fontFamily: 'System',           // San Francisco
      titleSize: 17,                  // iOS nav title
    },
    android: {
      fontFamily: 'Roboto',
      titleSize: 20,                  // Material headline
    },
  },
  elevation: {
    ios: { shadowOpacity: 0.15, shadowRadius: 8 },
    android: { elevation: 4 },        // Material elevation
  },
};

// Use platform-specific tokens
const styles = StyleSheet.create({
  card: {
    borderRadius: designTokens.borderRadius[Platform.OS],
    ...Platform.select({
      ios: designTokens.elevation.ios,
      android: designTokens.elevation.android,
    }),
  },
});
```

## Testing Across Platforms

### Test Strategy Matrix

| Test Type | Shared | Platform-Specific |
|-----------|--------|-------------------|
| Unit tests (business logic) | 100% shared | N/A |
| Integration tests (API, DB) | 95% shared | Platform-specific edge cases |
| UI tests | Write per platform | 100% platform-specific |
| E2E tests | Shared scenarios | Platform-specific flows |
| Visual regression | Per platform | Different baselines |

### Platform-Specific Test Setup

```typescript
// React Native — Platform-aware test utilities
import { Platform } from 'react-native';

// Run platform-specific tests
const testFile = Platform.OS === 'ios'
  ? require('./__tests__/ios-specific.test')
  : require('./__tests__/android-specific.test');

// Shared tests with platform-specific assertions
describe('Navigation', () => {
  it('handles back gesture correctly', () => {
    if (Platform.OS === 'ios') {
      // Test swipe-back gesture
      expect(swipeBackHandler).toBeDefined();
    } else {
      // Test hardware back button
      expect(BackHandler.listeners.length).toBeGreaterThan(0);
    }
  });
});
```

```yaml
# CI matrix for multi-platform testing
# .github/workflows/test.yml
jobs:
  test-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd ios && xcodebuild test -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15'

  test-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: cd android && ./gradlew connectedAndroidTest
```

## CI/CD for Multi-Platform

### Build Pipeline Architecture

```
                    ┌─────────────┐
                    │   Source    │
                    │   Code      │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
       │  Unit Tests  │ │  Lint   │ │ Type Check  │
       │  (shared)    │ │         │ │             │
       └──────┬──────┘ └──┬──────┘ └──┬──────────┘
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │  iOS Build   │          │ Android Build│
       │  (Xcode)     │          │ (Gradle)     │
       └──────┬──────┘          └──────┬──────┘
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │  iOS E2E     │          │ Android E2E  │
       │  Tests       │          │ Tests        │
       └──────┬──────┘          └──────┬──────┘
              │                         │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │  Deploy     │
                    │  TestFlight │
                    │  Play Store │
                    └─────────────┘
```

### EAS Build (Expo)

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" }
    },
    "production": {
      "ios": { "autoIncrement": true },
      "android": { "autoIncrement": true }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "team@company.com", "ascAppId": "123456" },
      "android": { "serviceAccountKeyPath": "./google-services.json" }
    }
  }
}
```

## App Store Considerations

### Size Limits and Optimization

| Store | Max APK/AAB | Max iOS IPA | Recommendation |
|-------|-----------|------------|----------------|
| Google Play | 150MB (AAB) | N/A | Use App Bundle |
| Apple App Store | N/A | 4GB | Under 200MB for cellular download |

### Review Guidelines Compliance

| Concern | iOS (Apple) | Android (Google) |
|---------|------------|-----------------|
| In-app purchases | Required for digital goods (30% cut) | Required for digital goods (15-30%) |
| External links | Restricted (no external payment links) | More lenient |
| Privacy | App Tracking Transparency required | Data safety form required |
| Content | Strict review (1-3 days) | Automated + manual (hours to days) |
| Updates | Review required (1-2 days) | Immediate for most updates |

### OTA Update Compatibility

| Platform | Allowed | Restrictions |
|----------|---------|-------------|
| iOS | JavaScript/bundle changes only | Cannot change native code or Info.plist |
| Android | JavaScript/bundle changes only | Cannot change AndroidManifest or native code |

## When to Go Native

Go native when your app requires:

| Requirement | Why Native |
|-------------|-----------|
| AR/VR experiences | ARKit/ARCore need direct native access |
| Custom GPU rendering | Metal/Vulkan for maximum performance |
| Hardware integration | Custom BLE, NFC, camera hardware |
| Watch/TV companion apps | watchOS/tvOS require native |
| Widgets and app extensions | Platform-specific extension APIs |
| Accessibility-first apps | Deepest platform accessibility APIs |
| Platform showcase apps | Apple/Google feature apps using latest APIs |

### Hybrid Approach: Cross-Platform Shell + Native Modules

```
┌─────────────────────────────┐
│   Cross-Platform Shell      │  ← 80% of the app
│   (React Native / Flutter)  │
├─────────────────────────────┤
│   Native Module: AR View    │  ← Swift / Kotlin
│   Native Module: Custom GPU │  ← Metal / Vulkan
│   Native Module: BLE Device │  ← CoreBluetooth / BLE API
└─────────────────────────────┘
```

This gives you 80% code sharing with 20% native performance where it matters.

## Team Structure Implications

### Team Models

**Model A: Unified Cross-Platform Team**
- One team owns all platforms
- Best for: React Native, Flutter
- Risk: Team may neglect platform-specific quality

**Model B: Shared Core + Platform Specialists**
- Shared team owns business logic; platform experts own UI
- Best for: KMP, shared library approach
- Risk: Coordination overhead between teams

**Model C: Platform Teams with Shared Standards**
- Separate iOS and Android teams sharing architecture decisions
- Best for: Native development, large organizations
- Risk: Logic drift between platforms

### Recommended Team Structure

```
For small teams (3-6 engineers):
├── 2-4 cross-platform developers (React Native / Flutter)
├── 1 platform specialist (rotates, handles native modules)
└── Shared QA responsibility

For medium teams (7-15 engineers):
├── Core team (4-6): shared logic, infrastructure, tooling
├── iOS team (2-3): native UI, platform integration
├── Android team (2-3): native UI, platform integration
└── QA engineer (1-2): cross-platform testing

For large teams (15+ engineers):
├── Platform team (3-4): build systems, CI/CD, shared modules
├── Feature teams (2-3 per team): full-stack, cross-platform features
├── iOS specialists (2-3): native modules, Apple ecosystem
├── Android specialists (2-3): native modules, Google ecosystem
└── QA team (3-4): platform-specific and cross-platform testing
```

## Migration Path: Native to Cross-Platform

If migrating an existing native app to cross-platform:

1. **Audit** — Identify shared vs platform-specific code
2. **Start with shared logic** — Extract business logic into a shared module
3. **Brownfield integration** — Embed cross-platform views in native shell
4. **Screen-by-screen migration** — Rewrite screens one at a time
5. **Full migration** — Switch to cross-platform shell when ready

```swift
// iOS — Embed React Native view in existing native app
import React

class ExistingViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        let rnView = RCTRootView(
            bundleURL: RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index"),
            moduleName: "NewFeatureScreen",
            initialProperties: ["userId": currentUserId]
        )
        view.addSubview(rnView)
    }
}
```

## Evaluation Checklist

Before choosing a cross-platform approach:

- [ ] Product requirements mapped to platform capabilities
- [ ] Team skills and hiring market assessed
- [ ] Performance requirements benchmarked against framework capabilities
- [ ] Platform-specific features identified (AR, widgets, extensions)
- [ ] Code sharing strategy defined (what is shared, what is native)
- [ ] CI/CD pipeline designed for multi-platform builds
- [ ] App store compliance reviewed for target platforms
- [ ] Migration/exit strategy considered (what if we need to go native later?)
- [ ] Total cost of ownership estimated (development + maintenance + platform specialists)
- [ ] Prototype built on candidate framework to validate key assumptions

## Related Skills

- `csp-react-native-patterns` — React Native implementation patterns
- `csp-mobile-performance` — Cross-platform performance optimization
- `csp-flutter-patterns` — Flutter-specific patterns (if Flutter chosen)
- `csp-kotlin-patterns` — Kotlin patterns (if KMP chosen)
- `csp-swiftui-patterns` — SwiftUI patterns (if native iOS chosen)
