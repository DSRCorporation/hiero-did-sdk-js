import { v4 as uuidv4 } from 'uuid'

export function getUUID(): string {
  return uuidv4()
}

export const getRandomStr = (n: number) => [...Array(n)].map(() => Math.random().toString(36)[2]).join('')

export const waitTimeout = async (timeout?: number) => {
  await new Promise((resolve) => setTimeout(resolve, timeout ?? 5000))
}
