# generate_logos_patched.py
import os
import sys

# Apply the patch before importing cairocffi
import cairo_patch

try:
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

except Exception as e:
    print(f"Error: {e}")
    print("Falling back to Pillow for logo generation...")
    
    # Fall back to Pillow if cairosvg fails
    from PIL import Image, ImageDraw, ImageFont

    def create_logo(width, height, output_path):
        # Create a black background
        image = Image.new('RGB', (width, height), (0, 0, 0))
        draw = ImageDraw.Draw(image)
        
        # Draw a border
        draw.rectangle([(0, 0), (width-1, height-1)], outline=(50, 50, 50))
        
        # Calculate sizes based on image dimensions
        pixel_size = max(4, int(width / 30))
        spacing = max(2, int(pixel_size / 2))
        text_size = max(12, int(height / 3))
        
        # Use default font
        font = ImageFont.load_default()
        
        # Draw "Block" text in white
        block_text = "Block"
        block_position = (int(width * 0.1), int(height * 0.5))
        draw.text(block_position, block_text, fill=(255, 255, 255), font=font)
        
        # Draw "AI" text in blue
        ai_position = (int(width * 0.6), int(height * 0.5))
        draw.text(ai_position, "AI", fill=(68, 68, 255), font=font)
        
        # Add some pixel blocks to represent the BlockAI logo
        start_x = int(width * 0.1)
        start_y = int(height * 0.2)
        
        for i in range(3):
            x = start_x + i * (pixel_size + spacing)
            draw.rectangle(
                [(x, start_y), (x + pixel_size, start_y + pixel_size)], 
                fill=(255, 255, 255)
            )
        
        # Save the image
        image.save(output_path)
        print(f"Generated: {output_path}")

    # Generate small logo for navbar
    create_logo(120, 40, 'static/img/blockai-logo.png')

    # Generate large logo for homepage
    create_logo(300, 100, 'static/img/blockai-logo-large.png')

    print("Logo generation complete (fallback method)!")