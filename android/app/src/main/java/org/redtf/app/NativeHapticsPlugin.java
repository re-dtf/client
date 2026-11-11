package org.redtf.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.HapticFeedbackConstants;
import android.webkit.WebView;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

/**
 * Native Haptics Plugin for Android with 4-tier adaptive fallback.
 * Tier 1: Android 11+ (API 30+) VibrationEffect.Composition with USAGE_TOUCH
 * Tier 2: Android 10+ (API 29+) VibrationEffect.createPredefined
 * Tier 3: Android 8+ (API 26+) Waveforms with Amplitude Control (Telegram timings: 1-7ms)
 * Tier 4: Android 7+ (API 24+) Legacy micro-vibrations
 */
@CapacitorPlugin(name = "NativeHaptics")
public class NativeHapticsPlugin extends Plugin {

    private Vibrator getVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm = (VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vm != null ? vm.getDefaultVibrator() : null;
        } else {
            return (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
        }
    }

    private void vibrateWithAttributes(Vibrator vibrator, VibrationEffect effect) {
        if (vibrator == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_TOUCH));
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                VibrationAttributes attrs = new VibrationAttributes.Builder()
                    .setUsage(VibrationAttributes.USAGE_TOUCH)
                    .build();
                vibrator.vibrate(effect, attrs);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioAttributes audioAttrs = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                    .build();
                vibrator.vibrate(effect, audioAttrs);
            } else {
                vibrator.vibrate(effect);
            }
        } catch (Throwable ignored) {
            try {
                vibrator.vibrate(effect);
            } catch (Throwable ignored2) {}
        }
    }

    private boolean isPrimitiveSupported(Vibrator vibrator, int primitiveId) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && vibrator != null) {
            try {
                return vibrator.areAllPrimitivesSupported(primitiveId);
            } catch (Throwable ignored) {}
        }
        return false;
    }

    private void vibrateWaveform(Vibrator vibrator, long[] timings, int[] amplitudes) {
        if (vibrator == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (vibrator.hasAmplitudeControl() && amplitudes != null && amplitudes.length == timings.length) {
                    vibrateWithAttributes(vibrator, VibrationEffect.createWaveform(timings, amplitudes, -1));
                } else {
                    vibrateWithAttributes(vibrator, VibrationEffect.createWaveform(timings, -1));
                }
            } else {
                vibrator.vibrate(timings, -1);
            }
        } catch (Throwable ignored) {}
    }

    @PluginMethod
    public void getDiagnostics(PluginCall call) {
        Vibrator vibrator = getVibrator();
        JSObject ret = new JSObject();

        ret.put("apiLevel", Build.VERSION.SDK_INT);
        ret.put("manufacturer", Build.MANUFACTURER);
        ret.put("model", Build.MODEL);

        boolean hasVibrator = vibrator != null && vibrator.hasVibrator();
        ret.put("hasVibrator", hasVibrator);

        boolean hasAmplitudeControl = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && vibrator != null && vibrator.hasAmplitudeControl();
        ret.put("hasAmplitudeControl", hasAmplitudeControl);

        JSObject primitives = new JSObject();
        boolean suppClick = isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_CLICK);
        boolean suppTick = isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_TICK);
        boolean suppLowTick = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && vibrator != null) {
            try {
                suppLowTick = vibrator.areAllPrimitivesSupported(VibrationEffect.Composition.PRIMITIVE_LOW_TICK);
            } catch (Throwable ignored) {}
        }
        boolean suppThud = isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_THUD);
        boolean suppSpin = isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_SPIN);
        boolean suppQuickRise = isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_QUICK_RISE);
        boolean suppSlowRise = isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_SLOW_RISE);
        boolean suppQuickFall = isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_QUICK_FALL);

        primitives.put("click", suppClick);
        primitives.put("tick", suppTick);
        primitives.put("lowTick", suppLowTick);
        primitives.put("thud", suppThud);
        primitives.put("spin", suppSpin);
        primitives.put("quickRise", suppQuickRise);
        primitives.put("slowRise", suppSlowRise);
        primitives.put("quickFall", suppQuickFall);

        ret.put("primitives", primitives);

        String tier;
        if (suppTick && suppClick) {
            tier = "Tier 1: Composition Primitives (Android 11+ / Cirrus & LRA)";
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            tier = "Tier 2: Predefined Effects (Android 10+)";
        } else if (hasAmplitudeControl) {
            tier = "Tier 3: Micro-Waveforms with Amplitude Control (Android 8+)";
        } else {
            tier = "Tier 4: Legacy Timing Fallback";
        }
        ret.put("tier", tier);

        call.resolve(ret);
    }

    @PluginMethod
    public void tick(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null) {
            call.resolve();
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_TICK)) {
                VibrationEffect.Composition comp = VibrationEffect.startComposition();
                comp.addPrimitive(VibrationEffect.Composition.PRIMITIVE_TICK, 0.7f);
                vibrateWithAttributes(vibrator, comp.compose());
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                vibrateWithAttributes(vibrator, VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK));
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && vibrator.hasAmplitudeControl()) {
                vibrateWaveform(vibrator, new long[]{2}, new int[]{70});
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrateWithAttributes(vibrator, VibrationEffect.createOneShot(10, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(10);
            }
        } catch (Throwable ignored) {}

        call.resolve();
    }

    @PluginMethod
    public void click(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null) {
            call.resolve();
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_CLICK)) {
                VibrationEffect.Composition comp = VibrationEffect.startComposition();
                comp.addPrimitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.9f);
                vibrateWithAttributes(vibrator, comp.compose());
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                vibrateWithAttributes(vibrator, VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK));
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && vibrator.hasAmplitudeControl()) {
                vibrateWaveform(vibrator, new long[]{6}, new int[]{140});
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrateWithAttributes(vibrator, VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(15);
            }
        } catch (Throwable ignored) {}

        call.resolve();
    }

    @PluginMethod
    public void heavy(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null) {
            call.resolve();
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_THUD)) {
                VibrationEffect.Composition comp = VibrationEffect.startComposition();
                comp.addPrimitive(VibrationEffect.Composition.PRIMITIVE_THUD, 1.0f);
                vibrateWithAttributes(vibrator, comp.compose());
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_CLICK)) {
                VibrationEffect.Composition comp = VibrationEffect.startComposition();
                comp.addPrimitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 1.0f);
                vibrateWithAttributes(vibrator, comp.compose());
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                vibrateWithAttributes(vibrator, VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK));
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && vibrator.hasAmplitudeControl()) {
                vibrateWaveform(vibrator, new long[]{10}, new int[]{255});
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrateWithAttributes(vibrator, VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(20);
            }
        } catch (Throwable ignored) {}

        call.resolve();
    }

    @PluginMethod
    public void doubleClick(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null) {
            call.resolve();
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_TICK)) {
                VibrationEffect.Composition comp = VibrationEffect.startComposition();
                comp.addPrimitive(VibrationEffect.Composition.PRIMITIVE_TICK, 0.7f);
                comp.addPrimitive(VibrationEffect.Composition.PRIMITIVE_TICK, 0.9f, 40);
                vibrateWithAttributes(vibrator, comp.compose());
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                vibrateWithAttributes(vibrator, VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK));
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && vibrator.hasAmplitudeControl()) {
                vibrateWaveform(vibrator, new long[]{4, 40, 5}, new int[]{120, 0, 180});
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrateWithAttributes(vibrator, VibrationEffect.createWaveform(new long[]{10, 40, 10}, -1));
            } else {
                vibrator.vibrate(new long[]{0, 10, 40, 10}, -1);
            }
        } catch (Throwable ignored) {}

        call.resolve();
    }

    @PluginMethod
    public void error(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null) {
            call.resolve();
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && isPrimitiveSupported(vibrator, VibrationEffect.Composition.PRIMITIVE_CLICK)) {
                VibrationEffect.Composition comp = VibrationEffect.startComposition();
                comp.addPrimitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 1.0f);
                comp.addPrimitive(VibrationEffect.Composition.PRIMITIVE_CLICK, 0.65f, 45);
                vibrateWithAttributes(vibrator, comp.compose());
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && vibrator.hasAmplitudeControl()) {
                vibrateWaveform(vibrator, new long[]{8, 40, 8}, new int[]{200, 0, 150});
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrateWithAttributes(vibrator, VibrationEffect.createWaveform(new long[]{15, 40, 15}, -1));
            } else {
                vibrator.vibrate(new long[]{0, 15, 40, 15}, -1);
            }
        } catch (Throwable ignored) {}

        call.resolve();
    }

    @PluginMethod
    public void testPrimitive(PluginCall call) {
        String primitiveName = call.getString("primitive", "tick");
        float scale = call.getFloat("scale", 1.0f);
        Vibrator vibrator = getVibrator();

        if (vibrator == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            call.reject("Primitives require Android 11+ (API 30+)");
            return;
        }

        int primitiveId;
        switch (primitiveName) {
            case "click":
                primitiveId = VibrationEffect.Composition.PRIMITIVE_CLICK;
                break;
            case "lowTick":
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    primitiveId = VibrationEffect.Composition.PRIMITIVE_LOW_TICK;
                } else {
                    primitiveId = VibrationEffect.Composition.PRIMITIVE_TICK;
                }
                break;
            case "thud":
                primitiveId = VibrationEffect.Composition.PRIMITIVE_THUD;
                break;
            case "spin":
                primitiveId = VibrationEffect.Composition.PRIMITIVE_SPIN;
                break;
            case "quickRise":
                primitiveId = VibrationEffect.Composition.PRIMITIVE_QUICK_RISE;
                break;
            case "slowRise":
                primitiveId = VibrationEffect.Composition.PRIMITIVE_SLOW_RISE;
                break;
            case "quickFall":
                primitiveId = VibrationEffect.Composition.PRIMITIVE_QUICK_FALL;
                break;
            case "tick":
            default:
                primitiveId = VibrationEffect.Composition.PRIMITIVE_TICK;
                break;
        }

        try {
            VibrationEffect.Composition comp = VibrationEffect.startComposition();
            comp.addPrimitive(primitiveId, Math.max(0.01f, Math.min(1.0f, scale)));
            vibrateWithAttributes(vibrator, comp.compose());
            call.resolve();
        } catch (Throwable e) {
            call.reject("Failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void testPredefined(PluginCall call) {
        String effectName = call.getString("effect", "click");
        Vibrator vibrator = getVibrator();

        if (vibrator == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Predefined effects require Android 10+ (API 29+)");
            return;
        }

        int effectId;
        switch (effectName) {
            case "tick":
                effectId = VibrationEffect.EFFECT_TICK;
                break;
            case "double_click":
                effectId = VibrationEffect.EFFECT_DOUBLE_CLICK;
                break;
            case "heavy_click":
                effectId = VibrationEffect.EFFECT_HEAVY_CLICK;
                break;
            case "click":
            default:
                effectId = VibrationEffect.EFFECT_CLICK;
                break;
        }

        try {
            vibrateWithAttributes(vibrator, VibrationEffect.createPredefined(effectId));
            call.resolve();
        } catch (Throwable e) {
            call.reject("Failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void testViewHaptic(PluginCall call) {
        String constantName = call.getString("constant", "keyboard_tap");
        int feedbackConstant;

        switch (constantName) {
            case "clock_tick":
                feedbackConstant = HapticFeedbackConstants.CLOCK_TICK;
                break;
            case "context_click":
                feedbackConstant = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    ? HapticFeedbackConstants.CONTEXT_CLICK
                    : HapticFeedbackConstants.LONG_PRESS;
                break;
            case "confirm":
                feedbackConstant = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                    ? HapticFeedbackConstants.CONFIRM
                    : HapticFeedbackConstants.KEYBOARD_TAP;
                break;
            case "reject":
                feedbackConstant = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                    ? HapticFeedbackConstants.REJECT
                    : HapticFeedbackConstants.LONG_PRESS;
                break;
            case "gesture_start":
                feedbackConstant = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                    ? HapticFeedbackConstants.GESTURE_START
                    : HapticFeedbackConstants.CLOCK_TICK;
                break;
            case "gesture_end":
                feedbackConstant = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
                    ? HapticFeedbackConstants.GESTURE_END
                    : HapticFeedbackConstants.CLOCK_TICK;
                break;
            case "segment_tick":
                feedbackConstant = Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
                    ? HapticFeedbackConstants.SEGMENT_TICK
                    : HapticFeedbackConstants.CLOCK_TICK;
                break;
            case "keyboard_tap":
            default:
                feedbackConstant = HapticFeedbackConstants.KEYBOARD_TAP;
                break;
        }

        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.setHapticFeedbackEnabled(true);
                    webView.performHapticFeedback(feedbackConstant, HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING);
                }
            } catch (Throwable ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void testPreset(PluginCall call) {
        String preset = call.getString("preset", "telegram_selection");
        Vibrator vibrator = getVibrator();
        if (vibrator == null) {
            call.resolve();
            return;
        }

        switch (preset) {
            case "telegram_selection":
                vibrateWaveform(vibrator, new long[]{1}, new int[]{65});
                break;
            case "telegram_light":
                vibrateWaveform(vibrator, new long[]{7}, new int[]{65});
                break;
            case "telegram_rigid":
                vibrateWaveform(vibrator, new long[]{3}, new int[]{225});
                break;
            case "telegram_heavy":
                vibrateWaveform(vibrator, new long[]{7}, new int[]{255});
                break;
            case "capacitor_old_selection":
                vibrateWaveform(vibrator, new long[]{0, 100}, new int[]{0, 100});
                break;
            case "capacitor_old_light":
                vibrateWaveform(vibrator, new long[]{0, 50}, new int[]{0, 110});
                break;
            default:
                vibrateWaveform(vibrator, new long[]{5}, new int[]{100});
                break;
        }
        call.resolve();
    }

    @PluginMethod
    public void testWaveform(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null) {
            call.resolve();
            return;
        }

        JSArray timingsArray = call.getArray("timings");
        JSArray amplitudesArray = call.getArray("amplitudes");

        if (timingsArray == null || timingsArray.length() == 0) {
            call.reject("Missing timings array");
            return;
        }

        try {
            long[] timings = new long[timingsArray.length()];
            for (int i = 0; i < timingsArray.length(); i++) {
                timings[i] = timingsArray.getLong(i);
            }

            int[] amplitudes = null;
            if (amplitudesArray != null && amplitudesArray.length() == timings.length) {
                amplitudes = new int[amplitudesArray.length()];
                for (int i = 0; i < amplitudesArray.length(); i++) {
                    amplitudes[i] = amplitudesArray.getInt(i);
                }
            }

            vibrateWaveform(vibrator, timings, amplitudes);
            call.resolve();
        } catch (JSONException e) {
            call.reject("JSON error: " + e.getMessage());
        }
    }
}
