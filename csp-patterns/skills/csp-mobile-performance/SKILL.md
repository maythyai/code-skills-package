---
name: csp-mobile-performance
description: >
  Mobile performance optimization covering startup optimization, memory management,
  list/scroll performance, bundle size, battery optimization, profiling tools, and
  frame rate optimization. Applicable to React Native, Flutter, and native iOS/Android
  development. Use when diagnosing or preventing mobile performance issues.
metadata:
  origin: CSP
layer: 4
category: patterns
------|-----------|--------|
| **Cold start** | App process not in memory; full initialization | < 500ms (iOS), < 1s (Android) |
| **Warm start** | App process in memory but backgrounded | < 200ms |
| **Hot start** | App already in foreground | Instant |

### Cold Start Optimization Strategies

**Phase 1: Defer Non-Critical Initialization**

```swift
// iOS — BAD: Everything in didFinishLaunching
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    setupAnalytics()      // 150ms
    setupPushNotifications() // 200ms
    setupCrashReporting()  // 100ms
    preloadImages()        // 300ms
    syncDatabase()         // 500ms
    return true            // Total: 1250ms before first frame
}

// iOS — GOOD: Only critical path in didFinishLaunching
func application(_ application: UIApplication,
                 didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    setupCrashReporting()  // 100ms — must be first to catch crashes
    return true            // Total: 100ms before first frame

    // Defer everything else
    DispatchQueue.global(qos: .utility).async { [weak self] in
        self?.setupAnalytics()
        self?.setupPushNotifications()
    }
}
```

```kotlin
// Android — BAD: Heavy work in Application.onCreate
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        initAnalytics()        // 200ms
        initCrashReporting()   // 150ms
        initImageLoader()      // 100ms
        preloadDatabase()      // 400ms
    }
}

// Android — GOOD: Use App Startup library with lazy init
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Only initialize what's needed for the first screen
        AppInitializer.getInstance(this)
            .initializeComponent(CrashReportingInitializer::class.java)
        // Analytics, ImageLoader, Database initialized on-demand
    }
}
```

**Phase 2: Optimize the Critical Path**

```
Critical path: Process start → Application init → First Activity/ViewController → First meaningful frame

Optimize each step:
1. Process start: Reduce dynamic library loading (iOS dlopen, Android System.loadLibrary)
2. Application init: Minimize work in onCreate/didFinishLaunching
3. First screen: Lazy-load non-visible content, use placeholder/skeleton screens
4. First meaningful frame: Pre-warm layout calculations, cache expensive computations
```

**Phase 3: Use Splash Screen Strategically**

```swift
// iOS — Launch screen is automatic; use it to set up the initial UI state
// Avoid custom splash screen views that add to startup time

// Android — Use SplashScreen API (Android 12+)
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        splashScreen.setKeepOnScreenCondition { !isDataReady }
        super.onCreate(savedInstanceState)
    }
}
```

### Startup Measurement

```bash
# iOS — Instruments Time Profiler
instruments -t "Time Profiler" -D startup.trace -w "iPhone 14" com.myapp

# Android — adb + display
adb shell am start -W -n com.myapp/.MainActivity
# Reports: WaitTime (total), ThisTime (activity), TotalTime

# Android — Displayed time in logcat
adb logcat | grep "Displayed"
# I/ActivityTaskManager: Displayed com.myapp/.MainActivity: +487ms
```

## Memory Management

### Image Memory Optimization

Images are the #1 memory consumer in most mobile apps.

```swift
// iOS — Downsample large images to display size
func downsample(imageAt url: URL, to pointSize: CGSize, scale: CGFloat) -> UIImage? {
    let imageSourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let imageSource = CGImageSourceCreateWithURL(url as CFURL, imageSourceOptions) else {
        return nil
    }

    let maxDimensionInPixels = max(pointSize.width, pointSize.height) * scale
    let downsampleOptions = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxDimensionInPixels,
    ] as CFDictionary

    guard let downsampledImage = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, downsampleOptions) else {
        return nil
    }
    return UIImage(cgImage: downsampledImage)
}
```

