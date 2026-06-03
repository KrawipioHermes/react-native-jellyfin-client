/**
 * A chapter marker from Jellyfin's /Items/{Id}/PlaybackInfo endpoint.
 * StartPositionTicks uses Jellyfin's time unit (10,000,000 ticks = 1 second).
 */
export interface ChapterMarker {
  /** Start time of the chapter in ticks (10M ticks = 1 second) */
  StartPositionTicks?: number;
  /** Name/title of the chapter */
  Name?: string;
  /** Image tag for chapter thumbnail */
  ImageTag?: string;
}