import os
import re

root_dir = r'c:\Users\felix\Documents\PMD Projects\LMS 2.0\react-frontend\src'

patterns = [
    # Pattern for layoutStyle === 'linear' ? 'style1' : 'style2'
    # Result: 'style2'
    (r"layoutStyle === 'linear' \? '[^']*' : ", ""),
    
    # Pattern for ${layoutStyle === 'linear' ? 'style1' : 'style2'}
    # Result: ${'style2'} which is then often simplified by another pass or just left as is (it's valid)
    # But better: (r"\$\{layoutStyle === 'linear' \? '[^']*' : ([^}]*)\}", r"\1"),
    
    # Let's do a more robust approach for the ternary
    (r"layoutStyle === 'linear' \? \"[^\"]*\" : ", ""),
    
    # Handle the && pattern: layoutStyle === 'linear' && <div...>...</div>
    (r"layoutStyle === 'linear' && <[^>]*>.*?</[^>]*>", ""),
    (r"layoutStyle === 'linear' && <[^/>]*/>", ""),
]

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # 1. Remove the ternary part: layoutStyle === 'linear' ? '...' : 
    # This leaves the 'else' part.
    content = re.sub(r"layoutStyle === 'linear' \? '[^']*' : ", "", content)
    content = re.sub(r"layoutStyle === 'linear' \? \"[^\"]*\" : ", "", content)
    
    # 2. Remove the short circuit: layoutStyle === 'linear' && ...
    # We need to be careful with nested braces if it's JSX. 
    # For now, let's target the ones found in grep.
    
    # 3. Handle cases where it's part of a larger condition if any (rare here)
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.jsx', '.js')):
            path = os.path.join(root, file)
            if clean_file(path):
                print(f"Cleaned: {path}")
