import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { TABY_EMBEDDED_HTML } from './tabyEmbeddedHtml';

export interface TabyRiveCanvasProps {
  state: 'idle' | 'listening' | 'thinking' | 'talking' | 'celebrate' | 'success';
  onTap?: () => void;
  onReady?: () => void;
  style?: any;
}

export const TabyRiveCanvas: React.FC<TabyRiveCanvasProps> = ({
  state,
  onTap,
  onReady,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
  const isReadyRef = useRef(false);

  // Enviar cambios de estado al StateMachine de Rive
  useEffect(() => {
    if (!isReadyRef.current) return;
    try {
      const payload = JSON.stringify({ action: 'setState', state });
      webViewRef.current?.postMessage(payload);
    } catch (_) {}
  }, [state]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        isReadyRef.current = true;
        console.log('[TabyRiveCanvas] Mascot is READY on Canvas! Inputs:', data.inputs);
        // Sincronizar estado inicial
        webViewRef.current?.postMessage(JSON.stringify({ action: 'setState', state }));
        onReady?.();
      } else if (data.type === 'tap') {
        onTap?.();
      } else if (data.type === 'error') {
        console.warn('[TabyRiveCanvas] WebView Rive Error:', data.error);
      }
    } catch (_) {}
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: TABY_EMBEDDED_HTML }}
        style={styles.webView}
        containerStyle={styles.webView}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scalesPageToFit={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});
