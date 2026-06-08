import { Router, Request, Response } from 'express'

const router = Router()

const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp']

router.post('/', async (req: Request, res: Response) => {
  const { image, mediaType, context } = req.body

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image is required' })
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: 'mediaType must be image/png, image/jpeg, or image/webp' })
  }

  // OpenRouter call will be added in Task 4
  return res.status(501).json({ error: 'Not implemented' })
})

export default router
