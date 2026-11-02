"""Bundle src/ and data/registry.json into one self-contained index.html."""
import json, pathlib
root = pathlib.Path(__file__).parent; src = root / 'src'
data = json.loads((root / 'data' / 'registry.json').read_text(encoding='utf-8'))
js = 'window.Spur=window.Spur||{};window.Spur.DATA=' + json.dumps(data, ensure_ascii=False) + ';\n' + '\n'.join((src / f).read_text(encoding='utf-8') for f in ['ascii.js', 'engine.js', 'site.js'])
html = (src / 'index.template.html').read_text(encoding='utf-8').replace('{{CSS}}', (src / 'styles.css').read_text(encoding='utf-8')).replace('{{JS}}', js.replace('</script', '<\\/script'))
(root / 'index.html').write_text(html, encoding='utf-8'); print('built index.html', len(html.encode()), 'bytes')
