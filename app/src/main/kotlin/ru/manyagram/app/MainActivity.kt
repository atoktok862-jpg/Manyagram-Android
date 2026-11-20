package ru.manyagram.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.TextView
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import androidx.webkit.WebViewAssetLoader

class MainActivity : ComponentActivity() {

    companion object {
        private const val OFFLINE_BASE = "https://appassets.androidplatform.net/assets/"
        private const val DEFAULT_URL = OFFLINE_BASE + "index.html"
        private const val REMOTE_DEFAULT = "https://moocher-motive-tremble.ngrok-free.dev/"
        private const val PREFS_NAME = "manyagram"
        private const val KEY_SERVER = "server_url"
        private const val SKIP_WARNING_HEADER = "ngrok-skip-browser-warning"
        private const val SKIP_WARNING_VALUE = "true"
    }

    private lateinit var webView: WebView
    private lateinit var assetLoader: WebViewAssetLoader
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var errorView: View
    private lateinit var errorBody: TextView
    private lateinit var navBar: View
    private lateinit var feedButton: Button
    private lateinit var adminButton: Button

    private var serverBase = DEFAULT_URL
    private var currentUrl = DEFAULT_URL
    private var pageFailed = false
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingChooserParams: WebChromeClient.FileChooserParams? = null

