import { Timestamp } from '@hashgraph/sdk'

export function timestampToMilliseconds(timestamp: Timestamp): number {
  return timestamp.seconds.low * 1000 + Math.floor(timestamp.nanos.low / 1_000_000)
}

export function millisecondsToTimestamp(timestamp: number): Timestamp {
  return Timestamp.fromDate(new Date(timestamp))
}

export function dateToTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date)
}
