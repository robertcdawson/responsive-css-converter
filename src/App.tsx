import { useState, useEffect, useRef, Component } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { css } from '@codemirror/lang-css'
import { EditorView, Decoration, DecorationSet } from '@codemirror/view'
import { ConversionSettings, ConversionResult } from './types'
import { convertCSS } from './utils/converter'
import { formatCSS } from './utils/codeFormatter'
import { extractCSSFromURL } from './utils/cssExtractor'
import { StateField, StateEffect } from '@codemirror/state'
import { SAMPLE_CSS } from './utils/sampleData'
import { ConversionDiffDisplay } from './components/ConversionDiffDisplay'

/**
 * Error boundary component to handle runtime errors gracefully
 */
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      )
    }
    return this.props.children
  }
}

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
              attributes: { style: `background-color: ${e.value.type === 'add' ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 0, 0, 0.15)'}; text-decoration: ${e.value.type === 'add' ? 'underline' : 'line-through'} wavy ${e.value.type === 'add' ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 0, 0, 0.4)'}` }
            }).range(e.value.from, e.value.to),
          ],
        })
      }
    }
    return decorations
  },
  provide: (f) => EditorView.decorations.from(f),
})

// Remove the separate theme since we're applying styles directly in the decoration
const editorExtensions = [css(), diffField];