    private val pickFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        deliverFiles(if (uri == null) null else arrayOf(uri))
    }

    private val pickFiles = registerForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        deliverFiles(if (uris.isEmpty()) null else uris.toTypedArray())
    }

    private val requestImages = registerForActivityResult(ActivityResultContracts.RequestPermission()) {
        launchChooser()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        swipeRefresh = findViewById(R.id.swipeRefresh)
        errorView = findViewById(R.id.errorView)
        errorBody = findViewById(R.id.errorBody)
        navBar = findViewById(R.id.navBar)
        feedButton = findViewById(R.id.feedButton)
        adminButton = findViewById(R.id.adminButton)

        serverBase = normalizeUrl(
            getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
                .getString(KEY_SERVER, DEFAULT_URL) ?: DEFAULT_URL
        )
        currentUrl = serverBase

        assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        swipeRefresh.setColorSchemeColors(ContextCompat.getColor(this, R.color.brand_accent))
        configureWebView()
        bindControls()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    navBar.visibility == View.GONE -> navBar.visibility = View.VISIBLE
                    errorView.visibility == View.VISIBLE -> finish()
                    webView.canGoBack() -> webView.goBack()
                    else -> finish()
                }
            }
        })

        load(currentUrl)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            userAgentString = "$userAgentString ManyaGramAndroid/1.0"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(
                view: WebView?,
                request: WebResourceRequest?
            ): WebResourceResponse? {
                return request?.let { assetLoader.shouldInterceptRequest(it.url) }
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                when {
                    url.startsWith("http://", true) || url.startsWith("https://", true) -> load(url)
                    url.startsWith("tel:", true) || url.startsWith("mailto:", true) -> {
                        try {
                            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                        } catch (ignored: ActivityNotFoundException) {
                        }
                    }
                }
                return true
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                swipeRefresh.isRefreshing = true
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                swipeRefresh.isRefreshing = false
                if (!pageFailed) {
                    if (!url.isNullOrEmpty()) currentUrl = url
                    hideError()
                }
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                if (request?.isForMainFrame == true) {
                    pageFailed = true
                    showError()
                }
            }

            override fun onReceivedHttpError(
                view: WebView?,
                request: WebResourceRequest?,
                errorResponse: WebResourceResponse?
            ) {
                if (request?.isForMainFrame == true && (errorResponse?.statusCode ?: 0) >= 400) {
                    pageFailed = true
                    showError()
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                pendingChooserParams = params
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    requestImages.launch(Manifest.permission.READ_MEDIA_IMAGES)
                } else {
                    launchChooser()
                }
                return true
            }
        }
    }

    private fun bindControls() {
        feedButton.isSelected = true

        feedButton.setOnClickListener {
            setActiveTab(feedButton)
            load(serverBase)
        }

        adminButton.setOnClickListener {
            setActiveTab(adminButton)
            if (isOffline()) {
                load(OFFLINE_BASE + "admin.html")
            } else {
                load("${serverBase.trimEnd('/')}/admin")
            }
        }

        findViewById<Button>(R.id.refreshButton).setOnClickListener { retryLoad() }
        findViewById<Button>(R.id.retryButton).setOnClickListener { retryLoad() }
        findViewById<Button>(R.id.serverButton).setOnClickListener { showServerDialog() }
        findViewById<ImageButton>(R.id.toggleBarButton).setOnClickListener {
            navBar.visibility = if (navBar.visibility == View.VISIBLE) View.GONE else View.VISIBLE
        }

        swipeRefresh.setOnRefreshListener { retryLoad() }
    }

    private fun setActiveTab(active: Button) {
        feedButton.isSelected = active === feedButton
        adminButton.isSelected = active === adminButton
    }

    private fun showServerDialog() {
        val input = EditText(this)
        input.inputType = InputType.TYPE_TEXT_VARIATION_URI
        input.setSingleLine(true)
        input.setText(if (isOffline()) REMOTE_DEFAULT else serverBase)
        val padding = (16 * resources.displayMetrics.density).toInt()
        input.setPadding(padding, padding, padding, padding)

        AlertDialog.Builder(this)
            .setTitle(R.string.url_title)
            .setView(input)
            .setPositiveButton(R.string.save) { _, _ ->
                val typed = input.text.toString().trim()
                if (typed.isEmpty()) {
                    Toast.makeText(this, R.string.url_hint, Toast.LENGTH_LONG).show()
                    return@setPositiveButton
                }
                serverBase = normalizeUrl(typed)
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
                    .putString(KEY_SERVER, serverBase).apply()
                setActiveTab(feedButton)
                load(serverBase)
            }
            .setNeutralButton(R.string.offline_mode) { _, _ ->
                serverBase = DEFAULT_URL
                getSharedPreferences(PREFS_NAME, MODE_PRIVATE).edit()
                    .putString(KEY_SERVER, serverBase).apply()
                setActiveTab(feedButton)
                load(serverBase)
            }
            .setNegativeButton(R.string.cancel, null)
            .show()
    }

    private fun load(rawUrl: String) {
        val url = normalizeUrl(rawUrl)
        currentUrl = url
        pageFailed = false
        swipeRefresh.isRefreshing = true
        if (isOffline()) {
            webView.loadUrl(url)
        } else {
            webView.loadUrl(url, mapOf(SKIP_WARNING_HEADER to SKIP_WARNING_VALUE))
        }
    }

    private fun isOffline(): Boolean = serverBase.startsWith(OFFLINE_BASE, true)

    private fun retryLoad() {
        hideError()
        load(currentUrl)
    }

    private fun normalizeUrl(raw: String): String {
        val value = raw.trim()
        if (value.isEmpty()) return DEFAULT_URL
        return if (value.startsWith("http://", true) || value.startsWith("https://", true)) {
            value
        } else {
            "https://$value"
        }
    }

    private fun launchChooser() {
        val params = pendingChooserParams ?: return
        val types = params.acceptTypes.map { it.trim() }.filter { it.isNotBlank() }.toTypedArray()
        val mimeTypes = if (types.isEmpty()) arrayOf("*/*") else types
        if (params.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE) {
            pickFiles.launch(mimeTypes)
        } else {
            pickFile.launch(mimeTypes)
        }
    }

    private fun deliverFiles(uris: Array<Uri>?) {
        val callback = filePathCallback ?: return
        filePathCallback = null
        pendingChooserParams = null
        if (uris != null) {
            for (uri in uris) {
                try {
                    contentResolver.takePersistableUriPermission(
                        uri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                } catch (ignored: SecurityException) {
                }
            }
        }
        callback.onReceiveValue(uris)
    }

    private fun showError() {
        swipeRefresh.isRefreshing = false
        errorBody.setText(
            if (isOffline()) R.string.waiting_body_offline else R.string.waiting_body
        )
        errorView.visibility = View.VISIBLE
    }

    private fun hideError() {
        errorView.visibility = View.GONE
    }
}
