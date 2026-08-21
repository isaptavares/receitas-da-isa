import os
import re

new_footer = """  <footer class="site-footer">
    <div style="display:flex; align-items:center; gap:12px">
      <div style="width:30px; height:30px; border-radius:10px; background:#ffbf00; display:flex; align-items:center; justify-content:center"><div style="width:10px; height:10px; border-radius:50%; background:#14110d"></div></div>
      <span style="font-size:15px; font-weight:800; color:#14110d">Receitas da Isa</span>
    </div>
    <span style="font-size: 14px; color: #a39a8c; font-weight: 500;">Feito com <span style="color:#ffbf00">♥</span> e muito sabor • 2026</span>
  </footer>"""

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find anything starting with <footer and ending with </footer>
    # including across multiple lines
    pattern = re.compile(r'<footer.*?</footer>', re.DOTALL)
    
    if pattern.search(content):
        new_content = pattern.sub(new_footer, content)
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")

for root, dirs, files in os.walk('.'):
    # Exclude IDV folder if you don't want to modify the design handoff files
    if 'IDV' in root:
        continue
    for file in files:
        if file.endswith('.html'):
            process_file(os.path.join(root, file))

print("All footers updated successfully.")
