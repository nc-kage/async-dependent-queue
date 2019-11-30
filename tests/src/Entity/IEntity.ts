export default interface IEntity {
  type: string;
  index: number;
  execute(result: boolean, timeout?: number): Promise<boolean>;
}
