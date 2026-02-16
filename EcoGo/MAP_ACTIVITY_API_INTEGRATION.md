# MapActivity API 集成指南

## 需要修改的地方

### 1. 添加导入（在文件顶部）

在 `MapActivity.kt` 的导入部分添加：

```kotlin
import com.ecogo.app.data.repository.TripRepository
```

### 2. 添加成员变量（在类中）

在 `MapActivity` 类中，找到 `navigationStartTime` 变量附近，添加：

```kotlin
// 导航记录相关
private var navigationStartTime: Long = 0  // 导航开始时间
private var detectedTransportMode: String? = null  // AI检测到的交通方式

// 添加以下两行 ↓
private val tripRepository = TripRepository.getInstance()
private var cloudTripId: String? = null  // 云端行程ID
```

### 3. 修改 `startLocationTracking()` 方法

找到 `startLocationTracking()` 方法，在记录开始时间的地方添加API调用：

```kotlin
private fun startLocationTracking() {
    Log.d(TAG, "Starting location tracking service")
    val intent = Intent(this, LocationTrackingService::class.java).apply {
        action = LocationTrackingService.ACTION_START
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        startForegroundService(intent)
    } else {
        startService(intent)
    }

    // ... 其他代码 ...

    // 记录导航开始时间
    navigationStartTime = System.currentTimeMillis()
    detectedTransportMode = null

    // ✅ 添加以下代码：调用后端API开始行程
    lifecycleScope.launch {
        val origin = originLatLng ?: viewModel.currentLocation.value
        if (origin != null) {
            val result = tripRepository.startTrip(
                startLat = origin.latitude,
                startLng = origin.longitude,
                startPlaceName = originName,
                startAddress = originName,  // 如果有详细地址可以替换
                startCampusZone = null
            )

            result.onSuccess { tripId ->
                cloudTripId = tripId
                Log.d(TAG, "Started trip on server: tripId=$tripId")
                runOnUiThread {
                    Toast.makeText(this@MapActivity, "行程已开始", Toast.LENGTH_SHORT).show()
                }
            }.onFailure { error ->
                Log.e(TAG, "Failed to start trip on server", error)
                // 即使服务器调用失败，也继续本地追踪
            }
        }
    }

    isFollowingUser = true

    // ... 其他代码 ...
}
```

### 4. 修改 `saveNavigationHistory()` 方法

找到 `saveNavigationHistory()` 方法，在保存本地数据之前添加上传到云端的逻辑：

```kotlin
private fun saveNavigationHistory() {
    // 检查是否有有效的导航数据
    if (navigationStartTime == 0L) {
        Log.w(TAG, "Navigation start time not set, skipping history save")
        return
    }

    val origin = originLatLng ?: viewModel.currentLocation.value
    val destination = destinationLatLng

    if (origin == null || destination == null) {
        Log.w(TAG, "Origin or destination not set, skipping history save")
        return
    }

    // 获取路线数据
    val routePoints = viewModel.routePoints.value ?: emptyList()
    val trackPoints = if (isNavigationMode) {
        NavigationManager.traveledPoints.value ?: emptyList()
    } else {
        LocationManager.trackPoints.value ?: emptyList()
    }

    // 如果没有轨迹点，跳过保存
    if (trackPoints.isEmpty()) {
        Log.w(TAG, "No track points recorded, skipping history save")
        return
    }

    // 获取距离数据
    val totalDistance = viewModel.routePoints.value?.let { points ->
        viewModel.recommendedRoute.value?.total_distance?.times(1000) ?: 0.0
    } ?: 0.0

    val traveledDistance = if (isNavigationMode) {
        NavigationManager.traveledDistance.value?.toDouble() ?: 0.0
    } else {
        LocationManager.totalDistance.value?.toDouble() ?: 0.0
    }

    // 获取交通方式
    val transportMode = viewModel.selectedTransportMode.value?.value ?: "walking"

    // 获取环保数据
    val carbonResult = viewModel.carbonResult.value
    val totalCarbon = carbonResult?.total_carbon_emission ?: 0.0
    val carbonSaved = carbonResult?.carbon_saved ?: 0.0
    val isGreenTrip = carbonResult?.is_green_trip ?: (carbonSaved > 0)
    val greenPoints = carbonResult?.green_points ?: 0

    // 获取路线类型
    val routeType = viewModel.recommendedRoute.value?.route_type

    // ✅ 添加以下代码：先上传到云端
    lifecycleScope.launch {
        // 1. 上传到云端（如果有tripId）
        cloudTripId?.let { tripId ->
            try {
                val result = tripRepository.completeTrip(
                    tripId = tripId,
                    endLat = destination.latitude,
                    endLng = destination.longitude,
                    endPlaceName = destinationName,
                    endAddress = destinationName,  // 如果有详细地址可以替换
                    distance = traveledDistance,
                    trackPoints = trackPoints,
                    transportMode = transportMode,
                    detectedMode = detectedTransportMode,
                    mlConfidence = 0.92,  // 如果有ML置信度可以传入
                    carbonSaved = carbonSaved,
                    isGreenTrip = isGreenTrip
                )

                result.onSuccess { response ->
                    Log.d(TAG, "Trip completed on server successfully")
                    runOnUiThread {
                        Toast.makeText(
                            this@MapActivity,
                            "行程已上传到服务器",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }.onFailure { error ->
                    Log.e(TAG, "Failed to complete trip on server", error)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error completing trip on server", e)
            }

            // 清除云端行程ID
            cloudTripId = null
        }

        // 2. 保存到本地数据库（原有逻辑）
        try {
            val repository = NavigationHistoryRepository.getInstance()
            val historyId = repository.saveNavigationHistory(
                tripId = cloudTripId, // 保存云端tripId
                userId = null,
                startTime = navigationStartTime,
                endTime = System.currentTimeMillis(),
                origin = origin,
                originName = originName,
                destination = destination,
                destinationName = destinationName,
                routePoints = routePoints,
                trackPoints = trackPoints,
                totalDistance = totalDistance,
                traveledDistance = traveledDistance,
                transportMode = transportMode,
                detectedMode = detectedTransportMode,
                totalCarbon = totalCarbon,
                carbonSaved = carbonSaved,
                isGreenTrip = isGreenTrip,
                greenPoints = greenPoints,
                routeType = routeType
            )

            Log.d(TAG, "Navigation history saved locally with ID: $historyId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save navigation history locally", e)
        }
    }
}
```

