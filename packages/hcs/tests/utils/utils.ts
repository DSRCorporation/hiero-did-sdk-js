export const getRandomStr = (n: number) => [...Array(n)].map(() => Math.random().toString(36)[2]).join('')
