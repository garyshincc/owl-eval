const fs = require('fs')
const path = require('path')

// Parse command line arguments
const args = process.argv.slice(2)
const dirIndex = args.indexOf('--dir')
const helpIndex = args.indexOf('--help')

if (helpIndex !== -1 || dirIndex === -1 || !args[dirIndex + 1]) {
  console.log(`
Upload Videos to Library CLI

Usage:
  npm run upload-videos --dir <directory>

Options:
  --dir <directory>  Directory containing video files to upload
  --help            Show this help message

Examples:
  npm run upload-videos --dir ./generated-videos
  npm run upload-videos --dir ./data/experiments/my-experiment
`)
  process.exit(helpIndex !== -1 ? 0 : 1)
}

const videoDir = args[dirIndex + 1]

// Check if directory exists
if (!fs.existsSync(videoDir)) {
  console.error(`❌ Directory not found: ${videoDir}`)
  process.exit(1)
}

// Get all video files from directory
const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
const videoFiles = fs.readdirSync(videoDir)
  .filter(file => videoExtensions.some(ext => file.toLowerCase().endsWith(ext)))
  .map(file => path.join(videoDir, file))

if (videoFiles.length === 0) {
  console.error(`❌ No video files found in: ${videoDir}`)
  process.exit(1)
}

console.log(`📁 Found ${videoFiles.length} video files in ${videoDir}`)

const { spawn } = require('child_process')

function uploadVideo(filePath) {
  return new Promise((resolve) => {
    const fileName = path.basename(filePath)
    console.log(`📤 Uploading: ${fileName}`)
    
    const curl = spawn('curl', [
      '-X', 'POST',
      '-F', `video=@${filePath}`,
      '-F', 'libraryUpload=true',
      'http://localhost:3000/api/video-library/upload'
    ])
    
    let output = ''
    let error = ''
    
    curl.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    curl.stderr.on('data', (data) => {
      error += data.toString()
    })
    
    curl.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output)
          console.log(`✅ Uploaded: ${fileName} -> ${result.videoUrl}`)
          resolve({
            success: true,
            fileName,
            url: result.videoUrl,
            key: result.key
          })
        } catch (parseError) {
          console.error(`❌ Failed to parse response for ${fileName}`)
          resolve({
            success: false,
            fileName,
            error: 'Failed to parse response'
          })
        }
      } else {
        console.error(`❌ Failed to upload ${fileName}: ${error}`)
        resolve({
          success: false,
          fileName,
          error: error || `curl exited with code ${code}`
        })
      }
    })
  })
}

async function uploadAllVideos() {
  console.log(`\n🚀 Starting upload of ${videoFiles.length} videos...\n`)
  
  const results = []
  
  for (const filePath of videoFiles) {
    const result = await uploadVideo(filePath)
    results.push(result)
    
    // Small delay between uploads to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Summary
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`\n📊 Upload Summary:`)
  console.log(`✅ Successful: ${successful.length}`)
  console.log(`❌ Failed: ${failed.length}`)
  
  if (successful.length > 0) {
    console.log(`\n📋 Uploaded Videos:`)
    successful.forEach(result => {
      console.log(`  • ${result.fileName}`)
    })
  }
  
  if (failed.length > 0) {
    console.log(`\n💥 Failed Uploads:`)
    failed.forEach(result => {
      console.log(`  • ${result.fileName}: ${result.error}`)
    })
  }
  
  console.log(`\n🎉 Upload complete! Videos are now available in the Video Library.`)
}

uploadAllVideos().catch(error => {
  console.error('❌ Upload process failed:', error)
  process.exit(1)
})