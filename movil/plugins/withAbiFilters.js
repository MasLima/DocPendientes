const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

// Restringe el APK a solo arm64-v8a y optimiza gradle.properties.
// Necesario porque `expo prebuild --clean` regenera estos archivos
// y pierde la configuración manual.
module.exports = function withAbiFilters(config) {
  config = withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('abiFilters')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /(defaultConfig\s*{)/,
        `$1\n        ndk {\n            abiFilters 'arm64-v8a'\n        }`
      );
    }
    return cfg;
  });

  config = withGradleProperties(config, (cfg) => {
    const upsert = (key, value) => {
      const idx = cfg.modResults.findIndex(
        (item) => item.type === 'property' && item.key === key
      );
      if (idx >= 0) {
        cfg.modResults[idx].value = value;
      } else {
        cfg.modResults.push({ type: 'property', key, value });
      }
    };
    upsert('reactNativeArchitectures', 'arm64-v8a');
    upsert('org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m');
    return cfg;
  });

  return config;
};
