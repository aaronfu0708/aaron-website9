// Spline 3D 模型載入優化
export const initSplineViewer = () => {
    // 動態載入 Spline viewer 腳本
    if (typeof window !== 'undefined' && !window.splineViewerLoaded) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://unpkg.com/@splinetool/viewer@1.10.42/build/spline-viewer.js';
        script.onload = () => {
            window.splineViewerLoaded = true;
            console.log('Spline viewer loaded successfully');
        };
        script.onerror = (error) => {
            console.warn('Failed to load Spline viewer:', error);
        };
        document.head.appendChild(script);
    }
};

// 優化 Spline 模型載入
export const optimizeSplineLoading = (splineViewer) => {
    if (splineViewer) {
        try {
            // 預先設置容器尺寸，避免重排
            const container = splineViewer.closest('.spline-container');
            if (container) {
                container.style.minHeight = '600px';
                container.style.minWidth = '400px';
            }
            
            // 設置載入優化選項
            splineViewer.setAttribute('loading-anim-type', 'none');
            splineViewer.setAttribute('loading-anim-duration', '0');
            
            // 監聽載入完成事件
            splineViewer.addEventListener('load', function() {
                console.log('Spline model loaded successfully');
            });
            
            // 監聽錯誤事件
            splineViewer.addEventListener('error', function(e) {
                console.warn('Spline model loading error:', e);
            });
        } catch (error) {
            console.warn('Spline optimization error:', error);
        }
    }
}; 