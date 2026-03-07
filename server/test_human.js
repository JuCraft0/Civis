require('./src/utils/tfFix').fixTfjsNodePaths();
const { loadModels, processImage } = require("./src/services/faceRecognition");

loadModels().then(() => {
    console.log("Human models loaded successfully!");
    process.exit(0);
}).catch(e => {
    console.error("Test failed", e);
    process.exit(1);
});
