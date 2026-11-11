package org.redtf.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public class AndroidBridge {
        @JavascriptInterface
        public boolean download(String url, String filename, String mimeType) {
            try {
                if (url == null || url.isEmpty()) return false;
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    if (filename != null && !filename.isEmpty()) {
                        request.setTitle(filename);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    }
                    if (mimeType != null && !mimeType.isEmpty()) {
                        request.setMimeType(mimeType);
                    }
                    request.setDescription("reDTF");
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    dm.enqueue(request);
                    return true;
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return false;
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
                webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
                    try {
                        String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                        if (dm != null) {
                            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                            request.setTitle(filename);
                            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                            request.setDescription("reDTF");
                            if (mimetype != null && !mimetype.isEmpty()) {
                                request.setMimeType(mimetype);
                            }
                            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                            dm.enqueue(request);
                        }
                    } catch (Exception ignored) {}
                });

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
                }

                boolean isDebug = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
                PackageInfo pInfo = getPackageManager().getPackageInfo(getPackageName(), 0);
                long currentVersion = PackageInfoCompat.getLongVersionCode(pInfo);

                SharedPreferences prefs = getSharedPreferences("redtf_native_prefs", MODE_PRIVATE);
                long lastVersion = prefs.getLong("last_version_code", -1);

                if (isDebug || lastVersion != currentVersion) {
                    webView.clearCache(true);
                    prefs.edit().putLong("last_version_code", currentVersion).apply();
                }

                if (isDebug) {
                    webView.getSettings().setCacheMode(WebSettings.LOAD_NO_CACHE);
                }
            }
        } catch (Exception ignored) {}
    }
}
