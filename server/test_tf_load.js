const path = require('path');
const fs = require('fs');

const tfPath = path.join(__dirname, 'node_modules', '@tensorflow', 'tfjs-node', 'deps', 'lib');
const dllPath = path.join(tfPath, 'tensorflow.dll');

console.log('Checking DLL at:', dllPath);
console.log('Exists:', fs.existsSync(dllPath));

if (fs.existsSync(dllPath)) {
    console.log('Adding to PATH:', tfPath);
    process.env.PATH = tfPath + ';' + process.env.PATH;
}

try {
    console.log('Attempting to require @tensorflow/tfjs-node...');
    const tf = require('@tensorflow/tfjs-node');
    console.log('SUCCESS!');
    console.log('TF Version:', tf.version.tfjs);
} catch (err) {
    console.error('FAILED!');
    console.error(err);
}
