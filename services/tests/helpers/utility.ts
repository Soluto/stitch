export const sleep = (timeout: number) => new Promise(r => setTimeout(r, timeout));

export const minutesAgo = (m: number) => new Date(Date.now() - m * 60000);
