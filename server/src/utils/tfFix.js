const path = require('path');
const fs = require('fs');

const util = require('util');
// Modern Node.js removed many deprecated util.is* functions. Polyfill them for older packages like @tensorflow/tfjs-node.
if (!util.isNullOrUndefined) {
    util.isNullOrUndefined = (val) => val === null || val === undefined;
}
if (!util.isArray) {
    util.isArray = Array.isArray;
}
if (!util.isObject) {
    util.isObject = (arg) => typeof arg === 'object' && arg !== null;
}
if (!util.isString) {
    util.isString = (arg) => typeof arg === 'string';
}
if (!util.isNumber) {
    util.isNumber = (arg) => typeof arg === 'number';
}
if (!util.isBoolean) {
    util.isBoolean = (arg) => typeof arg === 'boolean';
}

/**
 * Fixes Node.js v24+ / Windows DLL loading for @tensorflow/tfjs-node
 * by manually adding the native library folder to the PATH.
 * Also polyfills missing util functions for older packages.
 */
function fixTfjsNodePaths() {
    if (process.platform !== 'win32') return;

    // Try to find the tfjs-node deps in the nearest node_modules
    const possiblePaths = [
        path.join(__dirname, '..', '..', 'node_modules', '@tensorflow', 'tfjs-node', 'deps', 'lib'),
        path.join(process.cwd(), 'node_modules', '@tensorflow', 'tfjs-node', 'deps', 'lib')
    ];

    for (const tfPath of possiblePaths) {
        if (fs.existsSync(tfPath)) {
            console.log(`[TF Fix] Found TensorFlow DLLs at: ${tfPath}`);
            process.env.PATH = tfPath + ';' + process.env.PATH;
            return true;
        }
    }

    console.warn('[TF Fix] Could not find TensorFlow DLL directory in common locations.');
    return false;
}

module.exports = { fixTfjsNodePaths };
