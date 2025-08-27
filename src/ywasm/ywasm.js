let imports = {};
imports["__wbindgen_placeholder__"] = module.exports;
let wasm;
const { TextDecoder, TextEncoder } = require(`util`);

function addToExternrefTable0(obj) {
  const idx = wasm.__externref_table_alloc();
  wasm.__wbindgen_export_2.set(idx, obj);
  return idx;
}

function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e) {
    const idx = addToExternrefTable0(e);
    wasm.__wbindgen_exn_store(idx);
  }
}

let cachedTextDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
  fatal: true,
});

cachedTextDecoder.decode();

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
  if (
    cachedUint8ArrayMemory0 === null ||
    cachedUint8ArrayMemory0.byteLength === 0
  ) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return cachedTextDecoder.decode(
    getUint8ArrayMemory0().subarray(ptr, ptr + len),
  );
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder("utf-8");

const encodeString =
  typeof cachedTextEncoder.encodeInto === "function"
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
      }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
          read: arg.length,
          written: buf.length,
        };
      };

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;

  const mem = getUint8ArrayMemory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);

    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}

let cachedDataViewMemory0 = null;

function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

function isLikeNone(x) {
  return x === undefined || x === null;
}

function debugString(val) {
  // primitive types
  const type = typeof val;
  if (type == "number" || type == "boolean" || val == null) {
    return `${val}`;
  }
  if (type == "string") {
    return `"${val}"`;
  }
  if (type == "symbol") {
    const description = val.description;
    if (description == null) {
      return "Symbol";
    } else {
      return `Symbol(${description})`;
    }
  }
  if (type == "function") {
    const name = val.name;
    if (typeof name == "string" && name.length > 0) {
      return `Function(${name})`;
    } else {
      return "Function";
    }
  }
  // objects
  if (Array.isArray(val)) {
    const length = val.length;
    let debug = "[";
    if (length > 0) {
      debug += debugString(val[0]);
    }
    for (let i = 1; i < length; i++) {
      debug += ", " + debugString(val[i]);
    }
    debug += "]";
    return debug;
  }
  // Test for built-in
  const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
  let className;
  if (builtInMatches && builtInMatches.length > 1) {
    className = builtInMatches[1];
  } else {
    // Failed to match the standard '[object ClassName]'
    return toString.call(val);
  }
  if (className == "Object") {
    // we're a user defined class or Object
    // JSON.stringify avoids problems with cycles, and is generally much
    // easier than looping through ownProperties of `val`.
    try {
      return "Object(" + JSON.stringify(val) + ")";
    } catch (_) {
      return "Object";
    }
  }
  // errors
  if (val instanceof Error) {
    return `${val.name}: ${val.message}\n${val.stack}`;
  }
  // TODO we could test for more things here, like `Set`s and `Map`s.
  return className;
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_export_2.get(idx);
  wasm.__externref_table_dealloc(idx);
  return value;
}

function _assertClass(instance, klass) {
  if (!(instance instanceof klass)) {
    throw new Error(`expected instance of ${klass.name}`);
  }
}

function passArrayJsValueToWasm0(array, malloc) {
  const ptr = malloc(array.length * 4, 4) >>> 0;
  for (let i = 0; i < array.length; i++) {
    const add = addToExternrefTable0(array[i]);
    getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
  }
  WASM_VECTOR_LEN = array.length;
  return ptr;
}
/**
 * When called will call console log errors whenever internal panic is called from within
 * WebAssembly module.
 */
module.exports.setPanicHook = function () {
  wasm.setPanicHook();
};

/**
 * Encodes a state vector of a given ywasm document into its binary representation using lib0 v1
 * encoding. State vector is a compact representation of updates performed on a given document and
 * can be used by `encode_state_as_update` on remote peer to generate a delta update payload to
 * synchronize changes between peers.
 *
 * Example:
 *
 * ```javascript
 * import {YDoc, encodeStateVector, encodeStateAsUpdate, applyUpdate} from 'ywasm'
 *
 * /// document on machine A
 * const localDoc = new YDoc()
 * const localSV = encodeStateVector(localDoc)
 *
 * // document on machine B
 * const remoteDoc = new YDoc()
 * const remoteDelta = encodeStateAsUpdate(remoteDoc, localSV)
 *
 * applyUpdate(localDoc, remoteDelta)
 * ```
 * @param {YDoc} doc
 * @returns {Uint8Array}
 */
