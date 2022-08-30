/*
Dependency in Autosuggest component, published here:
https://github.com/moroshko/shallow-equal

Same license, see README.
*/

export default function shallowEqualArrays(arrA: any[], arrB: any[]): boolean {
  if (arrA === arrB) {
    return true;
  }

  if (!arrA || !arrB) {
    return false;
  }

  var len = arrA.length;

  if (arrB.length !== len) {
    return false;
  }

  for (var i = 0; i < len; i++) {
    if (arrA[i] !== arrB[i]) {
      return false;
    }
  }

  return true;
}