export function App() {
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
  const [isPrettierLoading, setIsPrettierLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const inputEditorRef = useRef<EditorView | null>(null)
  const outputEditorRef = useRef<EditorView | null>(null)

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

  const handleConvert = async () => {
    const conversionResult = convertCSS(code, settings);

    // First update the result state
    setResult(conversionResult);

    // Wait for a microtask to ensure the editor content is updated
    await Promise.resolve();

    // Apply diff highlighting
    if (inputEditorRef.current && outputEditorRef.current) {
      // Clear existing decorations
      inputEditorRef.current.dispatch({
        effects: clearDiffs.of(null)
      });
      outputEditorRef.current.dispatch({
        effects: clearDiffs.of(null)
      });

      // Add new decorations for each diff
      conversionResult.stats?.diffs.forEach(diff => {
        // Find the actual line in input editor
        const inputLines = code.split('\n');
        const outputLines = conversionResult.convertedCode.split('\n');

        // Search for the property in nearby lines (handle formatting differences)
        for (let i = Math.max(0, diff.line - 2); i <= Math.min(inputLines.length - 1, diff.line + 2); i++) {
          const inputLine = inputLines[i];
          if (inputLine && inputLine.includes(diff.property || '') && inputLine.includes(diff.original)) {
            const propertyStart = inputLine.indexOf(diff.property || '');
            const originalStart = inputLine.indexOf(diff.original, propertyStart);
            if (originalStart !== -1) {
              const inputLineStart = inputLines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
              const inputFrom = inputLineStart + originalStart;
              const inputTo = inputFrom + diff.original.length;

              // Verify position is within bounds
              if (inputEditorRef.current) {
                const inputDocLength = inputEditorRef.current.state.doc.length;
                if (inputFrom >= 0 && inputTo <= inputDocLength) {
                  inputEditorRef.current.dispatch({
                    effects: addDiff.of({ from: inputFrom, to: inputTo, type: 'remove' })
                  });
                }
              }
              break;
            }
          }
        }

        // Search for the converted value in output editor
        for (let i = Math.max(0, diff.line - 2); i <= Math.min(outputLines.length - 1, diff.line + 2); i++) {
          const outputLine = outputLines[i];
          if (outputLine && outputLine.includes(diff.property || '') && outputLine.includes(diff.converted)) {
            const propertyStart = outputLine.indexOf(diff.property || '');
            const convertedStart = outputLine.indexOf(diff.converted, propertyStart);
            if (convertedStart !== -1) {
              const outputLineStart = outputLines.slice(0, i).join('\n').length + (i > 0 ? 1 : 0);
              const outputFrom = outputLineStart + convertedStart;
              const outputTo = outputFrom + diff.converted.length;

              // Verify position is within bounds
              if (outputEditorRef.current) {
                const outputDocLength = outputEditorRef.current.state.doc.length;
                if (outputFrom >= 0 && outputTo <= outputDocLength) {
                  outputEditorRef.current.dispatch({
                    effects: addDiff.of({ from: outputFrom, to: outputTo, type: 'add' })
                  });
                }
              }
              break;
            }
          }
        }
      });
    }
  };

  const handleFormatInput = async () => {
    if (isPrettierLoading) return;

    try {
      const formattingResult = await formatCSS(code);
      if (formattingResult.errors.length === 0) {
        setCode(formattingResult.formattedCode);
      } else {
        setResult(prev => ({
          ...prev,
          errors: [...prev.errors, ...formattingResult.errors],
        }));
      }
    } catch (error) {
      setResult(prev => ({
        ...prev,
        errors: [...prev.errors, `Error formatting CSS: ${error instanceof Error ? error.message : String(error)}`],
      }));
    }
  };

  const handleFormatOutput = async () => {
    if (isPrettierLoading || !result.convertedCode) return;

    try {
      const formattingResult = await formatCSS(result.convertedCode);
      if (formattingResult.errors.length === 0) {
        setResult(prev => ({
          ...prev,
          convertedCode: formattingResult.formattedCode
        }));
      } else {
        setResult(prev => ({
          ...prev,
          errors: [...prev.errors, ...formattingResult.errors],
        }));
      }
    } catch (error) {
      setResult(prev => ({
        ...prev,
        errors: [...prev.errors, `Error formatting CSS: ${error instanceof Error ? error.message : String(error)}`],
      }));
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.convertedCode)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  // Error tracking function
  const trackError = (error: Error, context: string) => {
    console.error(`Error in ${context}:`, error);
    // In a production app, you would send this to your error tracking service
    // Example: Sentry.captureException(error, { extra: { context } });
  };

  const handleLoadDemo = () => {
    try {
      setCode(SAMPLE_CSS);
    } catch (error) {
      trackError(error as Error, 'handleLoadDemo');
    }
  };

  const handleURLExtract = async () => {
    if (!isValidURL(url)) {
      alert('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    try {
      const result = await extractCSSFromURL(url);
      if (result.errors.length > 0) {
        alert(result.errors.join('\n'));
      } else {
        setCode(result.originalCode);
      }
    } catch (error) {
      trackError(error as Error, 'handleURLExtract');
      alert('Failed to extract CSS from URL');
    } finally {
      setIsLoading(false);
    }
  };

  // URL validation
  const isValidURL = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  return (
    <ErrorBoundary>
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
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter website URL to extract CSS"
                  className="flex-1 px-3 py-2 border rounded-md text-foreground bg-background"
                />
                <button
                  onClick={handleURLExtract}
                  disabled={isLoading || !url}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                >
                  {isLoading ? 'Extracting...' : 'Extract CSS'}
                </button>
                <button
                  onClick={handleLoadDemo}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
                  title="Load sample CSS code"
                >
                  Demo
                </button>
              </div>
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
                    max="6"
                    step="1"
                    value={settings.precision}
                    onChange={(e) => {
                      const value = Math.min(6, Math.max(0, Math.floor(Number(e.target.value))));
                      setSettings({ ...settings, precision: value });
                    }}
                    onBlur={(e) => {
                      // Ensure empty input defaults to 0
                      if (e.target.value === '') {
                        setSettings({ ...settings, precision: 0 });
                      }
                    }}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Input CSS</label>
                  <button
                    onClick={handleFormatInput}
                    className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90"
                    title="Format input code"
                    disabled={isPrettierLoading}
                  >
                    Format
                  </button>
                </div>
                <div className="rounded-md border">
                  <CodeMirror
                    value={code}
                    height="400px"
                    extensions={editorExtensions}
                    onChange={(value) => {
                      setCode(value)
                    }}
                    ref={(instance) => {
                      if (instance?.view) {
                        inputEditorRef.current = instance.view;
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
                    onClick={handleFormatOutput}
                    className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90"
                    title="Format output code"
                    disabled={isPrettierLoading || !result.convertedCode}
                  >
                    Format
                  </button>
                  <div className="mx-2 h-4 w-px bg-border" aria-hidden="true" />
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center rounded-md px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/90"
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div className="rounded-md border">
                <CodeMirror
                  value={result.convertedCode}
                  height="400px"
                  extensions={editorExtensions}
                  readOnly
                  theme="dark"
                  className="overflow-hidden rounded-md"
                  ref={(instance) => {
                    if (instance?.view) {
                      outputEditorRef.current = instance.view;
                    }
                  }}
                />
              </div>

              <ConversionDiffDisplay stats={result.stats} />

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
    </ErrorBoundary>
  )
}

export default App