```kotlin
// Android — Use Coil for efficient image loading
val imageLoader = ImageLoader.Builder(context)
    .memoryCachePolicy(CachePolicy.ENABLED)
    .diskCachePolicy(CachePolicy.ENABLED)
    .crossfade(true)
    .build()

// Request with explicit size — avoids loading full resolution
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(imageUrl)
        .size(widthPx, heightPx)  // Downsample to display size
        .crossfade(true)
        .build(),
    imageLoader = imageLoader,
)
```

### Memory Leak Detection

```swift
// iOS — Use Instruments Leaks template
// Also use deinit logging in development
class ViewController: UIViewController {
    deinit {
        #if DEBUG
        print("✅ \(Self.self) deallocated")
        #endif
    }
}

// Common iOS leak patterns:
// 1. Strong delegate reference (use weak)
// 2. Closure capturing self (use [weak self])
// 3. Timer retaining target (use block-based timer)
// 4. Notification observer not removed (use NSObject protocol auto-remove in iOS 9+)
```

```kotlin
// Android — Use LeakCanary in debug builds
dependencies {
    debugImplementation("com.squareup.leakcanary:leakcanary-android:2.12")
}
// LeakCanary auto-installs — no code needed

// Common Android leak patterns:
// 1. Static references to Activity/Fragment
// 2. Anonymous inner class holding Activity reference
// 3. Handler with pending messages after Activity destroy
// 4. WebView not destroyed properly
```

### Memory Budget

| Component | iOS Budget | Android Budget |
|-----------|-----------|----------------|
| Total app memory | ~50% of device RAM | ~25% of device RAM |
| Image cache | 20-30% of app budget | 15-25% of app budget |
| Background memory | < 30MB to avoid termination | Varies by OEM |

## List and Scroll Performance

### Virtualization Is Non-Negotiable

Never render more items than are visible on screen.

```typescript
// React Native — Use FlashList
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  estimatedItemSize={80}  // REQUIRED: measure actual item height
  drawDistance={200}       // Pre-render 200px before visible area
/>

// Avoid: FlatList for large lists, ScrollView with mapped children
```

```swift
// iOS — UITableView/UICollectionView automatically virtualize
// Optimize cell reuse:
func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "ItemCell", for: indexPath) as! ItemCell
    cell.configure(with: items[indexPath.row])
    return cell
}

// Critical: Pre-calculate cell heights for smooth scrolling
// BAD: Calculate height in heightForRowAt (called for every cell)
// GOOD: Pre-calculate and cache heights
private var cachedHeights: [CGFloat] = []
```

```kotlin
// Android — RecyclerView with ViewHolder pattern
class ItemAdapter : ListAdapter<Item, ItemAdapter.ViewHolder>(ItemDiffCallback()) {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val title: TextView = view.findViewById(R.id.title)
        private val subtitle: TextView = view.findViewById(R.id.subtitle)

        fun bind(item: Item) {
            title.text = item.title
            subtitle.text = item.subtitle
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_layout, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }
}

// Use DiffUtil for efficient updates (ListAdapter handles this)
// Avoid: notifyDataSetChanged() — re-renders everything
```

### Prefetching Strategy

```typescript
// React Native — prefetch next page when nearing end
function useInfiniteList<T>(fetchPage: (page: number) => Promise<T[]>) {
  const [pages, setPages] = useState<T[][]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  const prefetchNextPage = useCallback(async () => {
    if (isFetching) return;
    setIsFetching(true);
    const nextPage = currentPage + 1;
    const newItems = await fetchPage(nextPage);
    setPages(prev => [...prev, newItems]);
    setCurrentPage(nextPage);
    setIsFetching(false);
  }, [currentPage, fetchPage, isFetching]);

  // Trigger prefetch when 5 items from end
  const onEndReached = useCallback(() => {
    prefetchNextPage();
  }, [prefetchNextPage]);

  return { items: pages.flat(), onEndReached };
}
```

