const { S3Client, PutBucketPolicyCommand } = require('@aws-sdk/client-s3')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env files
function loadEnvFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const envContent = fs.readFileSync(filePath, 'utf8')
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=')
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim()
          if (!process.env[key]) { // Don't override existing env vars
            process.env[key] = value
          }
        }
      })
      console.log(`✅ Loaded environment from: ${filePath}`)
    }
  } catch (error) {
    console.log(`⚠️  Could not load ${filePath}: ${error.message}`)
  }
}

// Load .env files in order of preference
loadEnvFile(path.join(__dirname, '../.env.local'))
loadEnvFile(path.join(__dirname, '../.env'))

const client = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3 || 'https://fly.storage.tigris.dev',
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
})

const bucketName = process.env.TIGRIS_BUCKET_NAME || 'eval-data'

const policy = {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadEvaluationContent",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        `arn:aws:s3:::${bucketName}/video-library/*`,
        `arn:aws:s3:::${bucketName}/experiments/*`
      ]
    }
  ]
}

async function setBucketPolicy() {
  try {
    console.log(`\nSetting bucket policy for: ${bucketName}`)
    console.log(`Endpoint: ${process.env.AWS_ENDPOINT_URL_S3}`)
    console.log(`Region: ${process.env.AWS_REGION}`)
    console.log(`Access Key ID: ${process.env.AWS_ACCESS_KEY_ID ? '***' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'NOT SET'}`)
    console.log(`Secret Key: ${process.env.AWS_SECRET_ACCESS_KEY ? '***' + process.env.AWS_SECRET_ACCESS_KEY.slice(-4) : 'NOT SET'}`)
    
    // Check required environment variables
    const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY']
    const missingVars = requiredVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      console.error(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`)
      console.log('\n💡 Make sure your .env file contains:')
      missingVars.forEach(varName => console.log(`${varName}=your_value_here`))
      process.exit(1)
    }
    
    console.log('\nPolicy to apply:')
    console.log(JSON.stringify(policy, null, 2))
    
    const command = new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy)
    })

    await client.send(command)
    
    console.log('\n✅ Bucket policy applied successfully!')
    console.log('\nThis allows public read access to:')
    console.log(`- ${bucketName}/video-library/* (uploaded videos)`)
    console.log(`- ${bucketName}/experiments/* (experiment videos)`)
    
    console.log('\n🧪 Test by accessing a video URL in your browser:')
    console.log(`https://fly.storage.tigris.dev/${bucketName}/video-library/your-video.mp4`)
    
  } catch (error) {
    console.error('❌ Failed to set bucket policy:', error)
    
    if (error.name === 'NoSuchBucket') {
      console.log(`\n💡 Bucket "${bucketName}" doesn't exist. Create it first.`)
    } else if (error.name === 'InvalidAccessKeyId') {
      console.log('\n💡 Check your AWS_ACCESS_KEY_ID in .env file')
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log('\n💡 Check your AWS_SECRET_ACCESS_KEY in .env file')
    }
    
    process.exit(1)
  }
}

setBucketPolicy()