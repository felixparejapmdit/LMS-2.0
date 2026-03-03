import os
import re

root_dir = r'c:\Users\felix\Documents\PMD Projects\LMS 2.0\react-frontend\src'

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Remove 'linear' and 'modern' layoutStyle ternaries
    # Pattern: layoutStyle === 'linear' ? '...' : 
    content = re.sub(r"layoutStyle === 'linear' \? '[^']*' : ", "", content)
    content = re.sub(r"layoutStyle === 'linear' \? \"[^\"]*\" : ", "", content)
    
    # Pattern: layoutStyle === 'modern' ? '...' : 
    content = re.sub(r"layoutStyle === 'modern' \? '[^']*' : ", "", content)
    content = re.sub(r"layoutStyle === 'modern' \? \"[^\"]*\" : ", "", content)

    # Note: If it was linear ? val1 : modern ? val2 : notion ? val3 : default
    # After first pass: modern ? val2 : notion ? val3 : default
    # After second pass: notion ? val3 : default
    
    # Handle the && pattern: layoutStyle === 'linear' && <div...>...</div>
    content = re.sub(r"layoutStyle === 'linear' && <[^>]*>.*?</[^>]*>", "", content)
    content = re.sub(r"layoutStyle === 'linear' && <[^/>]*/>", "", content)
    
    # Handle the && pattern for modern
    content = re.sub(r"layoutStyle === 'modern' && <[^>]*>.*?</[^>]*>", "", content)
    content = re.sub(r"layoutStyle === 'modern' && <[^/>]*/>", "", content)
    
    # Handle if (layoutStyle === 'linear') { ... }
    # This is more complex because of nested braces, but let's try to match simple return blocks or blocks.
    # Actually, in most pages they are just return statements.
    
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
