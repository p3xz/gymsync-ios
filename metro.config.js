const { getDefaultConfig } = require('expo/metro-config');
const { withTargets } = require('expo-targets/metro');

module.exports = withTargets(getDefaultConfig(__dirname));
