import { useState, useEffect, useRef } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { css } from '@codemirror/lang-css'
import { EditorView, Decoration, DecorationSet } from '@codemirror/view'
import { ConversionSettings, ConversionResult } from './types'
import { convertCSS } from './utils/converter'
import { formatCSS, minifyCSS } from './utils/codeFormatter'
import { StateField, StateEffect } from '@codemirror/state'

// Custom effect for updating diff decorations
const addDiff = StateEffect.define<{ from: number; to: number; type: 'add' | 'remove' }>()
const clearDiffs = StateEffect.define<null>()

// State field to store decorations
const diffField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none
  },
  update(decorations, tr) {
    decorations = decorations.map(tr.changes)

    for (const e of tr.effects) {
      if (e.is(clearDiffs)) {
        decorations = Decoration.none
      } else if (e.is(addDiff) && e.value.from < e.value.to) {
        decorations = decorations.update({
          add: [
            Decoration.mark({
              class: `cm-diff-${e.value.type}`,
            }).range(e.value.from, e.value.to),
          ],
        })
      }
    }
    return decorations
  },
  provide: (f) => EditorView.decorations.from(f),
})

// Styles for diff highlighting
const diffTheme = EditorView.baseTheme({
  '.cm-diff-add': { backgroundColor: 'rgba(0, 255, 0, 0.2)', textDecoration: 'underline' },
  '.cm-diff-remove': { backgroundColor: 'rgba(255, 0, 0, 0.2)', textDecoration: 'line-through' },
})

