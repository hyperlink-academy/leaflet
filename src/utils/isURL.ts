//From https://github.com/segmentio/is-url/blob/master/index.js
//
var protocolAndDomainRE = /^(?:\w+:)?\/\/(\S+)$/;

var localhostDomainRE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
var nonLocalhostDomainRE = /^[^\s\.]+\.\S{2,}$/;

export function isUrl(str: string) {
  return str.includes(".");
}
