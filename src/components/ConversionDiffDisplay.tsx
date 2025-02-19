import { ConversionStats } from '../types';
import { useState } from 'react';

interface ConversionDiffDisplayProps {
  stats?: ConversionStats;
}

export function ConversionDiffDisplay({ stats }: ConversionDiffDisplayProps) {
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  if (!stats?.totalConversions) {
    return null;
  }

  // Calculate property breakdown for most affected properties section
  const propertyBreakdown = stats.diffs.reduce((acc, diff) => {
    const property = diff.property || 'unknown';
    acc[property] = (acc[property] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate impact counts from diffs if not provided in stats
  const responsiveImpactCount = stats.diffs.filter(diff => diff.impactsResponsiveness).length;
  const accessibilityIssuesCount = stats.diffs.filter(diff => diff.impactsAccessibility).length;
  const explicitReviewCount = stats.diffs.filter(diff => diff.needsReview).length;

  // Total items needing review (including responsive and accessibility impacts)
  const needsReviewCount = stats.diffs.filter(diff =>
    diff.needsReview || diff.impactsResponsiveness || diff.impactsAccessibility
  ).length;

  // Sort property breakdown for display (top 5)
  const topProperties = Object.entries(propertyBreakdown)
    .sort(([, a], [, b]) => b - a);

  // Calculate total changes and "Other" category
  const totalChanges: number = topProperties.reduce((sum, [, count]) => sum + (count as number), 0);
  const top5Properties = topProperties.slice(0, 5);
  const otherCount: number = totalChanges - top5Properties.reduce((sum, [, count]) => sum + (count as number), 0);

  // Create display properties with sorted "other" category
  const displayProperties = otherCount > 0
    ? [...top5Properties, ['other', otherCount]].sort(([, a], [, b]) => (Number(b) - Number(a)))
    : top5Properties;

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
                    <span className="text-muted-foreground">Total Needs Review</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-medium text-foreground tabular-nums">{needsReviewCount}</span>
                      {needsReviewCount > 0 && (
                        <span className="text-warning flex-shrink-0">⚠️</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-md bg-muted/30 pl-6">
                    <span className="text-muted-foreground">└ Manual Review</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-medium text-foreground tabular-nums">{explicitReviewCount}</span>
                      {explicitReviewCount > 0 && (
                        <span className="text-warning flex-shrink-0">⚠️</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-md bg-muted/30 pl-6">
                    <span className="text-muted-foreground">└ Responsive Impact</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-medium text-foreground tabular-nums">{responsiveImpactCount}</span>
                      {responsiveImpactCount > 0 && (
                        <span className="text-warning flex-shrink-0">⚠️</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-md bg-muted/30 pl-6">
                    <span className="text-muted-foreground">└ Accessibility Issues</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="font-medium text-foreground tabular-nums">{accessibilityIssuesCount}</span>
                      {accessibilityIssuesCount > 0 && (
                        <span className="text-destructive flex-shrink-0">⚠️</span>
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
            {(needsReviewCount > 0) && (
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
                      {needsReviewCount} values to review
                    </span>
                    <span className="text-warning">
                      {isReviewOpen ? '▼' : '▶'}
                    </span>
                  </div>
                </button>

                {isReviewOpen && (
                  <div className="p-4 space-y-3">
                    {stats.diffs
                      .filter(diff => diff.needsReview || diff.impactsResponsiveness || diff.impactsAccessibility)
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
                            <div className="mt-2 space-y-1 text-sm">
                              {diff.reviewReason && (
                                <p className="text-warning/80">
                                  {diff.reviewReason}
                                </p>
                              )}
                              {diff.impactsAccessibility && (
                                <p className="text-destructive/80">
                                  May impact accessibility
                                </p>
                              )}
                              {diff.impactsResponsiveness && (
                                <p className="text-warning/80">
                                  May impact responsive behavior
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Most Affected Properties */}
            <div className="mt-4">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Most Affected Properties
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {displayProperties.map(([property, count], index) => {
                  const percentage = Math.round((Number(count) / Number(totalChanges)) * 100);
                  return (
                    <div key={property} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                      <div className="text-muted-foreground font-medium min-w-[1.5rem]">
                        {index + 1}.
                      </div>
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <div className="font-medium truncate">
                          {property}
                        </div>
                        <div className="font-medium text-muted-foreground whitespace-nowrap">
                          {count} ({percentage}%)
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                    {diff.needsReview && <span className="text-warning" title="Needs manual review">⚠️</span>}
                    {diff.impactsAccessibility && <span className="text-destructive" title="May impact accessibility">⚠️</span>}
                    {diff.impactsResponsiveness && <span className="text-warning" title="May impact responsive behavior">⚠️</span>}
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