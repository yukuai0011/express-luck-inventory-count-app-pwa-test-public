import { Html5Qrcode } from 'html5-qrcode'

export function useScanner() {
  const isScanning = useState<boolean>('isScanning', () => false)
  let scanner: Html5Qrcode | null = null

  async function startScan(
    elementId: string,
    onDetect: (text: string) => void,
    onError?: (err: string) => void,
  ) {
    if (isScanning.value) return
    scanner = new Html5Qrcode(elementId)
    isScanning.value = true
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onDetect(decodedText)
          stopScan()
        },
        () => {},
      )
    } catch (err: unknown) {
      isScanning.value = false
      onError?.(err instanceof Error ? err.message : String(err))
    }
  }

  async function stopScan() {
    if (scanner && isScanning.value) {
      try {
        await scanner.stop()
      } catch {}
    }
    isScanning.value = false
    scanner = null
  }

  return { isScanning, startScan, stopScan }
}