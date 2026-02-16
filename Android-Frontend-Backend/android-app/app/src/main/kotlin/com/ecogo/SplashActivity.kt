package com.ecogo

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.util.Log
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SplashActivity : AppCompatActivity() {

    private var countdownTimer: CountDownTimer? = null
    private val TAG = "SplashActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val notificationDest = intent?.getStringExtra("notification_destination")

        // Initialize TokenManager here as well if needed (safeguard)
        com.ecogo.auth.TokenManager.init(applicationContext)

        // VIP Check
        val prefs = getSharedPreferences("EcoGoPrefs", Context.MODE_PRIVATE)
        val isVip = prefs.getBoolean("is_vip", false)
        val isLoggedIn = com.ecogo.auth.TokenManager.isLoggedIn()

        Log.d(TAG, "onCreate: isVip=$isVip, isLoggedIn=$isLoggedIn")

        if (isVip && isLoggedIn) {
            Log.d(TAG, "User is VIP & Logged In. Skipping Ad.")
            proceedToMain(shouldGoToHome = true, notificationDest = notificationDest)
            return
        }

        setContentView(R.layout.activity_splash)

        val imgAd = findViewById<ImageView>(R.id.imgAd)
        val btnSkip = findViewById<LinearLayout>(R.id.btnSkip)
        val tvSkipText = findViewById<TextView>(R.id.tvSkipText)

        btnSkip.setOnClickListener {
            Log.d(TAG, "Skip button clicked")
            countdownTimer?.cancel()
            proceedToMain(
                shouldGoToHome = com.ecogo.auth.TokenManager.isLoggedIn(),
                notificationDest = notificationDest
            )
        }

        fetchAndDisplayAd(imgAd)
        syncVipStatus(isLoggedIn, notificationDest)
        startCountdownTimer(tvSkipText, notificationDest)
    }

    private fun fetchAndDisplayAd(imgAd: ImageView) {
        val adUrl = "http://18.141.213.152:8090/api/v1/advertisements/active"

        Thread {
            try {
                Log.d(TAG, "Fetching ads from $adUrl")
                val connection = createAdConnection(adUrl)

                if (connection.responseCode == 200) {
                    handleAdResponse(connection, imgAd)
                } else {
                    Log.e(TAG, "HTTP Error: ${connection.responseCode}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Fetch Error: ${e.message}")
            }
        }.start()
    }

    private fun createAdConnection(adUrl: String): java.net.HttpURLConnection {
        val url = java.net.URL(adUrl)
        val connection = url.openConnection() as java.net.HttpURLConnection
        connection.requestMethod = "GET"
        connection.connectTimeout = 2000
        connection.readTimeout = 2000
        return connection
    }

    private fun handleAdResponse(connection: java.net.HttpURLConnection, imgAd: ImageView) {
        val reader = java.io.InputStreamReader(connection.inputStream)
        val responseText = reader.readText()
        reader.close()

        val gson = com.google.gson.Gson()
        val response = gson.fromJson(responseText, com.ecogo.data.AdResponse::class.java)

        if (response.code == 200 && !response.data.isNullOrEmpty()) {
            val randomAd = response.data.random()
            Log.d(TAG, "Selected Ad: ${randomAd.name}, Image: ${randomAd.imageUrl}")
            displayAd(imgAd, randomAd)
        } else {
            Log.w(TAG, "No active ads or error code: ${response.code}")
        }
    }

    private fun displayAd(imgAd: ImageView, ad: com.ecogo.data.Advertisement) {
        runOnUiThread {
            try {
                com.bumptech.glide.Glide.with(this)
                    .load(ad.imageUrl)
                    .centerCrop()
                    .placeholder(R.drawable.bg_splash_ad_placeholder)
                    .error(R.drawable.bg_splash_ad_placeholder)
                    .into(imgAd)

                imgAd.setOnClickListener {
                    Log.d(TAG, "Ad clicked: ${ad.linkUrl}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Glide Error: ${e.message}")
            }
        }
    }

    private fun syncVipStatus(isLoggedIn: Boolean, notificationDest: String?) {
        if (!isLoggedIn) return

        val userId = com.ecogo.auth.TokenManager.getUserId()
        if (userId.isNullOrEmpty()) return

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val apiService = com.ecogo.api.RetrofitClient.apiService
                val response = apiService.getUserProfile(userId)
                if (response.success && response.data != null) {
                    applyVipSync(response.data.vip?.active == true, notificationDest)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to sync user profile: ${e.message}")
            }
        }
    }

    private fun applyVipSync(serverIsVip: Boolean, notificationDest: String?) {
        val localPrefs = getSharedPreferences("EcoGoPrefs", Context.MODE_PRIVATE)
        localPrefs.edit().putBoolean("is_vip", serverIsVip).apply()
        Log.d(TAG, "Synced VIP status from server: $serverIsVip")

        if (serverIsVip) {
            runOnUiThread {
                Log.d(TAG, "User effectively VIP after sync. Skipping ad now.")
                countdownTimer?.cancel()
                proceedToMain(
                    shouldGoToHome = com.ecogo.auth.TokenManager.isLoggedIn(),
                    notificationDest = notificationDest
                )
            }
        }
    }

    private fun startCountdownTimer(tvSkipText: TextView, notificationDest: String?) {
        Log.d(TAG, "Starting 3s countdown")
        countdownTimer = object : CountDownTimer(3000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val secondsLeft = (millisUntilFinished / 1000) + 1
                tvSkipText.text = "Skip $secondsLeft"
            }

            override fun onFinish() {
                Log.d(TAG, "Countdown finished")
                tvSkipText.text = "Skip 0"
                proceedToMain(shouldGoToHome = true, notificationDest = notificationDest)
            }
        }.start()
    }

    private fun proceedToMain(shouldGoToHome: Boolean, notificationDest: String?) {
        Log.d(TAG, "proceedToMain: shouldGoToHome=$shouldGoToHome, dest=$notificationDest")

        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)

        if (shouldGoToHome) {
            intent.putExtra("NAV_TO_HOME", true)
        }

        if (!notificationDest.isNullOrBlank()) {
            intent.putExtra("notification_destination", notificationDest)
        }

        startActivity(intent)
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        countdownTimer?.cancel()
    }
}
