import { createImageWorker } from '../src/lib/queue'
import { generateImage } from '../src/lib/gemini'
import { uploadBase64Image } from '../src/lib/storage'

console.log('🔄 Image processor worker started')

const worker = createImageWorker(async (job) => {
    const { prompt, style, designId } = job.data
    console.log(`Processing job ${job.id}: "${prompt}" (${style})`)

    try {
        const base64Image = await generateImage({ prompt, style })
        const imageUrl = await uploadBase64Image(base64Image)

        console.log(`✅ Job ${job.id} complete: ${imageUrl}`)
        return { imageUrl, designId }
    } catch (error) {
        console.error(`❌ Job ${job.id} failed:`, error)
        throw error
    }
})

worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message)
})
