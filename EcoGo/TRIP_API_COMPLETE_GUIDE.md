# EcoGo 行程API完整对接指南

## 📋 目录

1. [功能概述](#功能概述)
2. [已创建的文件](#已创建的文件)
3. [快速开始](#快速开始)
4. [API使用示例](#api使用示例)
5. [MapActivity集成](#mapactivity集成)
6. [数据流程](#数据流程)
7. [配置说明](#配置说明)
8. [常见问题](#常见问题)

---

## 功能概述

本次实现了完整的行程管理系统，包括：

### ✅ 已实现功能

- **开始行程** - 导航开始时自动调用API
- **完成行程** - 导航结束时上传轨迹数据
- **取消行程** - 支持取消正在进行的行程
- **获取历史** - 从云端或本地获取历史记录
- **本地存储** - 本地数据库备份，支持离线查看
- **双重保存** - 云端备份 + 本地存储，数据不丢失

### 🎯 对接的API

| API | 方法 | 路径 | 状态 |
|-----|------|------|------|
| 开始行程 | POST | `/mobile/trips/start` | ✅ |
| 完成行程 | POST | `/mobile/trips/{tripId}/complete` | ✅ |
| 取消行程 | POST | `/mobile/trips/{tripId}/cancel` | ✅ |
| 获取列表 | GET | `/mobile/trips` | ✅ |
| 获取详情 | GET | `/mobile/trips/{tripId}` | ✅ |
| 当前行程 | GET | `/mobile/trips/current` | ✅ |

---

## 已创建的文件

### 📁 核心代码文件

| 文件 | 路径 | 说明 |
|------|------|------|
| **TripApiModels.kt** | `data/model/` | API数据模型 |
| **TripApiService.kt** | `data/remote/` | Retrofit接口定义 |
| **TripRepository.kt** | `data/repository/` | 业务逻辑层 |
| **RetrofitClient.kt** | `data/remote/` | 已更新BASE_URL |

### 📄 文档文件

| 文件 | 说明 |
|------|------|
| **MAP_ACTIVITY_API_INTEGRATION.md** | MapActivity集成指南 |
| **TRIP_API_COMPLETE_GUIDE.md** | 本文档 |

---

## 快速开始

### 步骤1: 配置Token

在 `EcoGoApplication.kt` 中设置Token：

```kotlin
class EcoGoApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // 初始化Repository
        NavigationHistoryRepository.initialize(this)

        // 🔥 设置API Token
        TripRepository.getInstance().setAuthToken("Bearer your_token_here")
    }
}
```

### 步骤2: 同步项目

```bash
# 在Android Studio中
1. 点击 "Sync Project with Gradle Files"
2. 等待依赖下载完成
```

### 步骤3: 集成到MapActivity

参考 [MAP_ACTIVITY_API_INTEGRATION.md](MAP_ACTIVITY_API_INTEGRATION.md) 文档，在MapActivity中添加API调用代码。

### 步骤4: 测试

1. 启动应用
2. 开始导航 → 查看日志确认API调用
3. 结束导航 → 确认数据上传成功

---

## API使用示例

### 示例1: 开始行程

```kotlin
import com.ecogo.app.data.repository.TripRepository
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch

lifecycleScope.launch {
    val tripRepo = TripRepository.getInstance()

    val result = tripRepo.startTrip(
        startLat = 39.914885,
        startLng = 116.403874,
        startPlaceName = "国贸商联络处",
        startAddress = "北京市朝阳区朝阳门外大街",
        startCampusZone = "南湖区"
    )

    result.onSuccess { tripId ->
        println("Trip started: $tripId")
        // 保存tripId用于后续完成行程
    }.onFailure { error ->
        println("Failed to start trip: ${error.message}")
    }
}
```

### 示例2: 完成行程

```kotlin
lifecycleScope.launch {
    val tripRepo = TripRepository.getInstance()

    // 构建轨迹点列表
    val trackPoints = listOf(
        LatLng(39.914885, 116.403874),
        LatLng(39.916000, 116.410000),
        LatLng(39.920876, 116.456097)
    )

    val result = tripRepo.completeTrip(
        tripId = "trip123",
        endLat = 39.920876,
        endLng = 116.456097,
        endPlaceName = "三里屯",
        endAddress = "北京市朝阳区三里屯路19号",
        distance = 2500.0,  // 米
        trackPoints = trackPoints,
        transportMode = "walking",
        detectedMode = "walking",
        mlConfidence = 0.92,
        carbonSaved = 85.0,
        isGreenTrip = true
    )

    result.onSuccess { response ->
        println("Trip completed!")
        println("Carbon saved: ${response.carbonSaved} kg")
        println("Green points: ${response.greenPoints}")
    }.onFailure { error ->
        println("Failed to complete trip: ${error.message}")
    }
}
```

### 示例3: 获取历史记录列表

```kotlin
lifecycleScope.launch {
    val tripRepo = TripRepository.getInstance()

    // 从云端获取
    val cloudResult = tripRepo.getTripListFromCloud(
        page = 1,
        pageSize = 20,
        status = "completed"
    )

    cloudResult.onSuccess { trips ->
        trips.forEach { trip ->
            println("""
                Trip ID: ${trip.tripId}
                Start: ${trip.startPlaceName}
                End: ${trip.endPlaceName}
                Distance: ${trip.distance} km
                Carbon Saved: ${trip.carbonSaved} kg
            """.trimIndent())
        }
    }

    // 从本地获取（更快）
    val localResult = tripRepo.getTripListFromLocal()
    localResult.onSuccess { histories ->
        println("Local histories: ${histories.size}")
    }
}
```

### 示例4: 获取行程详情

```kotlin
lifecycleScope.launch {
    val tripRepo = TripRepository.getInstance()

    val result = tripRepo.getTripDetail("trip123")

    result.onSuccess { trip ->
        println("""
            Trip Details:
            - ID: ${trip.tripId}
            - Start: ${trip.startPlaceName}
            - End: ${trip.endPlaceName}
            - Distance: ${trip.distance} km
            - Transport Mode: ${trip.detectedMode}
            - Carbon Saved: ${trip.carbonSaved} kg
            - Points: ${trip.polylinePoints?.size} points
        """.trimIndent())

        // 在地图上显示轨迹
        trip.polylinePoints?.let { points ->
            val latLngPoints = points.map { LatLng(it.lat, it.lng) }
            drawRouteOnMap(latLngPoints)
        }
    }
}
```

### 示例5: 取消行程

```kotlin
lifecycleScope.launch {
    val tripRepo = TripRepository.getInstance()

    val result = tripRepo.cancelTrip("trip123")

    result.onSuccess { response ->
        println("Trip canceled at: ${response.cancelTime}")
    }.onFailure { error ->
        println("Failed to cancel trip: ${error.message}")
    }
}
```

---

## MapActivity集成

### 完整的集成流程

#### 1. 添加成员变量

```kotlin
class MapActivity : AppCompatActivity(), OnMapReadyCallback {

    // 添加这两行
    private val tripRepository = TripRepository.getInstance()
    private var cloudTripId: String? = null

    // ... 其他代码 ...
}
```

#### 2. 开始追踪时调用API

```kotlin
private fun startLocationTracking() {
    // ... 原有代码 ...

    // 记录开始时间
    navigationStartTime = System.currentTimeMillis()

    // 🔥 调用API开始行程
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
                Log.d(TAG, "✅ Trip started on server: $tripId")
            }.onFailure { error ->
                Log.e(TAG, "❌ Failed to start trip: ${error.message}")
            }
        }
    }

    // ... 其他代码 ...
}
```

#### 3. 结束追踪时上传数据

```kotlin
private fun saveNavigationHistory() {
    // ... 获取所有数据 ...

    lifecycleScope.launch {
        // 🔥 先上传到云端
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
                Log.d(TAG, "✅ Trip uploaded to server")
            }.onFailure { error ->
                Log.e(TAG, "❌ Failed to upload trip: ${error.message}")
            }

            cloudTripId = null
        }

        // 🔥 然后保存到本地
        NavigationHistoryRepository.getInstance().saveNavigationHistory(...)
    }
}
```

详细的集成步骤请查看：[MAP_ACTIVITY_API_INTEGRATION.md](MAP_ACTIVITY_API_INTEGRATION.md)

---

## 数据流程

### 开始导航

```
用户点击"开始追踪"
    ↓
MapActivity.startLocationTracking()
    ↓
TripRepository.startTrip()
    ↓
POST /mobile/trips/start
    ↓
返回 tripId
    ↓
保存 cloudTripId
```

### 结束导航

```
用户点击"停止追踪"
    ↓
MapActivity.stopLocationTracking()
    ↓
MapActivity.saveNavigationHistory()
    ↓
┌─────────────────────────┬──────────────────────────┐
│ TripRepository          │ NavigationHistoryRepo    │
│ .completeTrip()         │ .saveNavigationHistory() │
│   ↓                     │   ↓                      │
│ POST /trips/complete    │ Room Database (本地)      │
│   ↓                     │   ↓                      │
│ 上传轨迹数据             │ 保存完整记录              │
└─────────────────────────┴──────────────────────────┘
```

### 查询历史

```
需要历史记录
    ↓
┌──────────────────┬──────────────────┐
│ 云端查询         │ 本地查询         │
│ (较慢但最新)     │ (快速但可能过时) │
│   ↓              │   ↓              │
│ GET /trips       │ Room Query       │
│   ↓              │   ↓              │
│ TripDetail[]     │ NavHistory[]     │
└──────────────────┴──────────────────┘
```

---

## 配置说明

### 环境配置

在 `RetrofitClient.kt` 中切换环境：

```kotlin
object RetrofitClient {
    // 🌐 选择你的环境
    private const val BASE_URL = "http://18.141.213.152:8090/api/v1/"  // ✅ 生产环境

    // 其他选项：
    // private const val BASE_URL = "http://10.0.2.2:8090/api/v1/"  // 模拟器本地
    // private const val BASE_URL = "http://localhost:8090/api/v1/"  // 真机本地
}
```

### Token配置

#### 方式1: 在Application中全局设置

```kotlin
// EcoGoApplication.kt
class EcoGoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        TripRepository.getInstance().setAuthToken("Bearer your_token")
    }
}
```

#### 方式2: 在Activity中设置

```kotlin
// MapActivity.kt
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    tripRepository.setAuthToken("Bearer your_token")
}
```

#### 方式3: 从SharedPreferences读取

```kotlin
val prefs = getSharedPreferences("auth", Context.MODE_PRIVATE)
val token = prefs.getString("token", "")
if (!token.isNullOrEmpty()) {
    tripRepository.setAuthToken(token)
}
```

---

## 常见问题

### Q1: API调用失败怎么办？

**A**: 检查以下几点：

1. **网络连接**
   ```bash
   # 测试服务器是否可达
   ping 18.141.213.152
   ```

2. **Base URL配置**
   - 检查 `RetrofitClient.kt` 中的 `BASE_URL`
   - 确保以 `/` 结尾

3. **Token是否设置**
   ```kotlin
   val token = tripRepository.getAuthToken()
   Log.d("Token", "Current token: $token")
   ```

4. **查看日志**
   ```
   过滤: TripRepository
   查找: "Failed to" 或 "Error"
   ```

### Q2: 如何查看完整的API请求和响应？

**A**: 在 `RetrofitClient.kt` 中已经配置了日志拦截器：

```kotlin
private val loggingInterceptor = HttpLoggingInterceptor().apply {
    level = HttpLoggingInterceptor.Level.BODY  // 显示完整请求和响应
}
```

查看Logcat，过滤 `OkHttp` 即可看到所有HTTP请求。

### Q3: 本地数据和云端数据如何同步？

**A**: 当前实现：

- **上传**: 导航结束时自动上传到云端
- **下载**: 需要主动调用 `getTripListFromCloud()`
- **策略**: 优先使用本地数据（快），需要时从云端同步

实现自动同步：

```kotlin
lifecycleScope.launch {
    // 1. 获取云端数据
    val cloudTrips = tripRepository.getTripListFromCloud().getOrNull()

    // 2. 对比本地数据
    val localHistories = tripRepository.getTripListFromLocal().getOrNull()

    // 3. 同步逻辑
    // ... 你的同步逻辑 ...
}
```

### Q4: 如何处理离线情况？

**A**: 当前策略：

- API调用失败时，本地功能不受影响
- 轨迹数据保存在本地数据库
- 可以实现离线队列，网络恢复后自动上传

示例：

```kotlin
private val pendingUploads = mutableListOf<PendingUpload>()

// API调用失败时
result.onFailure { error ->
    // 加入待上传队列
    pendingUploads.add(PendingUpload(tripData))

    // 网络恢复后重试
    retryUploadWhenOnline()
}
```

### Q5: 如何测试API是否正常？

**A**: 使用Postman或curl测试：

```bash
# 测试开始行程
curl -X POST http://18.141.213.152:8090/api/v1/mobile/trips/start \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "startLng": 116.403874,
    "startLat": 39.914885,
    "startAddress": "北京市朝阳区",
    "startPlaceName": "国贸"
  }'
```

### Q6: 如何切换到测试环境？

**A**: 修改 `RetrofitClient.kt`：

```kotlin
// 开发环境
private const val BASE_URL = "http://dev-cn.your-api-server.com/"

// 测试环境
private const val BASE_URL = "http://test-cn.your-api-server.com/"

// 生产环境
private const val BASE_URL = "http://18.141.213.152:8090/api/v1/"
```

---

## 下一步

### 推荐实现的功能

1. **登录系统集成**
   - 实现用户登录
   - 从登录系统获取真实Token
   - 存储用户信息

2. **离线队列**
   - 网络异常时缓存待上传数据
   - 网络恢复后自动上传

3. **数据同步**
   - 定期从云端同步历史记录
   - 本地和云端数据对比

4. **历史记录界面**
   - 创建历史记录列表页面
   - 支持查看详情
   - 支持在地图上显示历史轨迹

5. **统计分析**
   - 展示总里程
   - 展示减碳量
   - 绿色出行统计

---

## 相关文档

- [导航历史API文档](NAVIGATION_HISTORY_API.md)
- [MapActivity集成指南](MAP_ACTIVITY_API_INTEGRATION.md)
- [地图显示路径指南](DISPLAY_ROUTE_ON_MAP_GUIDE.md)
- [快速开始示例](QUICK_START_DISPLAY_ROUTE.kt)

---

## 总结

✅ **已完成的工作**

1. ✅ 创建了完整的API数据模型
2. ✅ 实现了Retrofit接口定义
3. ✅ 配置了网络客户端
4. ✅ 创建了TripRepository业务层
5. ✅ 提供了MapActivity集成指南
6. ✅ 实现了本地+云端双重存储
7. ✅ 编写了完整的使用文档

🎯 **核心功能**

- 开始导航自动调用API
- 结束导航自动上传轨迹
- 本地数据库备份
- 支持离线查看历史
- 可从云端同步数据

📚 **完整的文档体系**

- API使用文档
- 集成指南
- 示例代码
- 问题排查

---

需要任何帮助，随时查看文档或提问！🚀
