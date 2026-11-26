const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));
function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(require.resolve('../src/' + file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => modules[name] ?? {}, Error, setInterval: () => 0, clearInterval() {} });
  return exports;
}
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];

test('chat clears the composer and shows pending bubbles before the server responds; acknowledgements preserve the next draft', async () => {
  const slots = []; let cursor = 0, effects = [];
  const memo = (create, deps) => { const i = cursor++; if (!slots[i] || deps.some((value, n) => value !== slots[i].deps[n])) slots[i] = { deps, value: create() }; return slots[i].value; };
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { const i = cursor++; slots[i] ??= { current: value }; return slots[i]; },
    useMemo: memo,
    useSyncExternalStore(subscribe, snapshot) { cursor++; return snapshot(); },
    useEffect(effect, deps) { const i = cursor++; if (!slots[i] || deps.some((value, n) => value !== slots[i].deps[n])) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: effect() }; }); },
    Fragment: 'Fragment',
  };
  const conversation = { id: 'chat', name: 'Friend', type: 'direct', participantIds: ['me', 'friend'], lastMessage: null };
  const history = { id: '0001', conversationId: 'chat', senderId: 'friend', clientMessageId: 'old', text: 'old', createdAt: new Date().toISOString() };
  let metadataCalls = 0, historyCalls = 0, readCalls = 0, socketMessage, resolveMetadata;
  const requests = [];
  const service = {
    getConversation: () => { metadataCalls++; return new Promise(resolve => { resolveMetadata = resolve; }); },
    chatHistory: async () => { historyCalls++; return { items: [history], nextCursor: null }; },
    markChatRead: () => { readCalls++; return new Promise(() => {}); },
    sendChatMessage(id, text, clientMessageId, content) { return new Promise(resolve => requests.push({ id, text, clientMessageId, content, resolve })); },
  };
  const native = { ...Object.fromEntries(['ActivityIndicator', 'Image', 'KeyboardAvoidingView', 'Modal', 'Pressable', 'ScrollView', 'TextInput', 'View'].map(name => [name, name])), StyleSheet: { create: styles => styles }, Platform: { OS: 'android' }, Keyboard: { addListener: () => ({ remove() {} }) } };
  const jsx = (type, props) => ({ type, props });
  const { ChatScreen } = load('screens/ChatScreen.tsx', {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../components/LocalizedText': { Text: 'Text' }, '../services/feedback': { useFeedbackState: hooks.useState },
    '../services/chatService': service,
    '../services/chatOutbox': load('services/chatOutbox.ts', {}),
    '../services/api': { getSession: () => ({ accessToken: 'token', user: { id: 'me' } }) },
    '../services/chatEvents': { watchConversation(id, snapshot, connected, incoming) { socketMessage = incoming; return () => {}; } },
    '../theme': { colors: {}, layout: {} },
  });
  const render = () => { cursor = 0; effects = []; const tree = flatten(ChatScreen({ conversation, onBack() {} })); effects.splice(0).forEach(effect => effect()); return tree; };
  const input = tree => tree.find(node => node.type === 'TextInput' && node.props.accessibilityLabel === 'Tin nhắn');
  const send = tree => tree.find(node => node.props?.accessibilityLabel === 'Gửi tin nhắn');
  let tree = render();
  assert.equal(metadataCalls, 1); assert.equal(historyCalls, 1, 'both initial reads start before awaiting either');
  await tick(); tree = render();
  assert.equal(readCalls, 0);
  input(tree).props.onChangeText('first'); tree = render(); assert.equal(send(tree).props.disabled, false, 'slow metadata must not hide authorized history or block sending');
  send(tree).props.onPress(); send(tree).props.onPress(); tree = render();
  assert.equal(requests.length, 1, 'same-frame double tap sends once');
  assert.equal(input(tree).props.value, '');
  assert.ok(tree.some(node => node.type === 'Text' && node.props.children === 'first'));
  assert.ok(tree.some(node => node.type === 'Text' && node.props.children === 'Đang gửi…'));
  resolveMetadata(conversation); await tick(); tree = render(); assert.equal(readCalls, 1);
  input(tree).props.onChangeText('next draft'); tree = render(); assert.equal(send(tree).props.disabled, false);
  const confirmed = { ...history, id: '0002', senderId: 'me', text: requests[0].text, clientMessageId: requests[0].clientMessageId };
  socketMessage(confirmed); requests[0].resolve(confirmed); await tick(); tree = render();
  assert.equal(input(tree).props.value, 'next draft');
  assert.equal(tree.filter(node => node.type === 'Text' && node.props.children === 'first').length, 1);
});
