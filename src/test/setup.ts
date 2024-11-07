import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Create empty main.js and update package.json in obsidian module
(async () => {
  // Use the correct path by going up two levels from __dirname
  const obsidianModuleDir = join(__dirname, '../../node_modules/obsidian');
  const mainFilePath = join(obsidianModuleDir, 'main.js');

  try {
    // Ensure the directory exists
    mkdirSync(obsidianModuleDir, { recursive: true });

    // Create empty main.js file
    writeFileSync(mainFilePath, '');

    // Update package.json to point to main.js
    const packageJsonPath = join(obsidianModuleDir, 'package.json');
    const packageJson = (await import(packageJsonPath)).default;
    delete packageJson.main;
    packageJson.main = 'main.js';

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  } catch (error) {
    console.error('Error in test setup:', error);
    throw error;
  }
})();
