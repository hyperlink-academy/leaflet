export function deepEquals(obj1: any, obj2: any): boolean {
  // Check if both are the same reference
  if (obj1 === obj2) return true;

  // Check if either is null or not an object
  if (
    obj1 === null ||
    obj2 === null ||
    typeof obj1 !== "object" ||
    typeof obj2 !== "object"
  )
    return false;

  // Get keys from both objects
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  // Check if they have the same number of keys
  if (keys1.length !== keys2.length) return false;

  // Check each key and value recursively
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEquals(obj1[key], obj2[key])) return false;
  }

  return true;
}
