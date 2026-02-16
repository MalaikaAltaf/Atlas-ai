import os

path = os.path.join(r'c:\Users\hp\Downloads\Atlas AI\atlas-extension', 'sidebar.js')
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines 555-565 (1-indexed) = indices 554-564
new_block = """\t\tflowSection.classList.remove('hidden');
\t\tflowContainer.innerHTML = '<p style="opacity:0.6">Loading flowchart...</p>';
\t\tconst graphDef = analysisData.flowchart;
\t\t// Use Kroki POST endpoint - sends plain text, no encoding needed
\t\tfetch('https://kroki.io/mermaid/svg', {
\t\t\tmethod: 'POST',
\t\t\theaders: { 'Content-Type': 'text/plain' },
\t\t\tbody: graphDef
\t\t})
\t\t.then(res => {
\t\t\tif (!res.ok) throw new Error('Kroki error: ' + res.status);
\t\t\treturn res.text();
\t\t})
\t\t.then(svg => {
\t\t\tflowContainer.innerHTML = svg;
\t\t})
\t\t.catch(err => {
\t\t\tconsole.error('[Atlas AI] Flowchart render error:', err);
\t\t\tflowContainer.innerHTML = '<p style="color:#f56565;">Could not render flowchart.</p>';
\t\t});
"""

new_lines = [l + '\n' for l in new_block.split('\n') if l or True]
# Actually just split properly
new_lines = new_block.splitlines(True)

lines[554:565] = new_lines
with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('SUCCESS: Replaced Logic Flow rendering with POST approach')
