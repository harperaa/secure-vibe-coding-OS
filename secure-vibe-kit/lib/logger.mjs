const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

export function success(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`);
}

export function warn(msg) {
  console.log(`${YELLOW}⚠${RESET} ${msg}`);
}

export function error(msg) {
  console.error(`${RED}✗${RESET} ${msg}`);
}

export function info(msg) {
  console.log(`${CYAN}→${RESET} ${msg}`);
}

export function dim(msg) {
  console.log(`${DIM}  ${msg}${RESET}`);
}

export function header(msg) {
  console.log();
  console.log(`${CYAN}${'━'.repeat(50)}${RESET}`);
  console.log(`${CYAN}  ${msg}${RESET}`);
  console.log(`${CYAN}${'━'.repeat(50)}${RESET}`);
  console.log();
}
