export type View = 'upload' | 'loading' | 'result'

export interface FeedbackState {
  view: View
  feedback: string
  error: string | null
}
