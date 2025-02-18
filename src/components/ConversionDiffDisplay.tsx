import { ConversionStats } from '../types';
import { useState, useMemo } from 'react';

interface ConversionDiffDisplayProps {
  stats?: ConversionStats;
}

const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 }
};

const PREVIEW_SCALE = {
  mobile: 1,
  tablet: 0.5,
  desktop: 0.2
};

export function ConversionDiffDisplay({ stats }: ConversionDiffDisplayProps) {
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedViewport, setSelectedViewport] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');

  // Get preview values for the selected viewport
  const previewValues = useMemo(() => {
    if (!stats) return null;

    const viewport = VIEWPORT_SIZES[selectedViewport];
    const scale = PREVIEW_SCALE[selectedViewport];
    const previewableProperties = (stats.diffs || []).filter(diff => {
      const prop = diff.property?.toLowerCase() || '';
      return (
        prop.includes('width') ||
        prop.includes('height') ||
        prop.includes('padding') ||
        prop.includes('margin') ||
        prop.includes('font-size') ||
        prop.includes('gap')
      );
    });

    // Group by property type
    const grouped = previewableProperties.reduce((acc, diff) => {
      const prop = diff.property?.toLowerCase() || '';
      if (prop.includes('width')) acc.widths.push(diff);
      if (prop.includes('height')) acc.heights.push(diff);
      if (prop.includes('padding')) acc.spacing.push(diff);
      if (prop.includes('margin')) acc.spacing.push(diff);
      if (prop.includes('font-size')) acc.typography.push(diff);
      if (prop.includes('gap')) acc.spacing.push(diff);
      return acc;
    }, {
      widths: [] as typeof previewableProperties,
      heights: [] as typeof previewableProperties,
      spacing: [] as typeof previewableProperties,
      typography: [] as typeof previewableProperties
    });

    return {
      viewport,
      scale,
      properties: grouped
    };
  }, [stats, selectedViewport]);

  if (!stats?.totalConversions) {
    return null;
  }

  // Calculate property breakdown for most affected properties section
  const propertyBreakdown = stats.diffs.reduce((acc, diff) => {
    const property = diff.property || 'unknown';
    acc[property] = (acc[property] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort property breakdown for display (top 5)
  const topProperties = Object.entries(propertyBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // Default values for new stats properties
  const baseValues = stats.baseValues || {
    fontSize: 16,
    viewportWidth: 1920,
    viewportHeight: 1080
  };

  const categoryBreakdown = stats.categoryBreakdown || {
    layout: 0,
    typography: 0,
    spacing: 0,
    other: 0
  };

  return (
    <div className="mt-4 space-y-4">
      {/* Summary Section */}
      <div className="rounded-lg bg-card shadow-sm border border-border">
        <div className="p-4 border-b border-border bg-muted/30">
          <button
            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Conversion Summary</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {stats.totalConversions} values
              </span>
            </div>
            <span className="text-muted-foreground hover:text-foreground transition-colors">
              {isSummaryOpen ? '▼' : '▶'}
            </span>
          </button>
        </div>

        {isSummaryOpen && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(275px,1fr))] gap-6">
              {/* Base Values Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="flex-shrink-0">Base Values</span>
                  <div className="h-px flex-1 bg-border"></div>
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                    <span className="text-muted-foreground">Root Font Size</span>
                    <span className="font-medium text-foreground ml-4">{baseValues.fontSize}px</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                    <span className="text-muted-foreground">Viewport Width</span>
                    <span className="font-medium text-foreground ml-4">{baseValues.viewportWidth}px</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                    <span className="text-muted-foreground">Viewport Height</span>
                    <span className="font-medium text-foreground ml-4">{baseValues.viewportHeight}px</span>
                  </div>
                </div>
              </div>

              {/* Impact Analysis */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="flex-shrink-0">Impact Analysis</span>
                  <div className="h-px flex-1 bg-border"></div>
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                    <span className="text-muted-foreground">Responsive Impact</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-medium text-foreground tabular-nums">{stats.responsiveBreakpointImpact || 0}</span>
                      {(stats.responsiveBreakpointImpact || 0) > 0 && (
                        <span className="text-warning flex-shrink-0">⚠️</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                    <span className="text-muted-foreground">Accessibility Issues</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-medium text-foreground tabular-nums">{stats.accessibilityIssues || 0}</span>
                      {(stats.accessibilityIssues || 0) > 0 && (
                        <span className="text-destructive flex-shrink-0">⚠️</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                    <span className="text-muted-foreground">Needs Review</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-medium text-foreground tabular-nums">{stats.needsReviewCount || 0}</span>
                      {(stats.needsReviewCount || 0) > 0 && (
                        <span className="text-warning flex-shrink-0">⚠️</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Categories */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <span className="flex-shrink-0">Property Categories</span>
                  <div className="h-px flex-1 bg-border"></div>
                </h4>
                <div className="space-y-3">
                  {Object.entries(categoryBreakdown).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center p-2 rounded-md bg-muted/30">
                      <span className="text-muted-foreground capitalize truncate min-w-[80px]">{category}</span>
                      <div className="flex items-center gap-2 ml-4">
                        <div className="w-24 h-2 bg-background rounded-full overflow-hidden flex-shrink-0">
                          <div
                            className="h-full bg-primary/50 rounded-full"
                            style={{
                              width: `${(count / stats.totalConversions) * 100}%`
                            }}
                          />
                        </div>
                        <span className="font-medium text-foreground tabular-nums w-10 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Values Needing Review */}
            {(stats.needsReviewCount || 0) > 0 && (
              <div className="mt-8 rounded-lg border border-warning/30 bg-warning/5 overflow-hidden">
                <button
                  onClick={() => setIsReviewOpen(!isReviewOpen)}
                  className="flex items-center justify-between w-full p-4 border-b border-warning/20 hover:bg-warning/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-warning">⚠️</span>
                    <h4 className="font-medium text-warning">Values Needing Review</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-warning/80">
                      {stats.needsReviewCount} values to review
                    </span>
                    <span className="text-warning">
                      {isReviewOpen ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {isReviewOpen && (
                  <div className="p-4 space-y-3">
                    {stats.diffs
                      .filter(diff => diff.needsReview)
                      .map((diff, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 rounded-md bg-warning/10 border border-warning/20">
                          <span className="text-warning mt-0.5">⚠️</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-warning">Line {diff.line}</span>
                              <span className="text-muted-foreground">•</span>
                              <code className="px-1.5 py-0.5 rounded bg-muted/50 font-mono text-sm">
                                {diff.property}
                              </code>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm">
                              <code className="line-through text-muted-foreground">{diff.original}</code>
                              <span className="text-muted-foreground">→</span>
                              <code className="text-foreground">{diff.converted}</code>
                            </div>
                            {diff.reviewReason && (
                              <p className="mt-2 text-sm text-warning/80">
                                {diff.reviewReason}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Viewport Preview */}
            <div className="mt-6">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Size Preview
              </h4>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => setSelectedViewport('mobile')}
                    className={`px-3 py-1 rounded ${selectedViewport === 'mobile' ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/10'
                      }`}
                  >
                    Mobile
                  </button>
                  <button
                    onClick={() => setSelectedViewport('tablet')}
                    className={`px-3 py-1 rounded ${selectedViewport === 'tablet' ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/10'
                      }`}
                  >
                    Tablet
                  </button>
                  <button
                    onClick={() => setSelectedViewport('desktop')}
                    className={`px-3 py-1 rounded ${selectedViewport === 'desktop' ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/10'
                      }`}
                  >
                    Desktop
                  </button>
                </div>

                <div className="relative h-64 bg-background rounded-md overflow-hidden border border-border">
                  {previewValues ? (
                    <div className="absolute inset-0 flex flex-col">
                      <div className="p-4 border-b border-border bg-muted/50">
                        <div className="text-xs text-muted-foreground">
                          Viewport: {previewValues.viewport.width}x{previewValues.viewport.height}
                        </div>
                      </div>

                      <div className="p-4 overflow-y-auto">
                        {/* Width Examples */}
                        {previewValues.properties.widths.length > 0 && (
                          <div className="mb-6">
                            <div className="text-xs text-muted-foreground mb-2">Width Examples:</div>
                            <div className="space-y-3">
                              {previewValues.properties.widths.slice(0, 2).map((diff, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div
                                    className="h-4 bg-primary/20 rounded"
                                    style={{
                                      width: `calc(${diff.converted} * ${previewValues.scale})`,
                                      minWidth: '4px'
                                    }}
                                  />
                                  <span className="text-xs whitespace-nowrap">
                                    {diff.property}: {diff.original} → {diff.converted}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Typography Examples */}
                        {previewValues.properties.typography.length > 0 && (
                          <div className="mb-6">
                            <div className="text-xs text-muted-foreground mb-2">Typography Examples:</div>
                            <div className="space-y-3">
                              {previewValues.properties.typography.slice(0, 2).map((diff, i) => {
                                const scaledSize = `max(8px, calc(${diff.converted} * ${previewValues.scale}))`;
                                return (
                                  <div key={i}>
                                    <span style={{ fontSize: scaledSize }}>
                                      Sample Text ({diff.original} → {diff.converted})
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Spacing Examples */}
                        {previewValues.properties.spacing.length > 0 && (
                          <div className="mb-6">
                            <div className="text-xs text-muted-foreground mb-2">Spacing Examples:</div>
                            <div className="space-y-3">
                              {previewValues.properties.spacing.slice(0, 2).map((diff, i) => (
                                <div key={i} className="flex items-center gap-2">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 bg-primary/20" />
                                    <div
                                      className="h-8 bg-muted"
                                      style={{
                                        width: `calc(${diff.converted} * ${previewValues.scale})`,
                                        minWidth: '4px'
                                      }}
                                    />
                                    <div className="w-8 h-8 bg-primary/20" />
                                  </div>
                                  <span className="text-xs whitespace-nowrap">
                                    {diff.property}: {diff.original} → {diff.converted}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      No previewable values found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Most Affected Properties */}
            <div className="mt-4">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Most Affected Properties
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {topProperties.map(([property, count]) => (
                  <div key={property} className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary/50 rounded-full"
                        style={{
                          width: `${(count / stats.totalConversions) * 100}%`
                        }}
                      />
                    </div>
                    <div className="flex items-baseline justify-end min-w-[120px] font-medium">
                      <span className="truncate flex-1 text-right">{property}</span>
                      <span className="text-muted-foreground px-2">:</span>
                      <span className="tabular-nums w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conversion Details Section */}
      <div className="rounded-md bg-muted p-4 text-sm">
        <button
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-medium">Conversion Details</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {stats.diffs.length} changes
            </span>
            <span className="text-muted-foreground">
              {isDetailsOpen ? '▼' : '▶'}
            </span>
          </div>
        </button>

        {isDetailsOpen && (
          <div className="mt-4 space-y-2">
            {stats.diffs.map((diff, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Line {diff.line}</span>
                    <span className="font-medium">{diff.property}</span>
                    {diff.needsReview && <span className="text-warning">⚠️</span>}
                    {diff.impactsAccessibility && <span className="text-destructive">⚠️</span>}
                    {diff.impactsResponsiveness && <span className="text-warning">⚠️</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-muted-foreground line-through">{diff.original}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-foreground">{diff.converted}</span>
                  </div>
                  {(diff.needsReview || diff.impactsAccessibility || diff.impactsResponsiveness) && (
                    <div className="mt-1 text-xs space-y-1">
                      {diff.needsReview && (
                        <div className="text-warning">{diff.reviewReason}</div>
                      )}
                      {diff.impactsAccessibility && (
                        <div className="text-destructive">May impact accessibility</div>
                      )}
                      {diff.impactsResponsiveness && (
                        <div className="text-warning">May impact responsive behavior</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 