### 5. 处理取消行程（可选）

如果用户在行程中途点击停止但没有到达目的地，可以调用取消API：

```kotlin
private fun cancelCurrentTrip() {
    cloudTripId?.let { tripId ->
        lifecycleScope.launch {
            val result = tripRepository.cancelTrip(tripId)
            result.onSuccess {
                Log.d(TAG, "Trip canceled on server")
                cloudTripId = null
            }.onFailure { error ->
                Log.e(TAG, "Failed to cancel trip on server", error)
            }
        }
    }
}
```

## 完整的修改示例

如果你想看完整的代码修改，可以参考下面的代码片段：

```kotlin
// 在 MapActivity 类中

// 1. 添加成员变量
private val tripRepository = TripRepository.getInstance()
private var cloudTripId: String? = null

// 2. 在开始追踪时调用API
private fun startLocationTracking() {
    // ... 原有代码 ...

    navigationStartTime = System.currentTimeMillis()
    detectedTransportMode = null

    // 调用API开始行程
    lifecycleScope.launch {
        val origin = originLatLng ?: viewModel.currentLocation.value
        if (origin != null) {
            tripRepository.startTrip(
                startLat = origin.latitude,
                startLng = origin.longitude,
                startPlaceName = originName,
                startAddress = originName
            ).onSuccess { tripId ->
                cloudTripId = tripId
                Log.d(TAG, "Trip started: $tripId")
            }
        }
    }

    // ... 其他代码 ...
}

// 3. 在保存历史记录时上传到云端
private fun saveNavigationHistory() {
    // ... 获取所有数据 ...

    lifecycleScope.launch {
        // 上传到云端
        cloudTripId?.let { tripId ->
            tripRepository.completeTrip(
                tripId = tripId,
                endLat = destination.latitude,
                endLng = destination.longitude,
                endPlaceName = destinationName,
                endAddress = destinationName,
                distance = traveledDistance,
                trackPoints = trackPoints,
                transportMode = transportMode,
                detectedMode = detectedTransportMode,
                carbonSaved = carbonSaved,
                isGreenTrip = isGreenTrip
            ).onSuccess {
                Log.d(TAG, "Trip uploaded successfully")
            }
        }

        // 保存到本地
        NavigationHistoryRepository.getInstance().saveNavigationHistory(...)
    }
}
```

## 配置Token

在使用API之前，需要配置认证Token。你可以：

### 方式1: 在Application中设置

```kotlin
// 在 EcoGoApplication.kt 中
class EcoGoApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // 初始化Repository
        NavigationHistoryRepository.initialize(this)

        // 设置Token（实际应该从登录系统获取）
        TripRepository.getInstance().setAuthToken("Bearer your_token_here")
    }
}
```

### 方式2: 在MapActivity中设置

```kotlin
// 在 MapActivity.onCreate() 中
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    // ... 其他初始化代码 ...

    // 设置Token
    tripRepository.setAuthToken("Bearer your_token_here")
}
```

### 方式3: 从登录系统获取

```kotlin
// 如果有登录系统
val token = UserSession.getToken()  // 从你的登录系统获取
tripRepository.setAuthToken(token)
```

## 测试

完成修改后，测试流程：

1. 启动应用
2. 选择起点和终点
3. 点击"开始追踪" → 应该调用 `POST /mobile/trips/start`
4. 移动一段距离
5. 点击"停止追踪" → 应该调用 `POST /mobile/trips/{tripId}/complete`
6. 查看日志确认API调用成功
7. 查看本地数据库确认数据已保存

## 注意事项

1. **网络权限**: AndroidManifest.xml 中已有 `INTERNET` 权限
2. **Token管理**: 当前使用固定token，实际应该从登录系统获取
3. **错误处理**: API调用失败时，本地追踪不受影响
4. **数据同步**: 优先上传到云端，然后保存到本地
5. **Base URL**: 可以在 `RetrofitClient.kt` 中切换不同环境的URL

## 获取历史记录示例

```kotlin
// 从云端获取历史记录
lifecycleScope.launch {
    val result = tripRepository.getTripListFromCloud()
    result.onSuccess { trips ->
        // 处理云端数据
        trips.forEach { trip ->
            println("Trip: ${trip.tripId}")
        }
    }
}

// 从本地获取历史记录（更快）
lifecycleScope.launch {
    val result = tripRepository.getTripListFromLocal()
    result.onSuccess { histories ->
        // 处理本地数据
        histories.forEach { history ->
            println("History: ${history.id}")
        }
    }
}
```

## 问题排查

如果API调用失败，检查：

1. Base URL是否正确（RetrofitClient.kt）
2. Token是否设置（tripRepository.setAuthToken）
3. 网络是否可达（ping 18.141.213.152）
4. 查看Logcat日志（过滤 "TripRepository"）
5. 使用Postman测试API是否正常

---

完成这些修改后，你的应用就能同时保存数据到本地数据库和云端服务器了！🎉
