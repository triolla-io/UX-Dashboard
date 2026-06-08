interface Props {
  feedback: string
  error: string | null
  onReset: () => void
}
export default function ResultScreen({ feedback, error, onReset }: Props) {
  return <div data-testid="result-screen" />
}