## Bundle Size Optimization

### Analysis and Reduction

```bash
# React Native — Analyze bundle composition
npx react-native-bundle-visualizer

# iOS — App Thinning Size Report (from Xcode Organizer)
# Android — APK Analyzer (Android Studio)

# Common wins:
# 1. Remove unused dependencies
npx depcheck
# 2. Replace heavy dependencies with lighter alternatives
#    moment.js (230KB) → dayjs (2KB) or date-fns (tree-shakeable)
#    lodash (70KB) → lodash-es (tree-shakeable) or native methods
# 3. Enable ProGuard/R8 (Android)
# 4. Use App Thinning (iOS)
```

### Asset Optimization

```bash
# Images: Use WebP (30% smaller than PNG)
cwebp -q 80 input.png -o output.webp

# SVGs: Optimize with svgo
npx svgo --multipass icon.svg

# Fonts: Subset to used characters only
npx glyphhanger --formats=woff2 --subset font.ttf

# React Native: Use require() for images (enables bundler optimization)
// BAD
<Image source={{ uri: 'https://cdn.example.com/logo.png' }} />
// GOOD (bundled, cached, offline-available)
<Image source={require('./assets/logo.png')} />
```

### Code Splitting

```typescript
// React Native — Lazy load screens
import { lazy, Suspense } from 'react';

const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const AnalyticsScreen = lazy(() => import('./screens/AnalyticsScreen'));

function AppNavigator() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      </Stack.Navigator>
    </Suspense>
  );
}
```

## Battery Optimization

### Network Request Batching

```typescript
// BAD: Individual requests for each item
for (const item of items) {
  await api.updateItem(item.id, item.data); // N requests
}

// GOOD: Batch requests
await api.batchUpdate(items.map(item => ({
  id: item.id,
  data: item.data,
}))); // 1 request
```

### Background Task Optimization

```swift
// iOS — Use BGTaskScheduler for efficient background work
import BackgroundTasks

func scheduleBackgroundRefresh() {
    let request = BGAppRefreshTaskRequest(identifier: "com.myapp.refresh")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60) // 15 min minimum
    try? BGTaskScheduler.shared.submit(request)
}

// Register handler
BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.myapp.refresh",
                                using: nil) { task in
    self.handleBackgroundRefresh(task: task as! BGAppRefreshTask)
}
```

```kotlin
// Android — Use WorkManager for deferrable background work
val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
    15, TimeUnit.MINUTES  // Minimum interval
)
    .setConstraints(
        Constraints.Builder()
            .setRequiredNetworkType(NetworkType.UNMETERED) // WiFi only
            .setRequiresBatteryNotLow(true)
            .build()
    )
    .build()

WorkManager.getInstance(context).enqueueUniquePeriodicWork(
    "data-sync",
    ExistingPeriodicWorkPolicy.KEEP,
    syncRequest
)
```

### Location Optimization

```swift
// BAD: Continuous high-accuracy location
locationManager.desiredAccuracy = kCLLocationAccuracyBest
locationManager.startUpdatingLocation()

// GOOD: Significant location changes (low power)
locationManager.startMonitoringSignificantLocationChanges()

// GOOD: Region monitoring (zero power when not moving)
let region = CLCircularRegion(
    center: CLLocationCoordinate2D(latitude: 37.7749, longitude: -122.4194),
    radius: 100,
    identifier: "office"
)
locationManager.startMonitoring(for: region)
```

## Profiling Tools

### iOS Instruments

| Template | Use Case | Key Metrics |
|----------|---------|-------------|
| Time Profiler | CPU hot spots | Call tree, time per function |
| Allocations | Memory usage | Heap growth, persistent/transient |
| Leaks | Memory leaks | Leaked objects, reference cycles |
| Core Animation | Frame drops | FPS, offscreen rendering, blending |
| Network | Network performance | Request timing, bytes transferred |
| Energy Log | Battery impact | CPU, network, location, display usage |

