/**
 * 工具函数：从对象中提取指定字段
 * @param obj 要提取字段的对象
 * @param paths 字段路径数组，支持点号分隔的嵌套路径
 * @returns 包含指定字段的新对象
 */
export function pickFields(obj: any, paths: string[]): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result: any = {};

  for (const path of paths) {
    // 支持点号分隔的嵌套路径，例如 'tech_stack.frontend'
    const keys = path.split('.');
    let current = obj;
    let target = result;
    
    // 遍历路径中的每个键
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      
      // 检查当前层级是否存在该键
      if (current == null || typeof current !== 'object' || !(key in current)) {
        break; // 如果路径不存在，则停止遍历
      }
      
      current = current[key];
      
      // 在结果对象中创建相应的嵌套结构
      if (i < keys.length - 1) {
        if (!(key in target) || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      } else {
        // 到达路径末尾，设置最终值
        target[key] = current;
      }
    }
  }

  return result;
}

/**
 * 工具函数：根据路径设置对象的值
 * @param obj 要设置值的对象
 * @param path 点号分隔的路径
 * @param value 要设置的值
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current)) {
      current[key] = {};
    }
    current = current[key];
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey === '[]') {
    // 追加到数组模式
    const parentKey = keys[keys.length - 2];
    if (!Array.isArray(current[parentKey])) {
      current[parentKey] = [];
    }
    current[parentKey].push(value);
  } else {
    current[lastKey] = value;
  }
}

/**
 * 工具函数：根据路径获取对象的值
 * @param obj 要获取值的对象
 * @param path 点号分隔的路径
 * @returns 对应路径的值，如果路径不存在则返回undefined
 */
export function getNestedValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object' || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * 深度克隆对象
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }

  if (typeof obj === 'object') {
    const cloned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}