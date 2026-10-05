const fs = require('fs');
const path = require('path');

function removeDirectory(directory) {
  fs.readdirSync(directory).forEach((entry) => {
    const entryPath = path.join(directory, entry);
    if (fs.statSync(entryPath).isDirectory()) {
      removeDirectory(entryPath);
    } else {
      fs.unlinkSync(entryPath);
    }
  });
  fs.rmdirSync(directory);
}

module.exports = {
  removeDirectory
};
