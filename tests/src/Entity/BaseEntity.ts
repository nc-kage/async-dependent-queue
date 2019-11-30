import IEntity from './IEntity';

class BaseEntity implements IEntity {
  private static index: number = 1;

  public readonly index: number;
  public readonly type: string = '';
  constructor() {
    this.index = BaseEntity.index;
    BaseEntity.index += 1;
  }

  public async execute(result: boolean, timeout: number = 100): Promise<boolean> {
    return new Promise((res: (r: boolean) => void) => {
      setTimeout(() => res(result), timeout);
    });
  }
}

export default BaseEntity;
