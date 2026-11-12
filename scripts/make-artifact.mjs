// Turns dist-artifact/artifact.html into a page fragment for publishing as a claude.ai Artifact.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-artifact/artifact.html', 'utf8');
const styles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const scripts = [...html.matchAll(/<script type="module"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
if (!styles || !scripts) throw new Error('Could not find inlined style/script');

const out = `<title>Dok znaš</title>
<meta name="theme-color" content="#13150e">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400..700&family=Space+Grotesk:wght@500..700&display=swap">
<style>
:root { color-scheme: dark; }
body { background: #0d0f09; color: #efeadb; }
${styles.replace(/<\/style/gi, '<\\/style')}
</style>
<div id="root"></div>
<script type="module">
${scripts.replace(/<\/script/gi, '<\\/script')}
</script>
`;
writeFileSync('dist-artifact/dok-znas.html', out);
console.log('wrote dist-artifact/dok-znas.html', out.length, 'bytes');
