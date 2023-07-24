(function (l, r) {
  if (!l || l.getElementById("livereloadscript")) return;
  r = l.createElement("script");
  r.async = 1;
  r.src =
    "//" +
    (self.location.host || "localhost").split(":")[0] +
    ":35729/livereload.js?snipver=1";
  r.id = "livereloadscript";
  l.getElementsByTagName("head")[0].appendChild(r);
})(self.document);
var app = (function () {
  "use strict";

  function noop() {}
  function add_location(element, file, line, column, char) {
    element.__svelte_meta = {
      loc: { file, line, column, char },
    };
  }
  function run(fn) {
    return fn();
  }
  function blank_object() {
    return Object.create(null);
  }
  function run_all(fns) {
    fns.forEach(run);
  }
  function is_function(thing) {
    return typeof thing === "function";
  }
  function safe_not_equal(a, b) {
    return a != a
      ? b == b
      : a !== b || (a && typeof a === "object") || typeof a === "function";
  }
  let src_url_equal_anchor;
  function src_url_equal(element_src, url) {
    if (!src_url_equal_anchor) {
      src_url_equal_anchor = document.createElement("a");
    }
    src_url_equal_anchor.href = url;
    return element_src === src_url_equal_anchor.href;
  }
  function is_empty(obj) {
    return Object.keys(obj).length === 0;
  }

  const globals =
    typeof window !== "undefined"
      ? window
      : typeof globalThis !== "undefined"
      ? globalThis
      : global;
  function append(target, node) {
    target.appendChild(node);
  }
  function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
  }
  function detach(node) {
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }
  function destroy_each(iterations, detaching) {
    for (let i = 0; i < iterations.length; i += 1) {
      if (iterations[i]) iterations[i].d(detaching);
    }
  }
  function element(name) {
    return document.createElement(name);
  }
  function text(data) {
    return document.createTextNode(data);
  }
  function space() {
    return text(" ");
  }
  function empty() {
    return text("");
  }
  function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return () => node.removeEventListener(event, handler, options);
  }
  function attr(node, attribute, value) {
    if (value == null) node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
      node.setAttribute(attribute, value);
  }
  function children(element) {
    return Array.from(element.childNodes);
  }
  function select_option(select, value, mounting) {
    for (let i = 0; i < select.options.length; i += 1) {
      const option = select.options[i];
      if (option.__value === value) {
        option.selected = true;
        return;
      }
    }
    if (!mounting || value !== undefined) {
      select.selectedIndex = -1; // no option should be selected
    }
  }
  function select_value(select) {
    const selected_option = select.querySelector(":checked");
    return selected_option && selected_option.__value;
  }
  function custom_event(
    type,
    detail,
    { bubbles = false, cancelable = false } = {},
  ) {
    const e = document.createEvent("CustomEvent");
    e.initCustomEvent(type, bubbles, cancelable, detail);
    return e;
  }

  let current_component;
  function set_current_component(component) {
    current_component = component;
  }
  function get_current_component() {
    if (!current_component)
      throw new Error("Function called outside component initialization");
    return current_component;
  }
  /**
   * Schedules a callback to run immediately after the component has been updated.
   *
   * The first time the callback runs will be after the initial `onMount`
   */
  function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
  }

  const dirty_components = [];
  const binding_callbacks = [];
  let render_callbacks = [];
  const flush_callbacks = [];
  const resolved_promise = /* @__PURE__ */ Promise.resolve();
  let update_scheduled = false;
  function schedule_update() {
    if (!update_scheduled) {
      update_scheduled = true;
      resolved_promise.then(flush);
    }
  }
  function add_render_callback(fn) {
    render_callbacks.push(fn);
  }
  // flush() calls callbacks in this order:
  // 1. All beforeUpdate callbacks, in order: parents before children
  // 2. All bind:this callbacks, in reverse order: children before parents.
  // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
  //    for afterUpdates called during the initial onMount, which are called in
  //    reverse order: children before parents.
  // Since callbacks might update component values, which could trigger another
  // call to flush(), the following steps guard against this:
  // 1. During beforeUpdate, any updated components will be added to the
  //    dirty_components array and will cause a reentrant call to flush(). Because
  //    the flush index is kept outside the function, the reentrant call will pick
  //    up where the earlier call left off and go through all dirty components. The
  //    current_component value is saved and restored so that the reentrant call will
  //    not interfere with the "parent" flush() call.
  // 2. bind:this callbacks cannot trigger new flush() calls.
  // 3. During afterUpdate, any updated components will NOT have their afterUpdate
  //    callback called a second time; the seen_callbacks set, outside the flush()
  //    function, guarantees this behavior.
  const seen_callbacks = new Set();
  let flushidx = 0; // Do *not* move this inside the flush() function
  function flush() {
    // Do not reenter flush while dirty components are updated, as this can
    // result in an infinite loop. Instead, let the inner flush handle it.
    // Reentrancy is ok afterwards for bindings etc.
    if (flushidx !== 0) {
      return;
    }
    const saved_component = current_component;
    do {
      // first, call beforeUpdate functions
      // and update components
      try {
        while (flushidx < dirty_components.length) {
          const component = dirty_components[flushidx];
          flushidx++;
          set_current_component(component);
          update(component.$$);
        }
      } catch (e) {
        // reset dirty state to not end up in a deadlocked state and then rethrow
        dirty_components.length = 0;
        flushidx = 0;
        throw e;
      }
      set_current_component(null);
      dirty_components.length = 0;
      flushidx = 0;
      while (binding_callbacks.length) binding_callbacks.pop()();
      // then, once components are updated, call
      // afterUpdate functions. This may cause
      // subsequent updates...
      for (let i = 0; i < render_callbacks.length; i += 1) {
        const callback = render_callbacks[i];
        if (!seen_callbacks.has(callback)) {
          // ...so guard against infinite loops
          seen_callbacks.add(callback);
          callback();
        }
      }
      render_callbacks.length = 0;
    } while (dirty_components.length);
    while (flush_callbacks.length) {
      flush_callbacks.pop()();
    }
    update_scheduled = false;
    seen_callbacks.clear();
    set_current_component(saved_component);
  }
  function update($$) {
    if ($$.fragment !== null) {
      $$.update();
      run_all($$.before_update);
      const dirty = $$.dirty;
      $$.dirty = [-1];
      $$.fragment && $$.fragment.p($$.ctx, dirty);
      $$.after_update.forEach(add_render_callback);
    }
  }
  /**
   * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
   */
  function flush_render_callbacks(fns) {
    const filtered = [];
    const targets = [];
    render_callbacks.forEach((c) =>
      fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c),
    );
    targets.forEach((c) => c());
    render_callbacks = filtered;
  }
  const outroing = new Set();
  function transition_in(block, local) {
    if (block && block.i) {
      outroing.delete(block);
      block.i(local);
    }
  }
  function mount_component(component, target, anchor, customElement) {
    const { fragment, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
      // onMount happens before the initial afterUpdate
      add_render_callback(() => {
        const new_on_destroy = component.$$.on_mount
          .map(run)
          .filter(is_function);
        // if the component was destroyed immediately
        // it will update the `$$.on_destroy` reference to `null`.
        // the destructured on_destroy may still reference to the old array
        if (component.$$.on_destroy) {
          component.$$.on_destroy.push(...new_on_destroy);
        } else {
          // Edge case - component was destroyed immediately,
          // most likely as a result of a binding initialising
          run_all(new_on_destroy);
        }
        component.$$.on_mount = [];
      });
    }
    after_update.forEach(add_render_callback);
  }
  function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
      flush_render_callbacks($$.after_update);
      run_all($$.on_destroy);
      $$.fragment && $$.fragment.d(detaching);
      // TODO null out other refs, including component.$$ (but need to
      // preserve final state?)
      $$.on_destroy = $$.fragment = null;
      $$.ctx = [];
    }
  }
  function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
      dirty_components.push(component);
      schedule_update();
      component.$$.dirty.fill(0);
    }
    component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
  }
  function init(
    component,
    options,
    instance,
    create_fragment,
    not_equal,
    props,
    append_styles,
    dirty = [-1],
  ) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = (component.$$ = {
      fragment: null,
      ctx: [],
      // state
      props,
      update: noop,
      not_equal,
      bound: blank_object(),
      // lifecycle
      on_mount: [],
      on_destroy: [],
      on_disconnect: [],
      before_update: [],
      after_update: [],
      context: new Map(
        options.context ||
          (parent_component ? parent_component.$$.context : []),
      ),
      // everything else
      callbacks: blank_object(),
      dirty,
      skip_bound: false,
      root: options.target || parent_component.$$.root,
    });
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
      ? instance(component, options.props || {}, (i, ret, ...rest) => {
          const value = rest.length ? rest[0] : ret;
          if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
            if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
            if (ready) make_dirty(component, i);
          }
          return ret;
        })
      : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
      if (options.hydrate) {
        const nodes = children(options.target);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.l(nodes);
        nodes.forEach(detach);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.c();
      }
      if (options.intro) transition_in(component.$$.fragment);
      mount_component(
        component,
        options.target,
        options.anchor,
        options.customElement,
      );
      flush();
    }
    set_current_component(parent_component);
  }
  /**
   * Base class for Svelte components. Used when dev=false.
   */
  class SvelteComponent {
    $destroy() {
      destroy_component(this, 1);
      this.$destroy = noop;
    }
    $on(type, callback) {
      if (!is_function(callback)) {
        return noop;
      }
      const callbacks =
        this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
      callbacks.push(callback);
      return () => {
        const index = callbacks.indexOf(callback);
        if (index !== -1) callbacks.splice(index, 1);
      };
    }
    $set($$props) {
      if (this.$$set && !is_empty($$props)) {
        this.$$.skip_bound = true;
        this.$$set($$props);
        this.$$.skip_bound = false;
      }
    }
  }

  function dispatch_dev(type, detail) {
    document.dispatchEvent(
      custom_event(type, Object.assign({ version: "3.59.2" }, detail), {
        bubbles: true,
      }),
    );
  }
  function append_dev(target, node) {
    dispatch_dev("SvelteDOMInsert", { target, node });
    append(target, node);
  }
  function insert_dev(target, node, anchor) {
    dispatch_dev("SvelteDOMInsert", { target, node, anchor });
    insert(target, node, anchor);
  }
  function detach_dev(node) {
    dispatch_dev("SvelteDOMRemove", { node });
    detach(node);
  }
  function listen_dev(
    node,
    event,
    handler,
    options,
    has_prevent_default,
    has_stop_propagation,
    has_stop_immediate_propagation,
  ) {
    const modifiers =
      options === true
        ? ["capture"]
        : options
        ? Array.from(Object.keys(options))
        : [];
    if (has_prevent_default) modifiers.push("preventDefault");
    if (has_stop_propagation) modifiers.push("stopPropagation");
    if (has_stop_immediate_propagation)
      modifiers.push("stopImmediatePropagation");
    dispatch_dev("SvelteDOMAddEventListener", {
      node,
      event,
      handler,
      modifiers,
    });
    const dispose = listen(node, event, handler, options);
    return () => {
      dispatch_dev("SvelteDOMRemoveEventListener", {
        node,
        event,
        handler,
        modifiers,
      });
      dispose();
    };
  }
  function attr_dev(node, attribute, value) {
    attr(node, attribute, value);
    if (value == null)
      dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
    else dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
  }
  function set_data_dev(text, data) {
    data = "" + data;
    if (text.data === data) return;
    dispatch_dev("SvelteDOMSetData", { node: text, data });
    text.data = data;
  }
  function validate_each_argument(arg) {
    if (
      typeof arg !== "string" &&
      !(arg && typeof arg === "object" && "length" in arg)
    ) {
      let msg = "{#each} only iterates over array-like objects.";
      if (typeof Symbol === "function" && arg && Symbol.iterator in arg) {
        msg += " You can use a spread to convert this iterable into an array.";
      }
      throw new Error(msg);
    }
  }
  function validate_slots(name, slot, keys) {
    for (const slot_key of Object.keys(slot)) {
      if (!~keys.indexOf(slot_key)) {
        console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
      }
    }
  }
  /**
   * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
   */
  class SvelteComponentDev extends SvelteComponent {
    constructor(options) {
      if (!options || (!options.target && !options.$$inline)) {
        throw new Error("'target' is a required option");
      }
      super();
    }
    $destroy() {
      super.$destroy();
      this.$destroy = () => {
        console.warn("Component was already destroyed"); // eslint-disable-line no-console
      };
    }
    $capture_state() {}
    $inject_state() {}
  }

  /*! js-yaml 4.1.0 https://github.com/nodeca/js-yaml @license MIT */
  function isNothing(subject) {
    return typeof subject === "undefined" || subject === null;
  }

  function isObject(subject) {
    return typeof subject === "object" && subject !== null;
  }

  function toArray(sequence) {
    if (Array.isArray(sequence)) return sequence;
    else if (isNothing(sequence)) return [];

    return [sequence];
  }

  function extend(target, source) {
    var index, length, key, sourceKeys;

    if (source) {
      sourceKeys = Object.keys(source);

      for (index = 0, length = sourceKeys.length; index < length; index += 1) {
        key = sourceKeys[index];
        target[key] = source[key];
      }
    }

    return target;
  }

  function repeat(string, count) {
    var result = "",
      cycle;

    for (cycle = 0; cycle < count; cycle += 1) {
      result += string;
    }

    return result;
  }

  function isNegativeZero(number) {
    return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
  }

  var isNothing_1 = isNothing;
  var isObject_1 = isObject;
  var toArray_1 = toArray;
  var repeat_1 = repeat;
  var isNegativeZero_1 = isNegativeZero;
  var extend_1 = extend;

  var common = {
    isNothing: isNothing_1,
    isObject: isObject_1,
    toArray: toArray_1,
    repeat: repeat_1,
    isNegativeZero: isNegativeZero_1,
    extend: extend_1,
  };

  // YAML error class. http://stackoverflow.com/questions/8458984

  function formatError(exception, compact) {
    var where = "",
      message = exception.reason || "(unknown reason)";

    if (!exception.mark) return message;

    if (exception.mark.name) {
      where += 'in "' + exception.mark.name + '" ';
    }

    where +=
      "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";

    if (!compact && exception.mark.snippet) {
      where += "\n\n" + exception.mark.snippet;
    }

    return message + " " + where;
  }

  function YAMLException$1(reason, mark) {
    // Super constructor
    Error.call(this);

    this.name = "YAMLException";
    this.reason = reason;
    this.mark = mark;
    this.message = formatError(this, false);

    // Include stack trace in error object
    if (Error.captureStackTrace) {
      // Chrome and NodeJS
      Error.captureStackTrace(this, this.constructor);
    } else {
      // FF, IE 10+ and Safari 6+. Fallback for others
      this.stack = new Error().stack || "";
    }
  }

  // Inherit from Error
  YAMLException$1.prototype = Object.create(Error.prototype);
  YAMLException$1.prototype.constructor = YAMLException$1;

  YAMLException$1.prototype.toString = function toString(compact) {
    return this.name + ": " + formatError(this, compact);
  };

  var exception = YAMLException$1;

  // get snippet for a single line, respecting maxLength
  function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
    var head = "";
    var tail = "";
    var maxHalfLength = Math.floor(maxLineLength / 2) - 1;

    if (position - lineStart > maxHalfLength) {
      head = " ... ";
      lineStart = position - maxHalfLength + head.length;
    }

    if (lineEnd - position > maxHalfLength) {
      tail = " ...";
      lineEnd = position + maxHalfLength - tail.length;
    }

    return {
      str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "→") + tail,
      pos: position - lineStart + head.length, // relative position
    };
  }

  function padStart(string, max) {
    return common.repeat(" ", max - string.length) + string;
  }

  function makeSnippet(mark, options) {
    options = Object.create(options || null);

    if (!mark.buffer) return null;

    if (!options.maxLength) options.maxLength = 79;
    if (typeof options.indent !== "number") options.indent = 1;
    if (typeof options.linesBefore !== "number") options.linesBefore = 3;
    if (typeof options.linesAfter !== "number") options.linesAfter = 2;

    var re = /\r?\n|\r|\0/g;
    var lineStarts = [0];
    var lineEnds = [];
    var match;
    var foundLineNo = -1;

    while ((match = re.exec(mark.buffer))) {
      lineEnds.push(match.index);
      lineStarts.push(match.index + match[0].length);

      if (mark.position <= match.index && foundLineNo < 0) {
        foundLineNo = lineStarts.length - 2;
      }
    }

    if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;

    var result = "",
      i,
      line;
    var lineNoLength = Math.min(
      mark.line + options.linesAfter,
      lineEnds.length,
    ).toString().length;
    var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);

    for (i = 1; i <= options.linesBefore; i++) {
      if (foundLineNo - i < 0) break;
      line = getLine(
        mark.buffer,
        lineStarts[foundLineNo - i],
        lineEnds[foundLineNo - i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
        maxLineLength,
      );
      result =
        common.repeat(" ", options.indent) +
        padStart((mark.line - i + 1).toString(), lineNoLength) +
        " | " +
        line.str +
        "\n" +
        result;
    }

    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo],
      lineEnds[foundLineNo],
      mark.position,
      maxLineLength,
    );
    result +=
      common.repeat(" ", options.indent) +
      padStart((mark.line + 1).toString(), lineNoLength) +
      " | " +
      line.str +
      "\n";
    result +=
      common.repeat("-", options.indent + lineNoLength + 3 + line.pos) +
      "^" +
      "\n";

    for (i = 1; i <= options.linesAfter; i++) {
      if (foundLineNo + i >= lineEnds.length) break;
      line = getLine(
        mark.buffer,
        lineStarts[foundLineNo + i],
        lineEnds[foundLineNo + i],
        mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
        maxLineLength,
      );
      result +=
        common.repeat(" ", options.indent) +
        padStart((mark.line + i + 1).toString(), lineNoLength) +
        " | " +
        line.str +
        "\n";
    }

    return result.replace(/\n$/, "");
  }

  var snippet = makeSnippet;

  var TYPE_CONSTRUCTOR_OPTIONS = [
    "kind",
    "multi",
    "resolve",
    "construct",
    "instanceOf",
    "predicate",
    "represent",
    "representName",
    "defaultStyle",
    "styleAliases",
  ];

  var YAML_NODE_KINDS = ["scalar", "sequence", "mapping"];

  function compileStyleAliases(map) {
    var result = {};

    if (map !== null) {
      Object.keys(map).forEach(function (style) {
        map[style].forEach(function (alias) {
          result[String(alias)] = style;
        });
      });
    }

    return result;
  }

  function Type$1(tag, options) {
    options = options || {};

    Object.keys(options).forEach(function (name) {
      if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
        throw new exception(
          'Unknown option "' +
            name +
            '" is met in definition of "' +
            tag +
            '" YAML type.',
        );
      }
    });

    // TODO: Add tag format check.
    this.options = options; // keep original options in case user wants to extend this type later
    this.tag = tag;
    this.kind = options["kind"] || null;
    this.resolve =
      options["resolve"] ||
      function () {
        return true;
      };
    this.construct =
      options["construct"] ||
      function (data) {
        return data;
      };
    this.instanceOf = options["instanceOf"] || null;
    this.predicate = options["predicate"] || null;
    this.represent = options["represent"] || null;
    this.representName = options["representName"] || null;
    this.defaultStyle = options["defaultStyle"] || null;
    this.multi = options["multi"] || false;
    this.styleAliases = compileStyleAliases(options["styleAliases"] || null);

    if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
      throw new exception(
        'Unknown kind "' +
          this.kind +
          '" is specified for "' +
          tag +
          '" YAML type.',
      );
    }
  }

  var type = Type$1;

  /*eslint-disable max-len*/

  function compileList(schema, name) {
    var result = [];

    schema[name].forEach(function (currentType) {
      var newIndex = result.length;

      result.forEach(function (previousType, previousIndex) {
        if (
          previousType.tag === currentType.tag &&
          previousType.kind === currentType.kind &&
          previousType.multi === currentType.multi
        ) {
          newIndex = previousIndex;
        }
      });

      result[newIndex] = currentType;
    });

    return result;
  }

  function compileMap(/* lists... */) {
    var result = {
        scalar: {},
        sequence: {},
        mapping: {},
        fallback: {},
        multi: {
          scalar: [],
          sequence: [],
          mapping: [],
          fallback: [],
        },
      },
      index,
      length;

    function collectType(type) {
      if (type.multi) {
        result.multi[type.kind].push(type);
        result.multi["fallback"].push(type);
      } else {
        result[type.kind][type.tag] = result["fallback"][type.tag] = type;
      }
    }

    for (index = 0, length = arguments.length; index < length; index += 1) {
      arguments[index].forEach(collectType);
    }
    return result;
  }

  function Schema$1(definition) {
    return this.extend(definition);
  }

  Schema$1.prototype.extend = function extend(definition) {
    var implicit = [];
    var explicit = [];

    if (definition instanceof type) {
      // Schema.extend(type)
      explicit.push(definition);
    } else if (Array.isArray(definition)) {
      // Schema.extend([ type1, type2, ... ])
      explicit = explicit.concat(definition);
    } else if (
      definition &&
      (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))
    ) {
      // Schema.extend({ explicit: [ type1, type2, ... ], implicit: [ type1, type2, ... ] })
      if (definition.implicit) implicit = implicit.concat(definition.implicit);
      if (definition.explicit) explicit = explicit.concat(definition.explicit);
    } else {
      throw new exception(
        "Schema.extend argument should be a Type, [ Type ], " +
          "or a schema definition ({ implicit: [...], explicit: [...] })",
      );
    }

    implicit.forEach(function (type$1) {
      if (!(type$1 instanceof type)) {
        throw new exception(
          "Specified list of YAML types (or a single Type object) contains a non-Type object.",
        );
      }

      if (type$1.loadKind && type$1.loadKind !== "scalar") {
        throw new exception(
          "There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.",
        );
      }

      if (type$1.multi) {
        throw new exception(
          "There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.",
        );
      }
    });

    explicit.forEach(function (type$1) {
      if (!(type$1 instanceof type)) {
        throw new exception(
          "Specified list of YAML types (or a single Type object) contains a non-Type object.",
        );
      }
    });

    var result = Object.create(Schema$1.prototype);

    result.implicit = (this.implicit || []).concat(implicit);
    result.explicit = (this.explicit || []).concat(explicit);

    result.compiledImplicit = compileList(result, "implicit");
    result.compiledExplicit = compileList(result, "explicit");
    result.compiledTypeMap = compileMap(
      result.compiledImplicit,
      result.compiledExplicit,
    );

    return result;
  };

  var schema = Schema$1;

  var str = new type("tag:yaml.org,2002:str", {
    kind: "scalar",
    construct: function (data) {
      return data !== null ? data : "";
    },
  });

  var seq = new type("tag:yaml.org,2002:seq", {
    kind: "sequence",
    construct: function (data) {
      return data !== null ? data : [];
    },
  });

  var map = new type("tag:yaml.org,2002:map", {
    kind: "mapping",
    construct: function (data) {
      return data !== null ? data : {};
    },
  });

  var failsafe = new schema({
    explicit: [str, seq, map],
  });

  function resolveYamlNull(data) {
    if (data === null) return true;

    var max = data.length;

    return (
      (max === 1 && data === "~") ||
      (max === 4 && (data === "null" || data === "Null" || data === "NULL"))
    );
  }

  function constructYamlNull() {
    return null;
  }

  function isNull(object) {
    return object === null;
  }

  var _null = new type("tag:yaml.org,2002:null", {
    kind: "scalar",
    resolve: resolveYamlNull,
    construct: constructYamlNull,
    predicate: isNull,
    represent: {
      canonical: function () {
        return "~";
      },
      lowercase: function () {
        return "null";
      },
      uppercase: function () {
        return "NULL";
      },
      camelcase: function () {
        return "Null";
      },
      empty: function () {
        return "";
      },
    },
    defaultStyle: "lowercase",
  });

  function resolveYamlBoolean(data) {
    if (data === null) return false;

    var max = data.length;

    return (
      (max === 4 && (data === "true" || data === "True" || data === "TRUE")) ||
      (max === 5 && (data === "false" || data === "False" || data === "FALSE"))
    );
  }

  function constructYamlBoolean(data) {
    return data === "true" || data === "True" || data === "TRUE";
  }

  function isBoolean(object) {
    return Object.prototype.toString.call(object) === "[object Boolean]";
  }

  var bool = new type("tag:yaml.org,2002:bool", {
    kind: "scalar",
    resolve: resolveYamlBoolean,
    construct: constructYamlBoolean,
    predicate: isBoolean,
    represent: {
      lowercase: function (object) {
        return object ? "true" : "false";
      },
      uppercase: function (object) {
        return object ? "TRUE" : "FALSE";
      },
      camelcase: function (object) {
        return object ? "True" : "False";
      },
    },
    defaultStyle: "lowercase",
  });

  function isHexCode(c) {
    return (
      (0x30 /* 0 */ <= c && c <= 0x39) /* 9 */ ||
      (0x41 /* A */ <= c && c <= 0x46) /* F */ ||
      (0x61 /* a */ <= c && c <= 0x66) /* f */
    );
  }

  function isOctCode(c) {
    return 0x30 /* 0 */ <= c && c <= 0x37 /* 7 */;
  }

  function isDecCode(c) {
    return 0x30 /* 0 */ <= c && c <= 0x39 /* 9 */;
  }

  function resolveYamlInteger(data) {
    if (data === null) return false;

    var max = data.length,
      index = 0,
      hasDigits = false,
      ch;

    if (!max) return false;

    ch = data[index];

    // sign
    if (ch === "-" || ch === "+") {
      ch = data[++index];
    }

    if (ch === "0") {
      // 0
      if (index + 1 === max) return true;
      ch = data[++index];

      // base 2, base 8, base 16

      if (ch === "b") {
        // base 2
        index++;

        for (; index < max; index++) {
          ch = data[index];
          if (ch === "_") continue;
          if (ch !== "0" && ch !== "1") return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }

      if (ch === "x") {
        // base 16
        index++;

        for (; index < max; index++) {
          ch = data[index];
          if (ch === "_") continue;
          if (!isHexCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }

      if (ch === "o") {
        // base 8
        index++;

        for (; index < max; index++) {
          ch = data[index];
          if (ch === "_") continue;
          if (!isOctCode(data.charCodeAt(index))) return false;
          hasDigits = true;
        }
        return hasDigits && ch !== "_";
      }
    }

    // base 10 (except 0)

    // value should not start with `_`;
    if (ch === "_") return false;

    for (; index < max; index++) {
      ch = data[index];
      if (ch === "_") continue;
      if (!isDecCode(data.charCodeAt(index))) {
        return false;
      }
      hasDigits = true;
    }

    // Should have digits and should not end with `_`
    if (!hasDigits || ch === "_") return false;

    return true;
  }

  function constructYamlInteger(data) {
    var value = data,
      sign = 1,
      ch;

    if (value.indexOf("_") !== -1) {
      value = value.replace(/_/g, "");
    }

    ch = value[0];

    if (ch === "-" || ch === "+") {
      if (ch === "-") sign = -1;
      value = value.slice(1);
      ch = value[0];
    }

    if (value === "0") return 0;

    if (ch === "0") {
      if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
      if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
      if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
    }

    return sign * parseInt(value, 10);
  }

  function isInteger(object) {
    return (
      Object.prototype.toString.call(object) === "[object Number]" &&
      object % 1 === 0 &&
      !common.isNegativeZero(object)
    );
  }

  var int = new type("tag:yaml.org,2002:int", {
    kind: "scalar",
    resolve: resolveYamlInteger,
    construct: constructYamlInteger,
    predicate: isInteger,
    represent: {
      binary: function (obj) {
        return obj >= 0
          ? "0b" + obj.toString(2)
          : "-0b" + obj.toString(2).slice(1);
      },
      octal: function (obj) {
        return obj >= 0
          ? "0o" + obj.toString(8)
          : "-0o" + obj.toString(8).slice(1);
      },
      decimal: function (obj) {
        return obj.toString(10);
      },
      /* eslint-disable max-len */
      hexadecimal: function (obj) {
        return obj >= 0
          ? "0x" + obj.toString(16).toUpperCase()
          : "-0x" + obj.toString(16).toUpperCase().slice(1);
      },
    },
    defaultStyle: "decimal",
    styleAliases: {
      binary: [2, "bin"],
      octal: [8, "oct"],
      decimal: [10, "dec"],
      hexadecimal: [16, "hex"],
    },
  });

  var YAML_FLOAT_PATTERN = new RegExp(
    // 2.5e4, 2.5 and integers
    "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?" +
      // .2e4, .2
      // special case, seems not from spec
      "|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?" +
      // .inf
      "|[-+]?\\.(?:inf|Inf|INF)" +
      // .nan
      "|\\.(?:nan|NaN|NAN))$",
  );

  function resolveYamlFloat(data) {
    if (data === null) return false;

    if (
      !YAML_FLOAT_PATTERN.test(data) ||
      // Quick hack to not allow integers end with `_`
      // Probably should update regexp & check speed
      data[data.length - 1] === "_"
    ) {
      return false;
    }

    return true;
  }

  function constructYamlFloat(data) {
    var value, sign;

    value = data.replace(/_/g, "").toLowerCase();
    sign = value[0] === "-" ? -1 : 1;

    if ("+-".indexOf(value[0]) >= 0) {
      value = value.slice(1);
    }

    if (value === ".inf") {
      return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    } else if (value === ".nan") {
      return NaN;
    }
    return sign * parseFloat(value, 10);
  }

  var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;

  function representYamlFloat(object, style) {
    var res;

    if (isNaN(object)) {
      switch (style) {
        case "lowercase":
          return ".nan";
        case "uppercase":
          return ".NAN";
        case "camelcase":
          return ".NaN";
      }
    } else if (Number.POSITIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return ".inf";
        case "uppercase":
          return ".INF";
        case "camelcase":
          return ".Inf";
      }
    } else if (Number.NEGATIVE_INFINITY === object) {
      switch (style) {
        case "lowercase":
          return "-.inf";
        case "uppercase":
          return "-.INF";
        case "camelcase":
          return "-.Inf";
      }
    } else if (common.isNegativeZero(object)) {
      return "-0.0";
    }

    res = object.toString(10);

    // JS stringifier can build scientific format without dots: 5e-100,
    // while YAML requres dot: 5.e-100. Fix it with simple hack

    return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
  }

  function isFloat(object) {
    return (
      Object.prototype.toString.call(object) === "[object Number]" &&
      (object % 1 !== 0 || common.isNegativeZero(object))
    );
  }

  var float = new type("tag:yaml.org,2002:float", {
    kind: "scalar",
    resolve: resolveYamlFloat,
    construct: constructYamlFloat,
    predicate: isFloat,
    represent: representYamlFloat,
    defaultStyle: "lowercase",
  });

  var json = failsafe.extend({
    implicit: [_null, bool, int, float],
  });

  var core = json;

  var YAML_DATE_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])" + // [1] year
      "-([0-9][0-9])" + // [2] month
      "-([0-9][0-9])$",
  ); // [3] day

  var YAML_TIMESTAMP_REGEXP = new RegExp(
    "^([0-9][0-9][0-9][0-9])" + // [1] year
      "-([0-9][0-9]?)" + // [2] month
      "-([0-9][0-9]?)" + // [3] day
      "(?:[Tt]|[ \\t]+)" + // ...
      "([0-9][0-9]?)" + // [4] hour
      ":([0-9][0-9])" + // [5] minute
      ":([0-9][0-9])" + // [6] second
      "(?:\\.([0-9]*))?" + // [7] fraction
      "(?:[ \\t]*(Z|([-+])([0-9][0-9]?)" + // [8] tz [9] tz_sign [10] tz_hour
      "(?::([0-9][0-9]))?))?$",
  ); // [11] tz_minute

  function resolveYamlTimestamp(data) {
    if (data === null) return false;
    if (YAML_DATE_REGEXP.exec(data) !== null) return true;
    if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
    return false;
  }

  function constructYamlTimestamp(data) {
    var match,
      year,
      month,
      day,
      hour,
      minute,
      second,
      fraction = 0,
      delta = null,
      tz_hour,
      tz_minute,
      date;

    match = YAML_DATE_REGEXP.exec(data);
    if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);

    if (match === null) throw new Error("Date resolve error");

    // match: [1] year [2] month [3] day

    year = +match[1];
    month = +match[2] - 1; // JS month starts with 0
    day = +match[3];

    if (!match[4]) {
      // no hour
      return new Date(Date.UTC(year, month, day));
    }

    // match: [4] hour [5] minute [6] second [7] fraction

    hour = +match[4];
    minute = +match[5];
    second = +match[6];

    if (match[7]) {
      fraction = match[7].slice(0, 3);
      while (fraction.length < 3) {
        // milli-seconds
        fraction += "0";
      }
      fraction = +fraction;
    }

    // match: [8] tz [9] tz_sign [10] tz_hour [11] tz_minute

    if (match[9]) {
      tz_hour = +match[10];
      tz_minute = +(match[11] || 0);
      delta = (tz_hour * 60 + tz_minute) * 60000; // delta in mili-seconds
      if (match[9] === "-") delta = -delta;
    }

    date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));

    if (delta) date.setTime(date.getTime() - delta);

    return date;
  }

  function representYamlTimestamp(object /*, style*/) {
    return object.toISOString();
  }

  var timestamp = new type("tag:yaml.org,2002:timestamp", {
    kind: "scalar",
    resolve: resolveYamlTimestamp,
    construct: constructYamlTimestamp,
    instanceOf: Date,
    represent: representYamlTimestamp,
  });

  function resolveYamlMerge(data) {
    return data === "<<" || data === null;
  }

  var merge = new type("tag:yaml.org,2002:merge", {
    kind: "scalar",
    resolve: resolveYamlMerge,
  });

  /*eslint-disable no-bitwise*/

  // [ 64, 65, 66 ] -> [ padding, CR, LF ]
  var BASE64_MAP =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";

  function resolveYamlBinary(data) {
    if (data === null) return false;

    var code,
      idx,
      bitlen = 0,
      max = data.length,
      map = BASE64_MAP;

    // Convert one by one.
    for (idx = 0; idx < max; idx++) {
      code = map.indexOf(data.charAt(idx));

      // Skip CR/LF
      if (code > 64) continue;

      // Fail on illegal characters
      if (code < 0) return false;

      bitlen += 6;
    }

    // If there are any bits left, source was corrupted
    return bitlen % 8 === 0;
  }

  function constructYamlBinary(data) {
    var idx,
      tailbits,
      input = data.replace(/[\r\n=]/g, ""), // remove CR/LF & padding to simplify scan
      max = input.length,
      map = BASE64_MAP,
      bits = 0,
      result = [];

    // Collect by 6*4 bits (3 bytes)

    for (idx = 0; idx < max; idx++) {
      if (idx % 4 === 0 && idx) {
        result.push((bits >> 16) & 0xff);
        result.push((bits >> 8) & 0xff);
        result.push(bits & 0xff);
      }

      bits = (bits << 6) | map.indexOf(input.charAt(idx));
    }

    // Dump tail

    tailbits = (max % 4) * 6;

    if (tailbits === 0) {
      result.push((bits >> 16) & 0xff);
      result.push((bits >> 8) & 0xff);
      result.push(bits & 0xff);
    } else if (tailbits === 18) {
      result.push((bits >> 10) & 0xff);
      result.push((bits >> 2) & 0xff);
    } else if (tailbits === 12) {
      result.push((bits >> 4) & 0xff);
    }

    return new Uint8Array(result);
  }

  function representYamlBinary(object /*, style*/) {
    var result = "",
      bits = 0,
      idx,
      tail,
      max = object.length,
      map = BASE64_MAP;

    // Convert every three bytes to 4 ASCII characters.

    for (idx = 0; idx < max; idx++) {
      if (idx % 3 === 0 && idx) {
        result += map[(bits >> 18) & 0x3f];
        result += map[(bits >> 12) & 0x3f];
        result += map[(bits >> 6) & 0x3f];
        result += map[bits & 0x3f];
      }

      bits = (bits << 8) + object[idx];
    }

    // Dump tail

    tail = max % 3;

    if (tail === 0) {
      result += map[(bits >> 18) & 0x3f];
      result += map[(bits >> 12) & 0x3f];
      result += map[(bits >> 6) & 0x3f];
      result += map[bits & 0x3f];
    } else if (tail === 2) {
      result += map[(bits >> 10) & 0x3f];
      result += map[(bits >> 4) & 0x3f];
      result += map[(bits << 2) & 0x3f];
      result += map[64];
    } else if (tail === 1) {
      result += map[(bits >> 2) & 0x3f];
      result += map[(bits << 4) & 0x3f];
      result += map[64];
      result += map[64];
    }

    return result;
  }

  function isBinary(obj) {
    return Object.prototype.toString.call(obj) === "[object Uint8Array]";
  }

  var binary = new type("tag:yaml.org,2002:binary", {
    kind: "scalar",
    resolve: resolveYamlBinary,
    construct: constructYamlBinary,
    predicate: isBinary,
    represent: representYamlBinary,
  });

  var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
  var _toString$2 = Object.prototype.toString;

  function resolveYamlOmap(data) {
    if (data === null) return true;

    var objectKeys = [],
      index,
      length,
      pair,
      pairKey,
      pairHasKey,
      object = data;

    for (index = 0, length = object.length; index < length; index += 1) {
      pair = object[index];
      pairHasKey = false;

      if (_toString$2.call(pair) !== "[object Object]") return false;

      for (pairKey in pair) {
        if (_hasOwnProperty$3.call(pair, pairKey)) {
          if (!pairHasKey) pairHasKey = true;
          else return false;
        }
      }

      if (!pairHasKey) return false;

      if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
      else return false;
    }

    return true;
  }

  function constructYamlOmap(data) {
    return data !== null ? data : [];
  }

  var omap = new type("tag:yaml.org,2002:omap", {
    kind: "sequence",
    resolve: resolveYamlOmap,
    construct: constructYamlOmap,
  });

  var _toString$1 = Object.prototype.toString;

  function resolveYamlPairs(data) {
    if (data === null) return true;

    var index,
      length,
      pair,
      keys,
      result,
      object = data;

    result = new Array(object.length);

    for (index = 0, length = object.length; index < length; index += 1) {
      pair = object[index];

      if (_toString$1.call(pair) !== "[object Object]") return false;

      keys = Object.keys(pair);

      if (keys.length !== 1) return false;

      result[index] = [keys[0], pair[keys[0]]];
    }

    return true;
  }

  function constructYamlPairs(data) {
    if (data === null) return [];

    var index,
      length,
      pair,
      keys,
      result,
      object = data;

    result = new Array(object.length);

    for (index = 0, length = object.length; index < length; index += 1) {
      pair = object[index];

      keys = Object.keys(pair);

      result[index] = [keys[0], pair[keys[0]]];
    }

    return result;
  }

  var pairs = new type("tag:yaml.org,2002:pairs", {
    kind: "sequence",
    resolve: resolveYamlPairs,
    construct: constructYamlPairs,
  });

  var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;

  function resolveYamlSet(data) {
    if (data === null) return true;

    var key,
      object = data;

    for (key in object) {
      if (_hasOwnProperty$2.call(object, key)) {
        if (object[key] !== null) return false;
      }
    }

    return true;
  }

  function constructYamlSet(data) {
    return data !== null ? data : {};
  }

  var set = new type("tag:yaml.org,2002:set", {
    kind: "mapping",
    resolve: resolveYamlSet,
    construct: constructYamlSet,
  });

  var _default = core.extend({
    implicit: [timestamp, merge],
    explicit: [binary, omap, pairs, set],
  });

  /*eslint-disable max-len,no-use-before-define*/

  var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;

  var CONTEXT_FLOW_IN = 1;
  var CONTEXT_FLOW_OUT = 2;
  var CONTEXT_BLOCK_IN = 3;
  var CONTEXT_BLOCK_OUT = 4;

  var CHOMPING_CLIP = 1;
  var CHOMPING_STRIP = 2;
  var CHOMPING_KEEP = 3;

  var PATTERN_NON_PRINTABLE =
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
  var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
  var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
  var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
  var PATTERN_TAG_URI =
    /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;

  function _class(obj) {
    return Object.prototype.toString.call(obj);
  }

  function is_EOL(c) {
    return c === 0x0a /* LF */ || c === 0x0d /* CR */;
  }

  function is_WHITE_SPACE(c) {
    return c === 0x09 /* Tab */ || c === 0x20 /* Space */;
  }

  function is_WS_OR_EOL(c) {
    return (
      c === 0x09 /* Tab */ ||
      c === 0x20 /* Space */ ||
      c === 0x0a /* LF */ ||
      c === 0x0d /* CR */
    );
  }

  function is_FLOW_INDICATOR(c) {
    return (
      c === 0x2c /* , */ ||
      c === 0x5b /* [ */ ||
      c === 0x5d /* ] */ ||
      c === 0x7b /* { */ ||
      c === 0x7d /* } */
    );
  }

  function fromHexCode(c) {
    var lc;

    if (0x30 /* 0 */ <= c && c <= 0x39 /* 9 */) {
      return c - 0x30;
    }

    /*eslint-disable no-bitwise*/
    lc = c | 0x20;

    if (0x61 /* a */ <= lc && lc <= 0x66 /* f */) {
      return lc - 0x61 + 10;
    }

    return -1;
  }

  function escapedHexLen(c) {
    if (c === 0x78 /* x */) {
      return 2;
    }
    if (c === 0x75 /* u */) {
      return 4;
    }
    if (c === 0x55 /* U */) {
      return 8;
    }
    return 0;
  }

  function fromDecimalCode(c) {
    if (0x30 /* 0 */ <= c && c <= 0x39 /* 9 */) {
      return c - 0x30;
    }

    return -1;
  }

  function simpleEscapeSequence(c) {
    /* eslint-disable indent */
    return c === 0x30 /* 0 */
      ? "\x00"
      : c === 0x61 /* a */
      ? "\x07"
      : c === 0x62 /* b */
      ? "\x08"
      : c === 0x74 /* t */
      ? "\x09"
      : c === 0x09 /* Tab */
      ? "\x09"
      : c === 0x6e /* n */
      ? "\x0A"
      : c === 0x76 /* v */
      ? "\x0B"
      : c === 0x66 /* f */
      ? "\x0C"
      : c === 0x72 /* r */
      ? "\x0D"
      : c === 0x65 /* e */
      ? "\x1B"
      : c === 0x20 /* Space */
      ? " "
      : c === 0x22 /* " */
      ? "\x22"
      : c === 0x2f /* / */
      ? "/"
      : c === 0x5c /* \ */
      ? "\x5C"
      : c === 0x4e /* N */
      ? "\x85"
      : c === 0x5f /* _ */
      ? "\xA0"
      : c === 0x4c /* L */
      ? "\u2028"
      : c === 0x50 /* P */
      ? "\u2029"
      : "";
  }

  function charFromCodepoint(c) {
    if (c <= 0xffff) {
      return String.fromCharCode(c);
    }
    // Encode UTF-16 surrogate pair
    // https://en.wikipedia.org/wiki/UTF-16#Code_points_U.2B010000_to_U.2B10FFFF
    return String.fromCharCode(
      ((c - 0x010000) >> 10) + 0xd800,
      ((c - 0x010000) & 0x03ff) + 0xdc00,
    );
  }

  var simpleEscapeCheck = new Array(256); // integer, for fast access
  var simpleEscapeMap = new Array(256);
  for (var i = 0; i < 256; i++) {
    simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
    simpleEscapeMap[i] = simpleEscapeSequence(i);
  }

  function State$1(input, options) {
    this.input = input;

    this.filename = options["filename"] || null;
    this.schema = options["schema"] || _default;
    this.onWarning = options["onWarning"] || null;
    // (Hidden) Remove? makes the loader to expect YAML 1.1 documents
    // if such documents have no explicit %YAML directive
    this.legacy = options["legacy"] || false;

    this.json = options["json"] || false;
    this.listener = options["listener"] || null;

    this.implicitTypes = this.schema.compiledImplicit;
    this.typeMap = this.schema.compiledTypeMap;

    this.length = input.length;
    this.position = 0;
    this.line = 0;
    this.lineStart = 0;
    this.lineIndent = 0;

    // position of first leading tab in the current line,
    // used to make sure there are no tabs in the indentation
    this.firstTabInLine = -1;

    this.documents = [];

    /*
      this.version;
      this.checkLineBreaks;
      this.tagMap;
      this.anchorMap;
      this.tag;
      this.anchor;
      this.kind;
      this.result;*/
  }

  function generateError(state, message) {
    var mark = {
      name: state.filename,
      buffer: state.input.slice(0, -1), // omit trailing \0
      position: state.position,
      line: state.line,
      column: state.position - state.lineStart,
    };

    mark.snippet = snippet(mark);

    return new exception(message, mark);
  }

  function throwError(state, message) {
    throw generateError(state, message);
  }

  function throwWarning(state, message) {
    if (state.onWarning) {
      state.onWarning.call(null, generateError(state, message));
    }
  }

  var directiveHandlers = {
    YAML: function handleYamlDirective(state, name, args) {
      var match, major, minor;

      if (state.version !== null) {
        throwError(state, "duplication of %YAML directive");
      }

      if (args.length !== 1) {
        throwError(state, "YAML directive accepts exactly one argument");
      }

      match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);

      if (match === null) {
        throwError(state, "ill-formed argument of the YAML directive");
      }

      major = parseInt(match[1], 10);
      minor = parseInt(match[2], 10);

      if (major !== 1) {
        throwError(state, "unacceptable YAML version of the document");
      }

      state.version = args[0];
      state.checkLineBreaks = minor < 2;

      if (minor !== 1 && minor !== 2) {
        throwWarning(state, "unsupported YAML version of the document");
      }
    },

    TAG: function handleTagDirective(state, name, args) {
      var handle, prefix;

      if (args.length !== 2) {
        throwError(state, "TAG directive accepts exactly two arguments");
      }

      handle = args[0];
      prefix = args[1];

      if (!PATTERN_TAG_HANDLE.test(handle)) {
        throwError(
          state,
          "ill-formed tag handle (first argument) of the TAG directive",
        );
      }

      if (_hasOwnProperty$1.call(state.tagMap, handle)) {
        throwError(
          state,
          'there is a previously declared suffix for "' +
            handle +
            '" tag handle',
        );
      }

      if (!PATTERN_TAG_URI.test(prefix)) {
        throwError(
          state,
          "ill-formed tag prefix (second argument) of the TAG directive",
        );
      }

      try {
        prefix = decodeURIComponent(prefix);
      } catch (err) {
        throwError(state, "tag prefix is malformed: " + prefix);
      }

      state.tagMap[handle] = prefix;
    },
  };

  function captureSegment(state, start, end, checkJson) {
    var _position, _length, _character, _result;

    if (start < end) {
      _result = state.input.slice(start, end);

      if (checkJson) {
        for (
          _position = 0, _length = _result.length;
          _position < _length;
          _position += 1
        ) {
          _character = _result.charCodeAt(_position);
          if (
            !(
              _character === 0x09 ||
              (0x20 <= _character && _character <= 0x10ffff)
            )
          ) {
            throwError(state, "expected valid JSON character");
          }
        }
      } else if (PATTERN_NON_PRINTABLE.test(_result)) {
        throwError(state, "the stream contains non-printable characters");
      }

      state.result += _result;
    }
  }

  function mergeMappings(state, destination, source, overridableKeys) {
    var sourceKeys, key, index, quantity;

    if (!common.isObject(source)) {
      throwError(
        state,
        "cannot merge mappings; the provided source object is unacceptable",
      );
    }

    sourceKeys = Object.keys(source);

    for (
      index = 0, quantity = sourceKeys.length;
      index < quantity;
      index += 1
    ) {
      key = sourceKeys[index];

      if (!_hasOwnProperty$1.call(destination, key)) {
        destination[key] = source[key];
        overridableKeys[key] = true;
      }
    }
  }

  function storeMappingPair(
    state,
    _result,
    overridableKeys,
    keyTag,
    keyNode,
    valueNode,
    startLine,
    startLineStart,
    startPos,
  ) {
    var index, quantity;

    // The output is a plain object here, so keys can only be strings.
    // We need to convert keyNode to a string, but doing so can hang the process
    // (deeply nested arrays that explode exponentially using aliases).
    if (Array.isArray(keyNode)) {
      keyNode = Array.prototype.slice.call(keyNode);

      for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
        if (Array.isArray(keyNode[index])) {
          throwError(state, "nested arrays are not supported inside keys");
        }

        if (
          typeof keyNode === "object" &&
          _class(keyNode[index]) === "[object Object]"
        ) {
          keyNode[index] = "[object Object]";
        }
      }
    }

    // Avoid code execution in load() via toString property
    // (still use its own toString for arrays, timestamps,
    // and whatever user schema extensions happen to have @@toStringTag)
    if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
      keyNode = "[object Object]";
    }

    keyNode = String(keyNode);

    if (_result === null) {
      _result = {};
    }

    if (keyTag === "tag:yaml.org,2002:merge") {
      if (Array.isArray(valueNode)) {
        for (
          index = 0, quantity = valueNode.length;
          index < quantity;
          index += 1
        ) {
          mergeMappings(state, _result, valueNode[index], overridableKeys);
        }
      } else {
        mergeMappings(state, _result, valueNode, overridableKeys);
      }
    } else {
      if (
        !state.json &&
        !_hasOwnProperty$1.call(overridableKeys, keyNode) &&
        _hasOwnProperty$1.call(_result, keyNode)
      ) {
        state.line = startLine || state.line;
        state.lineStart = startLineStart || state.lineStart;
        state.position = startPos || state.position;
        throwError(state, "duplicated mapping key");
      }

      // used for this specific key only because Object.defineProperty is slow
      if (keyNode === "__proto__") {
        Object.defineProperty(_result, keyNode, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: valueNode,
        });
      } else {
        _result[keyNode] = valueNode;
      }
      delete overridableKeys[keyNode];
    }

    return _result;
  }

  function readLineBreak(state) {
    var ch;

    ch = state.input.charCodeAt(state.position);

    if (ch === 0x0a /* LF */) {
      state.position++;
    } else if (ch === 0x0d /* CR */) {
      state.position++;
      if (state.input.charCodeAt(state.position) === 0x0a /* LF */) {
        state.position++;
      }
    } else {
      throwError(state, "a line break is expected");
    }

    state.line += 1;
    state.lineStart = state.position;
    state.firstTabInLine = -1;
  }

  function skipSeparationSpace(state, allowComments, checkIndent) {
    var lineBreaks = 0,
      ch = state.input.charCodeAt(state.position);

    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        if (ch === 0x09 /* Tab */ && state.firstTabInLine === -1) {
          state.firstTabInLine = state.position;
        }
        ch = state.input.charCodeAt(++state.position);
      }

      if (allowComments && ch === 0x23 /* # */) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0x0a /* LF */ && ch !== 0x0d /* CR */ && ch !== 0);
      }

      if (is_EOL(ch)) {
        readLineBreak(state);

        ch = state.input.charCodeAt(state.position);
        lineBreaks++;
        state.lineIndent = 0;

        while (ch === 0x20 /* Space */) {
          state.lineIndent++;
          ch = state.input.charCodeAt(++state.position);
        }
      } else {
        break;
      }
    }

    if (
      checkIndent !== -1 &&
      lineBreaks !== 0 &&
      state.lineIndent < checkIndent
    ) {
      throwWarning(state, "deficient indentation");
    }

    return lineBreaks;
  }

  function testDocumentSeparator(state) {
    var _position = state.position,
      ch;

    ch = state.input.charCodeAt(_position);

    // Condition state.position === state.lineStart is tested
    // in parent on each call, for efficiency. No needs to test here again.
    if (
      (ch === 0x2d /* - */ || ch === 0x2e) /* . */ &&
      ch === state.input.charCodeAt(_position + 1) &&
      ch === state.input.charCodeAt(_position + 2)
    ) {
      _position += 3;

      ch = state.input.charCodeAt(_position);

      if (ch === 0 || is_WS_OR_EOL(ch)) {
        return true;
      }
    }

    return false;
  }

  function writeFoldedLines(state, count) {
    if (count === 1) {
      state.result += " ";
    } else if (count > 1) {
      state.result += common.repeat("\n", count - 1);
    }
  }

  function readPlainScalar(state, nodeIndent, withinFlowCollection) {
    var preceding,
      following,
      captureStart,
      captureEnd,
      hasPendingContent,
      _line,
      _lineStart,
      _lineIndent,
      _kind = state.kind,
      _result = state.result,
      ch;

    ch = state.input.charCodeAt(state.position);

    if (
      is_WS_OR_EOL(ch) ||
      is_FLOW_INDICATOR(ch) ||
      ch === 0x23 /* # */ ||
      ch === 0x26 /* & */ ||
      ch === 0x2a /* * */ ||
      ch === 0x21 /* ! */ ||
      ch === 0x7c /* | */ ||
      ch === 0x3e /* > */ ||
      ch === 0x27 /* ' */ ||
      ch === 0x22 /* " */ ||
      ch === 0x25 /* % */ ||
      ch === 0x40 /* @ */ ||
      ch === 0x60 /* ` */
    ) {
      return false;
    }

    if (ch === 0x3f /* ? */ || ch === 0x2d /* - */) {
      following = state.input.charCodeAt(state.position + 1);

      if (
        is_WS_OR_EOL(following) ||
        (withinFlowCollection && is_FLOW_INDICATOR(following))
      ) {
        return false;
      }
    }

    state.kind = "scalar";
    state.result = "";
    captureStart = captureEnd = state.position;
    hasPendingContent = false;

    while (ch !== 0) {
      if (ch === 0x3a /* : */) {
        following = state.input.charCodeAt(state.position + 1);

        if (
          is_WS_OR_EOL(following) ||
          (withinFlowCollection && is_FLOW_INDICATOR(following))
        ) {
          break;
        }
      } else if (ch === 0x23 /* # */) {
        preceding = state.input.charCodeAt(state.position - 1);

        if (is_WS_OR_EOL(preceding)) {
          break;
        }
      } else if (
        (state.position === state.lineStart && testDocumentSeparator(state)) ||
        (withinFlowCollection && is_FLOW_INDICATOR(ch))
      ) {
        break;
      } else if (is_EOL(ch)) {
        _line = state.line;
        _lineStart = state.lineStart;
        _lineIndent = state.lineIndent;
        skipSeparationSpace(state, false, -1);

        if (state.lineIndent >= nodeIndent) {
          hasPendingContent = true;
          ch = state.input.charCodeAt(state.position);
          continue;
        } else {
          state.position = captureEnd;
          state.line = _line;
          state.lineStart = _lineStart;
          state.lineIndent = _lineIndent;
          break;
        }
      }

      if (hasPendingContent) {
        captureSegment(state, captureStart, captureEnd, false);
        writeFoldedLines(state, state.line - _line);
        captureStart = captureEnd = state.position;
        hasPendingContent = false;
      }

      if (!is_WHITE_SPACE(ch)) {
        captureEnd = state.position + 1;
      }

      ch = state.input.charCodeAt(++state.position);
    }

    captureSegment(state, captureStart, captureEnd, false);

    if (state.result) {
      return true;
    }

    state.kind = _kind;
    state.result = _result;
    return false;
  }

  function readSingleQuotedScalar(state, nodeIndent) {
    var ch, captureStart, captureEnd;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x27 /* ' */) {
      return false;
    }

    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;

    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 0x27 /* ' */) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);

        if (ch === 0x27 /* ' */) {
          captureStart = state.position;
          state.position++;
          captureEnd = state.position;
        } else {
          return true;
        }
      } else if (is_EOL(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (
        state.position === state.lineStart &&
        testDocumentSeparator(state)
      ) {
        throwError(
          state,
          "unexpected end of the document within a single quoted scalar",
        );
      } else {
        state.position++;
        captureEnd = state.position;
      }
    }

    throwError(
      state,
      "unexpected end of the stream within a single quoted scalar",
    );
  }

  function readDoubleQuotedScalar(state, nodeIndent) {
    var captureStart, captureEnd, hexLength, hexResult, tmp, ch;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x22 /* " */) {
      return false;
    }

    state.kind = "scalar";
    state.result = "";
    state.position++;
    captureStart = captureEnd = state.position;

    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      if (ch === 0x22 /* " */) {
        captureSegment(state, captureStart, state.position, true);
        state.position++;
        return true;
      } else if (ch === 0x5c /* \ */) {
        captureSegment(state, captureStart, state.position, true);
        ch = state.input.charCodeAt(++state.position);

        if (is_EOL(ch)) {
          skipSeparationSpace(state, false, nodeIndent);

          // TODO: rework to inline fn with no type cast?
        } else if (ch < 256 && simpleEscapeCheck[ch]) {
          state.result += simpleEscapeMap[ch];
          state.position++;
        } else if ((tmp = escapedHexLen(ch)) > 0) {
          hexLength = tmp;
          hexResult = 0;

          for (; hexLength > 0; hexLength--) {
            ch = state.input.charCodeAt(++state.position);

            if ((tmp = fromHexCode(ch)) >= 0) {
              hexResult = (hexResult << 4) + tmp;
            } else {
              throwError(state, "expected hexadecimal character");
            }
          }

          state.result += charFromCodepoint(hexResult);

          state.position++;
        } else {
          throwError(state, "unknown escape sequence");
        }

        captureStart = captureEnd = state.position;
      } else if (is_EOL(ch)) {
        captureSegment(state, captureStart, captureEnd, true);
        writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
        captureStart = captureEnd = state.position;
      } else if (
        state.position === state.lineStart &&
        testDocumentSeparator(state)
      ) {
        throwError(
          state,
          "unexpected end of the document within a double quoted scalar",
        );
      } else {
        state.position++;
        captureEnd = state.position;
      }
    }

    throwError(
      state,
      "unexpected end of the stream within a double quoted scalar",
    );
  }

  function readFlowCollection(state, nodeIndent) {
    var readNext = true,
      _line,
      _lineStart,
      _pos,
      _tag = state.tag,
      _result,
      _anchor = state.anchor,
      following,
      terminator,
      isPair,
      isExplicitPair,
      isMapping,
      overridableKeys = Object.create(null),
      keyNode,
      keyTag,
      valueNode,
      ch;

    ch = state.input.charCodeAt(state.position);

    if (ch === 0x5b /* [ */) {
      terminator = 0x5d; /* ] */
      isMapping = false;
      _result = [];
    } else if (ch === 0x7b /* { */) {
      terminator = 0x7d; /* } */
      isMapping = true;
      _result = {};
    } else {
      return false;
    }

    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }

    ch = state.input.charCodeAt(++state.position);

    while (ch !== 0) {
      skipSeparationSpace(state, true, nodeIndent);

      ch = state.input.charCodeAt(state.position);

      if (ch === terminator) {
        state.position++;
        state.tag = _tag;
        state.anchor = _anchor;
        state.kind = isMapping ? "mapping" : "sequence";
        state.result = _result;
        return true;
      } else if (!readNext) {
        throwError(state, "missed comma between flow collection entries");
      } else if (ch === 0x2c /* , */) {
        // "flow collection entries can never be completely empty", as per YAML 1.2, section 7.4
        throwError(state, "expected the node content, but found ','");
      }

      keyTag = keyNode = valueNode = null;
      isPair = isExplicitPair = false;

      if (ch === 0x3f /* ? */) {
        following = state.input.charCodeAt(state.position + 1);

        if (is_WS_OR_EOL(following)) {
          isPair = isExplicitPair = true;
          state.position++;
          skipSeparationSpace(state, true, nodeIndent);
        }
      }

      _line = state.line; // Save the current line.
      _lineStart = state.lineStart;
      _pos = state.position;
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      keyTag = state.tag;
      keyNode = state.result;
      skipSeparationSpace(state, true, nodeIndent);

      ch = state.input.charCodeAt(state.position);

      if ((isExplicitPair || state.line === _line) && ch === 0x3a /* : */) {
        isPair = true;
        ch = state.input.charCodeAt(++state.position);
        skipSeparationSpace(state, true, nodeIndent);
        composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
        valueNode = state.result;
      }

      if (isMapping) {
        storeMappingPair(
          state,
          _result,
          overridableKeys,
          keyTag,
          keyNode,
          valueNode,
          _line,
          _lineStart,
          _pos,
        );
      } else if (isPair) {
        _result.push(
          storeMappingPair(
            state,
            null,
            overridableKeys,
            keyTag,
            keyNode,
            valueNode,
            _line,
            _lineStart,
            _pos,
          ),
        );
      } else {
        _result.push(keyNode);
      }

      skipSeparationSpace(state, true, nodeIndent);

      ch = state.input.charCodeAt(state.position);

      if (ch === 0x2c /* , */) {
        readNext = true;
        ch = state.input.charCodeAt(++state.position);
      } else {
        readNext = false;
      }
    }

    throwError(state, "unexpected end of the stream within a flow collection");
  }

  function readBlockScalar(state, nodeIndent) {
    var captureStart,
      folding,
      chomping = CHOMPING_CLIP,
      didReadContent = false,
      detectedIndent = false,
      textIndent = nodeIndent,
      emptyLines = 0,
      atMoreIndented = false,
      tmp,
      ch;

    ch = state.input.charCodeAt(state.position);

    if (ch === 0x7c /* | */) {
      folding = false;
    } else if (ch === 0x3e /* > */) {
      folding = true;
    } else {
      return false;
    }

    state.kind = "scalar";
    state.result = "";

    while (ch !== 0) {
      ch = state.input.charCodeAt(++state.position);

      if (ch === 0x2b /* + */ || ch === 0x2d /* - */) {
        if (CHOMPING_CLIP === chomping) {
          chomping = ch === 0x2b /* + */ ? CHOMPING_KEEP : CHOMPING_STRIP;
        } else {
          throwError(state, "repeat of a chomping mode identifier");
        }
      } else if ((tmp = fromDecimalCode(ch)) >= 0) {
        if (tmp === 0) {
          throwError(
            state,
            "bad explicit indentation width of a block scalar; it cannot be less than one",
          );
        } else if (!detectedIndent) {
          textIndent = nodeIndent + tmp - 1;
          detectedIndent = true;
        } else {
          throwError(state, "repeat of an indentation width identifier");
        }
      } else {
        break;
      }
    }

    if (is_WHITE_SPACE(ch)) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (is_WHITE_SPACE(ch));

      if (ch === 0x23 /* # */) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (!is_EOL(ch) && ch !== 0);
      }
    }

    while (ch !== 0) {
      readLineBreak(state);
      state.lineIndent = 0;

      ch = state.input.charCodeAt(state.position);

      while (
        (!detectedIndent || state.lineIndent < textIndent) &&
        ch === 0x20 /* Space */
      ) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }

      if (!detectedIndent && state.lineIndent > textIndent) {
        textIndent = state.lineIndent;
      }

      if (is_EOL(ch)) {
        emptyLines++;
        continue;
      }

      // End of the scalar.
      if (state.lineIndent < textIndent) {
        // Perform the chomping.
        if (chomping === CHOMPING_KEEP) {
          state.result += common.repeat(
            "\n",
            didReadContent ? 1 + emptyLines : emptyLines,
          );
        } else if (chomping === CHOMPING_CLIP) {
          if (didReadContent) {
            // i.e. only if the scalar is not empty.
            state.result += "\n";
          }
        }

        // Break this `while` cycle and go to the funciton's epilogue.
        break;
      }

      // Folded style: use fancy rules to handle line breaks.
      if (folding) {
        // Lines starting with white space characters (more-indented lines) are not folded.
        if (is_WHITE_SPACE(ch)) {
          atMoreIndented = true;
          // except for the first content line (cf. Example 8.1)
          state.result += common.repeat(
            "\n",
            didReadContent ? 1 + emptyLines : emptyLines,
          );

          // End of more-indented block.
        } else if (atMoreIndented) {
          atMoreIndented = false;
          state.result += common.repeat("\n", emptyLines + 1);

          // Just one line break - perceive as the same line.
        } else if (emptyLines === 0) {
          if (didReadContent) {
            // i.e. only if we have already read some scalar content.
            state.result += " ";
          }

          // Several line breaks - perceive as different lines.
        } else {
          state.result += common.repeat("\n", emptyLines);
        }

        // Literal style: just add exact number of line breaks between content lines.
      } else {
        // Keep all line breaks except the header line break.
        state.result += common.repeat(
          "\n",
          didReadContent ? 1 + emptyLines : emptyLines,
        );
      }

      didReadContent = true;
      detectedIndent = true;
      emptyLines = 0;
      captureStart = state.position;

      while (!is_EOL(ch) && ch !== 0) {
        ch = state.input.charCodeAt(++state.position);
      }

      captureSegment(state, captureStart, state.position, false);
    }

    return true;
  }

  function readBlockSequence(state, nodeIndent) {
    var _line,
      _tag = state.tag,
      _anchor = state.anchor,
      _result = [],
      following,
      detected = false,
      ch;

    // there is a leading tab before this token, so it can't be a block sequence/mapping;
    // it can still be flow sequence/mapping or a scalar
    if (state.firstTabInLine !== -1) return false;

    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }

    ch = state.input.charCodeAt(state.position);

    while (ch !== 0) {
      if (state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }

      if (ch !== 0x2d /* - */) {
        break;
      }

      following = state.input.charCodeAt(state.position + 1);

      if (!is_WS_OR_EOL(following)) {
        break;
      }

      detected = true;
      state.position++;

      if (skipSeparationSpace(state, true, -1)) {
        if (state.lineIndent <= nodeIndent) {
          _result.push(null);
          ch = state.input.charCodeAt(state.position);
          continue;
        }
      }

      _line = state.line;
      composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
      _result.push(state.result);
      skipSeparationSpace(state, true, -1);

      ch = state.input.charCodeAt(state.position);

      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a sequence entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }

    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "sequence";
      state.result = _result;
      return true;
    }
    return false;
  }

  function readBlockMapping(state, nodeIndent, flowIndent) {
    var following,
      allowCompact,
      _line,
      _keyLine,
      _keyLineStart,
      _keyPos,
      _tag = state.tag,
      _anchor = state.anchor,
      _result = {},
      overridableKeys = Object.create(null),
      keyTag = null,
      keyNode = null,
      valueNode = null,
      atExplicitKey = false,
      detected = false,
      ch;

    // there is a leading tab before this token, so it can't be a block sequence/mapping;
    // it can still be flow sequence/mapping or a scalar
    if (state.firstTabInLine !== -1) return false;

    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = _result;
    }

    ch = state.input.charCodeAt(state.position);

    while (ch !== 0) {
      if (!atExplicitKey && state.firstTabInLine !== -1) {
        state.position = state.firstTabInLine;
        throwError(state, "tab characters must not be used in indentation");
      }

      following = state.input.charCodeAt(state.position + 1);
      _line = state.line; // Save the current line.

      //
      // Explicit notation case. There are two separate blocks:
      // first for the key (denoted by "?") and second for the value (denoted by ":")
      //
      if (
        (ch === 0x3f /* ? */ || ch === 0x3a) /* : */ &&
        is_WS_OR_EOL(following)
      ) {
        if (ch === 0x3f /* ? */) {
          if (atExplicitKey) {
            storeMappingPair(
              state,
              _result,
              overridableKeys,
              keyTag,
              keyNode,
              null,
              _keyLine,
              _keyLineStart,
              _keyPos,
            );
            keyTag = keyNode = valueNode = null;
          }

          detected = true;
          atExplicitKey = true;
          allowCompact = true;
        } else if (atExplicitKey) {
          // i.e. 0x3A/* : */ === character after the explicit key.
          atExplicitKey = false;
          allowCompact = true;
        } else {
          throwError(
            state,
            "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line",
          );
        }

        state.position += 1;
        ch = following;

        //
        // Implicit notation case. Flow-style node as the key first, then ":", and the value.
        //
      } else {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;

        if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
          // Neither implicit nor explicit notation.
          // Reading is done. Go to the epilogue.
          break;
        }

        if (state.line === _line) {
          ch = state.input.charCodeAt(state.position);

          while (is_WHITE_SPACE(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }

          if (ch === 0x3a /* : */) {
            ch = state.input.charCodeAt(++state.position);

            if (!is_WS_OR_EOL(ch)) {
              throwError(
                state,
                "a whitespace character is expected after the key-value separator within a block mapping",
              );
            }

            if (atExplicitKey) {
              storeMappingPair(
                state,
                _result,
                overridableKeys,
                keyTag,
                keyNode,
                null,
                _keyLine,
                _keyLineStart,
                _keyPos,
              );
              keyTag = keyNode = valueNode = null;
            }

            detected = true;
            atExplicitKey = false;
            allowCompact = false;
            keyTag = state.tag;
            keyNode = state.result;
          } else if (detected) {
            throwError(
              state,
              "can not read an implicit mapping pair; a colon is missed",
            );
          } else {
            state.tag = _tag;
            state.anchor = _anchor;
            return true; // Keep the result of `composeNode`.
          }
        } else if (detected) {
          throwError(
            state,
            "can not read a block mapping entry; a multiline key may not be an implicit key",
          );
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true; // Keep the result of `composeNode`.
        }
      }

      //
      // Common reading code for both explicit and implicit notations.
      //
      if (state.line === _line || state.lineIndent > nodeIndent) {
        if (atExplicitKey) {
          _keyLine = state.line;
          _keyLineStart = state.lineStart;
          _keyPos = state.position;
        }

        if (
          composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)
        ) {
          if (atExplicitKey) {
            keyNode = state.result;
          } else {
            valueNode = state.result;
          }
        }

        if (!atExplicitKey) {
          storeMappingPair(
            state,
            _result,
            overridableKeys,
            keyTag,
            keyNode,
            valueNode,
            _keyLine,
            _keyLineStart,
            _keyPos,
          );
          keyTag = keyNode = valueNode = null;
        }

        skipSeparationSpace(state, true, -1);
        ch = state.input.charCodeAt(state.position);
      }

      if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
        throwError(state, "bad indentation of a mapping entry");
      } else if (state.lineIndent < nodeIndent) {
        break;
      }
    }

    //
    // Epilogue.
    //

    // Special case: last mapping's node contains only the key in explicit notation.
    if (atExplicitKey) {
      storeMappingPair(
        state,
        _result,
        overridableKeys,
        keyTag,
        keyNode,
        null,
        _keyLine,
        _keyLineStart,
        _keyPos,
      );
    }

    // Expose the resulting mapping.
    if (detected) {
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = "mapping";
      state.result = _result;
    }

    return detected;
  }

  function readTagProperty(state) {
    var _position,
      isVerbatim = false,
      isNamed = false,
      tagHandle,
      tagName,
      ch;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x21 /* ! */) return false;

    if (state.tag !== null) {
      throwError(state, "duplication of a tag property");
    }

    ch = state.input.charCodeAt(++state.position);

    if (ch === 0x3c /* < */) {
      isVerbatim = true;
      ch = state.input.charCodeAt(++state.position);
    } else if (ch === 0x21 /* ! */) {
      isNamed = true;
      tagHandle = "!!";
      ch = state.input.charCodeAt(++state.position);
    } else {
      tagHandle = "!";
    }

    _position = state.position;

    if (isVerbatim) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 0 && ch !== 0x3e /* > */);

      if (state.position < state.length) {
        tagName = state.input.slice(_position, state.position);
        ch = state.input.charCodeAt(++state.position);
      } else {
        throwError(state, "unexpected end of the stream within a verbatim tag");
      }
    } else {
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        if (ch === 0x21 /* ! */) {
          if (!isNamed) {
            tagHandle = state.input.slice(_position - 1, state.position + 1);

            if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
              throwError(
                state,
                "named tag handle cannot contain such characters",
              );
            }

            isNamed = true;
            _position = state.position + 1;
          } else {
            throwError(state, "tag suffix cannot contain exclamation marks");
          }
        }

        ch = state.input.charCodeAt(++state.position);
      }

      tagName = state.input.slice(_position, state.position);

      if (PATTERN_FLOW_INDICATORS.test(tagName)) {
        throwError(
          state,
          "tag suffix cannot contain flow indicator characters",
        );
      }
    }

    if (tagName && !PATTERN_TAG_URI.test(tagName)) {
      throwError(state, "tag name cannot contain such characters: " + tagName);
    }

    try {
      tagName = decodeURIComponent(tagName);
    } catch (err) {
      throwError(state, "tag name is malformed: " + tagName);
    }

    if (isVerbatim) {
      state.tag = tagName;
    } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
      state.tag = state.tagMap[tagHandle] + tagName;
    } else if (tagHandle === "!") {
      state.tag = "!" + tagName;
    } else if (tagHandle === "!!") {
      state.tag = "tag:yaml.org,2002:" + tagName;
    } else {
      throwError(state, 'undeclared tag handle "' + tagHandle + '"');
    }

    return true;
  }

  function readAnchorProperty(state) {
    var _position, ch;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x26 /* & */) return false;

    if (state.anchor !== null) {
      throwError(state, "duplication of an anchor property");
    }

    ch = state.input.charCodeAt(++state.position);
    _position = state.position;

    while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    if (state.position === _position) {
      throwError(
        state,
        "name of an anchor node must contain at least one character",
      );
    }

    state.anchor = state.input.slice(_position, state.position);
    return true;
  }

  function readAlias(state) {
    var _position, alias, ch;

    ch = state.input.charCodeAt(state.position);

    if (ch !== 0x2a /* * */) return false;

    ch = state.input.charCodeAt(++state.position);
    _position = state.position;

    while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }

    if (state.position === _position) {
      throwError(
        state,
        "name of an alias node must contain at least one character",
      );
    }

    alias = state.input.slice(_position, state.position);

    if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
      throwError(state, 'unidentified alias "' + alias + '"');
    }

    state.result = state.anchorMap[alias];
    skipSeparationSpace(state, true, -1);
    return true;
  }

  function composeNode(
    state,
    parentIndent,
    nodeContext,
    allowToSeek,
    allowCompact,
  ) {
    var allowBlockStyles,
      allowBlockScalars,
      allowBlockCollections,
      indentStatus = 1, // 1: this>parent, 0: this=parent, -1: this<parent
      atNewLine = false,
      hasContent = false,
      typeIndex,
      typeQuantity,
      typeList,
      type,
      flowIndent,
      blockIndent;

    if (state.listener !== null) {
      state.listener("open", state);
    }

    state.tag = null;
    state.anchor = null;
    state.kind = null;
    state.result = null;

    allowBlockStyles =
      allowBlockScalars =
      allowBlockCollections =
        CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;

    if (allowToSeek) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;

        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      }
    }

    if (indentStatus === 1) {
      while (readTagProperty(state) || readAnchorProperty(state)) {
        if (skipSeparationSpace(state, true, -1)) {
          atNewLine = true;
          allowBlockCollections = allowBlockStyles;

          if (state.lineIndent > parentIndent) {
            indentStatus = 1;
          } else if (state.lineIndent === parentIndent) {
            indentStatus = 0;
          } else if (state.lineIndent < parentIndent) {
            indentStatus = -1;
          }
        } else {
          allowBlockCollections = false;
        }
      }
    }

    if (allowBlockCollections) {
      allowBlockCollections = atNewLine || allowCompact;
    }

    if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
      if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
        flowIndent = parentIndent;
      } else {
        flowIndent = parentIndent + 1;
      }

      blockIndent = state.position - state.lineStart;

      if (indentStatus === 1) {
        if (
          (allowBlockCollections &&
            (readBlockSequence(state, blockIndent) ||
              readBlockMapping(state, blockIndent, flowIndent))) ||
          readFlowCollection(state, flowIndent)
        ) {
          hasContent = true;
        } else {
          if (
            (allowBlockScalars && readBlockScalar(state, flowIndent)) ||
            readSingleQuotedScalar(state, flowIndent) ||
            readDoubleQuotedScalar(state, flowIndent)
          ) {
            hasContent = true;
          } else if (readAlias(state)) {
            hasContent = true;

            if (state.tag !== null || state.anchor !== null) {
              throwError(state, "alias node should not have any properties");
            }
          } else if (
            readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)
          ) {
            hasContent = true;

            if (state.tag === null) {
              state.tag = "?";
            }
          }

          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
        }
      } else if (indentStatus === 0) {
        // Special case: block sequences are allowed to have same indentation level as the parent.
        // http://www.yaml.org/spec/1.2/spec.html#id2799784
        hasContent =
          allowBlockCollections && readBlockSequence(state, blockIndent);
      }
    }

    if (state.tag === null) {
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    } else if (state.tag === "?") {
      // Implicit resolving is not allowed for non-scalar types, and '?'
      // non-specific tag is only automatically assigned to plain scalars.
      //
      // We only need to check kind conformity in case user explicitly assigns '?'
      // tag, for example like this: "!<?> [0]"
      //
      if (state.result !== null && state.kind !== "scalar") {
        throwError(
          state,
          'unacceptable node kind for !<?> tag; it should be "scalar", not "' +
            state.kind +
            '"',
        );
      }

      for (
        typeIndex = 0, typeQuantity = state.implicitTypes.length;
        typeIndex < typeQuantity;
        typeIndex += 1
      ) {
        type = state.implicitTypes[typeIndex];

        if (type.resolve(state.result)) {
          // `state.result` updated in resolver if matched
          state.result = type.construct(state.result);
          state.tag = type.tag;
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
          break;
        }
      }
    } else if (state.tag !== "!") {
      if (
        _hasOwnProperty$1.call(
          state.typeMap[state.kind || "fallback"],
          state.tag,
        )
      ) {
        type = state.typeMap[state.kind || "fallback"][state.tag];
      } else {
        // looking for multi type
        type = null;
        typeList = state.typeMap.multi[state.kind || "fallback"];

        for (
          typeIndex = 0, typeQuantity = typeList.length;
          typeIndex < typeQuantity;
          typeIndex += 1
        ) {
          if (
            state.tag.slice(0, typeList[typeIndex].tag.length) ===
            typeList[typeIndex].tag
          ) {
            type = typeList[typeIndex];
            break;
          }
        }
      }

      if (!type) {
        throwError(state, "unknown tag !<" + state.tag + ">");
      }

      if (state.result !== null && type.kind !== state.kind) {
        throwError(
          state,
          "unacceptable node kind for !<" +
            state.tag +
            '> tag; it should be "' +
            type.kind +
            '", not "' +
            state.kind +
            '"',
        );
      }

      if (!type.resolve(state.result, state.tag)) {
        // `state.result` updated in resolver if matched
        throwError(
          state,
          "cannot resolve a node with !<" + state.tag + "> explicit tag",
        );
      } else {
        state.result = type.construct(state.result, state.tag);
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    }

    if (state.listener !== null) {
      state.listener("close", state);
    }
    return state.tag !== null || state.anchor !== null || hasContent;
  }

  function readDocument(state) {
    var documentStart = state.position,
      _position,
      directiveName,
      directiveArgs,
      hasDirectives = false,
      ch;

    state.version = null;
    state.checkLineBreaks = state.legacy;
    state.tagMap = Object.create(null);
    state.anchorMap = Object.create(null);

    while ((ch = state.input.charCodeAt(state.position)) !== 0) {
      skipSeparationSpace(state, true, -1);

      ch = state.input.charCodeAt(state.position);

      if (state.lineIndent > 0 || ch !== 0x25 /* % */) {
        break;
      }

      hasDirectives = true;
      ch = state.input.charCodeAt(++state.position);
      _position = state.position;

      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }

      directiveName = state.input.slice(_position, state.position);
      directiveArgs = [];

      if (directiveName.length < 1) {
        throwError(
          state,
          "directive name must not be less than one character in length",
        );
      }

      while (ch !== 0) {
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }

        if (ch === 0x23 /* # */) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 0 && !is_EOL(ch));
          break;
        }

        if (is_EOL(ch)) break;

        _position = state.position;

        while (ch !== 0 && !is_WS_OR_EOL(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }

        directiveArgs.push(state.input.slice(_position, state.position));
      }

      if (ch !== 0) readLineBreak(state);

      if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
        directiveHandlers[directiveName](state, directiveName, directiveArgs);
      } else {
        throwWarning(
          state,
          'unknown document directive "' + directiveName + '"',
        );
      }
    }

    skipSeparationSpace(state, true, -1);

    if (
      state.lineIndent === 0 &&
      state.input.charCodeAt(state.position) === 0x2d /* - */ &&
      state.input.charCodeAt(state.position + 1) === 0x2d /* - */ &&
      state.input.charCodeAt(state.position + 2) === 0x2d /* - */
    ) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    } else if (hasDirectives) {
      throwError(state, "directives end mark is expected");
    }

    composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
    skipSeparationSpace(state, true, -1);

    if (
      state.checkLineBreaks &&
      PATTERN_NON_ASCII_LINE_BREAKS.test(
        state.input.slice(documentStart, state.position),
      )
    ) {
      throwWarning(state, "non-ASCII line breaks are interpreted as content");
    }

    state.documents.push(state.result);

    if (state.position === state.lineStart && testDocumentSeparator(state)) {
      if (state.input.charCodeAt(state.position) === 0x2e /* . */) {
        state.position += 3;
        skipSeparationSpace(state, true, -1);
      }
      return;
    }

    if (state.position < state.length - 1) {
      throwError(
        state,
        "end of the stream or a document separator is expected",
      );
    } else {
      return;
    }
  }

  function loadDocuments(input, options) {
    input = String(input);
    options = options || {};

    if (input.length !== 0) {
      // Add tailing `\n` if not exists
      if (
        input.charCodeAt(input.length - 1) !== 0x0a /* LF */ &&
        input.charCodeAt(input.length - 1) !== 0x0d /* CR */
      ) {
        input += "\n";
      }

      // Strip BOM
      if (input.charCodeAt(0) === 0xfeff) {
        input = input.slice(1);
      }
    }

    var state = new State$1(input, options);

    var nullpos = input.indexOf("\0");

    if (nullpos !== -1) {
      state.position = nullpos;
      throwError(state, "null byte is not allowed in input");
    }

    // Use 0 as string terminator. That significantly simplifies bounds check.
    state.input += "\0";

    while (state.input.charCodeAt(state.position) === 0x20 /* Space */) {
      state.lineIndent += 1;
      state.position += 1;
    }

    while (state.position < state.length - 1) {
      readDocument(state);
    }

    return state.documents;
  }

  function loadAll$1(input, iterator, options) {
    if (
      iterator !== null &&
      typeof iterator === "object" &&
      typeof options === "undefined"
    ) {
      options = iterator;
      iterator = null;
    }

    var documents = loadDocuments(input, options);

    if (typeof iterator !== "function") {
      return documents;
    }

    for (var index = 0, length = documents.length; index < length; index += 1) {
      iterator(documents[index]);
    }
  }

  function load$1(input, options) {
    var documents = loadDocuments(input, options);

    if (documents.length === 0) {
      /*eslint-disable no-undefined*/
      return undefined;
    } else if (documents.length === 1) {
      return documents[0];
    }
    throw new exception(
      "expected a single document in the stream, but found more",
    );
  }

  var loadAll_1 = loadAll$1;
  var load_1 = load$1;

  var loader = {
    loadAll: loadAll_1,
    load: load_1,
  };

  /*eslint-disable no-use-before-define*/

  var _toString = Object.prototype.toString;
  var _hasOwnProperty = Object.prototype.hasOwnProperty;

  var CHAR_BOM = 0xfeff;
  var CHAR_TAB = 0x09; /* Tab */
  var CHAR_LINE_FEED = 0x0a; /* LF */
  var CHAR_CARRIAGE_RETURN = 0x0d; /* CR */
  var CHAR_SPACE = 0x20; /* Space */
  var CHAR_EXCLAMATION = 0x21; /* ! */
  var CHAR_DOUBLE_QUOTE = 0x22; /* " */
  var CHAR_SHARP = 0x23; /* # */
  var CHAR_PERCENT = 0x25; /* % */
  var CHAR_AMPERSAND = 0x26; /* & */
  var CHAR_SINGLE_QUOTE = 0x27; /* ' */
  var CHAR_ASTERISK = 0x2a; /* * */
  var CHAR_COMMA = 0x2c; /* , */
  var CHAR_MINUS = 0x2d; /* - */
  var CHAR_COLON = 0x3a; /* : */
  var CHAR_EQUALS = 0x3d; /* = */
  var CHAR_GREATER_THAN = 0x3e; /* > */
  var CHAR_QUESTION = 0x3f; /* ? */
  var CHAR_COMMERCIAL_AT = 0x40; /* @ */
  var CHAR_LEFT_SQUARE_BRACKET = 0x5b; /* [ */
  var CHAR_RIGHT_SQUARE_BRACKET = 0x5d; /* ] */
  var CHAR_GRAVE_ACCENT = 0x60; /* ` */
  var CHAR_LEFT_CURLY_BRACKET = 0x7b; /* { */
  var CHAR_VERTICAL_LINE = 0x7c; /* | */
  var CHAR_RIGHT_CURLY_BRACKET = 0x7d; /* } */

  var ESCAPE_SEQUENCES = {};

  ESCAPE_SEQUENCES[0x00] = "\\0";
  ESCAPE_SEQUENCES[0x07] = "\\a";
  ESCAPE_SEQUENCES[0x08] = "\\b";
  ESCAPE_SEQUENCES[0x09] = "\\t";
  ESCAPE_SEQUENCES[0x0a] = "\\n";
  ESCAPE_SEQUENCES[0x0b] = "\\v";
  ESCAPE_SEQUENCES[0x0c] = "\\f";
  ESCAPE_SEQUENCES[0x0d] = "\\r";
  ESCAPE_SEQUENCES[0x1b] = "\\e";
  ESCAPE_SEQUENCES[0x22] = '\\"';
  ESCAPE_SEQUENCES[0x5c] = "\\\\";
  ESCAPE_SEQUENCES[0x85] = "\\N";
  ESCAPE_SEQUENCES[0xa0] = "\\_";
  ESCAPE_SEQUENCES[0x2028] = "\\L";
  ESCAPE_SEQUENCES[0x2029] = "\\P";

  var DEPRECATED_BOOLEANS_SYNTAX = [
    "y",
    "Y",
    "yes",
    "Yes",
    "YES",
    "on",
    "On",
    "ON",
    "n",
    "N",
    "no",
    "No",
    "NO",
    "off",
    "Off",
    "OFF",
  ];

  var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;

  function compileStyleMap(schema, map) {
    var result, keys, index, length, tag, style, type;

    if (map === null) return {};

    result = {};
    keys = Object.keys(map);

    for (index = 0, length = keys.length; index < length; index += 1) {
      tag = keys[index];
      style = String(map[tag]);

      if (tag.slice(0, 2) === "!!") {
        tag = "tag:yaml.org,2002:" + tag.slice(2);
      }
      type = schema.compiledTypeMap["fallback"][tag];

      if (type && _hasOwnProperty.call(type.styleAliases, style)) {
        style = type.styleAliases[style];
      }

      result[tag] = style;
    }

    return result;
  }

  function encodeHex(character) {
    var string, handle, length;

    string = character.toString(16).toUpperCase();

    if (character <= 0xff) {
      handle = "x";
      length = 2;
    } else if (character <= 0xffff) {
      handle = "u";
      length = 4;
    } else if (character <= 0xffffffff) {
      handle = "U";
      length = 8;
    } else {
      throw new exception(
        "code point within a string may not be greater than 0xFFFFFFFF",
      );
    }

    return "\\" + handle + common.repeat("0", length - string.length) + string;
  }

  var QUOTING_TYPE_SINGLE = 1,
    QUOTING_TYPE_DOUBLE = 2;

  function State(options) {
    this.schema = options["schema"] || _default;
    this.indent = Math.max(1, options["indent"] || 2);
    this.noArrayIndent = options["noArrayIndent"] || false;
    this.skipInvalid = options["skipInvalid"] || false;
    this.flowLevel = common.isNothing(options["flowLevel"])
      ? -1
      : options["flowLevel"];
    this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
    this.sortKeys = options["sortKeys"] || false;
    this.lineWidth = options["lineWidth"] || 80;
    this.noRefs = options["noRefs"] || false;
    this.noCompatMode = options["noCompatMode"] || false;
    this.condenseFlow = options["condenseFlow"] || false;
    this.quotingType =
      options["quotingType"] === '"'
        ? QUOTING_TYPE_DOUBLE
        : QUOTING_TYPE_SINGLE;
    this.forceQuotes = options["forceQuotes"] || false;
    this.replacer =
      typeof options["replacer"] === "function" ? options["replacer"] : null;

    this.implicitTypes = this.schema.compiledImplicit;
    this.explicitTypes = this.schema.compiledExplicit;

    this.tag = null;
    this.result = "";

    this.duplicates = [];
    this.usedDuplicates = null;
  }

  // Indents every line in a string. Empty lines (\n only) are not indented.
  function indentString(string, spaces) {
    var ind = common.repeat(" ", spaces),
      position = 0,
      next = -1,
      result = "",
      line,
      length = string.length;

    while (position < length) {
      next = string.indexOf("\n", position);
      if (next === -1) {
        line = string.slice(position);
        position = length;
      } else {
        line = string.slice(position, next + 1);
        position = next + 1;
      }

      if (line.length && line !== "\n") result += ind;

      result += line;
    }

    return result;
  }

  function generateNextLine(state, level) {
    return "\n" + common.repeat(" ", state.indent * level);
  }

  function testImplicitResolving(state, str) {
    var index, length, type;

    for (
      index = 0, length = state.implicitTypes.length;
      index < length;
      index += 1
    ) {
      type = state.implicitTypes[index];

      if (type.resolve(str)) {
        return true;
      }
    }

    return false;
  }

  // [33] s-white ::= s-space | s-tab
  function isWhitespace(c) {
    return c === CHAR_SPACE || c === CHAR_TAB;
  }

  // Returns true if the character can be printed without escaping.
  // From YAML 1.2: "any allowed characters known to be non-printable
  // should also be escaped. [However,] This isn’t mandatory"
  // Derived from nb-char - \t - #x85 - #xA0 - #x2028 - #x2029.
  function isPrintable(c) {
    return (
      (0x00020 <= c && c <= 0x00007e) ||
      (0x000a1 <= c && c <= 0x00d7ff && c !== 0x2028 && c !== 0x2029) ||
      (0x0e000 <= c && c <= 0x00fffd && c !== CHAR_BOM) ||
      (0x10000 <= c && c <= 0x10ffff)
    );
  }

  // [34] ns-char ::= nb-char - s-white
  // [27] nb-char ::= c-printable - b-char - c-byte-order-mark
  // [26] b-char  ::= b-line-feed | b-carriage-return
  // Including s-white (for some reason, examples doesn't match specs in this aspect)
  // ns-char ::= c-printable - b-line-feed - b-carriage-return - c-byte-order-mark
  function isNsCharOrWhitespace(c) {
    return (
      isPrintable(c) &&
      c !== CHAR_BOM &&
      // - b-char
      c !== CHAR_CARRIAGE_RETURN &&
      c !== CHAR_LINE_FEED
    );
  }

  // [127]  ns-plain-safe(c) ::= c = flow-out  ⇒ ns-plain-safe-out
  //                             c = flow-in   ⇒ ns-plain-safe-in
  //                             c = block-key ⇒ ns-plain-safe-out
  //                             c = flow-key  ⇒ ns-plain-safe-in
  // [128] ns-plain-safe-out ::= ns-char
  // [129]  ns-plain-safe-in ::= ns-char - c-flow-indicator
  // [130]  ns-plain-char(c) ::=  ( ns-plain-safe(c) - “:” - “#” )
  //                            | ( /* An ns-char preceding */ “#” )
  //                            | ( “:” /* Followed by an ns-plain-safe(c) */ )
  function isPlainSafe(c, prev, inblock) {
    var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
    var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
    return (
      // ns-plain-safe
      ((inblock // c = flow-in
        ? cIsNsCharOrWhitespace
        : cIsNsCharOrWhitespace &&
          // - c-flow-indicator
          c !== CHAR_COMMA &&
          c !== CHAR_LEFT_SQUARE_BRACKET &&
          c !== CHAR_RIGHT_SQUARE_BRACKET &&
          c !== CHAR_LEFT_CURLY_BRACKET &&
          c !== CHAR_RIGHT_CURLY_BRACKET) &&
        // ns-plain-char
        c !== CHAR_SHARP && // false on '#'
        !(prev === CHAR_COLON && !cIsNsChar)) || // false on ': '
      (isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP) || // change to true on '[^ ]#'
      (prev === CHAR_COLON && cIsNsChar)
    ); // change to true on ':[^ ]'
  }

  // Simplified test for values allowed as the first character in plain style.
  function isPlainSafeFirst(c) {
    // Uses a subset of ns-char - c-indicator
    // where ns-char = nb-char - s-white.
    // No support of ( ( “?” | “:” | “-” ) /* Followed by an ns-plain-safe(c)) */ ) part
    return (
      isPrintable(c) &&
      c !== CHAR_BOM &&
      !isWhitespace(c) && // - s-white
      // - (c-indicator ::=
      // “-” | “?” | “:” | “,” | “[” | “]” | “{” | “}”
      c !== CHAR_MINUS &&
      c !== CHAR_QUESTION &&
      c !== CHAR_COLON &&
      c !== CHAR_COMMA &&
      c !== CHAR_LEFT_SQUARE_BRACKET &&
      c !== CHAR_RIGHT_SQUARE_BRACKET &&
      c !== CHAR_LEFT_CURLY_BRACKET &&
      c !== CHAR_RIGHT_CURLY_BRACKET &&
      // | “#” | “&” | “*” | “!” | “|” | “=” | “>” | “'” | “"”
      c !== CHAR_SHARP &&
      c !== CHAR_AMPERSAND &&
      c !== CHAR_ASTERISK &&
      c !== CHAR_EXCLAMATION &&
      c !== CHAR_VERTICAL_LINE &&
      c !== CHAR_EQUALS &&
      c !== CHAR_GREATER_THAN &&
      c !== CHAR_SINGLE_QUOTE &&
      c !== CHAR_DOUBLE_QUOTE &&
      // | “%” | “@” | “`”)
      c !== CHAR_PERCENT &&
      c !== CHAR_COMMERCIAL_AT &&
      c !== CHAR_GRAVE_ACCENT
    );
  }

  // Simplified test for values allowed as the last character in plain style.
  function isPlainSafeLast(c) {
    // just not whitespace or colon, it will be checked to be plain character later
    return !isWhitespace(c) && c !== CHAR_COLON;
  }

  // Same as 'string'.codePointAt(pos), but works in older browsers.
  function codePointAt(string, pos) {
    var first = string.charCodeAt(pos),
      second;
    if (first >= 0xd800 && first <= 0xdbff && pos + 1 < string.length) {
      second = string.charCodeAt(pos + 1);
      if (second >= 0xdc00 && second <= 0xdfff) {
        // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        return (first - 0xd800) * 0x400 + second - 0xdc00 + 0x10000;
      }
    }
    return first;
  }

  // Determines whether block indentation indicator is required.
  function needIndentIndicator(string) {
    var leadingSpaceRe = /^\n* /;
    return leadingSpaceRe.test(string);
  }

  var STYLE_PLAIN = 1,
    STYLE_SINGLE = 2,
    STYLE_LITERAL = 3,
    STYLE_FOLDED = 4,
    STYLE_DOUBLE = 5;

  // Determines which scalar styles are possible and returns the preferred style.
  // lineWidth = -1 => no limit.
  // Pre-conditions: str.length > 0.
  // Post-conditions:
  //    STYLE_PLAIN or STYLE_SINGLE => no \n are in the string.
  //    STYLE_LITERAL => no lines are suitable for folding (or lineWidth is -1).
  //    STYLE_FOLDED => a line > lineWidth and can be folded (and lineWidth != -1).
  function chooseScalarStyle(
    string,
    singleLineOnly,
    indentPerLevel,
    lineWidth,
    testAmbiguousType,
    quotingType,
    forceQuotes,
    inblock,
  ) {
    var i;
    var char = 0;
    var prevChar = null;
    var hasLineBreak = false;
    var hasFoldableLine = false; // only checked if shouldTrackWidth
    var shouldTrackWidth = lineWidth !== -1;
    var previousLineBreak = -1; // count the first line correctly
    var plain =
      isPlainSafeFirst(codePointAt(string, 0)) &&
      isPlainSafeLast(codePointAt(string, string.length - 1));

    if (singleLineOnly || forceQuotes) {
      // Case: no block styles.
      // Check for disallowed characters to rule out plain and single.
      for (i = 0; i < string.length; char >= 0x10000 ? (i += 2) : i++) {
        char = codePointAt(string, i);
        if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
    } else {
      // Case: block styles permitted.
      for (i = 0; i < string.length; char >= 0x10000 ? (i += 2) : i++) {
        char = codePointAt(string, i);
        if (char === CHAR_LINE_FEED) {
          hasLineBreak = true;
          // Check if any line can be folded.
          if (shouldTrackWidth) {
            hasFoldableLine =
              hasFoldableLine ||
              // Foldable line = too long, and not more-indented.
              (i - previousLineBreak - 1 > lineWidth &&
                string[previousLineBreak + 1] !== " ");
            previousLineBreak = i;
          }
        } else if (!isPrintable(char)) {
          return STYLE_DOUBLE;
        }
        plain = plain && isPlainSafe(char, prevChar, inblock);
        prevChar = char;
      }
      // in case the end is missing a \n
      hasFoldableLine =
        hasFoldableLine ||
        (shouldTrackWidth &&
          i - previousLineBreak - 1 > lineWidth &&
          string[previousLineBreak + 1] !== " ");
    }
    // Although every style can represent \n without escaping, prefer block styles
    // for multiline, since they're more readable and they don't add empty lines.
    // Also prefer folding a super-long line.
    if (!hasLineBreak && !hasFoldableLine) {
      // Strings interpretable as another type have to be quoted;
      // e.g. the string 'true' vs. the boolean true.
      if (plain && !forceQuotes && !testAmbiguousType(string)) {
        return STYLE_PLAIN;
      }
      return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
    }
    // Edge case: block indentation indicator can only have one digit.
    if (indentPerLevel > 9 && needIndentIndicator(string)) {
      return STYLE_DOUBLE;
    }
    // At this point we know block styles are valid.
    // Prefer literal style unless we want to fold.
    if (!forceQuotes) {
      return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }

  // Note: line breaking/folding is implemented for only the folded style.
  // NB. We drop the last trailing newline (if any) of a returned block scalar
  //  since the dumper adds its own newline. This always works:
  //    • No ending newline => unaffected; already using strip "-" chomping.
  //    • Ending newline    => removed then restored.
  //  Importantly, this keeps the "+" chomp indicator from gaining an extra line.
  function writeScalar(state, string, level, iskey, inblock) {
    state.dump = (function () {
      if (string.length === 0) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
      }
      if (!state.noCompatMode) {
        if (
          DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 ||
          DEPRECATED_BASE60_SYNTAX.test(string)
        ) {
          return state.quotingType === QUOTING_TYPE_DOUBLE
            ? '"' + string + '"'
            : "'" + string + "'";
        }
      }

      var indent = state.indent * Math.max(1, level); // no 0-indent scalars
      // As indentation gets deeper, let the width decrease monotonically
      // to the lower bound min(state.lineWidth, 40).
      // Note that this implies
      //  state.lineWidth ≤ 40 + state.indent: width is fixed at the lower bound.
      //  state.lineWidth > 40 + state.indent: width decreases until the lower bound.
      // This behaves better than a constant minimum width which disallows narrower options,
      // or an indent threshold which causes the width to suddenly increase.
      var lineWidth =
        state.lineWidth === -1
          ? -1
          : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);

      // Without knowing if keys are implicit/explicit, assume implicit for safety.
      var singleLineOnly =
        iskey ||
        // No block styles in flow mode.
        (state.flowLevel > -1 && level >= state.flowLevel);
      function testAmbiguity(string) {
        return testImplicitResolving(state, string);
      }

      switch (
        chooseScalarStyle(
          string,
          singleLineOnly,
          state.indent,
          lineWidth,
          testAmbiguity,
          state.quotingType,
          state.forceQuotes && !iskey,
          inblock,
        )
      ) {
        case STYLE_PLAIN:
          return string;
        case STYLE_SINGLE:
          return "'" + string.replace(/'/g, "''") + "'";
        case STYLE_LITERAL:
          return (
            "|" +
            blockHeader(string, state.indent) +
            dropEndingNewline(indentString(string, indent))
          );
        case STYLE_FOLDED:
          return (
            ">" +
            blockHeader(string, state.indent) +
            dropEndingNewline(
              indentString(foldString(string, lineWidth), indent),
            )
          );
        case STYLE_DOUBLE:
          return '"' + escapeString(string) + '"';
        default:
          throw new exception("impossible error: invalid scalar style");
      }
    })();
  }

  // Pre-conditions: string is valid for a block scalar, 1 <= indentPerLevel <= 9.
  function blockHeader(string, indentPerLevel) {
    var indentIndicator = needIndentIndicator(string)
      ? String(indentPerLevel)
      : "";

    // note the special case: the string '\n' counts as a "trailing" empty line.
    var clip = string[string.length - 1] === "\n";
    var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
    var chomp = keep ? "+" : clip ? "" : "-";

    return indentIndicator + chomp + "\n";
  }

  // (See the note for writeScalar.)
  function dropEndingNewline(string) {
    return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
  }

  // Note: a long line without a suitable break point will exceed the width limit.
  // Pre-conditions: every char in str isPrintable, str.length > 0, width > 0.
  function foldString(string, width) {
    // In folded style, $k$ consecutive newlines output as $k+1$ newlines—
    // unless they're before or after a more-indented line, or at the very
    // beginning or end, in which case $k$ maps to $k$.
    // Therefore, parse each chunk as newline(s) followed by a content line.
    var lineRe = /(\n+)([^\n]*)/g;

    // first line (possibly an empty line)
    var result = (function () {
      var nextLF = string.indexOf("\n");
      nextLF = nextLF !== -1 ? nextLF : string.length;
      lineRe.lastIndex = nextLF;
      return foldLine(string.slice(0, nextLF), width);
    })();
    // If we haven't reached the first content line yet, don't add an extra \n.
    var prevMoreIndented = string[0] === "\n" || string[0] === " ";
    var moreIndented;

    // rest of the lines
    var match;
    while ((match = lineRe.exec(string))) {
      var prefix = match[1],
        line = match[2];
      moreIndented = line[0] === " ";
      result +=
        prefix +
        (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") +
        foldLine(line, width);
      prevMoreIndented = moreIndented;
    }

    return result;
  }

  // Greedy line breaking.
  // Picks the longest line under the limit each time,
  // otherwise settles for the shortest line over the limit.
  // NB. More-indented lines *cannot* be folded, as that would add an extra \n.
  function foldLine(line, width) {
    if (line === "" || line[0] === " ") return line;

    // Since a more-indented line adds a \n, breaks can't be followed by a space.
    var breakRe = / [^ ]/g; // note: the match index will always be <= length-2.
    var match;
    // start is an inclusive index. end, curr, and next are exclusive.
    var start = 0,
      end,
      curr = 0,
      next = 0;
    var result = "";

    // Invariants: 0 <= start <= length-1.
    //   0 <= curr <= next <= max(0, length-2). curr - start <= width.
    // Inside the loop:
    //   A match implies length >= 2, so curr and next are <= length-2.
    while ((match = breakRe.exec(line))) {
      next = match.index;
      // maintain invariant: curr - start <= width
      if (next - start > width) {
        end = curr > start ? curr : next; // derive end <= length-2
        result += "\n" + line.slice(start, end);
        // skip the space that was output as \n
        start = end + 1; // derive start <= length-1
      }
      curr = next;
    }

    // By the invariants, start <= length-1, so there is something left over.
    // It is either the whole string or a part starting from non-whitespace.
    result += "\n";
    // Insert a break if the remainder is too long and there is a break available.
    if (line.length - start > width && curr > start) {
      result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
    } else {
      result += line.slice(start);
    }

    return result.slice(1); // drop extra \n joiner
  }

  // Escapes a double-quoted string.
  function escapeString(string) {
    var result = "";
    var char = 0;
    var escapeSeq;

    for (var i = 0; i < string.length; char >= 0x10000 ? (i += 2) : i++) {
      char = codePointAt(string, i);
      escapeSeq = ESCAPE_SEQUENCES[char];

      if (!escapeSeq && isPrintable(char)) {
        result += string[i];
        if (char >= 0x10000) result += string[i + 1];
      } else {
        result += escapeSeq || encodeHex(char);
      }
    }

    return result;
  }

  function writeFlowSequence(state, level, object) {
    var _result = "",
      _tag = state.tag,
      index,
      length,
      value;

    for (index = 0, length = object.length; index < length; index += 1) {
      value = object[index];

      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }

      // Write only valid elements, put null instead of invalid elements.
      if (
        writeNode(state, level, value, false, false) ||
        (typeof value === "undefined" &&
          writeNode(state, level, null, false, false))
      ) {
        if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
        _result += state.dump;
      }
    }

    state.tag = _tag;
    state.dump = "[" + _result + "]";
  }

  function writeBlockSequence(state, level, object, compact) {
    var _result = "",
      _tag = state.tag,
      index,
      length,
      value;

    for (index = 0, length = object.length; index < length; index += 1) {
      value = object[index];

      if (state.replacer) {
        value = state.replacer.call(object, String(index), value);
      }

      // Write only valid elements, put null instead of invalid elements.
      if (
        writeNode(state, level + 1, value, true, true, false, true) ||
        (typeof value === "undefined" &&
          writeNode(state, level + 1, null, true, true, false, true))
      ) {
        if (!compact || _result !== "") {
          _result += generateNextLine(state, level);
        }

        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          _result += "-";
        } else {
          _result += "- ";
        }

        _result += state.dump;
      }
    }

    state.tag = _tag;
    state.dump = _result || "[]"; // Empty sequence if no valid values.
  }

  function writeFlowMapping(state, level, object) {
    var _result = "",
      _tag = state.tag,
      objectKeyList = Object.keys(object),
      index,
      length,
      objectKey,
      objectValue,
      pairBuffer;

    for (index = 0, length = objectKeyList.length; index < length; index += 1) {
      pairBuffer = "";
      if (_result !== "") pairBuffer += ", ";

      if (state.condenseFlow) pairBuffer += '"';

      objectKey = objectKeyList[index];
      objectValue = object[objectKey];

      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }

      if (!writeNode(state, level, objectKey, false, false)) {
        continue; // Skip this pair because of invalid key;
      }

      if (state.dump.length > 1024) pairBuffer += "? ";

      pairBuffer +=
        state.dump +
        (state.condenseFlow ? '"' : "") +
        ":" +
        (state.condenseFlow ? "" : " ");

      if (!writeNode(state, level, objectValue, false, false)) {
        continue; // Skip this pair because of invalid value.
      }

      pairBuffer += state.dump;

      // Both key and value are valid.
      _result += pairBuffer;
    }

    state.tag = _tag;
    state.dump = "{" + _result + "}";
  }

  function writeBlockMapping(state, level, object, compact) {
    var _result = "",
      _tag = state.tag,
      objectKeyList = Object.keys(object),
      index,
      length,
      objectKey,
      objectValue,
      explicitPair,
      pairBuffer;

    // Allow sorting keys so that the output file is deterministic
    if (state.sortKeys === true) {
      // Default sorting
      objectKeyList.sort();
    } else if (typeof state.sortKeys === "function") {
      // Custom sort function
      objectKeyList.sort(state.sortKeys);
    } else if (state.sortKeys) {
      // Something is wrong
      throw new exception("sortKeys must be a boolean or a function");
    }

    for (index = 0, length = objectKeyList.length; index < length; index += 1) {
      pairBuffer = "";

      if (!compact || _result !== "") {
        pairBuffer += generateNextLine(state, level);
      }

      objectKey = objectKeyList[index];
      objectValue = object[objectKey];

      if (state.replacer) {
        objectValue = state.replacer.call(object, objectKey, objectValue);
      }

      if (!writeNode(state, level + 1, objectKey, true, true, true)) {
        continue; // Skip this pair because of invalid key.
      }

      explicitPair =
        (state.tag !== null && state.tag !== "?") ||
        (state.dump && state.dump.length > 1024);

      if (explicitPair) {
        if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
          pairBuffer += "?";
        } else {
          pairBuffer += "? ";
        }
      }

      pairBuffer += state.dump;

      if (explicitPair) {
        pairBuffer += generateNextLine(state, level);
      }

      if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
        continue; // Skip this pair because of invalid value.
      }

      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += ":";
      } else {
        pairBuffer += ": ";
      }

      pairBuffer += state.dump;

      // Both key and value are valid.
      _result += pairBuffer;
    }

    state.tag = _tag;
    state.dump = _result || "{}"; // Empty mapping if no valid pairs.
  }

  function detectType(state, object, explicit) {
    var _result, typeList, index, length, type, style;

    typeList = explicit ? state.explicitTypes : state.implicitTypes;

    for (index = 0, length = typeList.length; index < length; index += 1) {
      type = typeList[index];

      if (
        (type.instanceOf || type.predicate) &&
        (!type.instanceOf ||
          (typeof object === "object" && object instanceof type.instanceOf)) &&
        (!type.predicate || type.predicate(object))
      ) {
        if (explicit) {
          if (type.multi && type.representName) {
            state.tag = type.representName(object);
          } else {
            state.tag = type.tag;
          }
        } else {
          state.tag = "?";
        }

        if (type.represent) {
          style = state.styleMap[type.tag] || type.defaultStyle;

          if (_toString.call(type.represent) === "[object Function]") {
            _result = type.represent(object, style);
          } else if (_hasOwnProperty.call(type.represent, style)) {
            _result = type.represent[style](object, style);
          } else {
            throw new exception(
              "!<" +
                type.tag +
                '> tag resolver accepts not "' +
                style +
                '" style',
            );
          }

          state.dump = _result;
        }

        return true;
      }
    }

    return false;
  }

  // Serializes `object` and writes it to global `result`.
  // Returns true on success, or false on invalid object.
  //
  function writeNode(state, level, object, block, compact, iskey, isblockseq) {
    state.tag = null;
    state.dump = object;

    if (!detectType(state, object, false)) {
      detectType(state, object, true);
    }

    var type = _toString.call(state.dump);
    var inblock = block;
    var tagStr;

    if (block) {
      block = state.flowLevel < 0 || state.flowLevel > level;
    }

    var objectOrArray = type === "[object Object]" || type === "[object Array]",
      duplicateIndex,
      duplicate;

    if (objectOrArray) {
      duplicateIndex = state.duplicates.indexOf(object);
      duplicate = duplicateIndex !== -1;
    }

    if (
      (state.tag !== null && state.tag !== "?") ||
      duplicate ||
      (state.indent !== 2 && level > 0)
    ) {
      compact = false;
    }

    if (duplicate && state.usedDuplicates[duplicateIndex]) {
      state.dump = "*ref_" + duplicateIndex;
    } else {
      if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
        state.usedDuplicates[duplicateIndex] = true;
      }
      if (type === "[object Object]") {
        if (block && Object.keys(state.dump).length !== 0) {
          writeBlockMapping(state, level, state.dump, compact);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowMapping(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type === "[object Array]") {
        if (block && state.dump.length !== 0) {
          if (state.noArrayIndent && !isblockseq && level > 0) {
            writeBlockSequence(state, level - 1, state.dump, compact);
          } else {
            writeBlockSequence(state, level, state.dump, compact);
          }
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + state.dump;
          }
        } else {
          writeFlowSequence(state, level, state.dump);
          if (duplicate) {
            state.dump = "&ref_" + duplicateIndex + " " + state.dump;
          }
        }
      } else if (type === "[object String]") {
        if (state.tag !== "?") {
          writeScalar(state, state.dump, level, iskey, inblock);
        }
      } else if (type === "[object Undefined]") {
        return false;
      } else {
        if (state.skipInvalid) return false;
        throw new exception("unacceptable kind of an object to dump " + type);
      }

      if (state.tag !== null && state.tag !== "?") {
        // Need to encode all characters except those allowed by the spec:
        //
        // [35] ns-dec-digit    ::=  [#x30-#x39] /* 0-9 */
        // [36] ns-hex-digit    ::=  ns-dec-digit
        //                         | [#x41-#x46] /* A-F */ | [#x61-#x66] /* a-f */
        // [37] ns-ascii-letter ::=  [#x41-#x5A] /* A-Z */ | [#x61-#x7A] /* a-z */
        // [38] ns-word-char    ::=  ns-dec-digit | ns-ascii-letter | “-”
        // [39] ns-uri-char     ::=  “%” ns-hex-digit ns-hex-digit | ns-word-char | “#”
        //                         | “;” | “/” | “?” | “:” | “@” | “&” | “=” | “+” | “$” | “,”
        //                         | “_” | “.” | “!” | “~” | “*” | “'” | “(” | “)” | “[” | “]”
        //
        // Also need to encode '!' because it has special meaning (end of tag prefix).
        //
        tagStr = encodeURI(
          state.tag[0] === "!" ? state.tag.slice(1) : state.tag,
        ).replace(/!/g, "%21");

        if (state.tag[0] === "!") {
          tagStr = "!" + tagStr;
        } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
          tagStr = "!!" + tagStr.slice(18);
        } else {
          tagStr = "!<" + tagStr + ">";
        }

        state.dump = tagStr + " " + state.dump;
      }
    }

    return true;
  }

  function getDuplicateReferences(object, state) {
    var objects = [],
      duplicatesIndexes = [],
      index,
      length;

    inspectNode(object, objects, duplicatesIndexes);

    for (
      index = 0, length = duplicatesIndexes.length;
      index < length;
      index += 1
    ) {
      state.duplicates.push(objects[duplicatesIndexes[index]]);
    }
    state.usedDuplicates = new Array(length);
  }

  function inspectNode(object, objects, duplicatesIndexes) {
    var objectKeyList, index, length;

    if (object !== null && typeof object === "object") {
      index = objects.indexOf(object);
      if (index !== -1) {
        if (duplicatesIndexes.indexOf(index) === -1) {
          duplicatesIndexes.push(index);
        }
      } else {
        objects.push(object);

        if (Array.isArray(object)) {
          for (index = 0, length = object.length; index < length; index += 1) {
            inspectNode(object[index], objects, duplicatesIndexes);
          }
        } else {
          objectKeyList = Object.keys(object);

          for (
            index = 0, length = objectKeyList.length;
            index < length;
            index += 1
          ) {
            inspectNode(
              object[objectKeyList[index]],
              objects,
              duplicatesIndexes,
            );
          }
        }
      }
    }
  }

  function dump$1(input, options) {
    options = options || {};

    var state = new State(options);

    if (!state.noRefs) getDuplicateReferences(input, state);

    var value = input;

    if (state.replacer) {
      value = state.replacer.call({ "": value }, "", value);
    }

    if (writeNode(state, 0, value, true, true)) return state.dump + "\n";

    return "";
  }

  var dump_1 = dump$1;

  var dumper = {
    dump: dump_1,
  };

  function renamed(from, to) {
    return function () {
      throw new Error(
        "Function yaml." +
          from +
          " is removed in js-yaml 4. " +
          "Use yaml." +
          to +
          " instead, which is now safe by default.",
      );
    };
  }

  var Type = type;
  var Schema = schema;
  var FAILSAFE_SCHEMA = failsafe;
  var JSON_SCHEMA = json;
  var CORE_SCHEMA = core;
  var DEFAULT_SCHEMA = _default;
  var load = loader.load;
  var loadAll = loader.loadAll;
  var dump = dumper.dump;
  var YAMLException = exception;

  // Re-export all types in case user wants to create custom schema
  var types = {
    binary: binary,
    float: float,
    map: map,
    null: _null,
    pairs: pairs,
    set: set,
    timestamp: timestamp,
    bool: bool,
    int: int,
    merge: merge,
    omap: omap,
    seq: seq,
    str: str,
  };

  // Removed functions from JS-YAML 3.0.x
  var safeLoad = renamed("safeLoad", "load");
  var safeLoadAll = renamed("safeLoadAll", "loadAll");
  var safeDump = renamed("safeDump", "dump");

  var jsYaml = {
    Type: Type,
    Schema: Schema,
    FAILSAFE_SCHEMA: FAILSAFE_SCHEMA,
    JSON_SCHEMA: JSON_SCHEMA,
    CORE_SCHEMA: CORE_SCHEMA,
    DEFAULT_SCHEMA: DEFAULT_SCHEMA,
    load: load,
    loadAll: loadAll,
    dump: dump,
    YAMLException: YAMLException,
    types: types,
    safeLoad: safeLoad,
    safeLoadAll: safeLoadAll,
    safeDump: safeDump,
  };

  /* src/App.svelte generated by Svelte v3.59.2 */

  const { console: console_1 } = globals;
  const file = "src/App.svelte";

  function get_each_context(ctx, list, i) {
    const child_ctx = ctx.slice();
    child_ctx[9] = list[i];
    return child_ctx;
  }

  function get_each_context_1(ctx, list, i) {
    const child_ctx = ctx.slice();
    child_ctx[12] = list[i];
    child_ctx[14] = i;
    return child_ctx;
  }

  function get_each_context_2(ctx, list, i) {
    const child_ctx = ctx.slice();
    child_ctx[15] = list[i];
    child_ctx[14] = i;
    return child_ctx;
  }

  // (182:6) {#each surahs as surah, i}
  function create_each_block_2(ctx) {
    let option;
    let t0_value = /*i*/ ctx[14] + 1 + "";
    let t0;
    let t1;
    let t2_value = /*surah*/ ctx[15].name + "";
    let t2;

    const block = {
      c: function create() {
        option = element("option");
        t0 = text(t0_value);
        t1 = text(". ");
        t2 = text(t2_value);
        option.__value = /*i*/ ctx[14];
        option.value = option.__value;
        add_location(option, file, 182, 8, 7082);
      },
      m: function mount(target, anchor) {
        insert_dev(target, option, anchor);
        append_dev(option, t0);
        append_dev(option, t1);
        append_dev(option, t2);
      },
      p: noop,
      d: function destroy(detaching) {
        if (detaching) detach_dev(option);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_each_block_2.name,
      type: "each",
      source: "(182:6) {#each surahs as surah, i}",
      ctx,
    });

    return block;
  }

  // (191:6) {:else}
  function create_else_block_1(ctx) {
    let option;

    const block = {
      c: function create() {
        option = element("option");
        option.textContent = "Select a Surah first";
        option.disabled = true;
        option.__value = "";
        option.value = option.__value;
        add_location(option, file, 191, 8, 7395);
      },
      m: function mount(target, anchor) {
        insert_dev(target, option, anchor);
      },
      p: noop,
      d: function destroy(detaching) {
        if (detaching) detach_dev(option);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_else_block_1.name,
      type: "else",
      source: "(191:6) {:else}",
      ctx,
    });

    return block;
  }

  // (187:6) {#if selectedSurah !== ""}
  function create_if_block_1(ctx) {
    let each_1_anchor;

    let each_value_1 = Array.from({
      length: /*surahs*/ ctx[3][/*selectedSurah*/ ctx[0]].ayahs,
    });

    validate_each_argument(each_value_1);
    let each_blocks = [];

    for (let i = 0; i < each_value_1.length; i += 1) {
      each_blocks[i] = create_each_block_1(
        get_each_context_1(ctx, each_value_1, i),
      );
    }

    const block = {
      c: function create() {
        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c();
        }

        each_1_anchor = empty();
      },
      m: function mount(target, anchor) {
        for (let i = 0; i < each_blocks.length; i += 1) {
          if (each_blocks[i]) {
            each_blocks[i].m(target, anchor);
          }
        }

        insert_dev(target, each_1_anchor, anchor);
      },
      p: function update(ctx, dirty) {
        if (dirty & /*selectedSurah*/ 1) {
          each_value_1 = Array.from({
            length: /*surahs*/ ctx[3][/*selectedSurah*/ ctx[0]].ayahs,
          });

          validate_each_argument(each_value_1);
          let i;

          for (i = 0; i < each_value_1.length; i += 1) {
            const child_ctx = get_each_context_1(ctx, each_value_1, i);

            if (each_blocks[i]) {
              each_blocks[i].p(child_ctx, dirty);
            } else {
              each_blocks[i] = create_each_block_1(child_ctx);
              each_blocks[i].c();
              each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
            }
          }

          for (; i < each_blocks.length; i += 1) {
            each_blocks[i].d(1);
          }

          each_blocks.length = each_value_1.length;
        }
      },
      d: function destroy(detaching) {
        destroy_each(each_blocks, detaching);
        if (detaching) detach_dev(each_1_anchor);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_if_block_1.name,
      type: "if",
      source: '(187:6) {#if selectedSurah !== \\"\\"}',
      ctx,
    });

    return block;
  }

  // (188:8) {#each Array.from({ length: surahs[selectedSurah].ayahs }) as _, i}
  function create_each_block_1(ctx) {
    let option;
    let t0;
    let t1_value = /*i*/ ctx[14] + 1 + "";
    let t1;

    const block = {
      c: function create() {
        option = element("option");
        t0 = text("Ayah ");
        t1 = text(t1_value);
        option.__value = /*i*/ ctx[14];
        option.value = option.__value;
        add_location(option, file, 188, 10, 7317);
      },
      m: function mount(target, anchor) {
        insert_dev(target, option, anchor);
        append_dev(option, t0);
        append_dev(option, t1);
      },
      p: noop,
      d: function destroy(detaching) {
        if (detaching) detach_dev(option);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_each_block_1.name,
      type: "each",
      source:
        "(188:8) {#each Array.from({ length: surahs[selectedSurah].ayahs }) as _, i}",
      ctx,
    });

    return block;
  }

  // (218:6) {:else}
  function create_else_block(ctx) {
    let p;

    const block = {
      c: function create() {
        p = element("p");
        p.textContent = "No video available for the selected Surah and Ayah.";
        add_location(p, file, 218, 8, 8276);
      },
      m: function mount(target, anchor) {
        insert_dev(target, p, anchor);
      },
      p: noop,
      d: function destroy(detaching) {
        if (detaching) detach_dev(p);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_else_block.name,
      type: "else",
      source: "(218:6) {:else}",
      ctx,
    });

    return block;
  }

  // (201:6) {#if selectedVideos}
  function create_if_block(ctx) {
    let each_1_anchor;
    let each_value = /*selectedVideos*/ ctx[2];
    validate_each_argument(each_value);
    let each_blocks = [];

    for (let i = 0; i < each_value.length; i += 1) {
      each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    }

    const block = {
      c: function create() {
        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c();
        }

        each_1_anchor = empty();
      },
      m: function mount(target, anchor) {
        for (let i = 0; i < each_blocks.length; i += 1) {
          if (each_blocks[i]) {
            each_blocks[i].m(target, anchor);
          }
        }

        insert_dev(target, each_1_anchor, anchor);
      },
      p: function update(ctx, dirty) {
        if (dirty & /*selectedVideos*/ 4) {
          each_value = /*selectedVideos*/ ctx[2];
          validate_each_argument(each_value);
          let i;

          for (i = 0; i < each_value.length; i += 1) {
            const child_ctx = get_each_context(ctx, each_value, i);

            if (each_blocks[i]) {
              each_blocks[i].p(child_ctx, dirty);
            } else {
              each_blocks[i] = create_each_block(child_ctx);
              each_blocks[i].c();
              each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
            }
          }

          for (; i < each_blocks.length; i += 1) {
            each_blocks[i].d(1);
          }

          each_blocks.length = each_value.length;
        }
      },
      d: function destroy(detaching) {
        destroy_each(each_blocks, detaching);
        if (detaching) detach_dev(each_1_anchor);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_if_block.name,
      type: "if",
      source: "(201:6) {#if selectedVideos}",
      ctx,
    });

    return block;
  }

  // (202:8) {#each selectedVideos as video}
  function create_each_block(ctx) {
    let div1;
    let iframe;
    let iframe_src_value;
    let t0;
    let a;
    let div0;
    let t1_value = /*video*/ ctx[9].verses + "";
    let t1;
    let a_href_value;
    let t2;

    const block = {
      c: function create() {
        div1 = element("div");
        iframe = element("iframe");
        t0 = space();
        a = element("a");
        div0 = element("div");
        t1 = text(t1_value);
        t2 = space();
        attr_dev(iframe, "width", "560");
        attr_dev(iframe, "height", "315");
        if (
          !src_url_equal(iframe.src, (iframe_src_value = /*video*/ ctx[9].url))
        )
          attr_dev(iframe, "src", iframe_src_value);
        attr_dev(iframe, "title", "YouTube video player");
        attr_dev(iframe, "frameborder", "0");
        attr_dev(
          iframe,
          "allow",
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
        );
        iframe.allowFullscreen = true;
        attr_dev(iframe, "class", "svelte-1ijjhfd");
        add_location(iframe, file, 203, 12, 7768);
        attr_dev(div0, "class", "badge svelte-1ijjhfd");
        add_location(div0, file, 213, 15, 8164);
        attr_dev(a, "href", (a_href_value = /*video*/ ctx[9].firstVerseURL));
        attr_dev(a, "class", "svelte-1ijjhfd");
        add_location(a, file, 212, 12, 8119);
        attr_dev(div1, "class", "video-container svelte-1ijjhfd");
        add_location(div1, file, 202, 10, 7726);
      },
      m: function mount(target, anchor) {
        insert_dev(target, div1, anchor);
        append_dev(div1, iframe);
        append_dev(div1, t0);
        append_dev(div1, a);
        append_dev(a, div0);
        append_dev(div0, t1);
        append_dev(div1, t2);
      },
      p: function update(ctx, dirty) {
        if (
          dirty & /*selectedVideos*/ 4 &&
          !src_url_equal(iframe.src, (iframe_src_value = /*video*/ ctx[9].url))
        ) {
          attr_dev(iframe, "src", iframe_src_value);
        }

        if (
          dirty & /*selectedVideos*/ 4 &&
          t1_value !== (t1_value = /*video*/ ctx[9].verses + "")
        )
          set_data_dev(t1, t1_value);

        if (
          dirty & /*selectedVideos*/ 4 &&
          a_href_value !== (a_href_value = /*video*/ ctx[9].firstVerseURL)
        ) {
          attr_dev(a, "href", a_href_value);
        }
      },
      d: function destroy(detaching) {
        if (detaching) detach_dev(div1);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_each_block.name,
      type: "each",
      source: "(202:8) {#each selectedVideos as video}",
      ctx,
    });

    return block;
  }

  function create_fragment(ctx) {
    let main;
    let div0;
    let h20;
    let t1;
    let select0;
    let t2;
    let select1;
    let t3;
    let div2;
    let h1;
    let t4;
    let t5_value = /*surahs*/ ctx[3][/*selectedSurah*/ ctx[0]].name + "";
    let t5;
    let t6;
    let h21;
    let t7;
    let t8_value = /*selectedAyah*/ ctx[1] + 1 + "";
    let t8;
    let t9;
    let div1;
    let mounted;
    let dispose;
    let each_value_2 = /*surahs*/ ctx[3];
    validate_each_argument(each_value_2);
    let each_blocks = [];

    for (let i = 0; i < each_value_2.length; i += 1) {
      each_blocks[i] = create_each_block_2(
        get_each_context_2(ctx, each_value_2, i),
      );
    }

    function select_block_type(ctx, dirty) {
      if (/*selectedSurah*/ ctx[0] !== "") return create_if_block_1;
      return create_else_block_1;
    }

    let current_block_type = select_block_type(ctx);
    let if_block0 = current_block_type(ctx);

    function select_block_type_1(ctx, dirty) {
      if (/*selectedVideos*/ ctx[2]) return create_if_block;
      return create_else_block;
    }

    let current_block_type_1 = select_block_type_1(ctx);
    let if_block1 = current_block_type_1(ctx);

    const block = {
      c: function create() {
        main = element("main");
        div0 = element("div");
        h20 = element("h2");
        h20.textContent = "Tafseer Tube";
        t1 = space();
        select0 = element("select");

        for (let i = 0; i < each_blocks.length; i += 1) {
          each_blocks[i].c();
        }

        t2 = space();
        select1 = element("select");
        if_block0.c();
        t3 = space();
        div2 = element("div");
        h1 = element("h1");
        t4 = text("Selected Surah: ");
        t5 = text(t5_value);
        t6 = space();
        h21 = element("h2");
        t7 = text("Selected Ayah: ");
        t8 = text(t8_value);
        t9 = space();
        div1 = element("div");
        if_block1.c();
        add_location(h20, file, 179, 4, 6953);
        if (/*selectedSurah*/ ctx[0] === void 0)
          add_render_callback(() =>
            /*select0_change_handler*/ ctx[6].call(select0),
          );
        add_location(select0, file, 180, 4, 6979);
        if (/*selectedAyah*/ ctx[1] === void 0)
          add_render_callback(() =>
            /*select1_change_handler*/ ctx[7].call(select1),
          );
        add_location(select1, file, 185, 4, 7163);
        attr_dev(div0, "class", "sidebar svelte-1ijjhfd");
        add_location(div0, file, 178, 2, 6927);
        add_location(h1, file, 197, 4, 7515);
        add_location(h21, file, 198, 4, 7573);
        attr_dev(div1, "class", "grid-container svelte-1ijjhfd");
        add_location(div1, file, 199, 4, 7620);
        attr_dev(div2, "class", "content svelte-1ijjhfd");
        add_location(div2, file, 196, 2, 7489);
        attr_dev(main, "class", "svelte-1ijjhfd");
        add_location(main, file, 177, 0, 6918);
      },
      l: function claim(nodes) {
        throw new Error(
          "options.hydrate only works if the component was compiled with the `hydratable: true` option",
        );
      },
      m: function mount(target, anchor) {
        insert_dev(target, main, anchor);
        append_dev(main, div0);
        append_dev(div0, h20);
        append_dev(div0, t1);
        append_dev(div0, select0);

        for (let i = 0; i < each_blocks.length; i += 1) {
          if (each_blocks[i]) {
            each_blocks[i].m(select0, null);
          }
        }

        select_option(select0, /*selectedSurah*/ ctx[0], true);
        append_dev(div0, t2);
        append_dev(div0, select1);
        if_block0.m(select1, null);
        select_option(select1, /*selectedAyah*/ ctx[1], true);
        append_dev(main, t3);
        append_dev(main, div2);
        append_dev(div2, h1);
        append_dev(h1, t4);
        append_dev(h1, t5);
        append_dev(div2, t6);
        append_dev(div2, h21);
        append_dev(h21, t7);
        append_dev(h21, t8);
        append_dev(div2, t9);
        append_dev(div2, div1);
        if_block1.m(div1, null);

        if (!mounted) {
          dispose = [
            listen_dev(select0, "change", /*select0_change_handler*/ ctx[6]),
            listen_dev(
              select0,
              "change",
              /*onSurahChange*/ ctx[4],
              false,
              false,
              false,
              false,
            ),
            listen_dev(select1, "change", /*select1_change_handler*/ ctx[7]),
          ];

          mounted = true;
        }
      },
      p: function update(ctx, [dirty]) {
        if (dirty & /*surahs*/ 8) {
          each_value_2 = /*surahs*/ ctx[3];
          validate_each_argument(each_value_2);
          let i;

          for (i = 0; i < each_value_2.length; i += 1) {
            const child_ctx = get_each_context_2(ctx, each_value_2, i);

            if (each_blocks[i]) {
              each_blocks[i].p(child_ctx, dirty);
            } else {
              each_blocks[i] = create_each_block_2(child_ctx);
              each_blocks[i].c();
              each_blocks[i].m(select0, null);
            }
          }

          for (; i < each_blocks.length; i += 1) {
            each_blocks[i].d(1);
          }

          each_blocks.length = each_value_2.length;
        }

        if (dirty & /*selectedSurah*/ 1) {
          select_option(select0, /*selectedSurah*/ ctx[0]);
        }

        if (
          current_block_type ===
            (current_block_type = select_block_type(ctx)) &&
          if_block0
        ) {
          if_block0.p(ctx, dirty);
        } else {
          if_block0.d(1);
          if_block0 = current_block_type(ctx);

          if (if_block0) {
            if_block0.c();
            if_block0.m(select1, null);
          }
        }

        if (dirty & /*selectedAyah*/ 2) {
          select_option(select1, /*selectedAyah*/ ctx[1]);
        }

        if (
          dirty & /*selectedSurah*/ 1 &&
          t5_value !==
            (t5_value = /*surahs*/ ctx[3][/*selectedSurah*/ ctx[0]].name + "")
        )
          set_data_dev(t5, t5_value);
        if (
          dirty & /*selectedAyah*/ 2 &&
          t8_value !== (t8_value = /*selectedAyah*/ ctx[1] + 1 + "")
        )
          set_data_dev(t8, t8_value);

        if (
          current_block_type_1 ===
            (current_block_type_1 = select_block_type_1(ctx)) &&
          if_block1
        ) {
          if_block1.p(ctx, dirty);
        } else {
          if_block1.d(1);
          if_block1 = current_block_type_1(ctx);

          if (if_block1) {
            if_block1.c();
            if_block1.m(div1, null);
          }
        }
      },
      i: noop,
      o: noop,
      d: function destroy(detaching) {
        if (detaching) detach_dev(main);
        destroy_each(each_blocks, detaching);
        if_block0.d();
        if_block1.d();
        mounted = false;
        run_all(dispose);
      },
    };

    dispatch_dev("SvelteRegisterBlock", {
      block,
      id: create_fragment.name,
      type: "component",
      source: "",
      ctx,
    });

    return block;
  }

  function instance($$self, $$props, $$invalidate) {
    let { $$slots: slots = {}, $$scope } = $$props;
    validate_slots("App", slots, []);

    const surahs = [
      { id: 1, name: "Al-Fatiha", ayahs: 7 },
      { id: 2, name: "Al-Baqarah", ayahs: 286 },
      { id: 3, name: "Al-Imran", ayahs: 200 },
      { id: 4, name: "An-Nisa", ayahs: 176 },
      { id: 5, name: "Al-Maidah", ayahs: 120 },
      { id: 6, name: "Al-Anam", ayahs: 165 },
      { id: 7, name: "Al-Araf", ayahs: 206 },
      { id: 8, name: "Al-Anfal", ayahs: 75 },
      { id: 9, name: "At-Tawbah", ayahs: 129 },
      { id: 10, name: "Yunus", ayahs: 109 },
      { id: 11, name: "Hud", ayahs: 123 },
      { id: 12, name: "Yusuf", ayahs: 111 },
      { id: 13, name: "Ar-Rad", ayahs: 43 },
      { id: 14, name: "Ibrahim", ayahs: 52 },
      { id: 15, name: "Al-Hijr", ayahs: 99 },
      { id: 16, name: "An-Nahl", ayahs: 128 },
      { id: 17, name: "Al-Isra", ayahs: 111 },
      { id: 18, name: "Al-Kahf", ayahs: 110 },
      { id: 19, name: "Maryam", ayahs: 98 },
      { id: 20, name: "Ta-Ha", ayahs: 135 },
      { id: 21, name: "Al-Anbiya", ayahs: 112 },
      { id: 22, name: "Al-Hajj", ayahs: 78 },
      { id: 23, name: "Al-Muminun", ayahs: 118 },
      { id: 24, name: "An-Nur", ayahs: 64 },
      { id: 25, name: "Al-Furqan", ayahs: 77 },
      { id: 26, name: "Ash-Shuara", ayahs: 227 },
      { id: 27, name: "An-Naml", ayahs: 93 },
      { id: 28, name: "Al-Qasas", ayahs: 88 },
      { id: 29, name: "Al-Ankabut", ayahs: 69 },
      { id: 30, name: "Ar-Rum", ayahs: 60 },
      { id: 31, name: "Luqman", ayahs: 34 },
      { id: 32, name: "As-Sajda", ayahs: 30 },
      { id: 33, name: "Al-Ahzab", ayahs: 73 },
      { id: 34, name: "Saba", ayahs: 54 },
      { id: 35, name: "Fatir", ayahs: 45 },
      { id: 36, name: "Ya-Sin", ayahs: 83 },
      { id: 37, name: "As-Saffat", ayahs: 182 },
      { id: 38, name: "Sad", ayahs: 88 },
      { id: 39, name: "Az-Zumar", ayahs: 75 },
      { id: 40, name: "Ghafir", ayahs: 85 },
      { id: 41, name: "Fussilat", ayahs: 54 },
      { id: 42, name: "Ash-Shura", ayahs: 53 },
      { id: 43, name: "Az-Zukhruf", ayahs: 89 },
      { id: 44, name: "Ad-Dukhan", ayahs: 59 },
      { id: 45, name: "Al-Jathiya", ayahs: 37 },
      { id: 46, name: "Al-Ahqaf", ayahs: 35 },
      { id: 47, name: "Muhammad", ayahs: 38 },
      { id: 48, name: "Al-Fath", ayahs: 29 },
      { id: 49, name: "Al-Hujurat", ayahs: 18 },
      { id: 50, name: "Qaf", ayahs: 45 },
      { id: 51, name: "Adh-Dhariyat", ayahs: 60 },
      { id: 52, name: "At-Tur", ayahs: 49 },
      { id: 53, name: "An-Najm", ayahs: 62 },
      { id: 54, name: "Al-Qamar", ayahs: 55 },
      { id: 55, name: "Ar-Rahman", ayahs: 78 },
      { id: 56, name: "Al-Waqia", ayahs: 96 },
      { id: 57, name: "Al-Hadid", ayahs: 29 },
      { id: 58, name: "Al-Mujadila", ayahs: 22 },
      { id: 59, name: "Al-Hashr", ayahs: 24 },
      { id: 60, name: "Al-Mumtahina", ayahs: 13 },
      { id: 61, name: "As-Saff", ayahs: 14 },
      { id: 62, name: "Al-Jumuah", ayahs: 11 },
      { id: 63, name: "Al-Munafiqun", ayahs: 11 },
      { id: 64, name: "At-Taghabun", ayahs: 18 },
      { id: 65, name: "At-Talaq", ayahs: 12 },
      { id: 66, name: "At-Tahrim", ayahs: 12 },
      { id: 67, name: "Al-Mulk", ayahs: 30 },
      { id: 68, name: "Al-Qalam", ayahs: 52 },
      { id: 69, name: "Al-Haqqah", ayahs: 52 },
      { id: 70, name: "Al-Maarij", ayahs: 44 },
      { id: 71, name: "Nuh", ayahs: 28 },
      { id: 72, name: "Al-Jinn", ayahs: 28 },
      { id: 73, name: "Al-Muzzammil", ayahs: 20 },
      { id: 74, name: "Al-Muddathir", ayahs: 56 },
      { id: 75, name: "Al-Qiyamah", ayahs: 40 },
      { id: 76, name: "Al-Insan", ayahs: 31 },
      { id: 77, name: "Al-Mursalat", ayahs: 50 },
      { id: 78, name: "An-Naba", ayahs: 40 },
      { id: 79, name: "An-Naziath", ayahs: 46 },
      { id: 80, name: "Abasa", ayahs: 42 },
      { id: 81, name: "At-Takwir", ayahs: 29 },
      { id: 82, name: "Al-Infitar", ayahs: 19 },
      { id: 83, name: "Al-Mutaffifin", ayahs: 36 },
      { id: 84, name: "Al-Inshiqaq", ayahs: 25 },
      { id: 85, name: "Al-Burooj", ayahs: 22 },
      { id: 86, name: "At-Tariq", ayahs: 17 },
      { id: 87, name: "Al-Ala", ayahs: 19 },
      { id: 88, name: "Al-Ghashiyah", ayahs: 26 },
      { id: 89, name: "Al-Fajr", ayahs: 30 },
      { id: 90, name: "Al-Balad", ayahs: 20 },
      { id: 91, name: "Ash-Shams", ayahs: 15 },
      { id: 92, name: "Al-Lail", ayahs: 21 },
      { id: 93, name: "Ad-Duha", ayahs: 11 },
      { id: 94, name: "Ash-Sharh", ayahs: 8 },
      { id: 95, name: "At-Tin", ayahs: 8 },
      { id: 96, name: "Al-Alaq", ayahs: 19 },
      { id: 97, name: "Al-Qadr", ayahs: 5 },
      { id: 98, name: "Al-Bayyinah", ayahs: 8 },
      { id: 99, name: "Az-Zalzalah", ayahs: 8 },
      { id: 100, name: "Al-Adiyat", ayahs: 11 },
      { id: 101, name: "Al-Qariah", ayahs: 11 },
      { id: 102, name: "At-Takathur", ayahs: 8 },
      { id: 103, name: "Al-Asr", ayahs: 3 },
      { id: 104, name: "Al-Humazah", ayahs: 9 },
      { id: 105, name: "Al-Fil", ayahs: 5 },
      { id: 106, name: "Quraish", ayahs: 4 },
      { id: 107, name: "Al-Maun", ayahs: 7 },
      { id: 108, name: "Al-Kawthar", ayahs: 3 },
      { id: 109, name: "Al-Kafirun", ayahs: 6 },
      { id: 110, name: "An-Nasr", ayahs: 3 },
      { id: 111, name: "Al-Masad", ayahs: 5 },
      { id: 112, name: "Al-Ikhlas", ayahs: 4 },
      { id: 113, name: "Al-Falaq", ayahs: 5 },
      { id: 114, name: "An-Nas", ayahs: 6 },
    ];

    let selectedSurah;
    let selectedAyah;
    let videoData;

    fetch("/videos.yaml")
      .then((response) => response.text())
      .then((data) => {
        $$invalidate(5, (videoData = jsYaml.load(data)));
      });

    function onSurahChange(event) {
      $$invalidate(1, (selectedAyah = 0));
    }

    function updateQueryParams() {
      const queryParams = new URLSearchParams();
      queryParams.set("surah", selectedSurah + 1);
      queryParams.set("ayah", selectedAyah + 1);
      const newUrl = `${window.location.pathname}?${queryParams.toString()}`;
      window.history.replaceState(null, null, newUrl);
    }

    let selectedVideos = [];
    afterUpdate(updateQueryParams);
    const writable_props = [];

    Object.keys($$props).forEach((key) => {
      if (
        !~writable_props.indexOf(key) &&
        key.slice(0, 2) !== "$$" &&
        key !== "slot"
      )
        console_1.warn(`<App> was created with unknown prop '${key}'`);
    });

    function select0_change_handler() {
      selectedSurah = select_value(this);
      $$invalidate(0, selectedSurah);
    }

    function select1_change_handler() {
      selectedAyah = select_value(this);
      $$invalidate(1, selectedAyah);
    }

    $$self.$capture_state = () => ({
      afterUpdate,
      yaml: jsYaml,
      surahs,
      selectedSurah,
      selectedAyah,
      videoData,
      onSurahChange,
      updateQueryParams,
      selectedVideos,
    });

    $$self.$inject_state = ($$props) => {
      if ("selectedSurah" in $$props)
        $$invalidate(0, (selectedSurah = $$props.selectedSurah));
      if ("selectedAyah" in $$props)
        $$invalidate(1, (selectedAyah = $$props.selectedAyah));
      if ("videoData" in $$props)
        $$invalidate(5, (videoData = $$props.videoData));
      if ("selectedVideos" in $$props)
        $$invalidate(2, (selectedVideos = $$props.selectedVideos));
    };

    if ($$props && "$$inject" in $$props) {
      $$self.$inject_state($$props.$$inject);
    }

    $$self.$$.update = () => {
      if (
        $$self.$$.dirty &
        /*videoData, selectedSurah, selectedAyah, selectedVideos*/ 39
      ) {
        {
          $$invalidate(2, (selectedVideos = []));

          if (videoData) {
            for (const video of videoData.videos) {
              const surah = video.verses.split(":")[0];
              const [startAyah, endAyah] = video.verses
                .split(":")[1]
                .split("-");

              if (
                selectedSurah + 1 == parseInt(surah) &&
                selectedAyah + 1 >= parseInt(startAyah) &&
                selectedAyah + 1 <= parseInt(endAyah)
              ) {
                const urlParams = new URL(video.url).searchParams;
                const videoID = urlParams.get("v");

                selectedVideos.push({
                  url: "https://www.youtube.com/embed/" + videoID,
                  verses:
                    surahs[surah - 1].name + ": " + startAyah + "-" + endAyah,
                  firstVerseURL: "?surah=" + surah + "&ayah=" + startAyah,
                });
              }

              console.log(selectedVideos);
            }
          }
        }
      }
    };

    {
      const queryParams = new URLSearchParams(window.location.search);
      $$invalidate(
        0,
        (selectedSurah = parseInt(queryParams.get("surah")) - 1 || 0),
      );
      $$invalidate(
        1,
        (selectedAyah = parseInt(queryParams.get("ayah")) - 1 || 0),
      );
    }

    return [
      selectedSurah,
      selectedAyah,
      selectedVideos,
      surahs,
      onSurahChange,
      videoData,
      select0_change_handler,
      select1_change_handler,
    ];
  }

  class App extends SvelteComponentDev {
    constructor(options) {
      super(options);
      init(this, options, instance, create_fragment, safe_not_equal, {});

      dispatch_dev("SvelteRegisterComponent", {
        component: this,
        tagName: "App",
        options,
        id: create_fragment.name,
      });
    }
  }

  const app = new App({
    target: document.body,
    props: {
      name: "world",
    },
  });

  return app;
})();
//# sourceMappingURL=bundle.js.map
