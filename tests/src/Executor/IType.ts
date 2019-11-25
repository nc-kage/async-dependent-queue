export default interface IType {
  type: string;
  index: number;
  execute(result: boolean, timeout?: number): Promise<boolean>;
}
