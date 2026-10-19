package com.yolo.android;

import android.os.Build;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SecureKeyPlugin.class);
        super.onCreate(savedInstanceState);

        // Android 15+ 强制 edge-to-edge：WebView 会顶到状态栏/摄像头下面。
        // 把系统栏和刘海的实际 inset 加到 WebView 内边距，保证顶栏和底部导航都能点到。
        if (Build.VERSION.SDK_INT >= 35) {
            View webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView == null) return;
            ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
                Insets bars = insets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
            ViewCompat.requestApplyInsets(webView);
        }
    }
}
