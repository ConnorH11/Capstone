
file_path = r"c:\Users\cwhor\Capstone\SubnetCalc\wwwroot\js\visualizer.js"
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 1-654 (indices 0-653)
# Skip lines 655-849 (indices 654-848)
# Keep lines 850-end (indices 849-end)

new_content = lines[:654] + lines[849:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_content)

print(f"Successfully removed lines 655-849. New line count: {len(new_content)}")
