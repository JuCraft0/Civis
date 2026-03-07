const { fixTfjsNodePaths } = require('./src/utils/tfFix');
fixTfjsNodePaths();

const app = require('./src/app');
const PORT = process.env.PORT || 5005;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
