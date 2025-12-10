var e = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports)
;(function () {
  let e = document.createElement(`link`).relList
  if (e && e.supports && e.supports(`modulepreload`)) return
  for (let e of document.querySelectorAll(`link[rel="modulepreload"]`)) n(e)
  new MutationObserver(e => {
    for (let t of e)
      if (t.type === `childList`)
        for (let e of t.addedNodes) e.tagName === `LINK` && e.rel === `modulepreload` && n(e)
  }).observe(document, { childList: !0, subtree: !0 })
  function t(e) {
    let t = {}
    return (
      e.integrity && (t.integrity = e.integrity),
      e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy),
      e.crossOrigin === `use-credentials`
        ? (t.credentials = `include`)
        : e.crossOrigin === `anonymous`
          ? (t.credentials = `omit`)
          : (t.credentials = `same-origin`),
      t
    )
  }
  function n(e) {
    if (e.ep) return
    e.ep = !0
    let n = t(e)
    fetch(e.href, n)
  }
})()
var t = e(e => {
    ;((e.byteLength = c), (e.toByteArray = u), (e.fromByteArray = p))
    for (
      var t = [],
        n = [],
        r = typeof Uint8Array < `u` ? Uint8Array : Array,
        i = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/`,
        a = 0,
        o = i.length;
      a < o;
      ++a
    )
      ((t[a] = i[a]), (n[i.charCodeAt(a)] = a))
    ;((n[45] = 62), (n[95] = 63))
    function s(e) {
      var t = e.length
      if (t % 4 > 0) throw Error(`Invalid string. Length must be a multiple of 4`)
      var n = e.indexOf(`=`)
      n === -1 && (n = t)
      var r = n === t ? 0 : 4 - (n % 4)
      return [n, r]
    }
    function c(e) {
      var t = s(e),
        n = t[0],
        r = t[1]
      return ((n + r) * 3) / 4 - r
    }
    function l(e, t, n) {
      return ((t + n) * 3) / 4 - n
    }
    function u(e) {
      var t,
        i = s(e),
        a = i[0],
        o = i[1],
        c = new r(l(e, a, o)),
        u = 0,
        d = o > 0 ? a - 4 : a,
        f
      for (f = 0; f < d; f += 4)
        ((t =
          (n[e.charCodeAt(f)] << 18) |
          (n[e.charCodeAt(f + 1)] << 12) |
          (n[e.charCodeAt(f + 2)] << 6) |
          n[e.charCodeAt(f + 3)]),
          (c[u++] = (t >> 16) & 255),
          (c[u++] = (t >> 8) & 255),
          (c[u++] = t & 255))
      return (
        o === 2 &&
          ((t = (n[e.charCodeAt(f)] << 2) | (n[e.charCodeAt(f + 1)] >> 4)), (c[u++] = t & 255)),
        o === 1 &&
          ((t =
            (n[e.charCodeAt(f)] << 10) |
            (n[e.charCodeAt(f + 1)] << 4) |
            (n[e.charCodeAt(f + 2)] >> 2)),
          (c[u++] = (t >> 8) & 255),
          (c[u++] = t & 255)),
        c
      )
    }
    function d(e) {
      return t[(e >> 18) & 63] + t[(e >> 12) & 63] + t[(e >> 6) & 63] + t[e & 63]
    }
    function f(e, t, n) {
      for (var r, i = [], a = t; a < n; a += 3)
        ((r = ((e[a] << 16) & 16711680) + ((e[a + 1] << 8) & 65280) + (e[a + 2] & 255)),
          i.push(d(r)))
      return i.join(``)
    }
    function p(e) {
      for (var n, r = e.length, i = r % 3, a = [], o = 16383, s = 0, c = r - i; s < c; s += o)
        a.push(f(e, s, s + o > c ? c : s + o))
      return (
        i === 1
          ? ((n = e[r - 1]), a.push(t[n >> 2] + t[(n << 4) & 63] + `==`))
          : i === 2 &&
            ((n = (e[r - 2] << 8) + e[r - 1]),
            a.push(t[n >> 10] + t[(n >> 4) & 63] + t[(n << 2) & 63] + `=`)),
        a.join(``)
      )
    }
  }),
  n = e(e => {
    ;((e.read = function (e, t, n, r, i) {
      var a,
        o,
        s = i * 8 - r - 1,
        c = (1 << s) - 1,
        l = c >> 1,
        u = -7,
        d = n ? i - 1 : 0,
        f = n ? -1 : 1,
        p = e[t + d]
      for (
        d += f, a = p & ((1 << -u) - 1), p >>= -u, u += s;
        u > 0;
        a = a * 256 + e[t + d], d += f, u -= 8
      );
      for (
        o = a & ((1 << -u) - 1), a >>= -u, u += r;
        u > 0;
        o = o * 256 + e[t + d], d += f, u -= 8
      );
      if (a === 0) a = 1 - l
      else if (a === c) return o ? NaN : (p ? -1 : 1) * (1 / 0)
      else ((o += 2 ** r), (a -= l))
      return (p ? -1 : 1) * o * 2 ** (a - r)
    }),
      (e.write = function (e, t, n, r, i, a) {
        var o,
          s,
          c,
          l = a * 8 - i - 1,
          u = (1 << l) - 1,
          d = u >> 1,
          f = i === 23 ? 2 ** -24 - 2 ** -77 : 0,
          p = r ? 0 : a - 1,
          m = r ? 1 : -1,
          h = t < 0 || (t === 0 && 1 / t < 0) ? 1 : 0
        for (
          t = Math.abs(t),
            isNaN(t) || t === 1 / 0
              ? ((s = isNaN(t) ? 1 : 0), (o = u))
              : ((o = Math.floor(Math.log(t) / Math.LN2)),
                t * (c = 2 ** -o) < 1 && (o--, (c *= 2)),
                o + d >= 1 ? (t += f / c) : (t += f * 2 ** (1 - d)),
                t * c >= 2 && (o++, (c /= 2)),
                o + d >= u
                  ? ((s = 0), (o = u))
                  : o + d >= 1
                    ? ((s = (t * c - 1) * 2 ** i), (o += d))
                    : ((s = t * 2 ** (d - 1) * 2 ** i), (o = 0)));
          i >= 8;
          e[n + p] = s & 255, p += m, s /= 256, i -= 8
        );
        for (o = (o << i) | s, l += i; l > 0; e[n + p] = o & 255, p += m, o /= 256, l -= 8);
        e[n + p - m] |= h * 128
      }))
  }),
  r = e(e => {
    var r = t(),
      i = n(),
      a =
        typeof Symbol == `function` && typeof Symbol.for == `function`
          ? Symbol.for(`nodejs.util.inspect.custom`)
          : null
    ;((e.Buffer = l), (e.SlowBuffer = ee), (e.INSPECT_MAX_BYTES = 50))
    var o = 2147483647
    ;((e.kMaxLength = o),
      (l.TYPED_ARRAY_SUPPORT = s()),
      !l.TYPED_ARRAY_SUPPORT &&
        typeof console < `u` &&
        typeof console.error == `function` &&
        console.error(
          'This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
        ))
    function s() {
      try {
        let e = new Uint8Array(1),
          t = {
            foo: function () {
              return 42
            }
          }
        return (
          Object.setPrototypeOf(t, Uint8Array.prototype),
          Object.setPrototypeOf(e, t),
          e.foo() === 42
        )
      } catch {
        return !1
      }
    }
    ;(Object.defineProperty(l.prototype, `parent`, {
      enumerable: !0,
      get: function () {
        if (l.isBuffer(this)) return this.buffer
      }
    }),
      Object.defineProperty(l.prototype, `offset`, {
        enumerable: !0,
        get: function () {
          if (l.isBuffer(this)) return this.byteOffset
        }
      }))
    function c(e) {
      if (e > o) throw RangeError(`The value "` + e + `" is invalid for option "size"`)
      let t = new Uint8Array(e)
      return (Object.setPrototypeOf(t, l.prototype), t)
    }
    function l(e, t, n) {
      if (typeof e == `number`) {
        if (typeof t == `string`)
          throw TypeError(`The "string" argument must be of type string. Received type number`)
        return p(e)
      }
      return u(e, t, n)
    }
    l.poolSize = 8192
    function u(e, t, n) {
      if (typeof e == `string`) return m(e, t)
      if (ArrayBuffer.isView(e)) return g(e)
      if (e == null)
        throw TypeError(
          `The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type ` +
            typeof e
        )
      if (
        ve(e, ArrayBuffer) ||
        (e && ve(e.buffer, ArrayBuffer)) ||
        (typeof SharedArrayBuffer < `u` &&
          (ve(e, SharedArrayBuffer) || (e && ve(e.buffer, SharedArrayBuffer))))
      )
        return _(e, t, n)
      if (typeof e == `number`)
        throw TypeError(`The "value" argument must not be of type number. Received type number`)
      let r = e.valueOf && e.valueOf()
      if (r != null && r !== e) return l.from(r, t, n)
      let i = v(e)
      if (i) return i
      if (
        typeof Symbol < `u` &&
        Symbol.toPrimitive != null &&
        typeof e[Symbol.toPrimitive] == `function`
      )
        return l.from(e[Symbol.toPrimitive](`string`), t, n)
      throw TypeError(
        `The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type ` +
          typeof e
      )
    }
    ;((l.from = function (e, t, n) {
      return u(e, t, n)
    }),
      Object.setPrototypeOf(l.prototype, Uint8Array.prototype),
      Object.setPrototypeOf(l, Uint8Array))
    function d(e) {
      if (typeof e != `number`) throw TypeError(`"size" argument must be of type number`)
      if (e < 0) throw RangeError(`The value "` + e + `" is invalid for option "size"`)
    }
    function f(e, t, n) {
      return (
        d(e), e <= 0 || t === void 0 ? c(e) : typeof n == `string` ? c(e).fill(t, n) : c(e).fill(t)
      )
    }
    l.alloc = function (e, t, n) {
      return f(e, t, n)
    }
    function p(e) {
      return (d(e), c(e < 0 ? 0 : y(e) | 0))
    }
    ;((l.allocUnsafe = function (e) {
      return p(e)
    }),
      (l.allocUnsafeSlow = function (e) {
        return p(e)
      }))
    function m(e, t) {
      if (((typeof t != `string` || t === ``) && (t = `utf8`), !l.isEncoding(t)))
        throw TypeError(`Unknown encoding: ` + t)
      let n = b(e, t) | 0,
        r = c(n),
        i = r.write(e, t)
      return (i !== n && (r = r.slice(0, i)), r)
    }
    function h(e) {
      let t = e.length < 0 ? 0 : y(e.length) | 0,
        n = c(t)
      for (let r = 0; r < t; r += 1) n[r] = e[r] & 255
      return n
    }
    function g(e) {
      if (ve(e, Uint8Array)) {
        let t = new Uint8Array(e)
        return _(t.buffer, t.byteOffset, t.byteLength)
      }
      return h(e)
    }
    function _(e, t, n) {
      if (t < 0 || e.byteLength < t) throw RangeError(`"offset" is outside of buffer bounds`)
      if (e.byteLength < t + (n || 0)) throw RangeError(`"length" is outside of buffer bounds`)
      let r
      return (
        (r =
          t === void 0 && n === void 0
            ? new Uint8Array(e)
            : n === void 0
              ? new Uint8Array(e, t)
              : new Uint8Array(e, t, n)),
        Object.setPrototypeOf(r, l.prototype),
        r
      )
    }
    function v(e) {
      if (l.isBuffer(e)) {
        let t = y(e.length) | 0,
          n = c(t)
        return (n.length === 0 || e.copy(n, 0, 0, t), n)
      }
      if (e.length !== void 0) return typeof e.length != `number` || ye(e.length) ? c(0) : h(e)
      if (e.type === `Buffer` && Array.isArray(e.data)) return h(e.data)
    }
    function y(e) {
      if (e >= o)
        throw RangeError(
          `Attempt to allocate Buffer larger than maximum size: 0x` + o.toString(16) + ` bytes`
        )
      return e | 0
    }
    function ee(e) {
      return (+e != e && (e = 0), l.alloc(+e))
    }
    ;((l.isBuffer = function (e) {
      return e != null && e._isBuffer === !0 && e !== l.prototype
    }),
      (l.compare = function (e, t) {
        if (
          (ve(e, Uint8Array) && (e = l.from(e, e.offset, e.byteLength)),
          ve(t, Uint8Array) && (t = l.from(t, t.offset, t.byteLength)),
          !l.isBuffer(e) || !l.isBuffer(t))
        )
          throw TypeError(`The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array`)
        if (e === t) return 0
        let n = e.length,
          r = t.length
        for (let i = 0, a = Math.min(n, r); i < a; ++i)
          if (e[i] !== t[i]) {
            ;((n = e[i]), (r = t[i]))
            break
          }
        return n < r ? -1 : r < n ? 1 : 0
      }),
      (l.isEncoding = function (e) {
        switch (String(e).toLowerCase()) {
          case `hex`:
          case `utf8`:
          case `utf-8`:
          case `ascii`:
          case `latin1`:
          case `binary`:
          case `base64`:
          case `ucs2`:
          case `ucs-2`:
          case `utf16le`:
          case `utf-16le`:
            return !0
          default:
            return !1
        }
      }),
      (l.concat = function (e, t) {
        if (!Array.isArray(e)) throw TypeError(`"list" argument must be an Array of Buffers`)
        if (e.length === 0) return l.alloc(0)
        let n
        if (t === void 0) for (t = 0, n = 0; n < e.length; ++n) t += e[n].length
        let r = l.allocUnsafe(t),
          i = 0
        for (n = 0; n < e.length; ++n) {
          let t = e[n]
          if (ve(t, Uint8Array))
            i + t.length > r.length
              ? (l.isBuffer(t) || (t = l.from(t)), t.copy(r, i))
              : Uint8Array.prototype.set.call(r, t, i)
          else if (l.isBuffer(t)) t.copy(r, i)
          else throw TypeError(`"list" argument must be an Array of Buffers`)
          i += t.length
        }
        return r
      }))
    function b(e, t) {
      if (l.isBuffer(e)) return e.length
      if (ArrayBuffer.isView(e) || ve(e, ArrayBuffer)) return e.byteLength
      if (typeof e != `string`)
        throw TypeError(
          `The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ` +
            typeof e
        )
      let n = e.length,
        r = arguments.length > 2 && arguments[2] === !0
      if (!r && n === 0) return 0
      let i = !1
      for (;;)
        switch (t) {
          case `ascii`:
          case `latin1`:
          case `binary`:
            return n
          case `utf8`:
          case `utf-8`:
            return pe(e).length
          case `ucs2`:
          case `ucs-2`:
          case `utf16le`:
          case `utf-16le`:
            return n * 2
          case `hex`:
            return n >>> 1
          case `base64`:
            return ge(e).length
          default:
            if (i) return r ? -1 : pe(e).length
            ;((t = (`` + t).toLowerCase()), (i = !0))
        }
    }
    l.byteLength = b
    function te(e, t, n) {
      let r = !1
      if (
        ((t === void 0 || t < 0) && (t = 0),
        t > this.length ||
          ((n === void 0 || n > this.length) && (n = this.length), n <= 0) ||
          ((n >>>= 0), (t >>>= 0), n <= t))
      )
        return ``
      for (e ||= `utf8`; ; )
        switch (e) {
          case `hex`:
            return N(this, t, n)
          case `utf8`:
          case `utf-8`:
            return k(this, t, n)
          case `ascii`:
            return re(this, t, n)
          case `latin1`:
          case `binary`:
            return M(this, t, n)
          case `base64`:
            return O(this, t, n)
          case `ucs2`:
          case `ucs-2`:
          case `utf16le`:
          case `utf-16le`:
            return P(this, t, n)
          default:
            if (r) throw TypeError(`Unknown encoding: ` + e)
            ;((e = (e + ``).toLowerCase()), (r = !0))
        }
    }
    l.prototype._isBuffer = !0
    function x(e, t, n) {
      let r = e[t]
      ;((e[t] = e[n]), (e[n] = r))
    }
    ;((l.prototype.swap16 = function () {
      let e = this.length
      if (e % 2 != 0) throw RangeError(`Buffer size must be a multiple of 16-bits`)
      for (let t = 0; t < e; t += 2) x(this, t, t + 1)
      return this
    }),
      (l.prototype.swap32 = function () {
        let e = this.length
        if (e % 4 != 0) throw RangeError(`Buffer size must be a multiple of 32-bits`)
        for (let t = 0; t < e; t += 4) (x(this, t, t + 3), x(this, t + 1, t + 2))
        return this
      }),
      (l.prototype.swap64 = function () {
        let e = this.length
        if (e % 8 != 0) throw RangeError(`Buffer size must be a multiple of 64-bits`)
        for (let t = 0; t < e; t += 8)
          (x(this, t, t + 7), x(this, t + 1, t + 6), x(this, t + 2, t + 5), x(this, t + 3, t + 4))
        return this
      }),
      (l.prototype.toString = function () {
        let e = this.length
        return e === 0 ? `` : arguments.length === 0 ? k(this, 0, e) : te.apply(this, arguments)
      }),
      (l.prototype.toLocaleString = l.prototype.toString),
      (l.prototype.equals = function (e) {
        if (!l.isBuffer(e)) throw TypeError(`Argument must be a Buffer`)
        return this === e ? !0 : l.compare(this, e) === 0
      }),
      (l.prototype.inspect = function () {
        let t = ``,
          n = e.INSPECT_MAX_BYTES
        return (
          (t = this.toString(`hex`, 0, n)
            .replace(/(.{2})/g, `$1 `)
            .trim()),
          this.length > n && (t += ` ... `),
          `<Buffer ` + t + `>`
        )
      }),
      a && (l.prototype[a] = l.prototype.inspect),
      (l.prototype.compare = function (e, t, n, r, i) {
        if ((ve(e, Uint8Array) && (e = l.from(e, e.offset, e.byteLength)), !l.isBuffer(e)))
          throw TypeError(
            `The "target" argument must be one of type Buffer or Uint8Array. Received type ` +
              typeof e
          )
        if (
          (t === void 0 && (t = 0),
          n === void 0 && (n = e ? e.length : 0),
          r === void 0 && (r = 0),
          i === void 0 && (i = this.length),
          t < 0 || n > e.length || r < 0 || i > this.length)
        )
          throw RangeError(`out of range index`)
        if (r >= i && t >= n) return 0
        if (r >= i) return -1
        if (t >= n) return 1
        if (((t >>>= 0), (n >>>= 0), (r >>>= 0), (i >>>= 0), this === e)) return 0
        let a = i - r,
          o = n - t,
          s = Math.min(a, o),
          c = this.slice(r, i),
          u = e.slice(t, n)
        for (let e = 0; e < s; ++e)
          if (c[e] !== u[e]) {
            ;((a = c[e]), (o = u[e]))
            break
          }
        return a < o ? -1 : o < a ? 1 : 0
      }))
    function S(e, t, n, r, i) {
      if (e.length === 0) return -1
      if (
        (typeof n == `string`
          ? ((r = n), (n = 0))
          : n > 2147483647
            ? (n = 2147483647)
            : n < -2147483648 && (n = -2147483648),
        (n = +n),
        ye(n) && (n = i ? 0 : e.length - 1),
        n < 0 && (n = e.length + n),
        n >= e.length)
      ) {
        if (i) return -1
        n = e.length - 1
      } else if (n < 0)
        if (i) n = 0
        else return -1
      if ((typeof t == `string` && (t = l.from(t, r)), l.isBuffer(t)))
        return t.length === 0 ? -1 : ne(e, t, n, r, i)
      if (typeof t == `number`)
        return (
          (t &= 255),
          typeof Uint8Array.prototype.indexOf == `function`
            ? i
              ? Uint8Array.prototype.indexOf.call(e, t, n)
              : Uint8Array.prototype.lastIndexOf.call(e, t, n)
            : ne(e, [t], n, r, i)
        )
      throw TypeError(`val must be string, number or Buffer`)
    }
    function ne(e, t, n, r, i) {
      let a = 1,
        o = e.length,
        s = t.length
      if (
        r !== void 0 &&
        ((r = String(r).toLowerCase()),
        r === `ucs2` || r === `ucs-2` || r === `utf16le` || r === `utf-16le`)
      ) {
        if (e.length < 2 || t.length < 2) return -1
        ;((a = 2), (o /= 2), (s /= 2), (n /= 2))
      }
      function c(e, t) {
        return a === 1 ? e[t] : e.readUInt16BE(t * a)
      }
      let l
      if (i) {
        let r = -1
        for (l = n; l < o; l++)
          if (c(e, l) === c(t, r === -1 ? 0 : l - r)) {
            if ((r === -1 && (r = l), l - r + 1 === s)) return r * a
          } else (r !== -1 && (l -= l - r), (r = -1))
      } else
        for (n + s > o && (n = o - s), l = n; l >= 0; l--) {
          let n = !0
          for (let r = 0; r < s; r++)
            if (c(e, l + r) !== c(t, r)) {
              n = !1
              break
            }
          if (n) return l
        }
      return -1
    }
    ;((l.prototype.includes = function (e, t, n) {
      return this.indexOf(e, t, n) !== -1
    }),
      (l.prototype.indexOf = function (e, t, n) {
        return S(this, e, t, n, !0)
      }),
      (l.prototype.lastIndexOf = function (e, t, n) {
        return S(this, e, t, n, !1)
      }))
    function C(e, t, n, r) {
      n = Number(n) || 0
      let i = e.length - n
      r ? ((r = Number(r)), r > i && (r = i)) : (r = i)
      let a = t.length
      r > a / 2 && (r = a / 2)
      let o
      for (o = 0; o < r; ++o) {
        let r = parseInt(t.substr(o * 2, 2), 16)
        if (ye(r)) return o
        e[n + o] = r
      }
      return o
    }
    function w(e, t, n, r) {
      return _e(pe(t, e.length - n), e, n, r)
    }
    function T(e, t, n, r) {
      return _e(me(t), e, n, r)
    }
    function E(e, t, n, r) {
      return _e(ge(t), e, n, r)
    }
    function D(e, t, n, r) {
      return _e(he(t, e.length - n), e, n, r)
    }
    ;((l.prototype.write = function (e, t, n, r) {
      if (t === void 0) ((r = `utf8`), (n = this.length), (t = 0))
      else if (n === void 0 && typeof t == `string`) ((r = t), (n = this.length), (t = 0))
      else if (isFinite(t))
        ((t >>>= 0),
          isFinite(n) ? ((n >>>= 0), r === void 0 && (r = `utf8`)) : ((r = n), (n = void 0)))
      else throw Error(`Buffer.write(string, encoding, offset[, length]) is no longer supported`)
      let i = this.length - t
      if (
        ((n === void 0 || n > i) && (n = i), (e.length > 0 && (n < 0 || t < 0)) || t > this.length)
      )
        throw RangeError(`Attempt to write outside buffer bounds`)
      r ||= `utf8`
      let a = !1
      for (;;)
        switch (r) {
          case `hex`:
            return C(this, e, t, n)
          case `utf8`:
          case `utf-8`:
            return w(this, e, t, n)
          case `ascii`:
          case `latin1`:
          case `binary`:
            return T(this, e, t, n)
          case `base64`:
            return E(this, e, t, n)
          case `ucs2`:
          case `ucs-2`:
          case `utf16le`:
          case `utf-16le`:
            return D(this, e, t, n)
          default:
            if (a) throw TypeError(`Unknown encoding: ` + r)
            ;((r = (`` + r).toLowerCase()), (a = !0))
        }
    }),
      (l.prototype.toJSON = function () {
        return { type: `Buffer`, data: Array.prototype.slice.call(this._arr || this, 0) }
      }))
    function O(e, t, n) {
      return t === 0 && n === e.length ? r.fromByteArray(e) : r.fromByteArray(e.slice(t, n))
    }
    function k(e, t, n) {
      n = Math.min(e.length, n)
      let r = [],
        i = t
      for (; i < n; ) {
        let t = e[i],
          a = null,
          o = t > 239 ? 4 : t > 223 ? 3 : t > 191 ? 2 : 1
        if (i + o <= n) {
          let n, r, s, c
          switch (o) {
            case 1:
              t < 128 && (a = t)
              break
            case 2:
              ;((n = e[i + 1]),
                (n & 192) == 128 && ((c = ((t & 31) << 6) | (n & 63)), c > 127 && (a = c)))
              break
            case 3:
              ;((n = e[i + 1]),
                (r = e[i + 2]),
                (n & 192) == 128 &&
                  (r & 192) == 128 &&
                  ((c = ((t & 15) << 12) | ((n & 63) << 6) | (r & 63)),
                  c > 2047 && (c < 55296 || c > 57343) && (a = c)))
              break
            case 4:
              ;((n = e[i + 1]),
                (r = e[i + 2]),
                (s = e[i + 3]),
                (n & 192) == 128 &&
                  (r & 192) == 128 &&
                  (s & 192) == 128 &&
                  ((c = ((t & 15) << 18) | ((n & 63) << 12) | ((r & 63) << 6) | (s & 63)),
                  c > 65535 && c < 1114112 && (a = c)))
          }
        }
        ;(a === null
          ? ((a = 65533), (o = 1))
          : a > 65535 &&
            ((a -= 65536), r.push(((a >>> 10) & 1023) | 55296), (a = 56320 | (a & 1023))),
          r.push(a),
          (i += o))
      }
      return j(r)
    }
    var A = 4096
    function j(e) {
      let t = e.length
      if (t <= A) return String.fromCharCode.apply(String, e)
      let n = ``,
        r = 0
      for (; r < t; ) n += String.fromCharCode.apply(String, e.slice(r, (r += A)))
      return n
    }
    function re(e, t, n) {
      let r = ``
      n = Math.min(e.length, n)
      for (let i = t; i < n; ++i) r += String.fromCharCode(e[i] & 127)
      return r
    }
    function M(e, t, n) {
      let r = ``
      n = Math.min(e.length, n)
      for (let i = t; i < n; ++i) r += String.fromCharCode(e[i])
      return r
    }
    function N(e, t, n) {
      let r = e.length
      ;((!t || t < 0) && (t = 0), (!n || n < 0 || n > r) && (n = r))
      let i = ``
      for (let r = t; r < n; ++r) i += H[e[r]]
      return i
    }
    function P(e, t, n) {
      let r = e.slice(t, n),
        i = ``
      for (let e = 0; e < r.length - 1; e += 2) i += String.fromCharCode(r[e] + r[e + 1] * 256)
      return i
    }
    l.prototype.slice = function (e, t) {
      let n = this.length
      ;((e = ~~e),
        (t = t === void 0 ? n : ~~t),
        e < 0 ? ((e += n), e < 0 && (e = 0)) : e > n && (e = n),
        t < 0 ? ((t += n), t < 0 && (t = 0)) : t > n && (t = n),
        t < e && (t = e))
      let r = this.subarray(e, t)
      return (Object.setPrototypeOf(r, l.prototype), r)
    }
    function F(e, t, n) {
      if (e % 1 != 0 || e < 0) throw RangeError(`offset is not uint`)
      if (e + t > n) throw RangeError(`Trying to access beyond buffer length`)
    }
    ;((l.prototype.readUintLE = l.prototype.readUIntLE =
      function (e, t, n) {
        ;((e >>>= 0), (t >>>= 0), n || F(e, t, this.length))
        let r = this[e],
          i = 1,
          a = 0
        for (; ++a < t && (i *= 256); ) r += this[e + a] * i
        return r
      }),
      (l.prototype.readUintBE = l.prototype.readUIntBE =
        function (e, t, n) {
          ;((e >>>= 0), (t >>>= 0), n || F(e, t, this.length))
          let r = this[e + --t],
            i = 1
          for (; t > 0 && (i *= 256); ) r += this[e + --t] * i
          return r
        }),
      (l.prototype.readUint8 = l.prototype.readUInt8 =
        function (e, t) {
          return ((e >>>= 0), t || F(e, 1, this.length), this[e])
        }),
      (l.prototype.readUint16LE = l.prototype.readUInt16LE =
        function (e, t) {
          return ((e >>>= 0), t || F(e, 2, this.length), this[e] | (this[e + 1] << 8))
        }),
      (l.prototype.readUint16BE = l.prototype.readUInt16BE =
        function (e, t) {
          return ((e >>>= 0), t || F(e, 2, this.length), (this[e] << 8) | this[e + 1])
        }),
      (l.prototype.readUint32LE = l.prototype.readUInt32LE =
        function (e, t) {
          return (
            (e >>>= 0),
            t || F(e, 4, this.length),
            (this[e] | (this[e + 1] << 8) | (this[e + 2] << 16)) + this[e + 3] * 16777216
          )
        }),
      (l.prototype.readUint32BE = l.prototype.readUInt32BE =
        function (e, t) {
          return (
            (e >>>= 0),
            t || F(e, 4, this.length),
            this[e] * 16777216 + ((this[e + 1] << 16) | (this[e + 2] << 8) | this[e + 3])
          )
        }),
      (l.prototype.readBigUInt64LE = U(function (e) {
        ;((e >>>= 0), le(e, `offset`))
        let t = this[e],
          n = this[e + 7]
        ;(t === void 0 || n === void 0) && ue(e, this.length - 8)
        let r = t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24,
          i = this[++e] + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + n * 2 ** 24
        return BigInt(r) + (BigInt(i) << BigInt(32))
      })),
      (l.prototype.readBigUInt64BE = U(function (e) {
        ;((e >>>= 0), le(e, `offset`))
        let t = this[e],
          n = this[e + 7]
        ;(t === void 0 || n === void 0) && ue(e, this.length - 8)
        let r = t * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e],
          i = this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n
        return (BigInt(r) << BigInt(32)) + BigInt(i)
      })),
      (l.prototype.readIntLE = function (e, t, n) {
        ;((e >>>= 0), (t >>>= 0), n || F(e, t, this.length))
        let r = this[e],
          i = 1,
          a = 0
        for (; ++a < t && (i *= 256); ) r += this[e + a] * i
        return ((i *= 128), r >= i && (r -= 2 ** (8 * t)), r)
      }),
      (l.prototype.readIntBE = function (e, t, n) {
        ;((e >>>= 0), (t >>>= 0), n || F(e, t, this.length))
        let r = t,
          i = 1,
          a = this[e + --r]
        for (; r > 0 && (i *= 256); ) a += this[e + --r] * i
        return ((i *= 128), a >= i && (a -= 2 ** (8 * t)), a)
      }),
      (l.prototype.readInt8 = function (e, t) {
        return (
          (e >>>= 0), t || F(e, 1, this.length), this[e] & 128 ? (255 - this[e] + 1) * -1 : this[e]
        )
      }),
      (l.prototype.readInt16LE = function (e, t) {
        ;((e >>>= 0), t || F(e, 2, this.length))
        let n = this[e] | (this[e + 1] << 8)
        return n & 32768 ? n | 4294901760 : n
      }),
      (l.prototype.readInt16BE = function (e, t) {
        ;((e >>>= 0), t || F(e, 2, this.length))
        let n = this[e + 1] | (this[e] << 8)
        return n & 32768 ? n | 4294901760 : n
      }),
      (l.prototype.readInt32LE = function (e, t) {
        return (
          (e >>>= 0),
          t || F(e, 4, this.length),
          this[e] | (this[e + 1] << 8) | (this[e + 2] << 16) | (this[e + 3] << 24)
        )
      }),
      (l.prototype.readInt32BE = function (e, t) {
        return (
          (e >>>= 0),
          t || F(e, 4, this.length),
          (this[e] << 24) | (this[e + 1] << 16) | (this[e + 2] << 8) | this[e + 3]
        )
      }),
      (l.prototype.readBigInt64LE = U(function (e) {
        ;((e >>>= 0), le(e, `offset`))
        let t = this[e],
          n = this[e + 7]
        ;(t === void 0 || n === void 0) && ue(e, this.length - 8)
        let r = this[e + 4] + this[e + 5] * 2 ** 8 + this[e + 6] * 2 ** 16 + (n << 24)
        return (
          (BigInt(r) << BigInt(32)) +
          BigInt(t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24)
        )
      })),
      (l.prototype.readBigInt64BE = U(function (e) {
        ;((e >>>= 0), le(e, `offset`))
        let t = this[e],
          n = this[e + 7]
        ;(t === void 0 || n === void 0) && ue(e, this.length - 8)
        let r = (t << 24) + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e]
        return (
          (BigInt(r) << BigInt(32)) +
          BigInt(this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n)
        )
      })),
      (l.prototype.readFloatLE = function (e, t) {
        return ((e >>>= 0), t || F(e, 4, this.length), i.read(this, e, !0, 23, 4))
      }),
      (l.prototype.readFloatBE = function (e, t) {
        return ((e >>>= 0), t || F(e, 4, this.length), i.read(this, e, !1, 23, 4))
      }),
      (l.prototype.readDoubleLE = function (e, t) {
        return ((e >>>= 0), t || F(e, 8, this.length), i.read(this, e, !0, 52, 8))
      }),
      (l.prototype.readDoubleBE = function (e, t) {
        return ((e >>>= 0), t || F(e, 8, this.length), i.read(this, e, !1, 52, 8))
      }))
    function I(e, t, n, r, i, a) {
      if (!l.isBuffer(e)) throw TypeError(`"buffer" argument must be a Buffer instance`)
      if (t > i || t < a) throw RangeError(`"value" argument is out of bounds`)
      if (n + r > e.length) throw RangeError(`Index out of range`)
    }
    ;((l.prototype.writeUintLE = l.prototype.writeUIntLE =
      function (e, t, n, r) {
        if (((e = +e), (t >>>= 0), (n >>>= 0), !r)) {
          let r = 2 ** (8 * n) - 1
          I(this, e, t, n, r, 0)
        }
        let i = 1,
          a = 0
        for (this[t] = e & 255; ++a < n && (i *= 256); ) this[t + a] = (e / i) & 255
        return t + n
      }),
      (l.prototype.writeUintBE = l.prototype.writeUIntBE =
        function (e, t, n, r) {
          if (((e = +e), (t >>>= 0), (n >>>= 0), !r)) {
            let r = 2 ** (8 * n) - 1
            I(this, e, t, n, r, 0)
          }
          let i = n - 1,
            a = 1
          for (this[t + i] = e & 255; --i >= 0 && (a *= 256); ) this[t + i] = (e / a) & 255
          return t + n
        }),
      (l.prototype.writeUint8 = l.prototype.writeUInt8 =
        function (e, t, n) {
          return ((e = +e), (t >>>= 0), n || I(this, e, t, 1, 255, 0), (this[t] = e & 255), t + 1)
        }),
      (l.prototype.writeUint16LE = l.prototype.writeUInt16LE =
        function (e, t, n) {
          return (
            (e = +e),
            (t >>>= 0),
            n || I(this, e, t, 2, 65535, 0),
            (this[t] = e & 255),
            (this[t + 1] = e >>> 8),
            t + 2
          )
        }),
      (l.prototype.writeUint16BE = l.prototype.writeUInt16BE =
        function (e, t, n) {
          return (
            (e = +e),
            (t >>>= 0),
            n || I(this, e, t, 2, 65535, 0),
            (this[t] = e >>> 8),
            (this[t + 1] = e & 255),
            t + 2
          )
        }),
      (l.prototype.writeUint32LE = l.prototype.writeUInt32LE =
        function (e, t, n) {
          return (
            (e = +e),
            (t >>>= 0),
            n || I(this, e, t, 4, 4294967295, 0),
            (this[t + 3] = e >>> 24),
            (this[t + 2] = e >>> 16),
            (this[t + 1] = e >>> 8),
            (this[t] = e & 255),
            t + 4
          )
        }),
      (l.prototype.writeUint32BE = l.prototype.writeUInt32BE =
        function (e, t, n) {
          return (
            (e = +e),
            (t >>>= 0),
            n || I(this, e, t, 4, 4294967295, 0),
            (this[t] = e >>> 24),
            (this[t + 1] = e >>> 16),
            (this[t + 2] = e >>> 8),
            (this[t + 3] = e & 255),
            t + 4
          )
        }))
    function L(e, t, n, r, i) {
      ce(t, r, i, e, n, 7)
      let a = Number(t & BigInt(4294967295))
      ;((e[n++] = a), (a >>= 8), (e[n++] = a), (a >>= 8), (e[n++] = a), (a >>= 8), (e[n++] = a))
      let o = Number((t >> BigInt(32)) & BigInt(4294967295))
      return (
        (e[n++] = o), (o >>= 8), (e[n++] = o), (o >>= 8), (e[n++] = o), (o >>= 8), (e[n++] = o), n
      )
    }
    function ie(e, t, n, r, i) {
      ce(t, r, i, e, n, 7)
      let a = Number(t & BigInt(4294967295))
      ;((e[n + 7] = a),
        (a >>= 8),
        (e[n + 6] = a),
        (a >>= 8),
        (e[n + 5] = a),
        (a >>= 8),
        (e[n + 4] = a))
      let o = Number((t >> BigInt(32)) & BigInt(4294967295))
      return (
        (e[n + 3] = o),
        (o >>= 8),
        (e[n + 2] = o),
        (o >>= 8),
        (e[n + 1] = o),
        (o >>= 8),
        (e[n] = o),
        n + 8
      )
    }
    ;((l.prototype.writeBigUInt64LE = U(function (e, t = 0) {
      return L(this, e, t, BigInt(0), BigInt(`0xffffffffffffffff`))
    })),
      (l.prototype.writeBigUInt64BE = U(function (e, t = 0) {
        return ie(this, e, t, BigInt(0), BigInt(`0xffffffffffffffff`))
      })),
      (l.prototype.writeIntLE = function (e, t, n, r) {
        if (((e = +e), (t >>>= 0), !r)) {
          let r = 2 ** (8 * n - 1)
          I(this, e, t, n, r - 1, -r)
        }
        let i = 0,
          a = 1,
          o = 0
        for (this[t] = e & 255; ++i < n && (a *= 256); )
          (e < 0 && o === 0 && this[t + i - 1] !== 0 && (o = 1),
            (this[t + i] = (((e / a) >> 0) - o) & 255))
        return t + n
      }),
      (l.prototype.writeIntBE = function (e, t, n, r) {
        if (((e = +e), (t >>>= 0), !r)) {
          let r = 2 ** (8 * n - 1)
          I(this, e, t, n, r - 1, -r)
        }
        let i = n - 1,
          a = 1,
          o = 0
        for (this[t + i] = e & 255; --i >= 0 && (a *= 256); )
          (e < 0 && o === 0 && this[t + i + 1] !== 0 && (o = 1),
            (this[t + i] = (((e / a) >> 0) - o) & 255))
        return t + n
      }),
      (l.prototype.writeInt8 = function (e, t, n) {
        return (
          (e = +e),
          (t >>>= 0),
          n || I(this, e, t, 1, 127, -128),
          e < 0 && (e = 255 + e + 1),
          (this[t] = e & 255),
          t + 1
        )
      }),
      (l.prototype.writeInt16LE = function (e, t, n) {
        return (
          (e = +e),
          (t >>>= 0),
          n || I(this, e, t, 2, 32767, -32768),
          (this[t] = e & 255),
          (this[t + 1] = e >>> 8),
          t + 2
        )
      }),
      (l.prototype.writeInt16BE = function (e, t, n) {
        return (
          (e = +e),
          (t >>>= 0),
          n || I(this, e, t, 2, 32767, -32768),
          (this[t] = e >>> 8),
          (this[t + 1] = e & 255),
          t + 2
        )
      }),
      (l.prototype.writeInt32LE = function (e, t, n) {
        return (
          (e = +e),
          (t >>>= 0),
          n || I(this, e, t, 4, 2147483647, -2147483648),
          (this[t] = e & 255),
          (this[t + 1] = e >>> 8),
          (this[t + 2] = e >>> 16),
          (this[t + 3] = e >>> 24),
          t + 4
        )
      }),
      (l.prototype.writeInt32BE = function (e, t, n) {
        return (
          (e = +e),
          (t >>>= 0),
          n || I(this, e, t, 4, 2147483647, -2147483648),
          e < 0 && (e = 4294967295 + e + 1),
          (this[t] = e >>> 24),
          (this[t + 1] = e >>> 16),
          (this[t + 2] = e >>> 8),
          (this[t + 3] = e & 255),
          t + 4
        )
      }),
      (l.prototype.writeBigInt64LE = U(function (e, t = 0) {
        return L(this, e, t, -BigInt(`0x8000000000000000`), BigInt(`0x7fffffffffffffff`))
      })),
      (l.prototype.writeBigInt64BE = U(function (e, t = 0) {
        return ie(this, e, t, -BigInt(`0x8000000000000000`), BigInt(`0x7fffffffffffffff`))
      })))
    function R(e, t, n, r, i, a) {
      if (n + r > e.length || n < 0) throw RangeError(`Index out of range`)
    }
    function ae(e, t, n, r, a) {
      return (
        (t = +t),
        (n >>>= 0),
        a || R(e, t, n, 4, 34028234663852886e22, -34028234663852886e22),
        i.write(e, t, n, r, 23, 4),
        n + 4
      )
    }
    ;((l.prototype.writeFloatLE = function (e, t, n) {
      return ae(this, e, t, !0, n)
    }),
      (l.prototype.writeFloatBE = function (e, t, n) {
        return ae(this, e, t, !1, n)
      }))
    function z(e, t, n, r, a) {
      return (
        (t = +t),
        (n >>>= 0),
        a || R(e, t, n, 8, 17976931348623157e292, -17976931348623157e292),
        i.write(e, t, n, r, 52, 8),
        n + 8
      )
    }
    ;((l.prototype.writeDoubleLE = function (e, t, n) {
      return z(this, e, t, !0, n)
    }),
      (l.prototype.writeDoubleBE = function (e, t, n) {
        return z(this, e, t, !1, n)
      }),
      (l.prototype.copy = function (e, t, n, r) {
        if (!l.isBuffer(e)) throw TypeError(`argument should be a Buffer`)
        if (
          ((n ||= 0),
          !r && r !== 0 && (r = this.length),
          t >= e.length && (t = e.length),
          (t ||= 0),
          r > 0 && r < n && (r = n),
          r === n || e.length === 0 || this.length === 0)
        )
          return 0
        if (t < 0) throw RangeError(`targetStart out of bounds`)
        if (n < 0 || n >= this.length) throw RangeError(`Index out of range`)
        if (r < 0) throw RangeError(`sourceEnd out of bounds`)
        ;(r > this.length && (r = this.length), e.length - t < r - n && (r = e.length - t + n))
        let i = r - n
        return (
          this === e && typeof Uint8Array.prototype.copyWithin == `function`
            ? this.copyWithin(t, n, r)
            : Uint8Array.prototype.set.call(e, this.subarray(n, r), t),
          i
        )
      }),
      (l.prototype.fill = function (e, t, n, r) {
        if (typeof e == `string`) {
          if (
            (typeof t == `string`
              ? ((r = t), (t = 0), (n = this.length))
              : typeof n == `string` && ((r = n), (n = this.length)),
            r !== void 0 && typeof r != `string`)
          )
            throw TypeError(`encoding must be a string`)
          if (typeof r == `string` && !l.isEncoding(r)) throw TypeError(`Unknown encoding: ` + r)
          if (e.length === 1) {
            let t = e.charCodeAt(0)
            ;((r === `utf8` && t < 128) || r === `latin1`) && (e = t)
          }
        } else typeof e == `number` ? (e &= 255) : typeof e == `boolean` && (e = Number(e))
        if (t < 0 || this.length < t || this.length < n) throw RangeError(`Out of range index`)
        if (n <= t) return this
        ;((t >>>= 0), (n = n === void 0 ? this.length : n >>> 0), (e ||= 0))
        let i
        if (typeof e == `number`) for (i = t; i < n; ++i) this[i] = e
        else {
          let a = l.isBuffer(e) ? e : l.from(e, r),
            o = a.length
          if (o === 0) throw TypeError(`The value "` + e + `" is invalid for argument "value"`)
          for (i = 0; i < n - t; ++i) this[i + t] = a[i % o]
        }
        return this
      }))
    var B = {}
    function oe(e, t, n) {
      B[e] = class extends n {
        constructor() {
          ;(super(),
            Object.defineProperty(this, `message`, {
              value: t.apply(this, arguments),
              writable: !0,
              configurable: !0
            }),
            (this.name = `${this.name} [${e}]`),
            this.stack,
            delete this.name)
        }
        get code() {
          return e
        }
        set code(e) {
          Object.defineProperty(this, `code`, {
            configurable: !0,
            enumerable: !0,
            value: e,
            writable: !0
          })
        }
        toString() {
          return `${this.name} [${e}]: ${this.message}`
        }
      }
    }
    ;(oe(
      `ERR_BUFFER_OUT_OF_BOUNDS`,
      function (e) {
        return e
          ? `${e} is outside of buffer bounds`
          : `Attempt to access memory outside buffer bounds`
      },
      RangeError
    ),
      oe(
        `ERR_INVALID_ARG_TYPE`,
        function (e, t) {
          return `The "${e}" argument must be of type number. Received type ${typeof t}`
        },
        TypeError
      ),
      oe(
        `ERR_OUT_OF_RANGE`,
        function (e, t, n) {
          let r = `The value of "${e}" is out of range.`,
            i = n
          return (
            Number.isInteger(n) && Math.abs(n) > 2 ** 32
              ? (i = V(String(n)))
              : typeof n == `bigint` &&
                ((i = String(n)),
                (n > BigInt(2) ** BigInt(32) || n < -(BigInt(2) ** BigInt(32))) && (i = V(i)),
                (i += `n`)),
            (r += ` It must be ${t}. Received ${i}`),
            r
          )
        },
        RangeError
      ))
    function V(e) {
      let t = ``,
        n = e.length,
        r = e[0] === `-` ? 1 : 0
      for (; n >= r + 4; n -= 3) t = `_${e.slice(n - 3, n)}${t}`
      return `${e.slice(0, n)}${t}`
    }
    function se(e, t, n) {
      ;(le(t, `offset`), (e[t] === void 0 || e[t + n] === void 0) && ue(t, e.length - (n + 1)))
    }
    function ce(e, t, n, r, i, a) {
      if (e > n || e < t) {
        let r = typeof t == `bigint` ? `n` : ``,
          i
        throw (
          (i =
            a > 3
              ? t === 0 || t === BigInt(0)
                ? `>= 0${r} and < 2${r} ** ${(a + 1) * 8}${r}`
                : `>= -(2${r} ** ${(a + 1) * 8 - 1}${r}) and < 2 ** ${(a + 1) * 8 - 1}${r}`
              : `>= ${t}${r} and <= ${n}${r}`),
          new B.ERR_OUT_OF_RANGE(`value`, i, e)
        )
      }
      se(r, i, a)
    }
    function le(e, t) {
      if (typeof e != `number`) throw new B.ERR_INVALID_ARG_TYPE(t, `number`, e)
    }
    function ue(e, t, n) {
      throw Math.floor(e) === e
        ? t < 0
          ? new B.ERR_BUFFER_OUT_OF_BOUNDS()
          : new B.ERR_OUT_OF_RANGE(n || `offset`, `>= ${n ? 1 : 0} and <= ${t}`, e)
        : (le(e, n), new B.ERR_OUT_OF_RANGE(n || `offset`, `an integer`, e))
    }
    var de = /[^+/0-9A-Za-z-_]/g
    function fe(e) {
      if (((e = e.split(`=`)[0]), (e = e.trim().replace(de, ``)), e.length < 2)) return ``
      for (; e.length % 4 != 0; ) e += `=`
      return e
    }
    function pe(e, t) {
      t ||= 1 / 0
      let n,
        r = e.length,
        i = null,
        a = []
      for (let o = 0; o < r; ++o) {
        if (((n = e.charCodeAt(o)), n > 55295 && n < 57344)) {
          if (!i) {
            if (n > 56319) {
              ;(t -= 3) > -1 && a.push(239, 191, 189)
              continue
            } else if (o + 1 === r) {
              ;(t -= 3) > -1 && a.push(239, 191, 189)
              continue
            }
            i = n
            continue
          }
          if (n < 56320) {
            ;((t -= 3) > -1 && a.push(239, 191, 189), (i = n))
            continue
          }
          n = (((i - 55296) << 10) | (n - 56320)) + 65536
        } else i && (t -= 3) > -1 && a.push(239, 191, 189)
        if (((i = null), n < 128)) {
          if (--t < 0) break
          a.push(n)
        } else if (n < 2048) {
          if ((t -= 2) < 0) break
          a.push((n >> 6) | 192, (n & 63) | 128)
        } else if (n < 65536) {
          if ((t -= 3) < 0) break
          a.push((n >> 12) | 224, ((n >> 6) & 63) | 128, (n & 63) | 128)
        } else if (n < 1114112) {
          if ((t -= 4) < 0) break
          a.push((n >> 18) | 240, ((n >> 12) & 63) | 128, ((n >> 6) & 63) | 128, (n & 63) | 128)
        } else throw Error(`Invalid code point`)
      }
      return a
    }
    function me(e) {
      let t = []
      for (let n = 0; n < e.length; ++n) t.push(e.charCodeAt(n) & 255)
      return t
    }
    function he(e, t) {
      let n,
        r,
        i,
        a = []
      for (let o = 0; o < e.length && !((t -= 2) < 0); ++o)
        ((n = e.charCodeAt(o)), (r = n >> 8), (i = n % 256), a.push(i), a.push(r))
      return a
    }
    function ge(e) {
      return r.toByteArray(fe(e))
    }
    function _e(e, t, n, r) {
      let i
      for (i = 0; i < r && !(i + n >= t.length || i >= e.length); ++i) t[i + n] = e[i]
      return i
    }
    function ve(e, t) {
      return (
        e instanceof t ||
        (e != null &&
          e.constructor != null &&
          e.constructor.name != null &&
          e.constructor.name === t.name)
      )
    }
    function ye(e) {
      return e !== e
    }
    var H = (function () {
      let e = `0123456789abcdef`,
        t = Array(256)
      for (let n = 0; n < 16; ++n) {
        let r = n * 16
        for (let i = 0; i < 16; ++i) t[r + i] = e[n] + e[i]
      }
      return t
    })()
    function U(e) {
      return typeof BigInt > `u` ? be : e
    }
    function be() {
      throw Error(`BigInt not supported`)
    }
  }),
  i =
    typeof globalThis < `u`
      ? globalThis
      : typeof window < `u`
        ? window
        : typeof global < `u`
          ? global
          : typeof self < `u`
            ? self
            : {}
function a(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, `default`) ? e.default : e
}
var o = { exports: {} },
  s = {},
  c = {}
;(Object.defineProperty(c, `__esModule`, { value: !0 }),
  (c.constants = void 0),
  (c.constants = {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    S_IFMT: 61440,
    S_IFREG: 32768,
    S_IFDIR: 16384,
    S_IFCHR: 8192,
    S_IFBLK: 24576,
    S_IFIFO: 4096,
    S_IFLNK: 40960,
    S_IFSOCK: 49152,
    O_CREAT: 64,
    O_EXCL: 128,
    O_NOCTTY: 256,
    O_TRUNC: 512,
    O_APPEND: 1024,
    O_DIRECTORY: 65536,
    O_NOATIME: 262144,
    O_NOFOLLOW: 131072,
    O_SYNC: 1052672,
    O_DIRECT: 16384,
    O_NONBLOCK: 2048,
    S_IRWXU: 448,
    S_IRUSR: 256,
    S_IWUSR: 128,
    S_IXUSR: 64,
    S_IRWXG: 56,
    S_IRGRP: 32,
    S_IWGRP: 16,
    S_IXGRP: 8,
    S_IRWXO: 7,
    S_IROTH: 4,
    S_IWOTH: 2,
    S_IXOTH: 1,
    F_OK: 0,
    R_OK: 4,
    W_OK: 2,
    X_OK: 1,
    UV_FS_SYMLINK_DIR: 1,
    UV_FS_SYMLINK_JUNCTION: 2,
    UV_FS_COPYFILE_EXCL: 1,
    UV_FS_COPYFILE_FICLONE: 2,
    UV_FS_COPYFILE_FICLONE_FORCE: 4,
    COPYFILE_EXCL: 1,
    COPYFILE_FICLONE: 2,
    COPYFILE_FICLONE_FORCE: 4
  }))
var l = {}
;(typeof BigInt == `function`
  ? (l.default = BigInt)
  : (l.default = function () {
      throw Error(`BigInt is not supported in this environment.`)
    }),
  Object.defineProperty(s, `__esModule`, { value: !0 }),
  (s.Stats = void 0))
var u = c,
  d = l,
  f = u.constants.S_IFMT,
  p = u.constants.S_IFDIR,
  m = u.constants.S_IFREG,
  h = u.constants.S_IFBLK,
  g = u.constants.S_IFCHR,
  _ = u.constants.S_IFLNK,
  v = u.constants.S_IFIFO,
  y = u.constants.S_IFSOCK,
  ee = (function () {
    function e() {}
    return (
      (e.build = function (t, n) {
        n === void 0 && (n = !1)
        var r = new e(),
          i = t.uid,
          a = t.gid,
          o = t.atime,
          s = t.mtime,
          c = t.ctime,
          l = n
            ? d.default
            : function (e) {
                return e
              }
        ;((r.uid = l(i)),
          (r.gid = l(a)),
          (r.rdev = l(0)),
          (r.blksize = l(4096)),
          (r.ino = l(t.ino)),
          (r.size = l(t.getSize())),
          (r.blocks = l(1)),
          (r.atime = o),
          (r.mtime = s),
          (r.ctime = c),
          (r.birthtime = c),
          (r.atimeMs = l(o.getTime())),
          (r.mtimeMs = l(s.getTime())))
        var u = l(c.getTime())
        return (
          (r.ctimeMs = u),
          (r.birthtimeMs = u),
          (r.dev = l(0)),
          (r.mode = l(t.mode)),
          (r.nlink = l(t.nlink)),
          r
        )
      }),
      (e.prototype._checkModeProperty = function (e) {
        return (Number(this.mode) & f) === e
      }),
      (e.prototype.isDirectory = function () {
        return this._checkModeProperty(p)
      }),
      (e.prototype.isFile = function () {
        return this._checkModeProperty(m)
      }),
      (e.prototype.isBlockDevice = function () {
        return this._checkModeProperty(h)
      }),
      (e.prototype.isCharacterDevice = function () {
        return this._checkModeProperty(g)
      }),
      (e.prototype.isSymbolicLink = function () {
        return this._checkModeProperty(_)
      }),
      (e.prototype.isFIFO = function () {
        return this._checkModeProperty(v)
      }),
      (e.prototype.isSocket = function () {
        return this._checkModeProperty(y)
      }),
      e
    )
  })()
;((s.Stats = ee), (s.default = ee))
var b = {},
  te = {},
  x = {},
  S = {}
;((S.Buffer =
  typeof Buffer == `function`
    ? Buffer
    : (function () {
        if (typeof __webpack_public_path__ < `u`)
          try {
            return __non_webpack_require__(`buffer`).Buffer
          } catch {
            throw Error(
              'The current runtime does not support "Buffer". Consider using buffer polyfill to make sure `globalThis.Buffer` is defined.'
            )
          }
        else
          try {
            return r().Buffer
          } catch {
            throw Error(
              'The current runtime does not support "Buffer". Consider using buffer polyfill to make sure `globalThis.Buffer` is defined.'
            )
          }
      })()),
  (function (e) {
    var t =
      (i && i.__spreadArray) ||
      function (e, t, n) {
        if (n || arguments.length === 2)
          for (var r = 0, i = t.length, a; r < i; r++)
            (a || !(r in t)) && ((a ||= Array.prototype.slice.call(t, 0, r)), (a[r] = t[r]))
        return e.concat(a || Array.prototype.slice.call(t))
      }
    ;(Object.defineProperty(e, `__esModule`, { value: !0 }),
      (e.bufferFrom = e.bufferAllocUnsafe = e.Buffer = void 0))
    var n = S
    Object.defineProperty(e, `Buffer`, {
      enumerable: !0,
      get: function () {
        return n.Buffer
      }
    })
    function r(e) {
      var r = [...arguments].slice(1)
      return new (n.Buffer.bind.apply(n.Buffer, t([void 0, e], r, !1)))()
    }
    ;((e.bufferAllocUnsafe = n.Buffer.allocUnsafe || r), (e.bufferFrom = n.Buffer.from || r))
  })(x))
var ne = {}
function C(e, t) {
  if (!e) throw Error(t || `AssertionError`)
}
C.strictEqual = function (e, t, n) {
  if (!Object.is(e, t)) throw Error(n || `AssertionError`)
}
var w = C,
  T = { exports: {} },
  E = (T.exports = {}),
  D,
  O
function k() {
  throw Error(`setTimeout has not been defined`)
}
function A() {
  throw Error(`clearTimeout has not been defined`)
}
;(function () {
  try {
    D = typeof setTimeout == `function` ? setTimeout : k
  } catch {
    D = k
  }
  try {
    O = typeof clearTimeout == `function` ? clearTimeout : A
  } catch {
    O = A
  }
})()
function j(e) {
  if (D === setTimeout) return setTimeout(e, 0)
  if ((D === k || !D) && setTimeout) return ((D = setTimeout), setTimeout(e, 0))
  try {
    return D(e, 0)
  } catch {
    try {
      return D.call(null, e, 0)
    } catch {
      return D.call(this, e, 0)
    }
  }
}
function re(e) {
  if (O === clearTimeout) return clearTimeout(e)
  if ((O === A || !O) && clearTimeout) return ((O = clearTimeout), clearTimeout(e))
  try {
    return O(e)
  } catch {
    try {
      return O.call(null, e)
    } catch {
      return O.call(this, e)
    }
  }
}
var M = [],
  N = !1,
  P,
  F = -1
function I() {
  !N || !P || ((N = !1), P.length ? (M = P.concat(M)) : (F = -1), M.length && L())
}
function L() {
  if (!N) {
    var e = j(I)
    N = !0
    for (var t = M.length; t; ) {
      for (P = M, M = []; ++F < t; ) P && P[F].run()
      ;((F = -1), (t = M.length))
    }
    ;((P = null), (N = !1), re(e))
  }
}
E.nextTick = function (e) {
  var t = Array(arguments.length - 1)
  if (arguments.length > 1) for (var n = 1; n < arguments.length; n++) t[n - 1] = arguments[n]
  ;(M.push(new ie(e, t)), M.length === 1 && !N && j(L))
}
function ie(e, t) {
  ;((this.fun = e), (this.array = t))
}
;((ie.prototype.run = function () {
  this.fun.apply(null, this.array)
}),
  (E.title = `browser`),
  (E.browser = !0),
  (E.env = {}),
  (E.argv = []),
  (E.version = ``),
  (E.versions = {}))
function R() {}
;((E.on = R),
  (E.addListener = R),
  (E.once = R),
  (E.off = R),
  (E.removeListener = R),
  (E.removeAllListeners = R),
  (E.emit = R),
  (E.prependListener = R),
  (E.prependOnceListener = R),
  (E.listeners = function (e) {
    return []
  }),
  (E.binding = function (e) {
    throw Error(`process.binding is not supported`)
  }),
  (E.cwd = function () {
    return `/`
  }),
  (E.chdir = function (e) {
    throw Error(`process.chdir is not supported`)
  }),
  (E.umask = function () {
    return 0
  }))
var ae = T.exports,
  z = a(ae),
  B = {},
  oe = {},
  V = function () {
    if (typeof Symbol != `function` || typeof Object.getOwnPropertySymbols != `function`) return !1
    if (typeof Symbol.iterator == `symbol`) return !0
    var e = {},
      t = Symbol(`test`),
      n = Object(t)
    if (
      typeof t == `string` ||
      Object.prototype.toString.call(t) !== `[object Symbol]` ||
      Object.prototype.toString.call(n) !== `[object Symbol]`
    )
      return !1
    var r = 42
    for (t in ((e[t] = r), e)) return !1
    if (
      (typeof Object.keys == `function` && Object.keys(e).length !== 0) ||
      (typeof Object.getOwnPropertyNames == `function` &&
        Object.getOwnPropertyNames(e).length !== 0)
    )
      return !1
    var i = Object.getOwnPropertySymbols(e)
    if (i.length !== 1 || i[0] !== t || !Object.prototype.propertyIsEnumerable.call(e, t)) return !1
    if (typeof Object.getOwnPropertyDescriptor == `function`) {
      var a = Object.getOwnPropertyDescriptor(e, t)
      if (a.value !== r || a.enumerable !== !0) return !1
    }
    return !0
  },
  se = V,
  ce = function () {
    return se() && !!Symbol.toStringTag
  },
  le = typeof Symbol < `u` && Symbol,
  ue = V,
  de = function () {
    return typeof le != `function` ||
      typeof Symbol != `function` ||
      typeof le(`foo`) != `symbol` ||
      typeof Symbol(`bar`) != `symbol`
      ? !1
      : ue()
  },
  fe = { foo: {} },
  pe = Object,
  me = function () {
    return { __proto__: fe }.foo === fe.foo && !({ __proto__: null } instanceof pe)
  },
  he = `Function.prototype.bind called on incompatible `,
  ge = Object.prototype.toString,
  _e = Math.max,
  ve = `[object Function]`,
  ye = function (e, t) {
    for (var n = [], r = 0; r < e.length; r += 1) n[r] = e[r]
    for (var i = 0; i < t.length; i += 1) n[i + e.length] = t[i]
    return n
  },
  H = function (e, t) {
    for (var n = [], r = t || 0, i = 0; r < e.length; r += 1, i += 1) n[i] = e[r]
    return n
  },
  U = function (e, t) {
    for (var n = ``, r = 0; r < e.length; r += 1) ((n += e[r]), r + 1 < e.length && (n += t))
    return n
  },
  be =
    Function.prototype.bind ||
    function (e) {
      var t = this
      if (typeof t != `function` || ge.apply(t) !== ve) throw TypeError(he + t)
      for (
        var n = H(arguments, 1),
          r,
          i = function () {
            if (this instanceof r) {
              var i = t.apply(this, ye(n, arguments))
              return Object(i) === i ? i : this
            }
            return t.apply(e, ye(n, arguments))
          },
          a = _e(0, t.length - n.length),
          o = [],
          s = 0;
        s < a;
        s++
      )
        o[s] = `$` + s
      if (
        ((r = Function(
          `binder`,
          `return function (` + U(o, `,`) + `){ return binder.apply(this,arguments); }`
        )(i)),
        t.prototype)
      ) {
        var c = function () {}
        ;((c.prototype = t.prototype), (r.prototype = new c()), (c.prototype = null))
      }
      return r
    },
  xe = Function.prototype.call,
  Se = Object.prototype.hasOwnProperty,
  W = be.call(xe, Se),
  G,
  Ce = SyntaxError,
  we = Function,
  Te = TypeError,
  Ee = function (e) {
    try {
      return we(`"use strict"; return (` + e + `).constructor;`)()
    } catch {}
  },
  De = Object.getOwnPropertyDescriptor
if (De)
  try {
    De({}, ``)
  } catch {
    De = null
  }
var Oe = function () {
    throw new Te()
  },
  ke = De
    ? (function () {
        try {
          return (arguments.callee, Oe)
        } catch {
          try {
            return De(arguments, `callee`).get
          } catch {
            return Oe
          }
        }
      })()
    : Oe,
  Ae = de(),
  je = me(),
  K =
    Object.getPrototypeOf ||
    (je
      ? function (e) {
          return e.__proto__
        }
      : null),
  Me = {},
  Ne = typeof Uint8Array > `u` || !K ? G : K(Uint8Array),
  Pe = {
    '%AggregateError%': typeof AggregateError > `u` ? G : AggregateError,
    '%Array%': Array,
    '%ArrayBuffer%': typeof ArrayBuffer > `u` ? G : ArrayBuffer,
    '%ArrayIteratorPrototype%': Ae && K ? K([][Symbol.iterator]()) : G,
    '%AsyncFromSyncIteratorPrototype%': G,
    '%AsyncFunction%': Me,
    '%AsyncGenerator%': Me,
    '%AsyncGeneratorFunction%': Me,
    '%AsyncIteratorPrototype%': Me,
    '%Atomics%': typeof Atomics > `u` ? G : Atomics,
    '%BigInt%': typeof BigInt > `u` ? G : BigInt,
    '%BigInt64Array%': typeof BigInt64Array > `u` ? G : BigInt64Array,
    '%BigUint64Array%': typeof BigUint64Array > `u` ? G : BigUint64Array,
    '%Boolean%': Boolean,
    '%DataView%': typeof DataView > `u` ? G : DataView,
    '%Date%': Date,
    '%decodeURI%': decodeURI,
    '%decodeURIComponent%': decodeURIComponent,
    '%encodeURI%': encodeURI,
    '%encodeURIComponent%': encodeURIComponent,
    '%Error%': Error,
    '%eval%': eval,
    '%EvalError%': EvalError,
    '%Float32Array%': typeof Float32Array > `u` ? G : Float32Array,
    '%Float64Array%': typeof Float64Array > `u` ? G : Float64Array,
    '%FinalizationRegistry%': typeof FinalizationRegistry > `u` ? G : FinalizationRegistry,
    '%Function%': we,
    '%GeneratorFunction%': Me,
    '%Int8Array%': typeof Int8Array > `u` ? G : Int8Array,
    '%Int16Array%': typeof Int16Array > `u` ? G : Int16Array,
    '%Int32Array%': typeof Int32Array > `u` ? G : Int32Array,
    '%isFinite%': isFinite,
    '%isNaN%': isNaN,
    '%IteratorPrototype%': Ae && K ? K(K([][Symbol.iterator]())) : G,
    '%JSON%': typeof JSON == `object` ? JSON : G,
    '%Map%': typeof Map > `u` ? G : Map,
    '%MapIteratorPrototype%': typeof Map > `u` || !Ae || !K ? G : K(new Map()[Symbol.iterator]()),
    '%Math%': Math,
    '%Number%': Number,
    '%Object%': Object,
    '%parseFloat%': parseFloat,
    '%parseInt%': parseInt,
    '%Promise%': typeof Promise > `u` ? G : Promise,
    '%Proxy%': typeof Proxy > `u` ? G : Proxy,
    '%RangeError%': RangeError,
    '%ReferenceError%': ReferenceError,
    '%Reflect%': typeof Reflect > `u` ? G : Reflect,
    '%RegExp%': RegExp,
    '%Set%': typeof Set > `u` ? G : Set,
    '%SetIteratorPrototype%': typeof Set > `u` || !Ae || !K ? G : K(new Set()[Symbol.iterator]()),
    '%SharedArrayBuffer%': typeof SharedArrayBuffer > `u` ? G : SharedArrayBuffer,
    '%String%': String,
    '%StringIteratorPrototype%': Ae && K ? K(``[Symbol.iterator]()) : G,
    '%Symbol%': Ae ? Symbol : G,
    '%SyntaxError%': Ce,
    '%ThrowTypeError%': ke,
    '%TypedArray%': Ne,
    '%TypeError%': Te,
    '%Uint8Array%': typeof Uint8Array > `u` ? G : Uint8Array,
    '%Uint8ClampedArray%': typeof Uint8ClampedArray > `u` ? G : Uint8ClampedArray,
    '%Uint16Array%': typeof Uint16Array > `u` ? G : Uint16Array,
    '%Uint32Array%': typeof Uint32Array > `u` ? G : Uint32Array,
    '%URIError%': URIError,
    '%WeakMap%': typeof WeakMap > `u` ? G : WeakMap,
    '%WeakRef%': typeof WeakRef > `u` ? G : WeakRef,
    '%WeakSet%': typeof WeakSet > `u` ? G : WeakSet
  }
if (K)
  try {
    null.error
  } catch (e) {
    Pe[`%Error.prototype%`] = K(K(e))
  }
var Fe = function e(t) {
    var n
    if (t === `%AsyncFunction%`) n = Ee(`async function () {}`)
    else if (t === `%GeneratorFunction%`) n = Ee(`function* () {}`)
    else if (t === `%AsyncGeneratorFunction%`) n = Ee(`async function* () {}`)
    else if (t === `%AsyncGenerator%`) {
      var r = e(`%AsyncGeneratorFunction%`)
      r && (n = r.prototype)
    } else if (t === `%AsyncIteratorPrototype%`) {
      var i = e(`%AsyncGenerator%`)
      i && K && (n = K(i.prototype))
    }
    return ((Pe[t] = n), n)
  },
  Ie = {
    '%ArrayBufferPrototype%': [`ArrayBuffer`, `prototype`],
    '%ArrayPrototype%': [`Array`, `prototype`],
    '%ArrayProto_entries%': [`Array`, `prototype`, `entries`],
    '%ArrayProto_forEach%': [`Array`, `prototype`, `forEach`],
    '%ArrayProto_keys%': [`Array`, `prototype`, `keys`],
    '%ArrayProto_values%': [`Array`, `prototype`, `values`],
    '%AsyncFunctionPrototype%': [`AsyncFunction`, `prototype`],
    '%AsyncGenerator%': [`AsyncGeneratorFunction`, `prototype`],
    '%AsyncGeneratorPrototype%': [`AsyncGeneratorFunction`, `prototype`, `prototype`],
    '%BooleanPrototype%': [`Boolean`, `prototype`],
    '%DataViewPrototype%': [`DataView`, `prototype`],
    '%DatePrototype%': [`Date`, `prototype`],
    '%ErrorPrototype%': [`Error`, `prototype`],
    '%EvalErrorPrototype%': [`EvalError`, `prototype`],
    '%Float32ArrayPrototype%': [`Float32Array`, `prototype`],
    '%Float64ArrayPrototype%': [`Float64Array`, `prototype`],
    '%FunctionPrototype%': [`Function`, `prototype`],
    '%Generator%': [`GeneratorFunction`, `prototype`],
    '%GeneratorPrototype%': [`GeneratorFunction`, `prototype`, `prototype`],
    '%Int8ArrayPrototype%': [`Int8Array`, `prototype`],
    '%Int16ArrayPrototype%': [`Int16Array`, `prototype`],
    '%Int32ArrayPrototype%': [`Int32Array`, `prototype`],
    '%JSONParse%': [`JSON`, `parse`],
    '%JSONStringify%': [`JSON`, `stringify`],
    '%MapPrototype%': [`Map`, `prototype`],
    '%NumberPrototype%': [`Number`, `prototype`],
    '%ObjectPrototype%': [`Object`, `prototype`],
    '%ObjProto_toString%': [`Object`, `prototype`, `toString`],
    '%ObjProto_valueOf%': [`Object`, `prototype`, `valueOf`],
    '%PromisePrototype%': [`Promise`, `prototype`],
    '%PromiseProto_then%': [`Promise`, `prototype`, `then`],
    '%Promise_all%': [`Promise`, `all`],
    '%Promise_reject%': [`Promise`, `reject`],
    '%Promise_resolve%': [`Promise`, `resolve`],
    '%RangeErrorPrototype%': [`RangeError`, `prototype`],
    '%ReferenceErrorPrototype%': [`ReferenceError`, `prototype`],
    '%RegExpPrototype%': [`RegExp`, `prototype`],
    '%SetPrototype%': [`Set`, `prototype`],
    '%SharedArrayBufferPrototype%': [`SharedArrayBuffer`, `prototype`],
    '%StringPrototype%': [`String`, `prototype`],
    '%SymbolPrototype%': [`Symbol`, `prototype`],
    '%SyntaxErrorPrototype%': [`SyntaxError`, `prototype`],
    '%TypedArrayPrototype%': [`TypedArray`, `prototype`],
    '%TypeErrorPrototype%': [`TypeError`, `prototype`],
    '%Uint8ArrayPrototype%': [`Uint8Array`, `prototype`],
    '%Uint8ClampedArrayPrototype%': [`Uint8ClampedArray`, `prototype`],
    '%Uint16ArrayPrototype%': [`Uint16Array`, `prototype`],
    '%Uint32ArrayPrototype%': [`Uint32Array`, `prototype`],
    '%URIErrorPrototype%': [`URIError`, `prototype`],
    '%WeakMapPrototype%': [`WeakMap`, `prototype`],
    '%WeakSetPrototype%': [`WeakSet`, `prototype`]
  },
  Le = be,
  Re = W,
  ze = Le.call(Function.call, Array.prototype.concat),
  Be = Le.call(Function.apply, Array.prototype.splice),
  Ve = Le.call(Function.call, String.prototype.replace),
  He = Le.call(Function.call, String.prototype.slice),
  Ue = Le.call(Function.call, RegExp.prototype.exec),
  q =
    /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g,
  We = /\\(\\)?/g,
  Ge = function (e) {
    var t = He(e, 0, 1),
      n = He(e, -1)
    if (t === `%` && n !== `%`) throw new Ce('invalid intrinsic syntax, expected closing `%`')
    if (n === `%` && t !== `%`) throw new Ce('invalid intrinsic syntax, expected opening `%`')
    var r = []
    return (
      Ve(e, q, function (e, t, n, i) {
        r[r.length] = n ? Ve(i, We, `$1`) : t || e
      }),
      r
    )
  },
  Ke = function (e, t) {
    var n = e,
      r
    if ((Re(Ie, n) && ((r = Ie[n]), (n = `%` + r[0] + `%`)), Re(Pe, n))) {
      var i = Pe[n]
      if ((i === Me && (i = Fe(n)), i === void 0 && !t))
        throw new Te(`intrinsic ` + e + ` exists, but is not available. Please file an issue!`)
      return { alias: r, name: n, value: i }
    }
    throw new Ce(`intrinsic ` + e + ` does not exist!`)
  },
  J = function (e, t) {
    if (typeof e != `string` || e.length === 0)
      throw new Te(`intrinsic name must be a non-empty string`)
    if (arguments.length > 1 && typeof t != `boolean`)
      throw new Te(`"allowMissing" argument must be a boolean`)
    if (Ue(/^%?[^%]*%?$/, e) === null)
      throw new Ce(
        '`%` may not be present anywhere but at the beginning and end of the intrinsic name'
      )
    var n = Ge(e),
      r = n.length > 0 ? n[0] : ``,
      i = Ke(`%` + r + `%`, t),
      a = i.name,
      o = i.value,
      s = !1,
      c = i.alias
    c && ((r = c[0]), Be(n, ze([0, 1], c)))
    for (var l = 1, u = !0; l < n.length; l += 1) {
      var d = n[l],
        f = He(d, 0, 1),
        p = He(d, -1)
      if ((f === `"` || f === `'` || f === '`' || p === `"` || p === `'` || p === '`') && f !== p)
        throw new Ce(`property names with quotes must have matching quotes`)
      if (((d === `constructor` || !u) && (s = !0), (r += `.` + d), (a = `%` + r + `%`), Re(Pe, a)))
        o = Pe[a]
      else if (o != null) {
        if (!(d in o)) {
          if (!t)
            throw new Te(`base intrinsic for ` + e + ` exists, but the property is not available.`)
          return
        }
        if (De && l + 1 >= n.length) {
          var m = De(o, d)
          ;((u = !!m), (o = u && `get` in m && !(`originalValue` in m.get) ? m.get : o[d]))
        } else ((u = Re(o, d)), (o = o[d]))
        u && !s && (Pe[a] = o)
      }
    }
    return o
  },
  qe = { exports: {} },
  Je = J(`%Object.defineProperty%`, !0),
  Ye = function () {
    if (Je)
      try {
        return (Je({}, `a`, { value: 1 }), !0)
      } catch {
        return !1
      }
    return !1
  }
Ye.hasArrayLengthDefineBug = function () {
  if (!Ye()) return null
  try {
    return Je([], `length`, { value: 1 }).length !== 1
  } catch {
    return !0
  }
}
var Xe = Ye,
  Ze = J(`%Object.getOwnPropertyDescriptor%`, !0)
if (Ze)
  try {
    Ze([], `length`)
  } catch {
    Ze = null
  }
var Qe = Ze,
  $e = Xe(),
  et = J,
  tt = $e && et(`%Object.defineProperty%`, !0)
if (tt)
  try {
    tt({}, `a`, { value: 1 })
  } catch {
    tt = !1
  }
var nt = et(`%SyntaxError%`),
  rt = et(`%TypeError%`),
  it = Qe,
  at = function (e, t, n) {
    if (!e || (typeof e != `object` && typeof e != `function`))
      throw new rt('`obj` must be an object or a function`')
    if (typeof t != `string` && typeof t != `symbol`)
      throw new rt('`property` must be a string or a symbol`')
    if (arguments.length > 3 && typeof arguments[3] != `boolean` && arguments[3] !== null)
      throw new rt('`nonEnumerable`, if provided, must be a boolean or null')
    if (arguments.length > 4 && typeof arguments[4] != `boolean` && arguments[4] !== null)
      throw new rt('`nonWritable`, if provided, must be a boolean or null')
    if (arguments.length > 5 && typeof arguments[5] != `boolean` && arguments[5] !== null)
      throw new rt('`nonConfigurable`, if provided, must be a boolean or null')
    if (arguments.length > 6 && typeof arguments[6] != `boolean`)
      throw new rt('`loose`, if provided, must be a boolean')
    var r = arguments.length > 3 ? arguments[3] : null,
      i = arguments.length > 4 ? arguments[4] : null,
      a = arguments.length > 5 ? arguments[5] : null,
      o = arguments.length > 6 ? arguments[6] : !1,
      s = !!it && it(e, t)
    if (tt)
      tt(e, t, {
        configurable: a === null && s ? s.configurable : !a,
        enumerable: r === null && s ? s.enumerable : !r,
        value: n,
        writable: i === null && s ? s.writable : !i
      })
    else if (o || (!r && !i && !a)) e[t] = n
    else
      throw new nt(
        `This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.`
      )
  },
  ot = J,
  st = at,
  ct = Xe(),
  lt = Qe,
  ut = ot(`%TypeError%`),
  dt = ot(`%Math.floor%`),
  ft = function (e, t) {
    if (typeof e != `function`) throw new ut('`fn` is not a function')
    if (typeof t != `number` || t < 0 || t > 4294967295 || dt(t) !== t)
      throw new ut('`length` must be a positive 32-bit integer')
    var n = arguments.length > 2 && !!arguments[2],
      r = !0,
      i = !0
    if (`length` in e && lt) {
      var a = lt(e, `length`)
      ;(a && !a.configurable && (r = !1), a && !a.writable && (i = !1))
    }
    return ((r || i || !n) && (ct ? st(e, `length`, t, !0, !0) : st(e, `length`, t)), e)
  }
;(function (e) {
  var t = be,
    n = J,
    r = ft,
    i = n(`%TypeError%`),
    a = n(`%Function.prototype.apply%`),
    o = n(`%Function.prototype.call%`),
    s = n(`%Reflect.apply%`, !0) || t.call(o, a),
    c = n(`%Object.defineProperty%`, !0),
    l = n(`%Math.max%`)
  if (c)
    try {
      c({}, `a`, { value: 1 })
    } catch {
      c = null
    }
  e.exports = function (e) {
    if (typeof e != `function`) throw new i(`a function is required`)
    return r(s(t, o, arguments), 1 + l(0, e.length - (arguments.length - 1)), !0)
  }
  var u = function () {
    return s(t, a, arguments)
  }
  c ? c(e.exports, `apply`, { value: u }) : (e.exports.apply = u)
})(qe)
var pt = qe.exports,
  mt = J,
  ht = pt,
  gt = ht(mt(`String.prototype.indexOf`)),
  _t = function (e, t) {
    var n = mt(e, !!t)
    return typeof n == `function` && gt(e, `.prototype.`) > -1 ? ht(n) : n
  },
  vt = ce(),
  yt = _t(`Object.prototype.toString`),
  bt = function (e) {
    return vt && e && typeof e == `object` && Symbol.toStringTag in e
      ? !1
      : yt(e) === `[object Arguments]`
  },
  xt = function (e) {
    return bt(e)
      ? !0
      : typeof e == `object` &&
          !!e &&
          typeof e.length == `number` &&
          e.length >= 0 &&
          yt(e) !== `[object Array]` &&
          yt(e.callee) === `[object Function]`
  },
  St = (function () {
    return bt(arguments)
  })()
bt.isLegacyArguments = xt
var Ct = St ? bt : xt,
  wt = Object.prototype.toString,
  Tt = Function.prototype.toString,
  Et = /^\s*(?:function)?\*/,
  Dt = ce(),
  Ot = Object.getPrototypeOf,
  kt = function () {
    if (!Dt) return !1
    try {
      return Function(`return function*() {}`)()
    } catch {}
  },
  At,
  jt = function (e) {
    if (typeof e != `function`) return !1
    if (Et.test(Tt.call(e))) return !0
    if (!Dt) return wt.call(e) === `[object GeneratorFunction]`
    if (!Ot) return !1
    if (At === void 0) {
      var t = kt()
      At = t ? Ot(t) : !1
    }
    return Ot(e) === At
  },
  Mt = Function.prototype.toString,
  Nt = typeof Reflect == `object` && Reflect !== null && Reflect.apply,
  Pt,
  Ft
if (typeof Nt == `function` && typeof Object.defineProperty == `function`)
  try {
    ;((Pt = Object.defineProperty({}, `length`, {
      get: function () {
        throw Ft
      }
    })),
      (Ft = {}),
      Nt(
        function () {
          throw 42
        },
        null,
        Pt
      ))
  } catch (e) {
    e !== Ft && (Nt = null)
  }
else Nt = null
var It = /^\s*class\b/,
  Lt = function (e) {
    try {
      var t = Mt.call(e)
      return It.test(t)
    } catch {
      return !1
    }
  },
  Rt = function (e) {
    try {
      return Lt(e) ? !1 : (Mt.call(e), !0)
    } catch {
      return !1
    }
  },
  zt = Object.prototype.toString,
  Bt = `[object Object]`,
  Vt = `[object Function]`,
  Ht = `[object GeneratorFunction]`,
  Ut = `[object HTMLAllCollection]`,
  Wt = `[object HTML document.all class]`,
  Gt = `[object HTMLCollection]`,
  Kt = typeof Symbol == `function` && !!Symbol.toStringTag,
  qt = !(0 in [,]),
  Jt = function () {
    return !1
  }
if (typeof document == `object`) {
  var Yt = document.all
  zt.call(Yt) === zt.call(document.all) &&
    (Jt = function (e) {
      if ((qt || !e) && (e === void 0 || typeof e == `object`))
        try {
          var t = zt.call(e)
          return (t === Ut || t === Wt || t === Gt || t === Bt) && e(``) == null
        } catch {}
      return !1
    })
}
var Xt = Nt
    ? function (e) {
        if (Jt(e)) return !0
        if (!e || (typeof e != `function` && typeof e != `object`)) return !1
        try {
          Nt(e, null, Pt)
        } catch (e) {
          if (e !== Ft) return !1
        }
        return !Lt(e) && Rt(e)
      }
    : function (e) {
        if (Jt(e)) return !0
        if (!e || (typeof e != `function` && typeof e != `object`)) return !1
        if (Kt) return Rt(e)
        if (Lt(e)) return !1
        var t = zt.call(e)
        return t !== Vt && t !== Ht && !/^\[object HTML/.test(t) ? !1 : Rt(e)
      },
  Zt = Object.prototype.toString,
  Qt = Object.prototype.hasOwnProperty,
  $t = function (e, t, n) {
    for (var r = 0, i = e.length; r < i; r++)
      Qt.call(e, r) && (n == null ? t(e[r], r, e) : t.call(n, e[r], r, e))
  },
  en = function (e, t, n) {
    for (var r = 0, i = e.length; r < i; r++)
      n == null ? t(e.charAt(r), r, e) : t.call(n, e.charAt(r), r, e)
  },
  tn = function (e, t, n) {
    for (var r in e) Qt.call(e, r) && (n == null ? t(e[r], r, e) : t.call(n, e[r], r, e))
  },
  nn = function (e, t, n) {
    if (!Xt(t)) throw TypeError(`iterator must be a function`)
    var r
    ;(arguments.length >= 3 && (r = n),
      Zt.call(e) === `[object Array]`
        ? $t(e, t, r)
        : typeof e == `string`
          ? en(e, t, r)
          : tn(e, t, r))
  },
  rn = [
    `BigInt64Array`,
    `BigUint64Array`,
    `Float32Array`,
    `Float64Array`,
    `Int16Array`,
    `Int32Array`,
    `Int8Array`,
    `Uint16Array`,
    `Uint32Array`,
    `Uint8Array`,
    `Uint8ClampedArray`
  ],
  an = typeof globalThis > `u` ? i : globalThis,
  on = function () {
    for (var e = [], t = 0; t < rn.length; t++)
      typeof an[rn[t]] == `function` && (e[e.length] = rn[t])
    return e
  },
  sn = nn,
  cn = on,
  ln = pt,
  un = _t,
  dn = Qe,
  fn = un(`Object.prototype.toString`),
  pn = ce(),
  mn = typeof globalThis > `u` ? i : globalThis,
  hn = cn(),
  gn = un(`String.prototype.slice`),
  _n = Object.getPrototypeOf,
  vn =
    un(`Array.prototype.indexOf`, !0) ||
    function (e, t) {
      for (var n = 0; n < e.length; n += 1) if (e[n] === t) return n
      return -1
    },
  yn = { __proto__: null }
pn && dn && _n
  ? sn(hn, function (e) {
      var t = new mn[e]()
      if (Symbol.toStringTag in t) {
        var n = _n(t),
          r = dn(n, Symbol.toStringTag)
        ;((r ||= dn(_n(n), Symbol.toStringTag)), (yn[`$` + e] = ln(r.get)))
      }
    })
  : sn(hn, function (e) {
      var t = new mn[e](),
        n = t.slice || t.set
      n && (yn[`$` + e] = ln(n))
    })
var bn = function (e) {
    var t = !1
    return (
      sn(yn, function (n, r) {
        if (!t)
          try {
            ;`$` + n(e) === r && (t = gn(r, 1))
          } catch {}
      }),
      t
    )
  },
  xn = function (e) {
    var t = !1
    return (
      sn(yn, function (n, r) {
        if (!t)
          try {
            ;(n(e), (t = gn(r, 1)))
          } catch {}
      }),
      t
    )
  },
  Sn = function (e) {
    if (!e || typeof e != `object`) return !1
    if (!pn) {
      var t = gn(fn(e), 8, -1)
      return vn(hn, t) > -1 ? t : t === `Object` ? xn(e) : !1
    }
    return dn ? bn(e) : null
  },
  Cn = Sn,
  wn = function (e) {
    return !!Cn(e)
  }
;(function (e) {
  var t = Ct,
    n = jt,
    r = Sn,
    i = wn
  function a(e) {
    return e.call.bind(e)
  }
  var o = typeof BigInt < `u`,
    s = typeof Symbol < `u`,
    c = a(Object.prototype.toString),
    l = a(Number.prototype.valueOf),
    u = a(String.prototype.valueOf),
    d = a(Boolean.prototype.valueOf)
  if (o) var f = a(BigInt.prototype.valueOf)
  if (s) var p = a(Symbol.prototype.valueOf)
  function m(e, t) {
    if (typeof e != `object`) return !1
    try {
      return (t(e), !0)
    } catch {
      return !1
    }
  }
  ;((e.isArgumentsObject = t), (e.isGeneratorFunction = n), (e.isTypedArray = i))
  function h(e) {
    return (
      (typeof Promise < `u` && e instanceof Promise) ||
      (typeof e == `object` && !!e && typeof e.then == `function` && typeof e.catch == `function`)
    )
  }
  e.isPromise = h
  function g(e) {
    return typeof ArrayBuffer < `u` && ArrayBuffer.isView ? ArrayBuffer.isView(e) : i(e) || F(e)
  }
  e.isArrayBufferView = g
  function _(e) {
    return r(e) === `Uint8Array`
  }
  e.isUint8Array = _
  function v(e) {
    return r(e) === `Uint8ClampedArray`
  }
  e.isUint8ClampedArray = v
  function y(e) {
    return r(e) === `Uint16Array`
  }
  e.isUint16Array = y
  function ee(e) {
    return r(e) === `Uint32Array`
  }
  e.isUint32Array = ee
  function b(e) {
    return r(e) === `Int8Array`
  }
  e.isInt8Array = b
  function te(e) {
    return r(e) === `Int16Array`
  }
  e.isInt16Array = te
  function x(e) {
    return r(e) === `Int32Array`
  }
  e.isInt32Array = x
  function S(e) {
    return r(e) === `Float32Array`
  }
  e.isFloat32Array = S
  function ne(e) {
    return r(e) === `Float64Array`
  }
  e.isFloat64Array = ne
  function C(e) {
    return r(e) === `BigInt64Array`
  }
  e.isBigInt64Array = C
  function w(e) {
    return r(e) === `BigUint64Array`
  }
  e.isBigUint64Array = w
  function T(e) {
    return c(e) === `[object Map]`
  }
  T.working = typeof Map < `u` && T(new Map())
  function E(e) {
    return typeof Map > `u` ? !1 : T.working ? T(e) : e instanceof Map
  }
  e.isMap = E
  function D(e) {
    return c(e) === `[object Set]`
  }
  D.working = typeof Set < `u` && D(new Set())
  function O(e) {
    return typeof Set > `u` ? !1 : D.working ? D(e) : e instanceof Set
  }
  e.isSet = O
  function k(e) {
    return c(e) === `[object WeakMap]`
  }
  k.working = typeof WeakMap < `u` && k(new WeakMap())
  function A(e) {
    return typeof WeakMap > `u` ? !1 : k.working ? k(e) : e instanceof WeakMap
  }
  e.isWeakMap = A
  function j(e) {
    return c(e) === `[object WeakSet]`
  }
  j.working = typeof WeakSet < `u` && j(new WeakSet())
  function re(e) {
    return j(e)
  }
  e.isWeakSet = re
  function M(e) {
    return c(e) === `[object ArrayBuffer]`
  }
  M.working = typeof ArrayBuffer < `u` && M(new ArrayBuffer())
  function N(e) {
    return typeof ArrayBuffer > `u` ? !1 : M.working ? M(e) : e instanceof ArrayBuffer
  }
  e.isArrayBuffer = N
  function P(e) {
    return c(e) === `[object DataView]`
  }
  P.working =
    typeof ArrayBuffer < `u` && typeof DataView < `u` && P(new DataView(new ArrayBuffer(1), 0, 1))
  function F(e) {
    return typeof DataView > `u` ? !1 : P.working ? P(e) : e instanceof DataView
  }
  e.isDataView = F
  var I = typeof SharedArrayBuffer < `u` ? SharedArrayBuffer : void 0
  function L(e) {
    return c(e) === `[object SharedArrayBuffer]`
  }
  function ie(e) {
    return I === void 0
      ? !1
      : (L.working === void 0 && (L.working = L(new I())), L.working ? L(e) : e instanceof I)
  }
  e.isSharedArrayBuffer = ie
  function R(e) {
    return c(e) === `[object AsyncFunction]`
  }
  e.isAsyncFunction = R
  function ae(e) {
    return c(e) === `[object Map Iterator]`
  }
  e.isMapIterator = ae
  function z(e) {
    return c(e) === `[object Set Iterator]`
  }
  e.isSetIterator = z
  function B(e) {
    return c(e) === `[object Generator]`
  }
  e.isGeneratorObject = B
  function oe(e) {
    return c(e) === `[object WebAssembly.Module]`
  }
  e.isWebAssemblyCompiledModule = oe
  function V(e) {
    return m(e, l)
  }
  e.isNumberObject = V
  function se(e) {
    return m(e, u)
  }
  e.isStringObject = se
  function ce(e) {
    return m(e, d)
  }
  e.isBooleanObject = ce
  function le(e) {
    return o && m(e, f)
  }
  e.isBigIntObject = le
  function ue(e) {
    return s && m(e, p)
  }
  e.isSymbolObject = ue
  function de(e) {
    return V(e) || se(e) || ce(e) || le(e) || ue(e)
  }
  e.isBoxedPrimitive = de
  function fe(e) {
    return typeof Uint8Array < `u` && (N(e) || ie(e))
  }
  ;((e.isAnyArrayBuffer = fe),
    [`isProxy`, `isExternal`, `isModuleNamespaceObject`].forEach(function (t) {
      Object.defineProperty(e, t, {
        enumerable: !1,
        value: function () {
          throw Error(t + ` is not supported in userland`)
        }
      })
    }))
})(oe)
var Tn = function (e) {
    return (
      e &&
      typeof e == `object` &&
      typeof e.copy == `function` &&
      typeof e.fill == `function` &&
      typeof e.readUInt8 == `function`
    )
  },
  En = { exports: {} }
typeof Object.create == `function`
  ? (En.exports = function (e, t) {
      t &&
        ((e.super_ = t),
        (e.prototype = Object.create(t.prototype, {
          constructor: { value: e, enumerable: !1, writable: !0, configurable: !0 }
        })))
    })
  : (En.exports = function (e, t) {
      if (t) {
        e.super_ = t
        var n = function () {}
        ;((n.prototype = t.prototype), (e.prototype = new n()), (e.prototype.constructor = e))
      }
    })
var Dn = En.exports
;((function (e) {
  var t =
      Object.getOwnPropertyDescriptors ||
      function (e) {
        for (var t = Object.keys(e), n = {}, r = 0; r < t.length; r++)
          n[t[r]] = Object.getOwnPropertyDescriptor(e, t[r])
        return n
      },
    n = /%[sdj%]/g
  ;((e.format = function (e) {
    if (!ee(e)) {
      for (var t = [], r = 0; r < arguments.length; r++) t.push(a(arguments[r]))
      return t.join(` `)
    }
    for (
      var r = 1,
        i = arguments,
        o = i.length,
        s = String(e).replace(n, function (e) {
          if (e === `%%`) return `%`
          if (r >= o) return e
          switch (e) {
            case `%s`:
              return String(i[r++])
            case `%d`:
              return Number(i[r++])
            case `%j`:
              try {
                return JSON.stringify(i[r++])
              } catch {
                return `[Circular]`
              }
            default:
              return e
          }
        }),
        c = i[r];
      r < o;
      c = i[++r]
    )
      _(c) || !S(c) ? (s += ` ` + c) : (s += ` ` + a(c))
    return s
  }),
    (e.deprecate = function (t, n) {
      if (z !== void 0 && z.noDeprecation === !0) return t
      if (z === void 0)
        return function () {
          return e.deprecate(t, n).apply(this, arguments)
        }
      var r = !1
      function i() {
        if (!r) {
          if (z.throwDeprecation) throw Error(n)
          ;(z.traceDeprecation ? console.trace(n) : console.error(n), (r = !0))
        }
        return t.apply(this, arguments)
      }
      return i
    }))
  var r = {},
    i = /^$/
  e.debuglog = function (t) {
    if (((t = t.toUpperCase()), !r[t]))
      if (i.test(t)) {
        var n = z.pid
        r[t] = function () {
          var r = e.format.apply(e, arguments)
          console.error(`%s %d: %s`, t, n, r)
        }
      } else r[t] = function () {}
    return r[t]
  }
  function a(t, n) {
    var r = { seen: [], stylize: s }
    return (
      arguments.length >= 3 && (r.depth = arguments[2]),
      arguments.length >= 4 && (r.colors = arguments[3]),
      g(n) ? (r.showHidden = n) : n && e._extend(r, n),
      te(r.showHidden) && (r.showHidden = !1),
      te(r.depth) && (r.depth = 2),
      te(r.colors) && (r.colors = !1),
      te(r.customInspect) && (r.customInspect = !0),
      r.colors && (r.stylize = o),
      l(r, t, r.depth)
    )
  }
  ;((e.inspect = a),
    (a.colors = {
      bold: [1, 22],
      italic: [3, 23],
      underline: [4, 24],
      inverse: [7, 27],
      white: [37, 39],
      grey: [90, 39],
      black: [30, 39],
      blue: [34, 39],
      cyan: [36, 39],
      green: [32, 39],
      magenta: [35, 39],
      red: [31, 39],
      yellow: [33, 39]
    }),
    (a.styles = {
      special: `cyan`,
      number: `yellow`,
      boolean: `yellow`,
      undefined: `grey`,
      null: `bold`,
      string: `green`,
      date: `magenta`,
      regexp: `red`
    }))
  function o(e, t) {
    var n = a.styles[t]
    return n ? `\x1B[` + a.colors[n][0] + `m` + e + `\x1B[` + a.colors[n][1] + `m` : e
  }
  function s(e, t) {
    return e
  }
  function c(e) {
    var t = {}
    return (
      e.forEach(function (e, n) {
        t[e] = !0
      }),
      t
    )
  }
  function l(t, n, r) {
    if (
      t.customInspect &&
      n &&
      w(n.inspect) &&
      n.inspect !== e.inspect &&
      !(n.constructor && n.constructor.prototype === n)
    ) {
      var i = n.inspect(r, t)
      return (ee(i) || (i = l(t, i, r)), i)
    }
    var a = u(t, n)
    if (a) return a
    var o = Object.keys(n),
      s = c(o)
    if (
      (t.showHidden && (o = Object.getOwnPropertyNames(n)),
      C(n) && (o.indexOf(`message`) >= 0 || o.indexOf(`description`) >= 0))
    )
      return d(n)
    if (o.length === 0) {
      if (w(n)) {
        var g = n.name ? `: ` + n.name : ``
        return t.stylize(`[Function` + g + `]`, `special`)
      }
      if (x(n)) return t.stylize(RegExp.prototype.toString.call(n), `regexp`)
      if (ne(n)) return t.stylize(Date.prototype.toString.call(n), `date`)
      if (C(n)) return d(n)
    }
    var _ = ``,
      v = !1,
      y = [`{`, `}`]
    if (
      (h(n) && ((v = !0), (y = [`[`, `]`])),
      w(n) && (_ = ` [Function` + (n.name ? `: ` + n.name : ``) + `]`),
      x(n) && (_ = ` ` + RegExp.prototype.toString.call(n)),
      ne(n) && (_ = ` ` + Date.prototype.toUTCString.call(n)),
      C(n) && (_ = ` ` + d(n)),
      o.length === 0 && (!v || n.length == 0))
    )
      return y[0] + _ + y[1]
    if (r < 0)
      return x(n)
        ? t.stylize(RegExp.prototype.toString.call(n), `regexp`)
        : t.stylize(`[Object]`, `special`)
    t.seen.push(n)
    var b = v
      ? f(t, n, r, s, o)
      : o.map(function (e) {
          return p(t, n, r, s, e, v)
        })
    return (t.seen.pop(), m(b, _, y))
  }
  function u(e, t) {
    if (te(t)) return e.stylize(`undefined`, `undefined`)
    if (ee(t)) {
      var n =
        `'` +
        JSON.stringify(t).replace(/^"|"$/g, ``).replace(/'/g, `\\'`).replace(/\\"/g, `"`) +
        `'`
      return e.stylize(n, `string`)
    }
    if (y(t)) return e.stylize(`` + t, `number`)
    if (g(t)) return e.stylize(`` + t, `boolean`)
    if (_(t)) return e.stylize(`null`, `null`)
  }
  function d(e) {
    return `[` + Error.prototype.toString.call(e) + `]`
  }
  function f(e, t, n, r, i) {
    for (var a = [], o = 0, s = t.length; o < s; ++o)
      A(t, String(o)) ? a.push(p(e, t, n, r, String(o), !0)) : a.push(``)
    return (
      i.forEach(function (i) {
        i.match(/^\d+$/) || a.push(p(e, t, n, r, i, !0))
      }),
      a
    )
  }
  function p(e, t, n, r, i, a) {
    var o,
      s,
      c = Object.getOwnPropertyDescriptor(t, i) || { value: t[i] }
    if (
      (c.get
        ? (s = c.set ? e.stylize(`[Getter/Setter]`, `special`) : e.stylize(`[Getter]`, `special`))
        : c.set && (s = e.stylize(`[Setter]`, `special`)),
      A(r, i) || (o = `[` + i + `]`),
      s ||
        (e.seen.indexOf(c.value) < 0
          ? ((s = _(n) ? l(e, c.value, null) : l(e, c.value, n - 1)),
            s.indexOf(`
`) > -1 &&
              (s = a
                ? s
                    .split(`
`)
                    .map(function (e) {
                      return `  ` + e
                    })
                    .join(`
`)
                    .slice(2)
                : `
` +
                  s
                    .split(`
`)
                    .map(function (e) {
                      return `   ` + e
                    }).join(`
`)))
          : (s = e.stylize(`[Circular]`, `special`))),
      te(o))
    ) {
      if (a && i.match(/^\d+$/)) return s
      ;((o = JSON.stringify(`` + i)),
        o.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)
          ? ((o = o.slice(1, -1)), (o = e.stylize(o, `name`)))
          : ((o = o
              .replace(/'/g, `\\'`)
              .replace(/\\"/g, `"`)
              .replace(/(^"|"$)/g, `'`)),
            (o = e.stylize(o, `string`))))
    }
    return o + `: ` + s
  }
  function m(e, t, n) {
    return e.reduce(function (e, t) {
      return (
        t.indexOf(`
`),
        e + t.replace(/\u001b\[\d\d?m/g, ``).length + 1
      )
    }, 0) > 60
      ? n[0] +
          (t === ``
            ? ``
            : t +
              `
 `) +
          ` ` +
          e.join(`,
  `) +
          ` ` +
          n[1]
      : n[0] + t + ` ` + e.join(`, `) + ` ` + n[1]
  }
  e.types = oe
  function h(e) {
    return Array.isArray(e)
  }
  e.isArray = h
  function g(e) {
    return typeof e == `boolean`
  }
  e.isBoolean = g
  function _(e) {
    return e === null
  }
  e.isNull = _
  function v(e) {
    return e == null
  }
  e.isNullOrUndefined = v
  function y(e) {
    return typeof e == `number`
  }
  e.isNumber = y
  function ee(e) {
    return typeof e == `string`
  }
  e.isString = ee
  function b(e) {
    return typeof e == `symbol`
  }
  e.isSymbol = b
  function te(e) {
    return e === void 0
  }
  e.isUndefined = te
  function x(e) {
    return S(e) && E(e) === `[object RegExp]`
  }
  ;((e.isRegExp = x), (e.types.isRegExp = x))
  function S(e) {
    return typeof e == `object` && !!e
  }
  e.isObject = S
  function ne(e) {
    return S(e) && E(e) === `[object Date]`
  }
  ;((e.isDate = ne), (e.types.isDate = ne))
  function C(e) {
    return S(e) && (E(e) === `[object Error]` || e instanceof Error)
  }
  ;((e.isError = C), (e.types.isNativeError = C))
  function w(e) {
    return typeof e == `function`
  }
  e.isFunction = w
  function T(e) {
    return (
      e === null ||
      typeof e == `boolean` ||
      typeof e == `number` ||
      typeof e == `string` ||
      typeof e == `symbol` ||
      e === void 0
    )
  }
  ;((e.isPrimitive = T), (e.isBuffer = Tn))
  function E(e) {
    return Object.prototype.toString.call(e)
  }
  function D(e) {
    return e < 10 ? `0` + e.toString(10) : e.toString(10)
  }
  var O = [`Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`]
  function k() {
    var e = new Date(),
      t = [D(e.getHours()), D(e.getMinutes()), D(e.getSeconds())].join(`:`)
    return [e.getDate(), O[e.getMonth()], t].join(` `)
  }
  ;((e.log = function () {
    console.log(`%s - %s`, k(), e.format.apply(e, arguments))
  }),
    (e.inherits = Dn),
    (e._extend = function (e, t) {
      if (!t || !S(t)) return e
      for (var n = Object.keys(t), r = n.length; r--; ) e[n[r]] = t[n[r]]
      return e
    }))
  function A(e, t) {
    return Object.prototype.hasOwnProperty.call(e, t)
  }
  var j = typeof Symbol < `u` ? Symbol(`util.promisify.custom`) : void 0
  ;((e.promisify = function (e) {
    if (typeof e != `function`) throw TypeError(`The "original" argument must be of type Function`)
    if (j && e[j]) {
      var n = e[j]
      if (typeof n != `function`)
        throw TypeError(`The "util.promisify.custom" argument must be of type Function`)
      return (
        Object.defineProperty(n, j, { value: n, enumerable: !1, writable: !1, configurable: !0 }), n
      )
    }
    function n() {
      for (
        var t,
          n,
          r = new Promise(function (e, r) {
            ;((t = e), (n = r))
          }),
          i = [],
          a = 0;
        a < arguments.length;
        a++
      )
        i.push(arguments[a])
      i.push(function (e, r) {
        e ? n(e) : t(r)
      })
      try {
        e.apply(this, i)
      } catch (e) {
        n(e)
      }
      return r
    }
    return (
      Object.setPrototypeOf(n, Object.getPrototypeOf(e)),
      j &&
        Object.defineProperty(n, j, { value: n, enumerable: !1, writable: !1, configurable: !0 }),
      Object.defineProperties(n, t(e))
    )
  }),
    (e.promisify.custom = j))
  function re(e, t) {
    if (!e) {
      var n = Error(`Promise was rejected with a falsy value`)
      ;((n.reason = e), (e = n))
    }
    return t(e)
  }
  function M(e) {
    if (typeof e != `function`) throw TypeError(`The "original" argument must be of type Function`)
    function n() {
      for (var t = [], n = 0; n < arguments.length; n++) t.push(arguments[n])
      var r = t.pop()
      if (typeof r != `function`) throw TypeError(`The last argument must be of type Function`)
      var i = this,
        a = function () {
          return r.apply(i, arguments)
        }
      e.apply(this, t).then(
        function (e) {
          z.nextTick(a.bind(null, null, e))
        },
        function (e) {
          z.nextTick(re.bind(null, e, a))
        }
      )
    }
    return (Object.setPrototypeOf(n, Object.getPrototypeOf(e)), Object.defineProperties(n, t(e)), n)
  }
  e.callbackify = M
})(B),
  (function (e) {
    var t =
      (i && i.__extends) ||
      (function () {
        var e = function (t, n) {
          return (
            (e =
              Object.setPrototypeOf ||
              ({ __proto__: [] } instanceof Array &&
                function (e, t) {
                  e.__proto__ = t
                }) ||
              function (e, t) {
                for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n])
              }),
            e(t, n)
          )
        }
        return function (t, n) {
          if (typeof n != `function` && n !== null)
            throw TypeError(`Class extends value ` + String(n) + ` is not a constructor or null`)
          e(t, n)
          function r() {
            this.constructor = t
          }
          t.prototype = n === null ? Object.create(n) : ((r.prototype = n.prototype), new r())
        }
      })()
    ;(Object.defineProperty(e, `__esModule`, { value: !0 }),
      (e.E = e.AssertionError = e.message = e.RangeError = e.TypeError = e.Error = void 0))
    var n = w,
      r = B,
      a = typeof Symbol > `u` ? `_kCode` : Symbol(`code`),
      o = {}
    function s(e) {
      return (function (e) {
        t(n, e)
        function n(t) {
          var n = [...arguments].slice(1),
            r = e.call(this, l(t, n)) || this
          return ((r.code = t), (r[a] = t), (r.name = `${e.prototype.name} [${r[a]}]`), r)
        }
        return n
      })(e)
    }
    var c = typeof globalThis < `u` ? globalThis : i
    e.AssertionError = (function (n) {
      t(i, n)
      function i(t) {
        var i = this
        if (typeof t != `object` || !t)
          throw new e.TypeError(`ERR_INVALID_ARG_TYPE`, `options`, `object`)
        return (
          (i = t.message
            ? n.call(this, t.message) || this
            : n.call(
                this,
                `${r.inspect(t.actual).slice(0, 128)} ${t.operator} ${r.inspect(t.expected).slice(0, 128)}`
              ) || this),
          (i.generatedMessage = !t.message),
          (i.name = `AssertionError [ERR_ASSERTION]`),
          (i.code = `ERR_ASSERTION`),
          (i.actual = t.actual),
          (i.expected = t.expected),
          (i.operator = t.operator),
          e.Error.captureStackTrace(i, t.stackStartFunction),
          i
        )
      }
      return i
    })(c.Error)
    function l(e, t) {
      n.strictEqual(typeof e, `string`)
      var i = o[e]
      n(i, `An invalid error message key was used: ${e}.`)
      var a
      if (typeof i == `function`) a = i
      else {
        if (((a = r.format), t === void 0 || t.length === 0)) return i
        t.unshift(i)
      }
      return String(a.apply(null, t))
    }
    e.message = l
    function u(e, t) {
      o[e] = typeof t == `function` ? t : String(t)
    }
    ;((e.E = u),
      (e.Error = s(c.Error)),
      (e.TypeError = s(c.TypeError)),
      (e.RangeError = s(c.RangeError)),
      u(`ERR_ARG_NOT_ITERABLE`, `%s must be iterable`),
      u(`ERR_ASSERTION`, `%s`),
      u(`ERR_BUFFER_OUT_OF_BOUNDS`, m),
      u(`ERR_CHILD_CLOSED_BEFORE_REPLY`, `Child closed before reply received`),
      u(`ERR_CONSOLE_WRITABLE_STREAM`, `Console expects a writable stream instance for %s`),
      u(`ERR_CPU_USAGE`, `Unable to obtain cpu usage %s`),
      u(`ERR_DNS_SET_SERVERS_FAILED`, function (e, t) {
        return `c-ares failed to set servers: "${e}" [${t}]`
      }),
      u(`ERR_FALSY_VALUE_REJECTION`, `Promise was rejected with falsy value`),
      u(`ERR_ENCODING_NOT_SUPPORTED`, function (e) {
        return `The "${e}" encoding is not supported`
      }),
      u(`ERR_ENCODING_INVALID_ENCODED_DATA`, function (e) {
        return `The encoded data was not valid for encoding ${e}`
      }),
      u(`ERR_HTTP_HEADERS_SENT`, `Cannot render headers after they are sent to the client`),
      u(`ERR_HTTP_INVALID_STATUS_CODE`, `Invalid status code: %s`),
      u(`ERR_HTTP_TRAILER_INVALID`, `Trailers are invalid with this transfer encoding`),
      u(`ERR_INDEX_OUT_OF_RANGE`, `Index out of range`),
      u(`ERR_INVALID_ARG_TYPE`, d),
      u(`ERR_INVALID_ARRAY_LENGTH`, function (e, t, r) {
        return (
          n.strictEqual(typeof r, `number`),
          `The array "${e}" (length ${r}) must be of length ${t}.`
        )
      }),
      u(`ERR_INVALID_BUFFER_SIZE`, `Buffer size must be a multiple of %s`),
      u(`ERR_INVALID_CALLBACK`, `Callback must be a function`),
      u(`ERR_INVALID_CHAR`, `Invalid character in %s`),
      u(`ERR_INVALID_CURSOR_POS`, `Cannot set cursor row without setting its column`),
      u(`ERR_INVALID_FD`, `"fd" must be a positive integer: %s`),
      u(`ERR_INVALID_FILE_URL_HOST`, `File URL host must be "localhost" or empty on %s`),
      u(`ERR_INVALID_FILE_URL_PATH`, `File URL path %s`),
      u(`ERR_INVALID_HANDLE_TYPE`, `This handle type cannot be sent`),
      u(`ERR_INVALID_IP_ADDRESS`, `Invalid IP address: %s`),
      u(`ERR_INVALID_OPT_VALUE`, function (e, t) {
        return `The value "${String(t)}" is invalid for option "${e}"`
      }),
      u(`ERR_INVALID_OPT_VALUE_ENCODING`, function (e) {
        return `The value "${String(e)}" is invalid for option "encoding"`
      }),
      u(
        `ERR_INVALID_REPL_EVAL_CONFIG`,
        `Cannot specify both "breakEvalOnSigint" and "eval" for REPL`
      ),
      u(
        `ERR_INVALID_SYNC_FORK_INPUT`,
        `Asynchronous forks do not support Buffer, Uint8Array or string input: %s`
      ),
      u(`ERR_INVALID_THIS`, `Value of "this" must be of type %s`),
      u(`ERR_INVALID_TUPLE`, `%s must be an iterable %s tuple`),
      u(`ERR_INVALID_URL`, `Invalid URL: %s`),
      u(`ERR_INVALID_URL_SCHEME`, function (e) {
        return `The URL must be ${p(e, `scheme`)}`
      }),
      u(`ERR_IPC_CHANNEL_CLOSED`, `Channel closed`),
      u(`ERR_IPC_DISCONNECTED`, `IPC channel is already disconnected`),
      u(`ERR_IPC_ONE_PIPE`, `Child process can have only one IPC pipe`),
      u(`ERR_IPC_SYNC_FORK`, `IPC cannot be used with synchronous forks`),
      u(`ERR_MISSING_ARGS`, f),
      u(`ERR_MULTIPLE_CALLBACK`, `Callback called multiple times`),
      u(`ERR_NAPI_CONS_FUNCTION`, `Constructor must be a function`),
      u(`ERR_NAPI_CONS_PROTOTYPE_OBJECT`, `Constructor.prototype must be an object`),
      u(`ERR_NO_CRYPTO`, `Node.js is not compiled with OpenSSL crypto support`),
      u(`ERR_NO_LONGER_SUPPORTED`, `%s is no longer supported`),
      u(`ERR_PARSE_HISTORY_DATA`, `Could not parse history data in %s`),
      u(`ERR_SOCKET_ALREADY_BOUND`, `Socket is already bound`),
      u(`ERR_SOCKET_BAD_PORT`, `Port should be > 0 and < 65536`),
      u(`ERR_SOCKET_BAD_TYPE`, `Bad socket type specified. Valid types are: udp4, udp6`),
      u(`ERR_SOCKET_CANNOT_SEND`, `Unable to send data`),
      u(`ERR_SOCKET_CLOSED`, `Socket is closed`),
      u(`ERR_SOCKET_DGRAM_NOT_RUNNING`, `Not running`),
      u(`ERR_STDERR_CLOSE`, `process.stderr cannot be closed`),
      u(`ERR_STDOUT_CLOSE`, `process.stdout cannot be closed`),
      u(`ERR_STREAM_WRAP`, `Stream has StringDecoder set or is in objectMode`),
      u(`ERR_TLS_CERT_ALTNAME_INVALID`, `Hostname/IP does not match certificate's altnames: %s`),
      u(`ERR_TLS_DH_PARAM_SIZE`, function (e) {
        return `DH parameter size ${e} is less than 2048`
      }),
      u(`ERR_TLS_HANDSHAKE_TIMEOUT`, `TLS handshake timeout`),
      u(`ERR_TLS_RENEGOTIATION_FAILED`, `Failed to renegotiate`),
      u(`ERR_TLS_REQUIRED_SERVER_NAME`, `"servername" is required parameter for Server.addContext`),
      u(`ERR_TLS_SESSION_ATTACK`, `TSL session renegotiation attack detected`),
      u(`ERR_TRANSFORM_ALREADY_TRANSFORMING`, `Calling transform done when still transforming`),
      u(`ERR_TRANSFORM_WITH_LENGTH_0`, `Calling transform done when writableState.length != 0`),
      u(`ERR_UNKNOWN_ENCODING`, `Unknown encoding: %s`),
      u(`ERR_UNKNOWN_SIGNAL`, `Unknown signal: %s`),
      u(`ERR_UNKNOWN_STDIN_TYPE`, `Unknown stdin file type`),
      u(`ERR_UNKNOWN_STREAM_TYPE`, `Unknown stream file type`),
      u(
        `ERR_V8BREAKITERATOR`,
        `Full ICU data not installed. See https://github.com/nodejs/node/wiki/Intl`
      ))
    function d(e, t, r) {
      n(e, `name is required`)
      var i
      t.includes(`not `) ? ((i = `must not be`), (t = t.split(`not `)[1])) : (i = `must be`)
      var a = Array.isArray(e)
        ? `The ${e
            .map(function (e) {
              return `"${e}"`
            })
            .join(`, `)} arguments ${i} ${p(t, `type`)}`
        : e.includes(` argument`)
          ? `The ${e} ${i} ${p(t, `type`)}`
          : `The "${e}" ${e.includes(`.`) ? `property` : `argument`} ${i} ${p(t, `type`)}`
      return (
        arguments.length >= 3 && (a += `. Received type ${r === null ? `null` : typeof r}`), a
      )
    }
    function f() {
      var e = [...arguments]
      n(e.length > 0, `At least one arg needs to be specified`)
      var t = `The `,
        r = e.length
      switch (
        ((e = e.map(function (e) {
          return `"${e}"`
        })),
        r)
      ) {
        case 1:
          t += `${e[0]} argument`
          break
        case 2:
          t += `${e[0]} and ${e[1]} arguments`
          break
        default:
          ;((t += e.slice(0, r - 1).join(`, `)), (t += `, and ${e[r - 1]} arguments`))
          break
      }
      return `${t} must be specified`
    }
    function p(e, t) {
      if (
        (n(e, `expected is required`),
        n(typeof t == `string`, `thing is required`),
        Array.isArray(e))
      ) {
        var r = e.length
        return (
          n(r > 0, `At least one expected value needs to be specified`),
          (e = e.map(function (e) {
            return String(e)
          })),
          r > 2
            ? `one of ${t} ${e.slice(0, r - 1).join(`, `)}, or ` + e[r - 1]
            : r === 2
              ? `one of ${t} ${e[0]} or ${e[1]}`
              : `of ${t} ${e[0]}`
        )
      } else return `of ${t} ${String(e)}`
    }
    function m(e, t) {
      return t ? `Attempt to write outside buffer bounds` : `"${e}" is outside of buffer bounds`
    }
  })(ne),
  (function (e) {
    ;(Object.defineProperty(e, `__esModule`, { value: !0 }),
      (e.strToEncoding = e.assertEncoding = e.ENCODING_UTF8 = void 0))
    var t = x,
      n = ne
    e.ENCODING_UTF8 = `utf8`
    function r(e) {
      if (e && !t.Buffer.isEncoding(e)) throw new n.TypeError(`ERR_INVALID_OPT_VALUE_ENCODING`, e)
    }
    e.assertEncoding = r
    function i(n, r) {
      return !r || r === e.ENCODING_UTF8
        ? n
        : r === `buffer`
          ? new t.Buffer(n)
          : new t.Buffer(n).toString(r)
    }
    e.strToEncoding = i
  })(te),
  Object.defineProperty(b, `__esModule`, { value: !0 }),
  (b.Dirent = void 0))
var On = c,
  kn = te,
  An = On.constants.S_IFMT,
  jn = On.constants.S_IFDIR,
  Mn = On.constants.S_IFREG,
  Nn = On.constants.S_IFBLK,
  Pn = On.constants.S_IFCHR,
  Fn = On.constants.S_IFLNK,
  In = On.constants.S_IFIFO,
  Ln = On.constants.S_IFSOCK,
  Rn = (function () {
    function e() {
      ;((this.name = ``), (this.mode = 0))
    }
    return (
      (e.build = function (t, n) {
        var r = new e(),
          i = t.getNode().mode
        return ((r.name = (0, kn.strToEncoding)(t.getName(), n)), (r.mode = i), r)
      }),
      (e.prototype._checkModeProperty = function (e) {
        return (this.mode & An) === e
      }),
      (e.prototype.isDirectory = function () {
        return this._checkModeProperty(jn)
      }),
      (e.prototype.isFile = function () {
        return this._checkModeProperty(Mn)
      }),
      (e.prototype.isBlockDevice = function () {
        return this._checkModeProperty(Nn)
      }),
      (e.prototype.isCharacterDevice = function () {
        return this._checkModeProperty(Pn)
      }),
      (e.prototype.isSymbolicLink = function () {
        return this._checkModeProperty(Fn)
      }),
      (e.prototype.isFIFO = function () {
        return this._checkModeProperty(In)
      }),
      (e.prototype.isSocket = function () {
        return this._checkModeProperty(Ln)
      }),
      e
    )
  })()
;((b.Dirent = Rn), (b.default = Rn))
var zn = {}
function Bn(e) {
  if (typeof e != `string`) throw TypeError(`Path must be a string. Received ` + JSON.stringify(e))
}
function Vn(e, t) {
  for (var n = ``, r = 0, i = -1, a = 0, o, s = 0; s <= e.length; ++s) {
    if (s < e.length) o = e.charCodeAt(s)
    else if (o === 47) break
    else o = 47
    if (o === 47) {
      if (!(i === s - 1 || a === 1))
        if (i !== s - 1 && a === 2) {
          if (
            n.length < 2 ||
            r !== 2 ||
            n.charCodeAt(n.length - 1) !== 46 ||
            n.charCodeAt(n.length - 2) !== 46
          ) {
            if (n.length > 2) {
              var c = n.lastIndexOf(`/`)
              if (c !== n.length - 1) {
                ;(c === -1
                  ? ((n = ``), (r = 0))
                  : ((n = n.slice(0, c)), (r = n.length - 1 - n.lastIndexOf(`/`))),
                  (i = s),
                  (a = 0))
                continue
              }
            } else if (n.length === 2 || n.length === 1) {
              ;((n = ``), (r = 0), (i = s), (a = 0))
              continue
            }
          }
          t && (n.length > 0 ? (n += `/..`) : (n = `..`), (r = 2))
        } else
          (n.length > 0 ? (n += `/` + e.slice(i + 1, s)) : (n = e.slice(i + 1, s)), (r = s - i - 1))
      ;((i = s), (a = 0))
    } else o === 46 && a !== -1 ? ++a : (a = -1)
  }
  return n
}
function Hn(e, t) {
  var n = t.dir || t.root,
    r = t.base || (t.name || ``) + (t.ext || ``)
  return n ? (n === t.root ? n + r : n + e + r) : r
}
var Un = {
  resolve: function () {
    for (var e = ``, t = !1, n, r = arguments.length - 1; r >= -1 && !t; r--) {
      var i
      ;(r >= 0 ? (i = arguments[r]) : (n === void 0 && (n = z.cwd()), (i = n)),
        Bn(i),
        i.length !== 0 && ((e = i + `/` + e), (t = i.charCodeAt(0) === 47)))
    }
    return ((e = Vn(e, !t)), t ? (e.length > 0 ? `/` + e : `/`) : e.length > 0 ? e : `.`)
  },
  normalize: function (e) {
    if ((Bn(e), e.length === 0)) return `.`
    var t = e.charCodeAt(0) === 47,
      n = e.charCodeAt(e.length - 1) === 47
    return (
      (e = Vn(e, !t)),
      e.length === 0 && !t && (e = `.`),
      e.length > 0 && n && (e += `/`),
      t ? `/` + e : e
    )
  },
  isAbsolute: function (e) {
    return (Bn(e), e.length > 0 && e.charCodeAt(0) === 47)
  },
  join: function () {
    if (arguments.length === 0) return `.`
    for (var e, t = 0; t < arguments.length; ++t) {
      var n = arguments[t]
      ;(Bn(n), n.length > 0 && (e === void 0 ? (e = n) : (e += `/` + n)))
    }
    return e === void 0 ? `.` : Un.normalize(e)
  },
  relative: function (e, t) {
    if ((Bn(e), Bn(t), e === t || ((e = Un.resolve(e)), (t = Un.resolve(t)), e === t))) return ``
    for (var n = 1; n < e.length && e.charCodeAt(n) === 47; ++n);
    for (var r = e.length, i = r - n, a = 1; a < t.length && t.charCodeAt(a) === 47; ++a);
    for (var o = t.length - a, s = i < o ? i : o, c = -1, l = 0; l <= s; ++l) {
      if (l === s) {
        if (o > s) {
          if (t.charCodeAt(a + l) === 47) return t.slice(a + l + 1)
          if (l === 0) return t.slice(a + l)
        } else i > s && (e.charCodeAt(n + l) === 47 ? (c = l) : l === 0 && (c = 0))
        break
      }
      var u = e.charCodeAt(n + l)
      if (u !== t.charCodeAt(a + l)) break
      u === 47 && (c = l)
    }
    var d = ``
    for (l = n + c + 1; l <= r; ++l)
      (l === r || e.charCodeAt(l) === 47) && (d.length === 0 ? (d += `..`) : (d += `/..`))
    return d.length > 0 ? d + t.slice(a + c) : ((a += c), t.charCodeAt(a) === 47 && ++a, t.slice(a))
  },
  _makeLong: function (e) {
    return e
  },
  dirname: function (e) {
    if ((Bn(e), e.length === 0)) return `.`
    for (var t = e.charCodeAt(0), n = t === 47, r = -1, i = !0, a = e.length - 1; a >= 1; --a)
      if (((t = e.charCodeAt(a)), t === 47)) {
        if (!i) {
          r = a
          break
        }
      } else i = !1
    return r === -1 ? (n ? `/` : `.`) : n && r === 1 ? `//` : e.slice(0, r)
  },
  basename: function (e, t) {
    if (t !== void 0 && typeof t != `string`) throw TypeError(`"ext" argument must be a string`)
    Bn(e)
    var n = 0,
      r = -1,
      i = !0,
      a
    if (t !== void 0 && t.length > 0 && t.length <= e.length) {
      if (t.length === e.length && t === e) return ``
      var o = t.length - 1,
        s = -1
      for (a = e.length - 1; a >= 0; --a) {
        var c = e.charCodeAt(a)
        if (c === 47) {
          if (!i) {
            n = a + 1
            break
          }
        } else
          (s === -1 && ((i = !1), (s = a + 1)),
            o >= 0 && (c === t.charCodeAt(o) ? --o === -1 && (r = a) : ((o = -1), (r = s))))
      }
      return (n === r ? (r = s) : r === -1 && (r = e.length), e.slice(n, r))
    } else {
      for (a = e.length - 1; a >= 0; --a)
        if (e.charCodeAt(a) === 47) {
          if (!i) {
            n = a + 1
            break
          }
        } else r === -1 && ((i = !1), (r = a + 1))
      return r === -1 ? `` : e.slice(n, r)
    }
  },
  extname: function (e) {
    Bn(e)
    for (var t = -1, n = 0, r = -1, i = !0, a = 0, o = e.length - 1; o >= 0; --o) {
      var s = e.charCodeAt(o)
      if (s === 47) {
        if (!i) {
          n = o + 1
          break
        }
        continue
      }
      ;(r === -1 && ((i = !1), (r = o + 1)),
        s === 46 ? (t === -1 ? (t = o) : a !== 1 && (a = 1)) : t !== -1 && (a = -1))
    }
    return t === -1 || r === -1 || a === 0 || (a === 1 && t === r - 1 && t === n + 1)
      ? ``
      : e.slice(t, r)
  },
  format: function (e) {
    if (typeof e != `object` || !e)
      throw TypeError(`The "pathObject" argument must be of type Object. Received type ` + typeof e)
    return Hn(`/`, e)
  },
  parse: function (e) {
    Bn(e)
    var t = { root: ``, dir: ``, base: ``, ext: ``, name: `` }
    if (e.length === 0) return t
    var n = e.charCodeAt(0),
      r = n === 47,
      i
    r ? ((t.root = `/`), (i = 1)) : (i = 0)
    for (var a = -1, o = 0, s = -1, c = !0, l = e.length - 1, u = 0; l >= i; --l) {
      if (((n = e.charCodeAt(l)), n === 47)) {
        if (!c) {
          o = l + 1
          break
        }
        continue
      }
      ;(s === -1 && ((c = !1), (s = l + 1)),
        n === 46 ? (a === -1 ? (a = l) : u !== 1 && (u = 1)) : a !== -1 && (u = -1))
    }
    return (
      a === -1 || s === -1 || u === 0 || (u === 1 && a === s - 1 && a === o + 1)
        ? s !== -1 &&
          (o === 0 && r ? (t.base = t.name = e.slice(1, s)) : (t.base = t.name = e.slice(o, s)))
        : (o === 0 && r
            ? ((t.name = e.slice(1, a)), (t.base = e.slice(1, s)))
            : ((t.name = e.slice(o, a)), (t.base = e.slice(o, s))),
          (t.ext = e.slice(a, s))),
      o > 0 ? (t.dir = e.slice(0, o - 1)) : r && (t.dir = `/`),
      t
    )
  },
  sep: `/`,
  delimiter: `:`,
  win32: null,
  posix: null
}
Un.posix = Un
var Wn = Un,
  Gn = {},
  Kn = {},
  qn = {}
;(Object.defineProperty(qn, `__esModule`, { value: !0 }),
  (qn.default =
    typeof setImmediate == `function`
      ? setImmediate.bind(typeof globalThis < `u` ? globalThis : i)
      : setTimeout.bind(typeof globalThis < `u` ? globalThis : i)),
  Object.defineProperty(Kn, `__esModule`, { value: !0 }),
  (Kn.createProcess = void 0))
var Jn = function () {
  if (z !== void 0) return z
  try {
    return ae
  } catch {
    return
  }
}
function Yn() {
  var e = Jn() || {}
  return (
    (e.cwd ||= function () {
      return `/`
    }),
    (e.nextTick ||= qn.default),
    (e.emitWarning ||= function (e, t) {
      console.warn(`${t}${t ? `: ` : ``}${e}`)
    }),
    (e.env ||= {}),
    e
  )
}
;((Kn.createProcess = Yn), (Kn.default = Yn()))
var Xn = { exports: {} },
  Zn = typeof Reflect == `object` ? Reflect : null,
  Qn =
    Zn && typeof Zn.apply == `function`
      ? Zn.apply
      : function (e, t, n) {
          return Function.prototype.apply.call(e, t, n)
        },
  $n =
    Zn && typeof Zn.ownKeys == `function`
      ? Zn.ownKeys
      : Object.getOwnPropertySymbols
        ? function (e) {
            return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e))
          }
        : function (e) {
            return Object.getOwnPropertyNames(e)
          }
function er(e) {
  console && console.warn && console.warn(e)
}
var tr =
  Number.isNaN ||
  function (e) {
    return e !== e
  }
function Y() {
  Y.init.call(this)
}
;((Xn.exports = Y),
  (Xn.exports.once = pr),
  (Y.EventEmitter = Y),
  (Y.prototype._events = void 0),
  (Y.prototype._eventsCount = 0),
  (Y.prototype._maxListeners = void 0))
var nr = 10
function rr(e) {
  if (typeof e != `function`)
    throw TypeError(`The "listener" argument must be of type Function. Received type ` + typeof e)
}
;(Object.defineProperty(Y, `defaultMaxListeners`, {
  enumerable: !0,
  get: function () {
    return nr
  },
  set: function (e) {
    if (typeof e != `number` || e < 0 || tr(e))
      throw RangeError(
        `The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ` +
          e +
          `.`
      )
    nr = e
  }
}),
  (Y.init = function () {
    ;((this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) &&
      ((this._events = Object.create(null)), (this._eventsCount = 0)),
      (this._maxListeners = this._maxListeners || void 0))
  }),
  (Y.prototype.setMaxListeners = function (e) {
    if (typeof e != `number` || e < 0 || tr(e))
      throw RangeError(
        `The value of "n" is out of range. It must be a non-negative number. Received ` + e + `.`
      )
    return ((this._maxListeners = e), this)
  }))
function ir(e) {
  return e._maxListeners === void 0 ? Y.defaultMaxListeners : e._maxListeners
}
;((Y.prototype.getMaxListeners = function () {
  return ir(this)
}),
  (Y.prototype.emit = function (e) {
    for (var t = [], n = 1; n < arguments.length; n++) t.push(arguments[n])
    var r = e === `error`,
      i = this._events
    if (i !== void 0) r &&= i.error === void 0
    else if (!r) return !1
    if (r) {
      var a
      if ((t.length > 0 && (a = t[0]), a instanceof Error)) throw a
      var o = Error(`Unhandled error.` + (a ? ` (` + a.message + `)` : ``))
      throw ((o.context = a), o)
    }
    var s = i[e]
    if (s === void 0) return !1
    if (typeof s == `function`) Qn(s, this, t)
    else for (var c = s.length, l = ur(s, c), n = 0; n < c; ++n) Qn(l[n], this, t)
    return !0
  }))
function ar(e, t, n, r) {
  var i, a, o
  if (
    (rr(n),
    (a = e._events),
    a === void 0
      ? ((a = e._events = Object.create(null)), (e._eventsCount = 0))
      : (a.newListener !== void 0 &&
          (e.emit(`newListener`, t, n.listener ? n.listener : n), (a = e._events)),
        (o = a[t])),
    o === void 0)
  )
    ((o = a[t] = n), ++e._eventsCount)
  else if (
    (typeof o == `function` ? (o = a[t] = r ? [n, o] : [o, n]) : r ? o.unshift(n) : o.push(n),
    (i = ir(e)),
    i > 0 && o.length > i && !o.warned)
  ) {
    o.warned = !0
    var s = Error(
      `Possible EventEmitter memory leak detected. ` +
        o.length +
        ` ` +
        String(t) +
        ` listeners added. Use emitter.setMaxListeners() to increase limit`
    )
    ;((s.name = `MaxListenersExceededWarning`),
      (s.emitter = e),
      (s.type = t),
      (s.count = o.length),
      er(s))
  }
  return e
}
;((Y.prototype.addListener = function (e, t) {
  return ar(this, e, t, !1)
}),
  (Y.prototype.on = Y.prototype.addListener),
  (Y.prototype.prependListener = function (e, t) {
    return ar(this, e, t, !0)
  }))
function or() {
  if (!this.fired)
    return (
      this.target.removeListener(this.type, this.wrapFn),
      (this.fired = !0),
      arguments.length === 0
        ? this.listener.call(this.target)
        : this.listener.apply(this.target, arguments)
    )
}
function sr(e, t, n) {
  var r = { fired: !1, wrapFn: void 0, target: e, type: t, listener: n },
    i = or.bind(r)
  return ((i.listener = n), (r.wrapFn = i), i)
}
;((Y.prototype.once = function (e, t) {
  return (rr(t), this.on(e, sr(this, e, t)), this)
}),
  (Y.prototype.prependOnceListener = function (e, t) {
    return (rr(t), this.prependListener(e, sr(this, e, t)), this)
  }),
  (Y.prototype.removeListener = function (e, t) {
    var n, r, i, a, o
    if ((rr(t), (r = this._events), r === void 0 || ((n = r[e]), n === void 0))) return this
    if (n === t || n.listener === t)
      --this._eventsCount === 0
        ? (this._events = Object.create(null))
        : (delete r[e], r.removeListener && this.emit(`removeListener`, e, n.listener || t))
    else if (typeof n != `function`) {
      for (i = -1, a = n.length - 1; a >= 0; a--)
        if (n[a] === t || n[a].listener === t) {
          ;((o = n[a].listener), (i = a))
          break
        }
      if (i < 0) return this
      ;(i === 0 ? n.shift() : dr(n, i),
        n.length === 1 && (r[e] = n[0]),
        r.removeListener !== void 0 && this.emit(`removeListener`, e, o || t))
    }
    return this
  }),
  (Y.prototype.off = Y.prototype.removeListener),
  (Y.prototype.removeAllListeners = function (e) {
    var t,
      n = this._events,
      r
    if (n === void 0) return this
    if (n.removeListener === void 0)
      return (
        arguments.length === 0
          ? ((this._events = Object.create(null)), (this._eventsCount = 0))
          : n[e] !== void 0 &&
            (--this._eventsCount === 0 ? (this._events = Object.create(null)) : delete n[e]),
        this
      )
    if (arguments.length === 0) {
      var i = Object.keys(n),
        a
      for (r = 0; r < i.length; ++r)
        ((a = i[r]), a !== `removeListener` && this.removeAllListeners(a))
      return (
        this.removeAllListeners(`removeListener`),
        (this._events = Object.create(null)),
        (this._eventsCount = 0),
        this
      )
    }
    if (((t = n[e]), typeof t == `function`)) this.removeListener(e, t)
    else if (t !== void 0) for (r = t.length - 1; r >= 0; r--) this.removeListener(e, t[r])
    return this
  }))
function cr(e, t, n) {
  var r = e._events
  if (r === void 0) return []
  var i = r[t]
  return i === void 0
    ? []
    : typeof i == `function`
      ? n
        ? [i.listener || i]
        : [i]
      : n
        ? fr(i)
        : ur(i, i.length)
}
;((Y.prototype.listeners = function (e) {
  return cr(this, e, !0)
}),
  (Y.prototype.rawListeners = function (e) {
    return cr(this, e, !1)
  }),
  (Y.listenerCount = function (e, t) {
    return typeof e.listenerCount == `function` ? e.listenerCount(t) : lr.call(e, t)
  }),
  (Y.prototype.listenerCount = lr))
function lr(e) {
  var t = this._events
  if (t !== void 0) {
    var n = t[e]
    if (typeof n == `function`) return 1
    if (n !== void 0) return n.length
  }
  return 0
}
Y.prototype.eventNames = function () {
  return this._eventsCount > 0 ? $n(this._events) : []
}
function ur(e, t) {
  for (var n = Array(t), r = 0; r < t; ++r) n[r] = e[r]
  return n
}
function dr(e, t) {
  for (; t + 1 < e.length; t++) e[t] = e[t + 1]
  e.pop()
}
function fr(e) {
  for (var t = Array(e.length), n = 0; n < t.length; ++n) t[n] = e[n].listener || e[n]
  return t
}
function pr(e, t) {
  return new Promise(function (n, r) {
    function i(n) {
      ;(e.removeListener(t, a), r(n))
    }
    function a() {
      ;(typeof e.removeListener == `function` && e.removeListener(`error`, i),
        n([].slice.call(arguments)))
    }
    ;(hr(e, t, a, { once: !0 }), t !== `error` && mr(e, i, { once: !0 }))
  })
}
function mr(e, t, n) {
  typeof e.on == `function` && hr(e, `error`, t, n)
}
function hr(e, t, n, r) {
  if (typeof e.on == `function`) r.once ? e.once(t, n) : e.on(t, n)
  else if (typeof e.addEventListener == `function`)
    e.addEventListener(t, function i(a) {
      ;(r.once && e.removeEventListener(t, i), n(a))
    })
  else
    throw TypeError(
      `The "emitter" argument must be of type EventEmitter. Received type ` + typeof e
    )
}
var gr = Xn.exports
;(function (e) {
  var t =
    (i && i.__extends) ||
    (function () {
      var e = function (t, n) {
        return (
          (e =
            Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array &&
              function (e, t) {
                e.__proto__ = t
              }) ||
            function (e, t) {
              for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n])
            }),
          e(t, n)
        )
      }
      return function (t, n) {
        if (typeof n != `function` && n !== null)
          throw TypeError(`Class extends value ` + String(n) + ` is not a constructor or null`)
        e(t, n)
        function r() {
          this.constructor = t
        }
        t.prototype = n === null ? Object.create(n) : ((r.prototype = n.prototype), new r())
      }
    })()
  ;(Object.defineProperty(e, `__esModule`, { value: !0 }),
    (e.File = e.Link = e.Node = e.SEP = void 0))
  var n = Kn,
    r = x,
    a = c,
    o = gr,
    l = s,
    u = a.constants.S_IFMT,
    d = a.constants.S_IFDIR,
    f = a.constants.S_IFREG,
    p = a.constants.S_IFLNK,
    m = a.constants.O_APPEND,
    h = function () {
      return n.default.getuid?.call(n.default) ?? 0
    },
    g = function () {
      return n.default.getgid?.call(n.default) ?? 0
    }
  ;((e.SEP = `/`),
    (e.Node = (function (e) {
      t(n, e)
      function n(t, n) {
        n === void 0 && (n = 438)
        var r = e.call(this) || this
        return (
          (r._uid = h()),
          (r._gid = g()),
          (r._atime = new Date()),
          (r._mtime = new Date()),
          (r._ctime = new Date()),
          (r._perm = 438),
          (r.mode = f),
          (r._nlink = 1),
          (r._perm = n),
          (r.mode |= n),
          (r.ino = t),
          r
        )
      }
      return (
        Object.defineProperty(n.prototype, `ctime`, {
          get: function () {
            return this._ctime
          },
          set: function (e) {
            this._ctime = e
          },
          enumerable: !1,
          configurable: !0
        }),
        Object.defineProperty(n.prototype, `uid`, {
          get: function () {
            return this._uid
          },
          set: function (e) {
            ;((this._uid = e), (this.ctime = new Date()))
          },
          enumerable: !1,
          configurable: !0
        }),
        Object.defineProperty(n.prototype, `gid`, {
          get: function () {
            return this._gid
          },
          set: function (e) {
            ;((this._gid = e), (this.ctime = new Date()))
          },
          enumerable: !1,
          configurable: !0
        }),
        Object.defineProperty(n.prototype, `atime`, {
          get: function () {
            return this._atime
          },
          set: function (e) {
            ;((this._atime = e), (this.ctime = new Date()))
          },
          enumerable: !1,
          configurable: !0
        }),
        Object.defineProperty(n.prototype, `mtime`, {
          get: function () {
            return this._mtime
          },
          set: function (e) {
            ;((this._mtime = e), (this.ctime = new Date()))
          },
          enumerable: !1,
          configurable: !0
        }),
        Object.defineProperty(n.prototype, `perm`, {
          get: function () {
            return this._perm
          },
          set: function (e) {
            ;((this._perm = e), (this.ctime = new Date()))
          },
          enumerable: !1,
          configurable: !0
        }),
        Object.defineProperty(n.prototype, `nlink`, {
          get: function () {
            return this._nlink
          },
          set: function (e) {
            ;((this._nlink = e), (this.ctime = new Date()))
          },
          enumerable: !1,
          configurable: !0
        }),
        (n.prototype.getString = function (e) {
          return (
            e === void 0 && (e = `utf8`), (this.atime = new Date()), this.getBuffer().toString(e)
          )
        }),
        (n.prototype.setString = function (e) {
          ;((this.buf = (0, r.bufferFrom)(e, `utf8`)), this.touch())
        }),
        (n.prototype.getBuffer = function () {
          return (
            (this.atime = new Date()),
            this.buf || this.setBuffer((0, r.bufferAllocUnsafe)(0)),
            (0, r.bufferFrom)(this.buf)
          )
        }),
        (n.prototype.setBuffer = function (e) {
          ;((this.buf = (0, r.bufferFrom)(e)), this.touch())
        }),
        (n.prototype.getSize = function () {
          return this.buf ? this.buf.length : 0
        }),
        (n.prototype.setModeProperty = function (e) {
          this.mode = (this.mode & ~u) | e
        }),
        (n.prototype.setIsFile = function () {
          this.setModeProperty(f)
        }),
        (n.prototype.setIsDirectory = function () {
          this.setModeProperty(d)
        }),
        (n.prototype.setIsSymlink = function () {
          this.setModeProperty(p)
        }),
        (n.prototype.isFile = function () {
          return (this.mode & u) === f
        }),
        (n.prototype.isDirectory = function () {
          return (this.mode & u) === d
        }),
        (n.prototype.isSymlink = function () {
          return (this.mode & u) === p
        }),
        (n.prototype.makeSymlink = function (e) {
          ;((this.symlink = e), this.setIsSymlink())
        }),
        (n.prototype.write = function (e, t, n, i) {
          if (
            (t === void 0 && (t = 0),
            n === void 0 && (n = e.length),
            i === void 0 && (i = 0),
            (this.buf ||= (0, r.bufferAllocUnsafe)(0)),
            i + n > this.buf.length)
          ) {
            var a = (0, r.bufferAllocUnsafe)(i + n)
            ;(this.buf.copy(a, 0, 0, this.buf.length), (this.buf = a))
          }
          return (e.copy(this.buf, i, t, t + n), this.touch(), n)
        }),
        (n.prototype.read = function (e, t, n, i) {
          ;(t === void 0 && (t = 0),
            n === void 0 && (n = e.byteLength),
            i === void 0 && (i = 0),
            (this.atime = new Date()),
            (this.buf ||= (0, r.bufferAllocUnsafe)(0)))
          var a = n
          return (
            a > e.byteLength && (a = e.byteLength),
            a + i > this.buf.length && (a = this.buf.length - i),
            this.buf.copy(e, t, i, i + a),
            a
          )
        }),
        (n.prototype.truncate = function (e) {
          if ((e === void 0 && (e = 0), !e)) this.buf = (0, r.bufferAllocUnsafe)(0)
          else if (((this.buf ||= (0, r.bufferAllocUnsafe)(0)), e <= this.buf.length))
            this.buf = this.buf.slice(0, e)
          else {
            var t = (0, r.bufferAllocUnsafe)(e)
            ;(this.buf.copy(t), t.fill(0, this.buf.length), (this.buf = t))
          }
          this.touch()
        }),
        (n.prototype.chmod = function (e) {
          ;((this.perm = e), (this.mode = (this.mode & -512) | e), this.touch())
        }),
        (n.prototype.chown = function (e, t) {
          ;((this.uid = e), (this.gid = t), this.touch())
        }),
        (n.prototype.touch = function () {
          ;((this.mtime = new Date()), this.emit(`change`, this))
        }),
        (n.prototype.canRead = function (e, t) {
          return (
            e === void 0 && (e = h()),
            t === void 0 && (t = g()),
            !!(
              this.perm & 4 ||
              (t === this.gid && this.perm & 32) ||
              (e === this.uid && this.perm & 256)
            )
          )
        }),
        (n.prototype.canWrite = function (e, t) {
          return (
            e === void 0 && (e = h()),
            t === void 0 && (t = g()),
            !!(
              this.perm & 2 ||
              (t === this.gid && this.perm & 16) ||
              (e === this.uid && this.perm & 128)
            )
          )
        }),
        (n.prototype.del = function () {
          this.emit(`delete`, this)
        }),
        (n.prototype.toJSON = function () {
          return {
            ino: this.ino,
            uid: this.uid,
            gid: this.gid,
            atime: this.atime.getTime(),
            mtime: this.mtime.getTime(),
            ctime: this.ctime.getTime(),
            perm: this.perm,
            mode: this.mode,
            nlink: this.nlink,
            symlink: this.symlink,
            data: this.getString()
          }
        }),
        n
      )
    })(o.EventEmitter)),
    (e.Link = (function (n) {
      t(r, n)
      function r(e, t, r) {
        var i = n.call(this) || this
        return (
          (i.children = {}),
          (i._steps = []),
          (i.ino = 0),
          (i.length = 0),
          (i.vol = e),
          (i.parent = t),
          (i.name = r),
          i.syncSteps(),
          i
        )
      }
      return (
        Object.defineProperty(r.prototype, `steps`, {
          get: function () {
            return this._steps
          },
          set: function (e) {
            this._steps = e
            for (var t = 0, n = Object.entries(this.children); t < n.length; t++) {
              var r = n[t],
                i = r[0],
                a = r[1]
              i === `.` || i === `..` || a?.syncSteps()
            }
          },
          enumerable: !1,
          configurable: !0
        }),
        (r.prototype.setNode = function (e) {
          ;((this.node = e), (this.ino = e.ino))
        }),
        (r.prototype.getNode = function () {
          return this.node
        }),
        (r.prototype.createChild = function (e, t) {
          t === void 0 && (t = this.vol.createNode())
          var n = new r(this.vol, this, e)
          return (
            n.setNode(t),
            t.isDirectory() && ((n.children[`.`] = n), n.getNode().nlink++),
            this.setChild(e, n),
            n
          )
        }),
        (r.prototype.setChild = function (e, t) {
          return (
            t === void 0 && (t = new r(this.vol, this, e)),
            (this.children[e] = t),
            (t.parent = this),
            this.length++,
            t.getNode().isDirectory() && ((t.children[`..`] = this), this.getNode().nlink++),
            (this.getNode().mtime = new Date()),
            this.emit(`child:add`, t, this),
            t
          )
        }),
        (r.prototype.deleteChild = function (e) {
          ;(e.getNode().isDirectory() && (delete e.children[`..`], this.getNode().nlink--),
            delete this.children[e.getName()],
            this.length--,
            (this.getNode().mtime = new Date()),
            this.emit(`child:delete`, e, this))
        }),
        (r.prototype.getChild = function (e) {
          if (((this.getNode().mtime = new Date()), Object.hasOwnProperty.call(this.children, e)))
            return this.children[e]
        }),
        (r.prototype.getPath = function () {
          return this.steps.join(e.SEP)
        }),
        (r.prototype.getName = function () {
          return this.steps[this.steps.length - 1]
        }),
        (r.prototype.walk = function (e, t, n) {
          if ((t === void 0 && (t = e.length), n === void 0 && (n = 0), n >= e.length || n >= t))
            return this
          var r = e[n],
            i = this.getChild(r)
          return i ? i.walk(e, t, n + 1) : null
        }),
        (r.prototype.toJSON = function () {
          return { steps: this.steps, ino: this.ino, children: Object.keys(this.children) }
        }),
        (r.prototype.syncSteps = function () {
          this.steps = this.parent ? this.parent.steps.concat([this.name]) : [this.name]
        }),
        r
      )
    })(o.EventEmitter)),
    (e.File = (function () {
      function e(e, t, n, r) {
        ;((this.position = 0), (this.link = e), (this.node = t), (this.flags = n), (this.fd = r))
      }
      return (
        (e.prototype.getString = function (e) {
          return this.node.getString()
        }),
        (e.prototype.setString = function (e) {
          this.node.setString(e)
        }),
        (e.prototype.getBuffer = function () {
          return this.node.getBuffer()
        }),
        (e.prototype.setBuffer = function (e) {
          this.node.setBuffer(e)
        }),
        (e.prototype.getSize = function () {
          return this.node.getSize()
        }),
        (e.prototype.truncate = function (e) {
          this.node.truncate(e)
        }),
        (e.prototype.seekTo = function (e) {
          this.position = e
        }),
        (e.prototype.stats = function () {
          return l.default.build(this.node)
        }),
        (e.prototype.write = function (e, t, n, r) {
          ;(t === void 0 && (t = 0),
            n === void 0 && (n = e.length),
            typeof r != `number` && (r = this.position),
            this.flags & m && (r = this.getSize()))
          var i = this.node.write(e, t, n, r)
          return ((this.position = r + i), i)
        }),
        (e.prototype.read = function (e, t, n, r) {
          ;(t === void 0 && (t = 0),
            n === void 0 && (n = e.byteLength),
            typeof r != `number` && (r = this.position))
          var i = this.node.read(e, t, n, r)
          return ((this.position = r + i), i)
        }),
        (e.prototype.chmod = function (e) {
          this.node.chmod(e)
        }),
        (e.prototype.chown = function (e, t) {
          this.node.chown(e, t)
        }),
        e
      )
    })()))
})(Gn)
var _r = {}
Object.defineProperty(_r, `__esModule`, { value: !0 })
function vr(e, t, n) {
  var r = setTimeout.apply(typeof globalThis < `u` ? globalThis : i, arguments)
  return (r && typeof r == `object` && typeof r.unref == `function` && r.unref(), r)
}
_r.default = vr
var yr = { exports: {} },
  br = { exports: {} },
  X = {
    ArrayIsArray(e) {
      return Array.isArray(e)
    },
    ArrayPrototypeIncludes(e, t) {
      return e.includes(t)
    },
    ArrayPrototypeIndexOf(e, t) {
      return e.indexOf(t)
    },
    ArrayPrototypeJoin(e, t) {
      return e.join(t)
    },
    ArrayPrototypeMap(e, t) {
      return e.map(t)
    },
    ArrayPrototypePop(e, t) {
      return e.pop(t)
    },
    ArrayPrototypePush(e, t) {
      return e.push(t)
    },
    ArrayPrototypeSlice(e, t, n) {
      return e.slice(t, n)
    },
    Error,
    FunctionPrototypeCall(e, t, ...n) {
      return e.call(t, ...n)
    },
    FunctionPrototypeSymbolHasInstance(e, t) {
      return Function.prototype[Symbol.hasInstance].call(e, t)
    },
    MathFloor: Math.floor,
    Number,
    NumberIsInteger: Number.isInteger,
    NumberIsNaN: Number.isNaN,
    NumberMAX_SAFE_INTEGER: 2 ** 53 - 1,
    NumberMIN_SAFE_INTEGER: -(2 ** 53 - 1),
    NumberParseInt: Number.parseInt,
    ObjectDefineProperties(e, t) {
      return Object.defineProperties(e, t)
    },
    ObjectDefineProperty(e, t, n) {
      return Object.defineProperty(e, t, n)
    },
    ObjectGetOwnPropertyDescriptor(e, t) {
      return Object.getOwnPropertyDescriptor(e, t)
    },
    ObjectKeys(e) {
      return Object.keys(e)
    },
    ObjectSetPrototypeOf(e, t) {
      return Object.setPrototypeOf(e, t)
    },
    Promise,
    PromisePrototypeCatch(e, t) {
      return e.catch(t)
    },
    PromisePrototypeThen(e, t, n) {
      return e.then(t, n)
    },
    PromiseReject(e) {
      return Promise.reject(e)
    },
    PromiseResolve(e) {
      return Promise.resolve(e)
    },
    ReflectApply: Reflect.apply,
    RegExpPrototypeTest(e, t) {
      return e.test(t)
    },
    SafeSet: Set,
    String,
    StringPrototypeSlice(e, t, n) {
      return e.slice(t, n)
    },
    StringPrototypeToLowerCase(e) {
      return e.toLowerCase()
    },
    StringPrototypeToUpperCase(e) {
      return e.toUpperCase()
    },
    StringPrototypeTrim(e) {
      return e.trim()
    },
    Symbol,
    SymbolFor: Symbol.for,
    SymbolAsyncIterator: Symbol.asyncIterator,
    SymbolHasInstance: Symbol.hasInstance,
    SymbolIterator: Symbol.iterator,
    SymbolDispose: Symbol.dispose || Symbol(`Symbol.dispose`),
    SymbolAsyncDispose: Symbol.asyncDispose || Symbol(`Symbol.asyncDispose`),
    TypedArrayPrototypeSet(e, t, n) {
      return e.set(t, n)
    },
    Boolean,
    Uint8Array
  },
  xr = { exports: {} },
  Sr = { exports: {} },
  Cr
function wr() {
  if (Cr) return Sr.exports
  Cr = 1
  let { AbortController: e, AbortSignal: t } =
    typeof self < `u` ? self : typeof window < `u` ? window : void 0
  return ((Sr.exports = e), (Sr.exports.AbortSignal = t), (Sr.exports.default = e), Sr.exports)
}
;(function (e) {
  let t = S,
    { kResistStopPropagation: n, SymbolDispose: r } = X,
    i = globalThis.AbortSignal || wr().AbortSignal,
    a = globalThis.AbortController || wr().AbortController,
    o = Object.getPrototypeOf(async function () {}).constructor,
    s = globalThis.Blob || t.Blob,
    c =
      s === void 0
        ? function (e) {
            return !1
          }
        : function (e) {
            return e instanceof s
          },
    l = (e, t) => {
      if (e !== void 0 && (typeof e != `object` || !e || !(`aborted` in e)))
        throw new ERR_INVALID_ARG_TYPE(t, `AbortSignal`, e)
    },
    u = (e, t) => {
      if (typeof e != `function`) throw new ERR_INVALID_ARG_TYPE(t, `Function`, e)
    }
  class d extends Error {
    constructor(e) {
      if (!Array.isArray(e)) throw TypeError(`Expected input to be an Array, got ${typeof e}`)
      let t = ``
      for (let n = 0; n < e.length; n++) t += `    ${e[n].stack}\n`
      ;(super(t), (this.name = `AggregateError`), (this.errors = e))
    }
  }
  ;((e.exports = {
    AggregateError: d,
    kEmptyObject: Object.freeze({}),
    once(e) {
      let t = !1
      return function (...n) {
        t || ((t = !0), e.apply(this, n))
      }
    },
    createDeferredPromise: function () {
      let e, t
      return {
        promise: new Promise((n, r) => {
          ;((e = n), (t = r))
        }),
        resolve: e,
        reject: t
      }
    },
    promisify(e) {
      return new Promise((t, n) => {
        e((e, ...r) => (e ? n(e) : t(...r)))
      })
    },
    debuglog() {
      return function () {}
    },
    format(e, ...t) {
      return e.replace(/%([sdifj])/g, function (...[e, n]) {
        let r = t.shift()
        return n === `f`
          ? r.toFixed(6)
          : n === `j`
            ? JSON.stringify(r)
            : n === `s` && typeof r == `object`
              ? `${r.constructor === Object ? `` : r.constructor.name} {}`.trim()
              : r.toString()
      })
    },
    inspect(e) {
      switch (typeof e) {
        case `string`:
          if (e.includes(`'`))
            if (e.includes(`"`)) {
              if (!e.includes('`') && !e.includes('${')) return `\`${e}\``
            } else return `"${e}"`
          return `'${e}'`
        case `number`:
          return isNaN(e) ? `NaN` : Object.is(e, -0) ? String(e) : e
        case `bigint`:
          return `${String(e)}n`
        case `boolean`:
        case `undefined`:
          return String(e)
        case `object`:
          return `{}`
      }
    },
    types: {
      isAsyncFunction(e) {
        return e instanceof o
      },
      isArrayBufferView(e) {
        return ArrayBuffer.isView(e)
      }
    },
    isBlob: c,
    deprecate(e, t) {
      return e
    },
    addAbortListener:
      gr.addAbortListener ||
      function (e, t) {
        if (e === void 0) throw new ERR_INVALID_ARG_TYPE(`signal`, `AbortSignal`, e)
        ;(l(e, `signal`), u(t, `listener`))
        let i
        return (
          e.aborted
            ? queueMicrotask(() => t())
            : (e.addEventListener(`abort`, t, { __proto__: null, once: !0, [n]: !0 }),
              (i = () => {
                e.removeEventListener(`abort`, t)
              })),
          {
            __proto__: null,
            [r]() {
              var e
              ;(e = i) == null || e()
            }
          }
        )
      },
    AbortSignalAny:
      i.any ||
      function (e) {
        if (e.length === 1) return e[0]
        let t = new a(),
          n = () => t.abort()
        return (
          e.forEach(e => {
            ;(l(e, `signals`), e.addEventListener(`abort`, n, { once: !0 }))
          }),
          t.signal.addEventListener(
            `abort`,
            () => {
              e.forEach(e => e.removeEventListener(`abort`, n))
            },
            { once: !0 }
          ),
          t.signal
        )
      }
  }),
    (e.exports.promisify.custom = Symbol.for(`nodejs.util.promisify.custom`)))
})(xr)
var Tr = xr.exports,
  Er = {},
  { format: Dr, inspect: Or, AggregateError: kr } = Tr,
  Ar = globalThis.AggregateError || kr,
  jr = Symbol(`kIsNodeError`),
  Mr = [
    `string`,
    `function`,
    `number`,
    `object`,
    `Function`,
    `Object`,
    `boolean`,
    `bigint`,
    `symbol`
  ],
  Nr = /^([A-Z][a-z0-9]*)+$/,
  Pr = `__node_internal_`,
  Fr = {}
function Ir(e, t) {
  if (!e) throw new Fr.ERR_INTERNAL_ASSERTION(t)
}
function Lr(e) {
  let t = ``,
    n = e.length,
    r = e[0] === `-` ? 1 : 0
  for (; n >= r + 4; n -= 3) t = `_${e.slice(n - 3, n)}${t}`
  return `${e.slice(0, n)}${t}`
}
function Rr(e, t, n) {
  if (typeof t == `function`)
    return (
      Ir(
        t.length <= n.length,
        `Code: ${e}; The provided arguments length (${n.length}) does not match the required ones (${t.length}).`
      ),
      t(...n)
    )
  let r = (t.match(/%[dfijoOs]/g) || []).length
  return (
    Ir(
      r === n.length,
      `Code: ${e}; The provided arguments length (${n.length}) does not match the required ones (${r}).`
    ),
    n.length === 0 ? t : Dr(t, ...n)
  )
}
function Z(e, t, n) {
  n ||= Error
  class r extends n {
    constructor(...n) {
      super(Rr(e, t, n))
    }
    toString() {
      return `${this.name} [${e}]: ${this.message}`
    }
  }
  ;(Object.defineProperties(r.prototype, {
    name: { value: n.name, writable: !0, enumerable: !1, configurable: !0 },
    toString: {
      value() {
        return `${this.name} [${e}]: ${this.message}`
      },
      writable: !0,
      enumerable: !1,
      configurable: !0
    }
  }),
    (r.prototype.code = e),
    (r.prototype[jr] = !0),
    (Fr[e] = r))
}
function zr(e) {
  let t = Pr + e.name
  return (Object.defineProperty(e, `name`, { value: t }), e)
}
function Br(e, t) {
  if (e && t && e !== t) {
    if (Array.isArray(t.errors)) return (t.errors.push(e), t)
    let n = new Ar([t, e], t.message)
    return ((n.code = t.code), n)
  }
  return e || t
}
var Vr = class extends Error {
  constructor(e = `The operation was aborted`, t = void 0) {
    if (t !== void 0 && typeof t != `object`)
      throw new Fr.ERR_INVALID_ARG_TYPE(`options`, `Object`, t)
    ;(super(e, t), (this.code = `ABORT_ERR`), (this.name = `AbortError`))
  }
}
;(Z(`ERR_ASSERTION`, `%s`, Error),
  Z(
    `ERR_INVALID_ARG_TYPE`,
    (e, t, n) => {
      ;(Ir(typeof e == `string`, `'name' must be a string`), Array.isArray(t) || (t = [t]))
      let r = `The `
      ;(e.endsWith(` argument`)
        ? (r += `${e} `)
        : (r += `"${e}" ${e.includes(`.`) ? `property` : `argument`} `),
        (r += `must be `))
      let i = [],
        a = [],
        o = []
      for (let e of t)
        (Ir(typeof e == `string`, `All expected entries have to be of type string`),
          Mr.includes(e)
            ? i.push(e.toLowerCase())
            : Nr.test(e)
              ? a.push(e)
              : (Ir(e !== `object`, `The value "object" should be written as "Object"`), o.push(e)))
      if (a.length > 0) {
        let e = i.indexOf(`object`)
        e !== -1 && (i.splice(i, e, 1), a.push(`Object`))
      }
      if (i.length > 0) {
        switch (i.length) {
          case 1:
            r += `of type ${i[0]}`
            break
          case 2:
            r += `one of type ${i[0]} or ${i[1]}`
            break
          default: {
            let e = i.pop()
            r += `one of type ${i.join(`, `)}, or ${e}`
          }
        }
        ;(a.length > 0 || o.length > 0) && (r += ` or `)
      }
      if (a.length > 0) {
        switch (a.length) {
          case 1:
            r += `an instance of ${a[0]}`
            break
          case 2:
            r += `an instance of ${a[0]} or ${a[1]}`
            break
          default: {
            let e = a.pop()
            r += `an instance of ${a.join(`, `)}, or ${e}`
          }
        }
        o.length > 0 && (r += ` or `)
      }
      switch (o.length) {
        case 0:
          break
        case 1:
          ;(o[0].toLowerCase() !== o[0] && (r += `an `), (r += `${o[0]}`))
          break
        case 2:
          r += `one of ${o[0]} or ${o[1]}`
          break
        default: {
          let e = o.pop()
          r += `one of ${o.join(`, `)}, or ${e}`
        }
      }
      if (n == null) r += `. Received ${n}`
      else if (typeof n == `function` && n.name) r += `. Received function ${n.name}`
      else if (typeof n == `object`) {
        var s
        if ((s = n.constructor) != null && s.name)
          r += `. Received an instance of ${n.constructor.name}`
        else {
          let e = Or(n, { depth: -1 })
          r += `. Received ${e}`
        }
      } else {
        let e = Or(n, { colors: !1 })
        ;(e.length > 25 && (e = `${e.slice(0, 25)}...`),
          (r += `. Received type ${typeof n} (${e})`))
      }
      return r
    },
    TypeError
  ),
  Z(
    `ERR_INVALID_ARG_VALUE`,
    (e, t, n = `is invalid`) => {
      let r = Or(t)
      return (
        r.length > 128 && (r = r.slice(0, 128) + `...`),
        `The ${e.includes(`.`) ? `property` : `argument`} '${e}' ${n}. Received ${r}`
      )
    },
    TypeError
  ),
  Z(
    `ERR_INVALID_RETURN_VALUE`,
    (e, t, n) => {
      var r
      return `Expected ${e} to be returned from the "${t}" function but got ${n != null && (r = n.constructor) != null && r.name ? `instance of ${n.constructor.name}` : `type ${typeof n}`}.`
    },
    TypeError
  ),
  Z(
    `ERR_MISSING_ARGS`,
    (...e) => {
      Ir(e.length > 0, `At least one arg needs to be specified`)
      let t,
        n = e.length
      switch (((e = (Array.isArray(e) ? e : [e]).map(e => `"${e}"`).join(` or `)), n)) {
        case 1:
          t += `The ${e[0]} argument`
          break
        case 2:
          t += `The ${e[0]} and ${e[1]} arguments`
          break
        default:
          {
            let n = e.pop()
            t += `The ${e.join(`, `)}, and ${n} arguments`
          }
          break
      }
      return `${t} must be specified`
    },
    TypeError
  ),
  Z(
    `ERR_OUT_OF_RANGE`,
    (e, t, n) => {
      Ir(t, `Missing "range" argument`)
      let r
      return (
        Number.isInteger(n) && Math.abs(n) > 2 ** 32
          ? (r = Lr(String(n)))
          : typeof n == `bigint`
            ? ((r = String(n)), (n > 2n ** 32n || n < -(2n ** 32n)) && (r = Lr(r)), (r += `n`))
            : (r = Or(n)),
        `The value of "${e}" is out of range. It must be ${t}. Received ${r}`
      )
    },
    RangeError
  ),
  Z(`ERR_MULTIPLE_CALLBACK`, `Callback called multiple times`, Error),
  Z(`ERR_METHOD_NOT_IMPLEMENTED`, `The %s method is not implemented`, Error),
  Z(`ERR_STREAM_ALREADY_FINISHED`, `Cannot call %s after a stream was finished`, Error),
  Z(`ERR_STREAM_CANNOT_PIPE`, `Cannot pipe, not readable`, Error),
  Z(`ERR_STREAM_DESTROYED`, `Cannot call %s after a stream was destroyed`, Error),
  Z(`ERR_STREAM_NULL_VALUES`, `May not write null values to stream`, TypeError),
  Z(`ERR_STREAM_PREMATURE_CLOSE`, `Premature close`, Error),
  Z(`ERR_STREAM_PUSH_AFTER_EOF`, `stream.push() after EOF`, Error),
  Z(`ERR_STREAM_UNSHIFT_AFTER_END_EVENT`, `stream.unshift() after end event`, Error),
  Z(`ERR_STREAM_WRITE_AFTER_END`, `write after end`, Error),
  Z(`ERR_UNKNOWN_ENCODING`, `Unknown encoding: %s`, TypeError))
var Hr = { AbortError: Vr, aggregateTwoErrors: zr(Br), hideStackFrames: zr, codes: Fr },
  {
    ArrayIsArray: Ur,
    ArrayPrototypeIncludes: Wr,
    ArrayPrototypeJoin: Gr,
    ArrayPrototypeMap: Kr,
    NumberIsInteger: qr,
    NumberIsNaN: Jr,
    NumberMAX_SAFE_INTEGER: Yr,
    NumberMIN_SAFE_INTEGER: Xr,
    NumberParseInt: Zr,
    ObjectPrototypeHasOwnProperty: Qr,
    RegExpPrototypeExec: $r,
    String: ei,
    StringPrototypeToUpperCase: ti,
    StringPrototypeTrim: ni
  } = X,
  {
    hideStackFrames: ri,
    codes: {
      ERR_SOCKET_BAD_PORT: ii,
      ERR_INVALID_ARG_TYPE: Q,
      ERR_INVALID_ARG_VALUE: ai,
      ERR_OUT_OF_RANGE: oi,
      ERR_UNKNOWN_SIGNAL: si
    }
  } = Hr,
  { normalizeEncoding: ci } = Tr,
  { isAsyncFunction: li, isArrayBufferView: ui } = Tr.types,
  di = {}
function fi(e) {
  return e === (e | 0)
}
function pi(e) {
  return e === e >>> 0
}
var mi = /^[0-7]+$/,
  hi = `must be a 32-bit unsigned integer or an octal string`
function gi(e, t, n) {
  if ((e === void 0 && (e = n), typeof e == `string`)) {
    if ($r(mi, e) === null) throw new ai(t, e, hi)
    e = Zr(e, 8)
  }
  return (yi(e, t), e)
}
var _i = ri((e, t, n = Xr, r = Yr) => {
    if (typeof e != `number`) throw new Q(t, `number`, e)
    if (!qr(e)) throw new oi(t, `an integer`, e)
    if (e < n || e > r) throw new oi(t, `>= ${n} && <= ${r}`, e)
  }),
  vi = ri((e, t, n = -2147483648, r = 2147483647) => {
    if (typeof e != `number`) throw new Q(t, `number`, e)
    if (!qr(e)) throw new oi(t, `an integer`, e)
    if (e < n || e > r) throw new oi(t, `>= ${n} && <= ${r}`, e)
  }),
  yi = ri((e, t, n = !1) => {
    if (typeof e != `number`) throw new Q(t, `number`, e)
    if (!qr(e)) throw new oi(t, `an integer`, e)
    let r = n ? 1 : 0,
      i = 4294967295
    if (e < r || e > i) throw new oi(t, `>= ${r} && <= ${i}`, e)
  })
function bi(e, t) {
  if (typeof e != `string`) throw new Q(t, `string`, e)
}
function xi(e, t, n = void 0, r) {
  if (typeof e != `number`) throw new Q(t, `number`, e)
  if ((n != null && e < n) || (r != null && e > r) || ((n != null || r != null) && Jr(e)))
    throw new oi(
      t,
      `${n == null ? `` : `>= ${n}`}${n != null && r != null ? ` && ` : ``}${r == null ? `` : `<= ${r}`}`,
      e
    )
}
var Si = ri((e, t, n) => {
  if (!Wr(n, e))
    throw new ai(
      t,
      e,
      `must be one of: ` +
        Gr(
          Kr(n, e => (typeof e == `string` ? `'${e}'` : ei(e))),
          `, `
        )
    )
})
function Ci(e, t) {
  if (typeof e != `boolean`) throw new Q(t, `boolean`, e)
}
function wi(e, t, n) {
  return e == null || !Qr(e, t) ? n : e[t]
}
var Ti = ri((e, t, n = null) => {
    let r = wi(n, `allowArray`, !1),
      i = wi(n, `allowFunction`, !1)
    if (
      (!wi(n, `nullable`, !1) && e === null) ||
      (!r && Ur(e)) ||
      (typeof e != `object` && (!i || typeof e != `function`))
    )
      throw new Q(t, `Object`, e)
  }),
  Ei = ri((e, t) => {
    if (e != null && typeof e != `object` && typeof e != `function`)
      throw new Q(t, `a dictionary`, e)
  }),
  Di = ri((e, t, n = 0) => {
    if (!Ur(e)) throw new Q(t, `Array`, e)
    if (e.length < n) throw new ai(t, e, `must be longer than ${n}`)
  })
function Oi(e, t) {
  Di(e, t)
  for (let n = 0; n < e.length; n++) bi(e[n], `${t}[${n}]`)
}
function ki(e, t) {
  Di(e, t)
  for (let n = 0; n < e.length; n++) Ci(e[n], `${t}[${n}]`)
}
function Ai(e, t) {
  Di(e, t)
  for (let n = 0; n < e.length; n++) {
    let r = e[n],
      i = `${t}[${n}]`
    if (r == null) throw new Q(i, `AbortSignal`, r)
    Fi(r, i)
  }
}
function ji(e, t = `signal`) {
  if ((bi(e, t), di[e] === void 0))
    throw di[ti(e)] === void 0 ? new si(e) : new si(e + ` (signals must use all capital letters)`)
}
var Mi = ri((e, t = `buffer`) => {
  if (!ui(e)) throw new Q(t, [`Buffer`, `TypedArray`, `DataView`], e)
})
function Ni(e, t) {
  let n = ci(t),
    r = e.length
  if (n === `hex` && r % 2 != 0) throw new ai(`encoding`, t, `is invalid for data of length ${r}`)
}
function Pi(e, t = `Port`, n = !0) {
  if (
    (typeof e != `number` && typeof e != `string`) ||
    (typeof e == `string` && ni(e).length === 0) ||
    +e != e >>> 0 ||
    e > 65535 ||
    (e === 0 && !n)
  )
    throw new ii(t, e, n)
  return e | 0
}
var Fi = ri((e, t) => {
    if (e !== void 0 && (typeof e != `object` || !e || !(`aborted` in e)))
      throw new Q(t, `AbortSignal`, e)
  }),
  Ii = ri((e, t) => {
    if (typeof e != `function`) throw new Q(t, `Function`, e)
  }),
  Li = ri((e, t) => {
    if (typeof e != `function` || li(e)) throw new Q(t, `Function`, e)
  }),
  Ri = ri((e, t) => {
    if (e !== void 0) throw new Q(t, `undefined`, e)
  })
function zi(e, t, n) {
  if (!Wr(n, e)) throw new Q(t, `('${Gr(n, `|`)}')`, e)
}
var Bi = /^(?:<[^>]*>)(?:\s*;\s*[^;"\s]+(?:=(")?[^;"\s]*\1)?)*$/
function Vi(e, t) {
  if (e === void 0 || !$r(Bi, e))
    throw new ai(
      t,
      e,
      `must be an array or string of format "</styles.css>; rel=preload; as=style"`
    )
}
function Hi(e) {
  if (typeof e == `string`) return (Vi(e, `hints`), e)
  if (Ur(e)) {
    let t = e.length,
      n = ``
    if (t === 0) return n
    for (let r = 0; r < t; r++) {
      let i = e[r]
      ;(Vi(i, `hints`), (n += i), r !== t - 1 && (n += `, `))
    }
    return n
  }
  throw new ai(
    `hints`,
    e,
    `must be an array or string of format "</styles.css>; rel=preload; as=style"`
  )
}
var Ui = {
    isInt32: fi,
    isUint32: pi,
    parseFileMode: gi,
    validateArray: Di,
    validateStringArray: Oi,
    validateBooleanArray: ki,
    validateAbortSignalArray: Ai,
    validateBoolean: Ci,
    validateBuffer: Mi,
    validateDictionary: Ei,
    validateEncoding: Ni,
    validateFunction: Ii,
    validateInt32: vi,
    validateInteger: _i,
    validateNumber: xi,
    validateObject: Ti,
    validateOneOf: Si,
    validatePlainFunction: Li,
    validatePort: Pi,
    validateSignalName: ji,
    validateString: bi,
    validateUint32: yi,
    validateUndefined: Ri,
    validateUnion: zi,
    validateAbortSignal: Fi,
    validateLinkHeaderValue: Hi
  },
  Wi = { exports: {} },
  { SymbolAsyncIterator: Gi, SymbolIterator: Ki, SymbolFor: qi } = X,
  Ji = qi(`nodejs.stream.destroyed`),
  Yi = qi(`nodejs.stream.errored`),
  Xi = qi(`nodejs.stream.readable`),
  Zi = qi(`nodejs.stream.writable`),
  Qi = qi(`nodejs.stream.disturbed`),
  $i = qi(`nodejs.webstream.isClosedPromise`),
  ea = qi(`nodejs.webstream.controllerErrorFunction`)
function ta(e, t = !1) {
  return !!(
    e &&
    typeof e.pipe == `function` &&
    typeof e.on == `function` &&
    (!t || (typeof e.pause == `function` && typeof e.resume == `function`)) &&
    (!e._writableState || e._readableState?.readable !== !1) &&
    (!e._writableState || e._readableState)
  )
}
function na(e) {
  return !!(
    e &&
    typeof e.write == `function` &&
    typeof e.on == `function` &&
    (!e._readableState || e._writableState?.writable !== !1)
  )
}
function ra(e) {
  return !!(
    e &&
    typeof e.pipe == `function` &&
    e._readableState &&
    typeof e.on == `function` &&
    typeof e.write == `function`
  )
}
function ia(e) {
  return (
    e &&
    (e._readableState ||
      e._writableState ||
      (typeof e.write == `function` && typeof e.on == `function`) ||
      (typeof e.pipe == `function` && typeof e.on == `function`))
  )
}
function aa(e) {
  return !!(
    e &&
    !ia(e) &&
    typeof e.pipeThrough == `function` &&
    typeof e.getReader == `function` &&
    typeof e.cancel == `function`
  )
}
function oa(e) {
  return !!(e && !ia(e) && typeof e.getWriter == `function` && typeof e.abort == `function`)
}
function sa(e) {
  return !!(e && !ia(e) && typeof e.readable == `object` && typeof e.writable == `object`)
}
function ca(e) {
  return aa(e) || oa(e) || sa(e)
}
function la(e, t) {
  return e == null
    ? !1
    : t === !0
      ? typeof e[Gi] == `function`
      : t === !1
        ? typeof e[Ki] == `function`
        : typeof e[Gi] == `function` || typeof e[Ki] == `function`
}
function ua(e) {
  if (!ia(e)) return null
  let t = e._writableState,
    n = e._readableState,
    r = t || n
  return !!(e.destroyed || e[Ji] || (r != null && r.destroyed))
}
function da(e) {
  if (!na(e)) return null
  if (e.writableEnded === !0) return !0
  let t = e._writableState
  return t != null && t.errored ? !1 : typeof t?.ended == `boolean` ? t.ended : null
}
function fa(e, t) {
  if (!na(e)) return null
  if (e.writableFinished === !0) return !0
  let n = e._writableState
  return n != null && n.errored
    ? !1
    : typeof n?.finished == `boolean`
      ? !!(n.finished || (t === !1 && n.ended === !0 && n.length === 0))
      : null
}
function pa(e) {
  if (!ta(e)) return null
  if (e.readableEnded === !0) return !0
  let t = e._readableState
  return !t || t.errored ? !1 : typeof t?.ended == `boolean` ? t.ended : null
}
function ma(e, t) {
  if (!ta(e)) return null
  let n = e._readableState
  return n != null && n.errored
    ? !1
    : typeof n?.endEmitted == `boolean`
      ? !!(n.endEmitted || (t === !1 && n.ended === !0 && n.length === 0))
      : null
}
function ha(e) {
  return e && e[Xi] != null
    ? e[Xi]
    : typeof e?.readable == `boolean`
      ? ua(e)
        ? !1
        : ta(e) && e.readable && !ma(e)
      : null
}
function ga(e) {
  return e && e[Zi] != null
    ? e[Zi]
    : typeof e?.writable == `boolean`
      ? ua(e)
        ? !1
        : na(e) && e.writable && !da(e)
      : null
}
function _a(e, t) {
  return ia(e)
    ? ua(e)
      ? !0
      : !((t?.readable !== !1 && ha(e)) || (t?.writable !== !1 && ga(e)))
    : null
}
function va(e) {
  return ia(e)
    ? e.writableErrored
      ? e.writableErrored
      : (e._writableState?.errored ?? null)
    : null
}
function ya(e) {
  return ia(e)
    ? e.readableErrored
      ? e.readableErrored
      : (e._readableState?.errored ?? null)
    : null
}
function ba(e) {
  if (!ia(e)) return null
  if (typeof e.closed == `boolean`) return e.closed
  let t = e._writableState,
    n = e._readableState
  return typeof t?.closed == `boolean` || typeof n?.closed == `boolean`
    ? t?.closed || n?.closed
    : typeof e._closed == `boolean` && xa(e)
      ? e._closed
      : null
}
function xa(e) {
  return (
    typeof e._closed == `boolean` &&
    typeof e._defaultKeepAlive == `boolean` &&
    typeof e._removedConnection == `boolean` &&
    typeof e._removedContLen == `boolean`
  )
}
function Sa(e) {
  return typeof e._sent100 == `boolean` && xa(e)
}
function Ca(e) {
  return (
    typeof e._consuming == `boolean` &&
    typeof e._dumped == `boolean` &&
    e.req?.upgradeOrConnect === void 0
  )
}
function wa(e) {
  if (!ia(e)) return null
  let t = e._writableState,
    n = e._readableState,
    r = t || n
  return (!r && Sa(e)) || !!(r && r.autoDestroy && r.emitClose && r.closed === !1)
}
function Ta(e) {
  return !!(e && (e[Qi] ?? (e.readableDidRead || e.readableAborted)))
}
function Ea(e) {
  return !!(
    e &&
    (e[Yi] ??
      e.readableErrored ??
      e.writableErrored ??
      e._readableState?.errorEmitted ??
      e._writableState?.errorEmitted ??
      e._readableState?.errored ??
      e._writableState?.errored)
  )
}
var Da = {
    isDestroyed: ua,
    kIsDestroyed: Ji,
    isDisturbed: Ta,
    kIsDisturbed: Qi,
    isErrored: Ea,
    kIsErrored: Yi,
    isReadable: ha,
    kIsReadable: Xi,
    kIsClosedPromise: $i,
    kControllerErrorFunction: ea,
    kIsWritable: Zi,
    isClosed: ba,
    isDuplexNodeStream: ra,
    isFinished: _a,
    isIterable: la,
    isReadableNodeStream: ta,
    isReadableStream: aa,
    isReadableEnded: pa,
    isReadableFinished: ma,
    isReadableErrored: ya,
    isNodeStream: ia,
    isWebStream: ca,
    isWritable: ga,
    isWritableNodeStream: na,
    isWritableStream: oa,
    isWritableEnded: da,
    isWritableFinished: fa,
    isWritableErrored: va,
    isServerRequest: Ca,
    isServerResponse: Sa,
    willEmitClose: wa,
    isTransformStream: sa
  },
  Oa = ae,
  { AbortError: ka, codes: Aa } = Hr,
  { ERR_INVALID_ARG_TYPE: ja, ERR_STREAM_PREMATURE_CLOSE: Ma } = Aa,
  { kEmptyObject: Na, once: Pa } = Tr,
  { validateAbortSignal: Fa, validateFunction: Ia, validateObject: La, validateBoolean: Ra } = Ui,
  { Promise: za, PromisePrototypeThen: Ba, SymbolDispose: Va } = X,
  {
    isClosed: Ha,
    isReadable: Ua,
    isReadableNodeStream: Wa,
    isReadableStream: Ga,
    isReadableFinished: Ka,
    isReadableErrored: qa,
    isWritable: Ja,
    isWritableNodeStream: Ya,
    isWritableStream: Xa,
    isWritableFinished: Za,
    isWritableErrored: Qa,
    isNodeStream: $a,
    willEmitClose: eo,
    kIsClosedPromise: to
  } = Da,
  no
function ro(e) {
  return e.setHeader && typeof e.abort == `function`
}
var io = () => {}
function ao(e, t, n) {
  if (
    (arguments.length === 2 ? ((n = t), (t = Na)) : t == null ? (t = Na) : La(t, `options`),
    Ia(n, `callback`),
    Fa(t.signal, `options.signal`),
    (n = Pa(n)),
    Ga(e) || Xa(e))
  )
    return oo(e, t, n)
  if (!$a(e)) throw new ja(`stream`, [`ReadableStream`, `WritableStream`, `Stream`], e)
  let r = t.readable ?? Wa(e),
    i = t.writable ?? Ya(e),
    a = e._writableState,
    o = e._readableState,
    s = () => {
      e.writable || u()
    },
    c = eo(e) && Wa(e) === r && Ya(e) === i,
    l = Za(e, !1),
    u = () => {
      ;((l = !0), e.destroyed && (c = !1), !(c && (!e.readable || r)) && (!r || d) && n.call(e))
    },
    d = Ka(e, !1),
    f = () => {
      ;((d = !0), e.destroyed && (c = !1), !(c && (!e.writable || i)) && (!i || l) && n.call(e))
    },
    p = t => {
      n.call(e, t)
    },
    m = Ha(e),
    h = () => {
      m = !0
      let t = Qa(e) || qa(e)
      if (t && typeof t != `boolean`) return n.call(e, t)
      if ((r && !d && Wa(e, !0) && !Ka(e, !1)) || (i && !l && !Za(e, !1)))
        return n.call(e, new Ma())
      n.call(e)
    },
    g = () => {
      m = !0
      let t = Qa(e) || qa(e)
      if (t && typeof t != `boolean`) return n.call(e, t)
      n.call(e)
    },
    _ = () => {
      e.req.on(`finish`, u)
    }
  ;(ro(e)
    ? (e.on(`complete`, u), c || e.on(`abort`, h), e.req ? _() : e.on(`request`, _))
    : i && !a && (e.on(`end`, s), e.on(`close`, s)),
    !c && typeof e.aborted == `boolean` && e.on(`aborted`, h),
    e.on(`end`, f),
    e.on(`finish`, u),
    t.error !== !1 && e.on(`error`, p),
    e.on(`close`, h),
    m
      ? Oa.nextTick(h)
      : (a != null && a.errorEmitted) || (o != null && o.errorEmitted)
        ? c || Oa.nextTick(g)
        : ((!r && (!c || Ua(e)) && (l || Ja(e) === !1)) ||
            (!i && (!c || Ja(e)) && (d || Ua(e) === !1)) ||
            (o && e.req && e.aborted)) &&
          Oa.nextTick(g))
  let v = () => {
    ;((n = io),
      e.removeListener(`aborted`, h),
      e.removeListener(`complete`, u),
      e.removeListener(`abort`, h),
      e.removeListener(`request`, _),
      e.req && e.req.removeListener(`finish`, u),
      e.removeListener(`end`, s),
      e.removeListener(`close`, s),
      e.removeListener(`finish`, u),
      e.removeListener(`end`, f),
      e.removeListener(`error`, p),
      e.removeListener(`close`, h))
  }
  if (t.signal && !m) {
    let r = () => {
      let r = n
      ;(v(), r.call(e, new ka(void 0, { cause: t.signal.reason })))
    }
    if (t.signal.aborted) Oa.nextTick(r)
    else {
      no ||= Tr.addAbortListener
      let i = no(t.signal, r),
        a = n
      n = Pa((...t) => {
        ;(i[Va](), a.apply(e, t))
      })
    }
  }
  return v
}
function oo(e, t, n) {
  let r = !1,
    i = io
  if (t.signal)
    if (
      ((i = () => {
        ;((r = !0), n.call(e, new ka(void 0, { cause: t.signal.reason })))
      }),
      t.signal.aborted)
    )
      Oa.nextTick(i)
    else {
      no ||= Tr.addAbortListener
      let r = no(t.signal, i),
        a = n
      n = Pa((...t) => {
        ;(r[Va](), a.apply(e, t))
      })
    }
  let a = (...t) => {
    r || Oa.nextTick(() => n.apply(e, t))
  }
  return (Ba(e[to].promise, a, a), io)
}
function so(e, t) {
  var n
  let r = !1
  return (
    t === null && (t = Na),
    (n = t) != null && n.cleanup && (Ra(t.cleanup, `cleanup`), (r = t.cleanup)),
    new za((n, i) => {
      let a = ao(e, t, e => {
        ;(r && a(), e ? i(e) : n())
      })
    })
  )
}
;((Wi.exports = ao), (Wi.exports.finished = so))
var co = Wi.exports,
  lo = ae,
  {
    aggregateTwoErrors: uo,
    codes: { ERR_MULTIPLE_CALLBACK: fo },
    AbortError: po
  } = Hr,
  { Symbol: mo } = X,
  { kIsDestroyed: ho, isDestroyed: go, isFinished: _o, isServerRequest: vo } = Da,
  yo = mo(`kDestroy`),
  bo = mo(`kConstruct`)
function xo(e, t, n) {
  e && (e.stack, t && !t.errored && (t.errored = e), n && !n.errored && (n.errored = e))
}
function So(e, t) {
  let n = this._readableState,
    r = this._writableState,
    i = r || n
  return (r != null && r.destroyed) || (n != null && n.destroyed)
    ? (typeof t == `function` && t(), this)
    : (xo(e, r, n),
      r && (r.destroyed = !0),
      n && (n.destroyed = !0),
      i.constructed
        ? Co(this, e, t)
        : this.once(yo, function (n) {
            Co(this, uo(n, e), t)
          }),
      this)
}
function Co(e, t, n) {
  let r = !1
  function i(t) {
    if (r) return
    r = !0
    let i = e._readableState,
      a = e._writableState
    ;(xo(t, a, i),
      a && (a.closed = !0),
      i && (i.closed = !0),
      typeof n == `function` && n(t),
      t ? lo.nextTick(wo, e, t) : lo.nextTick(To, e))
  }
  try {
    e._destroy(t || null, i)
  } catch (e) {
    i(e)
  }
}
function wo(e, t) {
  ;(Eo(e, t), To(e))
}
function To(e) {
  let t = e._readableState,
    n = e._writableState
  ;(n && (n.closeEmitted = !0),
    t && (t.closeEmitted = !0),
    ((n != null && n.emitClose) || (t != null && t.emitClose)) && e.emit(`close`))
}
function Eo(e, t) {
  let n = e._readableState,
    r = e._writableState
  ;(r != null && r.errorEmitted) ||
    (n != null && n.errorEmitted) ||
    (r && (r.errorEmitted = !0), n && (n.errorEmitted = !0), e.emit(`error`, t))
}
function Do() {
  let e = this._readableState,
    t = this._writableState
  ;(e &&
    ((e.constructed = !0),
    (e.closed = !1),
    (e.closeEmitted = !1),
    (e.destroyed = !1),
    (e.errored = null),
    (e.errorEmitted = !1),
    (e.reading = !1),
    (e.ended = e.readable === !1),
    (e.endEmitted = e.readable === !1)),
    t &&
      ((t.constructed = !0),
      (t.destroyed = !1),
      (t.closed = !1),
      (t.closeEmitted = !1),
      (t.errored = null),
      (t.errorEmitted = !1),
      (t.finalCalled = !1),
      (t.prefinished = !1),
      (t.ended = t.writable === !1),
      (t.ending = t.writable === !1),
      (t.finished = t.writable === !1)))
}
function Oo(e, t, n) {
  let r = e._readableState,
    i = e._writableState
  if ((i != null && i.destroyed) || (r != null && r.destroyed)) return this
  ;(r != null && r.autoDestroy) || (i != null && i.autoDestroy)
    ? e.destroy(t)
    : t &&
      (t.stack,
      i && !i.errored && (i.errored = t),
      r && !r.errored && (r.errored = t),
      n ? lo.nextTick(Eo, e, t) : Eo(e, t))
}
function ko(e, t) {
  if (typeof e._construct != `function`) return
  let n = e._readableState,
    r = e._writableState
  ;(n && (n.constructed = !1),
    r && (r.constructed = !1),
    e.once(bo, t),
    !(e.listenerCount(bo) > 1) && lo.nextTick(Ao, e))
}
function Ao(e) {
  let t = !1
  function n(n) {
    if (t) {
      Oo(e, n ?? new fo())
      return
    }
    t = !0
    let r = e._readableState,
      i = e._writableState,
      a = i || r
    ;(r && (r.constructed = !0),
      i && (i.constructed = !0),
      a.destroyed ? e.emit(yo, n) : n ? Oo(e, n, !0) : lo.nextTick(jo, e))
  }
  try {
    e._construct(e => {
      lo.nextTick(n, e)
    })
  } catch (e) {
    lo.nextTick(n, e)
  }
}
function jo(e) {
  e.emit(bo)
}
function Mo(e) {
  return e?.setHeader && typeof e.abort == `function`
}
function No(e) {
  e.emit(`close`)
}
function Po(e, t) {
  ;(e.emit(`error`, t), lo.nextTick(No, e))
}
function Fo(e, t) {
  !e ||
    go(e) ||
    (!t && !_o(e) && (t = new po()),
    vo(e)
      ? ((e.socket = null), e.destroy(t))
      : Mo(e)
        ? e.abort()
        : Mo(e.req)
          ? e.req.abort()
          : typeof e.destroy == `function`
            ? e.destroy(t)
            : typeof e.close == `function`
              ? e.close()
              : t
                ? lo.nextTick(Po, e, t)
                : lo.nextTick(No, e),
    e.destroyed || (e[ho] = !0))
}
var Io = { construct: ko, destroyer: Fo, destroy: So, undestroy: Do, errorOrDestroy: Oo },
  { ArrayIsArray: Lo, ObjectSetPrototypeOf: Ro } = X,
  { EventEmitter: zo } = gr
function Bo(e) {
  zo.call(this, e)
}
;(Ro(Bo.prototype, zo.prototype),
  Ro(Bo, zo),
  (Bo.prototype.pipe = function (e, t) {
    let n = this
    function r(t) {
      e.writable && e.write(t) === !1 && n.pause && n.pause()
    }
    n.on(`data`, r)
    function i() {
      n.readable && n.resume && n.resume()
    }
    ;(e.on(`drain`, i), !e._isStdio && (!t || t.end !== !1) && (n.on(`end`, o), n.on(`close`, s)))
    let a = !1
    function o() {
      a || ((a = !0), e.end())
    }
    function s() {
      a || ((a = !0), typeof e.destroy == `function` && e.destroy())
    }
    function c(e) {
      ;(l(), zo.listenerCount(this, `error`) === 0 && this.emit(`error`, e))
    }
    ;(Vo(n, `error`, c), Vo(e, `error`, c))
    function l() {
      ;(n.removeListener(`data`, r),
        e.removeListener(`drain`, i),
        n.removeListener(`end`, o),
        n.removeListener(`close`, s),
        n.removeListener(`error`, c),
        e.removeListener(`error`, c),
        n.removeListener(`end`, l),
        n.removeListener(`close`, l),
        e.removeListener(`close`, l))
    }
    return (n.on(`end`, l), n.on(`close`, l), e.on(`close`, l), e.emit(`pipe`, n), e)
  }))
function Vo(e, t, n) {
  if (typeof e.prependListener == `function`) return e.prependListener(t, n)
  !e._events || !e._events[t]
    ? e.on(t, n)
    : Lo(e._events[t])
      ? e._events[t].unshift(n)
      : (e._events[t] = [n, e._events[t]])
}
var Ho = { Stream: Bo, prependListener: Vo },
  Uo = { exports: {} }
;(function (e) {
  let { SymbolDispose: t } = X,
    { AbortError: n, codes: r } = Hr,
    { isNodeStream: i, isWebStream: a, kControllerErrorFunction: o } = Da,
    s = co,
    { ERR_INVALID_ARG_TYPE: c } = r,
    l,
    u = (e, t) => {
      if (typeof e != `object` || !(`aborted` in e)) throw new c(t, `AbortSignal`, e)
    }
  ;((e.exports.addAbortSignal = function (t, n) {
    if ((u(t, `signal`), !i(n) && !a(n)))
      throw new c(`stream`, [`ReadableStream`, `WritableStream`, `Stream`], n)
    return e.exports.addAbortSignalNoValidate(t, n)
  }),
    (e.exports.addAbortSignalNoValidate = function (e, r) {
      if (typeof e != `object` || !(`aborted` in e)) return r
      let a = i(r)
        ? () => {
            r.destroy(new n(void 0, { cause: e.reason }))
          }
        : () => {
            r[o](new n(void 0, { cause: e.reason }))
          }
      return (e.aborted ? a() : ((l ||= Tr.addAbortListener), s(r, l(e, a)[t])), r)
    }))
})(Uo)
var Wo = Uo.exports,
  { StringPrototypeSlice: Go, SymbolIterator: Ko, TypedArrayPrototypeSet: qo, Uint8Array: Jo } = X,
  { Buffer: Yo } = S,
  { inspect: Xo } = Tr,
  Zo = class {
    constructor() {
      ;((this.head = null), (this.tail = null), (this.length = 0))
    }
    push(e) {
      let t = { data: e, next: null }
      ;(this.length > 0 ? (this.tail.next = t) : (this.head = t), (this.tail = t), ++this.length)
    }
    unshift(e) {
      let t = { data: e, next: this.head }
      ;(this.length === 0 && (this.tail = t), (this.head = t), ++this.length)
    }
    shift() {
      if (this.length === 0) return
      let e = this.head.data
      return (
        this.length === 1 ? (this.head = this.tail = null) : (this.head = this.head.next),
        --this.length,
        e
      )
    }
    clear() {
      ;((this.head = this.tail = null), (this.length = 0))
    }
    join(e) {
      if (this.length === 0) return ``
      let t = this.head,
        n = `` + t.data
      for (; (t = t.next) !== null; ) n += e + t.data
      return n
    }
    concat(e) {
      if (this.length === 0) return Yo.alloc(0)
      let t = Yo.allocUnsafe(e >>> 0),
        n = this.head,
        r = 0
      for (; n; ) (qo(t, n.data, r), (r += n.data.length), (n = n.next))
      return t
    }
    consume(e, t) {
      let n = this.head.data
      if (e < n.length) {
        let t = n.slice(0, e)
        return ((this.head.data = n.slice(e)), t)
      }
      return e === n.length ? this.shift() : t ? this._getString(e) : this._getBuffer(e)
    }
    first() {
      return this.head.data
    }
    *[Ko]() {
      for (let e = this.head; e; e = e.next) yield e.data
    }
    _getString(e) {
      let t = ``,
        n = this.head,
        r = 0
      do {
        let i = n.data
        if (e > i.length) ((t += i), (e -= i.length))
        else {
          e === i.length
            ? ((t += i), ++r, n.next ? (this.head = n.next) : (this.head = this.tail = null))
            : ((t += Go(i, 0, e)), (this.head = n), (n.data = Go(i, e)))
          break
        }
        ++r
      } while ((n = n.next) !== null)
      return ((this.length -= r), t)
    }
    _getBuffer(e) {
      let t = Yo.allocUnsafe(e),
        n = e,
        r = this.head,
        i = 0
      do {
        let a = r.data
        if (e > a.length) (qo(t, a, n - e), (e -= a.length))
        else {
          e === a.length
            ? (qo(t, a, n - e), ++i, r.next ? (this.head = r.next) : (this.head = this.tail = null))
            : (qo(t, new Jo(a.buffer, a.byteOffset, e), n - e),
              (this.head = r),
              (r.data = a.slice(e)))
          break
        }
        ++i
      } while ((r = r.next) !== null)
      return ((this.length -= i), t)
    }
    [Symbol.for(`nodejs.util.inspect.custom`)](e, t) {
      return Xo(this, { ...t, depth: 0, customInspect: !1 })
    }
  },
  { MathFloor: Qo, NumberIsInteger: $o } = X,
  { validateInteger: es } = Ui,
  { ERR_INVALID_ARG_VALUE: ts } = Hr.codes,
  ns = 16 * 1024,
  rs = 16
function is(e, t, n) {
  return e.highWaterMark == null ? (t ? e[n] : null) : e.highWaterMark
}
function as(e) {
  return e ? rs : ns
}
function os(e, t) {
  ;(es(t, `value`, 0), e ? (rs = t) : (ns = t))
}
function ss(e, t, n, r) {
  let i = is(t, r, n)
  if (i != null) {
    if (!$o(i) || i < 0) throw new ts(r ? `options.${n}` : `options.highWaterMark`, i)
    return Qo(i)
  }
  return as(e.objectMode)
}
var cs = { getHighWaterMark: ss, getDefaultHighWaterMark: as, setDefaultHighWaterMark: os },
  ls = {},
  us = { exports: {} }
;(function (e, t) {
  var n = S,
    r = n.Buffer
  function i(e, t) {
    for (var n in e) t[n] = e[n]
  }
  r.from && r.alloc && r.allocUnsafe && r.allocUnsafeSlow
    ? (e.exports = n)
    : (i(n, t), (t.Buffer = a))
  function a(e, t, n) {
    return r(e, t, n)
  }
  ;((a.prototype = Object.create(r.prototype)),
    i(r, a),
    (a.from = function (e, t, n) {
      if (typeof e == `number`) throw TypeError(`Argument must not be a number`)
      return r(e, t, n)
    }),
    (a.alloc = function (e, t, n) {
      if (typeof e != `number`) throw TypeError(`Argument must be a number`)
      var i = r(e)
      return (t === void 0 ? i.fill(0) : typeof n == `string` ? i.fill(t, n) : i.fill(t), i)
    }),
    (a.allocUnsafe = function (e) {
      if (typeof e != `number`) throw TypeError(`Argument must be a number`)
      return r(e)
    }),
    (a.allocUnsafeSlow = function (e) {
      if (typeof e != `number`) throw TypeError(`Argument must be a number`)
      return n.SlowBuffer(e)
    }))
})(us, us.exports)
var ds = us.exports.Buffer,
  fs =
    ds.isEncoding ||
    function (e) {
      switch (((e = `` + e), e && e.toLowerCase())) {
        case `hex`:
        case `utf8`:
        case `utf-8`:
        case `ascii`:
        case `binary`:
        case `base64`:
        case `ucs2`:
        case `ucs-2`:
        case `utf16le`:
        case `utf-16le`:
        case `raw`:
          return !0
        default:
          return !1
      }
    }
function ps(e) {
  if (!e) return `utf8`
  for (var t; ; )
    switch (e) {
      case `utf8`:
      case `utf-8`:
        return `utf8`
      case `ucs2`:
      case `ucs-2`:
      case `utf16le`:
      case `utf-16le`:
        return `utf16le`
      case `latin1`:
      case `binary`:
        return `latin1`
      case `base64`:
      case `ascii`:
      case `hex`:
        return e
      default:
        if (t) return
        ;((e = (`` + e).toLowerCase()), (t = !0))
    }
}
function ms(e) {
  var t = ps(e)
  if (typeof t != `string` && (ds.isEncoding === fs || !fs(e)))
    throw Error(`Unknown encoding: ` + e)
  return t || e
}
ls.StringDecoder = hs
function hs(e) {
  this.encoding = ms(e)
  var t
  switch (this.encoding) {
    case `utf16le`:
      ;((this.text = Ss), (this.end = Cs), (t = 4))
      break
    case `utf8`:
      ;((this.fillLast = ys), (t = 4))
      break
    case `base64`:
      ;((this.text = ws), (this.end = Ts), (t = 3))
      break
    default:
      ;((this.write = Es), (this.end = Ds))
      return
  }
  ;((this.lastNeed = 0), (this.lastTotal = 0), (this.lastChar = ds.allocUnsafe(t)))
}
;((hs.prototype.write = function (e) {
  if (e.length === 0) return ``
  var t, n
  if (this.lastNeed) {
    if (((t = this.fillLast(e)), t === void 0)) return ``
    ;((n = this.lastNeed), (this.lastNeed = 0))
  } else n = 0
  return n < e.length ? (t ? t + this.text(e, n) : this.text(e, n)) : t || ``
}),
  (hs.prototype.end = xs),
  (hs.prototype.text = bs),
  (hs.prototype.fillLast = function (e) {
    if (this.lastNeed <= e.length)
      return (
        e.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed),
        this.lastChar.toString(this.encoding, 0, this.lastTotal)
      )
    ;(e.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, e.length),
      (this.lastNeed -= e.length))
  }))
function gs(e) {
  return e <= 127
    ? 0
    : e >> 5 == 6
      ? 2
      : e >> 4 == 14
        ? 3
        : e >> 3 == 30
          ? 4
          : e >> 6 == 2
            ? -1
            : -2
}
function _s(e, t, n) {
  var r = t.length - 1
  if (r < n) return 0
  var i = gs(t[r])
  return i >= 0
    ? (i > 0 && (e.lastNeed = i - 1), i)
    : --r < n || i === -2
      ? 0
      : ((i = gs(t[r])),
        i >= 0
          ? (i > 0 && (e.lastNeed = i - 2), i)
          : --r < n || i === -2
            ? 0
            : ((i = gs(t[r])),
              i >= 0 ? (i > 0 && (i === 2 ? (i = 0) : (e.lastNeed = i - 3)), i) : 0))
}
function vs(e, t, n) {
  if ((t[0] & 192) != 128) return ((e.lastNeed = 0), `�`)
  if (e.lastNeed > 1 && t.length > 1) {
    if ((t[1] & 192) != 128) return ((e.lastNeed = 1), `�`)
    if (e.lastNeed > 2 && t.length > 2 && (t[2] & 192) != 128) return ((e.lastNeed = 2), `�`)
  }
}
function ys(e) {
  var t = this.lastTotal - this.lastNeed,
    n = vs(this, e)
  if (n !== void 0) return n
  if (this.lastNeed <= e.length)
    return (
      e.copy(this.lastChar, t, 0, this.lastNeed),
      this.lastChar.toString(this.encoding, 0, this.lastTotal)
    )
  ;(e.copy(this.lastChar, t, 0, e.length), (this.lastNeed -= e.length))
}
function bs(e, t) {
  var n = _s(this, e, t)
  if (!this.lastNeed) return e.toString(`utf8`, t)
  this.lastTotal = n
  var r = e.length - (n - this.lastNeed)
  return (e.copy(this.lastChar, 0, r), e.toString(`utf8`, t, r))
}
function xs(e) {
  var t = e && e.length ? this.write(e) : ``
  return this.lastNeed ? t + `�` : t
}
function Ss(e, t) {
  if ((e.length - t) % 2 == 0) {
    var n = e.toString(`utf16le`, t)
    if (n) {
      var r = n.charCodeAt(n.length - 1)
      if (r >= 55296 && r <= 56319)
        return (
          (this.lastNeed = 2),
          (this.lastTotal = 4),
          (this.lastChar[0] = e[e.length - 2]),
          (this.lastChar[1] = e[e.length - 1]),
          n.slice(0, -1)
        )
    }
    return n
  }
  return (
    (this.lastNeed = 1),
    (this.lastTotal = 2),
    (this.lastChar[0] = e[e.length - 1]),
    e.toString(`utf16le`, t, e.length - 1)
  )
}
function Cs(e) {
  var t = e && e.length ? this.write(e) : ``
  if (this.lastNeed) {
    var n = this.lastTotal - this.lastNeed
    return t + this.lastChar.toString(`utf16le`, 0, n)
  }
  return t
}
function ws(e, t) {
  var n = (e.length - t) % 3
  return n === 0
    ? e.toString(`base64`, t)
    : ((this.lastNeed = 3 - n),
      (this.lastTotal = 3),
      n === 1
        ? (this.lastChar[0] = e[e.length - 1])
        : ((this.lastChar[0] = e[e.length - 2]), (this.lastChar[1] = e[e.length - 1])),
      e.toString(`base64`, t, e.length - n))
}
function Ts(e) {
  var t = e && e.length ? this.write(e) : ``
  return this.lastNeed ? t + this.lastChar.toString(`base64`, 0, 3 - this.lastNeed) : t
}
function Es(e) {
  return e.toString(this.encoding)
}
function Ds(e) {
  return e && e.length ? this.write(e) : ``
}
var Os = ae,
  { PromisePrototypeThen: ks, SymbolAsyncIterator: As, SymbolIterator: js } = X,
  { Buffer: Ms } = S,
  { ERR_INVALID_ARG_TYPE: Ns, ERR_STREAM_NULL_VALUES: Ps } = Hr.codes
function Fs(e, t, n) {
  let r
  if (typeof t == `string` || t instanceof Ms)
    return new e({
      objectMode: !0,
      ...n,
      read() {
        ;(this.push(t), this.push(null))
      }
    })
  let i
  if (t && t[As]) ((i = !0), (r = t[As]()))
  else if (t && t[js]) ((i = !1), (r = t[js]()))
  else throw new Ns(`iterable`, [`Iterable`], t)
  let a = new e({ objectMode: !0, highWaterMark: 1, ...n }),
    o = !1
  ;((a._read = function () {
    o || ((o = !0), c())
  }),
    (a._destroy = function (e, t) {
      ks(
        s(e),
        () => Os.nextTick(t, e),
        n => Os.nextTick(t, n || e)
      )
    }))
  async function s(e) {
    let t = e != null,
      n = typeof r.throw == `function`
    if (t && n) {
      let { value: t, done: n } = await r.throw(e)
      if ((await t, n)) return
    }
    if (typeof r.return == `function`) {
      let { value: e } = await r.return()
      await e
    }
  }
  async function c() {
    for (;;) {
      try {
        let { value: e, done: t } = i ? await r.next() : r.next()
        if (t) a.push(null)
        else {
          let t = e && typeof e.then == `function` ? await e : e
          if (t === null) throw ((o = !1), new Ps())
          if (a.push(t)) continue
          o = !1
        }
      } catch (e) {
        a.destroy(e)
      }
      break
    }
  }
  return a
}
var Is = Fs,
  Ls,
  Rs
function zs() {
  if (Rs) return Ls
  Rs = 1
  let e = ae,
    {
      ArrayPrototypeIndexOf: t,
      NumberIsInteger: n,
      NumberIsNaN: r,
      NumberParseInt: i,
      ObjectDefineProperties: a,
      ObjectKeys: o,
      ObjectSetPrototypeOf: s,
      Promise: c,
      SafeSet: l,
      SymbolAsyncDispose: u,
      SymbolAsyncIterator: d,
      Symbol: f
    } = X
  ;((Ls = R), (R.ReadableState = ie))
  let { EventEmitter: p } = gr,
    { Stream: m, prependListener: h } = Ho,
    { Buffer: g } = S,
    { addAbortSignal: _ } = Wo,
    v = co,
    y = Tr.debuglog(`stream`, e => {
      y = e
    }),
    ee = Zo,
    b = Io,
    { getHighWaterMark: te, getDefaultHighWaterMark: x } = cs,
    {
      aggregateTwoErrors: ne,
      codes: {
        ERR_INVALID_ARG_TYPE: C,
        ERR_METHOD_NOT_IMPLEMENTED: w,
        ERR_OUT_OF_RANGE: T,
        ERR_STREAM_PUSH_AFTER_EOF: E,
        ERR_STREAM_UNSHIFT_AFTER_END_EVENT: D
      },
      AbortError: O
    } = Hr,
    { validateObject: k } = Ui,
    A = f(`kPaused`),
    { StringDecoder: j } = ls,
    re = Is
  ;(s(R.prototype, m.prototype), s(R, m))
  let M = () => {},
    { errorOrDestroy: N } = b,
    P = 2048,
    F = 4096,
    I = 65536
  function L(e) {
    return {
      enumerable: !1,
      get() {
        return (this.state & e) !== 0
      },
      set(t) {
        t ? (this.state |= e) : (this.state &= ~e)
      }
    }
  }
  a(ie.prototype, {
    objectMode: L(1),
    ended: L(2),
    endEmitted: L(4),
    reading: L(8),
    constructed: L(16),
    sync: L(32),
    needReadable: L(64),
    emittedReadable: L(128),
    readableListening: L(256),
    resumeScheduled: L(512),
    errorEmitted: L(1024),
    emitClose: L(P),
    autoDestroy: L(F),
    destroyed: L(8192),
    closed: L(16384),
    closeEmitted: L(32768),
    multiAwaitDrain: L(I),
    readingMore: L(131072),
    dataEmitted: L(262144)
  })
  function ie(e, t, n) {
    ;(typeof n != `boolean` && (n = t instanceof Js()),
      (this.state = 6192),
      e && e.objectMode && (this.state |= 1),
      n && e && e.readableObjectMode && (this.state |= 1),
      (this.highWaterMark = e ? te(this, e, `readableHighWaterMark`, n) : x(!1)),
      (this.buffer = new ee()),
      (this.length = 0),
      (this.pipes = []),
      (this.flowing = null),
      (this[A] = null),
      e && e.emitClose === !1 && (this.state &= ~P),
      e && e.autoDestroy === !1 && (this.state &= ~F),
      (this.errored = null),
      (this.defaultEncoding = (e && e.defaultEncoding) || `utf8`),
      (this.awaitDrainWriters = null),
      (this.decoder = null),
      (this.encoding = null),
      e && e.encoding && ((this.decoder = new j(e.encoding)), (this.encoding = e.encoding)))
  }
  function R(e) {
    if (!(this instanceof R)) return new R(e)
    let t = this instanceof Js()
    ;((this._readableState = new ie(e, this, t)),
      e &&
        (typeof e.read == `function` && (this._read = e.read),
        typeof e.destroy == `function` && (this._destroy = e.destroy),
        typeof e.construct == `function` && (this._construct = e.construct),
        e.signal && !t && _(e.signal, this)),
      m.call(this, e),
      b.construct(this, () => {
        this._readableState.needReadable && ue(this, this._readableState)
      }))
  }
  ;((R.prototype.destroy = b.destroy),
    (R.prototype._undestroy = b.undestroy),
    (R.prototype._destroy = function (e, t) {
      t(e)
    }),
    (R.prototype[p.captureRejectionSymbol] = function (e) {
      this.destroy(e)
    }),
    (R.prototype[u] = function () {
      let e
      return (
        this.destroyed || ((e = this.readableEnded ? null : new O()), this.destroy(e)),
        new c((t, n) => v(this, r => (r && r !== e ? n(r) : t(null))))
      )
    }),
    (R.prototype.push = function (e, t) {
      return z(this, e, t, !1)
    }),
    (R.prototype.unshift = function (e, t) {
      return z(this, e, t, !0)
    }))
  function z(e, t, n, r) {
    y(`readableAddChunk`, t)
    let i = e._readableState,
      a
    if (
      (i.state & 1 ||
        (typeof t == `string`
          ? ((n ||= i.defaultEncoding),
            i.encoding !== n &&
              (r && i.encoding
                ? (t = g.from(t, n).toString(i.encoding))
                : ((t = g.from(t, n)), (n = ``))))
          : t instanceof g
            ? (n = ``)
            : m._isUint8Array(t)
              ? ((t = m._uint8ArrayToBuffer(t)), (n = ``))
              : t != null && (a = new C(`chunk`, [`string`, `Buffer`, `Uint8Array`], t))),
      a)
    )
      N(e, a)
    else if (t === null) ((i.state &= -9), se(e, i))
    else if (i.state & 1 || (t && t.length > 0))
      if (r)
        if (i.state & 4) N(e, new D())
        else if (i.destroyed || i.errored) return !1
        else B(e, i, t, !0)
      else if (i.ended) N(e, new E())
      else if (i.destroyed || i.errored) return !1
      else
        ((i.state &= -9),
          i.decoder && !n
            ? ((t = i.decoder.write(t)), i.objectMode || t.length !== 0 ? B(e, i, t, !1) : ue(e, i))
            : B(e, i, t, !1))
    else r || ((i.state &= -9), ue(e, i))
    return !i.ended && (i.length < i.highWaterMark || i.length === 0)
  }
  function B(e, t, n, r) {
    ;(t.flowing && t.length === 0 && !t.sync && e.listenerCount(`data`) > 0
      ? ((t.state & I) === 0 ? (t.awaitDrainWriters = null) : t.awaitDrainWriters.clear(),
        (t.dataEmitted = !0),
        e.emit(`data`, n))
      : ((t.length += t.objectMode ? 1 : n.length),
        r ? t.buffer.unshift(n) : t.buffer.push(n),
        t.state & 64 && ce(e)),
      ue(e, t))
  }
  ;((R.prototype.isPaused = function () {
    let e = this._readableState
    return e[A] === !0 || e.flowing === !1
  }),
    (R.prototype.setEncoding = function (e) {
      let t = new j(e)
      ;((this._readableState.decoder = t),
        (this._readableState.encoding = this._readableState.decoder.encoding))
      let n = this._readableState.buffer,
        r = ``
      for (let e of n) r += t.write(e)
      return (n.clear(), r !== `` && n.push(r), (this._readableState.length = r.length), this)
    }))
  function oe(e) {
    if (e > 1073741824) throw new T(`size`, `<= 1GiB`, e)
    return (
      e--, (e |= e >>> 1), (e |= e >>> 2), (e |= e >>> 4), (e |= e >>> 8), (e |= e >>> 16), e++, e
    )
  }
  function V(e, t) {
    return e <= 0 || (t.length === 0 && t.ended)
      ? 0
      : t.state & 1
        ? 1
        : r(e)
          ? t.flowing && t.length
            ? t.buffer.first().length
            : t.length
          : e <= t.length
            ? e
            : t.ended
              ? t.length
              : 0
  }
  R.prototype.read = function (e) {
    ;(y(`read`, e), e === void 0 ? (e = NaN) : n(e) || (e = i(e, 10)))
    let t = this._readableState,
      r = e
    if (
      (e > t.highWaterMark && (t.highWaterMark = oe(e)),
      e !== 0 && (t.state &= -129),
      e === 0 &&
        t.needReadable &&
        ((t.highWaterMark === 0 ? t.length > 0 : t.length >= t.highWaterMark) || t.ended))
    )
      return (
        y(`read: emitReadable`, t.length, t.ended),
        t.length === 0 && t.ended ? U(this) : ce(this),
        null
      )
    if (((e = V(e, t)), e === 0 && t.ended)) return (t.length === 0 && U(this), null)
    let a = (t.state & 64) != 0
    if (
      (y(`need readable`, a),
      (t.length === 0 || t.length - e < t.highWaterMark) &&
        ((a = !0), y(`length less than watermark`, a)),
      t.ended || t.reading || t.destroyed || t.errored || !t.constructed)
    )
      ((a = !1), y(`reading, ended or constructing`, a))
    else if (a) {
      ;(y(`do read`), (t.state |= 40), t.length === 0 && (t.state |= 64))
      try {
        this._read(t.highWaterMark)
      } catch (e) {
        N(this, e)
      }
      ;((t.state &= -33), t.reading || (e = V(r, t)))
    }
    let o
    return (
      (o = e > 0 ? H(e, t) : null),
      o === null
        ? ((t.needReadable = t.length <= t.highWaterMark), (e = 0))
        : ((t.length -= e),
          t.multiAwaitDrain ? t.awaitDrainWriters.clear() : (t.awaitDrainWriters = null)),
      t.length === 0 && (t.ended || (t.needReadable = !0), r !== e && t.ended && U(this)),
      o !== null &&
        !t.errorEmitted &&
        !t.closeEmitted &&
        ((t.dataEmitted = !0), this.emit(`data`, o)),
      o
    )
  }
  function se(e, t) {
    if ((y(`onEofChunk`), !t.ended)) {
      if (t.decoder) {
        let e = t.decoder.end()
        e && e.length && (t.buffer.push(e), (t.length += t.objectMode ? 1 : e.length))
      }
      ;((t.ended = !0), t.sync ? ce(e) : ((t.needReadable = !1), (t.emittedReadable = !0), le(e)))
    }
  }
  function ce(t) {
    let n = t._readableState
    ;(y(`emitReadable`, n.needReadable, n.emittedReadable),
      (n.needReadable = !1),
      n.emittedReadable ||
        (y(`emitReadable`, n.flowing), (n.emittedReadable = !0), e.nextTick(le, t)))
  }
  function le(e) {
    let t = e._readableState
    ;(y(`emitReadable_`, t.destroyed, t.length, t.ended),
      !t.destroyed &&
        !t.errored &&
        (t.length || t.ended) &&
        (e.emit(`readable`), (t.emittedReadable = !1)),
      (t.needReadable = !t.flowing && !t.ended && t.length <= t.highWaterMark),
      _e(e))
  }
  function ue(t, n) {
    !n.readingMore && n.constructed && ((n.readingMore = !0), e.nextTick(de, t, n))
  }
  function de(e, t) {
    for (
      ;
      !t.reading && !t.ended && (t.length < t.highWaterMark || (t.flowing && t.length === 0));
    ) {
      let n = t.length
      if ((y(`maybeReadMore read 0`), e.read(0), n === t.length)) break
    }
    t.readingMore = !1
  }
  ;((R.prototype._read = function (e) {
    throw new w(`_read()`)
  }),
    (R.prototype.pipe = function (t, n) {
      let r = this,
        i = this._readableState
      ;(i.pipes.length === 1 &&
        (i.multiAwaitDrain ||
          ((i.multiAwaitDrain = !0),
          (i.awaitDrainWriters = new l(i.awaitDrainWriters ? [i.awaitDrainWriters] : [])))),
        i.pipes.push(t),
        y(`pipe count=%d opts=%j`, i.pipes.length, n))
      let a = (!n || n.end !== !1) && t !== e.stdout && t !== e.stderr ? s : v
      ;(i.endEmitted ? e.nextTick(a) : r.once(`end`, a), t.on(`unpipe`, o))
      function o(e, t) {
        ;(y(`onunpipe`), e === r && t && t.hasUnpiped === !1 && ((t.hasUnpiped = !0), d()))
      }
      function s() {
        ;(y(`onend`), t.end())
      }
      let c,
        u = !1
      function d() {
        ;(y(`cleanup`),
          t.removeListener(`close`, g),
          t.removeListener(`finish`, _),
          c && t.removeListener(`drain`, c),
          t.removeListener(`error`, m),
          t.removeListener(`unpipe`, o),
          r.removeListener(`end`, s),
          r.removeListener(`end`, v),
          r.removeListener(`data`, p),
          (u = !0),
          c && i.awaitDrainWriters && (!t._writableState || t._writableState.needDrain) && c())
      }
      function f() {
        ;(u ||
          (i.pipes.length === 1 && i.pipes[0] === t
            ? (y(`false write response, pause`, 0),
              (i.awaitDrainWriters = t),
              (i.multiAwaitDrain = !1))
            : i.pipes.length > 1 &&
              i.pipes.includes(t) &&
              (y(`false write response, pause`, i.awaitDrainWriters.size),
              i.awaitDrainWriters.add(t)),
          r.pause()),
          c || ((c = fe(r, t)), t.on(`drain`, c)))
      }
      r.on(`data`, p)
      function p(e) {
        y(`ondata`)
        let n = t.write(e)
        ;(y(`dest.write`, n), n === !1 && f())
      }
      function m(e) {
        if ((y(`onerror`, e), v(), t.removeListener(`error`, m), t.listenerCount(`error`) === 0)) {
          let n = t._writableState || t._readableState
          n && !n.errorEmitted ? N(t, e) : t.emit(`error`, e)
        }
      }
      h(t, `error`, m)
      function g() {
        ;(t.removeListener(`finish`, _), v())
      }
      t.once(`close`, g)
      function _() {
        ;(y(`onfinish`), t.removeListener(`close`, g), v())
      }
      t.once(`finish`, _)
      function v() {
        ;(y(`unpipe`), r.unpipe(t))
      }
      return (
        t.emit(`pipe`, r),
        t.writableNeedDrain === !0 ? f() : i.flowing || (y(`pipe resume`), r.resume()),
        t
      )
    }))
  function fe(e, t) {
    return function () {
      let n = e._readableState
      ;(n.awaitDrainWriters === t
        ? (y(`pipeOnDrain`, 1), (n.awaitDrainWriters = null))
        : n.multiAwaitDrain &&
          (y(`pipeOnDrain`, n.awaitDrainWriters.size), n.awaitDrainWriters.delete(t)),
        (!n.awaitDrainWriters || n.awaitDrainWriters.size === 0) &&
          e.listenerCount(`data`) &&
          e.resume())
    }
  }
  ;((R.prototype.unpipe = function (e) {
    let n = this._readableState,
      r = { hasUnpiped: !1 }
    if (n.pipes.length === 0) return this
    if (!e) {
      let e = n.pipes
      ;((n.pipes = []), this.pause())
      for (let t = 0; t < e.length; t++) e[t].emit(`unpipe`, this, { hasUnpiped: !1 })
      return this
    }
    let i = t(n.pipes, e)
    return i === -1
      ? this
      : (n.pipes.splice(i, 1),
        n.pipes.length === 0 && this.pause(),
        e.emit(`unpipe`, this, r),
        this)
  }),
    (R.prototype.on = function (t, n) {
      let r = m.prototype.on.call(this, t, n),
        i = this._readableState
      return (
        t === `data`
          ? ((i.readableListening = this.listenerCount(`readable`) > 0),
            i.flowing !== !1 && this.resume())
          : t === `readable` &&
            !i.endEmitted &&
            !i.readableListening &&
            ((i.readableListening = i.needReadable = !0),
            (i.flowing = !1),
            (i.emittedReadable = !1),
            y(`on readable`, i.length, i.reading),
            i.length ? ce(this) : i.reading || e.nextTick(me, this)),
        r
      )
    }),
    (R.prototype.addListener = R.prototype.on),
    (R.prototype.removeListener = function (t, n) {
      let r = m.prototype.removeListener.call(this, t, n)
      return (t === `readable` && e.nextTick(pe, this), r)
    }),
    (R.prototype.off = R.prototype.removeListener),
    (R.prototype.removeAllListeners = function (t) {
      let n = m.prototype.removeAllListeners.apply(this, arguments)
      return ((t === `readable` || t === void 0) && e.nextTick(pe, this), n)
    }))
  function pe(e) {
    let t = e._readableState
    ;((t.readableListening = e.listenerCount(`readable`) > 0),
      t.resumeScheduled && t[A] === !1
        ? (t.flowing = !0)
        : e.listenerCount(`data`) > 0
          ? e.resume()
          : t.readableListening || (t.flowing = null))
  }
  function me(e) {
    ;(y(`readable nexttick read 0`), e.read(0))
  }
  R.prototype.resume = function () {
    let e = this._readableState
    return (
      e.flowing || (y(`resume`), (e.flowing = !e.readableListening), he(this, e)), (e[A] = !1), this
    )
  }
  function he(t, n) {
    n.resumeScheduled || ((n.resumeScheduled = !0), e.nextTick(ge, t, n))
  }
  function ge(e, t) {
    ;(y(`resume`, t.reading),
      t.reading || e.read(0),
      (t.resumeScheduled = !1),
      e.emit(`resume`),
      _e(e),
      t.flowing && !t.reading && e.read(0))
  }
  R.prototype.pause = function () {
    return (
      y(`call pause flowing=%j`, this._readableState.flowing),
      this._readableState.flowing !== !1 &&
        (y(`pause`), (this._readableState.flowing = !1), this.emit(`pause`)),
      (this._readableState[A] = !0),
      this
    )
  }
  function _e(e) {
    let t = e._readableState
    for (y(`flow`, t.flowing); t.flowing && e.read() !== null; );
  }
  ;((R.prototype.wrap = function (e) {
    let t = !1
    ;(e.on(`data`, n => {
      !this.push(n) && e.pause && ((t = !0), e.pause())
    }),
      e.on(`end`, () => {
        this.push(null)
      }),
      e.on(`error`, e => {
        N(this, e)
      }),
      e.on(`close`, () => {
        this.destroy()
      }),
      e.on(`destroy`, () => {
        this.destroy()
      }),
      (this._read = () => {
        t && e.resume && ((t = !1), e.resume())
      }))
    let n = o(e)
    for (let t = 1; t < n.length; t++) {
      let r = n[t]
      this[r] === void 0 && typeof e[r] == `function` && (this[r] = e[r].bind(e))
    }
    return this
  }),
    (R.prototype[d] = function () {
      return ve(this)
    }),
    (R.prototype.iterator = function (e) {
      return (e !== void 0 && k(e, `options`), ve(this, e))
    }))
  function ve(e, t) {
    typeof e.read != `function` && (e = R.wrap(e, { objectMode: !0 }))
    let n = ye(e, t)
    return ((n.stream = e), n)
  }
  async function* ye(e, t) {
    let n = M
    function r(t) {
      this === e ? (n(), (n = M)) : (n = t)
    }
    e.on(`readable`, r)
    let i,
      a = v(e, { writable: !1 }, e => {
        ;((i = e ? ne(i, e) : null), n(), (n = M))
      })
    try {
      for (;;) {
        let t = e.destroyed ? null : e.read()
        if (t !== null) yield t
        else if (i) throw i
        else if (i === null) return
        else await new c(r)
      }
    } catch (e) {
      throw ((i = ne(i, e)), i)
    } finally {
      ;(i || t?.destroyOnReturn !== !1) && (i === void 0 || e._readableState.autoDestroy)
        ? b.destroyer(e, null)
        : (e.off(`readable`, r), a())
    }
  }
  ;(a(R.prototype, {
    readable: {
      __proto__: null,
      get() {
        let e = this._readableState
        return !!e && e.readable !== !1 && !e.destroyed && !e.errorEmitted && !e.endEmitted
      },
      set(e) {
        this._readableState && (this._readableState.readable = !!e)
      }
    },
    readableDidRead: {
      __proto__: null,
      enumerable: !1,
      get: function () {
        return this._readableState.dataEmitted
      }
    },
    readableAborted: {
      __proto__: null,
      enumerable: !1,
      get: function () {
        return !!(
          this._readableState.readable !== !1 &&
          (this._readableState.destroyed || this._readableState.errored) &&
          !this._readableState.endEmitted
        )
      }
    },
    readableHighWaterMark: {
      __proto__: null,
      enumerable: !1,
      get: function () {
        return this._readableState.highWaterMark
      }
    },
    readableBuffer: {
      __proto__: null,
      enumerable: !1,
      get: function () {
        return this._readableState && this._readableState.buffer
      }
    },
    readableFlowing: {
      __proto__: null,
      enumerable: !1,
      get: function () {
        return this._readableState.flowing
      },
      set: function (e) {
        this._readableState && (this._readableState.flowing = e)
      }
    },
    readableLength: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState.length
      }
    },
    readableObjectMode: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.objectMode : !1
      }
    },
    readableEncoding: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.encoding : null
      }
    },
    errored: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.errored : null
      }
    },
    closed: {
      __proto__: null,
      get() {
        return this._readableState ? this._readableState.closed : !1
      }
    },
    destroyed: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.destroyed : !1
      },
      set(e) {
        this._readableState && (this._readableState.destroyed = e)
      }
    },
    readableEnded: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._readableState ? this._readableState.endEmitted : !1
      }
    }
  }),
    a(ie.prototype, {
      pipesCount: {
        __proto__: null,
        get() {
          return this.pipes.length
        }
      },
      paused: {
        __proto__: null,
        get() {
          return this[A] !== !1
        },
        set(e) {
          this[A] = !!e
        }
      }
    }),
    (R._fromList = H))
  function H(e, t) {
    if (t.length === 0) return null
    let n
    return (
      t.objectMode
        ? (n = t.buffer.shift())
        : !e || e >= t.length
          ? ((n = t.decoder
              ? t.buffer.join(``)
              : t.buffer.length === 1
                ? t.buffer.first()
                : t.buffer.concat(t.length)),
            t.buffer.clear())
          : (n = t.buffer.consume(e, t.decoder)),
      n
    )
  }
  function U(t) {
    let n = t._readableState
    ;(y(`endReadable`, n.endEmitted), n.endEmitted || ((n.ended = !0), e.nextTick(be, n, t)))
  }
  function be(t, n) {
    if (
      (y(`endReadableNT`, t.endEmitted, t.length),
      !t.errored && !t.closeEmitted && !t.endEmitted && t.length === 0)
    ) {
      if (((t.endEmitted = !0), n.emit(`end`), n.writable && n.allowHalfOpen === !1))
        e.nextTick(xe, n)
      else if (t.autoDestroy) {
        let e = n._writableState
        ;(!e || (e.autoDestroy && (e.finished || e.writable === !1))) && n.destroy()
      }
    }
  }
  function xe(e) {
    e.writable && !e.writableEnded && !e.destroyed && e.end()
  }
  R.from = function (e, t) {
    return re(R, e, t)
  }
  let Se
  function W() {
    return (Se === void 0 && (Se = {}), Se)
  }
  return (
    (R.fromWeb = function (e, t) {
      return W().newStreamReadableFromReadableStream(e, t)
    }),
    (R.toWeb = function (e, t) {
      return W().newReadableStreamFromStreamReadable(e, t)
    }),
    (R.wrap = function (e, t) {
      return new R({
        objectMode: e.readableObjectMode ?? e.objectMode ?? !0,
        ...t,
        destroy(t, n) {
          ;(b.destroyer(e, t), n(t))
        }
      }).wrap(e)
    }),
    Ls
  )
}
var Bs, Vs
function Hs() {
  if (Vs) return Bs
  Vs = 1
  let e = ae,
    {
      ArrayPrototypeSlice: t,
      Error: n,
      FunctionPrototypeSymbolHasInstance: r,
      ObjectDefineProperty: i,
      ObjectDefineProperties: a,
      ObjectSetPrototypeOf: o,
      StringPrototypeToLowerCase: s,
      Symbol: c,
      SymbolHasInstance: l
    } = X
  ;((Bs = k), (k.WritableState = D))
  let { EventEmitter: u } = gr,
    d = Ho.Stream,
    { Buffer: f } = S,
    p = Io,
    { addAbortSignal: m } = Wo,
    { getHighWaterMark: h, getDefaultHighWaterMark: g } = cs,
    {
      ERR_INVALID_ARG_TYPE: _,
      ERR_METHOD_NOT_IMPLEMENTED: v,
      ERR_MULTIPLE_CALLBACK: y,
      ERR_STREAM_CANNOT_PIPE: ee,
      ERR_STREAM_DESTROYED: b,
      ERR_STREAM_ALREADY_FINISHED: te,
      ERR_STREAM_NULL_VALUES: x,
      ERR_STREAM_WRITE_AFTER_END: ne,
      ERR_UNKNOWN_ENCODING: C
    } = Hr.codes,
    { errorOrDestroy: w } = p
  ;(o(k.prototype, d.prototype), o(k, d))
  function T() {}
  let E = c(`kOnFinished`)
  function D(e, t, n) {
    ;(typeof n != `boolean` && (n = t instanceof Js()),
      (this.objectMode = !!(e && e.objectMode)),
      n && (this.objectMode = this.objectMode || !!(e && e.writableObjectMode)),
      (this.highWaterMark = e ? h(this, e, `writableHighWaterMark`, n) : g(!1)),
      (this.finalCalled = !1),
      (this.needDrain = !1),
      (this.ending = !1),
      (this.ended = !1),
      (this.finished = !1),
      (this.destroyed = !1),
      (this.decodeStrings = !(e && e.decodeStrings === !1)),
      (this.defaultEncoding = (e && e.defaultEncoding) || `utf8`),
      (this.length = 0),
      (this.writing = !1),
      (this.corked = 0),
      (this.sync = !0),
      (this.bufferProcessing = !1),
      (this.onwrite = N.bind(void 0, t)),
      (this.writecb = null),
      (this.writelen = 0),
      (this.afterWriteTickInfo = null),
      O(this),
      (this.pendingcb = 0),
      (this.constructed = !0),
      (this.prefinished = !1),
      (this.errorEmitted = !1),
      (this.emitClose = !e || e.emitClose !== !1),
      (this.autoDestroy = !e || e.autoDestroy !== !1),
      (this.errored = null),
      (this.closed = !1),
      (this.closeEmitted = !1),
      (this[E] = []))
  }
  function O(e) {
    ;((e.buffered = []), (e.bufferedIndex = 0), (e.allBuffers = !0), (e.allNoop = !0))
  }
  ;((D.prototype.getBuffer = function () {
    return t(this.buffered, this.bufferedIndex)
  }),
    i(D.prototype, `bufferedRequestCount`, {
      __proto__: null,
      get() {
        return this.buffered.length - this.bufferedIndex
      }
    }))
  function k(e) {
    let t = this instanceof Js()
    if (!t && !r(k, this)) return new k(e)
    ;((this._writableState = new D(e, this, t)),
      e &&
        (typeof e.write == `function` && (this._write = e.write),
        typeof e.writev == `function` && (this._writev = e.writev),
        typeof e.destroy == `function` && (this._destroy = e.destroy),
        typeof e.final == `function` && (this._final = e.final),
        typeof e.construct == `function` && (this._construct = e.construct),
        e.signal && m(e.signal, this)),
      d.call(this, e),
      p.construct(this, () => {
        let e = this._writableState
        ;(e.writing || L(this, e), B(this, e))
      }))
  }
  ;(i(k, l, {
    __proto__: null,
    value: function (e) {
      return r(this, e) ? !0 : this === k ? e && e._writableState instanceof D : !1
    }
  }),
    (k.prototype.pipe = function () {
      w(this, new ee())
    }))
  function A(t, n, r, i) {
    let a = t._writableState
    if (typeof r == `function`) ((i = r), (r = a.defaultEncoding))
    else {
      if (!r) r = a.defaultEncoding
      else if (r !== `buffer` && !f.isEncoding(r)) throw new C(r)
      typeof i != `function` && (i = T)
    }
    if (n === null) throw new x()
    if (!a.objectMode)
      if (typeof n == `string`) a.decodeStrings !== !1 && ((n = f.from(n, r)), (r = `buffer`))
      else if (n instanceof f) r = `buffer`
      else if (d._isUint8Array(n)) ((n = d._uint8ArrayToBuffer(n)), (r = `buffer`))
      else throw new _(`chunk`, [`string`, `Buffer`, `Uint8Array`], n)
    let o
    return (
      a.ending ? (o = new ne()) : a.destroyed && (o = new b(`write`)),
      o ? (e.nextTick(i, o), w(t, o, !0), o) : (a.pendingcb++, j(t, a, n, r, i))
    )
  }
  ;((k.prototype.write = function (e, t, n) {
    return A(this, e, t, n) === !0
  }),
    (k.prototype.cork = function () {
      this._writableState.corked++
    }),
    (k.prototype.uncork = function () {
      let e = this._writableState
      e.corked && (e.corked--, e.writing || L(this, e))
    }),
    (k.prototype.setDefaultEncoding = function (e) {
      if ((typeof e == `string` && (e = s(e)), !f.isEncoding(e))) throw new C(e)
      return ((this._writableState.defaultEncoding = e), this)
    }))
  function j(e, t, n, r, i) {
    let a = t.objectMode ? 1 : n.length
    t.length += a
    let o = t.length < t.highWaterMark
    return (
      o || (t.needDrain = !0),
      t.writing || t.corked || t.errored || !t.constructed
        ? (t.buffered.push({ chunk: n, encoding: r, callback: i }),
          t.allBuffers && r !== `buffer` && (t.allBuffers = !1),
          t.allNoop && i !== T && (t.allNoop = !1))
        : ((t.writelen = a),
          (t.writecb = i),
          (t.writing = !0),
          (t.sync = !0),
          e._write(n, r, t.onwrite),
          (t.sync = !1)),
      o && !t.errored && !t.destroyed
    )
  }
  function re(e, t, n, r, i, a, o) {
    ;((t.writelen = r),
      (t.writecb = o),
      (t.writing = !0),
      (t.sync = !0),
      t.destroyed
        ? t.onwrite(new b(`write`))
        : n
          ? e._writev(i, t.onwrite)
          : e._write(i, a, t.onwrite),
      (t.sync = !1))
  }
  function M(e, t, n, r) {
    ;(--t.pendingcb, r(n), I(t), w(e, n))
  }
  function N(t, n) {
    let r = t._writableState,
      i = r.sync,
      a = r.writecb
    if (typeof a != `function`) {
      w(t, new y())
      return
    }
    ;((r.writing = !1),
      (r.writecb = null),
      (r.length -= r.writelen),
      (r.writelen = 0),
      n
        ? (n.stack,
          (r.errored ||= n),
          t._readableState && !t._readableState.errored && (t._readableState.errored = n),
          i ? e.nextTick(M, t, r, n, a) : M(t, r, n, a))
        : (r.buffered.length > r.bufferedIndex && L(t, r),
          i
            ? r.afterWriteTickInfo !== null && r.afterWriteTickInfo.cb === a
              ? r.afterWriteTickInfo.count++
              : ((r.afterWriteTickInfo = { count: 1, cb: a, stream: t, state: r }),
                e.nextTick(P, r.afterWriteTickInfo))
            : F(t, r, 1, a)))
  }
  function P({ stream: e, state: t, count: n, cb: r }) {
    return ((t.afterWriteTickInfo = null), F(e, t, n, r))
  }
  function F(e, t, n, r) {
    for (
      !t.ending &&
      !e.destroyed &&
      t.length === 0 &&
      t.needDrain &&
      ((t.needDrain = !1), e.emit(`drain`));
      n-- > 0;
    )
      (t.pendingcb--, r())
    ;(t.destroyed && I(t), B(e, t))
  }
  function I(e) {
    if (e.writing) return
    for (let t = e.bufferedIndex; t < e.buffered.length; ++t) {
      let { chunk: n, callback: r } = e.buffered[t],
        i = e.objectMode ? 1 : n.length
      ;((e.length -= i), r(e.errored ?? new b(`write`)))
    }
    let t = e[E].splice(0)
    for (let n = 0; n < t.length; n++) t[n](e.errored ?? new b(`end`))
    O(e)
  }
  function L(e, n) {
    if (n.corked || n.bufferProcessing || n.destroyed || !n.constructed) return
    let { buffered: r, bufferedIndex: i, objectMode: a } = n,
      o = r.length - i
    if (!o) return
    let s = i
    if (((n.bufferProcessing = !0), o > 1 && e._writev)) {
      n.pendingcb -= o - 1
      let i = n.allNoop
          ? T
          : e => {
              for (let t = s; t < r.length; ++t) r[t].callback(e)
            },
        a = n.allNoop && s === 0 ? r : t(r, s)
      ;((a.allBuffers = n.allBuffers), re(e, n, !0, n.length, a, ``, i), O(n))
    } else {
      do {
        let { chunk: t, encoding: i, callback: o } = r[s]
        ;((r[s++] = null), re(e, n, !1, a ? 1 : t.length, t, i, o))
      } while (s < r.length && !n.writing)
      s === r.length
        ? O(n)
        : s > 256
          ? (r.splice(0, s), (n.bufferedIndex = 0))
          : (n.bufferedIndex = s)
    }
    n.bufferProcessing = !1
  }
  ;((k.prototype._write = function (e, t, n) {
    if (this._writev) this._writev([{ chunk: e, encoding: t }], n)
    else throw new v(`_write()`)
  }),
    (k.prototype._writev = null),
    (k.prototype.end = function (t, r, i) {
      let a = this._writableState
      typeof t == `function`
        ? ((i = t), (t = null), (r = null))
        : typeof r == `function` && ((i = r), (r = null))
      let o
      if (t != null) {
        let e = A(this, t, r)
        e instanceof n && (o = e)
      }
      return (
        a.corked && ((a.corked = 1), this.uncork()),
        o ||
          (!a.errored && !a.ending
            ? ((a.ending = !0), B(this, a, !0), (a.ended = !0))
            : a.finished
              ? (o = new te(`end`))
              : a.destroyed && (o = new b(`end`))),
        typeof i == `function` && (o || a.finished ? e.nextTick(i, o) : a[E].push(i)),
        this
      )
    }))
  function ie(e) {
    return (
      e.ending &&
      !e.destroyed &&
      e.constructed &&
      e.length === 0 &&
      !e.errored &&
      e.buffered.length === 0 &&
      !e.finished &&
      !e.writing &&
      !e.errorEmitted &&
      !e.closeEmitted
    )
  }
  function R(t, n) {
    let r = !1
    function i(i) {
      if (r) {
        w(t, i ?? y())
        return
      }
      if (((r = !0), n.pendingcb--, i)) {
        let e = n[E].splice(0)
        for (let t = 0; t < e.length; t++) e[t](i)
        w(t, i, n.sync)
      } else
        ie(n) && ((n.prefinished = !0), t.emit(`prefinish`), n.pendingcb++, e.nextTick(oe, t, n))
    }
    ;((n.sync = !0), n.pendingcb++)
    try {
      t._final(i)
    } catch (e) {
      i(e)
    }
    n.sync = !1
  }
  function z(e, t) {
    !t.prefinished &&
      !t.finalCalled &&
      (typeof e._final == `function` && !t.destroyed
        ? ((t.finalCalled = !0), R(e, t))
        : ((t.prefinished = !0), e.emit(`prefinish`)))
  }
  function B(t, n, r) {
    ie(n) &&
      (z(t, n),
      n.pendingcb === 0 &&
        (r
          ? (n.pendingcb++,
            e.nextTick(
              (e, t) => {
                ie(t) ? oe(e, t) : t.pendingcb--
              },
              t,
              n
            ))
          : ie(n) && (n.pendingcb++, oe(t, n))))
  }
  function oe(e, t) {
    ;(t.pendingcb--, (t.finished = !0))
    let n = t[E].splice(0)
    for (let e = 0; e < n.length; e++) n[e]()
    if ((e.emit(`finish`), t.autoDestroy)) {
      let t = e._readableState
      ;(!t || (t.autoDestroy && (t.endEmitted || t.readable === !1))) && e.destroy()
    }
  }
  a(k.prototype, {
    closed: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.closed : !1
      }
    },
    destroyed: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.destroyed : !1
      },
      set(e) {
        this._writableState && (this._writableState.destroyed = e)
      }
    },
    writable: {
      __proto__: null,
      get() {
        let e = this._writableState
        return !!e && e.writable !== !1 && !e.destroyed && !e.errored && !e.ending && !e.ended
      },
      set(e) {
        this._writableState && (this._writableState.writable = !!e)
      }
    },
    writableFinished: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.finished : !1
      }
    },
    writableObjectMode: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.objectMode : !1
      }
    },
    writableBuffer: {
      __proto__: null,
      get() {
        return this._writableState && this._writableState.getBuffer()
      }
    },
    writableEnded: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.ending : !1
      }
    },
    writableNeedDrain: {
      __proto__: null,
      get() {
        let e = this._writableState
        return e ? !e.destroyed && !e.ending && e.needDrain : !1
      }
    },
    writableHighWaterMark: {
      __proto__: null,
      get() {
        return this._writableState && this._writableState.highWaterMark
      }
    },
    writableCorked: {
      __proto__: null,
      get() {
        return this._writableState ? this._writableState.corked : 0
      }
    },
    writableLength: {
      __proto__: null,
      get() {
        return this._writableState && this._writableState.length
      }
    },
    errored: {
      __proto__: null,
      enumerable: !1,
      get() {
        return this._writableState ? this._writableState.errored : null
      }
    },
    writableAborted: {
      __proto__: null,
      enumerable: !1,
      get: function () {
        return !!(
          this._writableState.writable !== !1 &&
          (this._writableState.destroyed || this._writableState.errored) &&
          !this._writableState.finished
        )
      }
    }
  })
  let V = p.destroy
  ;((k.prototype.destroy = function (t, n) {
    let r = this._writableState
    return (
      !r.destroyed && (r.bufferedIndex < r.buffered.length || r[E].length) && e.nextTick(I, r),
      V.call(this, t, n),
      this
    )
  }),
    (k.prototype._undestroy = p.undestroy),
    (k.prototype._destroy = function (e, t) {
      t(e)
    }),
    (k.prototype[u.captureRejectionSymbol] = function (e) {
      this.destroy(e)
    }))
  let se
  function ce() {
    return (se === void 0 && (se = {}), se)
  }
  return (
    (k.fromWeb = function (e, t) {
      return ce().newStreamWritableFromWritableStream(e, t)
    }),
    (k.toWeb = function (e) {
      return ce().newWritableStreamFromStreamWritable(e)
    }),
    Bs
  )
}
var Us, Ws
function Gs() {
  if (Ws) return Us
  Ws = 1
  let e = ae,
    t = S,
    {
      isReadable: n,
      isWritable: r,
      isIterable: i,
      isNodeStream: a,
      isReadableNodeStream: o,
      isWritableNodeStream: s,
      isDuplexNodeStream: c,
      isReadableStream: l,
      isWritableStream: u
    } = Da,
    d = co,
    {
      AbortError: f,
      codes: { ERR_INVALID_ARG_TYPE: p, ERR_INVALID_RETURN_VALUE: m }
    } = Hr,
    { destroyer: h } = Io,
    g = Js(),
    _ = zs(),
    v = Hs(),
    { createDeferredPromise: y } = Tr,
    ee = Is,
    b = globalThis.Blob || t.Blob,
    te =
      b === void 0
        ? function (e) {
            return !1
          }
        : function (e) {
            return e instanceof b
          },
    x = globalThis.AbortController || wr().AbortController,
    { FunctionPrototypeCall: ne } = X
  class C extends g {
    constructor(e) {
      ;(super(e),
        e?.readable === !1 &&
          ((this._readableState.readable = !1),
          (this._readableState.ended = !0),
          (this._readableState.endEmitted = !0)),
        e?.writable === !1 &&
          ((this._writableState.writable = !1),
          (this._writableState.ending = !0),
          (this._writableState.ended = !0),
          (this._writableState.finished = !0)))
    }
  }
  Us = function t(n, r) {
    if (c(n)) return n
    if (o(n)) return T({ readable: n })
    if (s(n)) return T({ writable: n })
    if (a(n)) return T({ writable: !1, readable: !1 })
    if (l(n)) return T({ readable: _.fromWeb(n) })
    if (u(n)) return T({ writable: v.fromWeb(n) })
    if (typeof n == `function`) {
      let { value: t, write: a, final: o, destroy: s } = w(n)
      if (i(t)) return ee(C, t, { objectMode: !0, write: a, final: o, destroy: s })
      let c = t?.then
      if (typeof c == `function`) {
        let n,
          r = ne(
            c,
            t,
            e => {
              if (e != null) throw new m(`nully`, `body`, e)
            },
            e => {
              h(n, e)
            }
          )
        return (n = new C({
          objectMode: !0,
          readable: !1,
          write: a,
          final(t) {
            o(async () => {
              try {
                ;(await r, e.nextTick(t, null))
              } catch (n) {
                e.nextTick(t, n)
              }
            })
          },
          destroy: s
        }))
      }
      throw new m(`Iterable, AsyncIterable or AsyncFunction`, r, t)
    }
    if (te(n)) return t(n.arrayBuffer())
    if (i(n)) return ee(C, n, { objectMode: !0, writable: !1 })
    if (l(n?.readable) && u(n?.writable)) return C.fromWeb(n)
    if (typeof n?.writable == `object` || typeof n?.readable == `object`)
      return T({
        readable: n != null && n.readable ? (o(n?.readable) ? n?.readable : t(n.readable)) : void 0,
        writable: n != null && n.writable ? (s(n?.writable) ? n?.writable : t(n.writable)) : void 0
      })
    let d = n?.then
    if (typeof d == `function`) {
      let e
      return (
        ne(
          d,
          n,
          t => {
            ;(t != null && e.push(t), e.push(null))
          },
          t => {
            h(e, t)
          }
        ),
        (e = new C({ objectMode: !0, writable: !1, read() {} }))
      )
    }
    throw new p(
      r,
      [
        `Blob`,
        `ReadableStream`,
        `WritableStream`,
        `Stream`,
        `Iterable`,
        `AsyncIterable`,
        `Function`,
        `{ readable, writable } pair`,
        `Promise`
      ],
      n
    )
  }
  function w(t) {
    let { promise: n, resolve: r } = y(),
      i = new x(),
      a = i.signal
    return {
      value: t(
        (async function* () {
          for (;;) {
            let t = n
            n = null
            let { chunk: i, done: o, cb: s } = await t
            if ((e.nextTick(s), o)) return
            if (a.aborted) throw new f(void 0, { cause: a.reason })
            ;(({ promise: n, resolve: r } = y()), yield i)
          }
        })(),
        { signal: a }
      ),
      write(e, t, n) {
        let i = r
        ;((r = null), i({ chunk: e, done: !1, cb: n }))
      },
      final(e) {
        let t = r
        ;((r = null), t({ done: !0, cb: e }))
      },
      destroy(e, t) {
        ;(i.abort(), t(e))
      }
    }
  }
  function T(e) {
    let t = e.readable && typeof e.readable.read != `function` ? _.wrap(e.readable) : e.readable,
      i = e.writable,
      a = !!n(t),
      o = !!r(i),
      s,
      c,
      l,
      u,
      p
    function m(e) {
      let t = u
      ;((u = null), t ? t(e) : e && p.destroy(e))
    }
    return (
      (p = new C({
        readableObjectMode: !!(t != null && t.readableObjectMode),
        writableObjectMode: !!(i != null && i.writableObjectMode),
        readable: a,
        writable: o
      })),
      o &&
        (d(i, e => {
          ;((o = !1), e && h(t, e), m(e))
        }),
        (p._write = function (e, t, n) {
          i.write(e, t) ? n() : (s = n)
        }),
        (p._final = function (e) {
          ;(i.end(), (c = e))
        }),
        i.on(`drain`, function () {
          if (s) {
            let e = s
            ;((s = null), e())
          }
        }),
        i.on(`finish`, function () {
          if (c) {
            let e = c
            ;((c = null), e())
          }
        })),
      a &&
        (d(t, e => {
          ;((a = !1), e && h(t, e), m(e))
        }),
        t.on(`readable`, function () {
          if (l) {
            let e = l
            ;((l = null), e())
          }
        }),
        t.on(`end`, function () {
          p.push(null)
        }),
        (p._read = function () {
          for (;;) {
            let e = t.read()
            if (e === null) {
              l = p._read
              return
            }
            if (!p.push(e)) return
          }
        })),
      (p._destroy = function (e, n) {
        ;(!e && u !== null && (e = new f()),
          (l = null),
          (s = null),
          (c = null),
          u === null ? n(e) : ((u = n), h(i, e), h(t, e)))
      }),
      p
    )
  }
  return Us
}
var Ks, qs
function Js() {
  if (qs) return Ks
  qs = 1
  let {
    ObjectDefineProperties: e,
    ObjectGetOwnPropertyDescriptor: t,
    ObjectKeys: n,
    ObjectSetPrototypeOf: r
  } = X
  Ks = o
  let i = zs(),
    a = Hs()
  ;(r(o.prototype, i.prototype), r(o, i))
  {
    let e = n(a.prototype)
    for (let t = 0; t < e.length; t++) {
      let n = e[t]
      o.prototype[n] || (o.prototype[n] = a.prototype[n])
    }
  }
  function o(e) {
    if (!(this instanceof o)) return new o(e)
    ;(i.call(this, e),
      a.call(this, e),
      e
        ? ((this.allowHalfOpen = e.allowHalfOpen !== !1),
          e.readable === !1 &&
            ((this._readableState.readable = !1),
            (this._readableState.ended = !0),
            (this._readableState.endEmitted = !0)),
          e.writable === !1 &&
            ((this._writableState.writable = !1),
            (this._writableState.ending = !0),
            (this._writableState.ended = !0),
            (this._writableState.finished = !0)))
        : (this.allowHalfOpen = !0))
  }
  e(o.prototype, {
    writable: { __proto__: null, ...t(a.prototype, `writable`) },
    writableHighWaterMark: { __proto__: null, ...t(a.prototype, `writableHighWaterMark`) },
    writableObjectMode: { __proto__: null, ...t(a.prototype, `writableObjectMode`) },
    writableBuffer: { __proto__: null, ...t(a.prototype, `writableBuffer`) },
    writableLength: { __proto__: null, ...t(a.prototype, `writableLength`) },
    writableFinished: { __proto__: null, ...t(a.prototype, `writableFinished`) },
    writableCorked: { __proto__: null, ...t(a.prototype, `writableCorked`) },
    writableEnded: { __proto__: null, ...t(a.prototype, `writableEnded`) },
    writableNeedDrain: { __proto__: null, ...t(a.prototype, `writableNeedDrain`) },
    destroyed: {
      __proto__: null,
      get() {
        return this._readableState === void 0 || this._writableState === void 0
          ? !1
          : this._readableState.destroyed && this._writableState.destroyed
      },
      set(e) {
        this._readableState &&
          this._writableState &&
          ((this._readableState.destroyed = e), (this._writableState.destroyed = e))
      }
    }
  })
  let s
  function c() {
    return (s === void 0 && (s = {}), s)
  }
  ;((o.fromWeb = function (e, t) {
    return c().newStreamDuplexFromReadableWritablePair(e, t)
  }),
    (o.toWeb = function (e) {
      return c().newReadableWritablePairFromDuplex(e)
    }))
  let l
  return (
    (o.from = function (e) {
      return ((l ||= Gs()), l(e, `body`))
    }),
    Ks
  )
}
var { ObjectSetPrototypeOf: Ys, Symbol: Xs } = X,
  Zs = nc,
  { ERR_METHOD_NOT_IMPLEMENTED: Qs } = Hr.codes,
  $s = Js(),
  { getHighWaterMark: ec } = cs
;(Ys(nc.prototype, $s.prototype), Ys(nc, $s))
var tc = Xs(`kCallback`)
function nc(e) {
  if (!(this instanceof nc)) return new nc(e)
  let t = e ? ec(this, e, `readableHighWaterMark`, !0) : null
  ;(t === 0 &&
    (e = {
      ...e,
      highWaterMark: null,
      readableHighWaterMark: t,
      writableHighWaterMark: e.writableHighWaterMark || 0
    }),
    $s.call(this, e),
    (this._readableState.sync = !1),
    (this[tc] = null),
    e &&
      (typeof e.transform == `function` && (this._transform = e.transform),
      typeof e.flush == `function` && (this._flush = e.flush)),
    this.on(`prefinish`, ic))
}
function rc(e) {
  typeof this._flush == `function` && !this.destroyed
    ? this._flush((t, n) => {
        if (t) {
          e ? e(t) : this.destroy(t)
          return
        }
        ;(n != null && this.push(n), this.push(null), e && e())
      })
    : (this.push(null), e && e())
}
function ic() {
  this._final !== rc && rc.call(this)
}
;((nc.prototype._final = rc),
  (nc.prototype._transform = function (e, t, n) {
    throw new Qs(`_transform()`)
  }),
  (nc.prototype._write = function (e, t, n) {
    let r = this._readableState,
      i = this._writableState,
      a = r.length
    this._transform(e, t, (e, t) => {
      if (e) {
        n(e)
        return
      }
      ;(t != null && this.push(t),
        i.ended || a === r.length || r.length < r.highWaterMark ? n() : (this[tc] = n))
    })
  }),
  (nc.prototype._read = function () {
    if (this[tc]) {
      let e = this[tc]
      ;((this[tc] = null), e())
    }
  }))
var { ObjectSetPrototypeOf: ac } = X,
  oc = cc,
  sc = Zs
;(ac(cc.prototype, sc.prototype), ac(cc, sc))
function cc(e) {
  if (!(this instanceof cc)) return new cc(e)
  sc.call(this, e)
}
cc.prototype._transform = function (e, t, n) {
  n(null, e)
}
var lc = ae,
  { ArrayIsArray: uc, Promise: dc, SymbolAsyncIterator: fc, SymbolDispose: pc } = X,
  mc = co,
  { once: hc } = Tr,
  gc = Io,
  _c = Js(),
  {
    aggregateTwoErrors: vc,
    codes: {
      ERR_INVALID_ARG_TYPE: yc,
      ERR_INVALID_RETURN_VALUE: bc,
      ERR_MISSING_ARGS: xc,
      ERR_STREAM_DESTROYED: Sc,
      ERR_STREAM_PREMATURE_CLOSE: Cc
    },
    AbortError: wc
  } = Hr,
  { validateFunction: Tc, validateAbortSignal: Ec } = Ui,
  {
    isIterable: Dc,
    isReadable: Oc,
    isReadableNodeStream: kc,
    isNodeStream: Ac,
    isTransformStream: jc,
    isWebStream: Mc,
    isReadableStream: Nc,
    isReadableFinished: Pc
  } = Da,
  Fc = globalThis.AbortController || wr().AbortController,
  Ic,
  Lc,
  Rc
function zc(e, t, n) {
  let r = !1
  return (
    e.on(`close`, () => {
      r = !0
    }),
    {
      destroy: t => {
        r || ((r = !0), gc.destroyer(e, t || new Sc(`pipe`)))
      },
      cleanup: mc(e, { readable: t, writable: n }, e => {
        r = !e
      })
    }
  )
}
function Bc(e) {
  return (Tc(e[e.length - 1], `streams[stream.length - 1]`), e.pop())
}
function Vc(e) {
  if (Dc(e)) return e
  if (kc(e)) return Hc(e)
  throw new yc(`val`, [`Readable`, `Iterable`, `AsyncIterable`], e)
}
async function* Hc(e) {
  ;((Lc ||= zs()), yield* Lc.prototype[fc].call(e))
}
async function Uc(e, t, n, { end: r }) {
  let i,
    a = null,
    o = e => {
      if ((e && (i = e), a)) {
        let e = a
        ;((a = null), e())
      }
    },
    s = () =>
      new dc((e, t) => {
        i
          ? t(i)
          : (a = () => {
              i ? t(i) : e()
            })
      })
  t.on(`drain`, o)
  let c = mc(t, { readable: !1 }, o)
  try {
    t.writableNeedDrain && (await s())
    for await (let n of e) t.write(n) || (await s())
    ;(r && (t.end(), await s()), n())
  } catch (e) {
    n(i === e ? e : vc(i, e))
  } finally {
    ;(c(), t.off(`drain`, o))
  }
}
async function Wc(e, t, n, { end: r }) {
  jc(t) && (t = t.writable)
  let i = t.getWriter()
  try {
    for await (let t of e) (await i.ready, i.write(t).catch(() => {}))
    ;(await i.ready, r && (await i.close()), n())
  } catch (e) {
    try {
      ;(await i.abort(e), n(e))
    } catch (e) {
      n(e)
    }
  }
}
function Gc(...e) {
  return Kc(e, hc(Bc(e)))
}
function Kc(e, t, n) {
  if ((e.length === 1 && uc(e[0]) && (e = e[0]), e.length < 2)) throw new xc(`streams`)
  let r = new Fc(),
    i = r.signal,
    a = n?.signal,
    o = []
  Ec(a, `options.signal`)
  function s() {
    m(new wc())
  }
  Rc ||= Tr.addAbortListener
  let c
  a && (c = Rc(a, s))
  let l,
    u,
    d = [],
    f = 0
  function p(e) {
    m(e, --f === 0)
  }
  function m(e, n) {
    var i
    if ((e && (!l || l.code === `ERR_STREAM_PREMATURE_CLOSE`) && (l = e), !(!l && !n))) {
      for (; d.length; ) d.shift()(l)
      ;((i = c) == null || i[pc](),
        r.abort(),
        n && (l || o.forEach(e => e()), lc.nextTick(t, l, u)))
    }
  }
  let h
  for (let t = 0; t < e.length; t++) {
    let r = e[t],
      a = t < e.length - 1,
      s = t > 0,
      c = a || n?.end !== !1,
      l = t === e.length - 1
    if (Ac(r)) {
      if (c) {
        let { destroy: e, cleanup: t } = zc(r, a, s)
        ;(d.push(e), Oc(r) && l && o.push(t))
      }
      function e(e) {
        e && e.name !== `AbortError` && e.code !== `ERR_STREAM_PREMATURE_CLOSE` && p(e)
      }
      ;(r.on(`error`, e),
        Oc(r) &&
          l &&
          o.push(() => {
            r.removeListener(`error`, e)
          }))
    }
    if (t === 0)
      if (typeof r == `function`) {
        if (((h = r({ signal: i })), !Dc(h)))
          throw new bc(`Iterable, AsyncIterable or Stream`, `source`, h)
      } else h = Dc(r) || kc(r) || jc(r) ? r : _c.from(r)
    else if (typeof r == `function`)
      if (((h = jc(h) ? Vc(h?.readable) : Vc(h)), (h = r(h, { signal: i })), a)) {
        if (!Dc(h, !0)) throw new bc(`AsyncIterable`, `transform[${t - 1}]`, h)
      } else {
        Ic ||= oc
        let e = new Ic({ objectMode: !0 }),
          t = h?.then
        if (typeof t == `function`)
          (f++,
            t.call(
              h,
              t => {
                ;((u = t), t != null && e.write(t), c && e.end(), lc.nextTick(p))
              },
              t => {
                ;(e.destroy(t), lc.nextTick(p, t))
              }
            ))
        else if (Dc(h, !0)) (f++, Uc(h, e, p, { end: c }))
        else if (Nc(h) || jc(h)) {
          let t = h.readable || h
          ;(f++, Uc(t, e, p, { end: c }))
        } else throw new bc(`AsyncIterable or Promise`, `destination`, h)
        h = e
        let { destroy: n, cleanup: r } = zc(h, !1, !0)
        ;(d.push(n), l && o.push(r))
      }
    else if (Ac(r)) {
      if (kc(h)) {
        f += 2
        let e = qc(h, r, p, { end: c })
        Oc(r) && l && o.push(e)
      } else if (jc(h) || Nc(h)) {
        let e = h.readable || h
        ;(f++, Uc(e, r, p, { end: c }))
      } else if (Dc(h)) (f++, Uc(h, r, p, { end: c }))
      else
        throw new yc(
          `val`,
          [`Readable`, `Iterable`, `AsyncIterable`, `ReadableStream`, `TransformStream`],
          h
        )
      h = r
    } else if (Mc(r)) {
      if (kc(h)) (f++, Wc(Vc(h), r, p, { end: c }))
      else if (Nc(h) || Dc(h)) (f++, Wc(h, r, p, { end: c }))
      else if (jc(h)) (f++, Wc(h.readable, r, p, { end: c }))
      else
        throw new yc(
          `val`,
          [`Readable`, `Iterable`, `AsyncIterable`, `ReadableStream`, `TransformStream`],
          h
        )
      h = r
    } else h = _c.from(r)
  }
  return (((i != null && i.aborted) || (a != null && a.aborted)) && lc.nextTick(s), h)
}
function qc(e, t, n, { end: r }) {
  let i = !1
  if (
    (t.on(`close`, () => {
      i || n(new Cc())
    }),
    e.pipe(t, { end: !1 }),
    r)
  ) {
    function n() {
      ;((i = !0), t.end())
    }
    Pc(e) ? lc.nextTick(n) : e.once(`end`, n)
  } else n()
  return (
    mc(e, { readable: !0, writable: !1 }, t => {
      let r = e._readableState
      t && t.code === `ERR_STREAM_PREMATURE_CLOSE` && r && r.ended && !r.errored && !r.errorEmitted
        ? e.once(`end`, n).once(`error`, n)
        : n(t)
    }),
    mc(t, { readable: !1, writable: !0 }, n)
  )
}
var Jc = { pipelineImpl: Kc, pipeline: Gc },
  { pipeline: Yc } = Jc,
  Xc = Js(),
  { destroyer: Zc } = Io,
  {
    isNodeStream: Qc,
    isReadable: $c,
    isWritable: el,
    isWebStream: tl,
    isTransformStream: nl,
    isWritableStream: rl,
    isReadableStream: il
  } = Da,
  {
    AbortError: al,
    codes: { ERR_INVALID_ARG_VALUE: ol, ERR_MISSING_ARGS: sl }
  } = Hr,
  cl = co,
  ll = function (...e) {
    if (e.length === 0) throw new sl(`streams`)
    if (e.length === 1) return Xc.from(e[0])
    let t = [...e]
    if (
      (typeof e[0] == `function` && (e[0] = Xc.from(e[0])), typeof e[e.length - 1] == `function`)
    ) {
      let t = e.length - 1
      e[t] = Xc.from(e[t])
    }
    for (let n = 0; n < e.length; ++n)
      if (!(!Qc(e[n]) && !tl(e[n]))) {
        if (n < e.length - 1 && !($c(e[n]) || il(e[n]) || nl(e[n])))
          throw new ol(`streams[${n}]`, t[n], `must be readable`)
        if (n > 0 && !(el(e[n]) || rl(e[n]) || nl(e[n])))
          throw new ol(`streams[${n}]`, t[n], `must be writable`)
      }
    let n, r, i, a, o
    function s(e) {
      let t = a
      ;((a = null), t ? t(e) : e ? o.destroy(e) : !d && !u && o.destroy())
    }
    let c = e[0],
      l = Yc(e, s),
      u = !!(el(c) || rl(c) || nl(c)),
      d = !!($c(l) || il(l) || nl(l))
    if (
      ((o = new Xc({
        writableObjectMode: !!(c != null && c.writableObjectMode),
        readableObjectMode: !!(l != null && l.readableObjectMode),
        writable: u,
        readable: d
      })),
      u)
    ) {
      if (Qc(c))
        ((o._write = function (e, t, r) {
          c.write(e, t) ? r() : (n = r)
        }),
          (o._final = function (e) {
            ;(c.end(), (r = e))
          }),
          c.on(`drain`, function () {
            if (n) {
              let e = n
              ;((n = null), e())
            }
          }))
      else if (tl(c)) {
        let e = (nl(c) ? c.writable : c).getWriter()
        ;((o._write = async function (t, n, r) {
          try {
            ;(await e.ready, e.write(t).catch(() => {}), r())
          } catch (e) {
            r(e)
          }
        }),
          (o._final = async function (t) {
            try {
              ;(await e.ready, e.close().catch(() => {}), (r = t))
            } catch (e) {
              t(e)
            }
          }))
      }
      cl(nl(l) ? l.readable : l, () => {
        if (r) {
          let e = r
          ;((r = null), e())
        }
      })
    }
    if (d) {
      if (Qc(l))
        (l.on(`readable`, function () {
          if (i) {
            let e = i
            ;((i = null), e())
          }
        }),
          l.on(`end`, function () {
            o.push(null)
          }),
          (o._read = function () {
            for (;;) {
              let e = l.read()
              if (e === null) {
                i = o._read
                return
              }
              if (!o.push(e)) return
            }
          }))
      else if (tl(l)) {
        let e = (nl(l) ? l.readable : l).getReader()
        o._read = async function () {
          for (;;)
            try {
              let { value: t, done: n } = await e.read()
              if (!o.push(t)) return
              if (n) {
                o.push(null)
                return
              }
            } catch {
              return
            }
        }
      }
    }
    return (
      (o._destroy = function (e, t) {
        ;(!e && a !== null && (e = new al()),
          (i = null),
          (n = null),
          (r = null),
          a === null ? t(e) : ((a = t), Qc(l) && Zc(l, e)))
      }),
      o
    )
  },
  ul = globalThis.AbortController || wr().AbortController,
  {
    codes: {
      ERR_INVALID_ARG_VALUE: dl,
      ERR_INVALID_ARG_TYPE: fl,
      ERR_MISSING_ARGS: pl,
      ERR_OUT_OF_RANGE: ml
    },
    AbortError: hl
  } = Hr,
  { validateAbortSignal: gl, validateInteger: _l, validateObject: vl } = Ui,
  yl = X.Symbol(`kWeak`),
  bl = X.Symbol(`kResistStopPropagation`),
  { finished: xl } = co,
  Sl = ll,
  { addAbortSignalNoValidate: Cl } = Wo,
  { isWritable: wl, isNodeStream: Tl } = Da,
  { deprecate: El } = Tr,
  {
    ArrayPrototypePush: Dl,
    Boolean: Ol,
    MathFloor: kl,
    Number: Al,
    NumberIsNaN: jl,
    Promise: Ml,
    PromiseReject: Nl,
    PromiseResolve: Pl,
    PromisePrototypeThen: Fl,
    Symbol: Il
  } = X,
  Ll = Il(`kEmpty`),
  Rl = Il(`kEof`)
function zl(e, t) {
  if (
    (t != null && vl(t, `options`),
    t?.signal != null && gl(t.signal, `options.signal`),
    Tl(e) && !wl(e))
  )
    throw new dl(`stream`, e, `must be writable`)
  let n = Sl(this, e)
  return (t != null && t.signal && Cl(t.signal, n), n)
}
function Bl(e, t) {
  if (typeof e != `function`) throw new fl(`fn`, [`Function`, `AsyncFunction`], e)
  ;(t != null && vl(t, `options`), t?.signal != null && gl(t.signal, `options.signal`))
  let n = 1
  t?.concurrency != null && (n = kl(t.concurrency))
  let r = n - 1
  return (
    t?.highWaterMark != null && (r = kl(t.highWaterMark)),
    _l(n, `options.concurrency`, 1),
    _l(r, `options.highWaterMark`, 0),
    (r += n),
    async function* () {
      let i = Tr.AbortSignalAny([t?.signal].filter(Ol)),
        a = this,
        o = [],
        s = { signal: i },
        c,
        l,
        u = !1,
        d = 0
      function f() {
        ;((u = !0), p())
      }
      function p() {
        ;(--d, m())
      }
      function m() {
        l && !u && d < n && o.length < r && (l(), (l = null))
      }
      async function h() {
        try {
          for await (let t of a) {
            if (u) return
            if (i.aborted) throw new hl()
            try {
              if (((t = e(t, s)), t === Ll)) continue
              t = Pl(t)
            } catch (e) {
              t = Nl(e)
            }
            ;((d += 1),
              Fl(t, p, f),
              o.push(t),
              (c &&= (c(), null)),
              !u &&
                (o.length >= r || d >= n) &&
                (await new Ml(e => {
                  l = e
                })))
          }
          o.push(Rl)
        } catch (e) {
          let t = Nl(e)
          ;(Fl(t, p, f), o.push(t))
        } finally {
          ;((u = !0), (c &&= (c(), null)))
        }
      }
      h()
      try {
        for (;;) {
          for (; o.length > 0; ) {
            let e = await o[0]
            if (e === Rl) return
            if (i.aborted) throw new hl()
            ;(e !== Ll && (yield e), o.shift(), m())
          }
          await new Ml(e => {
            c = e
          })
        }
      } finally {
        ;((u = !0), (l &&= (l(), null)))
      }
    }.call(this)
  )
}
function Vl(e = void 0) {
  return (
    e != null && vl(e, `options`),
    e?.signal != null && gl(e.signal, `options.signal`),
    async function* () {
      let t = 0
      for await (let r of this) {
        var n
        if (e != null && (n = e.signal) != null && n.aborted)
          throw new hl({ cause: e.signal.reason })
        yield [t++, r]
      }
    }.call(this)
  )
}
async function Hl(e, t = void 0) {
  for await (let n of Kl.call(this, e, t)) return !0
  return !1
}
async function Ul(e, t = void 0) {
  if (typeof e != `function`) throw new fl(`fn`, [`Function`, `AsyncFunction`], e)
  return !(await Hl.call(this, async (...t) => !(await e(...t)), t))
}
async function Wl(e, t) {
  for await (let n of Kl.call(this, e, t)) return n
}
async function Gl(e, t) {
  if (typeof e != `function`) throw new fl(`fn`, [`Function`, `AsyncFunction`], e)
  async function n(t, n) {
    return (await e(t, n), Ll)
  }
  for await (let e of Bl.call(this, n, t));
}
function Kl(e, t) {
  if (typeof e != `function`) throw new fl(`fn`, [`Function`, `AsyncFunction`], e)
  async function n(t, n) {
    return (await e(t, n)) ? t : Ll
  }
  return Bl.call(this, n, t)
}
var ql = class extends pl {
  constructor() {
    ;(super(`reduce`), (this.message = `Reduce of an empty stream requires an initial value`))
  }
}
async function Jl(e, t, n) {
  var r
  if (typeof e != `function`) throw new fl(`reducer`, [`Function`, `AsyncFunction`], e)
  ;(n != null && vl(n, `options`), n?.signal != null && gl(n.signal, `options.signal`))
  let i = arguments.length > 1
  if (n != null && (r = n.signal) != null && r.aborted) {
    let e = new hl(void 0, { cause: n.signal.reason })
    throw (this.once(`error`, () => {}), await xl(this.destroy(e)), e)
  }
  let a = new ul(),
    o = a.signal
  if (n != null && n.signal) {
    let e = { once: !0, [yl]: this, [bl]: !0 }
    n.signal.addEventListener(`abort`, () => a.abort(), e)
  }
  let s = !1
  try {
    for await (let r of this) {
      var c
      if (((s = !0), n != null && (c = n.signal) != null && c.aborted)) throw new hl()
      i ? (t = await e(t, r, { signal: o })) : ((t = r), (i = !0))
    }
    if (!s && !i) throw new ql()
  } finally {
    a.abort()
  }
  return t
}
async function Yl(e) {
  ;(e != null && vl(e, `options`), e?.signal != null && gl(e.signal, `options.signal`))
  let t = []
  for await (let r of this) {
    var n
    if (e != null && (n = e.signal) != null && n.aborted)
      throw new hl(void 0, { cause: e.signal.reason })
    Dl(t, r)
  }
  return t
}
function Xl(e, t) {
  let n = Bl.call(this, e, t)
  return async function* () {
    for await (let e of n) yield* e
  }.call(this)
}
function Zl(e) {
  if (((e = Al(e)), jl(e))) return 0
  if (e < 0) throw new ml(`number`, `>= 0`, e)
  return e
}
function Ql(e, t = void 0) {
  return (
    t != null && vl(t, `options`),
    t?.signal != null && gl(t.signal, `options.signal`),
    (e = Zl(e)),
    async function* () {
      var n
      if (t != null && (n = t.signal) != null && n.aborted) throw new hl()
      for await (let n of this) {
        var r
        if (t != null && (r = t.signal) != null && r.aborted) throw new hl()
        e-- <= 0 && (yield n)
      }
    }.call(this)
  )
}
function $l(e, t = void 0) {
  return (
    t != null && vl(t, `options`),
    t?.signal != null && gl(t.signal, `options.signal`),
    (e = Zl(e)),
    async function* () {
      var n
      if (t != null && (n = t.signal) != null && n.aborted) throw new hl()
      for await (let n of this) {
        var r
        if (t != null && (r = t.signal) != null && r.aborted) throw new hl()
        if ((e-- > 0 && (yield n), e <= 0)) return
      }
    }.call(this)
  )
}
;((Er.streamReturningOperators = {
  asIndexedPairs: El(Vl, `readable.asIndexedPairs will be removed in a future version.`),
  drop: Ql,
  filter: Kl,
  flatMap: Xl,
  map: Bl,
  take: $l,
  compose: zl
}),
  (Er.promiseReturningOperators = {
    every: Ul,
    forEach: Gl,
    reduce: Jl,
    toArray: Yl,
    some: Hl,
    find: Wl
  }))
var eu, tu
function nu() {
  if (tu) return eu
  tu = 1
  let { ArrayPrototypePop: e, Promise: t } = X,
    { isIterable: n, isNodeStream: r, isWebStream: i } = Da,
    { pipelineImpl: a } = Jc,
    { finished: o } = co
  iu()
  function s(...o) {
    return new t((t, s) => {
      let c,
        l,
        u = o[o.length - 1]
      if (u && typeof u == `object` && !r(u) && !n(u) && !i(u)) {
        let t = e(o)
        ;((c = t.signal), (l = t.end))
      }
      a(
        o,
        (e, n) => {
          e ? s(e) : t(n)
        },
        { signal: c, end: l }
      )
    })
  }
  return ((eu = { finished: o, pipeline: s }), eu)
}
var ru
function iu() {
  if (ru) return br.exports
  ru = 1
  let { Buffer: e } = S,
    { ObjectDefineProperty: t, ObjectKeys: n, ReflectApply: r } = X,
    {
      promisify: { custom: i }
    } = Tr,
    { streamReturningOperators: a, promiseReturningOperators: o } = Er,
    {
      codes: { ERR_ILLEGAL_CONSTRUCTOR: s }
    } = Hr,
    c = ll,
    { setDefaultHighWaterMark: l, getDefaultHighWaterMark: u } = cs,
    { pipeline: d } = Jc,
    { destroyer: f } = Io,
    p = co,
    m = nu(),
    h = Da,
    g = (br.exports = Ho.Stream)
  ;((g.isDestroyed = h.isDestroyed),
    (g.isDisturbed = h.isDisturbed),
    (g.isErrored = h.isErrored),
    (g.isReadable = h.isReadable),
    (g.isWritable = h.isWritable),
    (g.Readable = zs()))
  for (let e of n(a)) {
    let n = a[e]
    function i(...e) {
      if (new.target) throw s()
      return g.Readable.from(r(n, this, e))
    }
    ;(t(i, `name`, { __proto__: null, value: n.name }),
      t(i, `length`, { __proto__: null, value: n.length }),
      t(g.Readable.prototype, e, {
        __proto__: null,
        value: i,
        enumerable: !1,
        configurable: !0,
        writable: !0
      }))
  }
  for (let e of n(o)) {
    let n = o[e]
    function i(...e) {
      if (new.target) throw s()
      return r(n, this, e)
    }
    ;(t(i, `name`, { __proto__: null, value: n.name }),
      t(i, `length`, { __proto__: null, value: n.length }),
      t(g.Readable.prototype, e, {
        __proto__: null,
        value: i,
        enumerable: !1,
        configurable: !0,
        writable: !0
      }))
  }
  ;((g.Writable = Hs()),
    (g.Duplex = Js()),
    (g.Transform = Zs),
    (g.PassThrough = oc),
    (g.pipeline = d))
  let { addAbortSignal: _ } = Wo
  return (
    (g.addAbortSignal = _),
    (g.finished = p),
    (g.destroy = f),
    (g.compose = c),
    (g.setDefaultHighWaterMark = l),
    (g.getDefaultHighWaterMark = u),
    t(g, `promises`, {
      __proto__: null,
      configurable: !0,
      enumerable: !0,
      get() {
        return m
      }
    }),
    t(d, i, {
      __proto__: null,
      enumerable: !0,
      get() {
        return m.pipeline
      }
    }),
    t(p, i, {
      __proto__: null,
      enumerable: !0,
      get() {
        return m.finished
      }
    }),
    (g.Stream = g),
    (g._isUint8Array = function (e) {
      return e instanceof Uint8Array
    }),
    (g._uint8ArrayToBuffer = function (t) {
      return e.from(t.buffer, t.byteOffset, t.byteLength)
    }),
    br.exports
  )
}
;(function (e) {
  let t = iu(),
    n = nu(),
    r = t.Readable.destroy
  ;((e.exports = t.Readable),
    (e.exports._uint8ArrayToBuffer = t._uint8ArrayToBuffer),
    (e.exports._isUint8Array = t._isUint8Array),
    (e.exports.isDisturbed = t.isDisturbed),
    (e.exports.isErrored = t.isErrored),
    (e.exports.isReadable = t.isReadable),
    (e.exports.Readable = t.Readable),
    (e.exports.Writable = t.Writable),
    (e.exports.Duplex = t.Duplex),
    (e.exports.Transform = t.Transform),
    (e.exports.PassThrough = t.PassThrough),
    (e.exports.addAbortSignal = t.addAbortSignal),
    (e.exports.finished = t.finished),
    (e.exports.destroy = t.destroy),
    (e.exports.destroy = r),
    (e.exports.pipeline = t.pipeline),
    (e.exports.compose = t.compose),
    Object.defineProperty(t, `promises`, {
      configurable: !0,
      enumerable: !0,
      get() {
        return n
      }
    }),
    (e.exports.Stream = t.Stream),
    (e.exports.default = e.exports))
})(yr)
var au = yr.exports,
  ou = {},
  su =
    (i && i.__spreadArray) ||
    function (e, t, n) {
      if (n || arguments.length === 2)
        for (var r = 0, i = t.length, a; r < i; r++)
          (a || !(r in t)) && ((a ||= Array.prototype.slice.call(t, 0, r)), (a[r] = t[r]))
      return e.concat(a || Array.prototype.slice.call(t))
    }
;(Object.defineProperty(ou, `__esModule`, { value: !0 }), (ou.FileHandle = void 0))
function $(e, t, n) {
  return (
    n === void 0 &&
      (n = function (e) {
        return e
      }),
    function () {
      var r = [...arguments]
      return new Promise(function (i, a) {
        e[t].bind(e).apply(
          void 0,
          su(
            su([], r, !1),
            [
              function (e, t) {
                return e ? a(e) : i(n(t))
              }
            ],
            !1
          )
        )
      })
    }
  )
}
var cu = (function () {
  function e(e, t) {
    ;((this.vol = e), (this.fd = t))
  }
  return (
    (e.prototype.appendFile = function (e, t) {
      return $(this.vol, `appendFile`)(this.fd, e, t)
    }),
    (e.prototype.chmod = function (e) {
      return $(this.vol, `fchmod`)(this.fd, e)
    }),
    (e.prototype.chown = function (e, t) {
      return $(this.vol, `fchown`)(this.fd, e, t)
    }),
    (e.prototype.close = function () {
      return $(this.vol, `close`)(this.fd)
    }),
    (e.prototype.datasync = function () {
      return $(this.vol, `fdatasync`)(this.fd)
    }),
    (e.prototype.read = function (e, t, n, r) {
      return $(this.vol, `read`, function (t) {
        return { bytesRead: t, buffer: e }
      })(this.fd, e, t, n, r)
    }),
    (e.prototype.readFile = function (e) {
      return $(this.vol, `readFile`)(this.fd, e)
    }),
    (e.prototype.stat = function (e) {
      return $(this.vol, `fstat`)(this.fd, e)
    }),
    (e.prototype.sync = function () {
      return $(this.vol, `fsync`)(this.fd)
    }),
    (e.prototype.truncate = function (e) {
      return $(this.vol, `ftruncate`)(this.fd, e)
    }),
    (e.prototype.utimes = function (e, t) {
      return $(this.vol, `futimes`)(this.fd, e, t)
    }),
    (e.prototype.write = function (e, t, n, r) {
      return $(this.vol, `write`, function (t) {
        return { bytesWritten: t, buffer: e }
      })(this.fd, e, t, n, r)
    }),
    (e.prototype.writeFile = function (e, t) {
      return $(this.vol, `writeFile`)(this.fd, e, t)
    }),
    e
  )
})()
ou.FileHandle = cu
function lu(e) {
  return typeof Promise > `u`
    ? null
    : {
        FileHandle: cu,
        access: function (t, n) {
          return $(e, `access`)(t, n)
        },
        appendFile: function (t, n, r) {
          return $(e, `appendFile`)(t instanceof cu ? t.fd : t, n, r)
        },
        chmod: function (t, n) {
          return $(e, `chmod`)(t, n)
        },
        chown: function (t, n, r) {
          return $(e, `chown`)(t, n, r)
        },
        copyFile: function (t, n, r) {
          return $(e, `copyFile`)(t, n, r)
        },
        lchmod: function (t, n) {
          return $(e, `lchmod`)(t, n)
        },
        lchown: function (t, n, r) {
          return $(e, `lchown`)(t, n, r)
        },
        link: function (t, n) {
          return $(e, `link`)(t, n)
        },
        lstat: function (t, n) {
          return $(e, `lstat`)(t, n)
        },
        mkdir: function (t, n) {
          return $(e, `mkdir`)(t, n)
        },
        mkdtemp: function (t, n) {
          return $(e, `mkdtemp`)(t, n)
        },
        open: function (t, n, r) {
          return $(e, `open`, function (t) {
            return new cu(e, t)
          })(t, n, r)
        },
        readdir: function (t, n) {
          return $(e, `readdir`)(t, n)
        },
        readFile: function (t, n) {
          return $(e, `readFile`)(t instanceof cu ? t.fd : t, n)
        },
        readlink: function (t, n) {
          return $(e, `readlink`)(t, n)
        },
        realpath: function (t, n) {
          return $(e, `realpath`)(t, n)
        },
        rename: function (t, n) {
          return $(e, `rename`)(t, n)
        },
        rmdir: function (t) {
          return $(e, `rmdir`)(t)
        },
        rm: function (t, n) {
          return $(e, `rm`)(t, n)
        },
        stat: function (t, n) {
          return $(e, `stat`)(t, n)
        },
        symlink: function (t, n, r) {
          return $(e, `symlink`)(t, n, r)
        },
        truncate: function (t, n) {
          return $(e, `truncate`)(t, n)
        },
        unlink: function (t) {
          return $(e, `unlink`)(t)
        },
        utimes: function (t, n, r) {
          return $(e, `utimes`)(t, n, r)
        },
        writeFile: function (t, n, r) {
          return $(e, `writeFile`)(t instanceof cu ? t.fd : t, n, r)
        }
      }
}
ou.default = lu
var uu = {},
  du
function fu() {
  if (du) return uu
  if (((du = 1), typeof URL > `u`)) throw Error(`URL is not supported in this environment`)
  return ((uu.URL = URL), uu)
}
var pu = {},
  mu
function hu() {
  if (mu) return pu
  ;((mu = 1),
    Object.defineProperty(pu, `__esModule`, { value: !0 }),
    (pu.correctPath = a),
    (pu.unixify = i))
  var e = z.platform === `win32`
  function t(e) {
    var t = e.length - 1
    if (t < 2) return e
    for (; n(e, t); ) t--
    return e.substr(0, t + 1)
  }
  function n(t, n) {
    var r = t[n]
    return n > 0 && (r === `/` || (e && r === `\\`))
  }
  function r(e, n) {
    if (typeof e != `string`) throw TypeError(`expected a string`)
    return ((e = e.replace(/[\\\/]+/g, `/`)), n !== !1 && (e = t(e)), e)
  }
  function i(t) {
    var n = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0
    return e ? ((t = r(t, n)), t.replace(/^([a-zA-Z]+:|\.\/)/, ``)) : t
  }
  function a(e) {
    return i(e.replace(/^\\\\\?\\.:\\/, `\\`))
  }
  return pu
}
;(function (e) {
  var t =
      (i && i.__extends) ||
      (function () {
        var e = function (t, n) {
          return (
            (e =
              Object.setPrototypeOf ||
              ({ __proto__: [] } instanceof Array &&
                function (e, t) {
                  e.__proto__ = t
                }) ||
              function (e, t) {
                for (var n in t) Object.prototype.hasOwnProperty.call(t, n) && (e[n] = t[n])
              }),
            e(t, n)
          )
        }
        return function (t, n) {
          if (typeof n != `function` && n !== null)
            throw TypeError(`Class extends value ` + String(n) + ` is not a constructor or null`)
          e(t, n)
          function r() {
            this.constructor = t
          }
          t.prototype = n === null ? Object.create(n) : ((r.prototype = n.prototype), new r())
        }
      })(),
    n =
      (i && i.__spreadArray) ||
      function (e, t, n) {
        if (n || arguments.length === 2)
          for (var r = 0, i = t.length, a; r < i; r++)
            (a || !(r in t)) && ((a ||= Array.prototype.slice.call(t, 0, r)), (a[r] = t[r]))
        return e.concat(a || Array.prototype.slice.call(t))
      }
  ;(Object.defineProperty(e, `__esModule`, { value: !0 }),
    (e.FSWatcher =
      e.StatWatcher =
      e.Volume =
      e.toUnixTimestamp =
      e.bufferToEncoding =
      e.dataToBuffer =
      e.dataToStr =
      e.pathToSteps =
      e.filenameToSteps =
      e.pathToFilename =
      e.flagsToNumber =
      e.FLAGS =
        void 0))
  var r = Wn,
    a = Gn,
    o = s,
    l = b,
    u = x,
    d = qn,
    f = Kn,
    p = _r,
    m = au,
    h = c,
    g = gr,
    _ = te,
    v = ne,
    y = B,
    ee = ou,
    S = r.resolve,
    C = h.constants.O_RDONLY,
    w = h.constants.O_WRONLY,
    T = h.constants.O_RDWR,
    E = h.constants.O_CREAT,
    D = h.constants.O_EXCL,
    O = h.constants.O_TRUNC,
    k = h.constants.O_APPEND,
    A = h.constants.O_SYNC,
    j = h.constants.O_DIRECTORY,
    re = h.constants.F_OK,
    M = h.constants.COPYFILE_EXCL,
    N = h.constants.COPYFILE_FICLONE_FORCE,
    P = r.posix ? r.posix : r,
    F = P.sep,
    I = P.relative,
    L = P.join,
    ie = P.dirname,
    R = f.default.platform === `win32`,
    ae = 128,
    z = {
      PATH_STR: `path must be a string or Buffer`,
      FD: `fd must be a file descriptor`,
      MODE_INT: `mode must be an int`,
      CB: `callback must be a function`,
      UID: `uid must be an unsigned int`,
      GID: `gid must be an unsigned int`,
      LEN: `len must be an integer`,
      ATIME: `atime must be an integer`,
      MTIME: `mtime must be an integer`,
      PREFIX: `filename prefix is required`,
      BUFFER: `buffer must be an instance of Buffer or StaticBuffer`,
      OFFSET: `offset must be an integer`,
      LENGTH: `length must be an integer`,
      POSITION: `position must be an integer`
    },
    oe = function (e) {
      return `Expected options to be either an object or a string, but got ${e} instead`
    },
    V = `ENOENT`,
    se = `EBADF`,
    ce = `EINVAL`,
    le = `EPERM`,
    ue = `EPROTO`,
    de = `EEXIST`,
    fe = `ENOTDIR`,
    pe = `EMFILE`,
    me = `EACCES`,
    he = `EISDIR`,
    ge = `ENOTEMPTY`,
    _e = `ENOSYS`,
    ve = `ERR_FS_EISDIR`
  function ye(e, t, n, r) {
    ;(t === void 0 && (t = ``), n === void 0 && (n = ``), r === void 0 && (r = ``))
    var i = ``
    switch ((n && (i = ` '${n}'`), r && (i += ` -> '${r}'`), e)) {
      case V:
        return `ENOENT: no such file or directory, ${t}${i}`
      case se:
        return `EBADF: bad file descriptor, ${t}${i}`
      case ce:
        return `EINVAL: invalid argument, ${t}${i}`
      case le:
        return `EPERM: operation not permitted, ${t}${i}`
      case ue:
        return `EPROTO: protocol error, ${t}${i}`
      case de:
        return `EEXIST: file already exists, ${t}${i}`
      case fe:
        return `ENOTDIR: not a directory, ${t}${i}`
      case he:
        return `EISDIR: illegal operation on a directory, ${t}${i}`
      case me:
        return `EACCES: permission denied, ${t}${i}`
      case ge:
        return `ENOTEMPTY: directory not empty, ${t}${i}`
      case pe:
        return `EMFILE: too many open files, ${t}${i}`
      case _e:
        return `ENOSYS: function not implemented, ${t}${i}`
      case ve:
        return `[ERR_FS_EISDIR]: Path is a directory: ${t} returned EISDIR (is a directory) ${n}`
      default:
        return `${e}: error occurred, ${t}${i}`
    }
  }
  function H(e, t, n, r, i) {
    ;(t === void 0 && (t = ``),
      n === void 0 && (n = ``),
      r === void 0 && (r = ``),
      i === void 0 && (i = Error))
    var a = new i(ye(e, t, n, r))
    return ((a.code = e), n && (a.path = n), a)
  }
  var U
  ;(function (e) {
    ;((e[(e.r = C)] = `r`),
      (e[(e[`r+`] = T)] = `r+`),
      (e[(e.rs = C | A)] = `rs`),
      (e[(e.sr = e.rs)] = `sr`),
      (e[(e[`rs+`] = T | A)] = `rs+`),
      (e[(e[`sr+`] = e[`rs+`])] = `sr+`),
      (e[(e.w = w | E | O)] = `w`),
      (e[(e.wx = w | E | O | D)] = `wx`),
      (e[(e.xw = e.wx)] = `xw`),
      (e[(e[`w+`] = T | E | O)] = `w+`),
      (e[(e[`wx+`] = T | E | O | D)] = `wx+`),
      (e[(e[`xw+`] = e[`wx+`])] = `xw+`),
      (e[(e.a = w | k | E)] = `a`),
      (e[(e.ax = w | k | E | D)] = `ax`),
      (e[(e.xa = e.ax)] = `xa`),
      (e[(e[`a+`] = T | k | E)] = `a+`),
      (e[(e[`ax+`] = T | k | E | D)] = `ax+`),
      (e[(e[`xa+`] = e[`ax+`])] = `xa+`))
  })((U = e.FLAGS ||= {}))
  function be(e) {
    if (typeof e == `number`) return e
    if (typeof e == `string`) {
      var t = U[e]
      if (t !== void 0) return t
    }
    throw new v.TypeError(`ERR_INVALID_OPT_VALUE`, `flags`, e)
  }
  e.flagsToNumber = be
  function xe(e, t) {
    var n
    if (t) {
      var r = typeof t
      switch (r) {
        case `string`:
          n = Object.assign({}, e, { encoding: t })
          break
        case `object`:
          n = Object.assign({}, e, t)
          break
        default:
          throw TypeError(oe(r))
      }
    } else return e
    return (n.encoding !== `buffer` && (0, _.assertEncoding)(n.encoding), n)
  }
  function Se(e) {
    return function (t) {
      return xe(e, t)
    }
  }
  function W(e) {
    if (typeof e != `function`) throw TypeError(z.CB)
    return e
  }
  function G(e) {
    return function (t, n) {
      return typeof t == `function` ? [e(), t] : [e(t), W(n)]
    }
  }
  var Ce = { encoding: `utf8` },
    we = Se(Ce),
    Te = G(we),
    Ee = Se({ flag: `r` }),
    De = { encoding: `utf8`, mode: 438, flag: U[U.w] },
    Oe = Se(De),
    ke = { encoding: `utf8`, mode: 438, flag: U[U.a] },
    Ae = Se(ke),
    je = G(Ae),
    K = Se(Ce),
    Me = G(K),
    Ne = { mode: 511, recursive: !1 },
    Pe = function (e) {
      return typeof e == `number` ? Object.assign({}, Ne, { mode: e }) : Object.assign({}, Ne, e)
    },
    Fe = { recursive: !1 },
    Ie = function (e) {
      return Object.assign({}, Fe, e)
    },
    Le = G(Se(Ce)),
    Re = Se({ encoding: `utf8`, withFileTypes: !1 }),
    ze = G(Re),
    Be = { bigint: !1 },
    Ve = function (e) {
      return (e === void 0 && (e = {}), Object.assign({}, Be, e))
    },
    He = function (e, t) {
      return typeof e == `function` ? [Ve(), e] : [Ve(e), W(t)]
    }
  function Ue(e) {
    if (e.hostname !== ``) throw new v.TypeError(`ERR_INVALID_FILE_URL_HOST`, f.default.platform)
    for (var t = e.pathname, n = 0; n < t.length; n++)
      if (t[n] === `%`) {
        var r = t.codePointAt(n + 2) | 32
        if (t[n + 1] === `2` && r === 102)
          throw new v.TypeError(
            `ERR_INVALID_FILE_URL_PATH`,
            `must not include encoded / characters`
          )
      }
    return decodeURIComponent(t)
  }
  function q(e) {
    if (typeof e != `string` && !u.Buffer.isBuffer(e)) {
      try {
        if (!(e instanceof fu().URL)) throw TypeError(z.PATH_STR)
      } catch {
        throw TypeError(z.PATH_STR)
      }
      e = Ue(e)
    }
    var t = String(e)
    return (Ze(t), t)
  }
  e.pathToFilename = q
  var We = function (e, t) {
    return (t === void 0 && (t = f.default.cwd()), S(t, e))
  }
  if (R) {
    var Ge = We,
      Ke = hu().unixify
    We = function (e, t) {
      return Ke(Ge(e, t))
    }
  }
  function J(e, t) {
    var n = We(e, t).substring(1)
    return n ? n.split(F) : []
  }
  e.filenameToSteps = J
  function qe(e) {
    return J(q(e))
  }
  e.pathToSteps = qe
  function Je(e, t) {
    return (
      t === void 0 && (t = _.ENCODING_UTF8),
      u.Buffer.isBuffer(e)
        ? e.toString(t)
        : e instanceof Uint8Array
          ? (0, u.bufferFrom)(e).toString(t)
          : String(e)
    )
  }
  e.dataToStr = Je
  function Ye(e, t) {
    return (
      t === void 0 && (t = _.ENCODING_UTF8),
      u.Buffer.isBuffer(e)
        ? e
        : e instanceof Uint8Array
          ? (0, u.bufferFrom)(e)
          : (0, u.bufferFrom)(String(e), t)
    )
  }
  e.dataToBuffer = Ye
  function Xe(e, t) {
    return !t || t === `buffer` ? e : e.toString(t)
  }
  e.bufferToEncoding = Xe
  function Ze(e, t) {
    if ((`` + e).indexOf(`\0`) !== -1) {
      var n = Error(`Path must be a string without null bytes`)
      if (((n.code = V), typeof t != `function`)) throw n
      return (f.default.nextTick(t, n), !1)
    }
    return !0
  }
  function Qe(e, t) {
    if (typeof e == `number`) return e
    if (typeof e == `string`) return parseInt(e, 8)
    if (t) return $e(t)
  }
  function $e(e, t) {
    var n = Qe(e, t)
    if (typeof n != `number` || isNaN(n)) throw TypeError(z.MODE_INT)
    return n
  }
  function et(e) {
    return e >>> 0 === e
  }
  function tt(e) {
    if (!et(e)) throw TypeError(z.FD)
  }
  function nt(e) {
    if (typeof e == `string` && +e == e) return +e
    if (e instanceof Date) return e.getTime() / 1e3
    if (isFinite(e)) return e < 0 ? Date.now() / 1e3 : e
    throw Error(`Cannot parse time: ` + e)
  }
  e.toUnixTimestamp = nt
  function rt(e) {
    if (typeof e != `number`) throw TypeError(z.UID)
  }
  function it(e) {
    if (typeof e != `number`) throw TypeError(z.GID)
  }
  function at(e) {
    var t = {}
    function n(e, r) {
      for (var i in r) {
        var a = r[i],
          o = L(e, i)
        typeof a == `string`
          ? (t[o] = a)
          : typeof a == `object` && a && Object.keys(a).length > 0
            ? n(o, a)
            : (t[o] = null)
      }
    }
    return (n(``, e), t)
  }
  e.Volume = (function () {
    function e(e) {
      ;(e === void 0 && (e = {}),
        (this.ino = 0),
        (this.inodes = {}),
        (this.releasedInos = []),
        (this.fds = {}),
        (this.releasedFds = []),
        (this.maxFiles = 1e4),
        (this.openFiles = 0),
        (this.promisesApi = (0, ee.default)(this)),
        (this.statWatchers = {}),
        (this.props = Object.assign({ Node: a.Node, Link: a.Link, File: a.File }, e)))
      var r = this.createLink()
      r.setNode(this.createNode(!0))
      var i = this
      ;((this.StatWatcher = (function (e) {
        t(n, e)
        function n() {
          return e.call(this, i) || this
        }
        return n
      })(st)),
        (this.ReadStream = (function (e) {
          t(r, e)
          function r() {
            var t = [...arguments]
            return e.apply(this, n([i], t, !1)) || this
          }
          return r
        })(ut)),
        (this.WriteStream = (function (e) {
          t(r, e)
          function r() {
            var t = [...arguments]
            return e.apply(this, n([i], t, !1)) || this
          }
          return r
        })(ft)),
        (this.FSWatcher = (function (e) {
          t(n, e)
          function n() {
            return e.call(this, i) || this
          }
          return n
        })(pt)),
        r.setChild(`.`, r),
        r.getNode().nlink++,
        r.setChild(`..`, r),
        r.getNode().nlink++,
        (this.root = r))
    }
    return (
      (e.fromJSON = function (t, n) {
        var r = new e()
        return (r.fromJSON(t, n), r)
      }),
      (e.fromNestedJSON = function (t, n) {
        var r = new e()
        return (r.fromNestedJSON(t, n), r)
      }),
      Object.defineProperty(e.prototype, `promises`, {
        get: function () {
          if (this.promisesApi === null)
            throw Error(`Promise is not supported in this environment.`)
          return this.promisesApi
        },
        enumerable: !1,
        configurable: !0
      }),
      (e.prototype.createLink = function (e, t, n, r) {
        if ((n === void 0 && (n = !1), !e)) return new this.props.Link(this, null, ``)
        if (!t) throw Error(`createLink: name cannot be empty`)
        return e.createChild(t, this.createNode(n, r))
      }),
      (e.prototype.deleteLink = function (e) {
        var t = e.parent
        return t ? (t.deleteChild(e), !0) : !1
      }),
      (e.prototype.newInoNumber = function () {
        return this.releasedInos.pop() || ((this.ino = (this.ino + 1) % 4294967295), this.ino)
      }),
      (e.prototype.newFdNumber = function () {
        var t = this.releasedFds.pop()
        return typeof t == `number` ? t : e.fd--
      }),
      (e.prototype.createNode = function (e, t) {
        e === void 0 && (e = !1)
        var n = new this.props.Node(this.newInoNumber(), t)
        return (e && n.setIsDirectory(), (this.inodes[n.ino] = n), n)
      }),
      (e.prototype.getNode = function (e) {
        return this.inodes[e]
      }),
      (e.prototype.deleteNode = function (e) {
        ;(e.del(), delete this.inodes[e.ino], this.releasedInos.push(e.ino))
      }),
      (e.prototype.genRndStr = function () {
        var e = (Math.random() + 1).toString(36).substring(2, 8)
        return e.length === 6 ? e : this.genRndStr()
      }),
      (e.prototype.getLink = function (e) {
        return this.root.walk(e)
      }),
      (e.prototype.getLinkOrThrow = function (e, t) {
        var n = J(e),
          r = this.getLink(n)
        if (!r) throw H(V, t, e)
        return r
      }),
      (e.prototype.getResolvedLink = function (e) {
        for (var t = typeof e == `string` ? J(e) : e, n = this.root, r = 0; r < t.length; ) {
          var i = t[r]
          if (((n = n.getChild(i)), !n)) return null
          var a = n.getNode()
          if (a.isSymlink()) {
            ;((t = a.symlink.concat(t.slice(r + 1))), (n = this.root), (r = 0))
            continue
          }
          r++
        }
        return n
      }),
      (e.prototype.getResolvedLinkOrThrow = function (e, t) {
        var n = this.getResolvedLink(e)
        if (!n) throw H(V, t, e)
        return n
      }),
      (e.prototype.resolveSymlinks = function (e) {
        return this.getResolvedLink(e.steps.slice(1))
      }),
      (e.prototype.getLinkAsDirOrThrow = function (e, t) {
        var n = this.getLinkOrThrow(e, t)
        if (!n.getNode().isDirectory()) throw H(fe, t, e)
        return n
      }),
      (e.prototype.getLinkParent = function (e) {
        return this.root.walk(e, e.length - 1)
      }),
      (e.prototype.getLinkParentAsDirOrThrow = function (e, t) {
        var n = e instanceof Array ? e : J(e),
          r = this.getLinkParent(n)
        if (!r) throw H(V, t, F + n.join(F))
        if (!r.getNode().isDirectory()) throw H(fe, t, F + n.join(F))
        return r
      }),
      (e.prototype.getFileByFd = function (e) {
        return this.fds[String(e)]
      }),
      (e.prototype.getFileByFdOrThrow = function (e, t) {
        if (!et(e)) throw TypeError(z.FD)
        var n = this.getFileByFd(e)
        if (!n) throw H(se, t)
        return n
      }),
      (e.prototype.wrapAsync = function (e, t, n) {
        var r = this
        ;(W(n),
          (0, d.default)(function () {
            var i
            try {
              i = e.apply(r, t)
            } catch (e) {
              n(e)
              return
            }
            n(null, i)
          }))
      }),
      (e.prototype._toJSON = function (e, t, n) {
        var r
        ;(e === void 0 && (e = this.root), t === void 0 && (t = {}))
        var i = !0,
          a = e.children
        for (var o in (e.getNode().isFile() &&
          ((a = ((r = {}), (r[e.getName()] = e.parent.getChild(e.getName())), r)), (e = e.parent)),
        a))
          if (!(o === `.` || o === `..`)) {
            i = !1
            var s = e.getChild(o)
            if (!s) throw Error(`_toJSON: unexpected undefined`)
            var c = s.getNode()
            if (c.isFile()) {
              var l = s.getPath()
              ;(n && (l = I(n, l)), (t[l] = c.getString()))
            } else c.isDirectory() && this._toJSON(s, t, n)
          }
        var u = e.getPath()
        return (n && (u = I(n, u)), u && i && (t[u] = null), t)
      }),
      (e.prototype.toJSON = function (e, t, n) {
        ;(t === void 0 && (t = {}), n === void 0 && (n = !1))
        var r = []
        if (e) {
          e instanceof Array || (e = [e])
          for (var i = 0, a = e; i < a.length; i++) {
            var o = a[i],
              s = q(o),
              c = this.getResolvedLink(s)
            c && r.push(c)
          }
        } else r.push(this.root)
        if (!r.length) return t
        for (var l = 0, u = r; l < u.length; l++) {
          var c = u[l]
          this._toJSON(c, t, n ? c.getPath() : ``)
        }
        return t
      }),
      (e.prototype.fromJSON = function (e, t) {
        for (var n in (t === void 0 && (t = f.default.cwd()), e)) {
          var r = e[n]
          if (((n = We(n, t)), typeof r == `string`)) {
            var i = ie(n)
            ;(this.mkdirpBase(i, 511), this.writeFileSync(n, r))
          } else this.mkdirpBase(n, 511)
        }
      }),
      (e.prototype.fromNestedJSON = function (e, t) {
        this.fromJSON(at(e), t)
      }),
      (e.prototype.reset = function () {
        ;((this.ino = 0),
          (this.inodes = {}),
          (this.releasedInos = []),
          (this.fds = {}),
          (this.releasedFds = []),
          (this.openFiles = 0),
          (this.root = this.createLink()),
          this.root.setNode(this.createNode(!0)))
      }),
      (e.prototype.mountSync = function (e, t) {
        this.fromJSON(t, e)
      }),
      (e.prototype.openLink = function (e, t, n) {
        if ((n === void 0 && (n = !0), this.openFiles >= this.maxFiles))
          throw H(pe, `open`, e.getPath())
        var r = e
        if ((n && (r = this.resolveSymlinks(e)), !r)) throw H(V, `open`, e.getPath())
        var i = r.getNode()
        if (i.isDirectory()) {
          if ((t & (C | T | w)) !== C) throw H(he, `open`, e.getPath())
        } else if (t & j) throw H(fe, `open`, e.getPath())
        if (!(t & w) && !i.canRead()) throw H(me, `open`, e.getPath())
        var a = new this.props.File(e, i, t, this.newFdNumber())
        return ((this.fds[a.fd] = a), this.openFiles++, t & O && a.truncate(), a)
      }),
      (e.prototype.openFile = function (e, t, n, r) {
        r === void 0 && (r = !0)
        var i = J(e),
          a = r ? this.getResolvedLink(i) : this.getLink(i)
        if (a && t & D) throw H(de, `open`, e)
        if (!a && t & E) {
          var o = this.getResolvedLink(i.slice(0, i.length - 1))
          if (!o) throw H(V, `open`, F + i.join(F))
          t & E && typeof n == `number` && (a = this.createLink(o, i[i.length - 1], !1, n))
        }
        if (a) return this.openLink(a, t, r)
        throw H(V, `open`, e)
      }),
      (e.prototype.openBase = function (e, t, n, r) {
        r === void 0 && (r = !0)
        var i = this.openFile(e, t, n, r)
        if (!i) throw H(V, `open`, e)
        return i.fd
      }),
      (e.prototype.openSync = function (e, t, n) {
        n === void 0 && (n = 438)
        var r = $e(n),
          i = q(e),
          a = be(t)
        return this.openBase(i, a, r)
      }),
      (e.prototype.open = function (e, t, n, r) {
        var i = n,
          a = r
        ;(typeof n == `function` && ((i = 438), (a = n)), (i ||= 438))
        var o = $e(i),
          s = q(e),
          c = be(t)
        this.wrapAsync(this.openBase, [s, c, o], a)
      }),
      (e.prototype.closeFile = function (e) {
        this.fds[e.fd] && (this.openFiles--, delete this.fds[e.fd], this.releasedFds.push(e.fd))
      }),
      (e.prototype.closeSync = function (e) {
        tt(e)
        var t = this.getFileByFdOrThrow(e, `close`)
        this.closeFile(t)
      }),
      (e.prototype.close = function (e, t) {
        ;(tt(e), this.wrapAsync(this.closeSync, [e], t))
      }),
      (e.prototype.openFileOrGetById = function (e, t, n) {
        if (typeof e == `number`) {
          var r = this.fds[e]
          if (!r) throw H(V)
          return r
        } else return this.openFile(q(e), t, n)
      }),
      (e.prototype.readBase = function (e, t, n, r, i) {
        return this.getFileByFdOrThrow(e).read(t, Number(n), Number(r), i)
      }),
      (e.prototype.readSync = function (e, t, n, r, i) {
        return (tt(e), this.readBase(e, t, n, r, i))
      }),
      (e.prototype.read = function (e, t, n, r, i, a) {
        var o = this
        if ((W(a), r === 0))
          return f.default.nextTick(function () {
            a && a(null, 0, t)
          })
        ;(0, d.default)(function () {
          try {
            a(null, o.readBase(e, t, n, r, i), t)
          } catch (e) {
            a(e)
          }
        })
      }),
      (e.prototype.readFileBase = function (e, t, n) {
        var r,
          i = typeof e == `number` && et(e),
          a
        if (i) a = e
        else {
          var o = J(q(e)),
            s = this.getResolvedLink(o)
          if (s && s.getNode().isDirectory()) throw H(he, `open`, s.getPath())
          a = this.openSync(e, t)
        }
        try {
          r = Xe(this.getFileByFdOrThrow(a).getBuffer(), n)
        } finally {
          i || this.closeSync(a)
        }
        return r
      }),
      (e.prototype.readFileSync = function (e, t) {
        var n = Ee(t),
          r = be(n.flag)
        return this.readFileBase(e, r, n.encoding)
      }),
      (e.prototype.readFile = function (e, t, n) {
        var r = G(Ee)(t, n),
          i = r[0],
          a = r[1],
          o = be(i.flag)
        this.wrapAsync(this.readFileBase, [e, o, i.encoding], a)
      }),
      (e.prototype.writeBase = function (e, t, n, r, i) {
        return this.getFileByFdOrThrow(e, `write`).write(t, n, r, i)
      }),
      (e.prototype.writeSync = function (e, t, n, r, i) {
        tt(e)
        var a,
          o,
          s,
          c,
          l = typeof t != `string`
        l ? ((o = (n || 0) | 0), (s = r), (c = i)) : ((c = n), (a = r))
        var u = Ye(t, a)
        return (
          l ? s === void 0 && (s = u.length) : ((o = 0), (s = u.length)),
          this.writeBase(e, u, o, s, c)
        )
      }),
      (e.prototype.write = function (e, t, n, r, i, a) {
        var o = this
        tt(e)
        var s,
          c,
          l,
          u,
          f,
          p = typeof t,
          m = typeof n,
          h = typeof r,
          g = typeof i
        p === `string`
          ? m === `function`
            ? (f = n)
            : h === `function`
              ? ((l = n), (f = r))
              : g === `function` && ((l = n), (u = r), (f = i))
          : m === `function`
            ? (f = n)
            : h === `function`
              ? ((s = n | 0), (f = r))
              : g === `function`
                ? ((s = n | 0), (c = r), (f = i))
                : ((s = n | 0), (c = r), (l = i), (f = a))
        var _ = Ye(t, u)
        p === `string` ? ((s = 0), (c = _.length)) : c === void 0 && (c = _.length)
        var v = W(f)
        ;(0, d.default)(function () {
          try {
            var n = o.writeBase(e, _, s, c, l)
            p === `string` ? v(null, n, t) : v(null, n, _)
          } catch (e) {
            v(e)
          }
        })
      }),
      (e.prototype.writeFileBase = function (e, t, n, r) {
        var i = typeof e == `number`,
          a = i ? e : this.openBase(q(e), n, r),
          o = 0,
          s = t.length,
          c = n & k ? void 0 : 0
        try {
          for (; s > 0; ) {
            var l = this.writeSync(a, t, o, s, c)
            ;((o += l), (s -= l), c !== void 0 && (c += l))
          }
        } finally {
          i || this.closeSync(a)
        }
      }),
      (e.prototype.writeFileSync = function (e, t, n) {
        var r = Oe(n),
          i = be(r.flag),
          a = $e(r.mode),
          o = Ye(t, r.encoding)
        this.writeFileBase(e, o, i, a)
      }),
      (e.prototype.writeFile = function (e, t, n, r) {
        var i = n,
          a = r
        typeof n == `function` && ((i = De), (a = n))
        var o = W(a),
          s = Oe(i),
          c = be(s.flag),
          l = $e(s.mode),
          u = Ye(t, s.encoding)
        this.wrapAsync(this.writeFileBase, [e, u, c, l], o)
      }),
      (e.prototype.linkBase = function (e, t) {
        var n = J(e),
          r = this.getLink(n)
        if (!r) throw H(V, `link`, e, t)
        var i = J(t),
          a = this.getLinkParent(i)
        if (!a) throw H(V, `link`, e, t)
        var o = i[i.length - 1]
        if (a.getChild(o)) throw H(de, `link`, e, t)
        var s = r.getNode()
        ;(s.nlink++, a.createChild(o, s))
      }),
      (e.prototype.copyFileBase = function (e, t, n) {
        var r = this.readFileSync(e)
        if (n & M && this.existsSync(t)) throw H(de, `copyFile`, e, t)
        if (n & N) throw H(_e, `copyFile`, e, t)
        this.writeFileBase(t, r, U.w, 438)
      }),
      (e.prototype.copyFileSync = function (e, t, n) {
        var r = q(e),
          i = q(t)
        return this.copyFileBase(r, i, (n || 0) | 0)
      }),
      (e.prototype.copyFile = function (e, t, n, r) {
        var i = q(e),
          a = q(t),
          o,
          s
        ;(typeof n == `function` ? ((o = 0), (s = n)) : ((o = n), (s = r)),
          W(s),
          this.wrapAsync(this.copyFileBase, [i, a, o], s))
      }),
      (e.prototype.linkSync = function (e, t) {
        var n = q(e),
          r = q(t)
        this.linkBase(n, r)
      }),
      (e.prototype.link = function (e, t, n) {
        var r = q(e),
          i = q(t)
        this.wrapAsync(this.linkBase, [r, i], n)
      }),
      (e.prototype.unlinkBase = function (e) {
        var t = J(e),
          n = this.getLink(t)
        if (!n) throw H(V, `unlink`, e)
        if (n.length) throw Error(`Dir not empty...`)
        this.deleteLink(n)
        var r = n.getNode()
        ;(r.nlink--, r.nlink <= 0 && this.deleteNode(r))
      }),
      (e.prototype.unlinkSync = function (e) {
        var t = q(e)
        this.unlinkBase(t)
      }),
      (e.prototype.unlink = function (e, t) {
        var n = q(e)
        this.wrapAsync(this.unlinkBase, [n], t)
      }),
      (e.prototype.symlinkBase = function (e, t) {
        var n = J(t),
          r = this.getLinkParent(n)
        if (!r) throw H(V, `symlink`, e, t)
        var i = n[n.length - 1]
        if (r.getChild(i)) throw H(de, `symlink`, e, t)
        var a = r.createChild(i)
        return (a.getNode().makeSymlink(J(e)), a)
      }),
      (e.prototype.symlinkSync = function (e, t, n) {
        var r = q(e),
          i = q(t)
        this.symlinkBase(r, i)
      }),
      (e.prototype.symlink = function (e, t, n, r) {
        var i = W(typeof n == `function` ? n : r),
          a = q(e),
          o = q(t)
        this.wrapAsync(this.symlinkBase, [a, o], i)
      }),
      (e.prototype.realpathBase = function (e, t) {
        var n = J(e),
          r = this.getResolvedLink(n)
        if (!r) throw H(V, `realpath`, e)
        return (0, _.strToEncoding)(r.getPath() || `/`, t)
      }),
      (e.prototype.realpathSync = function (e, t) {
        return this.realpathBase(q(e), K(t).encoding)
      }),
      (e.prototype.realpath = function (e, t, n) {
        var r = Me(t, n),
          i = r[0],
          a = r[1],
          o = q(e)
        this.wrapAsync(this.realpathBase, [o, i.encoding], a)
      }),
      (e.prototype.lstatBase = function (e, t, n) {
        ;(t === void 0 && (t = !1), n === void 0 && (n = !1))
        var r = this.getLink(J(e))
        if (r) return o.default.build(r.getNode(), t)
        if (n) throw H(V, `lstat`, e)
      }),
      (e.prototype.lstatSync = function (e, t) {
        var n = Ve(t),
          r = n.throwIfNoEntry,
          i = r === void 0 ? !0 : r,
          a = n.bigint,
          o = a === void 0 ? !1 : a
        return this.lstatBase(q(e), o, i)
      }),
      (e.prototype.lstat = function (e, t, n) {
        var r = He(t, n),
          i = r[0],
          a = i.throwIfNoEntry,
          o = a === void 0 ? !0 : a,
          s = i.bigint,
          c = s === void 0 ? !1 : s,
          l = r[1]
        this.wrapAsync(this.lstatBase, [q(e), c, o], l)
      }),
      (e.prototype.statBase = function (e, t, n) {
        ;(t === void 0 && (t = !1), n === void 0 && (n = !0))
        var r = this.getResolvedLink(J(e))
        if (r) return o.default.build(r.getNode(), t)
        if (n) throw H(V, `stat`, e)
      }),
      (e.prototype.statSync = function (e, t) {
        var n = Ve(t),
          r = n.bigint,
          i = r === void 0 ? !0 : r,
          a = n.throwIfNoEntry,
          o = a === void 0 ? !0 : a
        return this.statBase(q(e), i, o)
      }),
      (e.prototype.stat = function (e, t, n) {
        var r = He(t, n),
          i = r[0],
          a = i.bigint,
          o = a === void 0 ? !1 : a,
          s = i.throwIfNoEntry,
          c = s === void 0 ? !0 : s,
          l = r[1]
        this.wrapAsync(this.statBase, [q(e), o, c], l)
      }),
      (e.prototype.fstatBase = function (e, t) {
        t === void 0 && (t = !1)
        var n = this.getFileByFd(e)
        if (!n) throw H(se, `fstat`)
        return o.default.build(n.node, t)
      }),
      (e.prototype.fstatSync = function (e, t) {
        return this.fstatBase(e, Ve(t).bigint)
      }),
      (e.prototype.fstat = function (e, t, n) {
        var r = He(t, n),
          i = r[0],
          a = r[1]
        this.wrapAsync(this.fstatBase, [e, i.bigint], a)
      }),
      (e.prototype.renameBase = function (e, t) {
        var r = this.getLink(J(e))
        if (!r) throw H(V, `rename`, e, t)
        var i = J(t),
          a = this.getLinkParent(i)
        if (!a) throw H(V, `rename`, e, t)
        var o = r.parent
        o && o.deleteChild(r)
        var s = i[i.length - 1]
        ;((r.name = s), (r.steps = n(n([], a.steps, !0), [s], !1)), a.setChild(r.getName(), r))
      }),
      (e.prototype.renameSync = function (e, t) {
        var n = q(e),
          r = q(t)
        this.renameBase(n, r)
      }),
      (e.prototype.rename = function (e, t, n) {
        var r = q(e),
          i = q(t)
        this.wrapAsync(this.renameBase, [r, i], n)
      }),
      (e.prototype.existsBase = function (e) {
        return !!this.statBase(e)
      }),
      (e.prototype.existsSync = function (e) {
        try {
          return this.existsBase(q(e))
        } catch {
          return !1
        }
      }),
      (e.prototype.exists = function (e, t) {
        var n = this,
          r = q(e)
        if (typeof t != `function`) throw Error(z.CB)
        ;(0, d.default)(function () {
          try {
            t(n.existsBase(r))
          } catch {
            t(!1)
          }
        })
      }),
      (e.prototype.accessBase = function (e, t) {
        this.getLinkOrThrow(e, `access`)
      }),
      (e.prototype.accessSync = function (e, t) {
        t === void 0 && (t = re)
        var n = q(e)
        ;((t |= 0), this.accessBase(n, t))
      }),
      (e.prototype.access = function (e, t, n) {
        var r = re,
          i
        typeof t == `function` ? (i = t) : ((r = t | 0), (i = W(n)))
        var a = q(e)
        this.wrapAsync(this.accessBase, [a, r], i)
      }),
      (e.prototype.appendFileSync = function (e, t, n) {
        n === void 0 && (n = ke)
        var r = Ae(n)
        ;((!r.flag || et(e)) && (r.flag = `a`), this.writeFileSync(e, t, r))
      }),
      (e.prototype.appendFile = function (e, t, n, r) {
        var i = je(n, r),
          a = i[0],
          o = i[1]
        ;((!a.flag || et(e)) && (a.flag = `a`), this.writeFile(e, t, a, o))
      }),
      (e.prototype.readdirBase = function (e, t) {
        var n = J(e),
          r = this.getResolvedLink(n)
        if (!r) throw H(V, `readdir`, e)
        if (!r.getNode().isDirectory()) throw H(fe, `scandir`, e)
        if (t.withFileTypes) {
          var i = []
          for (var a in r.children) {
            var o = r.getChild(a)
            !o || a === `.` || a === `..` || i.push(l.default.build(o, t.encoding))
          }
          return (
            !R &&
              t.encoding !== `buffer` &&
              i.sort(function (e, t) {
                return e.name < t.name ? -1 : e.name > t.name ? 1 : 0
              }),
            i
          )
        }
        var s = []
        for (var c in r.children)
          c === `.` || c === `..` || s.push((0, _.strToEncoding)(c, t.encoding))
        return (!R && t.encoding !== `buffer` && s.sort(), s)
      }),
      (e.prototype.readdirSync = function (e, t) {
        var n = Re(t),
          r = q(e)
        return this.readdirBase(r, n)
      }),
      (e.prototype.readdir = function (e, t, n) {
        var r = ze(t, n),
          i = r[0],
          a = r[1],
          o = q(e)
        this.wrapAsync(this.readdirBase, [o, i], a)
      }),
      (e.prototype.readlinkBase = function (e, t) {
        var n = this.getLinkOrThrow(e, `readlink`).getNode()
        if (!n.isSymlink()) throw H(ce, `readlink`, e)
        var r = F + n.symlink.join(F)
        return (0, _.strToEncoding)(r, t)
      }),
      (e.prototype.readlinkSync = function (e, t) {
        var n = we(t),
          r = q(e)
        return this.readlinkBase(r, n.encoding)
      }),
      (e.prototype.readlink = function (e, t, n) {
        var r = Te(t, n),
          i = r[0],
          a = r[1],
          o = q(e)
        this.wrapAsync(this.readlinkBase, [o, i.encoding], a)
      }),
      (e.prototype.fsyncBase = function (e) {
        this.getFileByFdOrThrow(e, `fsync`)
      }),
      (e.prototype.fsyncSync = function (e) {
        this.fsyncBase(e)
      }),
      (e.prototype.fsync = function (e, t) {
        this.wrapAsync(this.fsyncBase, [e], t)
      }),
      (e.prototype.fdatasyncBase = function (e) {
        this.getFileByFdOrThrow(e, `fdatasync`)
      }),
      (e.prototype.fdatasyncSync = function (e) {
        this.fdatasyncBase(e)
      }),
      (e.prototype.fdatasync = function (e, t) {
        this.wrapAsync(this.fdatasyncBase, [e], t)
      }),
      (e.prototype.ftruncateBase = function (e, t) {
        this.getFileByFdOrThrow(e, `ftruncate`).truncate(t)
      }),
      (e.prototype.ftruncateSync = function (e, t) {
        this.ftruncateBase(e, t)
      }),
      (e.prototype.ftruncate = function (e, t, n) {
        var r = typeof t == `number` ? t : 0,
          i = W(typeof t == `number` ? n : t)
        this.wrapAsync(this.ftruncateBase, [e, r], i)
      }),
      (e.prototype.truncateBase = function (e, t) {
        var n = this.openSync(e, `r+`)
        try {
          this.ftruncateSync(n, t)
        } finally {
          this.closeSync(n)
        }
      }),
      (e.prototype.truncateSync = function (e, t) {
        if (et(e)) return this.ftruncateSync(e, t)
        this.truncateBase(e, t)
      }),
      (e.prototype.truncate = function (e, t, n) {
        var r = typeof t == `number` ? t : 0,
          i = W(typeof t == `number` ? n : t)
        if (et(e)) return this.ftruncate(e, r, i)
        this.wrapAsync(this.truncateBase, [e, r], i)
      }),
      (e.prototype.futimesBase = function (e, t, n) {
        var r = this.getFileByFdOrThrow(e, `futimes`).node
        ;((r.atime = new Date(t * 1e3)), (r.mtime = new Date(n * 1e3)))
      }),
      (e.prototype.futimesSync = function (e, t, n) {
        this.futimesBase(e, nt(t), nt(n))
      }),
      (e.prototype.futimes = function (e, t, n, r) {
        this.wrapAsync(this.futimesBase, [e, nt(t), nt(n)], r)
      }),
      (e.prototype.utimesBase = function (e, t, n) {
        var r = this.openSync(e, `r`)
        try {
          this.futimesBase(r, t, n)
        } finally {
          this.closeSync(r)
        }
      }),
      (e.prototype.utimesSync = function (e, t, n) {
        this.utimesBase(q(e), nt(t), nt(n))
      }),
      (e.prototype.utimes = function (e, t, n, r) {
        this.wrapAsync(this.utimesBase, [q(e), nt(t), nt(n)], r)
      }),
      (e.prototype.mkdirBase = function (e, t) {
        var n = J(e)
        if (!n.length) throw H(de, `mkdir`, e)
        var r = this.getLinkParentAsDirOrThrow(e, `mkdir`),
          i = n[n.length - 1]
        if (r.getChild(i)) throw H(de, `mkdir`, e)
        r.createChild(i, this.createNode(!0, t))
      }),
      (e.prototype.mkdirpBase = function (e, t) {
        for (
          var n = We(e), r = n.substring(1), i = r ? r.split(F) : [], a = this.root, o = !1, s = 0;
          s < i.length;
          s++
        ) {
          var c = i[s]
          if (!a.getNode().isDirectory()) throw H(fe, `mkdir`, a.getPath())
          var l = a.getChild(c)
          if (l)
            if (l.getNode().isDirectory()) a = l
            else throw H(fe, `mkdir`, l.getPath())
          else ((a = a.createChild(c, this.createNode(!0, t))), (o = !0))
        }
        return o ? n : void 0
      }),
      (e.prototype.mkdirSync = function (e, t) {
        var n = Pe(t),
          r = $e(n.mode, 511),
          i = q(e)
        if (n.recursive) return this.mkdirpBase(i, r)
        this.mkdirBase(i, r)
      }),
      (e.prototype.mkdir = function (e, t, n) {
        var r = Pe(t),
          i = W(typeof t == `function` ? t : n),
          a = $e(r.mode, 511),
          o = q(e)
        r.recursive
          ? this.wrapAsync(this.mkdirpBase, [o, a], i)
          : this.wrapAsync(this.mkdirBase, [o, a], i)
      }),
      (e.prototype.mkdirpSync = function (e, t) {
        return this.mkdirSync(e, { mode: t, recursive: !0 })
      }),
      (e.prototype.mkdirp = function (e, t, n) {
        var r = typeof t == `function` ? void 0 : t,
          i = W(typeof t == `function` ? t : n)
        this.mkdir(e, { mode: r, recursive: !0 }, i)
      }),
      (e.prototype.mkdtempBase = function (e, t, n) {
        n === void 0 && (n = 5)
        var r = e + this.genRndStr()
        try {
          return (this.mkdirBase(r, 511), (0, _.strToEncoding)(r, t))
        } catch (r) {
          if (r.code === de) {
            if (n > 1) return this.mkdtempBase(e, t, n - 1)
            throw Error(`Could not create temp dir.`)
          } else throw r
        }
      }),
      (e.prototype.mkdtempSync = function (e, t) {
        var n = we(t).encoding
        if (!e || typeof e != `string`) throw TypeError(`filename prefix is required`)
        return (Ze(e), this.mkdtempBase(e, n))
      }),
      (e.prototype.mkdtemp = function (e, t, n) {
        var r = Te(t, n),
          i = r[0].encoding,
          a = r[1]
        if (!e || typeof e != `string`) throw TypeError(`filename prefix is required`)
        Ze(e) && this.wrapAsync(this.mkdtempBase, [e, i], a)
      }),
      (e.prototype.rmdirBase = function (e, t) {
        var n = Ie(t),
          r = this.getLinkAsDirOrThrow(e, `rmdir`)
        if (r.length && !n.recursive) throw H(ge, `rmdir`, e)
        this.deleteLink(r)
      }),
      (e.prototype.rmdirSync = function (e, t) {
        this.rmdirBase(q(e), t)
      }),
      (e.prototype.rmdir = function (e, t, n) {
        var r = Ie(t),
          i = W(typeof t == `function` ? t : n)
        this.wrapAsync(this.rmdirBase, [q(e), r], i)
      }),
      (e.prototype.rmBase = function (e, t) {
        t === void 0 && (t = {})
        var n = this.getResolvedLink(e)
        if (!n) {
          if (!t.force) throw H(V, `stat`, e)
          return
        }
        if (n.getNode().isDirectory() && !t.recursive) throw H(ve, `rm`, e)
        this.deleteLink(n)
      }),
      (e.prototype.rmSync = function (e, t) {
        this.rmBase(q(e), t)
      }),
      (e.prototype.rm = function (e, t, n) {
        var r = Le(t, n),
          i = r[0],
          a = r[1]
        this.wrapAsync(this.rmBase, [q(e), i], a)
      }),
      (e.prototype.fchmodBase = function (e, t) {
        this.getFileByFdOrThrow(e, `fchmod`).chmod(t)
      }),
      (e.prototype.fchmodSync = function (e, t) {
        this.fchmodBase(e, $e(t))
      }),
      (e.prototype.fchmod = function (e, t, n) {
        this.wrapAsync(this.fchmodBase, [e, $e(t)], n)
      }),
      (e.prototype.chmodBase = function (e, t) {
        var n = this.openSync(e, `r`)
        try {
          this.fchmodBase(n, t)
        } finally {
          this.closeSync(n)
        }
      }),
      (e.prototype.chmodSync = function (e, t) {
        var n = $e(t),
          r = q(e)
        this.chmodBase(r, n)
      }),
      (e.prototype.chmod = function (e, t, n) {
        var r = $e(t),
          i = q(e)
        this.wrapAsync(this.chmodBase, [i, r], n)
      }),
      (e.prototype.lchmodBase = function (e, t) {
        var n = this.openBase(e, T, 0, !1)
        try {
          this.fchmodBase(n, t)
        } finally {
          this.closeSync(n)
        }
      }),
      (e.prototype.lchmodSync = function (e, t) {
        var n = $e(t),
          r = q(e)
        this.lchmodBase(r, n)
      }),
      (e.prototype.lchmod = function (e, t, n) {
        var r = $e(t),
          i = q(e)
        this.wrapAsync(this.lchmodBase, [i, r], n)
      }),
      (e.prototype.fchownBase = function (e, t, n) {
        this.getFileByFdOrThrow(e, `fchown`).chown(t, n)
      }),
      (e.prototype.fchownSync = function (e, t, n) {
        ;(rt(t), it(n), this.fchownBase(e, t, n))
      }),
      (e.prototype.fchown = function (e, t, n, r) {
        ;(rt(t), it(n), this.wrapAsync(this.fchownBase, [e, t, n], r))
      }),
      (e.prototype.chownBase = function (e, t, n) {
        this.getResolvedLinkOrThrow(e, `chown`).getNode().chown(t, n)
      }),
      (e.prototype.chownSync = function (e, t, n) {
        ;(rt(t), it(n), this.chownBase(q(e), t, n))
      }),
      (e.prototype.chown = function (e, t, n, r) {
        ;(rt(t), it(n), this.wrapAsync(this.chownBase, [q(e), t, n], r))
      }),
      (e.prototype.lchownBase = function (e, t, n) {
        this.getLinkOrThrow(e, `lchown`).getNode().chown(t, n)
      }),
      (e.prototype.lchownSync = function (e, t, n) {
        ;(rt(t), it(n), this.lchownBase(q(e), t, n))
      }),
      (e.prototype.lchown = function (e, t, n, r) {
        ;(rt(t), it(n), this.wrapAsync(this.lchownBase, [q(e), t, n], r))
      }),
      (e.prototype.watchFile = function (e, t, n) {
        var r = q(e),
          i = t,
          a = n
        if ((typeof i == `function` && ((a = t), (i = null)), typeof a != `function`))
          throw Error(`"watchFile()" requires a listener function`)
        var o = 5007,
          s = !0
        i &&
          typeof i == `object` &&
          (typeof i.interval == `number` && (o = i.interval),
          typeof i.persistent == `boolean` && (s = i.persistent))
        var c = this.statWatchers[r]
        return (
          c || ((c = new this.StatWatcher()), c.start(r, s, o), (this.statWatchers[r] = c)),
          c.addListener(`change`, a),
          c
        )
      }),
      (e.prototype.unwatchFile = function (e, t) {
        var n = q(e),
          r = this.statWatchers[n]
        r &&
          (typeof t == `function` ? r.removeListener(`change`, t) : r.removeAllListeners(`change`),
          r.listenerCount(`change`) === 0 && (r.stop(), delete this.statWatchers[n]))
      }),
      (e.prototype.createReadStream = function (e, t) {
        return new this.ReadStream(e, t)
      }),
      (e.prototype.createWriteStream = function (e, t) {
        return new this.WriteStream(e, t)
      }),
      (e.prototype.watch = function (e, t, n) {
        var r = q(e),
          i = t
        typeof t == `function` && ((n = t), (i = null))
        var a = we(i),
          o = a.persistent,
          s = a.recursive,
          c = a.encoding
        ;(o === void 0 && (o = !0), s === void 0 && (s = !1))
        var l = new this.FSWatcher()
        return (l.start(r, o, s, c), n && l.addListener(`change`, n), l)
      }),
      (e.fd = 2147483647),
      e
    )
  })()
  function ot(e) {
    e.emit(`stop`)
  }
  var st = (function (e) {
    t(n, e)
    function n(t) {
      var n = e.call(this) || this
      return (
        (n.onInterval = function () {
          try {
            var e = n.vol.statSync(n.filename)
            n.hasChanged(e) && (n.emit(`change`, e, n.prev), (n.prev = e))
          } finally {
            n.loop()
          }
        }),
        (n.vol = t),
        n
      )
    }
    return (
      (n.prototype.loop = function () {
        this.timeoutRef = this.setTimeout(this.onInterval, this.interval)
      }),
      (n.prototype.hasChanged = function (e) {
        return e.mtimeMs > this.prev.mtimeMs || e.nlink !== this.prev.nlink
      }),
      (n.prototype.start = function (e, t, n) {
        ;(t === void 0 && (t = !0),
          n === void 0 && (n = 5007),
          (this.filename = q(e)),
          (this.setTimeout = t
            ? setTimeout.bind(typeof globalThis < `u` ? globalThis : i)
            : p.default),
          (this.interval = n),
          (this.prev = this.vol.statSync(this.filename)),
          this.loop())
      }),
      (n.prototype.stop = function () {
        ;(clearTimeout(this.timeoutRef), f.default.nextTick(ot, this))
      }),
      n
    )
  })(g.EventEmitter)
  e.StatWatcher = st
  var ct
  function lt(e) {
    ;((ct = (0, u.bufferAllocUnsafe)(e)), (ct.used = 0))
  }
  ;(y.inherits(ut, m.Readable), (e.ReadStream = ut))
  function ut(e, t, n) {
    if (!(this instanceof ut)) return new ut(e, t, n)
    if (
      ((this._vol = e),
      (n = Object.assign({}, xe(n, {}))),
      n.highWaterMark === void 0 && (n.highWaterMark = 64 * 1024),
      m.Readable.call(this, n),
      (this.path = q(t)),
      (this.fd = n.fd === void 0 ? null : n.fd),
      (this.flags = n.flags === void 0 ? `r` : n.flags),
      (this.mode = n.mode === void 0 ? 438 : n.mode),
      (this.start = n.start),
      (this.end = n.end),
      (this.autoClose = n.autoClose === void 0 ? !0 : n.autoClose),
      (this.pos = void 0),
      (this.bytesRead = 0),
      this.start !== void 0)
    ) {
      if (typeof this.start != `number`) throw TypeError(`"start" option must be a Number`)
      if (this.end === void 0) this.end = 1 / 0
      else if (typeof this.end != `number`) throw TypeError(`"end" option must be a Number`)
      if (this.start > this.end) throw Error(`"start" option must be <= "end" option`)
      this.pos = this.start
    }
    ;(typeof this.fd != `number` && this.open(),
      this.on(`end`, function () {
        this.autoClose && this.destroy && this.destroy()
      }))
  }
  ;((ut.prototype.open = function () {
    var e = this
    this._vol.open(this.path, this.flags, this.mode, function (t, n) {
      if (t) {
        ;(e.autoClose && e.destroy && e.destroy(), e.emit(`error`, t))
        return
      }
      ;((e.fd = n), e.emit(`open`, n), e.read())
    })
  }),
    (ut.prototype._read = function (e) {
      if (typeof this.fd != `number`)
        return this.once(`open`, function () {
          this._read(e)
        })
      if (this.destroyed) return
      ;(!ct || ct.length - ct.used < ae) && lt(this._readableState.highWaterMark)
      var t = ct,
        n = Math.min(ct.length - ct.used, e),
        r = ct.used
      if ((this.pos !== void 0 && (n = Math.min(this.end - this.pos + 1, n)), n <= 0))
        return this.push(null)
      var i = this
      ;(this._vol.read(this.fd, ct, ct.used, n, this.pos, a),
        this.pos !== void 0 && (this.pos += n),
        (ct.used += n))
      function a(e, n) {
        if (e) (i.autoClose && i.destroy && i.destroy(), i.emit(`error`, e))
        else {
          var a = null
          ;(n > 0 && ((i.bytesRead += n), (a = t.slice(r, r + n))), i.push(a))
        }
      }
    }),
    (ut.prototype._destroy = function (e, t) {
      this.close(function (n) {
        t(e || n)
      })
    }),
    (ut.prototype.close = function (e) {
      var t = this
      if ((e && this.once(`close`, e), this.closed || typeof this.fd != `number`)) {
        if (typeof this.fd != `number`) {
          this.once(`open`, dt)
          return
        }
        return f.default.nextTick(function () {
          return t.emit(`close`)
        })
      }
      ;(typeof this._readableState?.closed == `boolean`
        ? (this._readableState.closed = !0)
        : (this.closed = !0),
        this._vol.close(this.fd, function (e) {
          e ? t.emit(`error`, e) : t.emit(`close`)
        }),
        (this.fd = null))
    }))
  function dt(e) {
    this.close()
  }
  ;(y.inherits(ft, m.Writable), (e.WriteStream = ft))
  function ft(e, t, n) {
    if (!(this instanceof ft)) return new ft(e, t, n)
    if (
      ((this._vol = e),
      (n = Object.assign({}, xe(n, {}))),
      m.Writable.call(this, n),
      (this.path = q(t)),
      (this.fd = n.fd === void 0 ? null : n.fd),
      (this.flags = n.flags === void 0 ? `w` : n.flags),
      (this.mode = n.mode === void 0 ? 438 : n.mode),
      (this.start = n.start),
      (this.autoClose = n.autoClose === void 0 ? !0 : !!n.autoClose),
      (this.pos = void 0),
      (this.bytesWritten = 0),
      this.start !== void 0)
    ) {
      if (typeof this.start != `number`) throw TypeError(`"start" option must be a Number`)
      if (this.start < 0) throw Error(`"start" must be >= zero`)
      this.pos = this.start
    }
    ;(n.encoding && this.setDefaultEncoding(n.encoding),
      typeof this.fd != `number` && this.open(),
      this.once(`finish`, function () {
        this.autoClose && this.close()
      }))
  }
  ;((ft.prototype.open = function () {
    this._vol.open(
      this.path,
      this.flags,
      this.mode,
      function (e, t) {
        if (e) {
          ;(this.autoClose && this.destroy && this.destroy(), this.emit(`error`, e))
          return
        }
        ;((this.fd = t), this.emit(`open`, t))
      }.bind(this)
    )
  }),
    (ft.prototype._write = function (e, t, n) {
      if (!(e instanceof u.Buffer || e instanceof Uint8Array))
        return this.emit(`error`, Error(`Invalid data`))
      if (typeof this.fd != `number`)
        return this.once(`open`, function () {
          this._write(e, t, n)
        })
      var r = this
      ;(this._vol.write(this.fd, e, 0, e.length, this.pos, function (e, t) {
        if (e) return (r.autoClose && r.destroy && r.destroy(), n(e))
        ;((r.bytesWritten += t), n())
      }),
        this.pos !== void 0 && (this.pos += e.length))
    }),
    (ft.prototype._writev = function (e, t) {
      if (typeof this.fd != `number`)
        return this.once(`open`, function () {
          this._writev(e, t)
        })
      for (var n = this, r = e.length, i = Array(r), a = 0, o = 0; o < r; o++) {
        var s = e[o].chunk
        ;((i[o] = s), (a += s.length))
      }
      var c = u.Buffer.concat(i)
      ;(this._vol.write(this.fd, c, 0, c.length, this.pos, function (e, r) {
        if (e) return (n.destroy && n.destroy(), t(e))
        ;((n.bytesWritten += r), t())
      }),
        this.pos !== void 0 && (this.pos += a))
    }),
    (ft.prototype.close = function (e) {
      var t = this
      if ((e && this.once(`close`, e), this.closed || typeof this.fd != `number`)) {
        if (typeof this.fd != `number`) {
          this.once(`open`, dt)
          return
        }
        return f.default.nextTick(function () {
          return t.emit(`close`)
        })
      }
      ;(typeof this._writableState?.closed == `boolean`
        ? (this._writableState.closed = !0)
        : (this.closed = !0),
        this._vol.close(this.fd, function (e) {
          e ? t.emit(`error`, e) : t.emit(`close`)
        }),
        (this.fd = null))
    }),
    (ft.prototype._destroy = ut.prototype._destroy),
    (ft.prototype.destroySoon = ft.prototype.end))
  var pt = (function (e) {
    t(n, e)
    function n(t) {
      var n = e.call(this) || this
      return (
        (n._filename = ``),
        (n._filenameEncoded = ``),
        (n._recursive = !1),
        (n._encoding = _.ENCODING_UTF8),
        (n._listenerRemovers = new Map()),
        (n._onParentChild = function (e) {
          e.getName() === n._getName() && n._emit(`rename`)
        }),
        (n._emit = function (e) {
          n.emit(`change`, e, n._filenameEncoded)
        }),
        (n._persist = function () {
          n._timer = setTimeout(n._persist, 1e6)
        }),
        (n._vol = t),
        n
      )
    }
    return (
      (n.prototype._getName = function () {
        return this._steps[this._steps.length - 1]
      }),
      (n.prototype.start = function (e, t, n, r) {
        var i = this
        ;(t === void 0 && (t = !0),
          n === void 0 && (n = !1),
          r === void 0 && (r = _.ENCODING_UTF8),
          (this._filename = q(e)),
          (this._steps = J(this._filename)),
          (this._filenameEncoded = (0, _.strToEncoding)(this._filename)),
          (this._recursive = n),
          (this._encoding = r))
        try {
          this._link = this._vol.getLinkOrThrow(this._filename, `FSWatcher`)
        } catch (e) {
          var a = Error(`watch ${this._filename} ${e.code}`)
          throw ((a.code = e.code), (a.errno = e.code), a)
        }
        var o = function (e) {
            var t = e.getPath(),
              n = e.getNode(),
              r = function () {
                var e = I(i._filename, t)
                return ((e ||= i._getName()), i.emit(`change`, `change`, e))
              }
            n.on(`change`, r)
            var a = i._listenerRemovers.get(n.ino) ?? []
            ;(a.push(function () {
              return n.removeListener(`change`, r)
            }),
              i._listenerRemovers.set(n.ino, a))
          },
          s = function (e) {
            var t = e.getNode(),
              r = function (e) {
                ;(i.emit(`change`, `rename`, I(i._filename, e.getPath())),
                  setTimeout(function () {
                    ;(o(e), s(e))
                  }))
              },
              a = function (e) {
                var t = function (e) {
                  var n = e.getNode().ino,
                    r = i._listenerRemovers.get(n)
                  ;(r &&
                    (r.forEach(function (e) {
                      return e()
                    }),
                    i._listenerRemovers.delete(n)),
                    Object.values(e.children).forEach(function (e) {
                      e && t(e)
                    }))
                }
                ;(t(e), i.emit(`change`, `rename`, I(i._filename, e.getPath())))
              }
            ;(Object.entries(e.children).forEach(function (e) {
              var t = e[0],
                n = e[1]
              n && t !== `.` && t !== `..` && o(n)
            }),
              e.on(`child:add`, r),
              e.on(`child:delete`, a),
              (i._listenerRemovers.get(t.ino) ?? []).push(function () {
                ;(e.removeListener(`child:add`, r), e.removeListener(`child:delete`, a))
              }),
              n &&
                Object.entries(e.children).forEach(function (e) {
                  var t = e[0],
                    n = e[1]
                  n && t !== `.` && t !== `..` && s(n)
                }))
          }
        ;(o(this._link), s(this._link))
        var c = this._link.parent
        ;(c &&
          (c.setMaxListeners(c.getMaxListeners() + 1), c.on(`child:delete`, this._onParentChild)),
          t && this._persist())
      }),
      (n.prototype.close = function () {
        ;(clearTimeout(this._timer),
          this._listenerRemovers.forEach(function (e) {
            e.forEach(function (e) {
              return e()
            })
          }),
          this._listenerRemovers.clear())
        var e = this._link.parent
        e && e.removeListener(`child:delete`, this._onParentChild)
      }),
      n
    )
  })(g.EventEmitter)
  e.FSWatcher = pt
})(zn)
var gu = {}
;(Object.defineProperty(gu, `__esModule`, { value: !0 }),
  (gu.fsSyncMethods = gu.fsProps = gu.fsAsyncMethods = void 0),
  (gu.fsProps = [`constants`, `F_OK`, `R_OK`, `W_OK`, `X_OK`, `Stats`]),
  (gu.fsSyncMethods =
    `renameSync.ftruncateSync.truncateSync.chownSync.fchownSync.lchownSync.chmodSync.fchmodSync.lchmodSync.statSync.lstatSync.fstatSync.linkSync.symlinkSync.readlinkSync.realpathSync.unlinkSync.rmdirSync.mkdirSync.mkdirpSync.readdirSync.closeSync.openSync.utimesSync.futimesSync.fsyncSync.writeSync.readSync.readFileSync.writeFileSync.appendFileSync.existsSync.accessSync.fdatasyncSync.mkdtempSync.copyFileSync.rmSync.createReadStream.createWriteStream`.split(
      `.`
    )),
  (gu.fsAsyncMethods =
    `rename.ftruncate.truncate.chown.fchown.lchown.chmod.fchmod.lchmod.stat.lstat.fstat.link.symlink.readlink.realpath.unlink.rmdir.mkdir.mkdirp.readdir.close.open.utimes.futimes.fsync.write.read.readFile.writeFile.appendFile.exists.access.fdatasync.mkdtemp.copyFile.rm.watchFile.unwatchFile.watch`.split(
      `.`
    )),
  (function (e, t) {
    var n =
      (i && i.__assign) ||
      function () {
        return (
          (n =
            Object.assign ||
            function (e) {
              for (var t, n = 1, r = arguments.length; n < r; n++)
                for (var i in ((t = arguments[n]), t))
                  Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i])
              return e
            }),
          n.apply(this, arguments)
        )
      }
    ;(Object.defineProperty(t, `__esModule`, { value: !0 }),
      (t.fs = t.createFsFromVolume = t.vol = t.Volume = void 0))
    var r = s,
      a = b,
      o = zn,
      l = gu,
      u = l.fsSyncMethods,
      d = l.fsAsyncMethods,
      f = c,
      p = f.constants.F_OK,
      m = f.constants.R_OK,
      h = f.constants.W_OK,
      g = f.constants.X_OK
    ;((t.Volume = o.Volume), (t.vol = new o.Volume()))
    function _(e) {
      for (
        var t = {
            F_OK: p,
            R_OK: m,
            W_OK: h,
            X_OK: g,
            constants: f.constants,
            Stats: r.default,
            Dirent: a.default
          },
          n = 0,
          i = u;
        n < i.length;
        n++
      ) {
        var s = i[n]
        typeof e[s] == `function` && (t[s] = e[s].bind(e))
      }
      for (var c = 0, l = d; c < l.length; c++) {
        var s = l[c]
        typeof e[s] == `function` && (t[s] = e[s].bind(e))
      }
      return (
        (t.StatWatcher = e.StatWatcher),
        (t.FSWatcher = e.FSWatcher),
        (t.WriteStream = e.WriteStream),
        (t.ReadStream = e.ReadStream),
        (t.promises = e.promises),
        (t._toUnixTimestamp = o.toUnixTimestamp),
        t
      )
    }
    ;((t.createFsFromVolume = _),
      (t.fs = _(t.vol)),
      (e.exports = n(n({}, e.exports), t.fs)),
      (e.exports.semantic = !0))
  })(o, o.exports))
var _u = o.exports,
  {
    F_OK: vu,
    R_OK: yu,
    W_OK: bu,
    X_OK: xu,
    constants: Su,
    Stats: Cu,
    Dirent: wu,
    renameSync: Tu,
    ftruncateSync: Eu,
    truncateSync: Du,
    chownSync: Ou,
    fchownSync: ku,
    lchownSync: Au,
    chmodSync: ju,
    fchmodSync: Mu,
    lchmodSync: Nu,
    statSync: Pu,
    lstatSync: Fu,
    fstatSync: Iu,
    linkSync: Lu,
    symlinkSync: Ru,
    readlinkSync: zu,
    realpathSync: Bu,
    unlinkSync: Vu,
    rmdirSync: Hu,
    mkdirSync: Uu,
    mkdirpSync: Wu,
    readdirSync: Gu,
    closeSync: Ku,
    openSync: qu,
    utimesSync: Ju,
    futimesSync: Yu,
    fsyncSync: Xu,
    writeSync: Zu,
    readSync: Qu,
    readFileSync: $u,
    writeFileSync: ed,
    appendFileSync: td,
    existsSync: nd,
    accessSync: rd,
    fdatasyncSync: id,
    mkdtempSync: ad,
    copyFileSync: od,
    rmSync: sd,
    createReadStream: cd,
    createWriteStream: ld,
    rename: ud,
    ftruncate: dd,
    truncate: fd,
    chown: pd,
    fchown: md,
    lchown: hd,
    chmod: gd,
    fchmod: _d,
    lchmod: vd,
    stat: yd,
    lstat: bd,
    fstat: xd,
    link: Sd,
    symlink: Cd,
    readlink: wd,
    realpath: Td,
    unlink: Ed,
    rmdir: Dd,
    mkdir: Od,
    mkdirp: kd,
    readdir: Ad,
    close: jd,
    open: Md,
    utimes: Nd,
    futimes: Pd,
    fsync: Fd,
    write: Id,
    read: Ld,
    readFile: Rd,
    writeFile: zd,
    appendFile: Bd,
    exists: Vd,
    access: Hd,
    fdatasync: Ud,
    mkdtemp: Wd,
    copyFile: Gd,
    rm: Kd,
    watchFile: qd,
    unwatchFile: Jd,
    watch: Yd,
    StatWatcher: Xd,
    FSWatcher: Zd,
    WriteStream: Qd,
    ReadStream: $d,
    promises: ef,
    _toUnixTimestamp: tf
  } = _u.fs
;(_u.Volume, _u.createFsFromVolume)
var nf = _u.fs,
  rf = _u.vol
function af(e) {
  let t = 0,
    n = n => {
      ;((t = n), (e.innerHTML = `count is ${t}`))
    }
  ;(e.addEventListener(`click`, () => n(t + 1)), n(0))
}
var of = {
  readFile: (e, t) => (
    console.log(`Reading file: ${e} with encoding: ${t}`), Promise.resolve(`Contents of ${e}`)
  )
}
async function sf(e) {
  return of.readFile(e, `utf-8`)
}
var cf = `data:image/svg+xml,%3csvg%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20aria-hidden='true'%20role='img'%20class='iconify%20iconify--logos'%20width='32'%20height='32'%20preserveAspectRatio='xMidYMid%20meet'%20viewBox='0%200%20256%20256'%3e%3cpath%20fill='%23007ACC'%20d='M0%20128v128h256V0H0z'%3e%3c/path%3e%3cpath%20fill='%23FFF'%20d='m56.612%20128.85l-.081%2010.483h33.32v94.68h23.568v-94.68h33.321v-10.28c0-5.69-.122-10.444-.284-10.566c-.122-.162-20.4-.244-44.983-.203l-44.74.122l-.121%2010.443Zm149.955-10.742c6.501%201.625%2011.459%204.51%2016.01%209.224c2.357%202.52%205.851%207.111%206.136%208.208c.08.325-11.053%207.802-17.798%2011.988c-.244.162-1.22-.894-2.317-2.52c-3.291-4.795-6.745-6.867-12.028-7.233c-7.76-.528-12.759%203.535-12.718%2010.321c0%201.992.284%203.17%201.097%204.795c1.707%203.536%204.876%205.649%2014.832%209.956c18.326%207.883%2026.168%2013.084%2031.045%2020.48c5.445%208.249%206.664%2021.415%202.966%2031.208c-4.063%2010.646-14.14%2017.879-28.323%2020.276c-4.388.772-14.79.65-19.504-.203c-10.28-1.828-20.033-6.908-26.047-13.572c-2.357-2.6-6.949-9.387-6.664-9.874c.122-.163%201.178-.813%202.356-1.504c1.138-.65%205.446-3.129%209.509-5.485l7.355-4.267l1.544%202.276c2.154%203.29%206.867%207.801%209.712%209.305c8.167%204.307%2019.383%203.698%2024.909-1.26c2.357-2.153%203.332-4.388%203.332-7.68c0-2.966-.366-4.266-1.91-6.501c-1.99-2.845-6.054-5.242-17.595-10.24c-13.206-5.69-18.895-9.224-24.096-14.832c-3.007-3.25-5.852-8.452-7.03-12.8c-.975-3.617-1.22-12.678-.447-16.335c2.723-12.76%2012.353-21.659%2026.25-24.3c4.51-.853%2014.994-.528%2019.424.569Z'%3e%3c/path%3e%3c/svg%3e`,
  lf = `/vite.svg`
;((document.querySelector(`#app`).innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${lf}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${cf}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`),
  af(document.querySelector(`#counter`)),
  console.log(await sf(`./mod.ts`)),
  rf.fromJSON(
    { './README.md': `1`, './src/index.js': `2`, './node_modules/debug/index.js': `3` },
    `/app`
  ),
  console.log(`memfs readfileSync`, nf.readFileSync(`/app/README.md`, `utf8`)))
