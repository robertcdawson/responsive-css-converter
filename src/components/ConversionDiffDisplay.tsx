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
      <div className="rounded-md bg-muted p-4 text-sm">
        <button
          onClick={() => setIsSummaryOpen(!isSummaryOpen)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="font-medium">Conversion Summary</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {stats.totalConversions} values converted
            </span>
            <span className="text-muted-foreground">
              {isSummaryOpen ? '▼' : '▶'}
            </span>
          </div>
        </button>

        {isSummaryOpen && (
          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Base Values Section */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Base Values
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Root Font Size:</span>
                    <span className="font-medium">{baseValues.fontSize}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Viewport Width:</span>
                    <span className="font-medium">{baseValues.viewportWidth}px</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Viewport Height:</span>
                    <span className="font-medium">{baseValues.viewportHeight}px</span>
                  </div>
                </div>
              </div>

              {/* Impact Analysis */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Impact Analysis
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Responsive Impact:</span>
                    <span className="font-medium">
                      {stats.responsiveBreakpointImpact || 0} values
                      {(stats.responsiveBreakpointImpact || 0) > 0 && (
                        <span className="ml-1 text-warning">⚠️</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accessibility Issues:</span>
                    <span className="font-medium">
                      {stats.accessibilityIssues || 0} issues
                      {(stats.accessibilityIssues || 0) > 0 && (
                        <span className="ml-1 text-destructive">⚠️</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Needs Review:</span>
                    <span className="font-medium">
                      {stats.needsReviewCount || 0} values
                      {(stats.needsReviewCount || 0) > 0 && (
                        <span className="ml-1 text-warning">⚠️</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Property Categories
                </h4>
                <div className="space-y-2">
                  {Object.entries(categoryBreakdown).map(([category, count]) => (
                    <div key={category} className="flex justify-between">
                      <span className="capitalize">{category}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Values Needing Review */}
            {(stats.needsReviewCount || 0) > 0 && (
              <div className="mt-6 p-4 bg-warning/10 rounded-md border border-warning">
                <button
                  onClick={() => setIsReviewOpen(!isReviewOpen)}
                  className="flex items-center justify-between w-full"
                >
                  <h4 className="text-xs uppercase tracking-wider text-warning">
                    Values Needing Review
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-warning">
                      {stats.needsReviewCount} values to review
                    </span>
                    <span className="text-warning">
                      {isReviewOpen ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {isReviewOpen && (
                  <div className="mt-4 space-y-2">
                    {stats.diffs
                      .filter(diff => diff.needsReview)
                      .map((diff, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <span>⚠️</span>
                          <div>
                            <div className="font-medium">
                              Line {diff.line}: {diff.property}
                            </div>
                            <div className="text-muted-foreground">
                              {diff.original} → {diff.converted}
                            </div>
                            {diff.reviewReason && (
                              <div className="text-warning text-xs mt-1">
                                {diff.reviewReason}
                              </div>
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
                    <span className="font-medium min-w-[100px]">
                      {property}: {count}
                    </span>
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