module.exports.encodeStateVector = function (doc) {
  _assertClass(doc, YDoc);
  const ret = wasm.encodeStateVector(doc.__wbg_ptr);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * Returns a string dump representation of a given `update` encoded using lib0 v1 encoding.
 * @param {Uint8Array} update
 * @returns {string}
 */
module.exports.debugUpdateV1 = function (update) {
  let deferred2_0;
  let deferred2_1;
  try {
    const ret = wasm.debugUpdateV1(update);
    var ptr1 = ret[0];
    var len1 = ret[1];
    if (ret[3]) {
      ptr1 = 0;
      len1 = 0;
      throw takeFromExternrefTable0(ret[2]);
    }
    deferred2_0 = ptr1;
    deferred2_1 = len1;
    return getStringFromWasm0(ptr1, len1);
  } finally {
    wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
  }
};

/**
 * Returns a string dump representation of a given `update` encoded using lib0 v2 encoding.
 * @param {Uint8Array} update
 * @returns {string}
 */
module.exports.debugUpdateV2 = function (update) {
  let deferred2_0;
  let deferred2_1;
  try {
    const ret = wasm.debugUpdateV2(update);
    var ptr1 = ret[0];
    var len1 = ret[1];
    if (ret[3]) {
      ptr1 = 0;
      len1 = 0;
      throw takeFromExternrefTable0(ret[2]);
    }
    deferred2_0 = ptr1;
    deferred2_1 = len1;
    return getStringFromWasm0(ptr1, len1);
  } finally {
    wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
  }
};

/**
 * Merges a sequence of updates (encoded using lib0 v1 encoding) together, producing another
 * update (also lib0 v1 encoded) in the result. Returned binary is a combination of all input
 * `updates`, compressed.
 *
 * Returns an error whenever any of the input updates couldn't be decoded.
 * @param {Array<any>} updates
 * @returns {Uint8Array}
 */
module.exports.mergeUpdatesV1 = function (updates) {
  const ret = wasm.mergeUpdatesV1(updates);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * Merges a sequence of updates (encoded using lib0 v2 encoding) together, producing another
 * update (also lib0 v2 encoded) in the result. Returned binary is a combination of all input
 * `updates`, compressed.
 *
 * Returns an error whenever any of the input updates couldn't be decoded.
 * @param {Array<any>} updates
 * @returns {Uint8Array}
 */
module.exports.mergeUpdatesV2 = function (updates) {
  const ret = wasm.mergeUpdatesV2(updates);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * Encodes all updates that have happened since a given version `vector` into a compact delta
 * representation using lib0 v1 encoding. If `vector` parameter has not been provided, generated
 * delta payload will contain all changes of a current ywasm document, working effectivelly as its
 * state snapshot.
 *
 * Example:
 *
 * ```javascript
 * import {YDoc, encodeStateVector, encodeStateAsUpdate, applyUpdate} from 'ywasm'
 *
 * /// document on machine A
 * const localDoc = new YDoc()
 * const localSV = encodeStateVector(localDoc)
 *
 * // document on machine B
 * const remoteDoc = new YDoc()
 * const remoteDelta = encodeStateAsUpdate(remoteDoc, localSV)
 *
 * applyUpdate(localDoc, remoteDelta)
 * ```
 * @param {YDoc} doc
 * @param {Uint8Array | null} [vector]
 * @returns {Uint8Array}
 */
module.exports.encodeStateAsUpdate = function (doc, vector) {
  _assertClass(doc, YDoc);
  const ret = wasm.encodeStateAsUpdate(
    doc.__wbg_ptr,
    isLikeNone(vector) ? 0 : addToExternrefTable0(vector),
  );
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * Encodes all updates that have happened since a given version `vector` into a compact delta
 * representation using lib0 v2 encoding. If `vector` parameter has not been provided, generated
 * delta payload will contain all changes of a current ywasm document, working effectivelly as its
 * state snapshot.
 *
 * Example:
 *
 * ```javascript
 * import {YDoc, encodeStateVector, encodeStateAsUpdate, applyUpdate} from 'ywasm'
 *
 * /// document on machine A
 * const localDoc = new YDoc()
 * const localSV = encodeStateVector(localDoc)
 *
 * // document on machine B
 * const remoteDoc = new YDoc()
 * const remoteDelta = encodeStateAsUpdateV2(remoteDoc, localSV)
 *
 * applyUpdate(localDoc, remoteDelta)
 * ```
 * @param {YDoc} doc
 * @param {Uint8Array | null} [vector]
 * @returns {Uint8Array}
 */
module.exports.encodeStateAsUpdateV2 = function (doc, vector) {
  _assertClass(doc, YDoc);
  const ret = wasm.encodeStateAsUpdateV2(
    doc.__wbg_ptr,
    isLikeNone(vector) ? 0 : addToExternrefTable0(vector),
  );
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * Applies delta update generated by the remote document replica to a current document. This
 * method assumes that a payload maintains lib0 v1 encoding format.
 *
 * Example:
 *
 * ```javascript
 * import {YDoc, encodeStateVector, encodeStateAsUpdate, applyUpdate} from 'ywasm'
 *
 * /// document on machine A
 * const localDoc = new YDoc()
 * const localSV = encodeStateVector(localDoc)
 *
 * // document on machine B
 * const remoteDoc = new YDoc()
 * const remoteDelta = encodeStateAsUpdate(remoteDoc, localSV)
 *
 * applyUpdateV2(localDoc, remoteDelta)
 * ```
 * @param {YDoc} doc
 * @param {Uint8Array} update
 * @param {any} origin
 */
module.exports.applyUpdate = function (doc, update, origin) {
  _assertClass(doc, YDoc);
  const ret = wasm.applyUpdate(doc.__wbg_ptr, update, origin);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
};

/**
 * Applies delta update generated by the remote document replica to a current document. This
 * method assumes that a payload maintains lib0 v2 encoding format.
 *
 * Example:
 *
 * ```javascript
 * import {YDoc, encodeStateVector, encodeStateAsUpdate, applyUpdate} from 'ywasm'
 *
 * /// document on machine A
 * const localDoc = new YDoc()
 * const localSV = encodeStateVector(localDoc)
 *
 * // document on machine B
 * const remoteDoc = new YDoc()
 * const remoteDelta = encodeStateAsUpdateV2(remoteDoc, localSV)
 *
 * applyUpdateV2(localDoc, remoteDelta)
 * ```
 * @param {YDoc} doc
 * @param {Uint8Array} update
 * @param {any} origin
 */
module.exports.applyUpdateV2 = function (doc, update, origin) {
  _assertClass(doc, YDoc);
  const ret = wasm.applyUpdateV2(doc.__wbg_ptr, update, origin);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
};

/**
 * @param {YDoc} doc
 * @returns {any}
 */
module.exports.snapshot = function (doc) {
  _assertClass(doc, YDoc);
  const ret = wasm.snapshot(doc.__wbg_ptr);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * @param {any} snap1
 * @param {any} snap2
 * @returns {boolean}
 */
module.exports.equalSnapshots = function (snap1, snap2) {
  const ret = wasm.equalSnapshots(snap1, snap2);
  return ret !== 0;
};

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
/**
 * @param {any} snapshot
 * @returns {Uint8Array}
 */
module.exports.encodeSnapshotV1 = function (snapshot) {
  const ret = wasm.encodeSnapshotV1(snapshot);
  var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v1;
};

/**
 * @param {any} snapshot
 * @returns {Uint8Array}
 */
module.exports.encodeSnapshotV2 = function (snapshot) {
  const ret = wasm.encodeSnapshotV2(snapshot);
  var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v1;
};

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
/**
 * @param {Uint8Array} snapshot
 * @returns {any}
 */
module.exports.decodeSnapshotV2 = function (snapshot) {
  const ptr0 = passArray8ToWasm0(snapshot, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.decodeSnapshotV2(ptr0, len0);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * @param {Uint8Array} snapshot
 * @returns {any}
 */
module.exports.decodeSnapshotV1 = function (snapshot) {
  const ptr0 = passArray8ToWasm0(snapshot, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.decodeSnapshotV1(ptr0, len0);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * @param {YDoc} doc
 * @param {any} snapshot
 * @returns {Uint8Array}
 */
module.exports.encodeStateFromSnapshotV1 = function (doc, snapshot) {
  _assertClass(doc, YDoc);
  const ret = wasm.encodeStateFromSnapshotV1(doc.__wbg_ptr, snapshot);
  if (ret[3]) {
    throw takeFromExternrefTable0(ret[2]);
  }
  var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v1;
};

/**
 * @param {YDoc} doc
 * @param {any} snapshot
 * @returns {Uint8Array}
 */
module.exports.encodeStateFromSnapshotV2 = function (doc, snapshot) {
  _assertClass(doc, YDoc);
  const ret = wasm.encodeStateFromSnapshotV2(doc.__wbg_ptr, snapshot);
  if (ret[3]) {
    throw takeFromExternrefTable0(ret[2]);
  }
  var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v1;
};

/**
 * Retrieves a sticky index corresponding to a given human-readable `index` pointing into
 * the shared `ytype`. Unlike standard indexes sticky indexes enables to track
 * the location inside of a shared y-types, even in the face of concurrent updates.
 *
 * If association is >= 0, the resulting position will point to location **after** the referenced index.
 * If association is < 0, the resulting position will point to location **before** the referenced index.
 * @param {any} ytype
 * @param {number} index
 * @param {number} assoc
 * @param {YTransaction | undefined} txn
 * @returns {any}
 */
module.exports.createRelativePositionFromTypeIndex = function (
  ytype,
  index,
  assoc,
  txn,
) {
  const ret = wasm.createRelativePositionFromTypeIndex(
    ytype,
    index,
    assoc,
    txn,
  );
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * Converts a sticky index (see: `createStickyIndexFromType`) into an object
 * containing human-readable index.
 * @param {any} rpos
 * @param {YDoc} doc
 * @returns {any}
 */
module.exports.createAbsolutePositionFromRelativePosition = function (
  rpos,
  doc,
) {
  _assertClass(doc, YDoc);
  const ret = wasm.createAbsolutePositionFromRelativePosition(
    rpos,
    doc.__wbg_ptr,
  );
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * Serializes sticky index created by `createStickyIndexFromType` into a binary
 * payload.
 * @param {any} rpos
 * @returns {Uint8Array}
 */
module.exports.encodeRelativePosition = function (rpos) {
  const ret = wasm.encodeRelativePosition(rpos);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * Deserializes sticky index serialized previously by `encodeStickyIndex`.
 * @param {Uint8Array} bin
 * @returns {any}
 */
module.exports.decodeRelativePosition = function (bin) {
  const ret = wasm.decodeRelativePosition(bin);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * @param {any} a
 * @param {any} b
 * @returns {boolean}
 */
module.exports.compareRelativePositions = function (a, b) {
  const ret = wasm.compareRelativePositions(a, b);
  return ret !== 0;
};

let cachedBigUint64ArrayMemory0 = null;

function getBigUint64ArrayMemory0() {
  if (
    cachedBigUint64ArrayMemory0 === null ||
    cachedBigUint64ArrayMemory0.byteLength === 0
  ) {
    cachedBigUint64ArrayMemory0 = new BigUint64Array(wasm.memory.buffer);
  }
  return cachedBigUint64ArrayMemory0;
}

function passArray64ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 8, 8) >>> 0;
  getBigUint64ArrayMemory0().set(arg, ptr / 8);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
/**
 * @param {Awareness} awareness
 * @param {BigUint64Array} clients
 */
module.exports.removeAwarenessStates = function (awareness, clients) {
  _assertClass(awareness, Awareness);
  const ptr0 = passArray64ToWasm0(clients, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.removeAwarenessStates(awareness.__wbg_ptr, ptr0, len0);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
};

/**
 * @param {Awareness} awareness
 * @param {any} clients
 * @returns {Uint8Array}
 */
module.exports.encodeAwarenessUpdate = function (awareness, clients) {
  _assertClass(awareness, Awareness);
  const ret = wasm.encodeAwarenessUpdate(awareness.__wbg_ptr, clients);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * @param {Uint8Array} update
 * @param {Function} modify
 * @returns {Uint8Array}
 */
module.exports.modifyAwarenessUpdate = function (update, modify) {
  const ret = wasm.modifyAwarenessUpdate(update, modify);
  if (ret[2]) {
    throw takeFromExternrefTable0(ret[1]);
  }
  return takeFromExternrefTable0(ret[0]);
};

/**
 * @param {Awareness} awareness
 * @param {Uint8Array} update
 * @param {any} _origin
 */
module.exports.applyAwarenessUpdate = function (awareness, update, _origin) {
  _assertClass(awareness, Awareness);
  const ret = wasm.applyAwarenessUpdate(awareness.__wbg_ptr, update, _origin);
  if (ret[1]) {
    throw takeFromExternrefTable0(ret[0]);
  }
};

const AwarenessFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_awareness_free(ptr >>> 0, 1),
      );

class Awareness {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    AwarenessFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_awareness_free(ptr, 0);
  }
  /**
   * @param {YDoc} doc
   */
  constructor(doc) {
    _assertClass(doc, YDoc);
    var ptr0 = doc.__destroy_into_raw();
    const ret = wasm.awareness_new(ptr0);
    this.__wbg_ptr = ret >>> 0;
    AwarenessFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {YDoc}
   */
  get doc() {
    const ret = wasm.awareness_doc(this.__wbg_ptr);
    return YDoc.__wrap(ret);
  }
  /**
   * @returns {Map<any, any>}
   */
  get meta() {
    const ret = wasm.awareness_meta(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  destroy() {
    wasm.awareness_destroy(this.__wbg_ptr);
  }
  /**
   * @returns {any}
   */
  getLocalState() {
    const ret = wasm.awareness_getLocalState(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @param {any} state
   */
  setLocalState(state) {
    const ret = wasm.awareness_setLocalState(this.__wbg_ptr, state);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} key
   * @param {any} value
   */
  setLocalStateField(key, value) {
    const ptr0 = passStringToWasm0(
      key,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.awareness_setLocalStateField(
      this.__wbg_ptr,
      ptr0,
      len0,
      value,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @returns {Map<any, any>}
   */
  getStates() {
    const ret = wasm.awareness_getStates(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    const ptr0 = passStringToWasm0(
      event,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.awareness_on(this.__wbg_ptr, ptr0, len0, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} event
   * @param {Function} callback
   * @returns {boolean}
   */
  off(event, callback) {
    const ptr0 = passStringToWasm0(
      event,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.awareness_off(this.__wbg_ptr, ptr0, len0, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
}
module.exports.Awareness = Awareness;

const YArrayFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_yarray_free(ptr >>> 0, 1));
/**
 * A collection used to store data in an indexed sequence structure. This type is internally
 * implemented as a double linked list, which may squash values inserted directly one after another
 * into single list node upon transaction commit.
 *
 * Reading a root-level type as an YArray means treating its sequence components as a list, where
 * every countable element becomes an individual entity:
 *
 * - JSON-like primitives (booleans, numbers, strings, JSON maps, arrays etc.) are counted
 *   individually.
 * - Text chunks inserted by [Text] data structure: each character becomes an element of an
 *   array.
 * - Embedded and binary values: they count as a single element even though they correspond of
 *   multiple bytes.
 *
 * Like all Yrs shared data types, YArray is resistant to the problem of interleaving (situation
 * when elements inserted one after another may interleave with other peers concurrent inserts
 * after merging all updates together). In case of Yrs conflict resolution is solved by using
 * unique document id to determine correct and consistent ordering.
 */
class YArray {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YArray.prototype);
    obj.__wbg_ptr = ptr;
    YArrayFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YArrayFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yarray_free(ptr, 0);
  }
  /**
   * Creates a new preliminary instance of a `YArray` shared data type, with its state
   * initialized to provided parameter.
   *
   * Preliminary instances can be nested into other shared data types such as `YArray` and `YMap`.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @param {any[] | null} [items]
   */
  constructor(items) {
    var ptr0 = isLikeNone(items)
      ? 0
      : passArrayJsValueToWasm0(items, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    const ret = wasm.yarray_new(ptr0, len0);
    this.__wbg_ptr = ret >>> 0;
    YArrayFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  get type() {
    const ret = wasm.yarray_type(this.__wbg_ptr);
    return ret;
  }
  /**
   * Gets unique logical identifier of this type, shared across peers collaborating on the same
   * document.
   * @returns {any}
   */
  get id() {
    const ret = wasm.yarray_id(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns true if this is a preliminary instance of `YArray`.
   *
   * Preliminary instances can be nested into other shared data types such as `YArray` and `YMap`.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @returns {boolean}
   */
  get prelim() {
    const ret = wasm.yarray_prelim(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Checks if current YArray reference is alive and has not been deleted by its parent collection.
   * This method only works on already integrated shared types and will return false is current
   * type is preliminary (has not been integrated into document).
   * @param {YTransaction} txn
   * @returns {boolean}
   */
  alive(txn) {
    _assertClass(txn, YTransaction);
    const ret = wasm.yarray_alive(this.__wbg_ptr, txn.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Returns a number of elements stored within this instance of `YArray`.
   * @param {YTransaction | undefined} txn
   * @returns {number}
   */
  length(txn) {
    const ret = wasm.yarray_length(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
  }
  /**
   * Converts an underlying contents of this `YArray` instance into their JSON representation.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  toJson(txn) {
    const ret = wasm.yarray_toJson(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Inserts a given range of `items` into this `YArray` instance, starting at given `index`.
   * @param {number} index
   * @param {any[]} items
   * @param {YTransaction | undefined} txn
   */
  insert(index, items, txn) {
    const ptr0 = passArrayJsValueToWasm0(items, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yarray_insert(this.__wbg_ptr, index, ptr0, len0, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Appends a range of `items` at the end of this `YArray` instance.
   * @param {any[]} items
   * @param {YTransaction | undefined} txn
   */
  push(items, txn) {
    const ptr0 = passArrayJsValueToWasm0(items, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yarray_push(this.__wbg_ptr, ptr0, len0, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Deletes a range of items of given `length` from current `YArray` instance,
   * starting from given `index`.
   * @param {number} index
   * @param {number | null | undefined} length
   * @param {YTransaction | undefined} txn
   */
  delete(index, length, txn) {
    const ret = wasm.yarray_delete(
      this.__wbg_ptr,
      index,
      isLikeNone(length) ? 0x100000001 : length >>> 0,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Moves element found at `source` index into `target` index position.
   * @param {number} source
   * @param {number} target
   * @param {YTransaction | undefined} txn
   */
  move(source, target, txn) {
    const ret = wasm.yarray_move(this.__wbg_ptr, source, target, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns an element stored under given `index`.
   * @param {number} index
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  get(index, txn) {
    const ret = wasm.yarray_get(this.__wbg_ptr, index, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @param {number | null | undefined} lower
   * @param {number | null | undefined} upper
   * @param {boolean | null | undefined} lower_open
   * @param {boolean | null | undefined} upper_open
   * @param {YTransaction | undefined} txn
   * @returns {YWeakLink}
   */
  quote(lower, upper, lower_open, upper_open, txn) {
    const ret = wasm.yarray_quote(
      this.__wbg_ptr,
      isLikeNone(lower) ? 0x100000001 : lower >>> 0,
      isLikeNone(upper) ? 0x100000001 : upper >>> 0,
      isLikeNone(lower_open) ? 0xffffff : lower_open ? 1 : 0,
      isLikeNone(upper_open) ? 0xffffff : upper_open ? 1 : 0,
      txn,
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return YWeakLink.__wrap(ret[0]);
  }
  /**
   * Returns an iterator that can be used to traverse over the values stored withing this
   * instance of `YArray`.
   *
   * Example:
   *
   * ```javascript
   * import YDoc from 'ywasm'
   *
   * /// document on machine A
   * const doc = new YDoc()
   * const array = doc.getArray('name')
   * const txn = doc.beginTransaction()
   * try {
   *     array.push(txn, ['hello', 'world'])
   *     for (let item of array.values(txn)) {
   *         console.log(item)
   *     }
   * } finally {
   *     txn.free()
   * }
   * ```
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  values(txn) {
    const ret = wasm.yarray_values(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Subscribes to all operations happening over this instance of `YArray`. All changes are
   * batched and eventually triggered during transaction commit phase.
   * @param {Function} callback
   */
  observe(callback) {
    const ret = wasm.yarray_observe(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserve(callback) {
    const ret = wasm.yarray_unobserve(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
  /**
   * Subscribes to all operations happening over this Y shared type, as well as events in
   * shared types stored within this one. All changes are batched and eventually triggered
   * during transaction commit phase.
   * @param {Function} callback
   */
  observeDeep(callback) {
    const ret = wasm.yarray_observeDeep(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserveDeep(callback) {
    const ret = wasm.yarray_unobserveDeep(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
}
module.exports.YArray = YArray;

const YArrayEventFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_yarrayevent_free(ptr >>> 0, 1),
      );
/**
 * Event generated by `YArray.observe` method. Emitted during transaction commit phase.
 */
class YArrayEvent {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YArrayEvent.prototype);
    obj.__wbg_ptr = ptr;
    YArrayEventFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YArrayEventFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yarrayevent_free(ptr, 0);
  }
  /**
   * Returns an array of keys and indexes creating a path from root type down to current instance
   * of shared type (accessible via `target` getter).
   * @returns {any}
   */
  path() {
    const ret = wasm.yarrayevent_path(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a current shared type instance, that current event changes refer to.
   * @returns {any}
   */
  get target() {
    const ret = wasm.yarrayevent_target(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {any}
   */
  get origin() {
    const ret = wasm.yarrayevent_origin(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a list of text changes made over corresponding `YArray` collection within
   * bounds of current transaction. These changes follow a format:
   *
   * - { insert: any[] }
   * - { delete: number }
   * - { retain: number }
   * @returns {any}
   */
  get delta() {
    const ret = wasm.yarrayevent_delta(this.__wbg_ptr);
    return ret;
  }
}
module.exports.YArrayEvent = YArrayEvent;

const YDocFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_ydoc_free(ptr >>> 0, 1));
/**
 * A ywasm document type. Documents are most important units of collaborative resources management.
 * All shared collections live within a scope of their corresponding documents. All updates are
 * generated on per-document basis (rather than individual shared type). All operations on shared
 * collections happen via [YTransaction], which lifetime is also bound to a document.
 *
 * Document manages so-called root types, which are top-level shared types definitions (as opposed
 * to recursively nested types).
 *
 * A basic workflow sample:
 *
 * ```javascript
 * import YDoc from 'ywasm'
 *
 * const doc = new YDoc()
 * const txn = doc.beginTransaction()
 * try {
 *     const text = txn.getText('name')
 *     text.push(txn, 'hello world')
 *     const output = text.toString(txn)
 *     console.log(output)
 * } finally {
 *     txn.free()
 * }
 * ```
 */
class YDoc {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YDoc.prototype);
    obj.__wbg_ptr = ptr;
    YDocFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YDocFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_ydoc_free(ptr, 0);
  }
  /**
   * Creates a new ywasm document. If `id` parameter was passed it will be used as this document
   * globally unique identifier (it's up to caller to ensure that requirement). Otherwise it will
   * be assigned a randomly generated number.
   * @param {any} options
   */
  constructor(options) {
    const ret = wasm.ydoc_new(options);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0] >>> 0;
    YDocFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  get type() {
    const ret = wasm.ydoc_type(this.__wbg_ptr);
    return ret;
  }
  /**
   * Checks if a document is a preliminary type. It returns false, if current document
   * is already a sub-document of another document.
   * @returns {boolean}
   */
  get prelim() {
    const ret = wasm.ydoc_prelim(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Returns a parent document of this document or null if current document is not sub-document.
   * @returns {YDoc | undefined}
   */
  get parentDoc() {
    const ret = wasm.ydoc_parentDoc(this.__wbg_ptr);
    return ret === 0 ? undefined : YDoc.__wrap(ret);
  }
  /**
   * Gets unique peer identifier of this `YDoc` instance.
   * @returns {number}
   */
  get id() {
    const ret = wasm.ydoc_id(this.__wbg_ptr);
    return ret;
  }
  /**
   * Gets globally unique identifier of this `YDoc` instance.
   * @returns {string}
   */
  get guid() {
    let deferred1_0;
    let deferred1_1;
    try {
      const ret = wasm.ydoc_guid(this.__wbg_ptr);
      deferred1_0 = ret[0];
      deferred1_1 = ret[1];
      return getStringFromWasm0(ret[0], ret[1]);
    } finally {
      wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
  }
  /**
   * @returns {boolean}
   */
  get shouldLoad() {
    const ret = wasm.ydoc_shouldLoad(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @returns {boolean}
   */
  get autoLoad() {
    const ret = wasm.ydoc_autoLoad(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Returns a new transaction for this document. Ywasm shared data types execute their
   * operations in a context of a given transaction. Each document can have only one active
   * transaction at the time - subsequent attempts will cause exception to be thrown.
   *
   * Transactions started with `doc.beginTransaction` can be released using `transaction.free`
   * method.
   *
   * Example:
   *
   * ```javascript
   * import YDoc from 'ywasm'
   *
   * // helper function used to simplify transaction
   * // create/release cycle
   * YDoc.prototype.transact = callback => {
   *     const txn = this.transaction()
   *     try {
   *         return callback(txn)
   *     } finally {
   *         txn.free()
   *     }
   * }
   *
   * const doc = new YDoc()
   * const text = doc.getText('name')
   * doc.transact(txn => text.insert(txn, 0, 'hello world'))
   * ```
   * @param {any} origin
   * @returns {YTransaction}
   */
  beginTransaction(origin) {
    const ret = wasm.ydoc_beginTransaction(this.__wbg_ptr, origin);
    return YTransaction.__wrap(ret);
  }
  /**
   * Returns a `YText` shared data type, that's accessible for subsequent accesses using given
   * `name`.
   *
   * If there was no instance with this name before, it will be created and then returned.
   *
   * If there was an instance with this name, but it was of different type, it will be projected
   * onto `YText` instance.
   * @param {string} name
   * @returns {YText}
   */
  getText(name) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ydoc_getText(this.__wbg_ptr, ptr0, len0);
    return YText.__wrap(ret);
  }
  /**
   * Returns a `YArray` shared data type, that's accessible for subsequent accesses using given
   * `name`.
   *
   * If there was no instance with this name before, it will be created and then returned.
   *
   * If there was an instance with this name, but it was of different type, it will be projected
   * onto `YArray` instance.
   * @param {string} name
   * @returns {YArray}
   */
  getArray(name) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ydoc_getArray(this.__wbg_ptr, ptr0, len0);
    return YArray.__wrap(ret);
  }
  /**
   * Returns a `YMap` shared data type, that's accessible for subsequent accesses using given
   * `name`.
   *
   * If there was no instance with this name before, it will be created and then returned.
   *
   * If there was an instance with this name, but it was of different type, it will be projected
   * onto `YMap` instance.
   * @param {string} name
   * @returns {YMap}
   */
  getMap(name) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ydoc_getMap(this.__wbg_ptr, ptr0, len0);
    return YMap.__wrap(ret);
  }
  /**
   * Returns a `YXmlFragment` shared data type, that's accessible for subsequent accesses using
   * given `name`.
   *
   * If there was no instance with this name before, it will be created and then returned.
   *
   * If there was an instance with this name, but it was of different type, it will be projected
   * onto `YXmlFragment` instance.
   * @param {string} name
   * @returns {YXmlFragment}
   */
  getXmlFragment(name) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ydoc_getXmlFragment(this.__wbg_ptr, ptr0, len0);
    return YXmlFragment.__wrap(ret);
  }
  /**
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    const ptr0 = passStringToWasm0(
      event,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ydoc_on(this.__wbg_ptr, ptr0, len0, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} event
   * @param {Function} callback
   * @returns {boolean}
   */
  off(event, callback) {
    const ptr0 = passStringToWasm0(
      event,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ydoc_off(this.__wbg_ptr, ptr0, len0, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
  /**
   * Notify the parent document that you request to load data into this subdocument
   * (if it is a subdocument).
   * @param {YTransaction | undefined} parent_txn
   */
  load(parent_txn) {
    const ret = wasm.ydoc_load(this.__wbg_ptr, parent_txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Emit `onDestroy` event and unregister all event handlers.
   * @param {YTransaction | undefined} parent_txn
   */
  destroy(parent_txn) {
    const ret = wasm.ydoc_destroy(this.__wbg_ptr, parent_txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns a list of sub-documents existings within the scope of this document.
   * @param {YTransaction | undefined} txn
   * @returns {Array<any>}
   */
  getSubdocs(txn) {
    const ret = wasm.ydoc_getSubdocs(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a list of unique identifiers of the sub-documents existings within the scope of
   * this document.
   * @param {YTransaction | undefined} txn
   * @returns {Set<any>}
   */
  getSubdocGuids(txn) {
    const ret = wasm.ydoc_getSubdocGuids(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a list of all root-level replicated collections, together with their types.
   * These collections can then be accessed via `getMap`/`getText` etc. methods.
   *
   * Example:
   * ```js
   * import * as Y from 'ywasm'
   *
   * const doc = new Y.YDoc()
   * const ymap = doc.getMap('a')
   * const yarray = doc.getArray('b')
   * const ytext = doc.getText('c')
   * const yxml = doc.getXmlFragment('d')
   *
   * const roots = doc.roots() // [['a',ymap], ['b',yarray], ['c',ytext], ['d',yxml]]
   * ```
   * @param {YTransaction | undefined} txn
   * @returns {Array<any>}
   */
  roots(txn) {
    const ret = wasm.ydoc_roots(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Evaluates a JSON path expression (see: https://en.wikipedia.org/wiki/JSONPath) on
   * the document and returns an array of values matching that query.
   *
   * Currently, this method supports the following syntax:
   * - `$` - root object
   * - `@` - current object
   * - `.field` or `['field']` - member accessor
   * - `[1]` - array index (also supports negative indices)
   * - `.*` or `[*]` - wildcard (matches all members of an object or array)
   * - `..` - recursive descent (matches all descendants not only direct children)
   * - `[start:end:step]` - array slice operator (requires positive integer arguments)
   * - `['a', 'b', 'c']` - union operator (returns an array of values for each query)
   * - `[1, -1, 3]` - multiple indices operator (returns an array of values for each index)
   *
   * At the moment, JSON Path does not support filter predicates.
   * @param {string} json_path
   * @returns {Array<any>}
   */
  selectAll(json_path) {
    const ptr0 = passStringToWasm0(
      json_path,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ydoc_selectAll(this.__wbg_ptr, ptr0, len0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Evaluates a JSON path expression (see: https://en.wikipedia.org/wiki/JSONPath) on
   * the document and returns first value matching that query.
   *
   * Currently, this method supports the following syntax:
   * - `$` - root object
   * - `@` - current object
   * - `.field` or `['field']` - member accessor
   * - `[1]` - array index (also supports negative indices)
   * - `.*` or `[*]` - wildcard (matches all members of an object or array)
   * - `..` - recursive descent (matches all descendants not only direct children)
   * - `[start:end:step]` - array slice operator (requires positive integer arguments)
   * - `['a', 'b', 'c']` - union operator (returns an array of values for each query)
   * - `[1, -1, 3]` - multiple indices operator (returns an array of values for each index)
   *
   * At the moment, JSON Path does not support filter predicates.
   * @param {string} json_path
   * @returns {any}
   */
  selectOne(json_path) {
    const ptr0 = passStringToWasm0(
      json_path,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ydoc_selectOne(this.__wbg_ptr, ptr0, len0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
}
module.exports.YDoc = YDoc;

const YMapFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_ymap_free(ptr >>> 0, 1));
/**
 * Collection used to store key-value entries in an unordered manner. Keys are always represented
 * as UTF-8 strings. Values can be any value type supported by Yrs: JSON-like primitives as well as
 * shared data types.
 *
 * In terms of conflict resolution, [Map] uses logical last-write-wins principle, meaning the past
 * updates are automatically overridden and discarded by newer ones, while concurrent updates made
 * by different peers are resolved into a single value using document id seniority to establish
 * order.
 */
class YMap {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YMap.prototype);
    obj.__wbg_ptr = ptr;
    YMapFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YMapFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_ymap_free(ptr, 0);
  }
  /**
   * Creates a new preliminary instance of a `YMap` shared data type, with its state
   * initialized to provided parameter.
   *
   * Preliminary instances can be nested into other shared data types such as `YArray` and `YMap`.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @param {object | null} [init]
   */
  constructor(init) {
    const ret = wasm.ymap_new(
      isLikeNone(init) ? 0 : addToExternrefTable0(init),
    );
    this.__wbg_ptr = ret >>> 0;
    YMapFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  get type() {
    const ret = wasm.ymap_type(this.__wbg_ptr);
    return ret;
  }
  /**
   * Gets unique logical identifier of this type, shared across peers collaborating on the same
   * document.
   * @returns {any}
   */
  get id() {
    const ret = wasm.ymap_id(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns true if this is a preliminary instance of `YMap`.
   *
   * Preliminary instances can be nested into other shared data types such as `YArray` and `YMap`.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @returns {boolean}
   */
  get prelim() {
    const ret = wasm.ymap_prelim(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Checks if current YMap reference is alive and has not been deleted by its parent collection.
   * This method only works on already integrated shared types and will return false is current
   * type is preliminary (has not been integrated into document).
   * @param {YTransaction} txn
   * @returns {boolean}
   */
  alive(txn) {
    _assertClass(txn, YTransaction);
    const ret = wasm.ymap_alive(this.__wbg_ptr, txn.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Returns a number of entries stored within this instance of `YMap`.
   * @param {YTransaction | undefined} txn
   * @returns {number}
   */
  length(txn) {
    const ret = wasm.ymap_length(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
  }
  /**
   * Converts contents of this `YMap` instance into a JSON representation.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  toJson(txn) {
    const ret = wasm.ymap_toJson(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Sets a given `key`-`value` entry within this instance of `YMap`. If another entry was
   * already stored under given `key`, it will be overridden with new `value`.
   * @param {string} key
   * @param {any} value
   * @param {YTransaction | undefined} txn
   */
  set(key, value, txn) {
    const ptr0 = passStringToWasm0(
      key,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ymap_set(this.__wbg_ptr, ptr0, len0, value, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Removes an entry identified by a given `key` from this instance of `YMap`, if such exists.
   * @param {string} key
   * @param {YTransaction | undefined} txn
   */
  delete(key, txn) {
    const ptr0 = passStringToWasm0(
      key,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ymap_delete(this.__wbg_ptr, ptr0, len0, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns value of an entry stored under given `key` within this instance of `YMap`,
   * or `undefined` if no such entry existed.
   * @param {string} key
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  get(key, txn) {
    const ptr0 = passStringToWasm0(
      key,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ymap_get(this.__wbg_ptr, ptr0, len0, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @param {string} key
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  link(key, txn) {
    const ptr0 = passStringToWasm0(
      key,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ymap_link(this.__wbg_ptr, ptr0, len0, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns an iterator that can be used to traverse over all entries stored within this
   * instance of `YMap`. Order of entry is not specified.
   *
   * Example:
   *
   * ```javascript
   * import YDoc from 'ywasm'
   *
   * /// document on machine A
   * const doc = new YDoc()
   * const map = doc.getMap('name')
   * const txn = doc.beginTransaction()
   * try {
   *     map.set(txn, 'key1', 'value1')
   *     map.set(txn, 'key2', true)
   *
   *     for (let [key, value] of map.entries(txn)) {
   *         console.log(key, value)
   *     }
   * } finally {
   *     txn.free()
   * }
   * ```
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  entries(txn) {
    const ret = wasm.ymap_entries(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Subscribes to all operations happening over this instance of `YMap`. All changes are
   * batched and eventually triggered during transaction commit phase.
   * @param {Function} callback
   */
  observe(callback) {
    const ret = wasm.ymap_observe(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observe` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserve(callback) {
    const ret = wasm.ymap_unobserve(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
  /**
   * Subscribes to all operations happening over this Y shared type, as well as events in
   * shared types stored within this one. All changes are batched and eventually triggered
   * during transaction commit phase.
   * @param {Function} callback
   */
  observeDeep(callback) {
    const ret = wasm.ymap_observeDeep(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observeDeep` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserveDeep(callback) {
    const ret = wasm.ymap_unobserveDeep(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
}
module.exports.YMap = YMap;

const YMapEventFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_ymapevent_free(ptr >>> 0, 1),
      );
/**
 * Event generated by `YMap.observe` method. Emitted during transaction commit phase.
 */
class YMapEvent {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YMapEvent.prototype);
    obj.__wbg_ptr = ptr;
    YMapEventFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YMapEventFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_ymapevent_free(ptr, 0);
  }
  /**
   * @returns {any}
   */
  get origin() {
    const ret = wasm.ymapevent_origin(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns an array of keys and indexes creating a path from root type down to current instance
   * of shared type (accessible via `target` getter).
   * @returns {any}
   */
  path() {
    const ret = wasm.ymapevent_path(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a current shared type instance, that current event changes refer to.
   * @returns {any}
   */
  get target() {
    const ret = wasm.ymapevent_target(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a list of key-value changes made over corresponding `YMap` collection within
   * bounds of current transaction. These changes follow a format:
   *
   * - { action: 'add'|'update'|'delete', oldValue: any|undefined, newValue: any|undefined }
   * @returns {any}
   */
  get keys() {
    const ret = wasm.ymapevent_keys(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
}
module.exports.YMapEvent = YMapEvent;

const YSubdocsEventFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_ysubdocsevent_free(ptr >>> 0, 1),
      );

class YSubdocsEvent {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YSubdocsEvent.prototype);
    obj.__wbg_ptr = ptr;
    YSubdocsEventFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YSubdocsEventFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_ysubdocsevent_free(ptr, 0);
  }
  /**
   * @returns {Array<any>}
   */
  get added() {
    const ret = wasm.ysubdocsevent_added(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {Array<any>}
   */
  get removed() {
    const ret = wasm.ysubdocsevent_removed(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {Array<any>}
   */
  get loaded() {
    const ret = wasm.ysubdocsevent_loaded(this.__wbg_ptr);
    return ret;
  }
}
module.exports.YSubdocsEvent = YSubdocsEvent;

const YTextFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_ytext_free(ptr >>> 0, 1));
/**
 * A shared data type used for collaborative text editing. It enables multiple users to add and
 * remove chunks of text in efficient manner. This type is internally represented as a mutable
 * double-linked list of text chunks - an optimization occurs during `YTransaction.commit`, which
 * allows to squash multiple consecutively inserted characters together as a single chunk of text
 * even between transaction boundaries in order to preserve more efficient memory model.
 *
 * `YText` structure internally uses UTF-8 encoding and its length is described in a number of
 * bytes rather than individual characters (a single UTF-8 code point can consist of many bytes).
 *
 * Like all Yrs shared data types, `YText` is resistant to the problem of interleaving (situation
 * when characters inserted one after another may interleave with other peers concurrent inserts
 * after merging all updates together). In case of Yrs conflict resolution is solved by using
 * unique document id to determine correct and consistent ordering.
 */
class YText {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YText.prototype);
    obj.__wbg_ptr = ptr;
    YTextFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YTextFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_ytext_free(ptr, 0);
  }
  /**
   * Creates a new preliminary instance of a `YText` shared data type, with its state initialized
   * to provided parameter.
   *
   * Preliminary instances can be nested into other shared data types such as `YArray` and `YMap`.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @param {string | null} [init]
   */
  constructor(init) {
    var ptr0 = isLikeNone(init)
      ? 0
      : passStringToWasm0(
          init,
          wasm.__wbindgen_malloc,
          wasm.__wbindgen_realloc,
        );
    var len0 = WASM_VECTOR_LEN;
    const ret = wasm.ytext_new(ptr0, len0);
    this.__wbg_ptr = ret >>> 0;
    YTextFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  get type() {
    const ret = wasm.ytext_type(this.__wbg_ptr);
    return ret;
  }
  /**
   * Gets unique logical identifier of this type, shared across peers collaborating on the same
   * document.
   * @returns {any}
   */
  get id() {
    const ret = wasm.ytext_id(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns true if this is a preliminary instance of `YArray`.
   *
   * Preliminary instances can be nested into other shared data types such as `YArray` and `YMap`.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @returns {boolean}
   */
  get prelim() {
    const ret = wasm.ytext_prelim(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Checks if current YArray reference is alive and has not been deleted by its parent collection.
   * This method only works on already integrated shared types and will return false is current
   * type is preliminary (has not been integrated into document).
   * @param {YTransaction} txn
   * @returns {boolean}
   */
  alive(txn) {
    _assertClass(txn, YTransaction);
    const ret = wasm.ytext_alive(this.__wbg_ptr, txn.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Returns length of an underlying string stored in this `YText` instance,
   * understood as a number of UTF-8 encoded bytes.
   * @param {YTransaction | undefined} txn
   * @returns {number}
   */
  length(txn) {
    const ret = wasm.ytext_length(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
  }
  /**
   * Returns an underlying shared string stored in this data type.
   * @param {YTransaction | undefined} txn
   * @returns {string}
   */
  toString(txn) {
    let deferred2_0;
    let deferred2_1;
    try {
      const ret = wasm.ytext_toString(this.__wbg_ptr, txn);
      var ptr1 = ret[0];
      var len1 = ret[1];
      if (ret[3]) {
        ptr1 = 0;
        len1 = 0;
        throw takeFromExternrefTable0(ret[2]);
      }
      deferred2_0 = ptr1;
      deferred2_1 = len1;
      return getStringFromWasm0(ptr1, len1);
    } finally {
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
  /**
   * Returns an underlying shared string stored in this data type.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  toJson(txn) {
    const ret = wasm.ytext_toJson(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Inserts a given `chunk` of text into this `YText` instance, starting at a given `index`.
   *
   * Optional object with defined `attributes` will be used to wrap provided text `chunk`
   * with a formatting blocks.`attributes` are only supported for a `YText` instance which
   * already has been integrated into document store.
   * @param {number} index
   * @param {string} chunk
   * @param {any} attributes
   * @param {YTransaction | undefined} txn
   */
  insert(index, chunk, attributes, txn) {
    const ptr0 = passStringToWasm0(
      chunk,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ytext_insert(
      this.__wbg_ptr,
      index,
      ptr0,
      len0,
      attributes,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Inserts a given `embed` object into this `YText` instance, starting at a given `index`.
   *
   * Optional object with defined `attributes` will be used to wrap provided `embed`
   * with a formatting blocks.`attributes` are only supported for a `YText` instance which
   * already has been integrated into document store.
   * @param {number} index
   * @param {any} embed
   * @param {any} attributes
   * @param {YTransaction | undefined} txn
   */
  insertEmbed(index, embed, attributes, txn) {
    const ret = wasm.ytext_insertEmbed(
      this.__wbg_ptr,
      index,
      embed,
      attributes,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Wraps an existing piece of text within a range described by `index`-`length` parameters with
   * formatting blocks containing provided `attributes` metadata. This method only works for
   * `YText` instances that already have been integrated into document store.
   * @param {number} index
   * @param {number} length
   * @param {any} attributes
   * @param {YTransaction | undefined} txn
   */
  format(index, length, attributes, txn) {
    const ret = wasm.ytext_format(
      this.__wbg_ptr,
      index,
      length,
      attributes,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Appends a given `chunk` of text at the end of current `YText` instance.
   *
   * Optional object with defined `attributes` will be used to wrap provided text `chunk`
   * with a formatting blocks.`attributes` are only supported for a `YText` instance which
   * already has been integrated into document store.
   * @param {string} chunk
   * @param {any} attributes
   * @param {YTransaction | undefined} txn
   */
  push(chunk, attributes, txn) {
    const ptr0 = passStringToWasm0(
      chunk,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ytext_push(this.__wbg_ptr, ptr0, len0, attributes, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Deletes a specified range of characters, starting at a given `index`.
   * Both `index` and `length` are counted in terms of a number of UTF-8 character bytes.
   * @param {number} index
   * @param {number} length
   * @param {YTransaction | undefined} txn
   */
  delete(index, length, txn) {
    const ret = wasm.ytext_delete(this.__wbg_ptr, index, length, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number | null | undefined} lower
   * @param {number | null | undefined} upper
   * @param {boolean | null | undefined} lower_open
   * @param {boolean | null | undefined} upper_open
   * @param {YTransaction | undefined} txn
   * @returns {YWeakLink}
   */
  quote(lower, upper, lower_open, upper_open, txn) {
    const ret = wasm.ytext_quote(
      this.__wbg_ptr,
      isLikeNone(lower) ? 0x100000001 : lower >>> 0,
      isLikeNone(upper) ? 0x100000001 : upper >>> 0,
      isLikeNone(lower_open) ? 0xffffff : lower_open ? 1 : 0,
      isLikeNone(upper_open) ? 0xffffff : upper_open ? 1 : 0,
      txn,
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return YWeakLink.__wrap(ret[0]);
  }
  /**
   * Returns the Delta representation of this YText type.
   * @param {any} snapshot
   * @param {any} prev_snapshot
   * @param {Function | null | undefined} compute_ychange
   * @param {YTransaction | undefined} txn
   * @returns {Array<any>}
   */
  toDelta(snapshot, prev_snapshot, compute_ychange, txn) {
    const ret = wasm.ytext_toDelta(
      this.__wbg_ptr,
      snapshot,
      prev_snapshot,
      isLikeNone(compute_ychange) ? 0 : addToExternrefTable0(compute_ychange),
      txn,
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @param {Array<any>} delta
   * @param {YTransaction | undefined} txn
   */
  applyDelta(delta, txn) {
    const ret = wasm.ytext_applyDelta(this.__wbg_ptr, delta, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Subscribes to all operations happening over this instance of `YText`. All changes are
   * batched and eventually triggered during transaction commit phase.
   * @param {Function} callback
   */
  observe(callback) {
    const ret = wasm.ytext_observe(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observe` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserve(callback) {
    const ret = wasm.ytext_unobserve(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
  /**
   * Subscribes to all operations happening over this Y shared type, as well as events in
   * shared types stored within this one. All changes are batched and eventually triggered
   * during transaction commit phase.
   * @param {Function} callback
   */
  observeDeep(callback) {
    const ret = wasm.ytext_observeDeep(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observeDeep` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserveDeep(callback) {
    const ret = wasm.ytext_unobserveDeep(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
}
module.exports.YText = YText;

const YTextEventFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_ytextevent_free(ptr >>> 0, 1),
      );
/**
 * Event generated by `YYText.observe` method. Emitted during transaction commit phase.
 */
class YTextEvent {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YTextEvent.prototype);
    obj.__wbg_ptr = ptr;
    YTextEventFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YTextEventFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_ytextevent_free(ptr, 0);
  }
  /**
   * Returns an array of keys and indexes creating a path from root type down to current instance
   * of shared type (accessible via `target` getter).
   * @returns {any}
   */
  path() {
    const ret = wasm.ytextevent_path(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a current shared type instance, that current event changes refer to.
   * @returns {any}
   */
  get target() {
    const ret = wasm.ytextevent_target(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {any}
   */
  get origin() {
    const ret = wasm.ytextevent_origin(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a list of text changes made over corresponding `YText` collection within
   * bounds of current transaction. These changes follow a format:
   *
   * - { insert: string, attributes: any|undefined }
   * - { delete: number }
   * - { retain: number, attributes: any|undefined }
   * @returns {any}
   */
  get delta() {
    const ret = wasm.ytextevent_delta(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
}
module.exports.YTextEvent = YTextEvent;

const YTransactionFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_ytransaction_free(ptr >>> 0, 1),
      );

class YTransaction {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YTransaction.prototype);
    obj.__wbg_ptr = ptr;
    YTransactionFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YTransactionFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_ytransaction_free(ptr, 0);
  }
  /**
   * Returns state vector describing the state of the document
   * at the moment when the transaction began.
   * @returns {Map<any, any>}
   */
  get beforeState() {
    const ret = wasm.ytransaction_beforeState(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns state vector describing the current state of
   * the document.
   * @returns {Map<any, any>}
   */
  get afterState() {
    const ret = wasm.ytransaction_afterState(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {any}
   */
  get pendingStructs() {
    const ret = wasm.ytransaction_pendingStructs(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a unapplied delete set, that was received in one of the previous remote updates.
   * This DeleteSet is waiting for a missing updates to arrive in order to be applied.
   * @returns {Map<any, any> | undefined}
   */
  get pendingDeleteSet() {
    const ret = wasm.ytransaction_pendingDeleteSet(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a delete set containing information about
   * all blocks removed as part of a current transaction.
   * @returns {Map<any, any>}
   */
  get deleteSet() {
    const ret = wasm.ytransaction_deleteSet(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {any}
   */
  get origin() {
    const ret = wasm.ytransaction_origin(this.__wbg_ptr);
    return ret;
  }
  /**
   * Given a logical identifier of the collection (obtained via `YText.id`, `YArray.id` etc.),
   * attempts to return an instance of that collection in the scope of current document.
   *
   * Returns `undefined` if an instance was not defined locally, haven't been integrated or
   * has been deleted.
   * @param {any} id
   * @returns {any}
   */
  get(id) {
    const ret = wasm.ytransaction_get(this.__wbg_ptr, id);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Triggers a post-update series of operations without `free`ing the transaction. This includes
   * compaction and optimization of internal representation of updates, triggering events etc.
   * ywasm transactions are auto-committed when they are `free`d.
   */
  commit() {
    const ret = wasm.ytransaction_commit(this.__wbg_ptr);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Encodes a state vector of a given transaction document into its binary representation using
   * lib0 v1 encoding. State vector is a compact representation of updates performed on a given
   * document and can be used by `encode_state_as_update` on remote peer to generate a delta
   * update payload to synchronize changes between peers.
   *
   * Example:
   *
   * ```javascript
   * import YDoc from 'ywasm'
   *
   * /// document on machine A
   * const localDoc = new YDoc()
   * const localTxn = localDoc.beginTransaction()
   *
   * // document on machine B
   * const remoteDoc = new YDoc()
   * const remoteTxn = localDoc.beginTransaction()
   *
   * try {
   *     const localSV = localTxn.stateVectorV1()
   *     const remoteDelta = remoteTxn.diffV1(localSv)
   *     localTxn.applyV1(remoteDelta)
   * } finally {
   *     localTxn.free()
   *     remoteTxn.free()
   * }
   * ```
   * @returns {Uint8Array}
   */
  stateVectorV1() {
    const ret = wasm.ytransaction_stateVectorV1(this.__wbg_ptr);
    return ret;
  }
  /**
   * Encodes all updates that have happened since a given version `vector` into a compact delta
   * representation using lib0 v1 encoding. If `vector` parameter has not been provided, generated
   * delta payload will contain all changes of a current ywasm document, working effectively as
   * its state snapshot.
   *
   * Example:
   *
   * ```javascript
   * import YDoc from 'ywasm'
   *
   * /// document on machine A
   * const localDoc = new YDoc()
   * const localTxn = localDoc.beginTransaction()
   *
   * // document on machine B
   * const remoteDoc = new YDoc()
   * const remoteTxn = localDoc.beginTransaction()
   *
   * try {
   *     const localSV = localTxn.stateVectorV1()
   *     const remoteDelta = remoteTxn.diffV1(localSv)
   *     localTxn.applyV1(remoteDelta)
   * } finally {
   *     localTxn.free()
   *     remoteTxn.free()
   * }
   * ```
   * @param {Uint8Array | null} [vector]
   * @returns {Uint8Array}
   */
  diffV1(vector) {
    const ret = wasm.ytransaction_diffV1(
      this.__wbg_ptr,
      isLikeNone(vector) ? 0 : addToExternrefTable0(vector),
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Encodes all updates that have happened since a given version `vector` into a compact delta
   * representation using lib0 v1 encoding. If `vector` parameter has not been provided, generated
   * delta payload will contain all changes of a current ywasm document, working effectively as
   * its state snapshot.
   *
   * Example:
   *
   * ```javascript
   * import YDoc from 'ywasm'
   *
   * /// document on machine A
   * const localDoc = new YDoc()
   * const localTxn = localDoc.beginTransaction()
   *
   * // document on machine B
   * const remoteDoc = new YDoc()
   * const remoteTxn = localDoc.beginTransaction()
   *
   * try {
   *     const localSV = localTxn.stateVectorV1()
   *     const remoteDelta = remoteTxn.diffV2(localSv)
   *     localTxn.applyV2(remoteDelta)
   * } finally {
   *     localTxn.free()
   *     remoteTxn.free()
   * }
   * ```
   * @param {Uint8Array | null} [vector]
   * @returns {Uint8Array}
   */
  diffV2(vector) {
    const ret = wasm.ytransaction_diffV2(
      this.__wbg_ptr,
      isLikeNone(vector) ? 0 : addToExternrefTable0(vector),
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Applies delta update generated by the remote document replica to a current transaction's
   * document. This method assumes that a payload maintains lib0 v1 encoding format.
   *
   * Example:
   *
   * ```javascript
   * import YDoc from 'ywasm'
   *
   * /// document on machine A
   * const localDoc = new YDoc()
   * const localTxn = localDoc.beginTransaction()
   *
   * // document on machine B
   * const remoteDoc = new YDoc()
   * const remoteTxn = localDoc.beginTransaction()
   *
   * try {
   *     const localSV = localTxn.stateVectorV1()
   *     const remoteDelta = remoteTxn.diffV1(localSv)
   *     localTxn.applyV1(remoteDelta)
   * } finally {
   *     localTxn.free()
   *     remoteTxn.free()
   * }
   * ```
   * @param {Uint8Array} diff
   */
  applyV1(diff) {
    const ret = wasm.ytransaction_applyV1(this.__wbg_ptr, diff);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Applies delta update generated by the remote document replica to a current transaction's
   * document. This method assumes that a payload maintains lib0 v2 encoding format.
   *
   * Example:
   *
   * ```javascript
   * import YDoc from 'ywasm'
   *
   * /// document on machine A
   * const localDoc = new YDoc()
   * const localTxn = localDoc.beginTransaction()
   *
   * // document on machine B
   * const remoteDoc = new YDoc()
   * const remoteTxn = localDoc.beginTransaction()
   *
   * try {
   *     const localSV = localTxn.stateVectorV1()
   *     const remoteDelta = remoteTxn.diffV2(localSv)
   *     localTxn.applyV2(remoteDelta)
   * } finally {
   *     localTxn.free()
   *     remoteTxn.free()
   * }
   * ```
   * @param {Uint8Array} diff
   */
  applyV2(diff) {
    const ret = wasm.ytransaction_applyV2(this.__wbg_ptr, diff);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @returns {Uint8Array}
   */
  encodeUpdate() {
    const ret = wasm.ytransaction_encodeUpdate(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {Uint8Array}
   */
  encodeUpdateV2() {
    const ret = wasm.ytransaction_encodeUpdateV2(this.__wbg_ptr);
    return ret;
  }
  /**
   * Force garbage collection of the deleted elements, regardless of a parent doc was created
   * with `gc` option turned on or off.
   */
  gc() {
    const ret = wasm.ytransaction_gc(this.__wbg_ptr);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Evaluates a JSON path expression (see: https://en.wikipedia.org/wiki/JSONPath) on
   * the document and returns an array of values matching that query.
   *
   * Currently, this method supports the following syntax:
   * - `$` - root object
   * - `@` - current object
   * - `.field` or `['field']` - member accessor
   * - `[1]` - array index (also supports negative indices)
   * - `.*` or `[*]` - wildcard (matches all members of an object or array)
   * - `..` - recursive descent (matches all descendants not only direct children)
   * - `[start:end:step]` - array slice operator (requires positive integer arguments)
   * - `['a', 'b', 'c']` - union operator (returns an array of values for each query)
   * - `[1, -1, 3]` - multiple indices operator (returns an array of values for each index)
   *
   * At the moment, JSON Path does not support filter predicates.
   * @param {string} json_path
   * @returns {Array<any>}
   */
  selectAll(json_path) {
    const ptr0 = passStringToWasm0(
      json_path,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ytransaction_selectAll(this.__wbg_ptr, ptr0, len0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Evaluates a JSON path expression (see: https://en.wikipedia.org/wiki/JSONPath) on
   * the document and returns first value matching that query.
   *
   * Currently, this method supports the following syntax:
   * - `$` - root object
   * - `@` - current object
   * - `.field` or `['field']` - member accessor
   * - `[1]` - array index (also supports negative indices)
   * - `.*` or `[*]` - wildcard (matches all members of an object or array)
   * - `..` - recursive descent (matches all descendants not only direct children)
   * - `[start:end:step]` - array slice operator (requires positive integer arguments)
   * - `['a', 'b', 'c']` - union operator (returns an array of values for each query)
   * - `[1, -1, 3]` - multiple indices operator (returns an array of values for each index)
   *
   * At the moment, JSON Path does not support filter predicates.
   * @param {string} json_path
   * @returns {any}
   */
  selectOne(json_path) {
    const ptr0 = passStringToWasm0(
      json_path,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.ytransaction_selectOne(this.__wbg_ptr, ptr0, len0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
}
module.exports.YTransaction = YTransaction;

const YUndoEventFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_yundoevent_free(ptr >>> 0, 1),
      );

class YUndoEvent {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YUndoEvent.prototype);
    obj.__wbg_ptr = ptr;
    YUndoEventFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YUndoEventFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yundoevent_free(ptr, 0);
  }
  /**
   * @returns {any}
   */
  get origin() {
    const ret = wasm.yundoevent_origin(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {any}
   */
  get kind() {
    const ret = wasm.yundoevent_kind(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {any}
   */
  get meta() {
    const ret = wasm.yundoevent_meta(this.__wbg_ptr);
    return ret;
  }
  /**
   * @param {any} value
   */
  set meta(value) {
    wasm.yundoevent_set_meta(this.__wbg_ptr, value);
  }
}
module.exports.YUndoEvent = YUndoEvent;

const YUndoManagerFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_yundomanager_free(ptr >>> 0, 1),
      );

class YUndoManager {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YUndoManagerFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yundomanager_free(ptr, 0);
  }
  /**
   * @param {YDoc} doc
   * @param {any} scope
   * @param {any} options
   */
  constructor(doc, scope, options) {
    _assertClass(doc, YDoc);
    const ret = wasm.yundomanager_new(doc.__wbg_ptr, scope, options);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0] >>> 0;
    YUndoManagerFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @param {Array<any>} ytypes
   */
  addToScope(ytypes) {
    const ret = wasm.yundomanager_addToScope(this.__wbg_ptr, ytypes);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {any} origin
   */
  addTrackedOrigin(origin) {
    wasm.yundomanager_addTrackedOrigin(this.__wbg_ptr, origin);
  }
  /**
   * @param {any} origin
   */
  removeTrackedOrigin(origin) {
    wasm.yundomanager_removeTrackedOrigin(this.__wbg_ptr, origin);
  }
  clear() {
    wasm.yundomanager_clear(this.__wbg_ptr);
  }
  stopCapturing() {
    wasm.yundomanager_stopCapturing(this.__wbg_ptr);
  }
  undo() {
    const ret = wasm.yundomanager_undo(this.__wbg_ptr);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  redo() {
    const ret = wasm.yundomanager_redo(this.__wbg_ptr);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @returns {boolean}
   */
  get canUndo() {
    const ret = wasm.yundomanager_canUndo(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @returns {boolean}
   */
  get canRedo() {
    const ret = wasm.yundomanager_canRedo(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    const ptr0 = passStringToWasm0(
      event,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yundomanager_on(this.__wbg_ptr, ptr0, len0, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {string} event
   * @param {Function} callback
   * @returns {boolean}
   */
  off(event, callback) {
    const ptr0 = passStringToWasm0(
      event,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yundomanager_off(this.__wbg_ptr, ptr0, len0, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
}
module.exports.YUndoManager = YUndoManager;

const YWeakLinkFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_yweaklink_free(ptr >>> 0, 1),
      );

class YWeakLink {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YWeakLink.prototype);
    obj.__wbg_ptr = ptr;
    YWeakLinkFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YWeakLinkFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yweaklink_free(ptr, 0);
  }
  /**
   * Returns true if this is a preliminary instance of `YWeakLink`.
   *
   * Preliminary instances can be nested into other shared data types such as `YArray` and `YMap`.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @returns {boolean}
   */
  get prelim() {
    const ret = wasm.yweaklink_prelim(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @returns {number}
   */
  get type() {
    const ret = wasm.yweaklink_type(this.__wbg_ptr);
    return ret;
  }
  /**
   * Gets unique logical identifier of this type, shared across peers collaborating on the same
   * document.
   * @returns {any}
   */
  get id() {
    const ret = wasm.yweaklink_id(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Checks if current YWeakLink reference is alive and has not been deleted by its parent collection.
   * This method only works on already integrated shared types and will return false is current
   * type is preliminary (has not been integrated into document).
   * @param {YTransaction} txn
   * @returns {boolean}
   */
  alive(txn) {
    _assertClass(txn, YTransaction);
    const ret = wasm.yweaklink_alive(this.__wbg_ptr, txn.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  deref(txn) {
    const ret = wasm.yweaklink_deref(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @param {YTransaction | undefined} txn
   * @returns {Array<any>}
   */
  unquote(txn) {
    const ret = wasm.yweaklink_unquote(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * @param {YTransaction | undefined} txn
   * @returns {string}
   */
  toString(txn) {
    let deferred2_0;
    let deferred2_1;
    try {
      const ret = wasm.yweaklink_toString(this.__wbg_ptr, txn);
      var ptr1 = ret[0];
      var len1 = ret[1];
      if (ret[3]) {
        ptr1 = 0;
        len1 = 0;
        throw takeFromExternrefTable0(ret[2]);
      }
      deferred2_0 = ptr1;
      deferred2_1 = len1;
      return getStringFromWasm0(ptr1, len1);
    } finally {
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
  /**
   * Subscribes to all operations happening over this instance of `YMap`. All changes are
   * batched and eventually triggered during transaction commit phase.
   * @param {Function} callback
   */
  observe(callback) {
    const ret = wasm.yweaklink_observe(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observe` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserve(callback) {
    const ret = wasm.yweaklink_unobserve(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
  /**
   * Subscribes to all operations happening over this Y shared type, as well as events in
   * shared types stored within this one. All changes are batched and eventually triggered
   * during transaction commit phase.
   * @param {Function} callback
   */
  observeDeep(callback) {
    const ret = wasm.yweaklink_observeDeep(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observeDeep` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserveDeep(callback) {
    const ret = wasm.yweaklink_unobserveDeep(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
}
module.exports.YWeakLink = YWeakLink;

const YWeakLinkEventFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_yweaklinkevent_free(ptr >>> 0, 1),
      );
/**
 * Event generated by `YXmlElement.observe` method. Emitted during transaction commit phase.
 */
class YWeakLinkEvent {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YWeakLinkEvent.prototype);
    obj.__wbg_ptr = ptr;
    YWeakLinkEventFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YWeakLinkEventFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yweaklinkevent_free(ptr, 0);
  }
  /**
   * @returns {any}
   */
  get origin() {
    const ret = wasm.yweaklinkevent_origin(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a current shared type instance, that current event changes refer to.
   * @returns {any}
   */
  get target() {
    const ret = wasm.yweaklinkevent_target(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns an array of keys and indexes creating a path from root type down to current instance
   * of shared type (accessible via `target` getter).
   * @returns {any}
   */
  path() {
    const ret = wasm.yweaklinkevent_path(this.__wbg_ptr);
    return ret;
  }
}
module.exports.YWeakLinkEvent = YWeakLinkEvent;

const YXmlElementFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_yxmlelement_free(ptr >>> 0, 1),
      );
/**
 * XML element data type. It represents an XML node, which can contain key-value attributes
 * (interpreted as strings) as well as other nested XML elements or rich text (represented by
 * `YXmlText` type).
 *
 * In terms of conflict resolution, `YXmlElement` uses following rules:
 *
 * - Attribute updates use logical last-write-wins principle, meaning the past updates are
 *   automatically overridden and discarded by newer ones, while concurrent updates made by
 *   different peers are resolved into a single value using document id seniority to establish
 *   an order.
 * - Child node insertion uses sequencing rules from other Yrs collections - elements are inserted
 *   using interleave-resistant algorithm, where order of concurrent inserts at the same index
 *   is established using peer's document id seniority.
 */
class YXmlElement {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YXmlElement.prototype);
    obj.__wbg_ptr = ptr;
    YXmlElementFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YXmlElementFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yxmlelement_free(ptr, 0);
  }
  /**
   * @param {string} name
   * @param {any} attributes
   * @param {any} children
   */
  constructor(name, attributes, children) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmlelement_new(ptr0, len0, attributes, children);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0] >>> 0;
    YXmlElementFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  get type() {
    const ret = wasm.yxmlelement_type(this.__wbg_ptr);
    return ret;
  }
  /**
   * Gets unique logical identifier of this type, shared across peers collaborating on the same
   * document.
   * @returns {any}
   */
  get id() {
    const ret = wasm.yxmlelement_id(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns true if this is a preliminary instance of `YXmlElement`.
   *
   * Preliminary instances can be nested into other shared data types.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @returns {boolean}
   */
  get prelim() {
    const ret = wasm.yxmlelement_prelim(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Checks if current shared type reference is alive and has not been deleted by its parent collection.
   * This method only works on already integrated shared types and will return false is current
   * type is preliminary (has not been integrated into document).
   * @param {YTransaction} txn
   * @returns {boolean}
   */
  alive(txn) {
    _assertClass(txn, YTransaction);
    const ret = wasm.yxmlelement_alive(this.__wbg_ptr, txn.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Returns a tag name of this XML node.
   * @param {YTransaction | undefined} txn
   * @returns {string}
   */
  name(txn) {
    let deferred2_0;
    let deferred2_1;
    try {
      const ret = wasm.yxmlelement_name(this.__wbg_ptr, txn);
      var ptr1 = ret[0];
      var len1 = ret[1];
      if (ret[3]) {
        ptr1 = 0;
        len1 = 0;
        throw takeFromExternrefTable0(ret[2]);
      }
      deferred2_0 = ptr1;
      deferred2_1 = len1;
      return getStringFromWasm0(ptr1, len1);
    } finally {
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
  /**
   * Returns a number of child XML nodes stored within this `YXMlElement` instance.
   * @param {YTransaction | undefined} txn
   * @returns {number}
   */
  length(txn) {
    const ret = wasm.yxmlelement_length(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
  }
  /**
   * @param {number} index
   * @param {any} xml_node
   * @param {YTransaction | undefined} txn
   */
  insert(index, xml_node, txn) {
    const ret = wasm.yxmlelement_insert(this.__wbg_ptr, index, xml_node, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {any} xml_node
   * @param {YTransaction | undefined} txn
   */
  push(xml_node, txn) {
    const ret = wasm.yxmlelement_push(this.__wbg_ptr, xml_node, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} index
   * @param {number | null | undefined} length
   * @param {YTransaction | undefined} txn
   */
  delete(index, length, txn) {
    const ret = wasm.yxmlelement_delete(
      this.__wbg_ptr,
      index,
      isLikeNone(length) ? 0x100000001 : length >>> 0,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns a first child of this XML node.
   * It can be either `YXmlElement`, `YXmlText` or `undefined` if current node has not children.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  firstChild(txn) {
    const ret = wasm.yxmlelement_firstChild(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a next XML sibling node of this XMl node.
   * It can be either `YXmlElement`, `YXmlText` or `undefined` if current node is a last child of
   * parent XML node.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  nextSibling(txn) {
    const ret = wasm.yxmlelement_nextSibling(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a previous XML sibling node of this XMl node.
   * It can be either `YXmlElement`, `YXmlText` or `undefined` if current node is a first child
   * of parent XML node.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  prevSibling(txn) {
    const ret = wasm.yxmlelement_prevSibling(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a parent `YXmlElement` node or `undefined` if current node has no parent assigned.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  parent(txn) {
    const ret = wasm.yxmlelement_parent(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a string representation of this XML node.
   * @param {YTransaction | undefined} txn
   * @returns {string}
   */
  toString(txn) {
    let deferred2_0;
    let deferred2_1;
    try {
      const ret = wasm.yxmlelement_toString(this.__wbg_ptr, txn);
      var ptr1 = ret[0];
      var len1 = ret[1];
      if (ret[3]) {
        ptr1 = 0;
        len1 = 0;
        throw takeFromExternrefTable0(ret[2]);
      }
      deferred2_0 = ptr1;
      deferred2_1 = len1;
      return getStringFromWasm0(ptr1, len1);
    } finally {
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
  /**
   * Sets a `name` and `value` as new attribute for this XML node. If an attribute with the same
   * `name` already existed on that node, its value with be overridden with a provided one.
   * This method accepts any JavaScript value, not just strings.
   * @param {string} name
   * @param {any} value
   * @param {YTransaction | undefined} txn
   */
  setAttribute(name, value, txn) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmlelement_setAttribute(
      this.__wbg_ptr,
      ptr0,
      len0,
      value,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns a value of an attribute given its `name` as any JS value. If no attribute with such name existed,
   * `undefined` will be returned.
   * @param {string} name
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  getAttribute(name, txn) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmlelement_getAttribute(this.__wbg_ptr, ptr0, len0, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Removes an attribute from this XML node, given its `name`.
   * @param {string} name
   * @param {YTransaction | undefined} txn
   */
  removeAttribute(name, txn) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmlelement_removeAttribute(
      this.__wbg_ptr,
      ptr0,
      len0,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns an iterator that enables to traverse over all attributes of this XML node in
   * unspecified order. This method returns attribute values as their original JS values,
   * not just as strings.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  attributes(txn) {
    const ret = wasm.yxmlelement_attributes(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns an iterator that enables a deep traversal of this XML node - starting from first
   * child over this XML node successors using depth-first strategy.
   * @param {YTransaction | undefined} txn
   * @returns {Array<any>}
   */
  treeWalker(txn) {
    const ret = wasm.yxmlelement_treeWalker(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Subscribes to all operations happening over this instance of `YXmlElement`. All changes are
   * batched and eventually triggered during transaction commit phase.
   * @param {Function} callback
   */
  observe(callback) {
    const ret = wasm.yxmlelement_observe(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observe` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserve(callback) {
    const ret = wasm.yxmlelement_unobserve(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
  /**
   * Subscribes to all operations happening over this Y shared type, as well as events in
   * shared types stored within this one. All changes are batched and eventually triggered
   * during transaction commit phase.
   * @param {Function} callback
   */
  observeDeep(callback) {
    const ret = wasm.yxmlelement_observeDeep(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observeDeep` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserveDeep(callback) {
    const ret = wasm.yxmlelement_unobserveDeep(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
}
module.exports.YXmlElement = YXmlElement;

const YXmlEventFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_yxmlevent_free(ptr >>> 0, 1),
      );
/**
 * Event generated by `YXmlElement.observe` method. Emitted during transaction commit phase.
 */
class YXmlEvent {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YXmlEvent.prototype);
    obj.__wbg_ptr = ptr;
    YXmlEventFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YXmlEventFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yxmlevent_free(ptr, 0);
  }
  /**
   * Returns an array of keys and indexes creating a path from root type down to current instance
   * of shared type (accessible via `target` getter).
   * @returns {any}
   */
  path() {
    const ret = wasm.yxmlevent_path(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a current shared type instance, that current event changes refer to.
   * @returns {any}
   */
  get target() {
    const ret = wasm.yxmlevent_target(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {any}
   */
  get origin() {
    const ret = wasm.yxmlevent_origin(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a list of attribute changes made over corresponding `YXmlText` collection within
   * bounds of current transaction. These changes follow a format:
   *
   * - { action: 'add'|'update'|'delete', oldValue: string|undefined, newValue: string|undefined }
   * @returns {any}
   */
  get keys() {
    const ret = wasm.yxmlevent_keys(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a list of XML child node changes made over corresponding `YXmlElement` collection
   * within bounds of current transaction. These changes follow a format:
   *
   * - { insert: (YXmlText|YXmlElement)[] }
   * - { delete: number }
   * - { retain: number }
   * @returns {any}
   */
  get delta() {
    const ret = wasm.yxmlevent_delta(this.__wbg_ptr);
    return ret;
  }
}
module.exports.YXmlEvent = YXmlEvent;

const YXmlFragmentFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_yxmlfragment_free(ptr >>> 0, 1),
      );
/**
 * Represents a list of `YXmlElement` and `YXmlText` types.
 * A `YXmlFragment` is similar to a `YXmlElement`, but it does not have a
 * nodeName and it does not have attributes. Though it can be bound to a DOM
 * element - in this case the attributes and the nodeName are not shared
 */
class YXmlFragment {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YXmlFragment.prototype);
    obj.__wbg_ptr = ptr;
    YXmlFragmentFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YXmlFragmentFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yxmlfragment_free(ptr, 0);
  }
  /**
   * @param {any[]} children
   */
  constructor(children) {
    const ptr0 = passArrayJsValueToWasm0(children, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmlfragment_new(ptr0, len0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0] >>> 0;
    YXmlFragmentFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  get type() {
    const ret = wasm.yxmlfragment_type(this.__wbg_ptr);
    return ret;
  }
  /**
   * Gets unique logical identifier of this type, shared across peers collaborating on the same
   * document.
   * @returns {any}
   */
  get id() {
    const ret = wasm.yxmlfragment_id(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns true if this is a preliminary instance of `YXmlFragment`.
   *
   * Preliminary instances can be nested into other shared data types.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @returns {boolean}
   */
  get prelim() {
    const ret = wasm.yxmlfragment_prelim(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Checks if current shared type reference is alive and has not been deleted by its parent collection.
   * This method only works on already integrated shared types and will return false is current
   * type is preliminary (has not been integrated into document).
   * @param {YTransaction} txn
   * @returns {boolean}
   */
  alive(txn) {
    _assertClass(txn, YTransaction);
    const ret = wasm.yxmlfragment_alive(this.__wbg_ptr, txn.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Returns a number of child XML nodes stored within this `YXMlElement` instance.
   * @param {YTransaction | undefined} txn
   * @returns {number}
   */
  length(txn) {
    const ret = wasm.yxmlfragment_length(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
  }
  /**
   * @param {number} index
   * @param {any} xml_node
   * @param {YTransaction | undefined} txn
   */
  insert(index, xml_node, txn) {
    const ret = wasm.yxmlfragment_insert(this.__wbg_ptr, index, xml_node, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {any} xml_node
   * @param {YTransaction | undefined} txn
   */
  push(xml_node, txn) {
    const ret = wasm.yxmlfragment_push(this.__wbg_ptr, xml_node, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number} index
   * @param {number | null | undefined} length
   * @param {YTransaction | undefined} txn
   */
  delete(index, length, txn) {
    const ret = wasm.yxmlfragment_delete(
      this.__wbg_ptr,
      index,
      isLikeNone(length) ? 0x100000001 : length >>> 0,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns a first child of this XML node.
   * It can be either `YXmlElement`, `YXmlText` or `undefined` if current node has not children.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  firstChild(txn) {
    const ret = wasm.yxmlfragment_firstChild(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a string representation of this XML node.
   * @param {YTransaction | undefined} txn
   * @returns {string}
   */
  toString(txn) {
    let deferred2_0;
    let deferred2_1;
    try {
      const ret = wasm.yxmlfragment_toString(this.__wbg_ptr, txn);
      var ptr1 = ret[0];
      var len1 = ret[1];
      if (ret[3]) {
        ptr1 = 0;
        len1 = 0;
        throw takeFromExternrefTable0(ret[2]);
      }
      deferred2_0 = ptr1;
      deferred2_1 = len1;
      return getStringFromWasm0(ptr1, len1);
    } finally {
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
  /**
   * Returns an iterator that enables a deep traversal of this XML node - starting from first
   * child over this XML node successors using depth-first strategy.
   * @param {YTransaction | undefined} txn
   * @returns {Array<any>}
   */
  treeWalker(txn) {
    const ret = wasm.yxmlfragment_treeWalker(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Subscribes to all operations happening over this instance of `YXmlFragment`. All changes are
   * batched and eventually triggered during transaction commit phase.
   * @param {Function} callback
   */
  observe(callback) {
    const ret = wasm.yxmlfragment_observe(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observe` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserve(callback) {
    const ret = wasm.yxmlfragment_unobserve(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
  /**
   * Subscribes to all operations happening over this Y shared type, as well as events in
   * shared types stored within this one. All changes are batched and eventually triggered
   * during transaction commit phase.
   * @param {Function} callback
   */
  observeDeep(callback) {
    const ret = wasm.yxmlfragment_observeDeep(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observeDeep` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserveDeep(callback) {
    const ret = wasm.yxmlfragment_unobserveDeep(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
}
module.exports.YXmlFragment = YXmlFragment;

const YXmlTextFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_yxmltext_free(ptr >>> 0, 1));
/**
 * A shared data type used for collaborative text editing, that can be used in a context of
 * `YXmlElement` nodee. It enables multiple users to add and remove chunks of text in efficient
 * manner. This type is internally represented as a mutable double-linked list of text chunks
 * - an optimization occurs during `YTransaction.commit`, which allows to squash multiple
 * consecutively inserted characters together as a single chunk of text even between transaction
 * boundaries in order to preserve more efficient memory model.
 *
 * Just like `YXmlElement`, `YXmlText` can be marked with extra metadata in form of attributes.
 *
 * `YXmlText` structure internally uses UTF-8 encoding and its length is described in a number of
 * bytes rather than individual characters (a single UTF-8 code point can consist of many bytes).
 *
 * Like all Yrs shared data types, `YXmlText` is resistant to the problem of interleaving (situation
 * when characters inserted one after another may interleave with other peers concurrent inserts
 * after merging all updates together). In case of Yrs conflict resolution is solved by using
 * unique document id to determine correct and consistent ordering.
 */
class YXmlText {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YXmlText.prototype);
    obj.__wbg_ptr = ptr;
    YXmlTextFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YXmlTextFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yxmltext_free(ptr, 0);
  }
  /**
   * @param {string | null | undefined} text
   * @param {any} attributes
   */
  constructor(text, attributes) {
    var ptr0 = isLikeNone(text)
      ? 0
      : passStringToWasm0(
          text,
          wasm.__wbindgen_malloc,
          wasm.__wbindgen_realloc,
        );
    var len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmltext_new(ptr0, len0, attributes);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    this.__wbg_ptr = ret[0] >>> 0;
    YXmlTextFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  get type() {
    const ret = wasm.yxmltext_type(this.__wbg_ptr);
    return ret;
  }
  /**
   * Gets unique logical identifier of this type, shared across peers collaborating on the same
   * document.
   * @returns {any}
   */
  get id() {
    const ret = wasm.yxmltext_id(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns true if this is a preliminary instance of `YXmlText`.
   *
   * Preliminary instances can be nested into other shared data types.
   * Once a preliminary instance has been inserted this way, it becomes integrated into ywasm
   * document store and cannot be nested again: attempt to do so will result in an exception.
   * @returns {boolean}
   */
  get prelim() {
    const ret = wasm.yxmltext_prelim(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Checks if current shared type reference is alive and has not been deleted by its parent collection.
   * This method only works on already integrated shared types and will return false is current
   * type is preliminary (has not been integrated into document).
   * @param {YTransaction} txn
   * @returns {boolean}
   */
  alive(txn) {
    _assertClass(txn, YTransaction);
    const ret = wasm.yxmltext_alive(this.__wbg_ptr, txn.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * Returns length of an underlying string stored in this `YXmlText` instance,
   * understood as a number of UTF-8 encoded bytes.
   * @param {YTransaction | undefined} txn
   * @returns {number}
   */
  length(txn) {
    const ret = wasm.yxmltext_length(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] >>> 0;
  }
  /**
   * Inserts a given `chunk` of text into this `YXmlText` instance, starting at a given `index`.
   *
   * Optional object with defined `attributes` will be used to wrap provided text `chunk`
   * with a formatting blocks.
   * @param {number} index
   * @param {string} chunk
   * @param {any} attributes
   * @param {YTransaction | undefined} txn
   */
  insert(index, chunk, attributes, txn) {
    const ptr0 = passStringToWasm0(
      chunk,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmltext_insert(
      this.__wbg_ptr,
      index,
      ptr0,
      len0,
      attributes,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Formats text within bounds specified by `index` and `len` with a given formatting
   * attributes.
   * @param {number} index
   * @param {number} length
   * @param {any} attributes
   * @param {YTransaction | undefined} txn
   */
  format(index, length, attributes, txn) {
    const ret = wasm.yxmltext_format(
      this.__wbg_ptr,
      index,
      length,
      attributes,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {number | null | undefined} lower
   * @param {number | null | undefined} upper
   * @param {boolean | null | undefined} lower_open
   * @param {boolean | null | undefined} upper_open
   * @param {YTransaction | undefined} txn
   * @returns {YWeakLink}
   */
  quote(lower, upper, lower_open, upper_open, txn) {
    const ret = wasm.yxmltext_quote(
      this.__wbg_ptr,
      isLikeNone(lower) ? 0x100000001 : lower >>> 0,
      isLikeNone(upper) ? 0x100000001 : upper >>> 0,
      isLikeNone(lower_open) ? 0xffffff : lower_open ? 1 : 0,
      isLikeNone(upper_open) ? 0xffffff : upper_open ? 1 : 0,
      txn,
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return YWeakLink.__wrap(ret[0]);
  }
  /**
   * Returns the Delta representation of this YXmlText type.
   * @param {any} snapshot
   * @param {any} prev_snapshot
   * @param {Function | null | undefined} compute_ychange
   * @param {YTransaction | undefined} txn
   * @returns {Array<any>}
   */
  toDelta(snapshot, prev_snapshot, compute_ychange, txn) {
    const ret = wasm.yxmltext_toDelta(
      this.__wbg_ptr,
      snapshot,
      prev_snapshot,
      isLikeNone(compute_ychange) ? 0 : addToExternrefTable0(compute_ychange),
      txn,
    );
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Inserts a given `embed` object into this `YXmlText` instance, starting at a given `index`.
   *
   * Optional object with defined `attributes` will be used to wrap provided `embed`
   * with a formatting blocks.`attributes` are only supported for a `YXmlText` instance which
   * already has been integrated into document store.
   * @param {number} index
   * @param {any} embed
   * @param {any} attributes
   * @param {YTransaction | undefined} txn
   */
  insertEmbed(index, embed, attributes, txn) {
    const ret = wasm.yxmltext_insertEmbed(
      this.__wbg_ptr,
      index,
      embed,
      attributes,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Appends a given `chunk` of text at the end of `YXmlText` instance.
   *
   * Optional object with defined `attributes` will be used to wrap provided text `chunk`
   * with a formatting blocks.
   * @param {string} chunk
   * @param {any} attributes
   * @param {YTransaction | undefined} txn
   */
  push(chunk, attributes, txn) {
    const ptr0 = passStringToWasm0(
      chunk,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmltext_push(this.__wbg_ptr, ptr0, len0, attributes, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * @param {Array<any>} delta
   * @param {YTransaction | undefined} txn
   */
  applyDelta(delta, txn) {
    const ret = wasm.yxmltext_applyDelta(this.__wbg_ptr, delta, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Deletes a specified range of characters, starting at a given `index`.
   * Both `index` and `length` are counted in terms of a number of UTF-8 character bytes.
   * @param {number} index
   * @param {number} length
   * @param {YTransaction | undefined} txn
   */
  delete(index, length, txn) {
    const ret = wasm.yxmltext_delete(this.__wbg_ptr, index, length, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns a next XML sibling node of this XMl node.
   * It can be either `YXmlElement`, `YXmlText` or `undefined` if current node is a last child of
   * parent XML node.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  nextSibling(txn) {
    const ret = wasm.yxmltext_nextSibling(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a previous XML sibling node of this XMl node.
   * It can be either `YXmlElement`, `YXmlText` or `undefined` if current node is a first child
   * of parent XML node.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  prevSibling(txn) {
    const ret = wasm.yxmltext_prevSibling(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a parent `YXmlElement` node or `undefined` if current node has no parent assigned.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  parent(txn) {
    const ret = wasm.yxmltext_parent(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns an underlying string stored in this `YXmlText` instance.
   * @param {YTransaction | undefined} txn
   * @returns {string}
   */
  toString(txn) {
    let deferred2_0;
    let deferred2_1;
    try {
      const ret = wasm.yxmltext_toString(this.__wbg_ptr, txn);
      var ptr1 = ret[0];
      var len1 = ret[1];
      if (ret[3]) {
        ptr1 = 0;
        len1 = 0;
        throw takeFromExternrefTable0(ret[2]);
      }
      deferred2_0 = ptr1;
      deferred2_1 = len1;
      return getStringFromWasm0(ptr1, len1);
    } finally {
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
  /**
   * Sets a `name` and `value` as new attribute for this XML node. If an attribute with the same
   * `name` already existed on that node, its value with be overridden with a provided one.
   * This method accepts any JavaScript value, not just strings.
   * @param {string} name
   * @param {any} value
   * @param {YTransaction | undefined} txn
   */
  setAttribute(name, value, txn) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmltext_setAttribute(
      this.__wbg_ptr,
      ptr0,
      len0,
      value,
      txn,
    );
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns a value of an attribute given its `name` as any JS value. If no attribute with such name existed,
   * `undefined` will be returned.
   * @param {string} name
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  getAttribute(name, txn) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmltext_getAttribute(this.__wbg_ptr, ptr0, len0, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Removes an attribute from this XML node, given its `name`.
   * @param {string} name
   * @param {YTransaction | undefined} txn
   */
  removeAttribute(name, txn) {
    const ptr0 = passStringToWasm0(
      name,
      wasm.__wbindgen_malloc,
      wasm.__wbindgen_realloc,
    );
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.yxmltext_removeAttribute(this.__wbg_ptr, ptr0, len0, txn);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Returns an iterator that enables to traverse over all attributes of this XML node in
   * unspecified order. This method returns attribute values as their original JS values,
   * not just as strings.
   * @param {YTransaction | undefined} txn
   * @returns {any}
   */
  attributes(txn) {
    const ret = wasm.yxmltext_attributes(this.__wbg_ptr, txn);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Subscribes to all operations happening over this instance of `YXmlText`. All changes are
   * batched and eventually triggered during transaction commit phase.
   * @param {Function} callback
   */
  observe(callback) {
    const ret = wasm.yxmltext_observe(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observe` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserve(callback) {
    const ret = wasm.yxmltext_unobserve(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
  /**
   * Subscribes to all operations happening over this Y shared type, as well as events in
   * shared types stored within this one. All changes are batched and eventually triggered
   * during transaction commit phase.
   * @param {Function} callback
   */
  observeDeep(callback) {
    const ret = wasm.yxmltext_observeDeep(this.__wbg_ptr, callback);
    if (ret[1]) {
      throw takeFromExternrefTable0(ret[0]);
    }
  }
  /**
   * Unsubscribes a callback previously subscribed with `observe` method.
   * @param {Function} callback
   * @returns {boolean}
   */
  unobserveDeep(callback) {
    const ret = wasm.yxmltext_unobserveDeep(this.__wbg_ptr, callback);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0] !== 0;
  }
}
module.exports.YXmlText = YXmlText;

const YXmlTextEventFinalization =
  typeof FinalizationRegistry === "undefined"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) =>
        wasm.__wbg_yxmltextevent_free(ptr >>> 0, 1),
      );
/**
 * Event generated by `YXmlText.observe` method. Emitted during transaction commit phase.
 */
class YXmlTextEvent {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(YXmlTextEvent.prototype);
    obj.__wbg_ptr = ptr;
    YXmlTextEventFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    YXmlTextEventFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_yxmltextevent_free(ptr, 0);
  }
  /**
   * Returns an array of keys and indexes creating a path from root type down to current instance
   * of shared type (accessible via `target` getter).
   * @returns {any}
   */
  path() {
    const ret = wasm.yxmltextevent_path(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a current shared type instance, that current event changes refer to.
   * @returns {any}
   */
  get target() {
    const ret = wasm.yxmltextevent_target(this.__wbg_ptr);
    return ret;
  }
  /**
   * @returns {any}
   */
  get origin() {
    const ret = wasm.yxmltextevent_origin(this.__wbg_ptr);
    return ret;
  }
  /**
   * Returns a list of text changes made over corresponding `YText` collection within
   * bounds of current transaction. These changes follow a format:
   *
   * - { insert: string, attributes: any|undefined }
   * - { delete: number }
   * - { retain: number, attributes: any|undefined }
   * @returns {any}
   */
  get delta() {
    const ret = wasm.yxmltextevent_delta(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
  /**
   * Returns a list of attribute changes made over corresponding `YXmlText` collection within
   * bounds of current transaction. These changes follow a format:
   *
   * - { action: 'add'|'update'|'delete', oldValue: string|undefined, newValue: string|undefined }
   * @returns {any}
   */
  get keys() {
    const ret = wasm.yxmltextevent_keys(this.__wbg_ptr);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
  }
}
module.exports.YXmlTextEvent = YXmlTextEvent;

module.exports.__wbg_buffer_609cc3eee51ed158 = function (arg0) {
  const ret = arg0.buffer;
  return ret;
};

module.exports.__wbg_call_672a4d21634d4a24 = function () {
  return handleError(function (arg0, arg1) {
    const ret = arg0.call(arg1);
    return ret;
  }, arguments);
};

module.exports.__wbg_call_7cccdd69e0791ae2 = function () {
  return handleError(function (arg0, arg1, arg2) {
    const ret = arg0.call(arg1, arg2);
    return ret;
  }, arguments);
};

module.exports.__wbg_call_833bed5770ea2041 = function () {
  return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = arg0.call(arg1, arg2, arg3);
    return ret;
  }, arguments);
};

module.exports.__wbg_crypto_574e78ad8b13b65f = function (arg0) {
  const ret = arg0.crypto;
  return ret;
};

module.exports.__wbg_entries_3265d4158b33e5dc = function (arg0) {
  const ret = Object.entries(arg0);
  return ret;
};

module.exports.__wbg_error_7534b8e9a36f1ab4 = function (arg0, arg1) {
  let deferred0_0;
  let deferred0_1;
  try {
    deferred0_0 = arg0;
    deferred0_1 = arg1;
    console.error(getStringFromWasm0(arg0, arg1));
  } finally {
    wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
  }
};

module.exports.__wbg_from_2a5d3e218e67aa85 = function (arg0) {
  const ret = Array.from(arg0);
  return ret;
};

module.exports.__wbg_getRandomValues_b8f5dbd5f3995a9e = function () {
  return handleError(function (arg0, arg1) {
    arg0.getRandomValues(arg1);
  }, arguments);
};

module.exports.__wbg_get_67b2ba62fc30de12 = function () {
  return handleError(function (arg0, arg1) {
    const ret = Reflect.get(arg0, arg1);
    return ret;
  }, arguments);
};

module.exports.__wbg_get_b9b93047fe3cf45b = function (arg0, arg1) {
  const ret = arg0[arg1 >>> 0];
  return ret;
};

module.exports.__wbg_isArray_a1eab7e0d067391b = function (arg0) {
  const ret = Array.isArray(arg0);
  return ret;
};

module.exports.__wbg_length_a446193dc22c12f8 = function (arg0) {
  const ret = arg0.length;
  return ret;
};

module.exports.__wbg_length_e2d2a49132c1b256 = function (arg0) {
  const ret = arg0.length;
  return ret;
};

module.exports.__wbg_msCrypto_a61aeb35a24c1329 = function (arg0) {
  const ret = arg0.msCrypto;
  return ret;
};

module.exports.__wbg_new_405e22f390576ce2 = function () {
  const ret = new Object();
  return ret;
};

module.exports.__wbg_new_5e0be73521bc8c17 = function () {
  const ret = new Map();
  return ret;
};

module.exports.__wbg_new_78feb108b6472713 = function () {
  const ret = new Array();
  return ret;
};

module.exports.__wbg_new_8a6f238a6ece86ea = function () {
  const ret = new Error();
  return ret;
};

module.exports.__wbg_new_a12002a7f91c75be = function (arg0) {
  const ret = new Uint8Array(arg0);
  return ret;
};

module.exports.__wbg_new_a239edaa1dc2968f = function (arg0) {
  const ret = new Set(arg0);
  return ret;
};

module.exports.__wbg_newnoargs_105ed471475aaf50 = function (arg0, arg1) {
  const ret = new Function(getStringFromWasm0(arg0, arg1));
  return ret;
};

module.exports.__wbg_newwithbyteoffsetandlength_d97e637ebe145a9a = function (
  arg0,
  arg1,
  arg2,
) {
  const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
  return ret;
};

module.exports.__wbg_newwithlength_a381634e90c276d4 = function (arg0) {
  const ret = new Uint8Array(arg0 >>> 0);
  return ret;
};

module.exports.__wbg_node_905d3e251edff8a2 = function (arg0) {
  const ret = arg0.node;
  return ret;
};

module.exports.__wbg_now_807e54c39636c349 = function () {
  const ret = Date.now();
  return ret;
};

module.exports.__wbg_parse_def2e24ef1252aff = function () {
  return handleError(function (arg0, arg1) {
    const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
    return ret;
  }, arguments);
};

module.exports.__wbg_process_dc0fbacc7c1c06f7 = function (arg0) {
  const ret = arg0.process;
  return ret;
};

module.exports.__wbg_push_737cfc8c1432c2c6 = function (arg0, arg1) {
  const ret = arg0.push(arg1);
  return ret;
};

module.exports.__wbg_randomFillSync_ac0988aba3254290 = function () {
  return handleError(function (arg0, arg1) {
    arg0.randomFillSync(arg1);
  }, arguments);
};

module.exports.__wbg_require_60cc747a6bc5215a = function () {
  return handleError(function () {
    const ret = module.require;
    return ret;
  }, arguments);
};

module.exports.__wbg_set_65595bdd868b3009 = function (arg0, arg1, arg2) {
  arg0.set(arg1, arg2 >>> 0);
};

module.exports.__wbg_set_8fc6bf8a5b1071d1 = function (arg0, arg1, arg2) {
  const ret = arg0.set(arg1, arg2);
  return ret;
};

module.exports.__wbg_set_bb8cecf6a62b9f46 = function () {
  return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(arg0, arg1, arg2);
    return ret;
  }, arguments);
};

module.exports.__wbg_stack_0ed75d68575b0f3c = function (arg0, arg1) {
  const ret = arg1.stack;
  const ptr1 = passStringToWasm0(
    ret,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  const len1 = WASM_VECTOR_LEN;
  getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
  getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

module.exports.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function () {
  const ret = typeof global === "undefined" ? null : global;
  return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

module.exports.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 =
  function () {
    const ret = typeof globalThis === "undefined" ? null : globalThis;
    return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
  };

module.exports.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function () {
  const ret = typeof self === "undefined" ? null : self;
  return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

module.exports.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function () {
  const ret = typeof window === "undefined" ? null : window;
  return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
};

module.exports.__wbg_stringify_f7ed6987935b4a24 = function () {
  return handleError(function (arg0) {
    const ret = JSON.stringify(arg0);
    return ret;
  }, arguments);
};

module.exports.__wbg_subarray_aa9065fa9dc5df96 = function (arg0, arg1, arg2) {
  const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
  return ret;
};

module.exports.__wbg_versions_c01dfd4722a88165 = function (arg0) {
  const ret = arg0.versions;
  return ret;
};

module.exports.__wbg_yarray_new = function (arg0) {
  const ret = YArray.__wrap(arg0);
  return ret;
};

module.exports.__wbg_yarrayevent_new = function (arg0) {
  const ret = YArrayEvent.__wrap(arg0);
  return ret;
};

module.exports.__wbg_ydoc_new = function (arg0) {
  const ret = YDoc.__wrap(arg0);
  return ret;
};

module.exports.__wbg_ymap_new = function (arg0) {
  const ret = YMap.__wrap(arg0);
  return ret;
};

module.exports.__wbg_ymapevent_new = function (arg0) {
  const ret = YMapEvent.__wrap(arg0);
  return ret;
};

module.exports.__wbg_ysubdocsevent_new = function (arg0) {
  const ret = YSubdocsEvent.__wrap(arg0);
  return ret;
};

module.exports.__wbg_ytext_new = function (arg0) {
  const ret = YText.__wrap(arg0);
  return ret;
};

module.exports.__wbg_ytextevent_new = function (arg0) {
  const ret = YTextEvent.__wrap(arg0);
  return ret;
};

module.exports.__wbg_ytransaction_new = function (arg0) {
  const ret = YTransaction.__wrap(arg0);
  return ret;
};

module.exports.__wbg_yundoevent_new = function (arg0) {
  const ret = YUndoEvent.__wrap(arg0);
  return ret;
};

module.exports.__wbg_yweaklink_new = function (arg0) {
  const ret = YWeakLink.__wrap(arg0);
  return ret;
};

module.exports.__wbg_yweaklinkevent_new = function (arg0) {
  const ret = YWeakLinkEvent.__wrap(arg0);
  return ret;
};

module.exports.__wbg_yxmlelement_new = function (arg0) {
  const ret = YXmlElement.__wrap(arg0);
  return ret;
};

module.exports.__wbg_yxmlevent_new = function (arg0) {
  const ret = YXmlEvent.__wrap(arg0);
  return ret;
};

module.exports.__wbg_yxmlfragment_new = function (arg0) {
  const ret = YXmlFragment.__wrap(arg0);
  return ret;
};

module.exports.__wbg_yxmltext_new = function (arg0) {
  const ret = YXmlText.__wrap(arg0);
  return ret;
};

module.exports.__wbg_yxmltextevent_new = function (arg0) {
  const ret = YXmlTextEvent.__wrap(arg0);
  return ret;
};

module.exports.__wbindgen_bigint_from_i64 = function (arg0) {
  const ret = arg0;
  return ret;
};

module.exports.__wbindgen_bigint_from_u64 = function (arg0) {
  const ret = BigInt.asUintN(64, arg0);
  return ret;
};

module.exports.__wbindgen_boolean_get = function (arg0) {
  const v = arg0;
  const ret = typeof v === "boolean" ? (v ? 1 : 0) : 2;
  return ret;
};

module.exports.__wbindgen_debug_string = function (arg0, arg1) {
  const ret = debugString(arg1);
  const ptr1 = passStringToWasm0(
    ret,
    wasm.__wbindgen_malloc,
    wasm.__wbindgen_realloc,
  );
  const len1 = WASM_VECTOR_LEN;
  getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
  getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

module.exports.__wbindgen_init_externref_table = function () {
  const table = wasm.__wbindgen_export_2;
  const offset = table.grow(4);
  table.set(0, undefined);
  table.set(offset + 0, undefined);
  table.set(offset + 1, null);
  table.set(offset + 2, true);
  table.set(offset + 3, false);
};

module.exports.__wbindgen_is_bigint = function (arg0) {
  const ret = typeof arg0 === "bigint";
  return ret;
};

module.exports.__wbindgen_is_function = function (arg0) {
  const ret = typeof arg0 === "function";
  return ret;
};

module.exports.__wbindgen_is_null = function (arg0) {
  const ret = arg0 === null;
  return ret;
};

module.exports.__wbindgen_is_object = function (arg0) {
  const val = arg0;
  const ret = typeof val === "object" && val !== null;
  return ret;
};

module.exports.__wbindgen_is_string = function (arg0) {
  const ret = typeof arg0 === "string";
  return ret;
};

module.exports.__wbindgen_is_undefined = function (arg0) {
  const ret = arg0 === undefined;
  return ret;
};

module.exports.__wbindgen_memory = function () {
  const ret = wasm.memory;
  return ret;
};

module.exports.__wbindgen_number_get = function (arg0, arg1) {
  const obj = arg1;
  const ret = typeof obj === "number" ? obj : undefined;
  getDataViewMemory0().setFloat64(
    arg0 + 8 * 1,
    isLikeNone(ret) ? 0 : ret,
    true,
  );
  getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
};

module.exports.__wbindgen_number_new = function (arg0) {
  const ret = arg0;
  return ret;
};

module.exports.__wbindgen_string_get = function (arg0, arg1) {
  const obj = arg1;
  const ret = typeof obj === "string" ? obj : undefined;
  var ptr1 = isLikeNone(ret)
    ? 0
    : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  var len1 = WASM_VECTOR_LEN;
  getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
  getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
};

module.exports.__wbindgen_string_new = function (arg0, arg1) {
  const ret = getStringFromWasm0(arg0, arg1);
  return ret;
};

module.exports.__wbindgen_throw = function (arg0, arg1) {
  throw new Error(getStringFromWasm0(arg0, arg1));
};

const path = require("path").join(
  process.cwd(),
  "public",
  "wasm",
  "ywasm_bg.wasm",
);
const bytes = require("fs").readFileSync(path);

const wasmModule = new WebAssembly.Module(bytes);
const wasmInstance = new WebAssembly.Instance(wasmModule, imports);
wasm = wasmInstance.exports;
module.exports.__wasm = wasm;

wasm.__wbindgen_start();