### Android Profiler

| Profiler | Use Case | Key Metrics |
|----------|---------|-------------|
| CPU Profiler | CPU hot spots | Flame chart, call tree |
| Memory Profiler | Memory usage | Heap dump, allocation tracking |
| Network Profiler | Network performance | Request/response timing, payload size |
| Energy Profiler | Battery impact | CPU, network, sensor, wake lock usage |

### Flipper (React Native)

```typescript
// Install Flipper plugins for React Native debugging
// - React DevTools: Component tree, props, state
// - Network: Request/response inspection
// - Layout: Visual layout inspector
// - Hermes Debugger: JavaScript debugging
// - Performance: Frame timing, JS thread utilization
```

## Frame Rate Optimization

### The 16ms Budget

At 60fps, each frame has 16.67ms. At 120fps, 8.33ms.

```
Frame budget breakdown (60fps):
├── Input handling:    ~1ms
├── JavaScript logic:  ~3ms  (React Native: JS thread)
├── Layout:            ~2ms
├── Render/Paint:      ~3ms
├── GPU compositing:   ~3ms
└── Headroom:          ~4ms  (safety margin)
```

### Reducing Main Thread Work

```swift
// iOS — Move heavy work off main thread
DispatchQueue.global(qos: .userInitiated).async {
    let processedData = heavyComputation(rawData)
    DispatchQueue.main.async {
        self.updateUI(with: processedData)
    }
}

// Avoid main thread work:
// - Image decoding (use pre-downsampled images)
// - JSON parsing (use background queue)
// - Database queries (use background context)
// - File I/O (always async)
```

### Overdraw Reduction

```kotlin
// Android — Detect overdraw with GPU rendering profile bars
// Settings → Developer Options → Profile GPU rendering → Show as bars

// Reduce overdraw:
// 1. Remove default window background if using full-bleed content
window.setBackgroundDrawable(null)

// 2. Avoid nested backgrounds
// BAD: Each layer adds overdraw
<FrameLayout android:background="@color/white">
    <CardView android:background="@color/white">
        <LinearLayout android:background="@color/white">

// GOOD: Single background layer
<CardView android:background="@color/white">
```

### GPU Profiling

```swift
// iOS — Enable Metal frame capture
// Xcode → Debug → Attach to Process → Capture Metal Frame

// Common GPU issues:
// 1. Offscreen rendering (cornerRadius + clipsToBounds on iOS)
//    Fix: Use pre-rendered rounded images, or CAShapeLayer mask
// 2. Texture too large
//    Fix: Downsample images to display size
// 3. Too many blend passes (transparent layers stacked)
//    Fix: Use opaque backgrounds where possible
```

## Performance Audit Checklist

### Startup
- [ ] Cold start under target (< 500ms iOS, < 1s Android)
- [ ] Non-critical initialization deferred past first frame
- [ ] Splash screen is not adding artificial delay

### Memory
- [ ] No memory leaks detected (LeakCanary / Instruments)
- [ ] Images downsampled to display size
- [ ] Memory usage within budget under sustained use

### Scrolling
- [ ] 60fps on target device during list scroll
- [ ] Virtualized lists (FlashList / RecyclerView / UITableView)
- [ ] Prefetching configured for infinite scroll

### Bundle
- [ ] Bundle size within store guidelines
- [ ] No unused dependencies or assets
- [ ] Images in WebP format, optimized SVGs

### Battery
- [ ] No unnecessary background polling
- [ ] Network requests batched where possible
- [ ] Location services use minimum accuracy needed

### Frame Rate
- [ ] No dropped frames during animations
- [ ] Heavy computation off main/UI thread
- [ ] Overdraw within acceptable range

## Related Skills

- `csp-react-native-patterns` — React Native-specific patterns and architecture
- `csp-cross-platform-strategy` — Choosing the right cross-platform approach
- `csp-mobile-performance-auditor` — Agent for automated performance auditing
- `csp-code-simplification` — Reduce code complexity that impacts performance
