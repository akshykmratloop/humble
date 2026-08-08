/**
 * Babel's legacy decorator plugin (used to run plain JavaScript through Nest's
 * decorator-based API, docs/11-implementation-roadmap.md "no TypeScript")
 * only supports class/method/property decorators — parameter decorators
 * (`@Body()`, `@Req()`, ...) are a TypeScript-only grammar extension and are
 * a syntax error here. This applies them manually, the same mechanism Nest's
 * own plain-JS examples use instead of inline `@Decorator()` on a parameter.
 *
 * @param {Function} Target - the controller class
 * @param {string} methodName
 * @param {Array<Function|null>} decorators - decorator factories in parameter order
 */
export function applyParamDecorators(Target, methodName, decorators) {
  decorators.forEach((decorator, index) => {
    if (decorator) decorator(Target.prototype, methodName, index);
  });
}
