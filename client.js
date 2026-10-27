/**
 * 浏览器半边：集中管理左侧全局面板的显示与顺序。
 *
 * 面板本身由各插件注册进 `sidebar.panellist` 席位，本插件不改它们的源码：
 * 用席位账本 + 侧边栏实际渲染出的行按钮得出面板清单，再用一条受限样式表
 * 按 aria-label 或 aria-haspopup 控制每一行的 order 与 display。
 *
 * 交互分三处：设置 → 通用的管理行与弹窗、侧边栏内直接拖动排序、侧边栏内右键隐藏。
 */
window.__ModuleLoader__.load({
	id: 'dsh-sidebar-panels',
	factory(require) {
		const React = require('react');
		const h = React.createElement;

		const NS = 'sidebar-panels';
		const API = 'api/sidebar-panels';
		const PANEL_SEAT = 'sidebar.panellist';
		const ITEM_SEAT = 'settings.general.item';
		const BASE_CSS_TAG = 'dsh-sidebar-panels/base';
		const LIVE_CSS_TAG = 'dsh-sidebar-panels/live';
		const NAV_SELECTOR = 'nav[class*="_panelList"]';
		const ROW_ANY = `${NAV_SELECTOR} button[class*="_panelRow"]`;
		const ROW_MORE = `${ROW_ANY}[aria-haspopup]`;
		const MORE_KEY = '__more';

		const ZH = {
			'row.title': '侧边栏面板',
			'row.description': '控制左侧全局面板图标的显示与顺序，与插件自带的开关保持一致。',
			'row.hiddenSummary': '当前隐藏 {count} 项，点「管理」调整。',
			'row.manage': '管理',
			'dialog.title': '侧边栏面板',
			'dialog.hint': '拖动左侧手柄或点箭头调整顺序，开关控制显示；侧边栏里也可以直接拖动，右键即可隐藏。',
			'dialog.empty': '当前没有发现可管理的面板。',
			'dialog.showAll': '全部显示',
			'dialog.reset': '恢复默认顺序',
			'dialog.done': '完成',
			'dialog.moveUp': '上移「{name}」',
			'dialog.moveDown': '下移「{name}」',
			'dialog.dragHandle': '拖动调整「{name}」的顺序',
			'dialog.toggle': '显示「{name}」',
			'dialog.saveFailed': '暂未写入磁盘，正在重试',
			'dialog.close': '关闭',
			'menu.hide': '隐藏「{name}」',
			'menu.showAll': '显示全部面板'
		};
		const EN = {
			'row.title': 'Sidebar panels',
			'row.description': 'Control which global panels appear in the left sidebar and in what order, kept in step with each plugin own switch.',
			'row.hiddenSummary': '{count} hidden — choose Manage to adjust.',
			'row.manage': 'Manage',
			'dialog.title': 'Sidebar panels',
			'dialog.hint':
				'Drag the handle or use the arrows to reorder, switches show or hide a panel. You can also drag rows right in the sidebar and right-click to hide.',
			'dialog.empty': 'No manageable panels found yet.',
			'dialog.showAll': 'Show all',
			'dialog.reset': 'Reset order',
			'dialog.done': 'Done',
			'dialog.moveUp': 'Move “{name}” up',
			'dialog.moveDown': 'Move “{name}” down',
			'dialog.dragHandle': 'Drag to reorder “{name}”',
			'dialog.toggle': 'Show “{name}”',
			'dialog.saveFailed': 'Not saved to disk yet — retrying',
			'dialog.close': 'Close',
			'menu.hide': 'Hide “{name}”',
			'menu.showAll': 'Show all panels'
		};

		const BASE_CSS = [
			'.dsp-row{border-bottom:.5px solid var(--dsw-alias-border-l2);justify-content:space-between;align-items:center;gap:24px;padding:16px 0;display:flex}',
			'.dsp-row-text{min-width:0}',
			'.dsp-title{font-size:14px;line-height:20px}',
			'.dsp-description{color:var(--dsw-alias-label-secondary);margin-top:4px;font-size:12px;line-height:18px}',
			'.dsp-button{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);border-radius:8px;font:inherit;font-size:13px;line-height:18px;padding:6px 12px;cursor:pointer;white-space:nowrap;flex:none}',
			'.dsp-button:hover{background:var(--dsw-alias-interactive-bg-hover)}',
			'.dsp-button:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:2px}',
			'.dsp-overlay{position:fixed;inset:0;z-index:2000;background:var(--dsw-alias-bg-mask-1,rgba(0,0,0,.32));display:flex;align-items:center;justify-content:center;padding:24px}',
			'.dsp-dialog{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.22);display:flex;flex-direction:column;width:min(520px,100%);max-height:min(72vh,640px);overflow:hidden}',
			'.dsp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:.5px solid var(--dsw-alias-border-l2)}',
			'.dsp-heading{font-size:15px;line-height:22px;font-weight:600}',
			'.dsp-close{border:none;background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;font:inherit;padding:4px 8px}',
			'.dsp-close:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
			'.dsp-body{padding:4px 20px 12px;overflow:auto;min-height:0}',
			'.dsp-hint{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;padding:12px 0}',
			'.dsp-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}',
			'.dsp-item:last-child{border-bottom:none}',
			'.dsp-item-hidden .dsp-name{color:var(--dsw-alias-label-tertiary)}',
			'.dsp-item-dragging{opacity:.5}',
			'.dsp-drop-before,.dsp-drop-after{position:relative}',
			'.dsp-drop-before:before,.dsp-drop-after:after{content:"";z-index:1;pointer-events:none;height:12px;position:absolute;left:0;right:4px;background:linear-gradient(55deg,transparent calc(50% - 1px),var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px),transparent calc(50% + 1px)) 0 0/5px 7px no-repeat,linear-gradient(125deg,transparent calc(50% - 1px),var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px),transparent calc(50% + 1px)) 0 5px/5px 7px no-repeat,linear-gradient(var(--dsw-alias-state-business-primary) 0 0) 4px 5px/calc(100% - 4px) 2px no-repeat}',
			'.dsp-drop-before:before{top:-7px}',
			'.dsp-drop-after:after{bottom:-7px}',
			'.dsp-handle{cursor:grab;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1;flex:none;user-select:none;padding:2px 4px}',
			'.dsp-handle:active{cursor:grabbing}',
			'.dsp-name{flex:1;min-width:0;font-size:14px;line-height:20px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
			'.dsp-switch{border:none;background:transparent;padding:0;cursor:pointer;flex:none;line-height:0}',
			'.dsp-switch-track{display:inline-flex;align-items:center;width:32px;height:18px;border-radius:9px;background:var(--dsw-alias-border-l3);transition:background .15s ease}',
			'.dsp-switch-thumb{width:14px;height:14px;margin-left:2px;border-radius:7px;background:#fff;transition:transform .15s ease}',
			'.dsp-switch[aria-checked="true"] .dsp-switch-track{background:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary))}',
			'.dsp-switch[aria-checked="true"] .dsp-switch-thumb{transform:translateX(14px)}',
			'.dsp-order{display:flex;gap:4px;flex:none}',
			'.dsp-mini{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:6px;cursor:pointer;font:inherit;font-size:12px;line-height:16px;padding:2px 8px}',
			'.dsp-mini:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
			'.dsp-mini:disabled{opacity:.4;cursor:default}',
			'.dsp-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;border-top:.5px solid var(--dsw-alias-border-l2)}',
			'.dsp-foot-actions{display:flex;gap:8px;flex:none;align-items:center}',
			'.dsp-warn{color:var(--dsw-alias-state-warn-primary,#b26a00);font-size:12px;line-height:18px}',
			'.dsp-menu{position:fixed;z-index:3000;min-width:168px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:4px;display:flex;flex-direction:column;gap:2px}',
			'.dsp-menu-item{border:none;background:transparent;color:inherit;font:inherit;font-size:13px;line-height:18px;text-align:left;padding:8px 10px;border-radius:6px;cursor:pointer;white-space:nowrap}',
			'.dsp-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover)}'
		].join('\n');

		let ctxRef = null;
		let saved = { hidden: [], order: [] };
		let rows = [];
		let snapshot = { hidden: [], order: [], rows: [], saveFailures: 0, revision: 0 };
		const listeners = new Set();
		let saveTimer = null;
		let saveFailures = 0;
		let menuElement = null;
		let menuCleanup = null;

		const getSnapshot = () => snapshot;

		function subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}

		function translate(key, params) {
			const language = String(
				(document.documentElement && document.documentElement.lang) || navigator.language || 'zh'
			).toLowerCase();
			const primary = language.indexOf('zh') === 0 ? ZH : EN;
			let text = primary[key] !== undefined ? primary[key] : ZH[key] !== undefined ? ZH[key] : key;
			if (params !== undefined) {
				text = text.replace(/\{(\w+)\}/g, (all, name) =>
					params[name] === undefined ? all : String(params[name])
				);
			}
			return text;
		}

		function styleTag(tagId) {
			let element = document.querySelector(`style[data-plugin-css="${tagId}"]`);
			if (element === null) {
				element = document.createElement('style');
				element.dataset.plugin = 'dsh-sidebar-panels';
				element.dataset.pluginCss = tagId;
				document.head.appendChild(element);
			}
			return element;
		}

		function readPanels() {
			if (ctxRef === null) return [];
			let entries = [];
			try {
				entries = ctxRef.slots.entriesOfSlot(PANEL_SEAT) || [];
			} catch {
				entries = [];
			}
			const list = [];
			for (const entry of entries) {
				const options = (entry && entry.options) || {};
				const id = options.id;
				if (typeof id !== 'string' || id === '') continue;
				let label = options.label;
				if (typeof label === 'function') {
					try {
						label = label();
					} catch {
						label = undefined;
					}
				}
				list.push({
					order: typeof options.order === 'number' ? options.order : 0,
					label: typeof label === 'string' && label !== '' ? label : id,
					id
				});
			}
			list.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
			return list;
		}

		function moreRowElement() {
			return document.querySelector(ROW_MORE);
		}

		function collectRows() {
			const list = readPanels().map((panel) => ({
				key: panel.id,
				id: panel.id,
				label: panel.label,
				kind: 'panel'
			}));
			const more = moreRowElement();
			if (more !== null) {
				const text = (more.textContent || '').trim();
				const aria = more.getAttribute('aria-label');
				const label = text !== '' ? text : typeof aria === 'string' && aria !== '' ? aria : '更多';
				list.push({ key: MORE_KEY, id: MORE_KEY, label, kind: 'more' });
			}
			return list;
		}

		function effectiveOrder(list, order) {
			const available = new Set(list.map((row) => row.key));
			const seen = new Set();
			const result = [];
			for (const key of order) {
				if (available.has(key) && !seen.has(key)) {
					seen.add(key);
					result.push(key);
				}
			}
			for (const row of list) {
				if (!seen.has(row.key)) result.push(row.key);
			}
			return result;
		}

		const touched = new Set();
		let healed = false;

		function navElement() {
			return document.querySelector(NAV_SELECTOR);
		}

		function rowButtons() {
			const nav = navElement();
			return nav === null ? [] : [...nav.querySelectorAll('button[class*="_panelRow"]')];
		}

		/**
		 * 一行在侧边栏里的「布局节点」：普通面板就是行按钮本身；
		 * 「更多」按钮外面可能套着菜单锚点，此时要上溯到 nav 的直接子元素，
		 * 因为 order/display 只有作用在 nav 的直接子元素上才有效。
		 */
		function layoutNodeFor(row) {
			const nav = navElement();
			if (nav === null) return null;
			let button = null;
			if (row.kind === 'more') {
				for (const candidate of rowButtons()) {
					if (candidate.hasAttribute('aria-haspopup')) {
						button = candidate;
						break;
					}
				}
			} else {
				for (const candidate of rowButtons()) {
					if (candidate.hasAttribute('aria-haspopup')) continue;
					if (candidate.getAttribute('aria-label') === row.label) {
						button = candidate;
						break;
					}
				}
			}
			if (button === null) return null;
			let node = button;
			while (node.parentElement !== null && node.parentElement !== nav) node = node.parentElement;
			return node.parentElement === nav ? node : null;
		}

		function clearNodeStyle(node) {
			node.style.order = '';
			node.style.display = '';
			node.removeAttribute('data-dsp-applied');
		}

		function applyStyles() {
			if (!healed) {
				healed = true;
				for (const stale of document.querySelectorAll('[data-dsp-applied]')) clearNodeStyle(stale);
			}
			const byKey = new Map(rows.map((row) => [row.key, row]));
			const hidden = new Set(saved.hidden);
			const ordered = effectiveOrder(rows, saved.order);
			const seen = new Set();
			ordered.forEach((key, index) => {
				const row = byKey.get(key);
				if (row === undefined) return;
				const node = layoutNodeFor(row);
				if (node === null) return;
				seen.add(node);
				const dragHandle = node.matches('button') ? node : node.querySelector('button');
				if (dragHandle !== null && dragHandle.draggable !== true) dragHandle.draggable = true;
				/**
				 * DSH 自己从不给这些行写内联 order/display，所以内联值由本插件独占：
				 * 不备份「原值」，显示时直接写空串，避免热重载后把上一实例留下的 display:none 误当原值。
				 */
				node.style.order = String(index);
				node.style.display = hidden.has(key) ? 'none' : '';
				node.setAttribute('data-dsp-applied', '1');
				touched.add(node);
			});
			for (const node of [...touched]) {
				if (seen.has(node) && node.isConnected) continue;
				clearNodeStyle(node);
				touched.delete(node);
			}
		}

		function restoreStyles() {
			for (const node of touched) clearNodeStyle(node);
			touched.clear();
		}

		function publish() {
			snapshot = {
				hidden: saved.hidden.slice(),
				order: saved.order.slice(),
				rows: rows.slice(),
				saveFailures,
				revision: snapshot.revision + 1
			};
			applyStyles();
			for (const listener of listeners) {
				try {
					listener();
				} catch {
					/* 单个订阅者抛错不影响其它 */
				}
			}
		}

		function report(message) {
			try {
				void fetch(`${API}/diag`, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ message })
				}).catch(() => {});
			} catch {
				/* 诊断通道不可用时静默 */
			}
		}

		function nativeStatesOf() {
			return NATIVE_ADAPTERS.map((adapter) => {
				let shown = null;
				try {
					shown = adapter.read();
				} catch {
					shown = null;
				}
				return `${adapter.key}=${shown === null ? '?' : shown ? 'on' : 'off'}`;
			}).join(',');
		}

		function diagnose(reason) {
			try {
				const rendered = rowButtons().length;
				const renderedMore = document.querySelector(ROW_MORE) === null ? 0 : 1;
				let seatEntries = -1;
				try {
					seatEntries = (ctxRef.slots.entriesOfSlot(ITEM_SEAT) || []).length;
				} catch {
					seatEntries = -2;
				}
				const measured = rows.map((row) => {
					const node = layoutNodeFor(row);
					if (node === null) return `${row.key}:no-node`;
					const style = window.getComputedStyle(node);
					const inline = (node.getAttribute('style') || '-').replace(/\s+/g, ' ');
					return `${row.key}:order=${style.order}:display=${style.display}:tag=${node.tagName.toLowerCase()}`;
				});
				const nativeStates = nativeStatesOf();
				const navs = [...document.querySelectorAll(NAV_SELECTOR)];
				const navInfo = navs
					.map(
						(nav, index) =>
							`#${index}:${window.getComputedStyle(nav).display}:rows=${nav.querySelectorAll('button[class*="_panelRow"]').length}:kids=${nav.children.length}`
					)
					.join(',');
				report(
					`${reason}: navs=${navs.length}[${navInfo}] rows=${rows.map((row) => `${row.key}(${row.label})`).join('|') || '-'} ` +
						`hidden=${saved.hidden.join('|') || '-'} order=${saved.order.join('|') || '-'} ` +
						`renderedRows=${rendered} renderedMore=${renderedMore} itemSeatEntries=${seatEntries} ` +
						`styled=${touched.size} rowInDom=${document.querySelector('.dsp-row') !== null} ` +
						`native=[${nativeStates}] measured=[${measured.join(',')}]`
				);
			} catch (error) {
				report(`${reason}: diagnostic failed ${error instanceof Error ? error.message : String(error)}`);
			}
		}

		function persist() {
			if (saveTimer !== null) clearTimeout(saveTimer);
			saveTimer = setTimeout(() => {
				saveTimer = null;
				let request;
				try {
					request = fetch(`${API}/state`, {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify(saved)
					});
				} catch (error) {
					noteSaveFailure(error);
					return;
				}
				request.then(
					(response) => {
						if (!response.ok) noteSaveFailure(new Error(`http ${response.status}`));
						else if (saveFailures !== 0) {
							saveFailures = 0;
							publish();
							report('save-recovered');
						}
					},
					(error) => noteSaveFailure(error)
				);
			}, 120);
		}

		function noteSaveFailure(error) {
			saveFailures += 1;
			report(`save-failed(${saveFailures}) ${error instanceof Error ? error.message : String(error)}`);
			publish();
			if (saveFailures <= 3) {
				saveTimer = setTimeout(() => {
					saveTimer = null;
					persist();
				}, 1200 * saveFailures);
			}
		}

		function commit(next) {
			saved = {
				hidden: Array.isArray(next.hidden) ? [...new Set(next.hidden)] : [],
				order: Array.isArray(next.order) ? [...new Set(next.order)] : []
			};
			publish();
			persist();
			diagnose('commit');
		}

		async function loadState() {
			try {
				const response = await fetch(`${API}/state`);
				if (!response.ok) return;
				const data = await response.json();
				saved = {
					hidden: Array.isArray(data.hidden) ? data.hidden : [],
					order: Array.isArray(data.order) ? data.order : []
				};
				publish();
			} catch {
				/* 首次启动或宿主未就绪：使用内存默认值 */
			}
		}

		/* ---------------- 与各插件自带开关的双向同步 ----------------
		 * 只接管「自身就有侧栏入口开关」的插件，且只通过它们公开的持久化接口读写：
		 *   dsh-context       configForms 作用域 dsh-context / insightsEntry('show'|'hide')
		 *   dsh-search-index  configForms 作用域 dsh-search-index / enabled(boolean)
		 *   dsh-market        路由 dsh-market/sidebar-entry（GET 读、POST 写）
		 *   mcp-manager       localStorage dsh-armory/entry（both|panel|fab|sidebar|all）
		 * 规则：本插件里切换时同时写自己与原生；原生那边变了就采纳原生（隐藏），
		 * 除非本插件已明确隐藏——此时把原生也改成隐藏，两边始终一致。
		 */
		const MARKET_ROUTE = 'dsh-market/sidebar-entry';
		const ARMORY_KEY = 'dsh-armory/entry';
		const ARMORY_PANEL = { both: true, panel: true, all: true, fab: false, sidebar: false };
		// 隐藏时记下原本可见的模式，重新显示时还原，避免把用户选的 panel/all 覆盖成默认值。
		const ARMORY_PREV_KEY = 'dsh-sidebar-panels/armory-prev';
		const SYNC_INTERVAL = 3000;
		let syncing = false;
		let marketShown = null;
		// 本插件刚写过的原生键：抑制窗口内不采纳原生值，避开宿主异步落盘的中间态。
		const nativePending = new Map();
		const NATIVE_GRACE = 3000;

		function service(name) {
			if (ctxRef === null || ctxRef === undefined) return null;
			try {
				if (typeof ctxRef.get === 'function') {
					const found = ctxRef.get(name);
					if (found !== undefined && found !== null) return found;
				}
			} catch {
				/* 服务未声明时退回属性取法 */
			}
			try {
				return ctxRef[name] === undefined ? null : ctxRef[name];
			} catch {
				return null;
			}
		}

		function configScope(namespace) {
			const forms = service('configForms');
			if (forms === null || typeof forms.get !== 'function') return null;
			try {
				return forms.get(namespace) || null;
			} catch {
				return null;
			}
		}

		function configValue(scope) {
			try {
				const snapshot = scope !== null && typeof scope.getSnapshot === 'function' ? scope.getSnapshot() : null;
				const value = snapshot === null || snapshot === undefined ? null : snapshot.value;
				return value === null || value === undefined ? null : value;
			} catch {
				return null;
			}
		}

		function writeScopeValue(scope, field, value) {
			if (scope === null || typeof scope.set !== 'function') return;
			try {
				const result = scope.set(field, value);
				if (result !== null && typeof result === 'object' && typeof result.catch === 'function') {
					result.catch(() => {});
				}
			} catch {
				/* 作用域只读或已释放：跳过写入 */
			}
		}

		async function refreshMarket() {
			try {
				const response = await fetch(MARKET_ROUTE, { headers: { accept: 'application/json' } });
				if (!response.ok) return;
				const data = await response.json();
				marketShown = data.enabled === true || data.chosen === false;
			} catch {
				/* 市场插件未安装或路由不可用时忽略 */
			}
		}

		function writeMarket(shown) {
			marketShown = shown;
			try {
				void fetch(MARKET_ROUTE, {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ enabled: shown })
				}).catch(() => {});
			} catch {
				/* 同上 */
			}
		}

		function readArmory() {
			try {
				if (typeof localStorage === 'undefined') return null;
				const mode = localStorage.getItem(ARMORY_KEY);
				// 键不存在时插件按默认值 both 处理（面板可见）。
				if (mode === null) return true;
				return ARMORY_PANEL[mode] === undefined ? null : ARMORY_PANEL[mode];
			} catch {
				return null;
			}
		}

		function writeArmory(shown) {
			try {
				if (typeof localStorage === 'undefined') return;
				const mode = localStorage.getItem(ARMORY_KEY);
				const visible = mode === null ? true : ARMORY_PANEL[mode] !== false;
				if (visible === shown) return;
				if (!shown) {
					// 面板与悬浮按钮共用一份模式：关面板退到 fab，保持悬浮入口可用。
					if (mode !== null && ARMORY_PANEL[mode] === true) localStorage.setItem(ARMORY_PREV_KEY, mode);
					localStorage.setItem(ARMORY_KEY, 'fab');
					return;
				}
				const previous = localStorage.getItem(ARMORY_PREV_KEY);
				localStorage.setItem(ARMORY_KEY, previous !== null && ARMORY_PANEL[previous] === true ? previous : 'both');
			} catch {
				/* 存储不可用时忽略 */
			}
		}

		function scopeWatcher(namespace) {
			return function watchAdapter(onChange) {
				const scope = configScope(namespace);
				if (scope === null || typeof scope.subscribe !== 'function') return () => {};
				const dispose = scope.subscribe(() => onChange());
				return typeof dispose === 'function' ? dispose : () => {};
			};
		}

		const NATIVE_ADAPTERS = [
			{
				key: 'dsh-context',
				read() {
					const value = configValue(configScope('dsh-context'));
					if (value === null || value.insightsEntry === undefined || value.insightsEntry === null) return null;
					return value.insightsEntry !== 'hide';
				},
				write(shown) {
					writeScopeValue(configScope('dsh-context'), 'insightsEntry', shown ? 'show' : 'hide');
				},
				watch: scopeWatcher('dsh-context')
			},
			{
				key: 'dsh-search-index',
				read() {
					const value = configValue(configScope('dsh-search-index'));
					if (value === null || value.enabled === undefined || value.enabled === null) return null;
					return value.enabled !== false;
				},
				write(shown) {
					writeScopeValue(configScope('dsh-search-index'), 'enabled', shown);
				},
				watch: scopeWatcher('dsh-search-index')
			},
			{
				key: 'dsh-market',
				read: () => marketShown,
				write: writeMarket
			},
			{
				key: 'mcp-manager',
				read: readArmory,
				write: writeArmory
			}
		];

		function adapterOf(key) {
			for (const adapter of NATIVE_ADAPTERS) {
				if (adapter.key === key) return adapter;
			}
			return null;
		}

		function writeNative(key, shown) {
			const adapter = adapterOf(key);
			if (adapter === null) return;
			nativePending.set(key, Date.now());
			try {
				adapter.write(shown);
			} catch {
				/* 原生写入失败不影响本插件状态 */
			}
		}

		function reconcile(reason) {
			if (syncing) return;
			syncing = true;
			try {
				const hidden = new Set(saved.hidden);
				const notes = [];
				const states = [];
				for (const adapter of NATIVE_ADAPTERS) {
					let shown = null;
					try {
						shown = adapter.read();
					} catch {
						shown = null;
					}
					if (typeof shown !== 'boolean') {
						states.push(`${adapter.key}=?`);
						continue;
					}
					states.push(`${adapter.key}=${shown ? 'on' : 'off'}`);
					const oursHidden = hidden.has(adapter.key);
					if (oursHidden && shown) {
						adapter.write(false);
						notes.push(`${adapter.key}:push-hide`);
					} else if (!oursHidden && !shown) {
						const pending = nativePending.get(adapter.key) || 0;
						if (Date.now() - pending < NATIVE_GRACE) {
							states.push(`${adapter.key}=settling`);
							continue;
						}
						hidden.add(adapter.key);
						notes.push(`${adapter.key}:adopt-hide`);
					}
				}
				const nextHidden = [...hidden];
				const changed =
					nextHidden.length !== saved.hidden.length ||
					nextHidden.some((key) => saved.hidden.indexOf(key) < 0);
				if (notes.length !== 0 || reason !== 'poll') {
					report(`native-sync ${reason}: ${notes.join(',') || 'aligned'} native=[${states.join(',')}]`);
				}
				if (changed) {
					saved = { hidden: nextHidden, order: effectiveOrder(rows, saved.order) };
					publish();
					persist();
				}
			} finally {
				syncing = false;
			}
		}

		function setHidden(key, hidden) {
			const next = new Set(saved.hidden);
			if (hidden) next.add(key);
			else next.delete(key);
			commit({ hidden: [...next], order: effectiveOrder(rows, saved.order) });
			writeNative(key, !hidden);
		}

		function toggleHidden(key) {
			setHidden(key, !saved.hidden.includes(key));
		}

		function move(key, delta) {
			const ordered = effectiveOrder(rows, saved.order);
			const from = ordered.indexOf(key);
			if (from < 0) return;
			const to = from + delta;
			if (to < 0 || to >= ordered.length) return;
			ordered.splice(from, 1);
			ordered.splice(to, 0, key);
			commit({ hidden: saved.hidden, order: ordered });
		}

		function showAll() {
			commit({ hidden: [], order: effectiveOrder(rows, saved.order) });
			for (const adapter of NATIVE_ADAPTERS) writeNative(adapter.key, true);
		}

		function resetOrder() {
			commit({ hidden: saved.hidden, order: [] });
		}

		function moveInOrder(order, key, anchorKey, after) {
			const without = order.filter((item) => item !== key);
			if (anchorKey === null || anchorKey === undefined || anchorKey === key) {
				return without.concat(key);
			}
			const index = without.indexOf(anchorKey);
			if (index < 0) return without.concat(key);
			const at = after ? index + 1 : index;
			return without.slice(0, at).concat(key, without.slice(at));
		}

		function rowKeyOfElement(element) {
			if (element === null || element === undefined) return null;
			if (typeof element.matches === 'function' && element.matches(ROW_MORE)) return MORE_KEY;
			const label = typeof element.getAttribute === 'function' ? element.getAttribute('aria-label') : null;
			if (label === null) return null;
			for (const row of rows) {
				if (row.kind === 'panel' && row.label === label) return row.key;
			}
			return null;
		}

		const dragState = { key: null, source: null, target: null, after: true };

		function clearDropMarker() {
			for (const element of document.querySelectorAll('.dsp-drop-before,.dsp-drop-after')) {
				element.classList.remove('dsp-drop-before', 'dsp-drop-after');
			}
		}

		function closestRow(event) {
			const target = event.target;
			if (target === null || target === undefined || typeof target.closest !== 'function') return null;
			return target.closest(ROW_ANY);
		}

		function onSidebarDragStart(event) {
			const rowElement = closestRow(event);
			if (rowElement === null) return;
			const key = rowKeyOfElement(rowElement);
			if (key === null) return;
			dragState.key = key;
			dragState.source = rowElement;
			dragState.target = null;
			dragState.after = true;
			if (event.dataTransfer) {
				event.dataTransfer.effectAllowed = 'move';
				try {
					event.dataTransfer.setData('text/plain', key);
				} catch {
					/* 宿主禁止写剪贴板数据时忽略 */
				}
			}
		}

		function onSidebarDragOver(event) {
			if (dragState.key === null) return;
			const rowElement = closestRow(event);
			if (rowElement === null || rowElement === dragState.source) return;
			const key = rowKeyOfElement(rowElement);
			if (key === null) return;
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
			const rect = rowElement.getBoundingClientRect();
			const after = event.clientY >= rect.top + rect.height / 2;
			clearDropMarker();
			rowElement.classList.add(after ? 'dsp-drop-after' : 'dsp-drop-before');
			dragState.target = key;
			dragState.after = after;
		}

		function onSidebarDrop(event) {
			if (dragState.key === null) return;
			event.preventDefault();
			const key = dragState.key;
			const anchorKey = dragState.target;
			const after = dragState.after;
			onSidebarDragEnd();
			if (anchorKey === null || anchorKey === key) return;
			commit({
				hidden: saved.hidden,
				order: moveInOrder(effectiveOrder(rows, saved.order), key, anchorKey, after)
			});
		}

		function onSidebarDragEnd() {
			clearDropMarker();
			dragState.key = null;
			dragState.source = null;
			dragState.target = null;
			dragState.after = true;
		}

		function closeMenu() {
			if (menuElement !== null) {
				menuElement.remove();
				menuElement = null;
			}
			if (menuCleanup !== null) {
				menuCleanup();
				menuCleanup = null;
			}
		}

		function menuItem(label, onSelect) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'dsp-menu-item';
			button.setAttribute('role', 'menuitem');
			button.textContent = label;
			button.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				closeMenu();
				onSelect();
			});
			return button;
		}

		function openMenu(x, y, key, label) {
			closeMenu();
			const element = document.createElement('div');
			element.className = 'dsp-menu';
			element.setAttribute('role', 'menu');
			element.appendChild(menuItem(translate('menu.hide', { name: label }), () => setHidden(key, true)));
			if (saved.hidden.length > 0) {
				element.appendChild(menuItem(translate('menu.showAll'), () => showAll()));
			}
			document.body.appendChild(element);
			const rect = element.getBoundingClientRect();
			const left = Math.min(x, Math.max(8, window.innerWidth - rect.width - 8));
			const top = Math.min(y, Math.max(8, window.innerHeight - rect.height - 8));
			element.style.left = `${Math.max(8, left)}px`;
			element.style.top = `${Math.max(8, top)}px`;
			menuElement = element;

			const onPointerDown = (event) => {
				if (element.contains(event.target)) return;
				closeMenu();
			};
			const onKeyDown = (event) => {
				if (event.key === 'Escape') closeMenu();
			};
			document.addEventListener('pointerdown', onPointerDown, true);
			document.addEventListener('keydown', onKeyDown, true);
			window.addEventListener('blur', closeMenu);
			window.addEventListener('resize', closeMenu);
			menuCleanup = () => {
				document.removeEventListener('pointerdown', onPointerDown, true);
				document.removeEventListener('keydown', onKeyDown, true);
				window.removeEventListener('blur', closeMenu);
				window.removeEventListener('resize', closeMenu);
			};
		}

		function onSidebarContextMenu(event) {
			const target = event.target;
			const row =
				target !== null && typeof target.closest === 'function' ? target.closest(ROW_ANY) : null;
			if (row === null) return;
			const key = rowKeyOfElement(row);
			if (key === null) return;
			event.preventDefault();
			event.stopPropagation();
			const found = rows.find((candidate) => candidate.key === key);
			openMenu(event.clientX, event.clientY, key, found === undefined ? key : found.label);
		}

		const useShared =
			typeof React.useSyncExternalStore === 'function'
				? function useSharedStore() {
						return React.useSyncExternalStore(subscribe, getSnapshot);
					}
				: function useSharedFallback() {
						const [, bump] = React.useReducer((value) => value + 1, 0);
						React.useEffect(() => subscribe(bump), []);
						return snapshot;
					};

		function rowKeyFromItem(element) {
			if (element === null || element === undefined) return null;
			const value = element.getAttribute('data-key');
			return value === null ? null : value;
		}

		function PanelsDialog({ t, onClose }) {
			const view = useShared();
			const dialogRef = React.useRef(null);
			const listRef = React.useRef(null);
			const dragRef = React.useRef(null);

			React.useEffect(() => {
				const onKeyDown = (event) => {
					if (event.key === 'Escape') {
						event.stopPropagation();
						onClose();
					}
				};
				document.addEventListener('keydown', onKeyDown, true);
				const focusTarget = dialogRef.current === null ? null : dialogRef.current.querySelector('button');
				if (focusTarget !== null && typeof focusTarget.focus === 'function') focusTarget.focus();
				report(`dialog-opened items=${view.rows.length} hidden=${view.hidden.length}`);
				return () => document.removeEventListener('keydown', onKeyDown, true);
			}, [onClose]);

			React.useEffect(() => {
				const list = listRef.current;
				if (list === null) return undefined;
				let source = null;
				let marker = null;
				let anchorKey = null;
				let after = true;
				const clearMarker = () => {
					if (marker !== null) marker.classList.remove('dsp-drop-before', 'dsp-drop-after');
					marker = null;
				};
				const itemOf = (event) => {
					const target = event.target;
					if (target === null || target === undefined || typeof target.closest !== 'function') return null;
					const item = target.closest('.dsp-item');
					return item !== null && list.contains(item) ? item : null;
				};
				const onStart = (event) => {
					const item = itemOf(event);
					if (item === null) return;
					source = item;
					item.classList.add('dsp-item-dragging');
					if (event.dataTransfer) {
						event.dataTransfer.effectAllowed = 'move';
						try {
							event.dataTransfer.setData('text/plain', rowKeyFromItem(item) || '');
						} catch {
							/* 忽略 */
						}
					}
				};
				const onOver = (event) => {
					if (source === null) return;
					const item = itemOf(event);
					if (item === null || item === source) return;
					event.preventDefault();
					if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
					const rect = item.getBoundingClientRect();
					const half = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
					clearMarker();
					item.classList.add(half === 'before' ? 'dsp-drop-before' : 'dsp-drop-after');
					marker = item;
					anchorKey = rowKeyFromItem(item);
					after = half === 'after';
				};
				const finish = (shouldCommit) => {
					const dragged = source;
					const anchor = anchorKey;
					const aft = after;
					clearMarker();
					if (dragged !== null) dragged.classList.remove('dsp-item-dragging');
					source = null;
					anchorKey = null;
					after = true;
					if (!shouldCommit || dragged === null) return;
					const key = rowKeyFromItem(dragged);
					if (key === null || anchor === null || anchor === key) return;
					commit({
						hidden: saved.hidden,
						order: moveInOrder(effectiveOrder(rows, saved.order), key, anchor, aft)
					});
				};
				const onDrop = (event) => {
					if (source === null) return;
					event.preventDefault();
					finish(true);
				};
				const onEnd = () => finish(false);
				list.addEventListener('dragstart', onStart);
				list.addEventListener('dragover', onOver);
				list.addEventListener('drop', onDrop);
				list.addEventListener('dragend', onEnd);
				return () => {
					list.removeEventListener('dragstart', onStart);
					list.removeEventListener('dragover', onOver);
					list.removeEventListener('drop', onDrop);
					list.removeEventListener('dragend', onEnd);
					finish(false);
				};
			}, [view.revision]);

			const byKey = new Map(view.rows.map((row) => [row.key, row]));
			const hidden = new Set(view.hidden);
			const ordered = effectiveOrder(view.rows, view.order).filter((key) => byKey.has(key));

			const items = ordered.map((key, index) => {
				const row = byKey.get(key);
				const isHidden = hidden.has(key);
				return h(
					'div',
					{
						key,
						className: isHidden ? 'dsp-item dsp-item-hidden' : 'dsp-item',
						'data-key': key,
						draggable: true
					},
					h(
						'span',
						{
							className: 'dsp-handle',
							title: t('dialog.dragHandle', { name: row.label }),
							'aria-hidden': 'true'
						},
						'⠿'
					),
					h(
						'button',
						{
							type: 'button',
							className: 'dsp-switch',
							role: 'switch',
							'aria-checked': !isHidden,
							'aria-label': t('dialog.toggle', { name: row.label }),
							onClick: () => toggleHidden(key)
						},
						h('span', { className: 'dsp-switch-track' }, h('span', { className: 'dsp-switch-thumb' }))
					),
					h('span', { className: 'dsp-name', title: row.label }, row.label),
					h(
						'span',
						{ className: 'dsp-order' },
						h(
							'button',
							{
								type: 'button',
								className: 'dsp-mini',
								disabled: index === 0,
								'aria-label': t('dialog.moveUp', { name: row.label }),
								onClick: () => move(key, -1)
							},
							'↑'
						),
						h(
							'button',
							{
								type: 'button',
								className: 'dsp-mini',
								disabled: index === ordered.length - 1,
								'aria-label': t('dialog.moveDown', { name: row.label }),
								onClick: () => move(key, 1)
							},
							'↓'
						)
					)
				);
			});

			return h(
				'div',
				{
					className: 'dsp-overlay',
					onMouseDown: (event) => {
						if (event.target === event.currentTarget) onClose();
					}
				},
				h(
					'div',
					{
						className: 'dsp-dialog',
						role: 'dialog',
						'aria-modal': 'true',
						'aria-label': t('dialog.title'),
						ref: dialogRef
					},
					h(
						'div',
						{ className: 'dsp-head' },
						h('div', { className: 'dsp-heading' }, t('dialog.title')),
						h(
							'button',
							{ type: 'button', className: 'dsp-close', 'aria-label': t('dialog.close'), onClick: onClose },
							'✕'
						)
					),
					h(
						'div',
						{ className: 'dsp-body', ref: listRef },
						items.length === 0 ? h('div', { className: 'dsp-hint' }, t('dialog.empty')) : null,
						items.length === 0 ? null : h('div', { className: 'dsp-hint' }, t('dialog.hint')),
						items
					),
					h(
						'div',
						{ className: 'dsp-foot' },
						h(
							'div',
							{ className: 'dsp-foot-actions' },
							view.saveFailures > 0 ? h('span', { className: 'dsp-warn' }, t('dialog.saveFailed')) : null,
							h('button', { type: 'button', className: 'dsp-mini', onClick: showAll }, t('dialog.showAll')),
							h('button', { type: 'button', className: 'dsp-mini', onClick: resetOrder }, t('dialog.reset'))
						),
						h('button', { type: 'button', className: 'dsp-button', onClick: onClose }, t('dialog.done'))
					)
				)
			);
		}

		function PanelsRow({ t }) {
			const view = useShared();
			const [open, setOpen] = React.useState(false);
			const rowRef = React.useRef(null);
			React.useEffect(() => {
				const rect = rowRef.current === null ? null : rowRef.current.getBoundingClientRect();
				report(
					`row-mounted width=${rect === null ? '-' : Math.round(rect.width)} ` +
						`height=${rect === null ? '-' : Math.round(rect.height)} rows=${view.rows.length}`
				);
			}, []);
			const hiddenCount = view.hidden.filter((key) => view.rows.some((row) => row.key === key)).length;
			return h(
				React.Fragment,
				null,
				h(
					'div',
					{ className: 'dsp-row', ref: rowRef },
					h(
						'div',
						{ className: 'dsp-row-text' },
						h('div', { className: 'dsp-title' }, t('row.title')),
						h(
							'div',
							{ className: 'dsp-description' },
							hiddenCount > 0 ? t('row.hiddenSummary', { count: String(hiddenCount) }) : t('row.description')
						)
					),
					h(
						'button',
						{ type: 'button', className: 'dsp-button', onClick: () => setOpen(true) },
						t('row.manage')
					)
				),
				open ? h(PanelsDialog, { t, onClose: () => setOpen(false) }) : null
			);
		}

		return {
			inject: ['slots', 'locale', 'configForms'],
			apply(ctx) {
				ctxRef = ctx;
				ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'sidebar-panels: dictionaries');
				ctx.effect(() => {
					styleTag(BASE_CSS_TAG).textContent = BASE_CSS;
					return () => {
						const element = document.querySelector(`style[data-plugin-css="${BASE_CSS_TAG}"]`);
						if (element !== null) element.remove();
					};
				}, 'sidebar-panels: styles');

				const refresh = () => {
					rows = collectRows();
					publish();
				};

				ctx.effect(() => {
					refresh();
					return () => restoreStyles();
				}, 'sidebar-panels: panel styles');

				ctx.effect(() => {
					const unsubscribe = ctx.slots.subscribe(PANEL_SEAT, refresh);
					return unsubscribe;
				}, 'sidebar-panels: panel entries');
				ctx.effect(() => ctx.locale.subscribe(refresh), 'sidebar-panels: panel labels');

				ctx.effect(() => {
					let signature = '';
					let timer = null;
					const check = () => {
						timer = null;
						const next = collectRows()
							.map((row) => `${row.key}\u0000${row.label}\u0000${row.kind}`)
							.join('\u0001');
						if (next === signature) return;
						signature = next;
						refresh();
					};
					check();
					const observer = new MutationObserver(() => {
						if (timer !== null) return;
						timer = setTimeout(check, 250);
					});
					observer.observe(document.body, { childList: true, subtree: true });
					return () => {
						observer.disconnect();
						if (timer !== null) clearTimeout(timer);
					};
				}, 'sidebar-panels: sidebar dom');

				ctx.effect(() => {
					const onDragStart = (event) => onSidebarDragStart(event);
					const onDragOver = (event) => onSidebarDragOver(event);
					const onDrop = (event) => onSidebarDrop(event);
					const onDragEnd = () => onSidebarDragEnd();
					document.addEventListener('dragstart', onDragStart, true);
					document.addEventListener('dragover', onDragOver, true);
					document.addEventListener('drop', onDrop, true);
					document.addEventListener('dragend', onDragEnd, true);
					document.addEventListener('contextmenu', onSidebarContextMenu, true);
					return () => {
						document.removeEventListener('dragstart', onDragStart, true);
						document.removeEventListener('dragover', onDragOver, true);
						document.removeEventListener('drop', onDrop, true);
						document.removeEventListener('dragend', onDragEnd, true);
						document.removeEventListener('contextmenu', onSidebarContextMenu, true);
						onSidebarDragEnd();
						closeMenu();
					};
				}, 'sidebar-panels: sidebar gestures');

				ctx.effect(() => {
					const disposers = [];
					for (const adapter of NATIVE_ADAPTERS) {
						if (typeof adapter.watch !== 'function') continue;
						try {
							const dispose = adapter.watch(() => reconcile(`watch:${adapter.key}`));
							if (typeof dispose === 'function') disposers.push(dispose);
						} catch {
							/* 订阅失败就交给轮询兜底 */
						}
					}
					const timer = setInterval(() => {
						void refreshMarket().then(() => reconcile('poll'));
					}, SYNC_INTERVAL);
					return () => {
						for (const dispose of disposers) {
							try {
								dispose();
							} catch {
								/* 单个订阅释放失败不影响其它 */
							}
						}
						clearInterval(timer);
					};
				}, 'sidebar-panels: native sources');

				void loadState().then(() => {
					refresh();
					void refreshMarket().then(() => reconcile('startup'));
					setTimeout(() => diagnose('startup'), 900);
				});

				ctx.slots.inject(ITEM_SEAT, () =>
					ctx.slots.register(
						{
							name: ITEM_SEAT,
							id: 'sidebar-panels',
							order: 10.5,
							locale: NS
						},
						PanelsRow
					)
				);
			}
		};
	}
});
