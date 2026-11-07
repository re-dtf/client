package ru.redtf.app;

import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.content.pm.PackageInfoCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
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
