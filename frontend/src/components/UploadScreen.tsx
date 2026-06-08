interface Props {
  onSubmit: (image: string, mediaType: string, context: string) => void
}
export default function UploadScreen({ onSubmit }: Props) {
  return <div data-testid="upload-screen" />
}
