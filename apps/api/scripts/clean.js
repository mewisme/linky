import fs from 'fs'
import path from 'path'

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return

  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file)
    if (fs.statSync(full).isDirectory()) {
      removeEmptyDirs(full)
    }
  }

  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir)
  }
}

removeEmptyDirs("dist");