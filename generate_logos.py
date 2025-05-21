# generate_logos.py
import os
import cairosvg
import io
from PIL import Image

# Ensure the static/img directory exists
os.makedirs('static/img', exist_ok=True)

# SVG content
svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 150">
  <style>
    .logo-text { font-family: Arial, sans-serif; font-weight: bold; fill: white; font-size: 120px; }
    .logo-text-ai { font-family: Arial, sans-serif; font-weight: bold; fill: white; font-size: 80px; }
    .pixel { fill: white; }
  </style>
  
  <!-- Text "Block" -->
  <text x="50" y="110" class="logo-text">Block</text>
  
  <!-- Text "AI" -->
  <text x="360" y="110" class="logo-text-ai">AI</text>
  
  <!-- Pixels -->
  <rect x="50" y="30" width="20" height="20" class="pixel" />
  <rect x="80" y="30" width="20" height="20" class="pixel" />
  <rect x="110" y="30" width="20" height="20" class="pixel" />
  
  <rect x="170" y="60" width="20" height="20" class="pixel" />
  <rect x="200" y="60" width="20" height="20" class="pixel" />
  
  <rect x="290" y="80" width="20" height="20" class="pixel" />
  <rect x="320" y="40" width="20" height="20" class="pixel" />
  
  <rect x="410" y="50" width="20" height="20" class="pixel" />
  <rect x="440" y="80" width="20" height="20" class="pixel" />
</svg>'''

# Function to convert SVG to PNG
def svg_to_png(svg_content, output_path, width, height):
    png_data = cairosvg.svg2png(bytestring=svg_content.encode('utf-8'), 
                                output_width=width, 
                                output_height=height)
    img = Image.open(io.BytesIO(png_data))
    img.save(output_path)
    print(f"Generated: {output_path}")

# Generate small logo for navbar
svg_to_png(svg_content, 'static/img/blockai-logo.png', 120, 40)

# Generate large logo for homepage
svg_to_png(svg_content, 'static/img/blockai-logo-large.png', 300, 100)

print("Logo generation complete!")
