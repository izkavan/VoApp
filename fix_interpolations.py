import os

files_to_fix = [
    'src/managers/CharacterManager.ts',
    'src/managers/ProjectManager.ts',
    'src/views/voice-production/vp-feedback.ts'
]

for file_path in files_to_fix:
    with open(file_path, 'r') as f:
        content = f.read()

    # Replace \${ with ${
    content = content.replace('\\${', '${')

    with open(file_path, 'w') as f:
        f.write(content)

print("Fixed escaped interpolations.")
