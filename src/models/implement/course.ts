/**
 * Discord implementation of a course.
 */
export interface ICourseImplement {
  mainRoleId: string,
  taRoleId: string,
  channelIds: string[]
}

export enum CourseImplementChannelType {
  CHAT,
  VOICE
}

export namespace CourseImplementChannelType {
  export function values(): number[] {
    return Object.keys(CourseImplementChannelType)
      .map(key => Number.parseInt(key))
      .filter(num => isFinite(num));
  }
}