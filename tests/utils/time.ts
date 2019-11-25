export const delay = async (
  time: number,
): Promise<boolean> => new Promise((res: (result: boolean) => void) => {
  setTimeout(() => res(true), time);
});
