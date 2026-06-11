const LinkAnalyzer = require('../src/modules/LinkAnalyzer');

(async () => {
  const url = process.argv[2] || 'https://www.google.com/robots.txt';
  const analyzer = new LinkAnalyzer();
  try {
    const meta = await analyzer.analyze(url);
    console.log('Analysis result:', JSON.stringify(meta, null, 2));
  } catch (err) {
    console.error('Analysis failed:', err.message);
    process.exit(1);
  }
})();
