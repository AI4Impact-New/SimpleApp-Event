const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function player() {
  const events = [], module = { exports: {} };
  class SharedObject { emit(name, value) { events.push({ name, value }); } }
  const source = fs.readFileSync(require.resolve('expo-video/build/VideoPlayer.web.js'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    module, exports: module.exports,
    require: name => name === 'react' ? {} : {},
    globalThis: { expo: { SharedObject } },
  });
  return { instance: new module.exports.default(null), events };
}

for (const name of ['AbortError', 'NotAllowedError', 'NotSupportedError']) {
  test(`web playback handles ${name} without an unhandled rejection`, async () => {
    const { instance, events } = player();
    instance._mountedVideos.add({ play: () => Promise.reject(Object.assign(new Error('Decoder unavailable'), { name })) });
    instance.play();
    await new Promise(resolve => setImmediate(resolve));
    if (name === 'NotSupportedError') {
      assert.equal(instance.status, 'error');
      assert.equal(events.at(-1).value.error.message, 'Decoder unavailable');
    } else {
      assert.equal(instance.status, 'idle');
      assert.equal(events.length, 0);
    }
  });
}
