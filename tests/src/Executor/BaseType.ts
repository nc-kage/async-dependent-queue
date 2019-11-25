import IType from './IType';

class BaseType implements IType {
  private static index: number = 1;

  public readonly index: number;
  public readonly type: string = '';
  constructor() {
    this.index = BaseType.index;
    BaseType.index += 1;
  }

  public async execute(result: boolean, timeout: number = 100): Promise<boolean> {
    return new Promise((res: (r: boolean) => void) => {
      setTimeout(() => res(result), timeout);
    });
  }
}

export default BaseType;
