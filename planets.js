/**
 * 太阳系行星纹理贴图库
 * 提供所有星球纹理的路径映射和预加载功能
 * 纹理来源：Solar System Scope (https://www.solarsystemscope.com/textures/)
 */

const PlanetTextures = (() => {
    // 纹理文件路径映射（相对于引用本JS的HTML页面所在目录）
    const TEXTURE_PATHS = {
        sun:            '../0vendor/planets/2k_sun.jpg',            // 太阳表面纹理
        mercury:        '../0vendor/planets/2k_mercury.jpg',        // 水星表面纹理
        venus:          '../0vendor/planets/2k_venus_surface.jpg',  // 金星表面纹理
        venusAtmos:     '../0vendor/planets/2k_venus_atmosphere.jpg', // 金星大气层纹理
        earth:          '../0vendor/planets/2k_earth_daymap.jpg',   // 地球白天纹理
        earthNight:     '../0vendor/planets/2k_earth_nightmap.jpg', // 地球夜晚灯光纹理
        earthAtmos:     '../0vendor/planets/2k_earth_atmos.jpg',    // 地球大气层纹理
        earthClouds:    '../0vendor/planets/2k_earth_clouds.jpg',   // 地球云层纹理
        earthNormal:    '../0vendor/planets/2k_earth_normal_map.tif', // 地球法线贴图（凹凸效果）
        earthSpecular:  '../0vendor/planets/2k_earth_specular_map.tif', // 地球高光贴图（海洋反光）
        moon:           '../0vendor/planets/2k_moon.jpg',           // 标准月球纹理
        moonElevation:  '../0vendor/planets/2k_moon_elevation.jpg',    // 月球高度图（凹凸贴图）
        mars:           '../0vendor/planets/2k_mars.jpg',           // 火星表面纹理
        jupiter:        '../0vendor/planets/2k_jupiter.jpg',        // 木星表面纹理
        saturn:         '../0vendor/planets/2k_saturn.jpg',         // 土星表面纹理
        saturnRing:     '../0vendor/planets/2k_saturn_ring_alpha.png', // 土星环透明度贴图
        uranus:         '../0vendor/planets/2k_uranus.jpg',         // 天王星表面纹理
        neptune:        '../0vendor/planets/2k_neptune.jpg',        // 海王星表面纹理
        stars:          '../0vendor/planets/2k_stars.jpg',          // 星空背景（2K）
        starsMilkyWay:  '../0vendor/planets/2k_stars_milky_way.jpg', // 银河星空背景（2K）
        stars8k:        '../0vendor/planets/8k_stars.jpg',          // 星空背景（8K高清）
        starsMilkyWay8k:'../0vendor/planets/8k_stars_milky_way.jpg', // 银河星空背景（8K高清）
    };

    // 数据类贴图：存的是几何/物理量，不是颜色，必须保持线性、禁止 sRGB 解码。
    // 原因：r128 的 bumpMap 在着色器里是直接 texture2D 采样的，three 只对 map/emissiveMap
    // 等颜色贴图套解码函数，bump/normal/specular 从不解码；
    // 而 r152+ 改为按 texture.colorSpace 选用 SRGB8_ALPHA8，由 GPU 硬件统一解码，
    // 于是高度图也被解码 —— 暗部梯度被压扁（0.2→0.033、0.5→0.216，梯度只剩约 1/4），
    // bumpScale 不变的情况下月面凹凸几乎消失。故这里显式排除。
    const DATA_TEXTURE_NAMES = {
        moonElevation: true,   // 月球高度图（bumpMap）
        earthNormal: true,     // 地球法线图
        earthSpecular: true    // 地球高光图
    };

    // 纹理缓存（已加载的THREE.Texture对象）
    const textureCache = {};

    /**
     * 获取纹理文件路径
     * @param {string} name - 纹理名称（如 'earth', 'mars' 等）
     * @returns {string} 纹理文件相对路径
     */
    function getPath(name) {
        return TEXTURE_PATHS[name] || null;
    }

    /**
     * 获取所有可用纹理名称列表
     * @returns {string[]} 纹理名称数组
     */
    function getNames() {
        return Object.keys(TEXTURE_PATHS);
    }

    /**
     * 加载单个纹理（使用THREE.TextureLoader）
     * @param {string} name - 纹理名称
     * @param {THREE} THREE - THREE.js 库引用
     * @param {Function} onLoad - 加载完成回调 (texture) => void
     * @param {Function} onError - 加载失败回调 (error) => void
     * @returns {THREE.Texture|null} 纹理对象
     */
    function load(name, THREE, onLoad, onError) {
        const path = TEXTURE_PATHS[name];
        if (!path) {
            console.warn(`[PlanetTextures] 未找到纹理: ${name}`);
            return null;
        }

        if (textureCache[name]) {
            if (onLoad) onLoad(textureCache[name]);
            return textureCache[name];
        }

        const loader = new THREE.TextureLoader();
        const texture = loader.load(
            path,
            (tex) => {
                // r152 起 texture.encoding 已移除，改用 colorSpace；
                // 这里做兼容判断，便于 r128（04地月运动）与 r186（04卫星通讯）共用本库。
                // 数据类贴图（高度/法线/高光）保持线性，不做 sRGB 解码，见 DATA_TEXTURE_NAMES。
                const isDataTexture = DATA_TEXTURE_NAMES[name] === true;
                if (THREE.SRGBColorSpace !== undefined) {
                    tex.colorSpace = isDataTexture ? THREE.NoColorSpace : THREE.SRGBColorSpace;
                } else {
                    tex.encoding = isDataTexture ? THREE.LinearEncoding : THREE.sRGBEncoding;
                }
                textureCache[name] = tex;
                if (onLoad) onLoad(tex);
            },
            undefined,
            (err) => {
                console.warn(`[PlanetTextures] 加载失败: ${name}`, err);
                if (onError) onError(err);
            }
        );

        return texture;
    }

    /**
     * 批量加载所有纹理
     * @param {THREE} THREE - THREE.js 库引用
     * @param {Function} onProgress - 进度回调 (loaded, total) => void
     * @param {Function} onComplete - 全部完成回调 (cache) => void
     */
    function loadAll(THREE, onProgress, onComplete) {
        const names = getNames();
        const total = names.length;
        let loaded = 0;

        names.forEach(name => {
            load(name, THREE, () => {
                loaded++;
                if (onProgress) onProgress(loaded, total);
                if (loaded === total && onComplete) onComplete(textureCache);
            });
        });
    }

    /**
     * 获取已缓存的纹理
     * @param {string} name - 纹理名称
     * @returns {THREE.Texture|null} 已加载的纹理对象
     */
    function get(name) {
        return textureCache[name] || null;
    }

    /**
     * 清空纹理缓存
     */
    function clearCache() {
        Object.keys(textureCache).forEach(key => {
            if (textureCache[key]) textureCache[key].dispose();
        });
        Object.keys(textureCache).length = 0;
    }

    // 公开API
    return {
        PATHS: TEXTURE_PATHS,     // 直接访问路径映射
        getPath,
        getNames,
        load,
        loadAll,
        get,
        clearCache,
    };
})();