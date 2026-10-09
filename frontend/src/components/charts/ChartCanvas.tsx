import { useEffect, useRef, type CanvasHTMLAttributes, type RefObject } from 'react'
import Chart from 'chart.js/auto'
import type { ChartConfiguration } from 'chart.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyChart = Chart<any, any, any>

interface ChartCanvasProps extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'children'> {
  /** Builds the chart configuration; receives the 2D context (for gradients). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createConfig: (ctx: CanvasRenderingContext2D) => ChartConfiguration<any, any, any>
  /** Re-create the chart when any of these change. */
  deps?: readonly unknown[]
  /** Receives the Chart instance (for in-place updates like the original pages did). */
  chartRef?: RefObject<AnyChart | null>
}

/** Plain Chart.js canvas - same API surface as the original `new Chart(canvas, config)` calls. */
export function ChartCanvas({ createConfig, deps = [], chartRef, ...canvasProps }: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const createConfigRef = useRef(createConfig)
  createConfigRef.current = createConfig

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let chart: AnyChart | null = null
    try {
      chart = new Chart(canvas, createConfigRef.current(ctx))
      if (chartRef) chartRef.current = chart
    } catch (error) {
      console.error('Failed to initialise chart:', error)
    }

    return () => {
      chart?.destroy()
      if (chartRef) chartRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return <canvas ref={canvasRef} {...canvasProps} />
}

export type { AnyChart }
