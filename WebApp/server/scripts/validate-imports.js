const fs = require('fs');
const path = require('path');

const validateImports = () => {
  const routesDir = path.join(__dirname, '../src/routes');
  const middlewareDir = path.join(__dirname, '../src/middleware');
  
  console.log('🔍 Validating imports...');
  
  // Check auth middleware usage
  const authMiddlewarePath = path.join(middlewareDir, 'auth.js');
  const authContent = fs.readFileSync(authMiddlewarePath, 'utf8');
  
  // Find what's exported
  const exportMatch = authContent.match(/module\.exports\s*=\s*{([^}]+)}/);
  if (!exportMatch) {
    console.error('❌ Could not find exports in auth middleware');
    return false;
  }
  
  const exportedNames = exportMatch[1].split(',').map(e => e.trim());
  console.log('✅ Auth middleware exports:', exportedNames.join(', '));
  
  // Check all route files
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
  let hasErrors = false;
  
  routeFiles.forEach(file => {
    const filePath = path.join(routesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for auth middleware imports
    const importMatch = content.match(/const\s*{\s*([^}]+)\s*}\s*=\s*require\(['"]\.\.\/middleware\/auth['"]\)/);
    if (importMatch) {
      const importedNames = importMatch[1].split(',').map(i => i.trim());
      
      importedNames.forEach(imported => {
        if (!exportedNames.includes(imported)) {
          console.error(`❌ ${file}: Trying to import '${imported}' but auth middleware doesn't export it`);
          hasErrors = true;
        }
      });
    }
  });
  
  if (!hasErrors) {
    console.log('✅ All imports validated successfully');
    return true;
  }
  
  return false;
};

// Run validation
if (!validateImports()) {
  console.error('❌ Import validation failed. Please fix the errors above.');
  process.exit(1);
} else {
  console.log('✅ Import validation passed');
  process.exit(0);
}