function App() {
  const [code, setCode] = useState('')
  const [settings, setSettings] = useState<ConversionSettings>({
    basePixelSize: 16,
    targetUnit: 'rem',
    precision: 2,
  })
  const [result, setResult] = useState<ConversionResult>({
    originalCode: '',
    convertedCode: '',
    errors: [],
  })
  const [showDiff, setShowDiff] = useState(false)
  const [isPrettierLoading, setIsPrettierLoading] = useState(true)
  const [isFormatting, setIsFormatting] = useState(false)
  const inputEditorRef = useRef<EditorView | null>(null)
  const outputEditorRef = useRef<EditorView | null>(null)

  // Track the last state before formatting/minifying
  const [lastState, setLastState] = useState('')

  // Function to compute and apply diff decorations
  const applyDiffDecorations = (view: EditorView | null, oldText: string, newText: string) => {
    if (!view || !oldText || !newText) return

    // First, clear any existing decorations
    view.dispatch({ effects: clearDiffs.of(null) })

    const oldLines = oldText.split('\n')
    const newLines = newText.split('\n')
    const effects: StateEffect<unknown>[] = []

    let pos = 0
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      const oldLine = oldLines[i] || ''
      const newLine = newLines[i] || ''

      if (oldLine !== newLine) {
        // Find the specific changes within the line
        const oldParts = oldLine.split(':')
        const newParts = newLine.split(':')

        if (oldParts.length === 2 && newParts.length === 2) {
          const oldValue = oldParts[1].trim()
          const newValue = newParts[1].trim()

          if (oldValue !== newValue) {
            // Calculate the position of the value in the line
            const valueStartPos = pos + newLine.indexOf(newValue)
            const valueEndPos = valueStartPos + newValue.length

            effects.push(addDiff.of({
              from: valueStartPos,
              to: valueEndPos,
              type: 'add'
            }))
          }
        } else {
          // If we can't split the line (not a property:value pair), highlight the whole line
          effects.push(addDiff.of({
            from: pos,
            to: pos + newLine.length,
            type: oldLine ? 'add' : 'remove'
          }))
        }
      }
      pos += newLine.length + 1 // +1 for newline
    }

    if (effects.length > 0) {
      view.dispatch({ effects })
    }
  }

  // Initialize Prettier
  useEffect(() => {
    const loadPrettier = async () => {
      try {
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/prettier@2.8.8/standalone.js'
        document.head.appendChild(script)

        const parserScript = document.createElement('script')
        parserScript.src = 'https://unpkg.com/prettier@2.8.8/parser-postcss.js'
        document.head.appendChild(parserScript)

        await new Promise<void>((resolve) => {
          parserScript.onload = () => resolve()
        })

        setIsPrettierLoading(false)
      } catch (error) {
        console.error('Failed to load Prettier:', error)
        setResult(prev => ({
          ...prev,
          errors: [...prev.errors, 'Failed to load code formatting tools. Some features may be unavailable.'],
        }))
        setIsPrettierLoading(false)
      }
    }

    loadPrettier()
  }, [])

  // Effect to handle diff highlighting
  useEffect(() => {
    if (showDiff) {
      if (code) {
        applyDiffDecorations(inputEditorRef.current, lastState, code)
      }
      if (result.convertedCode) {
        applyDiffDecorations(outputEditorRef.current, lastState, result.convertedCode)
      }
    }
  }, [showDiff, lastState, result.convertedCode, code])

  const handleConvert = () => {
    setLastState(code)
    const conversionResult = convertCSS(code, settings)
    setResult(conversionResult)
    setShowDiff(true)
  }

  const handleFormat = async () => {
    if (isPrettierLoading) return

    setIsFormatting(true)

    try {
      const formattingResult = await formatCSS(code)
      // First update the code
      setCode(formattingResult.formattedCode)
      setResult(prev => ({
        ...prev,
        errors: formattingResult.errors,
      }))
      // Then set up diff highlighting with the formatted code as the base
      setLastState(formattingResult.formattedCode)
      setShowDiff(false)
    } finally {
      setIsFormatting(false)
    }
  }

  const handleMinify = () => {
    setLastState(code)
    const minificationResult = minifyCSS(code)
    setCode(minificationResult.formattedCode)
    setResult(prev => ({
      ...prev,
      errors: minificationResult.errors,
    }))
    setShowDiff(true)
  }

  const handleOutputFormat = async () => {
    if (isPrettierLoading) return

    setIsFormatting(true)
    setLastState(result.convertedCode)

    try {
      const formattingResult = await formatCSS(result.convertedCode)
      setResult(prev => ({
        ...prev,
        convertedCode: formattingResult.formattedCode,
        errors: formattingResult.errors,
      }))
      setShowDiff(true)
    } finally {
      setIsFormatting(false)
    }
  }

  const handleOutputMinify = () => {
    setLastState(result.convertedCode)
    const minificationResult = minifyCSS(result.convertedCode)
    setResult(prev => ({
      ...prev,
      convertedCode: minificationResult.formattedCode,
      errors: minificationResult.errors,
    }))
    setShowDiff(true)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.convertedCode)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Responsive CSS Converter</h1>
          <p className="mt-2 text-muted-foreground">
            Convert pixel values to responsive units
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <label htmlFor="baseSize" className="text-sm font-medium">
                  Base Pixel Size
                </label>
                <input
                  id="baseSize"
                  type="number"
                  value={settings.basePixelSize}
                  onChange={(e) =>
                    setSettings({ ...settings, basePixelSize: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label htmlFor="targetUnit" className="text-sm font-medium">
                  Target Unit
                </label>
                <select
                  id="targetUnit"
                  value={settings.targetUnit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      targetUnit: e.target.value as ConversionSettings['targetUnit'],
                    })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  <option value="rem">rem</option>
                  <option value="em">em</option>
                  <option value="%">%</option>
                  <option value="vw">vw</option>
                  <option value="vh">vh</option>
                </select>
              </div>
              <div className="flex-1 space-y-2">
                <label htmlFor="precision" className="text-sm font-medium">
                  Precision
                </label>
                <input
                  id="precision"
                  type="number"
                  min="0"
                  max="4"
                  value={settings.precision}
                  onChange={(e) =>
                    setSettings({ ...settings, precision: Number(e.target.value) })
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Input CSS</label>
                <div className="flex items-center">
                  <button
                    onClick={handleFormat}
                    disabled={isPrettierLoading || isFormatting}
                    className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    title={isPrettierLoading ? "Loading formatter..." : "Format CSS code"}
                  >
                    {isFormatting ? 'Formatting...' : 'Format'}
                  </button>
                  <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
                  <button
                    onClick={handleMinify}
                    className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90"
                    title="Minify CSS code"
                  >
                    Minify
                  </button>
                </div>
              </div>
              <div className="rounded-md border">
                <CodeMirror
                  value={code}
                  height="400px"
                  extensions={[css(), diffTheme, diffField]}
                  onChange={(value, viewUpdate) => {
                    setCode(value)
                    setShowDiff(false)
                    if (viewUpdate.view) {
                      inputEditorRef.current = viewUpdate.view
                    }
                  }}
                  theme="dark"
                  className="overflow-hidden rounded-md"
                />
              </div>
            </div>

            <button
              onClick={handleConvert}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Convert
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Output CSS</label>
              <div className="flex items-center">
                <button
                  onClick={handleOutputFormat}
                  disabled={isPrettierLoading || isFormatting}
                  className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  title={isPrettierLoading ? "Loading formatter..." : "Format converted CSS"}
                >
                  {isFormatting ? 'Formatting...' : 'Format'}
                </button>
                <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
                <button
                  onClick={handleOutputMinify}
                  className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90"
                  title="Minify converted CSS"
                >
                  Minify
                </button>
                <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
                {showDiff && (
                  <>
                    <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
                    <button
                      onClick={() => setShowDiff(false)}
                      className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90"
                      title="Hide diff highlighting"
                    >
                      Hide Diff
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-md border">
              <CodeMirror
                value={result.convertedCode}
                height="400px"
                extensions={[css(), diffTheme, diffField]}
                readOnly
                theme="dark"
                className="overflow-hidden rounded-md"
                onUpdate={(viewUpdate) => {
                  if (viewUpdate.view) {
                    outputEditorRef.current = viewUpdate.view
                  }
                }}
              />
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-md bg-destructive/10 p-4">
                <h3 className="font-medium text-destructive">Conversion Errors</h3>
                <ul className="mt-2 list-inside list-disc text-sm text-destructive">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
