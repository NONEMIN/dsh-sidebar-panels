/**
 * 宿主半边：为侧边栏面板管理提供持久化与诊断通道。
 * 浏览器半边（client.js）通过 /api/sidebar-panels/* 读写这份状态。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HOME_DIR = path.join(os.homedir(), '.dsh');
const STATE_FILE = path.join(HOME_DIR, 'sidebar-panels.json');
const LOG_FILE = path.join(HOME_DIR, 'logs', 'sidebar-panels.log');
const LOG_MAX_BYTES = 1024 * 1024;
const STATE_PATH = '/api/sidebar-panels/state';
const DIAG_PATH = '/api/sidebar-panels/diag';
const MAX_ITEMS = 200;
const MAX_ID_LENGTH = 128;
const MAX_DIAG_LENGTH = 512;

function emptyState() {
	return { hidden: [], order: [] };
}

function idList(value) {
	if (!Array.isArray(value)) return [];
	return value.filter((id) => typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LENGTH).slice(0, MAX_ITEMS);
}

function readState() {
	try {
		const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
		return { hidden: idList(raw.hidden), order: idList(raw.order) };
	} catch {
		return emptyState();
	}
}

function writeState(next) {
	fs.mkdirSync(HOME_DIR, { recursive: true });
	const tmp = `${STATE_FILE}.tmp`;
	fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
	fs.renameSync(tmp, STATE_FILE);
}

function rotateLog() {
	try {
		const stat = fs.statSync(LOG_FILE);
		if (stat.size <= LOG_MAX_BYTES) return;
		fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
	} catch {
		/* 首次写入或无法读取时忽略 */
	}
}

function note(line) {
	try {
		fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
		rotateLog();
		const text = String(line).slice(0, MAX_DIAG_LENGTH);
		fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${text}\n`, 'utf8');
	} catch {
		/* 诊断日志失败不影响主流程 */
	}
}

function sendJson(res, status, body) {
	res.writeHead(status, {
		'content-type': 'application/json; charset=utf-8',
		'cache-control': 'no-store'
	});
	res.end(JSON.stringify(body));
}

/**
 * 只接受同源写入：浏览器跨站请求会带 Origin，与 Host 不一致便拒绝；
 * 无来源头的请求（curl、脚本）同样拒绝，避免任意本地进程改写面板配置。
 */
function sameOrigin(req) {
	const host = req.headers.host;
	if (typeof host !== 'string' || host.length === 0) return false;
	const origin = req.headers.origin;
	const referer = req.headers.referer;
	const candidate = typeof origin === 'string' && origin.length > 0 ? origin : typeof referer === 'string' ? referer : null;
	if (candidate === null) return false;
	try {
		return new URL(candidate).host === host;
	} catch {
		return false;
	}
}

async function readBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > 64 * 1024) throw new Error('payload too large');
		chunks.push(chunk);
	}
	if (chunks.length === 0) return {};
	return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function normalize(value) {
	const source = value && typeof value === 'object' ? value : {};
	return { hidden: [...new Set(idList(source.hidden))], order: [...new Set(idList(source.order))] };
}

export const inject = ['webServer'];

export function apply(ctx) {
	ctx.effect(() => {
		const routes = [
			ctx.webServer.register({
				kind: 'exact',
				path: STATE_PATH,
				handler: async (req, res) => {
					if (req.method === 'GET') {
						sendJson(res, 200, readState());
						return;
					}
					if (req.method !== 'POST') {
						sendJson(res, 405, { ok: false, error: 'method-not-allowed' });
						return;
					}
					if (!sameOrigin(req)) {
						sendJson(res, 403, { ok: false, error: 'untrusted origin' });
						return;
					}
					try {
						const next = normalize(await readBody(req));
						writeState(next);
						sendJson(res, 200, next);
					} catch (error) {
						note(`state write failed: ${error instanceof Error ? error.message : String(error)}`);
						sendJson(res, 400, { ok: false, error: 'bad-request' });
					}
				}
			}),
			ctx.webServer.register({
				kind: 'exact',
				path: DIAG_PATH,
				handler: async (req, res) => {
					if (req.method !== 'POST') {
						sendJson(res, 405, { ok: false, error: 'method-not-allowed' });
						return;
					}
					if (!sameOrigin(req)) {
						sendJson(res, 403, { ok: false, error: 'untrusted origin' });
						return;
					}
					try {
						const body = await readBody(req);
						note(typeof body.message === 'string' ? body.message : JSON.stringify(body));
						sendJson(res, 200, { ok: true });
					} catch {
						sendJson(res, 400, { ok: false, error: 'bad-request' });
					}
				}
			})
		];
		return () => {
			for (const dispose of routes) {
				try {
					dispose();
				} catch {
					/* 已释放 */
				}
			}
		};
	}, 'sidebar-panels: state and diagnostic routes');
}
